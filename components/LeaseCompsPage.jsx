'use client';
import { useState } from 'react';
import CsvUpload from './CsvUpload';

const MOCK_COMPS = [
  { id: 1, address: '14250 Monte Vista Ave', city: 'Chino', market: 'IE West', sf: 48200, rate: 1.22, type: 'NNN', term: 36, date: 'Jan 2026', tenant: 'Tenant A', landlord: 'Private', grossEquiv: 1.58, source: 'Broker' },
  { id: 2, address: '4800 Azusa Canyon Rd', city: 'Irwindale', market: 'SGV', sf: 52000, rate: 1.44, type: 'NNN', term: 60, date: 'Feb 2026', tenant: 'Tenant B', landlord: 'REIT', grossEquiv: 1.81, source: 'CoStar' },
  { id: 3, address: '1351 Doubleday Ave', city: 'Ontario', market: 'IE West', sf: 72088, rate: 1.18, type: 'NNN', term: 48, date: 'Dec 2025', tenant: 'Tenant C', landlord: 'Private', grossEquiv: 1.52, source: 'CoStar' },
  { id: 4, address: '16500 Amar Rd', city: 'City of Industry', market: 'SGV', sf: 38400, rate: 1.52, type: 'NNN', term: 36, date: 'Jan 2026', tenant: 'Tenant D', landlord: 'REIT', grossEquiv: 1.89, source: 'Broker' },
  { id: 5, address: '14022 Nelson Ave E', city: 'Baldwin Park', market: 'SGV', sf: 186400, rate: 1.28, type: 'NNN', term: 120, date: 'Mar 2024', tenant: 'Leegin Creative', landlord: 'Private', grossEquiv: 1.64, source: 'Direct' },
  { id: 6, address: '4521 Jurupa Ave', city: 'Ontario', market: 'IE West', sf: 96000, rate: 1.08, type: 'NNN', term: 60, date: 'Nov 2025', tenant: 'Tenant E', landlord: 'Inst.', grossEquiv: 1.41, source: 'CoStar' },
  { id: 7, address: '780 Nogales St', city: 'City of Industry', market: 'SGV', sf: 96000, rate: 1.38, type: 'NNN', term: 60, date: 'Oct 2025', tenant: 'Tenant F', landlord: 'Owner-User', grossEquiv: 1.75, source: 'Broker' },
  { id: 8, address: '13000 Temple Ave', city: 'City of Industry', market: 'SGV', sf: 44500, rate: 1.48, type: 'NNN', term: 48, date: 'Sep 2025', tenant: 'Tenant G', landlord: 'Private', grossEquiv: 1.85, source: 'CoStar' },
  { id: 9, address: '1200 Arrow Hwy', city: 'Irwindale', market: 'SGV', sf: 52000, rate: 1.42, type: 'NNN', term: 36, date: 'Aug 2025', tenant: 'Tenant H', landlord: 'Private', grossEquiv: 1.79, source: 'Broker' },
  { id: 10, address: '5900 Cucamonga Ave', city: 'Rancho Cucamonga', market: 'IE West', sf: 128000, rate: 1.12, type: 'NNN', term: 60, date: 'Jul 2025', tenant: 'Tenant I', landlord: 'REIT', grossEquiv: 1.45, source: 'CoStar' },
  { id: 11, address: '2200 S Milliken Ave', city: 'Ontario', market: 'IE West', sf: 24500, rate: 1.32, type: 'MG', term: 24, date: 'Jun 2025', tenant: 'Tenant J', landlord: 'REIT', grossEquiv: 1.32, source: 'Direct' },
  { id: 12, address: '18421 Railroad St', city: 'Dominguez Hills', market: 'IE South', sf: 42000, rate: 1.04, type: 'NNN', term: 48, date: 'May 2025', tenant: 'Tenant K', landlord: 'Private', grossEquiv: 1.38, source: 'CoStar' },
];

const MARKET_TABS = ['All', 'SGV', 'IE West', 'IE East', 'OC', '2026', '2025', '2024'];
const SF_FILTERS = ['sub-50K', '50-100K', '100K+'];
const TYPE_FILTERS = ['NNN', 'MG'];

