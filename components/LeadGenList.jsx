'use client';
import { useState } from 'react';

const TABS = [
  { label: 'All Leads', key: 'all', count: 237 },
  { label: 'A+/A Hot', key: 'hot', count: 40, hot: true },
  { label: 'WARN Matched', key: 'warn', count: 4, hot: true },
  { label: 'Pipeline Ready', key: 'pipeline', count: 18 },
  { label: 'Grapevine', key: 'grapevine', count: 12 },
  { label: 'Archived', key: 'archived', count: 22 },
];

const FILTERS = ['SGV', 'IE West', 'IE East', '⚠ WARN', 'Lease Expiry \'25–\'27', 'NOD Filed', 'CapEx Signal', 'Sale-Leaseback', 'Owner-User', '50K+ SF', '100K+ SF'];
const MARKET_FILTERS = ['SGV', 'IE West', 'IE East'];
const CATALYST_FILTERS = ['⚠ WARN', 'Lease Expiry \'25–\'27', 'NOD Filed', 'CapEx Signal', 'Sale-Leaseback', 'Owner-User'];
const SIZE_FILTERS = ['50K+ SF', '100K+ SF'];

const SCORE_COLOR = (score) => score >= 85 ? 'var(--blue)' : score >= 70 ? 'var(--blue2)' : score >= 55 ? 'var(--amber)' : 'var(--ink4)';

