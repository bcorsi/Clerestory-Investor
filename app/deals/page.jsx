'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { DEAL_STAGES, RETURNS_STAGES, STRATEGY_TYPES } from '@/lib/constants';

// ══════════════════════════════════════════════════════════════════
// CLERESTORY INVESTOR — Acquisition Pipeline
// app/deals/page.jsx
// Reads from deals table. Investor stages, investor KPIs.
// ══════════════════════════════════════════════════════════════════

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtM(n) { return n != null ? `$${(Number(n) / 1000000).toFixed(1)}M` : '—'; }
function fmtPct(n) { return n != null ? `${Number(n).toFixed(1)}%` : '—'; }
function fmtPSF(n) { return n != null ? `$${Number(n).toFixed(0)}/SF` : '—'; }

// Active pipeline stages (exclude Dead for kanban display)
const KANBAN_STAGES = DEAL_STAGES.filter(s => s !== 'Dead');

// Color for pipeline stage columns
const STAGE_COLORS = {
  'Tracking':         'var(--blue)',
  'Underwriting':     'var(--amber)',
  'Offer / LOI':      'var(--purple)',
  'Under Contract':   'var(--green)',
  'Due Diligence':    'var(--green)',
  'Non-Contingent':   'var(--green)',
  'Closed':           'var(--green)',
  'Asset Management': 'var(--blue)',
};

// Strategy tag colors
const STRATEGY_COLORS = {
  'Core':           { bg: 'rgba(78,110,150,0.08)', color: 'var(--blue)', border: 'rgba(78,110,150,0.25)' },
  'Core+':          { bg: 'rgba(21,102,54,0.08)', color: 'var(--green)', border: 'rgba(21,102,54,0.25)' },
  'Value-Add':      { bg: 'rgba(140,90,4,0.08)', color: 'var(--amber)', border: 'rgba(140,90,4,0.25)' },
  'Opportunistic':  { bg: 'rgba(184,55,20,0.08)', color: 'var(--rust)', border: 'rgba(184,55,20,0.25)' },
  'Sale-Leaseback': { bg: 'rgba(184,55,20,0.08)', color: 'var(--rust)', border: 'rgba(184,55,20,0.25)' },
  'Development':    { bg: 'rgba(88,56,160,0.08)', color: 'var(--purple)', border: 'rgba(88,56,160,0.25)' },
  'Land Bank':      { bg: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)', border: 'rgba(0,0,0,0.1)' },
};

