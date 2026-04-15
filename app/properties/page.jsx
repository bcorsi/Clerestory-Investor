'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ──────────────────────────────────────────────
   INVESTOR MODE — Acquisition Targets
   app/properties/page.jsx
   Matches: properties-list-investor.html mockup
   ────────────────────────────────────────────── */

// ─── Helpers ─────────────────────────────────
const fmt = (n) => n == null ? '—' : Number(n).toLocaleString();
const fmtSF = (n) => {
  if (n == null) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  return fmt(n);
};
const fmtCurrency = (n) => {
  if (n == null) return '—';
  if (n >= 1000000000) return `$${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(0)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${fmt(n)}`;
};
const getGrade = (s) => {
  if (s == null) return '—';
  if (s >= 85) return 'A+'; if (s >= 70) return 'A'; if (s >= 55) return 'B+';
  if (s >= 40) return 'B'; return 'C';
};
const getScoreColor = (s) => {
  if (s == null) return 'var(--ink4)';
  if (s >= 80) return 'var(--blue)'; if (s >= 60) return 'var(--amber)'; return 'var(--ink3)';
};
const getORSColor = (s) => {
  if (s == null) return 'var(--ink3)';
  if (s >= 70) return 'var(--rust)'; if (s >= 50) return 'var(--amber)'; return 'var(--ink3)';
};

