'use client';
import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { insertRecord, updateRecord } from '../lib/useSupabase';

/* ─── Normalisation helpers ─────────────────────────────────────── */
function normalizeAPN(apn) {
  if (!apn) return null;
  return String(apn).replace(/[-\s]/g, '').toUpperCase();
}

function normalizeAddress(addr) {
  if (!addr) return '';
  return addr.toLowerCase()
    .replace(/\./g, '')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\broad\b/g, 'rd')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

function fuzzyAddressMatch(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.90;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const distance = levenshtein(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function normalizeMarket(submarket) {
  const s = (submarket || '').toLowerCase();
  if (s.includes('san gabriel') || s.includes('sgv') || s.includes('industry') ||
      s.includes('baldwin') || s.includes('el monte') || s.includes('irwindale') ||
      s.includes('azusa') || s.includes('covina') || s.includes('pomona')) return 'SGV';
  if (s.includes('ontario') || s.includes('fontana') || s.includes('rancho') ||
      s.includes('chino') || s.includes('mira loma') || s.includes('jurupa')) return 'IE West';
  if (s.includes('san bernardino') || s.includes('riverside') || s.includes('moreno') ||
      s.includes('perris') || s.includes('redlands')) return 'IE East';
  if (s.includes('corona') || s.includes('temecula') || s.includes('murrieta')) return 'IE South';
  if (s.includes('orange') || s.includes('anaheim') || s.includes('irvine') ||
      s.includes('santa ana')) return 'OC';
  if (s.includes('san fernando') || s.includes('burbank') || s.includes('chatsworth')) return 'LA North';
  return 'SGV';
}

/* ─── Matching logic ────────────────────────────────────────────── */
function matchProperty(costarRow, existingProperties) {
  const costarAPN = normalizeAPN(costarRow['Parcel Number 1(Min)']);
  const costarAddr = normalizeAddress((costarRow['Property Address'] || '') + ' ' + (costarRow['City'] || ''));
  const costarSF = parseInt(costarRow['RBA']) || 0;

  for (const prop of existingProperties) {
    const propAPNs = prop.apns || (prop.apn ? [prop.apn] : []);
    if (costarAPN && propAPNs.some(a => normalizeAPN(a) === costarAPN)) {
      return { match: prop, confidence: 95, tier: 1, action: 'merge' };
    }
    const addrMatch = fuzzyAddressMatch(costarAddr, normalizeAddress((prop.address || '') + ' ' + (prop.city || '')));
    const sfMatch = costarSF > 0 && prop.building_sf > 0 &&
      Math.abs(costarSF - prop.building_sf) / prop.building_sf < 0.05;
    if (addrMatch >= 0.85 && sfMatch) {
      return { match: prop, confidence: 82, tier: 2, action: 'merge' };
    }
    if (addrMatch >= 0.85) {
      return { match: prop, confidence: 68, tier: 3, action: 'review' };
    }
  }
  return { match: null, confidence: 0, tier: 4, action: 'new' };
}

function matchAccount(ownerName, existingAccounts) {
  if (!ownerName) return { match: null, confidence: 0, action: 'new' };
  const normalized = ownerName.toLowerCase().trim();
  for (const acct of existingAccounts) {
    const acctNorm = acct.name.toLowerCase().trim();
    if (normalized === acctNorm) return { match: acct, confidence: 99, action: 'merge' };
    if (normalized.includes(acctNorm) || acctNorm.includes(normalized)) {
      return { match: acct, confidence: 88, action: 'merge' };
    }
    const firstWord = normalized.split(' ')[0];
    if (firstWord.length > 4 && acctNorm.startsWith(firstWord)) {
      return { match: acct, confidence: 72, action: 'review' };
    }
  }
  return { match: null, confidence: 0, action: 'new' };
}

/* ─── Transform helpers ─────────────────────────────────────────── */
function transformProperty(row) {
  const clearHt = row['Ceiling Ht']
    ? parseInt(String(row['Ceiling Ht']).replace(/[^0-9]/g, '')) : null;
  const driveIns = row['Drive Ins']
    ? parseInt(String(row['Drive Ins']).split('/')[0]) : 0;
  const submarket = row['Submarket Cluster'] || row['Submarket Name'] || '';
  const market = normalizeMarket(submarket);

  return {
    address: row['Property Address'],
    city: row['City'],
    state: row['State'],
    zip: String(row['Zip'] || '').split('-')[0],
    apn: row['Parcel Number 1(Min)'],
    costar_id: row['PropertyID'],
    market,
    submarket: row['Submarket Name'],
    prop_type: row['Secondary Type'] || row['Property Type'],
    building_class: row['Building Class'],
    building_sf: parseInt(row['RBA']) || null,
    land_ac: parseFloat(row['Land Area (AC)']) || null,
    land_sf: parseInt(row['Land Area (SF)']) || null,
    year_built: parseInt(row['Year Built']) || null,
    year_renovated: parseInt(row['Year Renovated']) || null,
    clear_height: clearHt ? `${clearHt}'` : null,
    dock_doors: parseInt(row['Number Of Loading Docks']) || 0,
    grade_doors: driveIns,
    office_sf: parseInt(row['Office Space']) || null,
    sprinklers: row['Sprinklers'],
    power: row['Power'],
    construction: row['Construction Material'],
    zoning: row['Zoning'],
    tenancy: row['Tenancy'],
    parking_spaces: parseInt(row['Number Of Parking Spaces']) || null,
    parking_ratio: parseFloat(row['Parking Ratio']) || null,
    occupancy_pct: parseFloat(row['Percent Leased']) || null,
    available_sf: parseInt(row['Total Available Space (SF)']) || 0,
    lat: parseFloat(row['Latitude']) || null,
    lng: parseFloat(row['Longitude']) || null,
    owner_name: row['Owner Name'],
    owner_contact: row['Owner Contact'],
    owner_phone: row['Owner Phone'],
    last_sale_date: row['Last Sale Date'],
    last_sale_price: parseFloat(String(row['Last Sale Price'] || '').replace(/[$,]/g, '')) || null,
    asking_rent: row['Avg Rent-Direct (Industrial)'] || row['Avg Rent-Direct'],
    park_name: row['Building Park'],
    leasing_broker: row['Leasing Company Name'],
    loan_amount: parseFloat(String(row['Origination Amount'] || '').replace(/[$,]/g, '')) || null,
    loan_maturity: row['Maturity Date'],
    lender: row['Originator'],
    county: row['County Name'],
    source: 'CoStar Import',
    imported_at: new Date().toISOString(),
  };
}

const OWNER_TYPE_MAP = {
  'Public REIT': 'Institutional REIT',
  'Private REIT': 'Private REIT',
  'Developer - National': 'Developer',
  'Developer - Local': 'Developer',
  'Private': 'Private Investor',
  'Public': 'Corporate / Public Company',
  'Institutional': 'Pension Fund',
  'Government': 'Government / Municipality',
};

function transformOwner(row) {
  return {
    name: row['Company Name'],
    owner_type: OWNER_TYPE_MAP[row['Secondary Type']] || OWNER_TYPE_MAP[row['Type']] || 'Private Investor',
    city: row['City'],
    state: row['State / Country'],
    zip: row['Zip Code'],
    address: row['Company Address'],
    phone: row['Phone'],
    website: row['Website'],
    properties_in_market: parseInt(row['# Properties (in search)']) || 0,
    sf_in_market: parseInt(String(row['Total SF (in search)'] || '').replace(/,/g, '')) || 0,
    total_properties: parseInt(row['Properties Owned']) || 0,
    portfolio_sf: parseInt(String(row['Portfolio SF'] || '').replace(/,/g, '')) || 0,
    source: 'CoStar Import',
    imported_at: new Date().toISOString(),
  };
}

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/* ─── Styles ────────────────────────────────────────────────────── */
const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(20,28,40,0.55)', zIndex: 9000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(3px)',
  },
  modal: {
    background: 'var(--card)', borderRadius: 16, width: '100%', maxWidth: 920,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.25)', overflow: 'hidden',
    margin: '0 16px',
  },
  header: {
    background: 'var(--blue)', color: '#fff', padding: '20px 28px',
    display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
  },
  headerTitle: { fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif", flex: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)',
    background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  steps: {
    display: 'flex', gap: 0, padding: '16px 28px 0', flexShrink: 0,
    borderBottom: '1px solid var(--line)',
  },
  stepItem: (active, done) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 14px', marginRight: 28,
    borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
    color: active ? 'var(--blue)' : done ? 'var(--green)' : 'var(--ink4)',
    fontWeight: active ? 600 : 400, fontSize: 13, cursor: 'default',
  }),
  stepNum: (active, done) => ({
    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, flexShrink: 0,
    background: active ? 'var(--blue)' : done ? 'var(--green)' : 'var(--line)',
    color: active || done ? '#fff' : 'var(--ink3)',
  }),
  body: { flex: 1, overflowY: 'auto', padding: '24px 28px' },
  footer: {
    padding: '16px 28px', borderTop: '1px solid var(--line)', display: 'flex',
    justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: 'var(--card)',
  },
  btnGhost: {
    padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)',
    background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    color: 'var(--ink)', fontFamily: 'inherit',
  },
  btnBlue: {
    padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--blue)',
    color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
  },
  dropZone: (drag) => ({
    border: `2px dashed ${drag ? 'var(--blue)' : 'var(--line)'}`,
    borderRadius: 12, padding: '56px 40px', textAlign: 'center',
    background: drag ? 'rgba(59,95,138,0.05)' : 'var(--bg)',
    transition: 'all 0.15s', cursor: 'pointer',
  }),
  summaryBar: {
    display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap',
  },
  summaryChip: (color) => ({
    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    background: `var(--${color}-bg)`, color: `var(--${color})`,
    border: `1px solid var(--${color}-bdr)`, display: 'flex', alignItems: 'center', gap: 6,
  }),
  sectionHeader: (color) => ({
    padding: '10px 16px', borderRadius: 8, marginBottom: 10, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 10,
    background: color === 'green' ? 'var(--green-bg)' : color === 'amber' ? 'var(--amber-bg)' : 'var(--blue-bg)',
    border: `1px solid var(--${color}-bdr)`,
    color: color === 'green' ? 'var(--green)' : color === 'amber' ? 'var(--amber)' : 'var(--blue)',
    fontWeight: 700, fontSize: 13,
  }),
  matchRow: {
    display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 12,
    alignItems: 'center', padding: '12px 14px',
    borderBottom: '1px solid var(--bg)', fontSize: 12,
  },
  compareCard: {
    border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px',
    marginBottom: 14, background: '#fff',
  },
  compareGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
    border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginTop: 10,
  },
  compareCell: (highlight) => ({
    padding: '7px 12px', fontSize: 12, borderBottom: '1px solid var(--line)',
    background: highlight ? 'var(--amber-bg)' : 'transparent',
  }),
  newRow: {
    display: 'grid', gridTemplateColumns: '24px 1fr 1fr 1fr auto', gap: 10,
    alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--bg)',
    fontSize: 12,
  },
  progress: { height: 4, background: 'var(--line)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
  progressFill: (pct) => ({ height: '100%', width: `${pct}%`, background: 'var(--blue)', transition: 'width 0.3s' }),
};

