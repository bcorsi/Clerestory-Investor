'use client';
import { useState } from 'react';
import ImportModal from './ImportModal';

const MOCK_ACCOUNTS = [
  { id: 1, initial: 'L', name: 'Leegin Creative Leather Products', type: 'Owner-User', tabKey: 'owner-user', location: 'Baldwin Park, CA', tags: [{ label: "Lease '27", color: 'amber' }, { label: 'SLB Target', color: 'green' }], props: 1, deals: 1, statLabel: 'Deal Value', statVal: '$48M', contacts: 'Bob Rosenthall · +1 contact' },
  { id: 2, initial: 'C', name: 'Cabot Industrial Value Fund', type: 'Institutional REIT', tabKey: 'institutional', location: 'National', tags: [{ label: 'WARN Vacancy', color: 'rust' }, { label: 'IE West', color: 'blue' }], props: 3, deals: 0, statLabel: 'SF Tracked', statVal: '464K', contacts: 'Asset Mgr — TBD' },
  { id: 3, initial: 'R', name: 'RJ Neu Properties', type: 'Private Family Trust', tabKey: 'family', location: 'Industry, CA', tags: [{ label: 'SLB In Progress', color: 'green' }], props: 2, deals: 1, statLabel: 'Deal Value', statVal: '$47.5M', contacts: 'RJ Neu · +2 contacts' },
  { id: 4, initial: 'S', name: 'Snak King Corp', type: 'Owner-User', tabKey: 'owner-user', location: 'City of Industry, CA', tags: [{ label: 'CapEx Signal', color: 'purple' }, { label: 'SLB?', color: 'green' }], props: 5, deals: 1, statLabel: 'Deal Value', statVal: '$62M', contacts: 'CEO · +3 contacts' },
  { id: 5, initial: 'T', name: 'Tarhong Industry Properties LLC', type: 'Owner-User', tabKey: 'owner-user', location: 'City of Industry, CA', tags: [{ label: 'Broker Intel', color: 'blue' }], props: 1, deals: 1, statLabel: 'Deal Value', statVal: '$24M', contacts: 'Owner · +1 contact' },
  { id: 6, initial: 'P', name: 'Pacific Manufacturing Group', type: 'Corporate / Buyer', tabKey: 'buyers', location: 'IE West', tags: [{ label: 'Active Buyer', color: 'blue' }, { label: '150–200K SF', color: 'green' }], props: 0, deals: 1, statLabel: 'Budget', statVal: '$40–55M', contacts: 'James Okura · EVP Ops' },
  { id: 7, initial: 'V', name: 'Valley Cold Storage Inc.', type: 'Owner-User', tabKey: 'owner-user', location: 'Ontario Airport', tags: [{ label: 'SLB?', color: 'green' }], props: 1, deals: 1, statLabel: 'Deal Value', statVal: '$19M', contacts: 'VP Real Estate' },
  { id: 8, initial: 'R', name: 'Rexford Industrial Realty', type: 'Institutional REIT', tabKey: 'institutional', location: 'National', tags: [{ label: 'Portfolio Buyer', color: 'blue' }], props: 0, deals: 1, statLabel: 'Deal Value', statVal: '$104M', contacts: 'AM Team · 2 contacts' },
  { id: 9, initial: 'M', name: 'Matrix Logistics LLC', type: 'Tenant', tabKey: 'tenants', location: 'Hacienda Heights, CA', tags: [{ label: 'Lease Rep', color: 'amber' }], props: 0, deals: 1, statLabel: 'Deal Value', statVal: '$22M', contacts: 'Facilities Dir.' },
];

