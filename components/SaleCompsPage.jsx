'use client';
import { useState } from 'react';
import CsvUpload from './CsvUpload';

const MOCK_COMPS = [
  { id: 1, address: '14500 Nelson Ave', city: 'Baldwin Park', market: 'SGV', sf: 186400, price: 48200000, psf: 258, capRate: 5.2, saleType: 'Investment', buyerType: 'REIT', date: 'Feb 2026', source: 'Broker' },
  { id: 2, address: '4800 Azusa Canyon Rd', city: 'Irwindale', market: 'SGV', sf: 312000, price: 78000000, psf: 250, capRate: 5.4, saleType: 'SLB', buyerType: 'Inst.', date: 'Jan 2026', source: 'Direct' },
  { id: 3, address: '16830 Chestnut St', city: 'Fontana', market: 'IE West', sf: 186000, price: 44600000, psf: 240, capRate: 5.8, saleType: 'Investment', buyerType: 'Private', date: 'Dec 2025', source: 'CoStar' },
  { id: 4, address: '5200 Edison Ave', city: 'Chino', market: 'IE West', sf: 228000, price: 58100000, psf: 255, capRate: 5.5, saleType: 'Investment', buyerType: 'REIT', date: 'Nov 2025', source: 'CoStar' },
  { id: 5, address: '13500 Temple Ave', city: 'City of Industry', market: 'SGV', sf: 95000, price: 26600000, psf: 280, capRate: 5.0, saleType: 'Owner-User', buyerType: 'Corp', date: 'Oct 2025', source: 'Broker' },
  { id: 6, address: '1400 S Milliken Ave', city: 'Ontario', market: 'IE West', sf: 144000, price: 36700000, psf: 255, capRate: 5.6, saleType: 'SLB', buyerType: 'Inst.', date: 'Sep 2025', source: 'Direct' },
  { id: 7, address: '9800 Savi Ranch Pkwy', city: 'Yorba Linda', market: 'OC', sf: 62000, price: 21700000, psf: 350, capRate: 4.8, saleType: 'Owner-User', buyerType: 'Corp', date: 'Aug 2025', source: 'CoStar' },
  { id: 8, address: '2800 E Jurupa St', city: 'Ontario', market: 'IE West', sf: 310000, price: 74400000, psf: 240, capRate: 5.9, saleType: 'Investment', buyerType: 'REIT', date: 'Jul 2025', source: 'CoStar' },
];

const MARKET_TABS = ['All', 'SGV', 'IE West', 'IE East', 'Investment Sale', 'SLB', 'Owner-User'];

const fmt = {
  price: n => n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M' : '$' + n.toLocaleString(),
};

export default function SaleCompsPage({ onNavigate, onSelectComp, saleComps: propComps, loading, onRefresh }) {
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  const filtered = MOCK_COMPS.filter(c => {
    if (activeTab === 'SGV' && c.market !== 'SGV') return false;
    if (activeTab === 'IE West' && c.market !== 'IE West') return false;
    if (activeTab === 'IE East' && c.market !== 'IE East') return false;
    if (activeTab === 'Investment Sale' && c.saleType !== 'Investment') return false;
    if (activeTab === 'SLB' && c.saleType !== 'SLB') return false;
    if (activeTab === 'Owner-User' && c.saleType !== 'Owner-User') return false;
    return true;
  });

  const avgPSF = filtered.length ? Math.round(filtered.reduce((s, c) => s + c.psf, 0) / filtered.length) : 0;
  const avgCap = filtered.length ? (filtered.reduce((s, c) => s + c.capRate, 0) / filtered.length).toFixed(1) : '0';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>Sale Comps</span>
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
              <div style={S.pageTitle}>Sale <em style={S.pageTitleEm}>Comps</em></div>
              <div style={S.pageSub}>22 comps · SGV / IE West / IE East · 2020–2026</div>
            </div>
          </div>

          {/* KPI STRIP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { lbl: 'Total Comps', val: 22 },
              { lbl: 'Avg $/SF', val: '$268' },
              { lbl: 'Avg Cap Rate', val: '5.4%' },
              { lbl: 'YTD Added', val: 8 },
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

          {/* FILTER INFO */}
          <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--ink4)' }}>Showing <strong style={{ color: 'var(--ink2)' }}>{filtered.length}</strong> of {MOCK_COMPS.length}</span>
            {filtered.length > 0 && <span style={{ fontSize: 12, color: 'var(--ink4)' }}>Avg: <strong style={{ color: 'var(--blue)' }}>${avgPSF}/SF</strong> · Cap: <strong style={{ color: 'var(--amber)' }}>{avgCap}%</strong></span>}
          </div>

          {/* TABLE */}
          <div style={S.tblWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)' }}>
                  {['Address', 'City · Market', 'SF', 'Sale Price', '$/SF', 'Cap Rate', 'Sale Type', 'Buyer Type', 'Date', 'Source'].map(col => (
                    <th key={col} style={S.th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <SaleRow key={c.id} comp={c} last={i === filtered.length - 1} onClick={() => onSelectComp?.(c)} />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 15 }}>No comps match current filters</td></tr>
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

function SaleRow({ comp: c, last, onClick }) {
  const [hover, setHover] = useState(false);
  const typeColor = c.saleType === 'SLB' ? { bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', color: 'var(--purple)' }
    : c.saleType === 'Owner-User' ? { bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', color: 'var(--green)' }
    : { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', color: 'var(--blue)' };
  return (
    <tr style={{ borderBottom: last ? 'none' : '1px solid var(--line2)', background: hover ? 'var(--bg)' : '', cursor: 'pointer', transition: 'background 0.1s' }}
      onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <td style={S.td}><div style={{ fontWeight: 500, color: 'var(--ink2)' }}>{c.address}</div></td>
      <td style={S.td}><span style={{ color: 'var(--ink3)' }}>{c.city}</span> <span style={S.mktBadge}>{c.market}</span></td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace" }}>{c.sf.toLocaleString()}</td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", color: 'var(--green)', fontWeight: 600 }}>{fmt.price(c.price)}</td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", color: 'var(--blue)', fontWeight: 600 }}>${c.psf}/SF</td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace" }}>{c.capRate.toFixed(1)}%</td>
      <td style={S.td}><span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, background: typeColor.bg, border: `1px solid ${typeColor.bdr}`, color: typeColor.color }}>{c.saleType}</span></td>
      <td style={{ ...S.td, color: 'var(--ink4)' }}>{c.buyerType}</td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{c.date}</td>
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
  tblWrap: { background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  th: { padding: '9px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink4)', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', fontSize: 13, color: 'var(--ink3)', verticalAlign: 'middle' },
  mktBadge: { display: 'inline-flex', padding: '1px 6px', borderRadius: 3, fontSize: 10, background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', color: 'var(--blue)', marginLeft: 4 },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  btnBlue: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontFamily: 'inherit' },
};
