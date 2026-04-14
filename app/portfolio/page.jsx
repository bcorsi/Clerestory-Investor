'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

// ══════════════════════════════════════════════════════════════════
// CLERESTORY INVESTOR — Portfolio Dashboard
// app/portfolio/page.jsx
// AUM overview, holdings table, key events, occupancy tracking
// April 14, 2026
// ══════════════════════════════════════════════════════════════════

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtM(n) { return n != null ? `$${(Number(n) / 1000000).toFixed(1)}M` : '—'; }
function fmtPct(n) { return n != null ? `${Number(n).toFixed(1)}%` : '—'; }
function fmtPSF(n) { return n != null ? `$${Number(n).toFixed(0)}` : '—'; }

const STATUS_STYLES = {
  Active:     { bg: 'rgba(21,102,54,0.08)', color: 'var(--green)', border: 'rgba(21,102,54,0.25)' },
  Stabilizing:{ bg: 'rgba(140,90,4,0.08)', color: 'var(--amber)', border: 'rgba(140,90,4,0.25)' },
  'Lease-Up': { bg: 'rgba(184,55,20,0.08)', color: 'var(--rust)', border: 'rgba(184,55,20,0.25)' },
  Disposing:  { bg: 'rgba(88,56,160,0.08)', color: 'var(--purple)', border: 'rgba(88,56,160,0.25)' },
  Sold:       { bg: 'rgba(0,0,0,0.04)', color: 'var(--text-tertiary)', border: 'rgba(0,0,0,0.1)' },
};

