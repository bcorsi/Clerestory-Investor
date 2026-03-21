'use client';

const LOGO_SVG = `<svg width="38" height="38" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="3" fill="#141C28"/><rect x="0" y="0" width="64" height="15" rx="3" fill="#1E2535"/><rect x="4" y="3" width="12" height="9" rx="0.5" fill="#6B83A6"/><rect x="19" y="3" width="12" height="9" rx="0.5" fill="#6B83A6" opacity="0.7"/><rect x="34" y="3" width="12" height="9" rx="0.5" fill="#6B83A6" opacity="0.42"/><rect x="49" y="3" width="12" height="9" rx="0.5" fill="#6B83A6" opacity="0.2"/><rect x="5" y="4" width="4" height="7" rx="0.3" fill="#B0C4D8" opacity="0.55"/><line x1="17" y1="0" x2="17" y2="15" stroke="#141C28" stroke-width="1"/><line x1="32" y1="0" x2="32" y2="15" stroke="#141C28" stroke-width="1"/><line x1="47" y1="0" x2="47" y2="15" stroke="#141C28" stroke-width="1"/><line x1="0" y1="15" x2="64" y2="15" stroke="#0E1520" stroke-width="1.5"/><polygon points="4,15 16,15 20,62 0,62" fill="#6B83A6" opacity="0.1"/><path d="M11 40 Q32 28 53 40 Q32 52 11 40Z" stroke="#6B83A6" stroke-width="0.9" fill="rgba(107,131,166,0.05)"/><circle cx="32" cy="40" r="6.5" stroke="#6B83A6" stroke-width="0.9" fill="none"/><circle cx="32" cy="40" r="4" stroke="#6B83A6" stroke-width="0.4" fill="none" opacity="0.4"/><circle cx="32" cy="40" r="1.8" fill="#6B83A6"/><circle cx="30.6" cy="38.6" r="0.7" fill="#B0C4D8" opacity="0.9"/><line x1="0" y1="61" x2="64" y2="61" stroke="#1E2535" stroke-width="2.5"/></svg>`;

const NAV_ICONS = {
  dashboard: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1" y="1" width="5" height="5"/><rect x="8" y="1" width="5" height="5"/><rect x="1" y="8" width="5" height="5"/><rect x="8" y="8" width="5" height="5"/></svg>',
  properties: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1 2h12v10H1zM1 6h12"/></svg>',
  'lead-gen': '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="7" cy="5" r="3"/><path d="M1 13c0-3 2.7-5 6-5s6 2 6 5"/></svg>',
  pipeline: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 11L5 4l3 4 2-3 2 6"/></svg>',
  contacts: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="5" cy="5" r="3"/><circle cx="10" cy="9" r="3"/></svg>',
  accounts: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1" y="2" width="12" height="10" rx="1"/><path d="M4 7h6M4 9.5h4"/></svg>',
  activities: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 11l3-3 3 3 4-8"/></svg>',
  tasks: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="7" cy="7" r="5"/><path d="M7 4.5V7l1.5 1.5"/></svg>',
  'lease-comps': '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 11h10M3 11V6l4-4 4 4v5"/></svg>',
  'sale-comps': '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="7" cy="7" r="5"/><path d="M7 3v8M3 7h8"/></svg>',
  'comp-dashboard': '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 11V5M5 11V3M8 11V7M11 11V2"/></svg>',
  'owner-search': '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5L13 13"/></svg>',
  'warn-intel': '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M7 1L1 4v4c0 3 2.5 4.5 6 4.5s6-1.5 6-4.5V4z"/></svg>',
  'map-view': '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="7" cy="7" r="2"/><circle cx="7" cy="7" r="5"/></svg>',
  settings: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="7" cy="7" r="2.5"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.8 2.8l1.4 1.4M9.8 9.8l1.4 1.4M11.2 2.8l-1.4 1.4M4.2 9.8l-1.4 1.4"/></svg>',
};

export default function Sidebar({ page, setPage, counts, user, onSignOut }) {
  const nav = [
    { section: 'Overview', items: [
      { id: 'dashboard', label: 'Command Center' },
    ]},
    { section: 'CRM', items: [
      { id: 'properties', label: 'Properties', badge: counts.properties },
      { id: 'lead-gen', label: 'Lead Gen', badge: counts.leads },
      { id: 'pipeline', label: 'Deal Pipeline', badge: counts.hotDeals },
      { id: 'contacts', label: 'Contacts', badge: counts.contacts },
      { id: 'accounts', label: 'Accounts', badge: counts.accounts },
      { id: 'activities', label: 'Activities' },
      { id: 'tasks', label: 'Tasks', badge: counts.pendingTasks || null, alert: counts.pendingTasks > 0 },
    ]},
    { section: 'Comps', items: [
      { id: 'lease-comps', label: 'Lease Comps', badge: counts.leaseComps },
      { id: 'sale-comps', label: 'Sale Comps', badge: counts.saleComps },
      { id: 'comp-dashboard', label: 'Comp Analytics' },
    ]},
    { section: 'Intelligence', items: [
      { id: 'owner-search', label: 'Owner Search' },
      { id: 'warn-intel', label: 'WARN Intel', badge: counts.warnNew || null },
      { id: 'map-view', label: 'Map View' },
    ]},
  ];

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Briana Corso';
  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'BC';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="logo-zone">
        <div dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
        <div>
          <div className="logo-name">Clerestory</div>
          <div className="logo-sub">See the deal before it's a deal.</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {nav.map((section, si) => (
          <div key={section.section}>
            <div className="nav-group">
              <div className="nav-label">{section.section}</div>
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className={`nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => setPage(item.id)}
                >
                  <div className="nav-left">
                    <span style={{ width: '14px', height: '14px', flexShrink: 0, display: 'flex' }} dangerouslySetInnerHTML={{ __html: NAV_ICONS[item.id] || '' }} />
                    {item.label}
                  </div>
                  {item.badge != null && item.badge > 0 && (
                    <span className={`nav-badge ${item.alert ? 'nav-badge-alert' : ''}`}>{item.badge}</span>
                  )}
                </div>
              ))}
            </div>
            {si < nav.length - 1 && section.section !== 'Overview' && <div className="nav-divider" />}
          </div>
        ))}
      </nav>

      {/* Settings + Footer */}
      <div style={{ borderTop: '1px solid var(--sb-line2)' }}>
        <div
          className={`nav-item ${page === 'settings' ? 'active' : ''}`}
          onClick={() => setPage('settings')}
          style={{ margin: '6px 0' }}
        >
          <div className="nav-left">
            <span style={{ width: '14px', height: '14px', flexShrink: 0, display: 'flex' }} dangerouslySetInnerHTML={{ __html: NAV_ICONS.settings }} />
            Settings
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="avatar">{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div className="f-name">{userName}</div>
          <div className="f-role">
            {user?.email ? user.email.split('@')[0] + '@...' : 'Industrial Intelligence'}
          </div>
        </div>
        {onSignOut && (
          <button onClick={onSignOut} title="Sign out" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--sb-muted)', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>↪</button>
        )}
      </div>
    </aside>
  );
}
