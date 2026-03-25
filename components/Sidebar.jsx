'use client';
import { useState } from 'react';
import styles from './Sidebar.module.css';

const NAV = [
  { section: 'Overview', items: [
    { label: 'Command Center', page: 'dashboard', icon: '⊞' },
  ]},
  { section: 'CRM', items: [
    { label: 'Properties', page: 'properties', countKey: 'properties' },
    { label: 'Lead Gen', page: 'leads', countKey: 'leads' },
    { label: 'Deal Pipeline', page: 'deals', countKey: 'deals' },
    { label: 'Contacts', page: 'contacts', countKey: 'contacts' },
    { label: 'Accounts', page: 'accounts', countKey: 'accounts' },
    { label: 'Tasks', page: 'tasks', countKey: 'tasks', hot: true },
  ]},
  { divider: true },
  { section: 'Comps', items: [
    { label: 'Lease Comps', page: 'lease-comps', countKey: 'leaseComps' },
    { label: 'Sale Comps', page: 'sale-comps', countKey: 'saleComps' },
    { label: 'Comp Analytics', page: 'comp-analytics' },
  ]},
  { divider: true },
  { section: 'Intelligence', items: [
    { label: 'WARN Intel', page: 'warn', countKey: 'warn', hot: true },
    { label: 'News Feed', page: 'news' },
    { label: 'Campaigns', page: 'campaigns' },
    { label: 'Owner Search', page: 'owner-search' },
    { label: 'Map View', page: 'map' },
  ]},
];

// Icons for collapsed mode
const PAGE_ICONS = {
  dashboard: '⊞', properties: '🏢', leads: '⚡', deals: '◈', contacts: '👤',
  accounts: '🏦', tasks: '✓', 'lease-comps': '📋', 'sale-comps': '💰',
  'comp-analytics': '📊', warn: '🚨', news: '📰', campaigns: '📣',
  'owner-search': '🔍', map: '🗺',
};

export default function Sidebar({ currentPage, onNavigate, counts = {}, onCollapseChange }) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapseChange?.(next);
  };

  const sbWidth = collapsed ? 64 : 242;

  return (
    <>
      <aside style={{
        width: sbWidth, minHeight: '100vh',
        background: 'linear-gradient(180deg,#1F2840 0%,#1A2130 55%,#15192A 100%)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, left: 0, zIndex: 100,
        overflowY: 'auto', overflowX: 'hidden',
        transition: 'width 0.25s ease',
        borderRight: '1px solid rgba(0,0,0,0.18)',
      }}>
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#6480A2 35%,#89A8C6 65%,transparent)', pointerEvents: 'none' }} />

        {/* Logo Zone */}
        <div style={{ padding: collapsed ? '20px 0 16px' : '20px 18px 16px', borderBottom: '1px solid rgba(200,220,255,0.13)', display: 'flex', alignItems: 'center', gap: 11, justifyContent: collapsed ? 'center' : 'flex-start', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 7, background: '#0D1320', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 64 64" fill="none">
              <rect x="4" y="3" width="12" height="9" rx="0.5" fill="#6B83A6"/>
              <rect x="19" y="3" width="12" height="9" rx="0.5" fill="#6B83A6" opacity="0.7"/>
              <rect x="34" y="3" width="12" height="9" rx="0.5" fill="#6B83A6" opacity="0.4"/>
              <circle cx="32" cy="40" r="6" stroke="#6B83A6" strokeWidth="0.9" fill="none"/>
              <circle cx="32" cy="40" r="2" fill="#6B83A6"/>
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 15, fontWeight: 500, color: 'rgba(245,240,232,0.96)', letterSpacing: '-0.01em' }}>Clerestory</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'rgba(100,128,162,0.72)', marginTop: 2 }}>See the deal before it's a deal.</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 6 }}>
          {NAV.map((group, gi) => {
            if (group.divider) {
              return <div key={`div-${gi}`} style={{ height: 1, background: 'rgba(200,220,255,0.07)', margin: '5px 16px' }} />;
            }
            return (
              <div key={group.section} style={{ padding: '10px 0 2px' }}>
                {!collapsed && (
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'rgba(240,235,225,0.38)', padding: '0 16px 5px' }}>
                    {group.section}
                  </div>
                )}
                {group.items.map(item => {
                  const count = item.countKey ? counts[item.countKey] : undefined;
                  const isActive = currentPage === item.page;
                  const icon = PAGE_ICONS[item.page] ?? '·';
                  return (
                    <div
                      key={item.page}
                      title={collapsed ? item.label : undefined}
                      style={{
                        display: 'flex', alignItems: 'center',
                        padding: collapsed ? '10px 0' : '8px 18px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        cursor: 'pointer',
                        borderLeft: isActive ? '2px solid #89A8C6' : '2px solid transparent',
                        background: isActive ? 'rgba(100,128,162,0.16)' : 'transparent',
                        fontSize: collapsed ? 16 : 13.5,
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? 'rgba(245,240,232,0.96)' : 'rgba(240,235,225,0.62)',
                        gap: 8,
                        transition: 'background 0.12s, color 0.12s',
                      }}
                      onClick={() => onNavigate(item.page)}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.045)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {collapsed ? (
                        <span>{icon}</span>
                      ) : (
                        <>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {count != null && (
                            <span style={{
                              fontFamily: "'DM Mono',monospace", fontSize: 11,
                              color: item.hot ? '#F08880' : isActive ? '#89A8C6' : 'rgba(200,215,235,0.38)',
                              background: item.hot ? 'rgba(220,100,88,0.20)' : isActive ? 'rgba(100,128,162,0.22)' : 'rgba(255,255,255,0.07)',
                              padding: '2px 7px', borderRadius: 20,
                            }}>{count}</span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(200,220,255,0.13)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4E6E96,#6480A2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>BC</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(245,240,232,0.96)' }}>Briana Corso</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'rgba(100,128,162,0.65)', marginTop: 1 }}>Industrial · SGV / IE</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ padding: '14px 0', borderTop: '1px solid rgba(200,220,255,0.13)', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4E6E96,#6480A2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>BC</div>
          </div>
        )}
      </aside>

      {/* Collapse Toggle */}
      <div
        onClick={toggleCollapse}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'fixed',
          left: sbWidth - 12,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 22, height: 44,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderLeft: 'none',
          borderRadius: '0 8px 8px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 200,
          boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
          fontSize: 10, color: 'var(--ink4)',
          transition: 'left 0.25s ease',
        }}
      >
        {collapsed ? '›' : '‹'}
      </div>
    </>
  );
}