export default function PortfolioDashboard() {
  const [holdings, setHoldings] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPortfolio(); }, []);

  async function loadPortfolio() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Load holdings with linked property data
      const { data: holdingsData, error: hErr } = await supabase
        .from('portfolio_holdings')
        .select(`
          *,
          properties (
            id, address, city, market, submarket, building_sf, land_acres,
            tenant, vacancy_status, ai_score, clear_height
          )
        `)
        .not('status', 'eq', 'Sold')
        .order('acquisition_date', { ascending: false });

      if (hErr) throw hErr;
      setHoldings(holdingsData || []);

      // Load upcoming events (next 12 months)
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const { data: eventsData, error: eErr } = await supabase
        .from('asset_events')
        .select('*, portfolio_holdings(id, properties(address, city))')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .lte('event_date', futureDate.toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(10);

      if (!eErr) setEvents(eventsData || []);
    } catch (e) {
      console.error('Portfolio load error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ── Portfolio KPI calculations ──────────────────────────
  const activeHoldings = holdings.filter(h => h.status !== 'Sold');
  const totalAUM = activeHoldings.reduce((s, h) => s + (Number(h.acquisition_price) || 0), 0);
  const totalSF = activeHoldings.reduce((s, h) => {
    const sf = h.properties?.building_sf || h.building_sf;
    return s + (Number(sf) || 0);
  }, 0);
  const totalNOI = activeHoldings.reduce((s, h) => s + (Number(h.current_noi) || 0), 0);
  const totalEquity = activeHoldings.reduce((s, h) => s + (Number(h.equity_invested) || 0), 0);

  // Weighted occupancy
  const occHoldings = activeHoldings.filter(h => h.occupancy_pct != null);
  const wtdOcc = occHoldings.length > 0
    ? occHoldings.reduce((s, h) => {
        const sf = Number(h.properties?.building_sf || h.building_sf || 0);
        return s + (Number(h.occupancy_pct) * sf);
      }, 0) / occHoldings.reduce((s, h) => s + Number(h.properties?.building_sf || h.building_sf || 0), 0)
    : null;

  // Weighted avg cap
  const capHoldings = activeHoldings.filter(h => h.going_in_cap && h.acquisition_price);
  const wtdCap = capHoldings.length > 0
    ? capHoldings.reduce((s, h) => s + Number(h.going_in_cap) * Number(h.acquisition_price), 0) /
      capHoldings.reduce((s, h) => s + Number(h.acquisition_price), 0)
    : null;

  // Vacant SF
  const vacantSF = activeHoldings.reduce((s, h) => {
    const sf = Number(h.properties?.building_sf || h.building_sf || 0);
    const occ = Number(h.occupancy_pct || 100);
    return s + sf * (1 - occ / 100);
  }, 0);

  return (
    <div>
      {/* Header */}
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">
            Portfolio{' '}
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 400, color: 'var(--blue)' }}>
              Dashboard
            </span>
          </h1>
          <p className="cl-page-subtitle">
            {loading ? 'Loading…' : `${activeHoldings.length} holdings · ${fmt(totalSF)} Total SF · ${fmtM(totalAUM)} AUM`}
          </p>
        </div>
        <div className="cl-page-actions">
          <Link href="/dispositions" className="cl-btn cl-btn-secondary cl-btn-sm" style={{ textDecoration: 'none' }}>
            Dispositions
          </Link>
          <Link href="/deals" className="cl-btn cl-btn-primary cl-btn-sm" style={{ textDecoration: 'none' }}>
            Acq Pipeline →
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{
        display: 'flex', gap: 1, background: 'rgba(0,0,0,0.06)', borderRadius: 10,
        overflow: 'hidden', marginBottom: 24,
      }}>
        <PKPI label="AUM" value={fmtM(totalAUM)} sub={`${activeHoldings.length} assets`} />
        <PKPI label="Total SF" value={fmt(totalSF)} sub={`${activeHoldings.reduce((s, h) => {
          // count buildings - rough proxy
          return s + 1;
        }, 0)} buildings`} />
        <PKPI label="Portfolio NOI" value={fmtM(totalNOI)} color="var(--green)" sub="annualized" />
        <PKPI label="Occupancy" value={wtdOcc ? fmtPct(wtdOcc) : '—'}
          color={wtdOcc && wtdOcc >= 95 ? 'var(--green)' : wtdOcc && wtdOcc >= 80 ? 'var(--amber)' : 'var(--rust)'}
          sub={vacantSF > 0 ? `${fmt(Math.round(vacantSF))} SF vacant` : 'fully occupied'}
        />
        <PKPI label="Wtd Avg Cap" value={wtdCap ? fmtPct(wtdCap) : '—'} color="var(--blue)" sub="going-in basis" />
        <PKPI label="Equity Invested" value={fmtM(totalEquity)} sub={totalAUM > 0 ? `${Math.round((1 - totalEquity / totalAUM) * 100)}% avg LTV` : ''} />
      </div>

      {loading ? (
        <div className="cl-loading"><div className="cl-spinner" />Loading portfolio…</div>
      ) : activeHoldings.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Holdings table — main */}
          <div style={{ flex: 1 }}>
            <HoldingsTable holdings={activeHoldings} />
          </div>

          {/* Events sidebar */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <EventsSidebar events={events} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── PORTFOLIO KPI ────────────────────────────────────────────
function PKPI({ label, value, color, sub }) {
  return (
    <div style={{ flex: 1, background: '#FAFAF8', padding: '14px 18px' }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#78726A', marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700,
        color: color || 'var(--text-primary)', lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: '#78726A', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── HOLDINGS TABLE ───────────────────────────────────────────
function HoldingsTable({ holdings }) {
  return (
    <div style={{
      borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#EDE8E0', padding: '10px 18px', borderBottom: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#78726A',
        }}>
          Holdings
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#78726A' }}>
          {holdings.length} assets
        </span>
      </div>

      <table style={{
        width: '100%', borderCollapse: 'collapse', background: '#FAFAF8', fontSize: 13,
      }}>
        <thead>
          <tr>
            {['Asset', 'Market', 'SF', 'Occ', 'NOI', 'Cap', 'Hold', 'Status', 'Next Event'].map(h => (
              <th key={h} style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                letterSpacing: '0.1em', color: '#78726A', textTransform: 'uppercase',
                padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.08)',
                background: 'rgba(0,0,0,0.015)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map(h => {
            const prop = h.properties || {};
            const sf = Number(prop.building_sf || h.building_sf || 0);
            const holdYears = h.acquisition_date
              ? ((Date.now() - new Date(h.acquisition_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)
              : '—';
            const statusStyle = STATUS_STYLES[h.status] || STATUS_STYLES.Active;

            return (
              <tr key={h.id} style={{
                borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,110,150,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '10px 14px' }}>
                  <Link href={`/asset-mgmt/${h.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                      {prop.address || h.asset_name || '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {prop.city || ''}
                      {h.strategy && ` · ${h.strategy}`}
                    </div>
                  </Link>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {prop.market || '—'}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {sf > 0 ? `${(sf / 1000).toFixed(0)}K` : '—'}
                </td>
                <td style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
                  color: h.occupancy_pct >= 95 ? 'var(--green)' : h.occupancy_pct >= 50 ? 'var(--amber)' : 'var(--rust)',
                }}>
                  {h.occupancy_pct != null ? `${h.occupancy_pct}%` : '—'}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {h.current_noi ? fmtM(h.current_noi) : '—'}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)' }}>
                  {h.going_in_cap ? `${Number(h.going_in_cap).toFixed(1)}%` : '—'}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {holdYears !== '—' ? `${holdYears} yr` : '—'}
                </td>
                <td>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: statusStyle.bg, color: statusStyle.color,
                    border: `1px solid ${statusStyle.border}`,
                  }}>
                    {h.status || 'Active'}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 160 }}>
                  {h.next_event || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── EVENTS SIDEBAR ───────────────────────────────────────────
function EventsSidebar({ events }) {
  const EVENT_ICONS = {
    'Lease Renewal':    '📋',
    'Lease Expiry':     '⚠',
    'New Lease':        '✅',
    'Tenant Move-Out':  '🚛',
    'CapEx / TI':       '🔧',
    'Refinance':        '🏦',
    'Loan Maturity':    '📅',
    'Disposition':      '💰',
  };

  return (
    <div style={{
      borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden',
    }}>
      <div style={{
        background: '#EDE8E0', padding: '10px 18px',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#78726A',
        }}>
          Upcoming Events
        </span>
      </div>
      <div style={{ background: '#FAFAF8', padding: events.length > 0 ? '8px 0' : '24px 18px' }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#78726A', fontSize: 13 }}>
            No upcoming events.
            <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-tertiary)' }}>
              Events will appear here as holdings are added.
            </div>
          </div>
        ) : events.map(ev => (
          <div key={ev.id} style={{
            padding: '8px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
              {EVENT_ICONS[ev.event_type] || '📌'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                {ev.event_type}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
                {ev.description || ''}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)',
                marginTop: 2,
              }}>
                {new Date(ev.event_date).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
                {ev.financial_impact && (
                  <span style={{ color: 'var(--amber)', marginLeft: 8 }}>
                    {ev.financial_impact}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EMPTY STATE ──────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      background: '#FAFAF8', borderRadius: 12, padding: '60px 40px',
      textAlign: 'center', border: '1px solid rgba(0,0,0,0.08)',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12, background: 'rgba(78,110,150,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', fontSize: 24,
      }}>
        🏗
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        No holdings yet
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
        When acquisitions close, they move here for portfolio tracking. You can also add existing holdings manually.
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Link href="/deals" className="cl-btn cl-btn-secondary cl-btn-sm" style={{ textDecoration: 'none' }}>
          View Acq Pipeline
        </Link>
        <button className="cl-btn cl-btn-primary cl-btn-sm">
          + Add Holding
        </button>
      </div>
    </div>
  );
}
