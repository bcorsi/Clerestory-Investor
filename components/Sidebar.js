'use client';

export default function Sidebar({ page, setPage, counts, user, onSignOut }) {
  const nav = [
    { section: 'Overview', items: [
      { id: 'dashboard', label: 'Command Center', icon: '◫', badge: null },
    ]},
    { section: 'CRM', items: [
      { id: 'properties', label: 'Properties', icon: '⌂', badge: counts.properties },
      { id: 'lead-gen', label: 'Lead Gen', icon: '◎', badge: counts.leads },
      { id: 'pipeline', label: 'Deal Pipeline', icon: '◈', badge: counts.hotDeals },
      { id: 'contacts', label: 'Contacts', icon: '◉', badge: counts.contacts },
      { id: 'accounts', label: 'Accounts', icon: '⬡', badge: counts.accounts },
      { id: 'activities', label: 'Activities', icon: '✓', badge: counts.pendingActivities || null },
      { id: 'tasks', label: 'Tasks', icon: '◻', badge: counts.pendingTasks || null },
    ]},
    { section: 'Comps', items: [
      { id: 'lease-comps', label: 'Lease Comps', icon: '▤', badge: counts.leaseComps },
      { id: 'sale-comps', label: 'Sale Comps', icon: '◆', badge: counts.saleComps },
    ]},
    { section: 'Intelligence', items: [
      { id: 'warn-intel', label: 'WARN Intel', icon: '⚠', badge: counts.warnNew || null },
      { id: 'map-view', label: 'Map View', icon: '◉', badge: null },
    ]},
  ];

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initial = userName[0].toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">C</div>
          Clerestory
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map((section) => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-label">{section.section}</div>
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 10px' }}>
        <button
          className={`nav-item ${page === 'settings' ? 'active' : ''}`}
          onClick={() => setPage('settings')}
          style={{ marginBottom: '4px' }}
        >
          <span className="nav-item-icon">⚙</span>
          Settings
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 10px', borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: 600, flexShrink: 0,
          }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || 'Colliers · SGV / IE'}
            </div>
          </div>
          <button
            onClick={onSignOut}
            title="Sign out"
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: '15px', padding: '4px',
              borderRadius: 'var(--radius-sm)', transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ↪
          </button>
        </div>
      </div>
    </aside>
  );
}
