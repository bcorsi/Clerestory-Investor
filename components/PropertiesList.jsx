'use client';
import { useState } from 'react';

const MOCK_PROPERTIES = [
  { id: 1, address: '14022 Nelson Ave E', city: 'Baldwin Park', state: 'CA', zip: '91706', market: 'SGV', submarket: 'Mid Valley', type: 'Distribution', score: 92, grade: 'A+', scoreColor: 'var(--blue)', sf: 186400, tenant: 'Leegin Creative Leather', leaseExp: 'Aug 2027', leaseExpColor: 'var(--rust)', status: 'occupied', catalysts: [{ label: "Lease '27", cls: 'lease' }], lat: 34.0887, lng: -117.9712 },
  { id: 2, address: '16830 Chestnut St', city: 'Fontana', state: 'CA', zip: '92335', market: 'IE', submarket: 'IE West', type: 'Manufacturing', score: 88, grade: 'A', scoreColor: 'var(--blue)', sf: 312000, tenant: 'Teledyne Technologies', leaseExp: 'Mar 2028', leaseExpColor: null, status: 'occupied', catalysts: [{ label: 'WARN 3/20', cls: 'warn' }], lat: 34.0916, lng: -117.4370 },
  { id: 3, address: '16150 Stephens St', city: 'City of Industry', state: 'CA', zip: '91745', market: 'SGV', submarket: 'Industry', type: 'Food Manufacturing', score: 81, grade: 'A', scoreColor: 'var(--amber)', sf: 248900, tenant: 'Snak King Corp', leaseExp: 'Dec 2026', leaseExpColor: null, status: 'occupied', catalysts: [{ label: 'CapEx', cls: 'capex' }, { label: "Lease '26", cls: 'lease' }], lat: 34.0155, lng: -117.9022 },
  { id: 4, address: '4800 Azusa Canyon Rd', city: 'Irwindale', state: 'CA', zip: '91702', market: 'SGV', submarket: 'Azusa / Irwindale', type: 'Distribution', score: 76, grade: 'B+', scoreColor: 'var(--amber)', sf: 52000, tenant: 'Vulcan Materials', leaseExp: 'Jun 2026', leaseExpColor: 'var(--rust)', status: 'partial', catalysts: [{ label: "Lease '26", cls: 'lease' }], lat: 34.1297, lng: -117.9238 },
  { id: 5, address: '780 Nogales St', city: 'City of Industry', state: 'CA', zip: '91748', market: 'SGV', submarket: 'Industry', type: 'Light Industrial', score: 72, grade: 'B+', scoreColor: 'var(--amber)', sf: 96000, tenant: 'Tarhong Industry', leaseExp: 'Sep 2027', leaseExpColor: null, status: 'occupied', catalysts: [{ label: 'Broker Intel', cls: 'broker' }], lat: 34.0018, lng: -117.8780 },
  { id: 6, address: '18421 Railroad St', city: 'City of Industry', state: 'CA', zip: '91748', market: 'IE', submarket: 'IE South', type: 'Flex / R&D', score: 65, grade: 'B', scoreColor: 'var(--ink3)', sf: 42000, tenant: 'Acromill LLC', leaseExp: 'Jan 2029', leaseExpColor: null, status: 'occupied', catalysts: [{ label: 'NOD Filed', cls: 'slb' }], lat: 33.9861, lng: -117.8784 },
  { id: 7, address: '1205 S 7th Ave', city: 'Hacienda Heights', state: 'CA', zip: '91745', market: 'SGV', submarket: 'West Valley', type: 'Distribution', score: 61, grade: 'B', scoreColor: 'var(--ink3)', sf: 104580, tenant: '—', leaseExp: '—', leaseExpColor: null, status: 'vacant', catalysts: [], lat: 33.9993, lng: -117.9697 },
  { id: 8, address: 'Ontario Business Center', city: 'Ontario', state: 'CA', zip: '91761', market: 'IE', submarket: 'Ontario Airport', type: 'Multi-Tenant', score: 58, grade: 'B', scoreColor: 'var(--ink3)', sf: null, tenant: 'Various', leaseExp: '—', leaseExpColor: null, status: 'partial', catalysts: [], lat: 34.0633, lng: -117.6010 },
];