/* ─── Field diff helper ─────────────────────────────────────────── */
function getPropertyCompareFields(costarProp, existingProp) {
  const fields = [
    { label: 'Address', costar: costarProp.address, existing: existingProp.address },
    { label: 'City', costar: costarProp.city, existing: existingProp.city },
    { label: 'Building SF', costar: costarProp.building_sf?.toLocaleString(), existing: existingProp.sf?.toLocaleString() || existingProp.building_sf?.toLocaleString() },
    { label: 'Year Built', costar: costarProp.year_built, existing: existingProp.year_built },
    { label: 'Clear Height', costar: costarProp.clear_height, existing: existingProp.clear_height },
    { label: 'Dock Doors', costar: costarProp.dock_doors, existing: existingProp.dock_doors },
    { label: 'Market', costar: costarProp.market, existing: existingProp.market },
    { label: 'Owner', costar: costarProp.owner_name, existing: existingProp.owner_name },
  ];
  return fields.map(f => ({
    ...f,
    differ: String(f.costar || '') !== String(f.existing || '') && f.costar && f.existing,
  }));
}

function getAccountCompareFields(costarAcct, existingAcct) {
  const fields = [
    { label: 'Name', costar: costarAcct.name, existing: existingAcct.name },
    { label: 'Type', costar: costarAcct.owner_type, existing: existingAcct.type },
    { label: 'City', costar: costarAcct.city, existing: existingAcct.location },
    { label: 'Phone', costar: costarAcct.phone, existing: existingAcct.phone },
    { label: 'Website', costar: costarAcct.website, existing: existingAcct.website },
    { label: 'Portfolio SF', costar: costarAcct.portfolio_sf?.toLocaleString(), existing: existingAcct.portfolio_sf?.toLocaleString() },
  ];
  return fields.map(f => ({
    ...f,
    differ: String(f.costar || '') !== String(f.existing || '') && f.costar && f.existing,
  }));
}

