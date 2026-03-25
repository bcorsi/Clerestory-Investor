'use client';
import { useState } from 'react';

const MOCK_CONTACTS = [
  { id: 1, initials: 'BR', color: '#4E6E96', name: 'Bob Rosenthall', title: 'President & CEO', type: 'Owner', typeColor: 'blue', company: 'Leegin Creative Leather', phone: '(626) 555-0182', email: 'brosenthall@leegin.com', lastContact: 'Mar 22', linkedTo: [{ label: '14022 Nelson', color: 'var(--blue)' }, { label: 'SLB Deal', color: 'var(--green)' }], actions: ['Call', 'Email'] },
  { id: 2, initials: 'JO', color: '#B83714', name: 'James Okura', title: 'EVP Operations', type: 'Decision Maker', typeColor: 'amber', company: 'Pacific Manufacturing', phone: '(909) 555-0244', email: 'jokura@pacificmfg.com', lastContact: 'Mar 22', linkedTo: [{ label: 'Workman Mill Deal', color: 'var(--green)' }], actions: ['Call', 'Email'] },
  { id: 3, initials: 'RN', color: '#156636', name: 'RJ Neu', title: 'Principal', type: 'Owner', typeColor: 'green', company: 'RJ Neu Properties', phone: '(626) 555-0317', email: 'rj@rjneuprops.com', lastContact: 'Mar 14', linkedTo: [{ label: '4900 Workman Mill', color: 'var(--blue)' }], actions: ['Call', 'Email'] },
  { id: 4, initials: 'DL', color: '#5838A0', name: 'David Lim', title: 'Owner / Principal', type: 'Owner', typeColor: 'blue', company: 'Tarhong Industry Props', phone: '(626) 555-0488', email: null, lastContact: 'Never', lastContactColor: 'var(--rust)', linkedTo: [{ label: '780 Nogales', color: 'var(--blue)' }], actions: ['Call', 'Research'] },
  { id: 5, initials: 'SO', color: '#8C5A04', name: 'Scott Oh', title: 'Senior VP', type: 'Broker', typeColor: 'purple', company: 'Colliers — SGV', phone: '(626) 555-0591', email: 'soh@colliers.com', lastContact: 'Mar 20', linkedTo: [{ label: 'Broker Network', color: 'var(--ink4)' }], actions: ['Call', 'Note'] },
  { id: 6, initials: 'AC', color: '#4E6E96', name: 'Andy Chen', title: 'VP Real Estate', type: 'Decision Maker', typeColor: 'amber', company: 'Valley Cold Storage', phone: '(909) 555-0621', email: 'achen@valleycold.com', lastContact: 'Mar 18', linkedTo: [{ label: 'LOI Deal', color: 'var(--blue)' }], actions: ['Call', 'Email'] },
];