export default function LeadGenList({ leads = MOCK_LEADS, onSelectLead, onNavigate }) {
  const [activeTab, setActiveTab] = useState('all');
  const [activeFilters, setActiveFilters] = useState(['SGV', 'IE West']);

  const filteredLeads = leads.filter(l => {
    if (activeTab === 'hot') return l.hot || l.score >= 80;
    if (activeTab === 'warn') return l.warn;
    if (activeTab === 'pipeline') return l.score >= 65 && !l.warn;
    if (activeTab === 'grapevine') return l.source?.toLowerCase().includes('grapevine');
    if (activeTab === 'archived') return l.score < 50;
    return true; // 'all'
  });

  const toggleFilter = (f) => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink4)' }}><span style={{ color: 'var(--ink2)', fontWeight: 500 }}>Lead Gen</span></span>
        <div style={S.topbarRight}>
          <div style={S.searchWrap}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#6E6860" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="#6E6860" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input placeholder="Search company, address, market…" style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink2)', width: '100%' }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 4, padding: '2px 5px' }}>⌘K</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* PAGE HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>Lead <em style={S.pageTitleEm}>Gen</em></div>
              <div style={S.pageSub}>237 leads · 40 hot (A+/A) · 4 active WARN signals</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={S.btnGhost} onClick={() => alert('Import CSV — coming soon')}>Import CSV</button>
              <button style={S.btnGhost} onClick={() => alert('Map View — coming soon')}>Map View</button>
              <button style={{ ...S.btn, background: 'var(--rust)', color: '#fff', borderColor: 'var(--rust)', fontSize: 12 }} onClick={() => setActiveTab('hot')}>⚡ Hot Queue (40)</button>
              <button style={{ ...S.btn, background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)' }} onClick={() => alert('Add Lead — Supabase form coming soon')}>+ Add Lead</button>
            </div>
          </div>

          {/* KPI STRIP */}
          <div style={S.kpiStrip}>
            {[
              { icon: '◉', label: 'Total Leads', val: 237, color: 'blue' },
              { icon: '⚡', label: 'Hot — A+/A', val: 40, color: 'rust' },
              { icon: '⚠', label: 'WARN Matched', val: 4, color: 'amber' },
              { icon: '◈', label: 'Pipeline Candidates', val: 18, color: 'green' },
              { icon: '↗', label: 'Grapevine', val: 12, color: 'purple' },
            ].map((k, i) => (
              <div key={i} style={S.kpiCard}>
                <div style={{ ...S.kpiIcon, background: `var(--${k.color}-bg)`, color: `var(--${k.color})` }}>{k.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: k.color === 'rust' ? 'var(--rust)' : 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* TABS */}
          <div style={S.tabsNav}>
            {TABS.map(t => (
              <div key={t.key} style={{ ...S.tabItem, ...(activeTab === t.key ? S.tabActive : {}) }} onClick={() => setActiveTab(t.key)}>
                {t.label}
                <span style={{ ...S.tabCt, ...(t.hot ? S.tabCtHot : {}) }}>{t.count}</span>
              </div>
            ))}
          </div>

          {/* FILTER BAR */}
          <div style={S.filterBar}>
            {MARKET_FILTERS.map(f => (
              <button key={f} style={{ ...S.fc, ...(activeFilters.includes(f) ? S.fcOn : {}) }} onClick={() => toggleFilter(f)}>{f}</button>
            ))}
            <div style={S.fcSep} />
            {CATALYST_FILTERS.map(f => (
              <button key={f} style={{ ...S.fc, ...(activeFilters.includes(f) ? (f.includes('WARN') ? S.fcOnRust : S.fcOn) : {}) }} onClick={() => toggleFilter(f)}>{f}</button>
            ))}
            <div style={S.fcSep} />
            {SIZE_FILTERS.map(f => (
              <button key={f} style={{ ...S.fc, ...(activeFilters.includes(f) ? S.fcOn : {}) }} onClick={() => toggleFilter(f)}>{f}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink4)' }}>Showing <strong style={{ color: 'var(--ink2)' }}>40</strong> of 237</span>
          </div>

          {/* TABLE */}
          <div style={S.tblWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Score', 'Company / Address', 'Market', 'SF', 'Catalyst', 'Source', 'Owner', 'Last Contact', ''].map((h, i) => (
                    <th key={i} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 15 }}>No leads in this category</td></tr>
                ) : filteredLeads.map((l, i) => (
                  <LeadRow key={l.id ?? i} lead={l} onClick={() => onSelectLead?.(l)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadRow({ lead: l, onClick }) {
  const [hover, setHover] = useState(false);
  const rowBg = l.warn ? (hover ? '#FFF1EC' : '#FFF9F7') : l.hot ? (hover ? '#EDF3FA' : '#F5F9FD') : hover ? '#F8F6F2' : 'transparent';
  return (
    <tr style={{ borderBottom: '1px solid var(--line2)', background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
      onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <td style={{ padding: '11px 13px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: l.warn ? 'var(--rust)' : SCORE_COLOR(l.score), lineHeight: 1 }}>{l.score}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: l.warn ? 'var(--rust)' : SCORE_COLOR(l.score), marginTop: 1, letterSpacing: '0.06em' }}>{l.grade}</div>
        </div>
      </td>
      <td style={{ padding: '11px 13px', verticalAlign: 'middle' }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: l.warn ? 'var(--rust)' : 'var(--ink2)' }}>{l.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>{l.addr}</div>
      </td>
      <td style={{ padding: '11px 13px', fontSize: 13, color: 'var(--ink3)' }}>{l.market}</td>
      <td style={{ padding: '11px 13px', fontFamily: "'DM Mono',monospace", fontSize: 12.5 }}>{l.sf}</td>
      <td style={{ padding: '11px 13px', verticalAlign: 'middle' }}>
        {l.catalysts.map((c, ci) => <div key={ci} style={{ marginBottom: ci < l.catalysts.length - 1 ? 3 : 0 }}><span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 500, border: '1px solid', background: c.bg, borderColor: c.bdr, color: c.color }}>{c.label}</span></div>)}
      </td>
      <td style={{ padding: '11px 13px', fontSize: 12.5, color: l.warn ? 'var(--rust)' : 'var(--ink4)' }}>{l.source}</td>
      <td style={{ padding: '11px 13px', fontSize: 13, color: 'var(--ink2)' }}>{l.owner}</td>
      <td style={{ padding: '11px 13px', fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)' }}>{l.lastContact}</td>
      <td style={{ padding: '11px 13px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: 4, opacity: hover ? 1 : 0, transition: 'opacity 0.1s' }}>
          <button style={S.qaBlue} onClick={e => { e.stopPropagation(); alert(`Log call for ${l.name} — activity logging coming soon`); }}>Call</button>
          <button style={l.warn ? S.qaRust : S.qaGreen} onClick={e => { e.stopPropagation(); alert(l.warn ? `Calling owner of ${l.name} — coming soon` : `Adding ${l.name} to pipeline — coming soon`); }}>
            {l.warn ? 'Call Owner' : 'Pipeline →'}
          </button>
        </div>
      </td>
    </tr>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  topbarRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 13px', width: 280 },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', padding: '0 28px 60px' },
  pageHeader: { padding: '22px 0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 },
  pageTitleEm: { fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)', fontSize: 36, fontWeight: 400 },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid', fontFamily: 'inherit' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  kpiStrip: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 16 },
  kpiCard: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  kpiIcon: { width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  tabsNav: { display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 0 },
  tabItem: { padding: '9px 14px', fontSize: 13.5, color: 'var(--ink4)', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 },
  tabActive: { color: 'var(--blue)', borderBottomColor: 'var(--blue)', fontWeight: 500 },
  tabCt: { fontFamily: "'DM Mono',monospace", fontSize: 10, background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 20, padding: '1px 6px', color: 'var(--ink4)' },
  tabCtHot: { background: 'var(--rust-bg)', borderColor: 'var(--rust-bdr)', color: 'var(--rust)' },
  filterBar: { padding: '10px 0', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', borderBottom: '1px solid var(--line)', marginBottom: 14 },
  fc: { display: 'inline-flex', alignItems: 'center', padding: '5px 11px', borderRadius: 20, fontSize: 12, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'inherit' },
  fcOn: { background: 'var(--blue-bg)', borderColor: 'var(--blue-bdr)', color: 'var(--blue)' },
  fcOnRust: { background: 'var(--rust-bg)', borderColor: 'var(--rust-bdr)', color: 'var(--rust)' },
  fcSep: { width: 1, height: 20, background: 'var(--line)' },
  tblWrap: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', overflow: 'hidden' },
  th: { padding: '10px 13px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', borderBottom: '1px solid var(--line)', background: 'var(--bg2)', whiteSpace: 'nowrap' },
  qaBlue: { padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500, border: '1px solid var(--blue-bdr)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer', fontFamily: 'inherit' },
  qaRust: { padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500, border: '1px solid var(--rust-bdr)', background: 'var(--rust-bg)', color: 'var(--rust)', cursor: 'pointer', fontFamily: 'inherit' },
  qaGreen: { padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500, border: '1px solid var(--green-bdr)', background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer', fontFamily: 'inherit' },
};

const C = (bg, bdr, color, label) => ({ bg, bdr, color, label });
const MOCK_LEADS = [
  { id: 1, score: 95, grade: 'A+', name: 'Leegin Creative Leather Products', addr: '14022 Nelson Ave E · Baldwin Park', market: 'SGV · Mid Valley', sf: '186K SF', catalysts: [C('var(--amber-bg)','var(--amber-bdr)','var(--amber)',"Lease '27"), C('var(--blue-bg)','var(--blue-bdr)','var(--blue)','Hiring Signal')], source: 'Broker intel', owner: 'Private · Owner-User', lastContact: 'Never', hot: true, warn: false },
  { id: 2, score: 82, grade: 'A', name: 'Teledyne Technologies Inc.', addr: '16830 Chestnut St · Fontana', market: 'IE · IE West', sf: '186K SF', catalysts: [C('var(--rust-bg)','var(--rust-bdr)','var(--rust)','⚠ WARN 3/20')], source: 'WARN filing', owner: 'Cabot Industrial REIT', lastContact: 'Never', hot: false, warn: true },
  { id: 3, score: 78, grade: 'A', name: 'Snak King Corp', addr: '16150 Stephens St · City of Industry', market: 'SGV · Industry', sf: '18.84 ac', catalysts: [C('var(--purple-bg)','var(--purple-bdr)','var(--purple)','CapEx Permit'), C('var(--green-bg)','var(--green-bdr)','var(--green)','SLB?')], source: 'CapEx permit pull', owner: 'Private · 5 parcels', lastContact: '2 wks ago', hot: true, warn: false },
  { id: 4, score: 70, grade: 'B+', name: 'Tarhong Industry Properties LLC', addr: '780 Nogales St · City of Industry', market: 'SGV · Industry', sf: '96K SF', catalysts: [C('var(--blue-bg)','var(--blue-bdr)','var(--blue)','Broker Intel'), C('var(--green-bg)','var(--green-bdr)','var(--green)','Owner-User Exit')], source: 'Broker network', owner: 'Owner-User', lastContact: '1 mo ago', hot: false, warn: false },
  { id: 5, score: 62, grade: 'B', name: 'Acromill LLC', addr: '18421 Railroad St · Inland Empire', market: 'IE · IE South', sf: '42K SF', catalysts: [C('var(--purple-bg)','var(--purple-bdr)','var(--purple)','NOD Filed')], source: 'NOD filing', owner: 'Private LLC', lastContact: 'Never', hot: false, warn: true },
  { id: 6, score: 44, grade: 'C+', name: 'Ninth Avenue Foods Inc.', addr: '1010 Garfield Ave · Commerce', market: 'SGV', sf: '58K SF', catalysts: [C('var(--blue-bg)','var(--blue-bdr)','var(--blue)','Research Pending')], source: 'Grapevine', owner: 'Unknown', lastContact: 'Never', hot: false, warn: false },
];
