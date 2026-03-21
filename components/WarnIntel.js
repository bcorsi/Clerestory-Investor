'use client';

import { useState, useMemo } from 'react';
import { WARN_CITIES, AI_MODEL_OPUS, AI_MODEL_SONNET, fmt } from '../lib/constants';
import { insertRow } from '../lib/db';

const INDUSTRIAL_SIC = ['2', '3', '4', '5'];
const SIC_LABELS = {
  '2': 'Food/Textile/Lumber/Paper',
  '3': 'Manufacturing',
  '4': 'Transport/Utilities',
  '5': 'Wholesale/Retail',
};

function parseWarnCsv(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t').length > 3 ? lines[i].split('\t') : lines[i].split(',');
    if (cols.length < 6) continue;
    const clean = cols.map(c => c.replace(/^"|"$/g, '').trim());
    const county = clean[0], noticeDate = clean[1], effectiveDate = clean[2];
    const company = clean[3], employees = parseInt(clean[4]) || 0;
    const address = clean[5] || '';
    const eventType = clean[6] || 'Closure';
    const layoffOrClosure = clean[7] || eventType;
    const naicsOrSic = clean[8] || '';
    const parsed = Date.parse(noticeDate);
    if (isNaN(parsed)) continue;
    rows.push({
      id: `${county}-${company}-${noticeDate}-${employees}`,
      county, noticeDate, effectiveDate, company, employees,
      address, eventType: layoffOrClosure || eventType,
      sic: naicsOrSic, parsedDate: new Date(parsed),
    });
  }
  return rows;
}

function isIndustrial(row) {
  const s = (row.sic || '').charAt(0);
  if (INDUSTRIAL_SIC.includes(s)) return true;
  const lc = (row.company + ' ' + row.address).toLowerCase();
  return ['warehouse', 'distribution', 'logistics', 'manufacturing', 'industrial', 'freight', 'trucking', 'cold storage', 'food process', 'fabricat', 'machining', 'packaging', 'assembly'].some(k => lc.includes(k));
}

function isInMarket(row) {
  const lc = (row.address + ' ' + row.county).toLowerCase();
  return WARN_CITIES.some(c => lc.includes(c.toLowerCase()));
}

function isNew(row, days = 14) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  return row.parsedDate >= cutoff;
}

