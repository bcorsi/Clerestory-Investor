'use client';
import { useState } from 'react';
import { LineChart, BarChart, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Line, Bar, Cell, ResponsiveContainer } from 'recharts';

// Chart data
const LEASE_RATE_TREND = [
  { month: 'Jan\'25', SGV: 1.34, 'IE West': 1.14, 'IE East': 1.02 },
  { month: 'Feb\'25', SGV: 1.35, 'IE West': 1.15, 'IE East': 1.03 },
  { month: 'Mar\'25', SGV: 1.36, 'IE West': 1.14, 'IE East': 1.04 },
  { month: 'Apr\'25', SGV: 1.37, 'IE West': 1.16, 'IE East': 1.03 },
  { month: 'May\'25', SGV: 1.36, 'IE West': 1.15, 'IE East': 1.05 },
  { month: 'Jun\'25', SGV: 1.38, 'IE West': 1.17, 'IE East': 1.05 },
  { month: 'Jul\'25', SGV: 1.39, 'IE West': 1.16, 'IE East': 1.06 },
  { month: 'Aug\'25', SGV: 1.41, 'IE West': 1.18, 'IE East': 1.06 },
  { month: 'Sep\'25', SGV: 1.40, 'IE West': 1.19, 'IE East': 1.07 },
  { month: 'Oct\'25', SGV: 1.42, 'IE West': 1.18, 'IE East': 1.08 },
  { month: 'Nov\'25', SGV: 1.43, 'IE West': 1.20, 'IE East': 1.08 },
  { month: 'Dec\'25', SGV: 1.44, 'IE West': 1.21, 'IE East': 1.09 },
  { month: 'Jan\'26', SGV: 1.46, 'IE West': 1.22, 'IE East': 1.10 },
  { month: 'Feb\'26', SGV: 1.47, 'IE West': 1.22, 'IE East': 1.11 },
  { month: 'Mar\'26', SGV: 1.48, 'IE West': 1.23, 'IE East': 1.11 },
];

const SALE_PSF_TREND = [
  { quarter: "Q3'24", psf: 238 },
  { quarter: "Q4'24", psf: 248 },
  { quarter: "Q1'25", psf: 255 },
  { quarter: "Q2'25", psf: 260 },
  { quarter: "Q3'25", psf: 263 },
  { quarter: "Q4'25", psf: 266 },
  { quarter: "Q1'26", psf: 271 },
];

const RATE_BY_MARKET = [
  { market: 'SGV', rate: 1.44 },
  { market: 'IE West', rate: 1.21 },
  { market: 'IE East', rate: 1.10 },
  { market: 'OC', rate: 1.68 },
];

const VOLUME_BY_QUARTER = [
  { quarter: "Q2'25", lease: 8, sale: 3 },
  { quarter: "Q3'25", lease: 11, sale: 4 },
  { quarter: "Q4'25", lease: 14, sale: 5 },
  { quarter: "Q1'26", lease: 9, sale: 2 },
];

const RATE_DIST = [
  { bucket: '$0.80–1.00', count: 4 },
  { bucket: '$1.00–1.10', count: 9 },
  { bucket: '$1.10–1.20', count: 14 },
  { bucket: '$1.20–1.30', count: 22 },
  { bucket: '$1.30–1.40', count: 31 },
  { bucket: '$1.40–1.50', count: 28 },
  { bucket: '$1.50–1.60', count: 18 },
  { bucket: '$1.60–1.70', count: 8 },
  { bucket: '$1.70+', count: 4 },
];

