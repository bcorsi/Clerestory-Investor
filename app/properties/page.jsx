'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ──────────────────────────────────────────────
   INVESTOR MODE — Properties List
   clerestory-acq.vercel.app/properties
   ────────────────────────────────────────────── */

// ─── Helpers ─────────────────────────────────
const fmt = (n) => n == null ? '—' : Number(n).toLocaleString();
const fmtSF = (n) => {
  if (n == null) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return fmt(n);
};
const fmtCurrency = (n) => {
  if (n == null) return '—';
  if (n >= 1000000000) return `$${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${fmt(n)}`;
};
const getGrade = (s) => {
  if (s == null) return '—';
  if (s >= 90) return 'A+';
  if (s >= 80) return 'A';
  if (s >= 70) return 'B+';
  if (s >= 60) return 'B';
  if (s >= 50) return 'C+';
  return 'C';
};
const getScoreColor = (s) => {
  if (s == null) return 'var(--ink4)';
  if (s >= 80) return 'var(--blue)';
  if (s >= 60) return 'var(--amber)';
  return 'var(--ink3)';
};
const monthsUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.round((d - now) / (1000 * 60 * 60 * 24 * 30.44));
};
const fmtExpiry = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// ─── Catalyst tag category → color class ─────
const CATALYST_COLORS = {
  owner_signal: 'rust',
  occupancy_lease: 'amber',
  financial_broker: 'blue',
  market_slb: 'green',
  capex: 'purple',
};
const TAG_CATEGORY_MAP = {
  'WARN': 'owner_signal', 'Owner Death': 'owner_signal', 'Estate / Probate': 'owner_signal',
  'NOD Filed': 'owner_signal', 'Tax Delinquent': 'owner_signal', 'Code Violation': 'owner_signal',
  'Prior Listing': 'owner_signal', 'Long Hold': 'owner_signal', 'Absentee Owner': 'owner_signal',
  'Lease Expiry': 'occupancy_lease', 'Vacancy': 'occupancy_lease', 'Multi-Tenant Risk': 'occupancy_lease',
  'Occupancy Drop': 'occupancy_lease', 'Sublease': 'occupancy_lease',
  'Broker Intel': 'financial_broker', 'Hiring Signal': 'financial_broker', 'Comp Divergence': 'financial_broker',
  'Price Reduction': 'financial_broker', 'Off-Market': 'financial_broker',
  'SLB': 'market_slb', 'Market Signal': 'market_slb', 'Covered Land': 'market_slb',
  'BESS Proximity': 'market_slb', 'High Fit': 'market_slb', 'Assemblage': 'market_slb',
  'CapEx': 'capex', 'Deferred Maintenance': 'capex', 'Roof Age': 'capex', 'Seismic': 'capex',
};
const getTagColor = (tag) => {
  if (!tag) return 'blue';
  // Check prefix matches
  for (const [key, cat] of Object.entries(TAG_CATEGORY_MAP)) {
    if (tag.startsWith(key) || tag.toLowerCase().includes(key.toLowerCase())) {
      return CATALYST_COLORS[cat] || 'blue';
    }
  }
  // Check if the tag itself contains category hints
  if (tag.toLowerCase().includes('lease') || tag.toLowerCase().includes('vacant') || tag.toLowerCase().includes('occupan')) return 'amber';
  if (tag.toLowerCase().includes('warn') || tag.toLowerCase().includes('nod') || tag.toLowerCase().includes('owner')) return 'rust';
  if (tag.toLowerCase().includes('slb') || tag.toLowerCase().includes('market') || tag.toLowerCase().includes('land')) return 'green';
  if (tag.toLowerCase().includes('capex') || tag.toLowerCase().includes('roof') || tag.toLowerCase().includes('seismic')) return 'purple';
  return 'blue';
};

// ─── Broker Intel pill ───────────────────────
const BrokerIntelPill = ({ property }) => {
  // Check if there's broker info from sale_comps or lease_comps
  const hasBroker = property.broker_on_file || property.listing_broker;
  if (hasBroker) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
        background: 'var(--amber-bg)', border: '1px solid var(--amber-bdr)', color: 'var(--amber)',
      }}>Broker on file</span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      background: 'var(--green-bg)', border: '1px solid var(--green-bdr)', color: 'var(--green)',
    }}>Go direct</span>
  );
};