export default function WarnIntel({ properties, leads, onRefresh, showToast }) {
  const [rawData, setRawData] = useState([]);
  const [filter, setFilter] = useState('sgv-ie'); // all, industrial, sgv-ie
  const [searchTerm, setSearchTerm] = useState('');
  const [researching, setResearching] = useState({});
  const [researchResults, setResearchResults] = useState({});
  const [converting, setConverting] = useState({});
  const [dateRange, setDateRange] = useState('all'); // all, 14d, 30d, 90d

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseWarnCsv(ev.target.result);
      // Dedup
      const existing = new Set(rawData.map(r => r.id));
      const newRows = parsed.filter(r => !existing.has(r.id));
      setRawData(prev => [...prev, ...newRows].sort((a, b) => b.parsedDate - a.parsedDate));
      showToast?.(`Loaded ${newRows.length} new notices (${parsed.length - newRows.length} dupes skipped)`);
    };
    reader.readAsText(file);
  };

  const tenantNames = useMemo(() => new Set(
    (properties || []).map(p => p.tenant?.toLowerCase()).filter(Boolean)
  ), [properties]);

  const filtered = useMemo(() => {
    let rows = rawData;
    if (filter === 'industrial') rows = rows.filter(isIndustrial);
    if (filter === 'sgv-ie') rows = rows.filter(r => isIndustrial(r) && isInMarket(r));
    if (dateRange === '14d') rows = rows.filter(r => isNew(r, 14));
    if (dateRange === '30d') rows = rows.filter(r => isNew(r, 30));
    if (dateRange === '90d') rows = rows.filter(r => isNew(r, 90));
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(r => r.company.toLowerCase().includes(q) || r.address.toLowerCase().includes(q) || r.county.toLowerCase().includes(q));
    }
    return rows;
  }, [rawData, filter, searchTerm, dateRange]);

  const tenantMatches = useMemo(() => {
    return filtered.filter(r => {
      const co = r.company.toLowerCase();
      return [...tenantNames].some(t => co.includes(t) || t.includes(co.split(/\s+/)[0]));
    });
  }, [filtered, tenantNames]);

  const newCount = useMemo(() => rawData.filter(r => isNew(r, 14) && isIndustrial(r) && isInMarket(r)).length, [rawData]);

  // Research company via AI + web search
  // M&A signal detection keywords
  const MA_SIGNALS = {
    'M&A - Acquisition': ['acquired by', 'acquisition', 'purchased by', 'bought by', 'takeover'],
    'M&A - Consolidation': ['consolidat', 'merged with', 'merger', 'combining operations'],
    'Relocation Risk': ['relocat', 'moving to', 'moved operations', 'shifting production', 'out of state'],
    'Expansion Potential': ['expand', 'new facility', 'growing', 'additional space'],
    'Downsizing': ['downsiz', 'shrinking', 'reducing footprint', 'cutting operations'],
    'Corporate Restructuring': ['restructur', 'reorganiz', 'chapter 11', 'spinoff', 'spin-off'],
    'Bankruptcy': ['bankrupt', 'chapter 7', 'chapter 11', 'insolvency', 'liquidat'],
  };

  const detectMaSignals = (text) => {
    const lc = text.toLowerCase();
    const found = [];
    for (const [tag, keywords] of Object.entries(MA_SIGNALS)) {
      if (keywords.some(k => lc.includes(k))) found.push(tag);
    }
    return found;
  };

  const [enrichedTags, setEnrichedTags] = useState({});

  const handleResearch = async (row) => {
    setResearching(prev => ({ ...prev, [row.id]: true }));
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_MODEL_OPUS, max_tokens: 800,
          system: 'You are a CRE brokerage research assistant specializing in SoCal industrial. Research this company and provide intel useful for a broker. Include: what the company does, size/revenue, property usage (warehouse, manufacturing, etc.), any M&A activity (acquisitions, mergers, consolidations), relocation plans, expansion or downsizing signals, and CRE opportunity. Flag any M&A, restructuring, relocation, or expansion explicitly. Be concise and actionable.',
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: `Research "${row.company}" at ${row.address}. They filed a WARN notice on ${row.noticeDate} affecting ${row.employees} employees (${row.eventType}). County: ${row.county}. What do they do, any M&A activity, relocation, expansion, downsizing, or restructuring? What's the CRE opportunity?` }],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      setResearchResults(prev => ({ ...prev, [row.id]: text || 'No results found.' }));
      // Detect M&A signals and store enriched tags
      const maTags = detectMaSignals(text);
      if (maTags.length > 0) {
        setEnrichedTags(prev => ({ ...prev, [row.id]: maTags }));
      }
    } catch (e) {
      setResearchResults(prev => ({ ...prev, [row.id]: 'Error: ' + e.message }));
    } finally {
      setResearching(prev => ({ ...prev, [row.id]: false }));
    }
  };

  // Convert to Lead
  const handleConvertToLead = async (row) => {
    setConverting(prev => ({ ...prev, [row.id]: true }));
    try {
      const existingLead = (leads || []).find(l => l.lead_name?.toLowerCase().includes(row.company.toLowerCase().split(/\s+/)[0]));
      if (existingLead) { showToast?.('Lead already exists for this company'); setConverting(prev => ({ ...prev, [row.id]: false })); return; }

      const baseTags = ['WARN Notice'];
      const maTags = enrichedTags[row.id] || [];
      const allTags = [...new Set([...baseTags, ...maTags])];
      // M&A stacking increases priority
      const hasMa = maTags.length > 0;
      const priority = hasMa ? 'High' : row.employees >= 100 ? 'High' : 'Medium';
      const tier = hasMa ? 'A' : row.employees >= 200 ? 'A' : row.employees >= 50 ? 'B' : 'C';

      await insertRow('leads', {
        lead_name: `${row.company} — WARN ${row.noticeDate}`,
        address: row.address || null,
        submarket: null,
        company: row.company,
        owner: null,
        catalyst_tags: allTags,
        priority,
        stage: 'Lead',
        tier,
        notes: `WARN Notice: ${row.eventType} affecting ${row.employees} employees.\nFiled: ${row.noticeDate}\nEffective: ${row.effectiveDate}\nCounty: ${row.county}\nAddress: ${row.address}${maTags.length ? '\n\nM&A Signals Detected: ' + maTags.join(', ') : ''}\n\n${researchResults[row.id] ? '--- AI Research ---\n' + researchResults[row.id] : ''}`,
      });
      onRefresh?.();
      showToast?.(`Lead created: ${row.company}`);
    } catch (e) { console.error(e); showToast?.('Error creating lead'); }
    finally { setConverting(prev => ({ ...prev, [row.id]: false })); }
  };

  const permClosures = filtered.filter(r => (r.warn_type || r.layoff_type || '').toLowerCase().includes('closure')).length;
  const convertedCount = filtered.filter(r => r._converted).length;

  const statCards = [
    { label: 'Total loaded', value: rawData.length, color: 'var(--text-primary)' },
    { label: 'Industrial (SGV/IE)', value: rawData.filter(r => isIndustrial(r) && isInMarket(r)).length, color: 'var(--accent)' },
    { label: 'New (14d)', value: newCount, color: 'var(--green)' },
    { label: 'Tenant matches', value: tenantMatches.length, color: 'var(--rust)' },
  ];

  return (
    <div>
      {/* ═══ PAGE HEADER ═══ */}
      <div style={{ padding: '28px 36px 20px', background: 'var(--card)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '34px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>WARN <em style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue)' }}>Intelligence</em></div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '16px', fontStyle: 'italic', fontWeight: 300, color: 'var(--ink4)', marginTop: '6px' }}>The edge is in the data.</div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink4)', textAlign: 'right', paddingTop: '6px' }}>
            CA Worker Adjustment &amp; Retraining Notification<br />Auto-updating · Filtered to SoCal Industrial
          </div>
        </div>
      </div>

      {/* ═══ SIGNAL STRIP ═══ */}
      {newCount > 0 && (
        <div style={{ padding: '20px 36px', background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', gap: '16px', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--blue2)', borderRadius: '0 2px 2px 0' }} />
          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: 'var(--blue2)', flexShrink: 0, animation: 'pulse 2.2s infinite', boxShadow: '0 0 10px rgba(107,131,166,0.6)' }} />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '19px', fontStyle: 'italic', color: 'var(--blue2)', flexShrink: 0 }}>Signal</div>
          <div style={{ fontSize: '15px', lineHeight: 1.72, color: 'var(--ink2)' }}>
            <strong style={{ color: 'var(--blue)' }}>{newCount} new notices</strong> in the last 14 days match your SoCal industrial focus.
            {tenantMatches.length > 0 && <> <strong style={{ color: 'var(--blue)' }}>{tenantMatches.length} tenant matches</strong> found against your properties.</>}
          </div>
        </div>
      )}

      {/* ═══ STATS ROW ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid var(--line)', background: 'var(--card)' }}>
        {[
          ['New This Week', newCount, newCount > 0 ? 'var(--rust)' : 'var(--ink)', 'SoCal industrial'],
          ['Total Loaded', rawData.length, 'var(--ink)', 'all records'],
          ['Perm. Closures', permClosures, permClosures > 0 ? 'var(--rust)' : 'var(--ink)', 'highest priority'],
          ['Tenant Matches', tenantMatches.length, tenantMatches.length > 0 ? 'var(--blue)' : 'var(--ink)', 'against your properties'],
          ['Converted', convertedCount, 'var(--blue)', 'to active leads'],
        ].map(([label, val, color, sub]) => (
          <div key={label} style={{ padding: '20px 24px 16px', borderRight: '1px solid var(--line)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '8px' }}>{label}</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '36px', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink3)', marginTop: '5px' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ═══ UPLOAD + FILTERS ═══ */}
      <div style={{ padding: '14px 36px', borderBottom: '1px solid var(--line)', background: 'var(--bg2)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          📂 Upload WARN CSV
          <input type="file" accept=".csv,.tsv,.txt" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
        {[['all', 'All'], ['industrial', 'Industrial'], ['sgv-ie', 'SoCal Industrial']].map(([v, l]) => (
          <button key={v} className={`filter-chip ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
        <input className="input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search company, city..." style={{ maxWidth: '220px', marginLeft: 'auto' }} />
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', padding: '0' }}>
        {/* FEED */}
        <div style={{ borderRight: '1px solid var(--line)' }}>
          <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--line)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink2)' }}>WARN Notices</div>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '12px', color: 'var(--ink4)' }}>{filtered.length} records</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink4)', fontSize: '14px' }}>
              {rawData.length === 0 ? 'Upload a WARN CSV to begin' : 'No records match filters'}
            </div>
          ) : (
            <div>
              {filtered.slice(0, 50).map((r, i) => {
                const isMatch = tenantMatches.some(m => m.id === r.id);
                const isNew = r.notice_date && (Date.now() - new Date(r.notice_date)) < 14 * 86400000;
                const isClosure = (r.warn_type || r.layoff_type || '').toLowerCase().includes('closure');
                return (
                  <div key={r.id || i} style={{ padding: '16px 24px', borderBottom: '1px solid var(--line3)', background: 'var(--card)', cursor: 'pointer', transition: 'background 0.1s', borderLeft: isMatch ? '3px solid var(--blue2)' : isNew ? '3px solid var(--amber)' : '3px solid transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink2)' }}>{r.company || r.employer || '—'}</div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {isMatch && <span className="badge badge-blue">MATCH</span>}
                        {isNew && <span className="badge badge-amber">NEW</span>}
                        {isClosure && <span className="badge badge-warn">Closure</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--ink3)', marginBottom: '6px' }}>{r.address || r.city || '—'}{r.county ? ' · ' + r.county : ''}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '12px' }}>
                      <div><span style={{ color: 'var(--ink4)' }}>Employees: </span><span style={{ fontWeight: 600, color: 'var(--ink2)' }}>{r.employees || r.num_affected || '—'}</span></div>
                      <div><span style={{ color: 'var(--ink4)' }}>Type: </span><span style={{ fontWeight: 500, color: isClosure ? 'var(--rust)' : 'var(--ink2)' }}>{r.warn_type || r.layoff_type || '—'}</span></div>
                      <div><span style={{ color: 'var(--ink4)' }}>Effective: </span><span style={{ fontFamily: "'DM Mono',monospace", color: 'var(--ink2)' }}>{r.effective_date || '—'}</span></div>
                      <div><span style={{ color: 'var(--ink4)' }}>Filed: </span><span style={{ fontFamily: "'DM Mono',monospace", color: 'var(--ink2)' }}>{r.notice_date || r.received_date || '—'}</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button className="btn btn-sm" onClick={e => { e.stopPropagation(); handleConvertToLead(r); }}>→ Convert to Lead</button>
                      {r._aiResearch && <div style={{ fontSize: '12px', color: 'var(--purple)', fontWeight: 500 }}>✦ Researched</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SIDEBAR — County Breakdown */}
        <div style={{ background: 'var(--card)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', background: 'var(--bg)', fontSize: '13px', fontWeight: 600, color: 'var(--ink2)' }}>By County</div>
          <div style={{ padding: '12px 18px' }}>
            {(() => {
              const counties = {};
              filtered.forEach(r => { const c = r.county || 'Unknown'; counties[c] = (counties[c] || 0) + 1; });
              const sorted = Object.entries(counties).sort((a, b) => b[1] - a[1]);
              const max = sorted.length > 0 ? sorted[0][1] : 1;
              return sorted.map(([county, count]) => (
                <div key={county} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--ink3)', width: '120px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{county}</span>
                  <div style={{ flex: 1, height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: 'var(--blue)', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '12px', fontWeight: 600, color: 'var(--ink2)', minWidth: '24px' }}>{count}</span>
                </div>
              ));
            })()}
          </div>

          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--bg)', fontSize: '13px', fontWeight: 600, color: 'var(--ink2)' }}>Recent Activity</div>
          <div style={{ padding: '8px 0' }}>
            {filtered.slice(0, 5).map((r, i) => (
              <div key={i} style={{ padding: '10px 18px', borderBottom: '1px solid var(--line3)', fontSize: '12px' }}>
                <div style={{ fontWeight: 500, color: 'var(--ink2)', marginBottom: '2px' }}>{r.company || r.employer || '—'}</div>
                <div style={{ color: 'var(--ink4)' }}>{r.city || '—'} · {r.notice_date || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