const LEASE_TABLE = [
  { id: 1, address: '14250 Monte Vista Ave', city: 'Chino', market: 'IE West', sf: 48200, rate: 1.22, type: 'NNN', term: 36, date: 'Jan 2026', tenant: 'Tenant A' },
  { id: 2, address: '4800 Azusa Canyon Rd', city: 'Irwindale', market: 'SGV', sf: 52000, rate: 1.44, type: 'NNN', term: 60, date: 'Feb 2026', tenant: 'Tenant B' },
  { id: 3, address: '1351 Doubleday Ave', city: 'Ontario', market: 'IE West', sf: 72088, rate: 1.18, type: 'NNN', term: 48, date: 'Dec 2025', tenant: 'Tenant C' },
  { id: 4, address: '16500 Amar Rd', city: 'City of Industry', market: 'SGV', sf: 38400, rate: 1.52, type: 'NNN', term: 36, date: 'Jan 2026', tenant: 'Tenant D' },
  { id: 5, address: '780 Nogales St', city: 'City of Industry', market: 'SGV', sf: 96000, rate: 1.38, type: 'NNN', term: 60, date: 'Oct 2025', tenant: 'Tenant F' },
];

const SALE_TABLE = [
  { id: 1, address: '14500 Nelson Ave', city: 'Baldwin Park', market: 'SGV', sf: 186400, price: 48200000, psf: 258, capRate: 5.2, saleType: 'Investment', date: 'Feb 2026' },
  { id: 2, address: '4800 Azusa Canyon Rd', city: 'Irwindale', market: 'SGV', sf: 312000, price: 78000000, psf: 250, capRate: 5.4, saleType: 'SLB', date: 'Jan 2026' },
  { id: 3, address: '16830 Chestnut St', city: 'Fontana', market: 'IE West', sf: 186000, price: 44600000, psf: 240, capRate: 5.8, saleType: 'Investment', date: 'Dec 2025' },
  { id: 4, address: '13500 Temple Ave', city: 'City of Industry', market: 'SGV', sf: 95000, price: 26600000, psf: 280, capRate: 5.0, saleType: 'Owner-User', date: 'Oct 2025' },
];

const MARKETS = ['All', 'SGV', 'IE West', 'IE East', 'OC'];
const DATE_RANGES = ['2024', '2025', '2026', 'All'];

const CHART_COLORS = { SGV: '#3B5F8A', 'IE West': '#8B2500', 'IE East': '#8C5A04', OC: '#156636' };

