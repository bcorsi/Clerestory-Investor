'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_SECTIONS = [
  {
    label: 'INTELLIGENCE',
    items: [
      { href: '/',             icon: GridIcon,     label: 'Command Center' },
      { href: '/warn-intel',      icon: BoltIcon,     label: 'WARN Intel',      badge: 'warn' },
      { href: '/bankruptcy-radar', icon: ScaleIcon,    label: 'Bankruptcy Radar' },
      { href: '/news',         icon: NewsIcon,     label: 'News Feed' },
      { href: '/research',     icon: SearchIcon,   label: 'Research' },
      { href: '/owner-search', icon: BuildingIcon, label: 'Owner Search' },
    ],
  },
  {
    label: 'PIPELINE',
    items: [
      { href: '/leads', icon: LeadIcon, label: 'Lead Gen' },
      { href: '/deals', icon: DealIcon, label: 'Deal Pipeline' },
      { href: '/tasks', icon: TaskIcon, label: 'Tasks', badge: 'tasks' },
    ],
  },
  {
    label: 'RECORDS',
    items: [
      { href: '/properties', icon: WarehouseIcon, label: 'Properties' },
      { href: '/contacts',   icon: PersonIcon,    label: 'Contacts' },
      { href: '/accounts',   icon: OrgIcon,       label: 'Accounts' },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { href: '/comps/lease', icon: CompsIcon, label: 'Lease Comps' },
      { href: '/comps/sale',  icon: CompsIcon, label: 'Sale Comps' },
      { href: '/analytics',   icon: ChartIcon, label: 'Comp Analytics' },
      { href: '/map',         icon: MapIcon,   label: 'Map View' },
    ],
  },
];

const PAGE_META = {
  '/':             { title: 'Command Center', parent: null },
  '/warn-intel':   { title: 'WARN Intel',     parent: 'Intelligence' },
  '/news':         { title: 'News Feed',      parent: 'Intelligence' },
  '/research':     { title: 'Research',       parent: 'Intelligence' },
  '/owner-search': { title: 'Owner Search',   parent: 'Intelligence' },
  '/leads':        { title: 'Lead Gen',       parent: 'Pipeline' },
  '/deals':        { title: 'Deal Pipeline',  parent: 'Pipeline' },
  '/tasks':        { title: 'Tasks',          parent: 'Pipeline' },
  '/properties':   { title: 'Properties',     parent: 'Records' },
  '/contacts':     { title: 'Contacts',       parent: 'Records' },
  '/accounts':     { title: 'Accounts',       parent: 'Records' },
  '/comps/lease':  { title: 'Lease Comps',    parent: 'Analytics' },
  '/comps/sale':   { title: 'Sale Comps',     parent: 'Analytics' },
  '/analytics':    { title: 'Comp Analytics', parent: 'Analytics' },
  '/map':          { title: 'Map View',       parent: 'Analytics' },
  '/settings':     { title: 'Settings',       parent: null },
  '/bankruptcy-radar': { title: 'Bankruptcy Radar', parent: 'Intelligence' },
};