/* ─── Step 1: Upload ────────────────────────────────────────────── */
function StepUpload({ importType, onFileParsed, onTypeChange }) {
  const [drag, setDrag] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Please upload an .xlsx, .xls, or .csv file.');
      return;
    }
    setError(null);
    setParsing(true);
    try {
      const rows = await parseFile(file);
      onFileParsed(rows, file.name);
    } catch (err) {
      setError('Failed to parse file: ' + err.message);
    } finally {
      setParsing(false);
    }
  }, [onFileParsed]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <div>
      {/* Type selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {[
          { key: 'properties', label: '🏭  Properties Export', sub: 'CoStar property data with APN, SF, owner info' },
          { key: 'owners', label: '🏢  Owners Export', sub: 'CoStar owner / company portfolio data' },
        ].map(t => (
          <div key={t.key}
            onClick={() => onTypeChange(t.key)}
            style={{
              flex: 1, padding: '16px 20px', borderRadius: 10, cursor: 'pointer',
              border: importType === t.key ? '2px solid var(--blue)' : '1.5px solid var(--line)',
              background: importType === t.key ? 'rgba(59,95,138,0.05)' : '#fff',
              transition: 'all 0.15s',
            }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: importType === t.key ? 'var(--blue)' : 'var(--ink)', marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        style={S.dropZone(drag)}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>☁</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          Drag & drop your CoStar export here
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 20 }}>
          or click to browse — .xlsx, .xls, or .csv supported
        </div>
        <div style={{
          display: 'inline-block', padding: '9px 20px', borderRadius: 8,
          background: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 700,
        }}>
          {parsing ? 'Parsing…' : 'Choose File'}
        </div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--rust-bg)', color: 'var(--rust)', fontSize: 13, border: '1px solid var(--rust-bdr)' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 8, background: 'var(--bg)', fontSize: 12, color: 'var(--ink3)' }}>
        <strong style={{ color: 'var(--ink2)' }}>How to export from CoStar:</strong> Search for properties or owners → Select all → Export → Choose "Excel" format → Upload here. APN numbers are used as the primary match key to prevent duplicates.
      </div>
    </div>
  );
}

/* ─── Step 2: Preview & Match ───────────────────────────────────── */
function StepPreview({ matchResults, reviewDecisions, setReviewDecisions, autoMergeChecked, setAutoMergeChecked, newChecked, setNewChecked, importType }) {
  const [autoExpanded, setAutoExpanded] = useState(false);

  const { autoMerge, needsReview, newRecords } = matchResults;

  const totalMerging = autoMerge.filter((_, i) => autoMergeChecked[i] !== false).length;
  const totalNew = newRecords.filter((_, i) => newChecked[i] !== false).length;
  const totalReview = needsReview.filter((_, i) => reviewDecisions[i] && reviewDecisions[i] !== 'skip').length;

  const compareFields = importType === 'properties' ? getPropertyCompareFields : getAccountCompareFields;

  return (
    <div>
      {/* Summary bar */}
      <div style={S.summaryBar}>
        <div style={S.summaryChip('green')}>
          <span>✓</span> {autoMerge.length} auto-merge
        </div>
        {needsReview.length > 0 && (
          <div style={S.summaryChip('amber')}>
            <span>⚠</span> {needsReview.length} need review
          </div>
        )}
        <div style={S.summaryChip('blue')}>
          <span>+</span> {newRecords.length} new records
        </div>
        <div style={{ ...S.summaryChip('ink3' in S ? 'ink' : 'ink'), marginLeft: 'auto', background: 'var(--bg)', color: 'var(--ink3)', border: '1px solid var(--line)' }}>
          {autoMerge.length + needsReview.length + newRecords.length} total rows
        </div>
      </div>

      {/* Section A — Auto-merge */}
      {autoMerge.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={S.sectionHeader('green')} onClick={() => setAutoExpanded(v => !v)}>
            <span>✓</span>
            <span>Auto-merging ({autoMerge.length} records)</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>{autoExpanded ? '▲ collapse' : '▼ expand'}</span>
          </div>
          {autoExpanded && (
            <div style={{ border: '1px solid var(--green-bdr)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto 1fr auto', gap: 10, padding: '8px 14px', background: 'var(--bg)', fontSize: 11, fontWeight: 600, color: 'var(--ink3)' }}>
                <span></span><span>COSTAR DATA</span><span></span><span>MATCHED RECORD</span><span>CONF.</span>
              </div>
              {autoMerge.map((item, i) => {
                const label = importType === 'properties'
                  ? item.costar.address + (item.costar.city ? ', ' + item.costar.city : '')
                  : item.costar.name;
                const matchLabel = importType === 'properties'
                  ? (item.match?.address || '—') + (item.match?.city ? ', ' + item.match.city : '')
                  : (item.match?.name || '—');
                return (
                  <div key={i} style={{ ...S.matchRow, background: autoMergeChecked[i] === false ? 'rgba(255,0,0,0.03)' : 'transparent' }}>
                    <input type="checkbox" checked={autoMergeChecked[i] !== false}
                      onChange={e => setAutoMergeChecked(prev => { const n = [...prev]; n[i] = e.target.checked; return n; })}
                      style={{ accentColor: 'var(--green)' }} />
                    <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{label}</div>
                    <div style={{ color: 'var(--ink3)' }}>→</div>
                    <div style={{ color: 'var(--ink2)' }}>{matchLabel}</div>
                    <div style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{item.confidence}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section B — Needs review */}
      {needsReview.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={S.sectionHeader('amber')}>
            <span>⚠</span>
            <span>Needs Review ({needsReview.length} records)</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>Side-by-side comparison</span>
          </div>
          {needsReview.map((item, i) => {
            const fields = compareFields(item.costar, item.match);
            const decision = reviewDecisions[i] || null;
            return (
              <div key={i} style={S.compareCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                    {importType === 'properties' ? item.costar.address : item.costar.name}
                    <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, marginLeft: 10, fontFamily: "'DM Mono',monospace" }}>{item.confidence}% match</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { key: 'merge', label: 'Merge', color: 'var(--blue)' },
                      { key: 'new', label: 'Import as New', color: 'var(--green)' },
                      { key: 'skip', label: 'Skip', color: 'var(--ink3)' },
                    ].map(btn => (
                      <button key={btn.key}
                        onClick={() => setReviewDecisions(prev => { const n = { ...prev }; n[i] = btn.key; return n; })}
                        style={{
                          padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'inherit', transition: 'all 0.1s',
                          border: decision === btn.key ? `2px solid ${btn.color}` : '1.5px solid var(--line)',
                          background: decision === btn.key ? btn.color : 'transparent',
                          color: decision === btn.key ? '#fff' : 'var(--ink3)',
                        }}>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={S.compareGrid}>
                  <div style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, background: 'rgba(59,95,138,0.06)', color: 'var(--blue)' }}>CoStar Import</div>
                  <div style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, background: 'var(--bg)', color: 'var(--ink3)', borderLeft: '1px solid var(--line)' }}>Existing Clerestory Record</div>
                  {fields.map((f, fi) => (
                    <React.Fragment key={fi}>
                      <div style={{ ...S.compareCell(f.differ), borderLeft: 'none', borderRight: '1px solid var(--line)' }}>
                        <span style={{ color: 'var(--ink3)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>{f.label}</span>
                        <span style={{ color: f.differ ? 'var(--amber)' : 'var(--ink)', fontWeight: f.differ ? 600 : 400 }}>{f.costar || '—'}</span>
                      </div>
                      <div style={S.compareCell(f.differ)}>
                        <span style={{ color: 'var(--ink3)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>{f.label}</span>
                        <span style={{ color: f.differ ? 'var(--amber)' : 'var(--ink)', fontWeight: f.differ ? 600 : 400 }}>{f.existing || '—'}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section C — New records */}
      {newRecords.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={S.sectionHeader('blue')}>
            <span>+</span>
            <span>New Records ({newRecords.length})</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>Will be created fresh</span>
          </div>
          <div style={{ border: '1px solid var(--blue-bdr)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr', gap: 10, padding: '8px 14px', background: 'var(--bg)', fontSize: 11, fontWeight: 600, color: 'var(--ink3)' }}>
              <span></span>
              <span>{importType === 'properties' ? 'ADDRESS' : 'COMPANY'}</span>
              <span>{importType === 'properties' ? 'MARKET / SF' : 'TYPE'}</span>
              <span>{importType === 'properties' ? 'OWNER' : 'CITY'}</span>
            </div>
            {newRecords.map((item, i) => {
              const c = item.costar;
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--bg)', fontSize: 12, background: newChecked[i] === false ? 'rgba(255,0,0,0.03)' : 'transparent' }}>
                  <input type="checkbox" checked={newChecked[i] !== false}
                    onChange={e => setNewChecked(prev => { const n = [...prev]; n[i] = e.target.checked; return n; })}
                    style={{ accentColor: 'var(--blue)' }} />
                  <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{importType === 'properties' ? (c.address + (c.city ? ', ' + c.city : '')) : c.name}</div>
                  <div style={{ color: 'var(--ink2)' }}>{importType === 'properties' ? (c.market + (c.building_sf ? ' · ' + c.building_sf.toLocaleString() + ' SF' : '')) : c.owner_type}</div>
                  <div style={{ color: 'var(--ink3)' }}>{importType === 'properties' ? (c.owner_name || '—') : (c.city && c.state ? c.city + ', ' + c.state : '—')}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Step 3: Import progress / success ─────────────────────────── */
function StepComplete({ progress, result }) {
  if (progress < 100) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Importing records…</div>
        <div style={S.progress}>
          <div style={S.progressFill(progress)} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink3)' }}>{progress}% complete</div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontFamily: "'Playfair Display',serif" }}>Import Complete</div>
      <div style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 24 }}>
        Your Clerestory records have been updated.
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {result.merged > 0 && <div style={S.summaryChip('green')}>✓ {result.merged} merged</div>}
        {result.created > 0 && <div style={S.summaryChip('blue')}>+ {result.created} created</div>}
        {result.skipped > 0 && <div style={{ ...S.summaryChip('amber'), background: 'var(--bg)', color: 'var(--ink3)', border: '1px solid var(--line)' }}>{result.skipped} skipped</div>}
      </div>
    </div>
  );
}

/* ─── Main ImportModal ──────────────────────────────────────────── */
export default function ImportModal({
  isOpen,
  onClose,
  importType: initialType = 'properties',
  existingProperties = [],
  existingAccounts = [],
  onImportComplete,
}) {
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState(initialType);
  const [fileName, setFileName] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [matchResults, setMatchResults] = useState({ autoMerge: [], needsReview: [], newRecords: [] });
  const [reviewDecisions, setReviewDecisions] = useState({});
  const [autoMergeChecked, setAutoMergeChecked] = useState([]);
  const [newChecked, setNewChecked] = useState([]);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);

  const handleClose = () => {
    setStep(1);
    setParsedRows([]);
    setMatchResults({ autoMerge: [], needsReview: [], newRecords: [] });
    setReviewDecisions({});
    setAutoMergeChecked([]);
    setNewChecked([]);
    setProgress(0);
    setImportResult(null);
    setFileName(null);
    onClose();
  };

  const handleFileParsed = (rows, name) => {
    setFileName(name);
    setParsedRows(rows);

    // Run matching
    const autoMerge = [], needsReview = [], newRecords = [];

    if (importType === 'properties') {
      rows.forEach((row) => {
        const costar = transformProperty(row);
        const result = matchProperty(row, existingProperties);
        if (result.action === 'merge') autoMerge.push({ costar, match: result.match, confidence: result.confidence, tier: result.tier });
        else if (result.action === 'review') needsReview.push({ costar, match: result.match, confidence: result.confidence });
        else newRecords.push({ costar });
      });
    } else {
      rows.forEach((row) => {
        const costar = transformOwner(row);
        const result = matchAccount(row['Company Name'], existingAccounts);
        if (result.action === 'merge') autoMerge.push({ costar, match: result.match, confidence: result.confidence });
        else if (result.action === 'review') needsReview.push({ costar, match: result.match, confidence: result.confidence });
        else newRecords.push({ costar });
      });
    }

    setMatchResults({ autoMerge, needsReview, newRecords });
    setAutoMergeChecked(autoMerge.map(() => true));
    setNewChecked(newRecords.map(() => true));
    setReviewDecisions({});
    setStep(2);
  };

  const handleImport = async () => {
    setStep(3);
    setProgress(0);

    const { autoMerge, needsReview, newRecords } = matchResults;

    const toMerge = autoMerge.filter((_, i) => autoMergeChecked[i] !== false);
    const reviewMerge = needsReview.filter((_, i) => reviewDecisions[i] === 'merge');
    const reviewNew = needsReview.filter((_, i) => reviewDecisions[i] === 'new');
    const toCreate = [
      ...newRecords.filter((_, i) => newChecked[i] !== false),
      ...reviewNew,
    ];

    // Real Supabase inserts/updates with progress
    const table = importType === 'properties' ? 'properties' : 'accounts';
    const total = toMerge.length + reviewMerge.length + toCreate.length;
    let done = 0;

    // Process merges (update existing records)
    for (const item of [...toMerge, ...reviewMerge]) {
      try {
        if (item.match?.id) {
          await updateRecord(table, item.match.id, item.costar);
        }
      } catch (e) { console.error('Import merge error:', e); }
      done++;
      setProgress(Math.round((done / Math.max(total, 1)) * 100));
    }

    // Process new records (insert)
    for (const item of toCreate) {
      try {
        await insertRecord(table, item.costar);
      } catch (e) { console.error('Import insert error:', e); }
      done++;
      setProgress(Math.round((done / Math.max(total, 1)) * 100));
    }

    setProgress(100);

    const result = {
      merged: toMerge.length + reviewMerge.length,
      created: toCreate.length,
      skipped: needsReview.filter((_, i) => reviewDecisions[i] === 'skip').length +
        autoMerge.filter((_, i) => autoMergeChecked[i] === false).length +
        newRecords.filter((_, i) => newChecked[i] === false).length,
    };
    setImportResult(result);

    // Build imported records for parent
    const importedProperties = importType === 'properties'
      ? toCreate.map(item => ({ ...item.costar, id: Date.now() + Math.random(), sf: item.costar.building_sf, status: 'occupied', score: 70, grade: 'B', scoreColor: 'var(--ink3)', catalysts: [], market: item.costar.market || 'SGV' }))
      : [];

    // Auto-create accounts from owner fields in property rows
    const newAccountsFromProps = importType === 'properties'
      ? toCreate
          .filter(item => item.costar.owner_name)
          .map(item => {
            const acctMatch = matchAccount(item.costar.owner_name, existingAccounts);
            if (acctMatch.action === 'new') {
              return { id: Date.now() + Math.random(), name: item.costar.owner_name, type: 'Private Investor', tabKey: 'owner-user', location: item.costar.city + ', ' + item.costar.state, tags: [{ label: 'CoStar Import', color: 'blue' }], props: 1, deals: 0, statLabel: 'Properties', statVal: '1', contacts: item.costar.owner_contact || 'Unknown' };
            }
            return null;
          })
          .filter(Boolean)
      : [];

    const importedAccounts = importType === 'owners'
      ? toCreate.map(item => ({ ...item.costar, id: Date.now() + Math.random(), initial: (item.costar.name || 'A')[0].toUpperCase(), type: item.costar.owner_type, tabKey: 'owner-user', location: item.costar.city && item.costar.state ? item.costar.city + ', ' + item.costar.state : 'Unknown', tags: [{ label: 'CoStar Import', color: 'blue' }], props: item.costar.total_properties || 0, deals: 0, statLabel: 'Portfolio SF', statVal: (item.costar.portfolio_sf || 0).toLocaleString(), contacts: '—' }))
      : newAccountsFromProps;

    onImportComplete?.({ importedProperties, importedAccounts, result });
  };

  if (!isOpen) return null;

  const canProceedStep2 = () => {
    const { needsReview } = matchResults;
    // All review items must have a decision
    return needsReview.every((_, i) => !!reviewDecisions[i]);
  };

  const totalToImport = () => {
    const { autoMerge, needsReview, newRecords } = matchResults;
    const m = autoMerge.filter((_, i) => autoMergeChecked[i] !== false).length;
    const rv = needsReview.filter((_, i) => reviewDecisions[i] && reviewDecisions[i] !== 'skip').length;
    const n = newRecords.filter((_, i) => newChecked[i] !== false).length;
    return m + rv + n;
  };

  return (
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ fontSize: 22 }}>📥</div>
          <div style={S.headerTitle}>Import from CoStar</div>
          {fileName && step === 2 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Mono',monospace" }}>{fileName}</div>
          )}
          <button style={S.closeBtn} onClick={handleClose}>✕</button>
        </div>

        {/* Steps */}
        <div style={S.steps}>
          {[
            { n: 1, label: 'Upload File' },
            { n: 2, label: 'Preview & Match' },
            { n: 3, label: 'Confirm & Import' },
          ].map(s => (
            <div key={s.n} style={S.stepItem(step === s.n, step > s.n)}>
              <div style={S.stepNum(step === s.n, step > s.n)}>
                {step > s.n ? '✓' : s.n}
              </div>
              {s.label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={S.body}>
          {step === 1 && (
            <StepUpload
              importType={importType}
              onFileParsed={handleFileParsed}
              onTypeChange={setImportType}
            />
          )}
          {step === 2 && (
            <StepPreview
              matchResults={matchResults}
              reviewDecisions={reviewDecisions}
              setReviewDecisions={setReviewDecisions}
              autoMergeChecked={autoMergeChecked}
              setAutoMergeChecked={setAutoMergeChecked}
              newChecked={newChecked}
              setNewChecked={setNewChecked}
              importType={importType}
            />
          )}
          {step === 3 && (
            <StepComplete progress={progress} result={importResult || { merged: 0, created: 0, skipped: 0 }} />
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          {step === 1 && (
            <button style={S.btnGhost} onClick={handleClose}>Cancel</button>
          )}
          {step === 2 && (
            <>
              <button style={S.btnGhost} onClick={() => setStep(1)}>← Back</button>
              {!canProceedStep2() && matchResults.needsReview.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--amber)', display: 'flex', alignItems: 'center', marginRight: 8 }}>
                  ⚠ Resolve all {matchResults.needsReview.length} review items to continue
                </div>
              )}
              <button
                style={{ ...S.btnBlue, opacity: canProceedStep2() ? 1 : 0.5, cursor: canProceedStep2() ? 'pointer' : 'not-allowed' }}
                onClick={canProceedStep2() ? handleImport : undefined}
                disabled={!canProceedStep2()}
              >
                Import {totalToImport()} Records →
              </button>
            </>
          )}
          {step === 3 && progress === 100 && (
            <button style={S.btnBlue} onClick={handleClose}>Done ✓</button>
          )}
        </div>
      </div>
    </div>
  );
}