// ─── Score Badge ─────────────────────────────
const ScoreBadge = ({ score }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700,
    color: getScoreColor(score),
  }}>
    {score ?? '—'}
    <span style={{
      fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
      color: 'var(--ink4)',
    }}>{getGrade(score)}</span>
  </div>
);

// ─── Catalyst Tag ────────────────────────────
const CatalystTag = ({ tag }) => {
  const color = getTagColor(tag);
  const colorMap = {
    rust: { bg: 'var(--rust-bg)', bdr: 'var(--rust-bdr)', text: 'var(--rust)' },
    amber: { bg: 'var(--amber-bg)', bdr: 'var(--amber-bdr)', text: 'var(--amber)' },
    blue: { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', text: 'var(--blue)' },
    green: { bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', text: 'var(--green)' },
    purple: { bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', text: 'var(--purple)' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 7px', borderRadius: 4,
      fontSize: 11, fontWeight: 500, letterSpacing: '0.02em', whiteSpace: 'nowrap',
      background: c.bg, border: `1px solid ${c.bdr}`, color: c.text,
    }}>{tag}</span>
  );
};

// ─── Occupancy Status Tag ────────────────────
const StatusTag = ({ status }) => {
  const s = (status || '').toLowerCase();
  let label = status || '—';
  let color = 'amber';
  if (s.includes('occupied') || s === 'leased') { label = 'Occupied'; color = 'green'; }
  else if (s.includes('vacant') || s === 'available') { label = 'Vacant'; color = 'rust'; }
  else if (s.includes('partial')) { label = 'Partial'; color = 'amber'; }
  const colorMap = {
    rust: { bg: 'var(--rust-bg)', bdr: 'var(--rust-bdr)', text: 'var(--rust)' },
    amber: { bg: 'var(--amber-bg)', bdr: 'var(--amber-bdr)', text: 'var(--amber)' },
    green: { bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', text: 'var(--green)' },
  };
  const c = colorMap[color];
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 7px', borderRadius: 4,
      fontSize: 11, fontWeight: 500,
      background: c.bg, border: `1px solid ${c.bdr}`, color: c.text,
    }}>{label}</span>
  );
};