export default function Layout({ children }) {
  const pathname = usePathname();
  const [warnCount, setWarnCount] = useState(0);
  const [overdueTaskCount, setOverdueTaskCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const basePath = '/' + (pathname.split('/').filter(Boolean)[0] || '');
  const twoPartPath = '/' + pathname.split('/').filter(Boolean).slice(0,2).join('/');
  const meta = PAGE_META[pathname] || PAGE_META[twoPartPath] || PAGE_META[basePath] || { title: 'Clerestory', parent: null };

  useEffect(() => { fetchBadgeCounts(); }, []);

  async function fetchBadgeCounts() {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: wc } = await supabase
        .from('warn_notices').select('*', { count: 'exact', head: true })
        .gte('notice_date', thirtyDaysAgo.toISOString().split('T')[0])
        .eq('reviewed', false);
      if (wc) setWarnCount(wc);
      const today = new Date().toISOString().split('T')[0];
      const { count: tc } = await supabase
        .from('tasks').select('*', { count: 'exact', head: true })
        .lt('due_date', today).neq('status', 'done');
      if (tc) setOverdueTaskCount(tc);
    } catch {}
  }

  function getBadge(key) {
    if (key === 'warn' && warnCount > 0) return warnCount;
    if (key === 'tasks' && overdueTaskCount > 0) return overdueTaskCount;
    return null;
  }

  return (
    <div className="cl-shell">
      {/* Sidebar */}
      <aside className={`cl-sidebar ${collapsed ? 'cl-sidebar--collapsed' : ''}`}>
    <div className="cl-logo-wrap">
  <Link href="/" className="cl-logo-link" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <ClerestoryEye />
      {!collapsed && (
        <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 34, fontWeight: 500, color: '#15120D', lineHeight: 1, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
          Clerest<svg width="23" height="34" viewBox="0 0 18 24" style={{ display: 'inline-block', margin: '0 1px' }}><path d="M1,12 C4.5,4.5 13.5,4.5 17,12 C13.5,19.5 4.5,19.5 1,12 Z" fill="none" stroke="#15120D" strokeWidth="1.3"/><circle cx="9" cy="12" r="3.2" fill="#4E6E96"/><circle cx="7.6" cy="10.5" r="0.9" fill="#C8DAE8"/></svg>ry
        </div>
      )}
    </div>
    {!collapsed && (
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14.5, fontStyle: 'italic', fontWeight: 300, color: '#78726A', marginTop: 10, paddingLeft: 2 }}>
        See the deal before it's a deal.
      </div>
    )}
  </Link>
  <button className="cl-collapse-btn" onClick={() => setCollapsed(c => !c)}>
    {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
  </button>
</div>    
            <nav className="cl-nav">
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="cl-nav-section">
              {!collapsed && <span className="cl-nav-section-label">{section.label}</span>}
              {section.items.map(item => {
                const Icon = item.icon;
                const badge = item.badge ? getBadge(item.badge) : null;
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className={`cl-nav-item ${isActive ? 'cl-nav-item--active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="cl-nav-icon"><Icon /></span>
                    {!collapsed && <span className="cl-nav-label">{item.label}</span>}
                    {badge && <span className="cl-nav-badge">{badge > 99 ? '99+' : badge}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="cl-sidebar-footer">
            <Link href="/settings" className="cl-nav-item cl-nav-item--footer">
              <span className="cl-nav-icon"><SettingsIcon /></span>
              <span className="cl-nav-label">Settings</span>
            </Link>
            <p className="cl-tagline">See the deal before it's a deal.</p>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="cl-page-content">
        {children}
      </main>
    </div>
  );
} 

function ClerestoryEye() {
  return (
    <div style={{
      width: 48, height: 48,
      background: '#293A52',
      borderRadius: 10,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <svg width="48" height="48" viewBox="0 0 52 52">
        <defs>
          <linearGradient id="b1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1"/>
            <stop offset="30%" stopColor="#E8F0F8" stopOpacity=".85"/>
            <stop offset="70%" stopColor="#B8D0E4" stopOpacity=".3"/>
            <stop offset="100%" stopColor="#89A8C6" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="b2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0ECF6" stopOpacity=".9"/>
            <stop offset="40%" stopColor="#C0D4E6" stopOpacity=".5"/>
            <stop offset="100%" stopColor="#A0BADA" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="b3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D0E0EE" stopOpacity=".6"/>
            <stop offset="50%" stopColor="#B0C4DA" stopOpacity=".2"/>
            <stop offset="100%" stopColor="#89A8C6" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="b4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C0D4E6" stopOpacity=".35"/>
            <stop offset="100%" stopColor="#89A8C6" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="10" height="8" rx="1.5" fill="#A8C0D8"/>
        <rect x="4" y="3.5" width="4" height="3" rx=".5" fill="#F0F6FB" opacity=".9"/>
        <rect x="15" y="3" width="10" height="8" rx="1.5" fill="#9AB6D0" opacity=".8"/>
        <rect x="27" y="3" width="10" height="8" rx="1.5" fill="#9AB6D0" opacity=".5"/>
        <rect x="39" y="3" width="10" height="8" rx="1.5" fill="#9AB6D0" opacity=".28"/>
        <rect x="0" y="10" width="52" height="2" fill="#1A2535"/>
        <polygon points="3,12 13,12 16,50 0,50" fill="url(#b1)" opacity=".95"/>
        <polygon points="15,12 25,12 26,50 14,50" fill="url(#b2)" opacity=".75"/>
        <polygon points="27,12 37,12 36,50 26,50" fill="url(#b3)" opacity=".55"/>
        <polygon points="39,12 49,12 52,50 36,50" fill="url(#b4)" opacity=".4"/>
      </svg>
    </div>
  );
}

function GridIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg>; }
function BoltIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9 1L3 9h5l-1 6 7-8H9l1-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>; }
function NewsIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M4 6h8M4 9h6M4 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function BuildingIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M5 14V10h6v4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeOpacity="0.5"/><rect x="5" y="5.5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5"/><rect x="9" y="5.5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>; }
function LeadIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function DealIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12L6 4l4 5 2-3 2 6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/></svg>; }
function TaskIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function WarehouseIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 14V7L8 2l7 5v7H1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><rect x="5" y="10" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 10v4" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5"/></svg>; }
function PersonIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function OrgIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="1" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="11" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="10" y="11" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3M4 11V8H12v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function CompsIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 13V7l3-3 3 2 3-4 3 2v9H2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>; }
function ChartIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="9" width="3" height="5" rx="0.5" fill="currentColor" opacity="0.7"/><rect x="6.5" y="6" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.7"/><rect x="11" y="3" width="3" height="11" rx="0.5" fill="currentColor" opacity="0.7"/></svg>; }
function MapIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 3l4.5 1.5L10 3l5 1.5v9.5L10 12.5 5.5 14 1 12.5V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>; }
function SettingsIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>; }
function ChevronLeftIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ChevronRightIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ScaleIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M4 14h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M2 6l2-3 2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 6l2-3 2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 6h4M10 6h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>; }
