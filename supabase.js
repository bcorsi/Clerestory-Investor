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

  const statCards = [
    { label: 'Total loaded', value: rawData.length, color: 'var(--text-primary)' },
    { label: 'Industrial (SGV/IE)', value: rawData.filter(r => isIndustrial(r) && isInMarket(r)).length, color: 'var(--accent)' },
    { label: 'New (14d)', value: newCount, color: '#22c55e' },
    { label: 'Tenant matches', value: tenantMatches.length, color: '#ef4444' },
  ];

  return (
    <div>
      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* UPLOAD + FILTERS */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ padding: '6px 14px', background: 'var(--accent)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            📂 Upload WARN CSV
            <input type="file" accept=".csv,.tsv,.txt" onChange={handleUpload} style={{ display: 'none' }} />
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[['all', 'All'], ['industrial', 'Industrial'], ['sgv-ie', 'SoCal Industrial']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid', fontSize: '12px', cursor: 'pointer', background: filter === v ? 'var(--accent-soft)' : 'transparent', borderColor: filter === v ? 'var(--accent)' : 'var(--border)', color: filter === v ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 500 }}>{l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[['all', 'All dates'], ['14d', '14 days'], ['30d', '30 days'], ['90d', '90 days']].map(([v, l]) => (
              <button key={v} onClick={() => setDateRange(v)} style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid', fontSize: '12px', cursor: 'pointer', background: dateRange === v ? 'var(--accent-soft)' : 'transparent', borderColor: dateRange === v ? 'var(--accent)' : 'var(--border)', color: dateRange === v ? 'var(--accent)' : 'var(--text-muted)' }}>{l}</button>
            ))}
          </div>
          <input className="input" style={{ flex: 1, minWidth: '180px', fontSize: '13px' }} placeholder="Search company or address..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {rawData.length > 0 && <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', color: 'var(--red)' }} onClick={() => { if (confirm(`Delete all ${rawData.length} loaded WARN notices?`)) setRawData([]); }}>🗑 Clear All</button>}
        </div>
      </div>

      {/* TENANT MATCH ALERTS */}
      {tenantMatches.length > 0 && (
        <div className="card" style={{ marginBottom: '16px', borderLeft: '3px solid #ef4444' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444', marginBottom: '10px' }}>⚠ Tenant Matches — Your Properties</h3>
          {tenantMatches.map(r => (
            <div key={r.id} style={{ padding: '10px 12px', background: 'var(--red-soft)', borderRadius: '6px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{r.company}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.employees} employees · {r.eventType} · {r.noticeDate}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }} onClick={() => handleResearch(r)} disabled={researching[r.id]}>{researching[r.id] ? '...' : '🔍 Research'}</button>
                <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} onClick={() => handleConvertToLead(r)} disabled={converting[r.id]}>{converting[r.id] ? '...' : '→ Lead'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MAIN TABLE */}
      {rawData.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No WARN data loaded</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Download the latest WARN report from <a href="https://edd.ca.gov/en/jobs_and_training/layoff_services_warn" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>EDD.ca.gov</a> and upload the CSV above.
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>Showing {filtered.length} of {rawData.length} notices</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Date</th>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Company</th>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Industry</th>
                <th style={{ textAlign: 'right', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>EEs</th>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Event</th>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>County</th>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Address</th>
                <th style={{ textAlign: 'center', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.slice(0, 200).map(r => {
                  const isMatch = tenantNames.has(r.company.toLowerCase()) || [...tenantNames].some(t => r.company.toLowerCase().includes(t));
                  const isRecent = isNew(r, 14);
                  const sicFirst = (r.sic || '').charAt(0);
                  const bizType = SIC_LABELS[sicFirst] || (isIndustrial(r) ? 'Industrial (keyword)' : '—');
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: isMatch ? 'var(--red-soft)' : isRecent ? 'var(--accent-soft)' : 'transparent' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {r.noticeDate}
                        {isRecent && <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: '#22c55e22', color: '#22c55e', fontWeight: 700 }}>NEW</span>}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 500 }}>
                        {r.company}
                        {isMatch && <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: '#ef444422', color: '#ef4444', fontWeight: 700 }}>MATCH</span>}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>{bizType}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, textAlign: 'right', color: r.employees >= 200 ? '#ef4444' : r.employees >= 50 ? '#f59e0b' : 'var(--text-primary)' }}>{r.employees.toLocaleString()}</td>
                      <td style={{ padding: '8px 10px', fontSize: '13px' }}>{r.eventType}</td>
                      <td style={{ padding: '8px 10px', fontSize: '13px', color: 'var(--text-muted)' }}>{r.county}</td>
                      <td style={{ padding: '8px 10px', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => handleResearch(r)} disabled={researching[r.id]}>{researching[r.id] ? '...' : '🔍'}</button>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => handleConvertToLead(r)} disabled={converting[r.id]}>{converting[r.id] ? '...' : '→'}</button>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--red)' }} onClick={() => setRawData(prev => prev.filter(x => x.id !== r.id))}>×</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && <div style={{ textAlign: 'center', padding: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>Showing first 200 of {filtered.length}</div>}

          {/* Expanded research results */}
          {Object.keys(researchResults).length > 0 && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Research Results</h3>
              {Object.entries(researchResults).map(([id, text]) => {
                const row = rawData.find(r => r.id === id);
                const maTags = enrichedTags[id] || [];
                return (
                  <div key={id} style={{ padding: '14px', background: '#8b5cf611', border: '1px solid #8b5cf633', borderRadius: '8px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{row?.company || id}</span>
                        {maTags.map(t => <span key={t} className="tag tag-red" style={{ fontSize: '11px' }}>{t}</span>)}
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} onClick={() => row && handleConvertToLead(row)} disabled={!row || converting[id]}>→ Convert to Lead{maTags.length > 0 ? ' (+ M&A)' : ''}</button>
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