const TYPE_STYLE = {
  'Owner':          { bg: 'var(--blue-bg)',   bdr: 'var(--blue-bdr)',   color: 'var(--blue)' },
  'Decision Maker': { bg: 'var(--amber-bg)',  bdr: 'var(--amber-bdr)',  color: 'var(--amber)' },
  'Broker':         { bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', color: 'var(--purple)' },
  'Tenant':         { bg: 'var(--green-bg)',  bdr: 'var(--green-bdr)',  color: 'var(--green)' },
  'Lender':         { bg: 'var(--rust-bg)',   bdr: 'var(--rust-bdr)',   color: 'var(--rust)' },
};

const ACTION_STYLE = {
  'Call':     { bg: 'var(--blue-bg)',  bdr: 'var(--blue-bdr)',  color: 'var(--blue)' },
  'Email':    { bg: 'var(--bg2)',      bdr: 'var(--line)',       color: 'var(--ink3)' },
  'Note':     { bg: 'var(--bg2)',      bdr: 'var(--line)',       color: 'var(--ink3)' },
  'Research': { bg: 'var(--rust-bg)', bdr: 'var(--rust-bdr)',   color: 'var(--rust)' },
};

const TABS = [
  { key: 'all', label: 'All', count: 94 },
  { key: 'owners', label: 'Owners', count: 28 },
  { key: 'dm', label: 'Decision Makers' },
  { key: 'brokers', label: 'Brokers' },
  { key: 'buyers', label: 'Buyers / Investors' },
  { key: 'tenants', label: 'Tenants' },
  { key: 'lenders', label: 'Lenders' },
];

export default function ContactsList() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>Contacts</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={S.btnGhost} onClick={() => alert('Import CSV — coming soon')}>Import CSV</button>
          <button style={S.btnBlue} onClick={() => alert('Add Contact — coming soon')}>+ Add Contact</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* PAGE HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>Con<em style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)', fontSize: 36, fontWeight: 400 }}>tacts</em></div>
              <div style={S.pageSub}>94 contacts · 28 owners · 18 decision makers · 22 brokers</div>
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 14 }}>
            {TABS.map(t => (
              <div key={t.key} style={{ ...S.tab, ...(activeTab === t.key ? S.tabActive : {}) }} onClick={() => setActiveTab(t.key)}>
                {t.label}
                {t.count && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 20, padding: '1px 6px', marginLeft: 4, color: 'var(--ink4)' }}>{t.count}</span>}
              </div>
            ))}
          </div>

          {/* FILTER BAR */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={S.searchWrap}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#6E6860" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="#6E6860" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input placeholder="Search contacts…" style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink2)', width: '100%' }} />
            </div>
            {['SGV', 'IE West', 'Has Active Deal', 'Never Contacted'].map((f, i) => (
              <div key={f} style={{ ...S.fc, ...(i < 2 ? S.fcOn : {}) }}>{f}</div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink4)' }}>94 contacts</span>
          </div>

          {/* TABLE */}
          <div style={S.tblWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Contact', 'Type', 'Company / Account', 'Phone', 'Email', 'Last Contact', 'Linked To', ''].map((h, i) => (
                    <th key={i} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_CONTACTS.map(c => <ContactRow key={c.id} contact={c} />)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ contact: c }) {
  const [hover, setHover] = useState(false);
  const ts = TYPE_STYLE[c.type] ?? TYPE_STYLE['Owner'];
  return (
    <tr style={{ borderBottom: '1px solid var(--line2)', cursor: 'pointer', background: hover ? '#F8F6F2' : 'transparent', transition: 'background 0.1s' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => alert(`${c.name} — Contact Detail coming soon`)}>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, background: c.color }}>{c.initials}</div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink2)' }}>{c.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 1 }}>{c.title}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: ts.bg, border: `1px solid ${ts.bdr}`, color: ts.color }}>{c.type}</span>
      </td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: 'var(--blue)', cursor: 'pointer', fontSize: 13.5 }}>{c.company}</td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--ink2)' }}>{c.phone}</td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: 12.5, color: c.email ? 'var(--ink3)' : 'var(--ink4)', fontStyle: c.email ? 'normal' : 'italic' }}>{c.email ?? 'Not on file'}</td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontFamily: "'DM Mono',monospace", fontSize: 11, color: c.lastContactColor ?? 'var(--ink4)' }}>{c.lastContact}</td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: 12.5 }}>
        {c.linkedTo.map((l, i) => (
          <span key={i}>{i > 0 && <span style={{ color: 'var(--ink4)' }}> · </span>}<span style={{ color: l.color }}>{l.label}</span></span>
        ))}
      </td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: 4, opacity: hover ? 1 : 0, transition: 'opacity 0.12s' }}>
          {c.actions.map(a => {
            const as = ACTION_STYLE[a] ?? ACTION_STYLE['Email'];
            return (
              <button key={a} style={{ padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500, border: `1px solid ${as.bdr}`, background: as.bg, color: as.color, cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={e => { e.stopPropagation(); alert(`${a} ${c.name} — coming soon`); }}>{a}</button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', padding: '0 28px 60px' },
  pageHeader: { padding: '22px 0 16px' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em' },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  btnGhost: { display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  btnBlue: { display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontFamily: 'inherit' },
  tab: { padding: '9px 14px', fontSize: 13.5, color: 'var(--ink4)', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' },
  tabActive: { color: 'var(--blue)', borderBottomColor: 'var(--blue)', fontWeight: 500 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 13px', width: 280 },
  fc: { display: 'inline-flex', alignItems: 'center', padding: '5px 11px', borderRadius: 20, fontSize: 12, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', cursor: 'pointer' },
  fcOn: { background: 'var(--blue-bg)', borderColor: 'var(--blue-bdr)', color: 'var(--blue)' },
  tblWrap: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', overflow: 'hidden' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', borderBottom: '1px solid var(--line)', background: 'var(--bg2)' },
};
