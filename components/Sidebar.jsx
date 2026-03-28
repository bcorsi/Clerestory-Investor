'use client';
import { useState } from 'react';

function ClerestoryIcon({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size,
      background: '#0E1520',
      borderRadius: size * 0.19,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <svg width={size} height={size} viewBox="0 0 52 52">
        <defs>
          <linearGradient id="ns1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6480A2" stopOpacity=".95"/>
            <stop offset="100%" stopColor="#6480A2" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="ns2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#89A8C6" stopOpacity=".7"/>
            <stop offset="100%" stopColor="#89A8C6" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="ns3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6480A2" stopOpacity=".42"/>
            <stop offset="100%" stopColor="#6480A2" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="ns4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6480A2" stopOpacity=".2"/>
            <stop offset="100%" stopColor="#6480A2" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <rect x="3"  y="3" width="10" height="8" rx="1.5" fill="#6480A2"/>
        <rect x="4"  y="3.5" width="4" height="3" rx=".5" fill="#A8C4DC" opacity=".55"/>
        <rect x="15" y="3" width="10" height="8" rx="1.5" fill="#6480A2" opacity=".7"/>
        <rect x="27" y="3" width="10" height="8" rx="1.5" fill="#6480A2" opacity=".42"/>
        <rect x="39" y="3" width="10" height="8" rx="1.5" fill="#6480A2" opacity=".2"/>
        <rect x="0" y="10" width="52" height="2" fill="#0A0F1A"/>
        <polygon points="3,12 13,12 16,50 0,50"  fill="url(#ns1)" opacity=".7"/>
        <polygon points="15,12 25,12 26,50 14,50" fill="url(#ns2)" opacity=".6"/>
        <polygon points="27,12 37,12 36,50 26,50" fill="url(#ns3)" opacity=".5"/>
        <polygon points="39,12 49,12 52,50 36,50" fill="url(#ns4)" opacity=".4"/>
        <circle cx="20" cy="46" r="2.5" fill="#B83714"/>
      </svg>
    </div>
  );
}

function ClerestoryWordmark({ size = 16, color = 'rgba(240,235,225,0.93)' }) {
  const eyeW = size * 0.69;
  const eyeH = size * 1.0;
  return (
    <div style={{
      fontFamily: "'Instrument Sans', sans-serif",
      fontSize: size,
      fontWeight: 600,
      color,
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      lineHeight: 1,
    }}>
      <span>Clerest</span>
      <svg
        width={eyeW}
        height={eyeH}
        viewBox="0 0 14 22"
        style={{ display: 'inline-block', margin: '0 0.5px' }}
      >
        <path
          d="M1,11 C3.5,4 10.5,4 13,11 C10.5,18 3.5,18 1,11 Z"
          fill="none"
          stroke={color}
          strokeWidth="0.8"
        />
        <circle cx="7" cy="11" r="3" fill="none" stroke={color} strokeWidth="0.7"/>
        <circle cx="7" cy="11" r="1.3" fill="#B83714"/>
      </svg>
      <span>ry</span>
    </div>
  );
}

const NAV = [
  { section: 'Portfolio' },
  { page: 'dashboard', label: 'Command Center', icon: '⌘' },
  { page: 'properties', label: 'Properties', icon: '▣', count: 'properties' },
  { page: 'map', label: 'Map View', icon: '◎' },
  { section: 'Deal Flow' },
  { page: 'leads', label: 'Lead Gen', icon: '⚡', count: 'leads' },
  { page: 'deals', label: 'Deal Pipeline', icon: '◈', count: 'deals' },
  { page: 'warn', label: 'WARN Intel', icon: '◉', count: 'warn', hot: true },
  { section: 'Market Intel' },
  { page: 'lease-comps', label: 'Lease Comps', icon: '≡', count: 'leaseComps' },
  { page: 'sale-comps', label: 'Sale Comps', icon: '◇', count: 'saleComps' },
  { page: 'comp-analytics', label: 'Comp Analytics', icon: '▲' },
  { page: 'news', label: 'News Feed', icon: '◫' },
  { section: 'Relationships' },
  { page: 'accounts', label: 'Accounts', icon: '◫', count: 'accounts' },
  { page: 'contacts', label: 'Contacts', icon: '○', count: 'contacts' },
  { page: 'owner-search', label: 'Owner Search', icon: '◎' },
  { section: 'Operations' },
  { page: 'tasks', label: 'Tasks', icon: '□', count: 'tasks' },
  { page: 'campaigns', label: 'Research Campaigns', icon: '◑' },
];

export default function Sidebar({ currentPage, onNavigate, counts = {}, onCollapseChange }) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapseChange?.(next);
  };

  const bg = 'linear-gradient(180deg, #1F2840 0%, #1A2130 55%, #15192A 100%)';
  const w = collapsed ? 64 : 242;

  return (
    <div style={{ width: w, minHeight: '100vh', background: bg, position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, transition: 'width 0.25s ease', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Top accent line — 3px gradient stripe */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, var(--blue2), var(--blue3))', flexShrink: 0 }} />

      {/* Logo zone */}
      <div style={{
        padding: '22px 18px 18px',
        borderBottom: '1px solid var(--sb-line2)',
      }}>
        {collapsed ? (
          <div style={{ display:'flex', justifyContent:'center', paddingBottom:4 }}>
            <ClerestoryIcon size={32} />
          </div>
        ) : (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
              <ClerestoryIcon size={32} />
              <ClerestoryWordmark size={16} color="rgba(240,235,225,0.93)" />
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 12,
              fontStyle: 'italic',
              fontWeight: 300,
              color: 'rgba(100,128,162,0.85)',
              lineHeight: 1.3,
            }}>
              See the deal before it&apos;s a deal.
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        {NAV.map((item, i) => {
          if (item.section) {
            if (collapsed) return null;
            return (
              <div key={i} style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--sb-label)', padding: '18px 18px 6px' }}>
                {item.section}
              </div>
            );
          }
          const isActive = currentPage === item.page;
          const count = item.count ? (counts[item.count] || 0) : null;
          const isHot = item.hot && count > 0;
          return (
            <div
              key={item.page}
              onClick={() => onNavigate(item.page)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '10px 0' : '8px 18px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                cursor: 'pointer',
                background: isActive ? 'rgba(100,128,162,0.12)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--blue2)' : '2px solid transparent',
                marginBottom: 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(100,128,162,0.08)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 15, opacity: isActive ? 1 : 0.55, color: '#89A8C6', flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && (
                <>
                  <span style={{ fontSize: 13, fontFamily: "'Instrument Sans', sans-serif", color: isActive ? 'var(--sb-text)' : 'var(--sb-muted)', flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                  {count != null && count > 0 && (
                    <span style={{
                      fontSize: 11, fontFamily: "'DM Mono', monospace",
                      background: isHot ? 'rgba(220,100,88,0.20)' : 'rgba(255,255,255,0.07)',
                      color: isHot ? '#F08880' : 'rgba(200,215,235,0.38)',
                      padding: '1px 6px', borderRadius: 10, flexShrink: 0,
                    }}>{count}</span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Collapse toggle */}
      <div
        onClick={toggleCollapse}
        style={{ position: 'absolute', right: -11, top: '50%', transform: 'translateY(-50%)', width: 22, height: 44, background: '#FFFFFF', borderRadius: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: '#524D46', zIndex: 101 }}
      >
        {collapsed ? '›' : '‹'}
      </div>
    </div>
  );
}