// ═══════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════
export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortCol, setSortCol] = useState('ai_score');
  const [sortDir, setSortDir] = useState('desc');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // ─── Fetch Properties ──────────────────────
  useEffect(() => {
    fetchProperties();
  }, []);

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

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.property_name || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.submarket || '').toLowerCase().includes(q) ||
        (p.owner || '').toLowerCase().includes(q) ||
        (p.tenant_name || '').toLowerCase().includes(q)
      );
    }

    // Filter chips
    switch (activeFilter) {
      case 'SGV':
        list = list.filter(p => (p.market || p.submarket || '').toLowerCase().includes('sgv'));
        break;
      case 'IE':
        list = list.filter(p => (p.market || p.submarket || '').toLowerCase().includes('ie'));
        break;
      case 'Occupied':
        list = list.filter(p => (p.occupancy_status || '').toLowerCase().includes('occupied'));
        break;
      case 'Vacant':
        list = list.filter(p => (p.occupancy_status || '').toLowerCase().includes('vacant'));
        break;
      case 'Partial':
        list = list.filter(p => (p.occupancy_status || '').toLowerCase().includes('partial'));
        break;
      case 'WARN':
        list = list.filter(p => (p.catalyst_tags || []).some(t => t.toLowerCase().includes('warn')));
        break;
      case 'Lease Expiry':
        list = list.filter(p => {
          const mo = monthsUntil(p.lease_expiration);
          return mo != null && mo <= 24;
        });
        break;
      case 'SLB':
        list = list.filter(p => (p.catalyst_tags || []).some(t => t.toLowerCase().includes('slb')));
        break;
      case 'CapEx':
        list = list.filter(p => (p.catalyst_tags || []).some(t => t.toLowerCase().includes('capex')));
        break;
      case 'High Fit':
        list = list.filter(p => (p.portfolio_fit_score || 0) >= 80);
        break;
    }

    // Sort
    list.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (va == null) va = sortDir === 'desc' ? -Infinity : Infinity;
      if (vb == null) vb = sortDir === 'desc' ? -Infinity : Infinity;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [properties, search, activeFilter, sortCol, sortDir]);

  // ─── KPIs ──────────────────────────────────
  const kpis = useMemo(() => {
    const total = filtered.length;
    const totalSF = filtered.reduce((s, p) => s + (p.total_sf || p.building_sf || 0), 0);
    const scores = filtered.filter(p => p.ai_score != null);
    const avgScore = scores.length ? Math.round(scores.reduce((s, p) => s + p.ai_score, 0) / scores.length) : 0;
    const signals = filtered.filter(p => (p.catalyst_tags || []).length > 0).length;
    const estValue = filtered.reduce((s, p) => s + (p.estimated_value || 0), 0);
    return { total, totalSF, avgScore, signals, estValue };
  }, [filtered]);

  // ─── Sort Handler ──────────────────────────
  const handleSort = useCallback((col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }, [sortCol]);

  // ─── Filter Counts ─────────────────────────
  const filterCounts = useMemo(() => {
    const all = properties.length;
    const sgv = properties.filter(p => (p.market || p.submarket || '').toLowerCase().includes('sgv')).length;
    const ie = properties.filter(p => (p.market || p.submarket || '').toLowerCase().includes('ie')).length;
    return { all, sgv, ie };
  }, [properties]);

  // ─── Add Property Modal (simplified) ───────
  const [newProp, setNewProp] = useState({ property_name: '', address: '', city: '', state: 'CA', zip: '' });
  const handleAddProperty = async () => {
    if (!newProp.property_name && !newProp.address) return;
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert([{
          property_name: newProp.property_name || newProp.address,
          address: newProp.address,
          city: newProp.city,
          state: newProp.state,
          zip: newProp.zip,
        }])
        .select();
      if (error) throw error;
      setShowAddModal(false);
      setNewProp({ property_name: '', address: '', city: '', state: 'CA', zip: '' });
      fetchProperties();
    } catch (err) {
      console.error('Error adding property:', err);
      alert('Error adding property: ' + err.message);
    }
  };

  // ─── CSV Import Handler ────────────────────
  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { alert('CSV must have a header row + data'); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || null; });
        if (row.property_name || row.address) rows.push(row);
      }
      if (rows.length === 0) { alert('No valid rows found'); return; }
      const { error } = await supabase.from('properties').insert(rows);
      if (error) throw error;
      alert(`Imported ${rows.length} properties`);
      fetchProperties();
    } catch (err) {
      console.error('Import error:', err);
      alert('Import error: ' + err.message);
    }
    e.target.value = '';
  };

  // ─── Table Columns ─────────────────────────
  const columns = [
    { key: 'property_name', label: 'Property', sortable: true },
    { key: 'submarket', label: 'Market / Submarket', sortable: true },
    { key: 'property_type', label: 'Type', sortable: true },
    { key: 'ai_score', label: 'Score', sortable: true },
    { key: 'total_sf', label: 'SF', sortable: true },
    { key: 'clear_height', label: 'Clear Ht', sortable: true },
    { key: 'owner', label: 'Owner', sortable: true },
    { key: 'tenant_name', label: 'Tenant', sortable: true },
    { key: 'lease_expiration', label: 'Lease Exp.', sortable: true },
    { key: 'occupancy_status', label: 'Status', sortable: false },
    { key: 'broker_intel', label: 'Broker Intel', sortable: false },
    { key: 'catalyst_tags', label: 'Catalysts', sortable: false },
  ];

  // ─── Render ────────────────────────────────
  return (
    <>
      {/* ─── Page Header ─── */}
      <div style={{
        padding: '22px 0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: "'Instrument Sans', sans-serif", fontSize: 28, fontWeight: 300,
            color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            Properties
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic',
            color: 'var(--ink4)', marginTop: 4,
          }}>
            {loading ? 'Loading…' : `${kpis.total} properties tracked · ${fmtSF(kpis.totalSF)} SF · SGV / IE Industrial`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn-ghost"
            onClick={() => document.getElementById('filterPanel')?.classList.toggle('open')}
            style={btnGhostStyle}
          >⊕ Filter</button>
          <label style={{ ...btnGhostStyle, cursor: 'pointer' }}>
            ↑ Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
          </label>
          <button
            onClick={() => setShowAddModal(true)}
            style={btnPrimaryStyle}
          >+ Add Property</button>
        </div>
      </div>

      {/* ─── KPI Strip ─── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18,
      }}>
        <KPICard icon="🏢" color="blue" value={kpis.total} label="Total Properties" />
        <KPICard icon="◫" color="amber" value={fmtSF(kpis.totalSF)} label="Total SF" />
        <KPICard icon="◉" color="green" value={kpis.avgScore} label="Avg Building Score" />
        <KPICard icon="⚡" color="rust" value={kpis.signals} label="Active Signals" />
        <KPICard icon="$" color="purple" value={fmtCurrency(kpis.estValue)} label="Est. Portfolio Value" />
      </div>

      {/* ─── Filter Chips ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap',
      }}>
        {[
          { key: 'All', count: filterCounts.all },
          { key: 'SGV', count: filterCounts.sgv },
          { key: 'IE', count: filterCounts.ie },
        ].map(f => (
          <FilterChip key={f.key} label={f.key} count={f.count} active={activeFilter === f.key}
            onClick={() => setActiveFilter(f.key)} />
        ))}
        <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
        {[
          { key: 'Occupied', dot: 'var(--green)' },
          { key: 'Vacant', dot: 'var(--rust)' },
          { key: 'Partial', dot: 'var(--amber)' },
        ].map(f => (
          <FilterChip key={f.key} label={f.key} dot={f.dot} active={activeFilter === f.key}
            onClick={() => setActiveFilter(f.key)} />
        ))}
        <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
        {['WARN', 'Lease Expiry', 'SLB', 'High Fit', 'CapEx'].map(f => (
          <FilterChip key={f} label={f === 'WARN' ? '⚡ WARN' : f} active={activeFilter === f}
            onClick={() => setActiveFilter(f)} />
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => handleSort(sortCol)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6,
            fontSize: 12, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)',
            color: 'var(--ink3)', fontFamily: "'Instrument Sans', sans-serif",
          }}>
            ↑↓ Sort: {columns.find(c => c.key === sortCol)?.label || 'Score'}
          </button>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div style={{
        background: 'var(--card)', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600,
                    letterSpacing: '0.09em', textTransform: 'uppercase', color: sortCol === col.key ? 'var(--blue)' : 'var(--ink3)',
                    borderBottom: '1px solid var(--line)', background: 'var(--bg)',
                    whiteSpace: 'nowrap', cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none',
                    fontFamily: "'Instrument Sans', sans-serif",
                  }}
                >
                  {col.label}
                  {col.sortable && (
                    <span style={{
                      opacity: sortCol === col.key ? 1 : 0.35, fontSize: 9, marginLeft: 3,
                      color: sortCol === col.key ? 'var(--blue)' : undefined,
                    }}>
                      {sortCol === col.key ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
                    </span>
                  )}
                </th>
              ))}
              <th style={{
                padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600,
                borderBottom: '1px solid var(--line)', background: 'var(--bg)', width: 30,
              }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1} style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)', fontSize: 14 }}>
                Loading properties…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={columns.length + 1} style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)', fontSize: 14 }}>
                No properties found. Try adjusting your filters or add a property.
              </td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}
                onClick={() => router.push(`/properties/${p.id}`)}
                style={{ borderBottom: '1px solid var(--line2)', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8F6F2'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* Property */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 14 }}>
                    {p.property_name || p.address || '—'}
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                    fontSize: 13, color: 'var(--ink4)', marginTop: 1,
                  }}>
                    {[p.city, p.state, p.zip].filter(Boolean).join(', ') || '—'}
                  </div>
                </td>
                {/* Market / Submarket */}
                <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ink4)', verticalAlign: 'middle' }}>
                  {p.market && p.submarket ? `${p.market} · ${p.submarket}` : (p.submarket || p.market || '—')}
                </td>
                {/* Type */}
                <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ink4)', verticalAlign: 'middle' }}>
                  {p.property_type || '—'}
                </td>
                {/* Score */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <ScoreBadge score={p.ai_score} />
                </td>
                {/* SF */}
                <td style={{
                  padding: '12px 14px', fontFamily: "'DM Mono', monospace", fontSize: 12.5,
                  verticalAlign: 'middle', color: 'var(--ink2)',
                }}>
                  {fmt(p.total_sf || p.building_sf)}
                </td>
                {/* Clear Height */}
                <td style={{
                  padding: '12px 14px', fontFamily: "'DM Mono', monospace", fontSize: 12.5,
                  verticalAlign: 'middle', color: 'var(--ink2)',
                }}>
                  {p.clear_height ? `${p.clear_height}'` : '—'}
                </td>
                {/* Owner */}
                <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ink4)', verticalAlign: 'middle', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.owner || '—'}
                </td>
                {/* Tenant */}
                <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ink4)', verticalAlign: 'middle', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.tenant_name || '—'}
                </td>
                {/* Lease Expiry */}
                <td style={{
                  padding: '12px 14px', fontFamily: "'DM Mono', monospace", fontSize: 12.5,
                  verticalAlign: 'middle',
                  color: (() => {
                    const mo = monthsUntil(p.lease_expiration);
                    if (mo == null) return 'var(--ink2)';
                    if (mo <= 12) return 'var(--rust)';
                    if (mo <= 24) return 'var(--amber)';
                    return 'var(--ink2)';
                  })(),
                }}>
                  {fmtExpiry(p.lease_expiration)}
                </td>
                {/* Status */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <StatusTag status={p.occupancy_status} />
                </td>
                {/* Broker Intel */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <BrokerIntelPill property={p} />
                </td>
                {/* Catalysts */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(p.catalyst_tags || []).slice(0, 3).map((tag, i) => (
                      <CatalystTag key={i} tag={tag} />
                    ))}
                    {(p.catalyst_tags || []).length > 3 && (
                      <span style={{
                        fontSize: 11, color: 'var(--ink4)', fontFamily: "'DM Mono', monospace",
                        padding: '2px 4px',
                      }}>+{(p.catalyst_tags || []).length - 3}</span>
                    )}
                  </div>
                </td>
                {/* Arrow */}
                <td style={{ padding: '12px 14px', color: 'var(--ink4)', fontSize: 12, opacity: 0.5, verticalAlign: 'middle' }}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', fontSize: 13, color: 'var(--ink4)',
        }}>
          <span>Showing {filtered.length} of {properties.length} properties</span>
        </div>
      )}

      {/* ─── Add Property Modal ─── */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: 'var(--card)', borderRadius: 12, boxShadow: 'var(--shadow-md)',
            padding: 24, width: 460, maxWidth: '90vw',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 16, color: 'var(--ink)' }}>Add Property</div>
            {['property_name', 'address', 'city', 'zip'].map(field => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>
                  {field.replace('_', ' ')}
                </label>
                <input
                  value={newProp[field] || ''}
                  onChange={e => setNewProp(prev => ({ ...prev, [field]: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--line)',
                    fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: 'var(--ink2)',
                    background: 'var(--bg)', outline: 'none',
                  }}
                  placeholder={field === 'property_name' ? 'e.g. 14022 Nelson Ave E' : ''}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowAddModal(false)} style={btnGhostStyle}>Cancel</button>
              <button onClick={handleAddProperty} style={btnPrimaryStyle}>Add Property</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ──────────────────────────
function KPICard({ icon, color, value, label }) {
  const bgMap = {
    blue: 'var(--blue-bg)', green: 'var(--green-bg)', amber: 'var(--amber-bg)',
    rust: 'var(--rust-bg)', purple: 'var(--purple-bg)',
  };
  const colorMap = {
    blue: 'var(--blue)', green: 'var(--green)', amber: 'var(--amber)',
    rust: 'var(--rust)', purple: 'var(--purple)',
  };
  return (
    <div style={{
      background: 'var(--card)', borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow)', border: '1px solid var(--line2)',
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0, background: bgMap[color], color: colorMap[color],
      }}>{icon}</div>
      <div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700,
          color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em',
        }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3, letterSpacing: '0.04em' }}>{label}</div>
      </div>
    </div>
  );
}

function FilterChip({ label, count, dot, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '5px 12px', borderRadius: 20,
      fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, fontWeight: 400,
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s',
      border: `1px solid ${active ? 'var(--blue-bdr)' : 'var(--line)'}`,
      background: active ? 'var(--blue-bg)' : 'var(--card)',
      color: active ? 'var(--blue)' : 'var(--ink3)',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />}
      {label}
      {count != null && (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, marginLeft: 2 }}>{count}</span>
      )}
    </button>
  );
}

// ─── Button Styles ───────────────────────────
const btnGhostStyle = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 7,
  fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 500,
  cursor: 'pointer', border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--ink3)',
  whiteSpace: 'nowrap', transition: 'all 0.12s',
};
const btnPrimaryStyle = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 7,
  fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 500,
  cursor: 'pointer', border: 'none',
  background: 'var(--blue)', color: '#fff',
  whiteSpace: 'nowrap', transition: 'all 0.12s',
};