export default function AcquisitionPipelinePage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // kanban | table

  useEffect(() => { loadDeals(); }, []);

  async function loadDeals() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .not('stage', 'in', '("Dead")')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDeals(data || []);
    } catch (e) {
      console.error('Deals load error:', e);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }

  // ── KPI calculations (investor metrics) ─────────────────
  const activeDeals = deals.filter(d => !['Closed', 'Asset Management', 'Dead'].includes(d.stage));
  const closedDeals = deals.filter(d => d.stage === 'Closed' || d.stage === 'Asset Management');

  const totalBasis = deals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const totalEquity = deals.reduce((s, d) => s + (Number(d.equity_required) || 0), 0);

  // Weighted avg going-in cap (weighted by deal value)
  const capDeals = deals.filter(d => d.going_in_cap && d.deal_value);
  const wtdCap = capDeals.length > 0
    ? capDeals.reduce((s, d) => s + Number(d.going_in_cap) * Number(d.deal_value), 0) /
      capDeals.reduce((s, d) => s + Number(d.deal_value), 0)
    : null;

  // Weighted avg IRR (weighted by equity)
  const irrDeals = deals.filter(d => d.target_irr && d.equity_required);
  const wtdIrr = irrDeals.length > 0
    ? irrDeals.reduce((s, d) => s + Number(d.target_irr) * Number(d.equity_required), 0) /
      irrDeals.reduce((s, d) => s + Number(d.equity_required), 0)
    : null;

  const actionNeeded = deals.filter(d => d.priority === 'Critical' || d.priority === 'High').length;

  // Group deals by stage for kanban
  const grouped = {};
  KANBAN_STAGES.forEach(s => { grouped[s] = []; });
  deals.forEach(d => {
    if (grouped[d.stage]) grouped[d.stage].push(d);
  });

  return (
    <div>
      {/* Header */}
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">
            Acquisition{' '}
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 400, color: 'var(--blue)' }}>
              Pipeline
            </span>
          </h1>
          <p className="cl-page-subtitle">
            {loading ? 'Loading…' : `${deals.length} acquisitions · ${fmtM(totalBasis)} total basis · ${fmtM(totalEquity)} equity deployed`}
          </p>
        </div>
        <div className="cl-page-actions">
          <button
            className={`cl-btn cl-btn-sm ${viewMode === 'kanban' ? 'cl-btn-secondary' : 'cl-btn-ghost'}`}
            onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
          >
            {viewMode === 'kanban' ? 'Table View' : 'Kanban View'}
          </button>
          <Link href="/deals/new" className="cl-btn cl-btn-primary cl-btn-sm" style={{ textDecoration: 'none' }}>
            + New Acquisition
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{
        display: 'flex', gap: 1, background: 'rgba(0,0,0,0.06)', borderRadius: 10,
        overflow: 'hidden', marginBottom: 20,
      }}>
        <KPI label="Active" value={activeDeals.length} color="var(--blue)" />
        <KPI label="Total Basis" value={fmtM(totalBasis)} />
        <KPI label="Equity Deployed" value={fmtM(totalEquity)} color="var(--green)" />
        <KPI label="Wtd Going-In Cap" value={wtdCap ? fmtPct(wtdCap) : '—'} color="var(--green)" sub="target: 5.5%+" />
        <KPI label="Pipeline IRR" value={wtdIrr ? fmtPct(wtdIrr) : '—'} color="var(--green)" sub="levered, 5yr hold" />
        <KPI label="Action Needed" value={actionNeeded} color={actionNeeded > 0 ? 'var(--rust)' : undefined} />
      </div>

      {/* Kanban or Table */}
      {loading ? (
        <div className="cl-loading"><div className="cl-spinner" />Loading acquisitions…</div>
      ) : viewMode === 'kanban' ? (
        <div style={{
          display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12,
          minHeight: 400,
        }}>
          {KANBAN_STAGES.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              deals={grouped[stage] || []}
              color={STAGE_COLORS[stage] || 'var(--blue)'}
            />
          ))}
        </div>
      ) : (
        <TableView deals={deals} />
      )}
    </div>
  );
}