// ─── Strategy tag colors ─────────────────────
const STRATEGY_COLORS = {
  'SLB': { bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', text: 'var(--green)' },
  'Value-Add': { bg: 'var(--amber-bg)', bdr: 'var(--amber-bdr)', text: 'var(--amber)' },
  'Core+': { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', text: 'var(--blue)' },
  'Core': { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', text: 'var(--blue)' },
  'Vacant': { bg: 'var(--rust-bg)', bdr: 'var(--rust-bdr)', text: 'var(--rust)' },
};
const getStrategyStyle = (s) => STRATEGY_COLORS[s] || STRATEGY_COLORS['Core+'];

// Catalyst tag colors
const getTagStyle = (tag) => {
  if (!tag) return { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', text: 'var(--blue)' };
  const t = tag.toLowerCase();
  if (t.includes('warn') || t.includes('nod') || t.includes('owner')) return { bg: 'var(--rust-bg)', bdr: 'var(--rust-bdr)', text: 'var(--rust)' };
  if (t.includes('lease') || t.includes('vacant') || t.includes('value')) return { bg: 'var(--amber-bg)', bdr: 'var(--amber-bdr)', text: 'var(--amber)' };
  if (t.includes('slb') || t.includes('market') || t.includes('land')) return { bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', text: 'var(--green)' };
  if (t.includes('capex') || t.includes('roof') || t.includes('seismic')) return { bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', text: 'var(--purple)' };
  return { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', text: 'var(--blue)' };
};

// Determine strategy from catalyst_tags or property fields
const getStrategy = (p) => {
  const tags = p.catalyst_tags || [];
  for (const t of tags) {
    if (t.toLowerCase().includes('slb')) return 'SLB';
    if (t.toLowerCase().includes('value')) return 'Value-Add';
    if (t.toLowerCase().includes('core')) return 'Core+';
  }
  if (p.strategy) return p.strategy;
  if (p.occupancy_status?.toLowerCase().includes('vacant')) return 'Vacant';
  return null;
};

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortCol, setSortCol] = useState('portfolio_fit_score');
  const [sortDir, setSortDir] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { fetchProperties(); }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('ai_score', { ascending: false });
      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Filter + Search + Sort ────────────────
  const filtered = useMemo(() => {
    let list = [...properties];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.property_name || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.submarket || '').toLowerCase().includes(q) ||
        (p.owner || '').toLowerCase().includes(q)
      );
    }
    switch (activeFilter) {
      case 'High Fit': list = list.filter(p => (p.portfolio_fit_score || 0) >= 80); break;
      case 'WARN Signal': list = list.filter(p => (p.catalyst_tags || []).some(t => t.toLowerCase().includes('warn'))); break;
      case 'SLB': list = list.filter(p => getStrategy(p) === 'SLB'); break;
      case 'Value-Add': list = list.filter(p => getStrategy(p) === 'Value-Add'); break;
      case 'Core+': list = list.filter(p => getStrategy(p) === 'Core+' || getStrategy(p) === 'Core'); break;
      case 'SGV': list = list.filter(p => (p.market || p.submarket || '').toLowerCase().includes('sgv')); break;
      case 'IE': list = list.filter(p => (p.market || p.submarket || '').toLowerCase().includes('ie')); break;
    }
    list.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (va == null) va = sortDir === 'desc' ? -Infinity : Infinity;
      if (vb == null) vb = sortDir === 'desc' ? -Infinity : Infinity;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    return list;
  }, [properties, search, activeFilter, sortCol, sortDir]);

  // ─── KPIs ──────────────────────────────────
  const kpis = useMemo(() => {
    const total = filtered.length;
    const highFit = filtered.filter(p => (p.portfolio_fit_score || 0) >= 80).length;
    const signals = filtered.filter(p => (p.catalyst_tags || []).length > 0).length;
    const offMarket = filtered.filter(p => !p.active_listing && !p.broker_on_file).length;
    const estValue = filtered.reduce((s, p) => s + (p.estimated_value || 0), 0);
    return { total, highFit, signals, offMarket, estValue };
  }, [filtered]);

  // ─── Filter counts ─────────────────────────
  const filterCounts = useMemo(() => ({
    all: properties.length,
    highFit: properties.filter(p => (p.portfolio_fit_score || 0) >= 80).length,
    sgv: properties.filter(p => (p.market || p.submarket || '').toLowerCase().includes('sgv')).length,
    ie: properties.filter(p => (p.market || p.submarket || '').toLowerCase().includes('ie')).length,
  }), [properties]);

  const handleSort = useCallback((col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }, [sortCol]);

  // ─── Add Target Modal ──────────────────────
  const [newProp, setNewProp] = useState({ property_name: '', address: '', city: '', state: 'CA', zip: '' });
  const handleAddTarget = async () => {
    if (!newProp.property_name && !newProp.address) return;
    try {
      const { error } = await supabase.from('properties').insert([{
        property_name: newProp.property_name || newProp.address,
        address: newProp.address, city: newProp.city, state: newProp.state, zip: newProp.zip,
      }]);
      if (error) throw error;
      setShowAddModal(false);
      setNewProp({ property_name: '', address: '', city: '', state: 'CA', zip: '' });
      fetchProperties();
    } catch (err) { alert('Error: ' + err.message); }
  };

  // ─── CSV Import ────────────────────────────
  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { alert('CSV must have header + data'); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || null; });
        if (row.property_name || row.address) rows.push(row);
      }
      if (rows.length === 0) { alert('No valid rows'); return; }
      const { error } = await supabase.from('properties').insert(rows);
      if (error) throw error;
      alert(`Imported ${rows.length} properties`);
      fetchProperties();
    } catch (err) { alert('Import error: ' + err.message); }
    e.target.value = '';
  };

  // ─── Column definitions ────────────────────
  const sortLabel = {
    portfolio_fit_score: 'Portfolio Fit',
    ai_score: 'Bldg Score',
    ors_score: 'ORS',
    total_sf: 'SF',
    clear_height: 'Clear Ht',
    estimated_cap_rate: 'Cap Est',
    basis_per_sf: 'Basis $/SF',
  };

  return (
    <>
      {/* ─── Page Header ─── */}
      <div style={{ padding: '22px 0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Acquisition Targets
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 }}>
            {loading ? 'Loading…' : `${kpis.total} properties scored · ${fmtSF(filtered.reduce((s, p) => s + (p.total_sf || p.building_sf || 0), 0))} SF · SGV / IE Industrial · ranked by Portfolio Fit × ORS`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => {}} style={btnGhost}>⊕ Filter</button>
          <label style={{ ...btnGhost, cursor: 'pointer' }}>
            ↑ Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
          </label>
          <button onClick={() => setShowAddModal(true)} style={btnPrimary}>+ Add Target</button>
        </div>
      </div>

      {/* ─── KPI Strip ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
        <KPICard icon="🏢" bg="var(--blue-bg)" color="var(--blue)" value={kpis.total} label="Total Targets" />
        <KPICard icon="◉" bg="var(--green-bg)" color="var(--green)" value={kpis.highFit} label="High Fit (≥80)" />
        <KPICard icon="⚡" bg="var(--rust-bg)" color="var(--rust)" value={kpis.signals} label="Active Signals" />
        <KPICard icon="◎" bg="var(--amber-bg)" color="var(--amber)" value={kpis.offMarket} label="Off-Market Only" />
        <KPICard icon="◫" bg="var(--purple-bg)" color="var(--purple)" value={fmtCurrency(kpis.estValue)} label="Est. Target Value" />
      </div>

      {/* ─── Filter Chips ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Chip label="All" count={filterCounts.all} active={activeFilter === 'All'} onClick={() => setActiveFilter('All')} />
        <Chip label="High Fit" count={filterCounts.highFit} active={activeFilter === 'High Fit'} onClick={() => setActiveFilter('High Fit')} />
        <Chip label="WARN Signal" dot="var(--rust)" active={activeFilter === 'WARN Signal'} onClick={() => setActiveFilter('WARN Signal')} />
        <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
        <Chip label="SLB" dot="var(--green)" active={activeFilter === 'SLB'} onClick={() => setActiveFilter('SLB')} />
        <Chip label="Value-Add" dot="var(--amber)" active={activeFilter === 'Value-Add'} onClick={() => setActiveFilter('Value-Add')} />
        <Chip label="Core+" dot="var(--blue)" active={activeFilter === 'Core+'} onClick={() => setActiveFilter('Core+')} />
        <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
        <Chip label="SGV" count={filterCounts.sgv} active={activeFilter === 'SGV'} onClick={() => setActiveFilter('SGV')} />
        <Chip label="IE" count={filterCounts.ie} active={activeFilter === 'IE'} onClick={() => setActiveFilter('IE')} />
        <button onClick={() => handleSort(sortCol)} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6,
          fontSize: 12, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)',
          color: 'var(--ink3)', fontFamily: "'Instrument Sans', sans-serif", marginLeft: 'auto',
        }}>↑↓ Sort: {sortLabel[sortCol] || 'Portfolio Fit'}</button>
      </div>

      {/* ─── Table ─── */}
      <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                { key: 'property_name', label: 'Property' },
                { key: 'submarket', label: 'Market' },
                { key: 'ai_score', label: 'Fit' },
                { key: 'ors_score', label: 'ORS' },
                { key: 'total_sf', label: 'SF' },
                { key: 'clear_height', label: 'Clear Ht' },
                { key: 'estimated_cap_rate', label: 'Cap Est' },
                { key: 'basis_per_sf', label: 'Basis $/SF' },
                { key: null, label: 'Strategy' },
                { key: null, label: 'Broker Intel' },
              ].map((col, i) => (
                <th key={i} onClick={() => col.key && handleSort(col.key)} style={{
                  padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600,
                  letterSpacing: '0.09em', textTransform: 'uppercase',
                  color: sortCol === col.key ? 'var(--blue)' : 'var(--ink3)',
                  borderBottom: '1px solid var(--line)', background: 'var(--bg)',
                  whiteSpace: 'nowrap', cursor: col.key ? 'pointer' : 'default', userSelect: 'none',
                  fontFamily: "'Instrument Sans', sans-serif",
                }}>
                  {col.label}
                  {col.key && (
                    <span style={{ opacity: sortCol === col.key ? 1 : 0.35, fontSize: 9, marginLeft: 3, color: sortCol === col.key ? 'var(--blue)' : undefined }}>
                      {sortCol === col.key ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
                    </span>
                  )}
                </th>
              ))}
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg)', width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)', fontSize: 14 }}>Loading targets…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)', fontSize: 14 }}>No targets found. Adjust filters or add a target.</td></tr>
            ) : filtered.map(p => {
              const strategy = getStrategy(p);
              const stratStyle = strategy ? getStrategyStyle(strategy) : null;
              const hasBroker = p.broker_on_file || p.listing_broker;
              return (
                <tr key={p.id} onClick={() => router.push(`/properties/${p.id}`)}
                  style={{ borderBottom: '1px solid var(--line2)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8F6F2'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  {/* Property */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 14 }}>{p.property_name || p.address || '—'}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, color: 'var(--ink4)', marginTop: 1 }}>
                      {[p.city, p.state, p.zip].filter(Boolean).join(', ') || '—'}
                    </div>
                  </td>
                  {/* Market */}
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ink4)', verticalAlign: 'middle' }}>
                    {p.market && p.submarket ? `${p.market} · ${p.submarket}` : (p.submarket || p.market || '—')}
                  </td>
                  {/* Fit (Building Score) */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: getScoreColor(p.ai_score) }}>
                      {p.ai_score ?? '—'}
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: 'var(--ink4)' }}>{getGrade(p.ai_score)}</span>
                    </div>
                  </td>
                  {/* ORS */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: getORSColor(p.ors_score) }}>
                      {p.ors_score ?? '—'}
                    </div>
                  </td>
                  {/* SF */}
                  <td style={{ padding: '12px 14px', fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: 'var(--ink2)', verticalAlign: 'middle' }}>
                    {fmt(p.total_sf || p.building_sf)}
                  </td>
                  {/* Clear Ht */}
                  <td style={{ padding: '12px 14px', fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: 'var(--ink2)', verticalAlign: 'middle' }}>
                    {p.clear_height ? `${p.clear_height}'` : '—'}
                  </td>
                  {/* Cap Est */}
                  <td style={{ padding: '12px 14px', fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: 'var(--ink2)', verticalAlign: 'middle' }}>
                    {p.estimated_cap_rate ? `${p.estimated_cap_rate}%` : '—'}
                  </td>
                  {/* Basis $/SF */}
                  <td style={{ padding: '12px 14px', fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: 'var(--ink2)', verticalAlign: 'middle' }}>
                    {p.basis_per_sf ? `$${p.basis_per_sf}/SF` : (p.estimated_value && (p.total_sf || p.building_sf) ? `$${Math.round(p.estimated_value / (p.total_sf || p.building_sf))}/SF` : '—')}
                  </td>
                  {/* Strategy */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                    {strategy ? (
                      <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em', whiteSpace: 'nowrap', background: stratStyle.bg, border: `1px solid ${stratStyle.bdr}`, color: stratStyle.text }}>{strategy}</span>
                    ) : '—'}
                  </td>
                  {/* Broker Intel */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                    <span style={{
                      display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                      background: hasBroker ? 'var(--amber-bg)' : 'var(--green-bg)',
                      border: `1px solid ${hasBroker ? 'var(--amber-bdr)' : 'var(--green-bdr)'}`,
                      color: hasBroker ? 'var(--amber)' : 'var(--green)',
                    }}>{hasBroker ? 'Broker on file' : 'Go direct'}</span>
                  </td>
                  {/* Arrow */}
                  <td style={{ padding: '12px 14px', color: 'var(--ink4)', fontSize: 12, opacity: 0.5, verticalAlign: 'middle' }}>›</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--ink4)' }}>
          Showing {filtered.length} of {properties.length} targets
        </div>
      )}

      {/* ─── Add Target Modal ─── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: 12, boxShadow: 'var(--shadow-md)', padding: 24, width: 460, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 16, color: 'var(--ink)' }}>Add Acquisition Target</div>
            {['property_name', 'address', 'city', 'zip'].map(field => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>
                  {field.replace('_', ' ')}
                </label>
                <input value={newProp[field] || ''} onChange={e => setNewProp(prev => ({ ...prev, [field]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--line)', fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: 'var(--ink2)', background: 'var(--bg)', outline: 'none' }}
                  placeholder={field === 'property_name' ? 'e.g. 14022 Nelson Ave E' : ''} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowAddModal(false)} style={btnGhost}>Cancel</button>
              <button onClick={handleAddTarget} style={btnPrimary}>Add Target</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ──────────────────────────
function KPICard({ icon, bg, color, value, label }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: bg, color }}>{icon}</div>
      <div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3, letterSpacing: '0.04em' }}>{label}</div>
      </div>
    </div>
  );
}

function Chip({ label, count, dot, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20,
      fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, fontWeight: 400, cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'all 0.12s', border: `1px solid ${active ? 'var(--blue-bdr)' : 'var(--line)'}`,
      background: active ? 'var(--blue-bg)' : 'var(--card)', color: active ? 'var(--blue)' : 'var(--ink3)',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />}
      {label}
      {count != null && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, marginLeft: 2 }}>{count}</span>}
    </button>
  );
}

// ─── Button Styles ───────────────────────────
const btnGhost = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7,
  fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer',
  border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', whiteSpace: 'nowrap',
};
const btnPrimary = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7,
  fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer',
  border: 'none', background: 'var(--blue)', color: '#fff', whiteSpace: 'nowrap',
};