const COLOR_STYLES = {
  blue:   { bg: 'var(--blue-bg)',   bdr: 'var(--blue-bdr)',   color: 'var(--blue)' },
  green:  { bg: 'var(--green-bg)',  bdr: 'var(--green-bdr)',  color: 'var(--green)' },
  amber:  { bg: 'var(--amber-bg)',  bdr: 'var(--amber-bdr)',  color: 'var(--amber)' },
  rust:   { bg: 'var(--rust-bg)',   bdr: 'var(--rust-bdr)',   color: 'var(--rust)' },
  purple: { bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', color: 'var(--purple)' },
};

const TABS = [
  { key: 'all', label: 'All Accounts', count: 68 },
  { key: 'owner-user', label: 'Owner-User', count: 14 },
  { key: 'institutional', label: 'Institutional', count: 22 },
  { key: 'family', label: 'Private Family', count: 18 },
  { key: 'buyers', label: 'Buyers / Investors' },
  { key: 'tenants', label: 'Tenants' },
];

export default function Accounts({ onSelectAccount, accounts: propAccounts, loading, onRefresh, toast }) {
  const [activeTab, setActiveTab] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [activeChips, setActiveChips] = useState([]);

  // Use Supabase data when available, fall back to mock
  const accounts = (propAccounts && propAccounts.length > 0) ? propAccounts : MOCK_ACCOUNTS;
  const matchTab = (a, tab) => {
    const t = (a.account_type || a.type || a.tabKey || '').toLowerCase().replace(/[\s_-]+/g, '');
    if (tab === 'owner-user') return t.includes('owneruser') || t.includes('owner-user') || t === 'owneruser';
    if (tab === 'institutional') return t.includes('institution') || t.includes('reit');
    if (tab === 'family') return t.includes('family') || t.includes('private');
    if (tab === 'buyers') return t.includes('buyer') || t.includes('investor') || t.includes('equity') || t.includes('corporate');
    if (tab === 'tenants') return t.includes('tenant') || t.includes('occupier');
    return t.includes(tab);
  };
  const toggleChip = (c) => setActiveChips(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  let filteredAccounts = activeTab === 'all' ? accounts : accounts.filter(a => matchTab(a, activeTab));
  if (activeChips.length > 0) {
    filteredAccounts = filteredAccounts.filter(a => {
      const loc = (a.city || a.location || a.market || '').toLowerCase();
      const hasChip = c => {
        if (c === 'SGV') return loc.includes('sgv') || loc.includes('industry') || loc.includes('baldwin') || loc.includes('el monte') || loc.includes('azusa');
        if (c === 'IE West') return loc.includes('ie west') || loc.includes('ontario') || loc.includes('rancho') || loc.includes('fontana') || loc.includes('chino');
        if (c === 'IE East') return loc.includes('ie east') || loc.includes('riverside') || loc.includes('moreno') || loc.includes('perris');
        if (c === 'Has Active Deal') return a.deals > 0 || a.active_deals > 0;
        if (c === 'Has Property') return a.props > 0 || a.property_count > 0;
        return true;
      };
      return activeChips.every(hasChip);
    });
  }

  const handleImportComplete = async ({ importedAccounts }) => {
    for (const acct of (importedAccounts || [])) {
      try {
        const { insertRecord } = await import('../lib/useSupabase');
        await insertRecord('accounts', acct);
      } catch (e) { console.error(e); }
    }
    toast?.(`Imported ${(importedAccounts || []).length} accounts`, 'success');
    onRefresh?.();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>Accounts</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={S.btnGhost} onClick={() => setShowImport(true)}>↑ Import CSV</button>
          <button style={S.btnBlue} onClick={() => {}}>+ Add Account</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* PAGE HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>Ac<em style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)', fontSize: 36, fontWeight: 400 }}>counts</em></div>
              <div style={S.pageSub}>68 accounts · 14 owner-user · 22 institutional · 12 active deals</div>
            </div>
          </div>

          {/* KPI STRIP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { icon: '🏢', color: 'blue', val: '68', label: 'Total Accounts' },
              { icon: '◈', color: 'green', val: '12', label: 'Active Deals', valColor: 'var(--green)' },
              { icon: '👤', color: 'amber', val: '94', label: 'Total Contacts' },
              { icon: '⚡', color: 'rust', val: '18', label: 'Hot Leads Linked', valColor: 'var(--rust)' },
            ].map((k, i) => (
              <div key={i} style={S.kpiCard}>
                <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: `var(--${k.color}-bg)`, color: `var(--${k.color})` }}>{k.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: k.valColor ?? 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 16 }}>
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
              <input placeholder="Search accounts…" style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink2)', width: '100%' }} />
            </div>
            {['SGV', 'IE West', 'IE East', 'Has Active Deal', 'Has Property'].map((f) => (
              <div key={f} style={{ ...S.fc, ...(activeChips.includes(f) ? S.fcOn : {}) }} onClick={() => toggleChip(f)}>{f}</div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink4)' }}>Showing <strong style={{ color: 'var(--ink2)' }}>68</strong> accounts</span>
          </div>

          {/* GRID */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 10 }} />)}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 15 }}>No accounts yet — import from CoStar or add manually</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {filteredAccounts.map(a => <AccountCard key={a.id} acct={a} onSelectAccount={onSelectAccount} />)}
            </div>
          )}
        </div>
      </div>

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        importType="owners"
        existingProperties={[]}
        existingAccounts={accounts}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}

function AccountCard({ acct: a, onSelectAccount }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ ...S.acctCard, boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.08)' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onSelectAccount?.(a)}>
      <div style={S.acctTop}>
        <div style={S.acctLogo}>{a.initial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink2)', marginBottom: 3 }}>{a.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink4)' }}>{a.type} · {a.location}</div>
          <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
            {(a.tags || []).map((t, i) => {
              const cs = COLOR_STYLES[t.color];
              return <span key={i} style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 500, border: `1px solid ${cs.bdr}`, background: cs.bg, color: cs.color }}>{t.label}</span>;
            })}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid var(--line2)' }}>
        {[
          { lbl: 'Properties', val: a.props, color: 'var(--blue)' },
          { lbl: 'Active Deals', val: a.deals, color: a.deals > 0 ? 'var(--green)' : 'var(--ink)' },
          { lbl: a.statLabel, val: a.statVal, color: 'var(--ink)' },
        ].map((cell, i) => (
          <div key={i} style={{ padding: '10px 14px', borderRight: i < 2 ? '1px solid var(--line2)' : 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 4 }}>{cell.lbl}</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: cell.color, lineHeight: 1 }}>{cell.val}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
        <span style={{ fontSize: 12, color: 'var(--ink4)' }}>👤 {a.contacts}</span>
        <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' }}>View →</span>
      </div>
    </div>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', padding: '0 28px 60px' },
  pageHeader: { padding: '22px 0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em' },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  btnGhost: { display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  btnBlue: { display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontFamily: 'inherit' },
  kpiCard: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  tab: { padding: '9px 14px', fontSize: 13.5, color: 'var(--ink4)', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' },
  tabActive: { color: 'var(--blue)', borderBottomColor: 'var(--blue)', fontWeight: 500 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 13px', width: 280 },
  fc: { display: 'inline-flex', alignItems: 'center', padding: '5px 11px', borderRadius: 20, fontSize: 12, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', cursor: 'pointer' },
  fcOn: { background: 'var(--blue-bg)', borderColor: 'var(--blue-bdr)', color: 'var(--blue)' },
  acctCard: { background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.12s' },
  acctTop: { padding: '16px 18px', borderBottom: '1px solid var(--line2)', display: 'flex', alignItems: 'flex-start', gap: 14 },
  acctLogo: { width: 48, height: 48, borderRadius: 10, background: 'var(--bg2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--ink3)', flexShrink: 0, fontFamily: "'Playfair Display',serif" },
};