// ── KPI CARD ─────────────────────────────────────────────────
function KPI({ label, value, color, sub }) {
  return (
    <div style={{
      flex: 1, background: '#FAFAF8', padding: '14px 18px',
    }}>
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
      {sub && (
        <div style={{ fontSize: 10, color: '#78726A', marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

// ── KANBAN COLUMN ────────────────────────────────────────────
function KanbanColumn({ stage, deals, color }) {
  // Sum deal values for column header
  const colValue = deals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);

  return (
    <div style={{
      flex: '0 0 210px', background: 'rgba(0,0,0,0.025)', borderRadius: 10,
      padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: color,
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
            {stage}
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: 4,
          color: 'var(--text-tertiary)',
        }}>
          {deals.length}
        </span>
      </div>
      {colValue > 0 && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)',
          marginTop: -4, marginBottom: 2,
        }}>
          {fmtM(colValue)}
        </div>
      )}

      {/* Deal cards */}
      {deals.map(deal => (
        <DealCard key={deal.id} deal={deal} />
      ))}

      {/* Add button */}
      <Link href="/deals/new" style={{
        display: 'block', textAlign: 'center', padding: '8px 0',
        fontSize: 11, color: 'var(--text-tertiary)', textDecoration: 'none',
        borderRadius: 6, border: '1px dashed rgba(0,0,0,0.1)',
        transition: 'all 150ms',
      }}>
        + Add
      </Link>
    </div>
  );
}

// ── DEAL CARD (Investor mode) ────────────────────────────────
function DealCard({ deal }) {
  const goingInCap = deal.going_in_cap ? `${Number(deal.going_in_cap).toFixed(1)}% cap` : null;
  const targetIrr = deal.target_irr ? `${Number(deal.target_irr).toFixed(1)}% IRR` : null;
  const basisPSF = deal.deal_value && deal.building_sf
    ? `$${Math.round(Number(deal.deal_value) / Number(deal.building_sf))}/SF`
    : null;
  const strategy = deal.strategy_type || deal.deal_type;
  const stratColors = STRATEGY_COLORS[strategy] || STRATEGY_COLORS['Land Bank'];

  return (
    <Link href={`/deals/${deal.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: '#FAFAF8', borderRadius: 8, padding: '11px 13px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer',
        transition: 'box-shadow 150ms, transform 100ms',
        borderLeft: deal.priority === 'Critical' || deal.priority === 'High'
          ? '3px solid var(--rust)' : '3px solid transparent',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
      >
        {/* Name */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {deal.deal_name || deal.company || '—'}
        </div>
        {/* Address */}
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 7 }}>
          {deal.address || '—'}
          {deal.building_sf && (
            <span style={{ fontFamily: 'var(--font-mono)' }}> · {fmt(deal.building_sf)} SF</span>
          )}
        </div>

        {/* Investor metrics row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 10,
        }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {deal.deal_value ? fmtM(deal.deal_value) : '—'}
          </span>
          <span style={{ color: 'var(--green)', fontWeight: 500 }}>
            {goingInCap || '—'}
          </span>
        </div>

        {/* Second metrics row: IRR + basis */}
        {(targetIrr || basisPSF) && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 10, marginTop: 3,
          }}>
            <span style={{ color: 'var(--green)', fontWeight: 500 }}>
              {targetIrr || ''}
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>
              {basisPSF || ''}
            </span>
          </div>
        )}

        {/* Strategy tag */}
        {strategy && (
          <div style={{ marginTop: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
              background: stratColors.bg, color: stratColors.color,
              border: `1px solid ${stratColors.border}`,
            }}>
              {strategy}
            </span>
          </div>
        )}

        {/* Date / status line */}
        <div style={{
          fontSize: 9, color: 'var(--text-tertiary)', marginTop: 5,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>
            {deal.target_close_date
              ? `Close ${new Date(deal.target_close_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
              : ''
            }
          </span>
          {deal.close_probability != null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
              {deal.close_probability}% prob
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── TABLE VIEW ───────────────────────────────────────────────
function TableView({ deals }) {
  return (
    <div style={{
      overflowX: 'auto', borderRadius: 12,
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse', background: '#FAFAF8',
        fontSize: 13, minWidth: 1200,
      }}>
        <thead>
          <tr>
            {['Name / Address', 'Stage', 'Strategy', 'SF', 'Acq Price', 'Basis $/SF', 'Going-In Cap', 'Target IRR', 'Equity Req', 'Probability', 'Target Close'].map(h => (
              <th key={h} style={{
                background: 'rgba(0,0,0,0.025)', fontFamily: 'var(--font-mono)',
                fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: '#78726A',
                textTransform: 'uppercase', padding: '11px 14px', textAlign: 'left',
                borderBottom: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.length === 0 ? (
            <tr>
              <td colSpan={11} style={{ padding: 40, textAlign: 'center', color: '#78726A' }}>
                No acquisitions yet. Click + New Acquisition to get started.
              </td>
            </tr>
          ) : deals.map(d => (
            <tr key={d.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer' }}>
              <td style={{ padding: '10px 14px' }}>
                <Link href={`/deals/${d.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                    {d.deal_name || d.company || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {d.address || '—'}
                  </div>
                </Link>
              </td>
              <td>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                  background: 'rgba(78,110,150,0.08)', color: STAGE_COLORS[d.stage] || 'var(--blue)',
                  border: `1px solid rgba(78,110,150,0.2)`,
                }}>
                  {d.stage || '—'}
                </span>
              </td>
              <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {d.strategy_type || d.deal_type || '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {d.building_sf ? fmt(d.building_sf) : '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500 }}>
                {d.deal_value ? fmtM(d.deal_value) : '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {d.deal_value && d.building_sf ? fmtPSF(Number(d.deal_value) / Number(d.building_sf)) : '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                {d.going_in_cap ? fmtPct(d.going_in_cap) : '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                {d.target_irr ? fmtPct(d.target_irr) : '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {d.equity_required ? fmtM(d.equity_required) : '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {d.close_probability != null ? `${d.close_probability}%` : '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                {d.target_close_date
                  ? new Date(d.target_close_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