export default function CompAnalytics({ onNavigate, leaseComps: propLeaseComps, saleComps: propSaleComps, onSelectLeaseComp, onSelectSaleComp }) {
  const [market, setMarket] = useState('All');
  const [dateRange, setDateRange] = useState('All');
  const [compTab, setCompTab] = useState('lease');

  const matchMarket = (c, m) => {
    if (m === 'All') return true;
    const loc = (c.market || c.submarket || c.city || '').toLowerCase();
    if (m === 'SGV') return loc.includes('sgv') || loc.includes('industry') || loc.includes('baldwin') || loc.includes('el monte') || loc.includes('irwindale') || loc.includes('azusa') || loc.includes('covina') || loc.includes('temple') || loc.includes('rosemead');
    if (m === 'IE West') return loc.includes('ie west') || loc.includes('ontario') || loc.includes('rancho') || loc.includes('fontana') || loc.includes('chino') || loc.includes('upland') || loc.includes('montclair');
    if (m === 'IE East') return loc.includes('ie east') || loc.includes('riverside') || loc.includes('moreno') || loc.includes('perris') || loc.includes('corona');
    if (m === 'OC') return loc.includes('oc') || loc.includes('orange') || loc.includes('anaheim') || loc.includes('irvine') || loc.includes('santa ana');
    return loc.includes(m.toLowerCase());
  };
  const matchDate = (dateStr, range) => {
    if (range === 'All') return true;
    return String(dateStr || '').includes(range);
  };
  const filteredLease = (propLeaseComps && propLeaseComps.length > 0 ? propLeaseComps : LEASE_TABLE).filter(c => {
    if (!matchMarket(c, market)) return false;
    if (!matchDate(c.start_date || c.date, dateRange)) return false;
    return true;
  });
  const filteredSale = (propSaleComps && propSaleComps.length > 0 ? propSaleComps : SALE_TABLE).filter(c => {
    if (!matchMarket(c, market)) return false;
    if (!matchDate(c.sale_date || c.date, dateRange)) return false;
    return true;
  });

  const tooltipStyle = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>Comp Analytics</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={S.btnGhost} onClick={() => {}}>↓ Export</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>Comp <em style={S.pageTitleEm}>Analytics</em></div>
              <div style={{ fontFamily:"'DM Mono', monospace", fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--rust)', opacity:0.65, marginTop:2 }}>THE EDGE IS IN THE DATA</div>
              <div style={S.pageSub}>SGV · IE Industrial market intelligence — updated daily</div>
            </div>
          </div>

          {/* CONTROLS */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Market:</span>
            {MARKETS.map(m => (
              <button key={m} style={{ ...S.chip, ...(market === m ? S.chipOn : {}) }} onClick={() => setMarket(m)}>{m}</button>
            ))}
            <span style={{ width: 1, height: 18, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Period:</span>
            {DATE_RANGES.map(d => (
              <button key={d} style={{ ...S.chip, ...(dateRange === d ? S.chipOn : {}) }} onClick={() => setDateRange(d)}>{d}</button>
            ))}
          </div>

          {/* 2x2 CHART GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Chart 1: Lease Rate Trend */}
            <div style={S.chartCard}>
              <div style={S.chartHdr}>Avg NNN Lease Rate by Market</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={LEASE_RATE_TREND} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink4)' }} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink4)' }} domain={[0.9, 1.6]} tickFormatter={v => '$' + v.toFixed(2)} width={48} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => ['$' + v.toFixed(2) + '/SF/Mo']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="SGV" stroke="#3B5F8A" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="IE West" stroke="#8B2500" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="IE East" stroke="#8C5A04" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Sale PSF Trend */}
            <div style={S.chartCard}>
              <div style={S.chartHdr}>Avg Sale Price $/SF</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={SALE_PSF_TREND} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: 'var(--ink4)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink4)' }} domain={[220, 290]} tickFormatter={v => '$' + v} width={42} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => ['$' + v + '/SF']} />
                  <Line type="monotone" dataKey="psf" name="$/SF" stroke="#3B5F8A" strokeWidth={2.5} dot={{ r: 4, fill: '#3B5F8A' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: Rate by Market Bar */}
            <div style={S.chartCard}>
              <div style={S.chartHdr}>Avg NNN Rate by Market · Current Quarter</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={RATE_BY_MARKET} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="market" tick={{ fontSize: 11, fill: 'var(--ink4)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink4)' }} domain={[0, 2.0]} tickFormatter={v => '$' + v.toFixed(2)} width={48} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => ['$' + v.toFixed(2) + '/SF/Mo']} />
                  <Bar dataKey="rate" name="NNN Rate" radius={[4, 4, 0, 0]}>
                    {RATE_BY_MARKET.map((entry, i) => (
                      <Cell key={i} fill={['#4E6E96', '#B83714', '#8C5A04', '#156636'][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 4: Comp Volume Stacked */}
            <div style={S.chartCard}>
              <div style={S.chartHdr}>Comp Volume by Quarter</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={VOLUME_BY_QUARTER} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: 'var(--ink4)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink4)' }} width={32} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="lease" name="Lease Comps" stackId="a" fill="#3B5F8A" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sale" name="Sale Comps" stackId="a" fill="#156636" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* WIDE CHART: Rate Distribution */}
          <div style={{ ...S.chartCard, marginBottom: 24 }}>
            <div style={S.chartHdr}>Rate Distribution · All Markets</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={RATE_DIST} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10.5, fill: 'var(--ink4)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--ink4)' }} width={32} label={{ value: '# Comps', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--ink4)' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v + ' comps']} />
                <Bar dataKey="count" name="# Comps" fill="#4E6E96" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* COMP TABLE TABS */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 16 }}>
            {[['lease', 'Lease Comps'], ['sale', 'Sale Comps']].map(([k, lbl]) => (
              <div key={k} style={{ ...S.tabItem, ...(compTab === k ? S.tabActive : {}) }} onClick={() => setCompTab(k)}>{lbl}</div>
            ))}
          </div>

          {compTab === 'lease' && (
            <div style={S.tblWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)' }}>
                    {['Address', 'Market', 'SF', 'Rate NNN', 'Type', 'Term', 'Date', 'Tenant'].map(col => (
                      <th key={col} style={S.th}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLease.map((c, i) => (
                    <tr key={c.id || i} style={{ borderBottom: i < filteredLease.length - 1 ? '1px solid var(--line2)' : 'none', cursor: 'pointer' }} onClick={() => onSelectLeaseComp?.(c)} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={S.td}><div style={{ fontWeight: 500, color: 'var(--ink2)' }}>{c.address}</div><div style={{ fontSize: 11, color: 'var(--ink4)' }}>{c.city}</div></td>
                      <td style={S.td}><span style={S.mktBadge}>{c.market}</span></td>
                      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace" }}>{c.sf ? c.sf.toLocaleString() : '—'}</td>
                      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", color: 'var(--blue)', fontWeight: 600 }}>{c.rate != null ? `$${c.rate.toFixed(2)}` : '—'}</td>
                      <td style={S.td}>{c.type || '—'}</td>
                      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace" }}>{c.term ? `${c.term} mo` : '—'}</td>
                      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{c.date}</td>
                      <td style={S.td}>{c.tenant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {compTab === 'sale' && (
            <div style={S.tblWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)' }}>
                    {['Address', 'Market', 'SF', 'Sale Price', '$/SF', 'Cap Rate', 'Type', 'Date'].map(col => (
                      <th key={col} style={S.th}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSale.map((c, i) => (
                    <tr key={c.id || i} style={{ borderBottom: i < filteredSale.length - 1 ? '1px solid var(--line2)' : 'none', cursor: 'pointer' }} onClick={() => onSelectSaleComp?.(c)} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={S.td}><div style={{ fontWeight: 500, color: 'var(--ink2)' }}>{c.address}</div><div style={{ fontSize: 11, color: 'var(--ink4)' }}>{c.city}</div></td>
                      <td style={S.td}><span style={S.mktBadge}>{c.market}</span></td>
                      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace" }}>{c.sf ? c.sf.toLocaleString() : '—'}</td>
                      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", color: 'var(--green)', fontWeight: 600 }}>{c.price ? `$${(c.price / 1000000).toFixed(1)}M` : '—'}</td>
                      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", color: 'var(--blue)', fontWeight: 600 }}>{c.psf ? `$${c.psf}/SF` : '—'}</td>
                      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace" }}>{c.capRate ? `${c.capRate}%` : '—'}</td>
                      <td style={S.td}>{c.saleType}</td>
                      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{c.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  pageWrap: { maxWidth: 1700, minWidth: 900, margin: '0 auto', padding: '0 28px 60px' },
  pageHeader: { padding: '22px 0 16px' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em' },
  pageTitleEm: { fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)', fontSize: 36, fontWeight: 400 },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  chip: { display: 'inline-flex', alignItems: 'center', padding: '4px 11px', borderRadius: 20, fontSize: 12, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'inherit' },
  chipOn: { background: 'var(--blue-bg)', borderColor: 'var(--blue-bdr)', color: 'var(--blue)' },
  chartCard: { background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  chartHdr: { fontSize: 12, fontWeight: 600, color: 'var(--ink3)', letterSpacing: '0.03em', marginBottom: 12 },
  tabItem: { padding: '9px 14px', fontSize: 13.5, color: 'var(--ink4)', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' },
  tabActive: { color: 'var(--blue)', borderBottomColor: 'var(--blue)', fontWeight: 500 },
  tblWrap: { background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  th: { padding: '9px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink4)', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', fontSize: 13, color: 'var(--ink3)', verticalAlign: 'middle' },
  mktBadge: { display: 'inline-flex', padding: '1px 6px', borderRadius: 3, fontSize: 10, background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', color: 'var(--blue)' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
};
