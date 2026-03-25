'use client';
import styles from './Sidebar.module.css';

const NAV = [
  { section: 'Overview', items: [
    { label: 'Command Center', page: 'dashboard', icon: '⊞' },
  ]},
  { section: 'CRM', items: [
    { label: 'Properties', page: 'properties', count: null, countKey: 'properties' },
    { label: 'Lead Gen', page: 'leads', countKey: 'leads' },
    { label: 'Deal Pipeline', page: 'deals', countKey: 'deals' },
    { label: 'Contacts', page: 'contacts', countKey: 'contacts' },
    { label: 'Accounts', page: 'accounts', countKey: 'accounts' },
    { label: 'Tasks', page: 'tasks', countKey: 'tasks', hot: true },
  ]},
  { divider: true },
  { section: 'Comps', items: [
    { label: 'Lease Comps', page: 'lease-comps', countKey: 'leaseComps' },
    { label: 'Sale Comps', page: 'saleComps', countKey: 'saleComps' },
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

export default function Sidebar({ currentPage, onNavigate, counts = {} }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoZone}>
        <div className={styles.logoIcon}>
          <svg width="18" height="18" viewBox="0 0 64 64" fill="none">
            <rect x="4" y="3" width="12" height="9" rx="0.5" fill="#6B83A6"/>
            <rect x="19" y="3" width="12" height="9" rx="0.5" fill="#6B83A6" opacity="0.7"/>
            <rect x="34" y="3" width="12" height="9" rx="0.5" fill="#6B83A6" opacity="0.4"/>
            <circle cx="32" cy="40" r="6" stroke="#6B83A6" strokeWidth="0.9" fill="none"/>
            <circle cx="32" cy="40" r="2" fill="#6B83A6"/>
          </svg>
        </div>
        <div>
          <div className={styles.logoName}>Clerestory</div>
          <div className={styles.logoTag}>See the deal before it's a deal.</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV.map((group, gi) => {
          if (group.divider) return <div key={`div-${gi}`} className={styles.navDivider} />;
          return (
            <div key={group.section} className={styles.navSection}>
              <div className={styles.navLabel}>{group.section}</div>
              {group.items.map(item => {
                const count = item.countKey ? counts[item.countKey] : undefined;
                const isActive = currentPage === item.page;
                return (
                  <div
                    key={item.page}
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    onClick={() => onNavigate(item.page)}
                  >
                    <span className={styles.navText}>{item.label}</span>
                    {count != null && (
                      <span className={`${styles.navCt} ${item.hot ? styles.hot : ''}`}>
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className={styles.sbFooter}>
        <div className={styles.avatar}>BC</div>
        <div>
          <div className={styles.fName}>Briana Corso</div>
          <div className={styles.fRole}>Industrial · SGV / IE</div>
        </div>
      </div>
    </aside>
  );
}