export default function LeaseCompsPage({ onNavigate, onSelectComp, leaseComps: propComps, loading, onRefresh }) {
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [sfFilter, setSfFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);

  const filtered = MOCK_COMPS.filter(c => {
    if (activeTab === 'SGV' && c.market !== 'SGV') return false;
    if (activeTab === 'IE West' && c.market !== 'IE West') return false;
    if (activeTab === 'IE East' && c.market !== 'IE East') return false;
    if (activeTab === 'OC' && c.market !== 'OC') return false;
    if (activeTab === '2026' && !c.date.includes('2026')) return false;
    if (activeTab === '2025' && !c.date.includes('2025')) return false;
    if (activeTab === '2024' && !c.date.includes('2024')) return false;
    if (sfFilter === 'sub-50K' && c.sf >= 50000) return false;
    if (sfFilter === '50-100K' && (c.sf < 50000 || c.sf >= 100000)) return false;
    if (sfFilter === '100K+' && c.sf < 100000) return false;
    if (typeFilter && c.type !== typeFilter) return false;
    return true;
  });

  const avgRate = filtered.length ? (filtered.reduce((s, c) => s + c.rate, 0) / filtered.length).toFixed(2) : '—';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>Lease Comps</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={S.btnGhost} onClick={() => setShowImport(true)}>↑ Import CSV</button>
          <button style={S.btnBlue} onClick={() => {}}>+ Add Comp</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>Lease <em style={S.pageTitleEm}>Comps</em></div>
              <div style={S.pageSub}>175 comps · SGV / IE West / IE East · 2020–2026</div>
            </div>
          </div>

          {/* KPI STRIP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { lbl: 'Total Comps', val: 175 },
              { lbl: 'Avg NNN Rate', val: '$1.38/SF/Mo' },
              { lbl: 'Avg Term', val: '4.2 yrs' },
              { lbl: 'YTD Added', val: 23 },
            ].map((k, i) => (
              <div key={i} style={S.kpiCard}>
                <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{k.lbl}</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* MARKET TABS */}
          <div style={S.tabsNav}>
            {MARKET_TABS.map(t => (
              <div key={t} style={{ ...S.tabItem, ...(activeTab === t ? S.tabActive : {}) }} onClick={() => setActiveTab(t)}>{t}</div>
            ))}
          </div>

          {/* FILTER CHIPS */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--line)', marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>SF:</span>
            {SF_FILTERS.map(f => (
              <button key={f} style={{ ...S.chip, ...(sfFilter === f ? S.chipOn : {}) }} onClick={() => setSfFilter(sfFilter === f ? null : f)}>{f}</button>
            ))}
            <span style={{ width: 1, height: 18, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Type:</span>
            {TYPE_FILTERS.map(f => (
              <button key={f} style={{ ...S.chip, ...(typeFilter === f ? S.chipOn : {}) }} onClick={() => setTypeFilter(typeFilter === f ? null : f)}>{f}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink4)' }}>Showing <strong style={{ color: 'var(--ink2)' }}>{filtered.length}</strong> of {MOCK_COMPS.length} · Avg: <strong style={{ color: 'var(--blue)' }}>${avgRate}/SF/Mo</strong></span>
          </div>

          {/* TABLE */}
          <div style={S.tblWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)' }}>
                  {['Address', 'City · Market', 'SF', 'Rate NNN', 'Type', 'Term', 'Date', 'Tenant', 'Landlord', 'Gross Equiv', 'Source'].map(col => (
                    <th key={col} style={S.th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <CompRow key={c.id} comp={c} last={i === filtered.length - 1} onClick={() => onSelectComp?.(c)} />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 15 }}>No comps match the current filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showImport && <CsvUpload onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); onRefresh?.(); }} />}
    </div>
  );
}

function CompRow({ comp: c, last, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <tr style={{ borderBottom: last ? 'none' : '1px solid var(--line2)', background: hover ? 'var(--bg)' : '', cursor: 'pointer', transition: 'background 0.1s' }}
      onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <td style={S.td}><div style={{ fontWeight: 500, color: 'var(--ink2)' }}>{c.address}</div></td>
      <td style={S.td}><span style={{ color: 'var(--ink3)' }}>{c.city}</span> <span style={S.mktBadge}>{c.market}</span></td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace" }}>{c.sf.toLocaleString()}</td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", color: 'var(--blue)', fontWeight: 600 }}>${c.rate.toFixed(2)}</td>
      <td style={S.td}><span style={c.type === 'NNN' ? S.typeBadgeNNN : S.typeBadgeMG}>{c.type}</span></td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace" }}>{c.term} mo</td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{c.date}</td>
      <td style={S.td}>{c.tenant}</td>
      <td style={{ ...S.td, color: 'var(--ink4)' }}>{c.landlord}</td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", color: 'var(--ink3)' }}>${c.grossEquiv.toFixed(2)}</td>
      <td style={{ ...S.td, fontSize: 11.5, color: 'var(--ink4)' }}>{c.source}</td>
    </tr>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  pageWrap: { maxWidth: 1700, minWidth: 1000, margin: '0 auto', padding: '0 28px 60px' },
  pageHeader: { padding: '22px 0 16px' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em' },
  pageTitleEm: { fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)', fontSize: 36, fontWeight: 400 },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  kpiCard: { background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  tabsNav: { display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 0 },
  tabItem: { padding: '9px 14px', fontSize: 13.5, color: 'var(--ink4)', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' },
  tabActive: { color: 'var(--blue)', borderBottomColor: 'var(--blue)', fontWeight: 500 },
  chip: { display: 'inline-flex', alignItems: 'center', padding: '4px 11px', borderRadius: 20, fontSize: 12, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'inherit' },
  chipOn: { background: 'var(--blue-bg)', borderColor: 'var(--blue-bdr)', color: 'var(--blue)' },
  tblWrap: { background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  th: { padding: '9px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink4)', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', fontSize: 13, color: 'var(--ink3)', verticalAlign: 'middle' },
  mktBadge: { display: 'inline-flex', padding: '1px 6px', borderRadius: 3, fontSize: 10, background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', color: 'var(--blue)', marginLeft: 4 },
  typeBadgeNNN: { display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, background: 'var(--green-bg)', border: '1px solid var(--green-bdr)', color: 'var(--green)' },
  typeBadgeMG: { display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, background: 'var(--amber-bg)', border: '1px solid var(--amber-bdr)', color: 'var(--amber)' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  btnBlue: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontFamily: 'inherit' },
};