const STATUS_STYLE = {
  occupied: { bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', color: 'var(--green)', label: 'Occupied' },
  vacant:   { bg: 'var(--rust-bg)',  bdr: 'var(--rust-bdr)',  color: 'var(--rust)',  label: 'Vacant' },
  partial:  { bg: 'var(--amber-bg)', bdr: 'var(--amber-bdr)', color: 'var(--amber)', label: 'Partial' },
};
const CAT_STYLE = {
  warn:   { bg: 'var(--rust-bg)',   bdr: 'var(--rust-bdr)',   color: 'var(--rust)' },
  lease:  { bg: 'var(--amber-bg)',  bdr: 'var(--amber-bdr)',  color: 'var(--amber)' },
  slb:    { bg: 'var(--green-bg)',  bdr: 'var(--green-bdr)',  color: 'var(--green)' },
  capex:  { bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', color: 'var(--purple)' },
  broker: { bg: 'var(--blue-bg)',   bdr: 'var(--blue-bdr)',   color: 'var(--blue)' },
};

const FILTERS = [
  { key: 'all',     label: 'All',     count: 18 },
  { key: 'sgv',     label: 'SGV',     count: 11 },
  { key: 'ie',      label: 'IE',      count: 7 },
  null,
  { key: 'occupied', label: 'Occupied', dot: 'var(--green)' },
  { key: 'vacant',   label: 'Vacant',   dot: 'var(--rust)' },
  { key: 'partial',  label: 'Partial',  dot: 'var(--amber)' },
  null,
  { key: 'warn',    label: '⚡ WARN' },
  { key: 'expiry',  label: 'Lease Expiry' },
  { key: 'slb',     label: 'SLB' },
  { key: 'capex',   label: 'CapEx' },
];

export default function PropertiesList({ onSelectProperty }) {
  const [filter, setFilter] = useState('all');

  const filtered = MOCK_PROPERTIES.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'sgv') return p.market === 'SGV';
    if (filter === 'ie') return p.market === 'IE';
    if (filter === 'occupied') return p.status === 'occupied';
    if (filter === 'vacant') return p.status === 'vacant';
    if (filter === 'partial') return p.status === 'partial';
    if (filter === 'warn') return p.catalysts.some(c => c.cls === 'warn');
    if (filter === 'expiry') return p.catalysts.some(c => c.cls === 'lease');
    if (filter === 'slb') return p.catalysts.some(c => c.cls === 'slb');
    if (filter === 'capex') return p.catalysts.some(c => c.cls === 'capex');
    return true;
  });

  const totalSF = MOCK_PROPERTIES.reduce((s, p) => s + (p.sf ?? 0), 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink4)' }}>CRM <span style={{ color: 'var(--ink2)' }}> › </span><span style={{ color: 'var(--ink2)', fontWeight: 600 }}>Properties</span></span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={S.btnGhost} onClick={() => alert('Filter — coming soon')}>⊕ Filter</button>
          <button style={S.btnGhost} onClick={() => alert('Import CSV — coming soon')}>↑ Import CSV</button>
          <button style={S.btnBlue} onClick={() => alert('Add Property — Supabase form coming soon')}>+ Add Property</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* PAGE HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>Properties</div>
              <div style={S.pageSub}>18 properties tracked · {(totalSF / 1e6).toFixed(2)}M SF · SGV / IE Industrial</div>
            </div>
          </div>

          {/* KPI STRIP */}
          <div style={S.kpiStrip}>
            {[
              { icon: '🏢', color: 'blue', val: '18', label: 'Total Properties' },
              { icon: '◫', color: 'amber', val: '1.04M', label: 'Total SF Tracked' },
              { icon: '◉', color: 'green', val: '12', label: 'Occupied' },
              { icon: '◎', color: 'rust', val: '4', label: 'Vacant / Partial' },
              { icon: '⚡', color: 'purple', val: '9', label: 'Active Catalysts' },
            ].map((k, i) => (
              <div key={i} style={S.kpiCard}>
                <div style={{ ...S.kpiIcon, background: `var(--${k.color}-bg)`, color: `var(--${k.color})` }}>{k.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* FILTER CHIPS */}
          <div style={S.filterRow}>
            {FILTERS.map((f, i) => {
              if (!f) return <div key={i} style={S.filterSep} />;
              return (
                <div key={f.key} style={{ ...S.filterChip, ...(filter === f.key ? S.filterChipActive : {}) }}
                  onClick={() => setFilter(f.key)}>
                  {f.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.dot, display: 'inline-block' }} />}
                  {f.label}
                  {f.count && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, marginLeft: 2 }}>{f.count}</span>}
                </div>
              );
            })}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)' }}>
              ↑↓ Sort: Score
            </div>
          </div>

          {/* TABLE */}
          <div style={S.tblWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Property', 'Market / Submarket', 'Type', 'Score ↓', 'SF', 'Tenant', 'Lease Exp.', 'Status', 'Catalysts', ''].map((h, i) => (
                    <th key={i} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <PropertyRow key={p.id} p={p} onSelect={onSelectProperty} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyRow({ p, onSelect }) {
  const [hover, setHover] = useState(false);
  const st = STATUS_STYLE[p.status];
  return (
    <tr style={{ borderBottom: '1px solid var(--line2)', cursor: 'pointer', background: hover ? '#F8F6F2' : 'transparent', transition: 'background 0.1s' }}
      onClick={() => onSelect?.(p)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 14 }}>{p.address}</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 13, color: 'var(--ink4)', marginTop: 1 }}>{p.city}, {p.state} {p.zip}</div>
      </td>
      <td style={S.tdMuted}>{p.market} · {p.submarket}</td>
      <td style={S.tdMuted}>{p.type}</td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: p.scoreColor }}>
          {p.score} <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 500, color: 'var(--ink4)' }}>{p.grade}</span>
        </span>
      </td>
      <td style={{ ...S.tdMuted, fontFamily: "'DM Mono',monospace", fontSize: 12.5 }}>{p.sf ? p.sf.toLocaleString() : '—'}</td>
      <td style={S.tdMuted}>{p.tenant}</td>
      <td style={{ ...S.tdMuted, fontFamily: "'DM Mono',monospace", fontSize: 12.5, color: p.leaseExpColor ?? 'var(--ink4)' }}>{p.leaseExp}</td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: st.bg, border: `1px solid ${st.bdr}`, color: st.color }}>{st.label}</span>
      </td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {p.catalysts.map((c, i) => {
            const cs = CAT_STYLE[c.cls] ?? CAT_STYLE.broker;
            return <span key={i} style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: cs.bg, border: `1px solid ${cs.bdr}`, color: cs.color }}>{c.label}</span>;
          })}
        </div>
      </td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: 'var(--ink4)', fontSize: 12, opacity: 0.5 }}>›</td>
    </tr>
  );
}

const S = {
  topbar: { height: 52, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12, position: 'sticky', top: 0, zIndex: 5, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', padding: '0 28px 48px' },
  pageHeader: { padding: '22px 0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  btnGhost: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  btnBlue: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontFamily: 'inherit' },
  kpiStrip: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 18 },
  kpiCard: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 },
  kpiIcon: { width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  filterRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  filterChip: { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', transition: 'all 0.12s', whiteSpace: 'nowrap' },
  filterChipActive: { background: 'var(--blue-bg)', borderColor: 'var(--blue-bdr)', color: 'var(--blue)' },
  filterSep: { width: 1, height: 22, background: 'var(--line)', margin: '0 4px' },
  tblWrap: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', overflow: 'hidden' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', borderBottom: '1px solid var(--line)', background: 'var(--bg)', whiteSpace: 'nowrap' },
  tdMuted: { padding: '12px 14px', fontSize: 13, color: 'var(--ink4)', verticalAlign: 'middle' },
};
