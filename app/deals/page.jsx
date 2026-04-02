'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const KANBAN_STAGES = [
  { key: 'Tracking',          label: 'Tracking',          color: '#4E6E96', colorBg: 'rgba(78,110,150,0.10)',  accent: 'rgba(78,110,150,0.45)' },
  { key: 'Underwriting',      label: 'Underwriting',      color: '#5838A0', colorBg: 'rgba(88,56,160,0.10)',  accent: '#5838A0' },
  { key: 'Off-Market Outreach',label: 'Off-Market',       color: '#8C5A04', colorBg: 'rgba(140,90,4,0.10)',   accent: '#8C5A04' },
  { key: 'Marketing',         label: 'Marketing',         color: '#4E6E96', colorBg: 'rgba(78,110,150,0.10)', accent: '#4E6E96' },
  { key: 'LOI',               label: 'LOI',               color: '#8C5A04', colorBg: 'rgba(140,90,4,0.10)',   accent: '#8C5A04' },
  { key: 'LOI Accepted',      label: 'LOI Accepted',      color: '#156636', colorBg: 'rgba(21,102,54,0.10)',  accent: '#156636' },
  { key: 'PSA Negotiation',   label: 'PSA / Non-Cont',    color: '#156636', colorBg: 'rgba(21,102,54,0.14)',  accent: '#156636' },
  { key: 'Due Diligence',     label: 'Due Diligence',     color: '#B83714', colorBg: 'rgba(184,55,20,0.08)',  accent: '#B83714' },
];

const CLOSED_STAGES = ['Closed Won', 'Closed Lost', 'Dead'];
const COMMISSION_STAGES = new Set(['LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won']);

function fmtM(n) {
  if (!n) return null;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n}`;
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr)) / 864e5);
}

function DaysChip({ days }) {
  if (days === null) return null;
  const style = days >= 30
    ? { background: 'rgba(184,55,20,0.08)', border: '1px solid rgba(184,55,20,0.28)', color: '#B83714' }
    : days >= 14
    ? { background: 'rgba(140,90,4,0.09)', border: '1px solid rgba(140,90,4,0.28)', color: '#8C5A04' }
    : { background: 'rgba(0,0,0,0.04)', color: '#6E6860', border: '1px solid rgba(0,0,0,0.06)' };
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em', ...style }}>
      {days}d {days >= 30 ? '⚠' : ''}
    </span>
  );
}

function ProbBar({ pct }) {
  if (!pct && pct !== 0) return null;
  const color = pct >= 70 ? '#156636' : pct >= 40 ? '#8C5A04' : '#6E6860';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: '#6E6860' }}>Probability</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width .3s' }} />
      </div>
    </div>
  );
}

// ─── DEAL CARD ────────────────────────────────────────────────────────────────

function DealCard({ deal, stageAccent, showComm }) {
  const days = daysAgo(deal.updated_at);
  const uw = deal.underwriting_inputs || {};

  const typeTag = deal.deal_type || deal.strategy;
  const TAG_STYLE = {
    'Disposition':    { bg: 'rgba(78,110,150,0.09)',  bdr: 'rgba(78,110,150,0.30)',  color: '#4E6E96' },
    'Sale Listing':   { bg: 'rgba(78,110,150,0.09)',  bdr: 'rgba(78,110,150,0.30)',  color: '#4E6E96' },
    'SLB Advisory':   { bg: 'rgba(21,102,54,0.08)',   bdr: 'rgba(21,102,54,0.28)',   color: '#156636' },
    'Sale-Leaseback': { bg: 'rgba(21,102,54,0.08)',   bdr: 'rgba(21,102,54,0.28)',   color: '#156636' },
    'Lease Rep':      { bg: 'rgba(140,90,4,0.09)',    bdr: 'rgba(140,90,4,0.28)',    color: '#8C5A04' },
    'Buyer Rep':      { bg: 'rgba(88,56,160,0.08)',   bdr: 'rgba(88,56,160,0.26)',   color: '#5838A0' },
    'Acquisition':    { bg: 'rgba(88,56,160,0.08)',   bdr: 'rgba(88,56,160,0.26)',   color: '#5838A0' },
  };
  const ts = TAG_STYLE[typeTag] || TAG_STYLE['Disposition'];

  return (
    <Link href={`/deals/${deal.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid rgba(0,0,0,0.055)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
          padding: '13px 14px',
          marginBottom: 8,
          cursor: 'pointer',
          transition: 'box-shadow .12s, transform .12s',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {/* Left accent bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: stageAccent, borderRadius: '8px 0 0 8px' }} />

        {/* Type + days */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, paddingLeft: 6 }}>
          {typeTag && (
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3, border: `1px solid ${ts.bdr}`, background: ts.bg, color: ts.color }}>
              {typeTag}
            </span>
          )}
          <DaysChip days={days} />
        </div>

        {/* Name + address */}
        <div style={{ fontSize: 13.5, fontWeight: 500, color: '#2C2822', lineHeight: 1.3, marginBottom: 3, paddingLeft: 6 }}>
          {deal.deal_name || deal.address}
        </div>
        {deal.address && deal.deal_name && (
          <div style={{ fontSize: 12, color: '#6E6860', paddingLeft: 6, marginBottom: 9,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {deal.address}{deal.submarket ? ` · ${deal.submarket}` : ''}
          </div>
        )}

        {/* Value + prob */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingLeft: 6, marginBottom: 7 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#0F0D09', lineHeight: 1, letterSpacing: '-0.01em' }}>
            {fmtM(deal.deal_value) || <span style={{ fontSize: 14, color: '#6E6860', fontFamily: 'inherit' }}>—</span>}
          </div>
          {deal.probability != null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: deal.probability >= 70 ? '#156636' : deal.probability >= 40 ? '#8C5A04' : '#6E6860' }}>
              {deal.probability}% close
            </span>
          )}
        </div>

        {/* Prob bar */}
        {deal.probability != null && <div style={{ paddingLeft: 6, marginBottom: 8 }}><ProbBar pct={deal.probability} /></div>}

        {/* Commission chip */}
        {showComm && deal.commission_est && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(21,102,54,0.08)', border: '1px solid rgba(21,102,54,0.28)', borderRadius: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#156636' }}>Comm. Est.</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#156636' }}>~{fmtM(deal.commission_est)}</span>
          </div>
        )}

        {/* Close date */}
        {deal.close_date && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6E6860', paddingLeft: 6, marginTop: 4 }}>
            Target close: {new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── KANBAN COLUMN ────────────────────────────────────────────────────────────

function KanbanCol({ stage, deals }) {
  const stageDeals = deals.filter(d => d.stage === stage.key);
  const totalVal = stageDeals.reduce((a, d) => a + (d.deal_value || 0), 0);

  return (
    <div style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column' }}>
      {/* Column header */}
      <div style={{
        padding: '10px 12px', borderRadius: '8px 8px 0 0',
        background: stage.colorBg, marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: stage.color }}>
          {stage.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalVal > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: stage.color, opacity: 0.7 }}>
              {fmtM(totalVal)}
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: 20, color: stage.color }}>
            {stageDeals.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, minHeight: 80 }}>
        {stageDeals.length === 0 ? (
          <div style={{ padding: '16px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#AFA89E', marginBottom: 5 }}>Empty</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic', color: '#AFA89E', opacity: 0.7, lineHeight: 1.6 }}>
              No deals in this stage
            </div>
          </div>
        ) : stageDeals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            stageAccent={stage.accent}
            showComm={COMMISSION_STAGES.has(deal.stage)}
          />
        ))}
      </div>

      {/* Add deal */}
      <Link href={`/deals/new?stage=${encodeURIComponent(stage.key)}`}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 38, borderRadius: 7, border: '1.5px dashed rgba(0,0,0,0.10)',
          color: '#6E6860', fontSize: 12, cursor: 'pointer',
          transition: 'all .1s', marginTop: 2,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(78,110,150,0.30)'; e.currentTarget.style.color = '#4E6E96'; e.currentTarget.style.background = 'rgba(78,110,150,0.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'; e.currentTarget.style.color = '#6E6860'; e.currentTarget.style.background = 'transparent'; }}
        >
          + Add Deal
        </div>
      </Link>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const [deals, setDeals]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [view, setView]       = useState('kanban'); // 'kanban' | 'list'
  const [kpis, setKpis]       = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: allDeals }, { data: commDeals }] = await Promise.all([
        supabase.from('deals')
          .select('id,deal_name,stage,deal_type,strategy,priority,deal_value,commission_est,probability,close_date,updated_at,created_at,address,submarket,market,notes,underwriting_inputs')
          .neq('stage','Closed Won').neq('stage','Closed Lost').neq('stage','Dead')
          .order('updated_at', { ascending: false }),
        supabase.from('deals')
          .select('commission_est,probability')
          .in('stage', [...COMMISSION_STAGES]),
      ]);

      const d = allDeals || [];
      const totalVal = d.reduce((a, x) => a + (x.deal_value || 0), 0);
      const wtdComm  = (commDeals || []).reduce((a, x) => a + ((x.commission_est || 0) * (x.probability || 0) / 100), 0);
      const loiCount = d.filter(x => ['LOI','LOI Accepted'].includes(x.stage)).length;
      const loiVal   = d.filter(x => ['LOI','LOI Accepted'].includes(x.stage)).reduce((a, x) => a + (x.deal_value || 0), 0);
      const actionNeeded = d.filter(x => {
        const days = daysAgo(x.updated_at);
        return days !== null && days >= 14;
      }).length;

      setKpis({ count: d.length, totalVal, wtdComm, loiCount, loiVal, actionNeeded });
      setDeals(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? deals.filter(d => [d.deal_name, d.address, d.submarket, d.market].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    : deals;

  return (
    <div style={{ fontFamily: "'Instrument Sans', sans-serif" }}>

      {/* ── TOP BAR ── */}
      <div style={{ height: 48, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}>
        <span style={{ fontSize: 13, color: '#6E6860' }}>Pipeline</span>
        <span style={{ color: 'rgba(0,0,0,0.25)', fontSize: 13 }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#2C2822' }}>Deal Pipeline</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 7, overflow: 'hidden' }}>
            {['kanban','list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '5px 12px', fontSize: 12, fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer', border: 'none', background: view === v ? '#4E6E96' : 'transparent', color: view === v ? '#fff' : '#6E6860', transition: 'all .1s' }}>
                {v === 'kanban' ? '⊞ Board' : '≡ List'}
              </button>
            ))}
          </div>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F4F1EC', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '7px 13px', width: 220 }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#AFA89E" strokeWidth="1.4"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5L13 13"/></svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search deals…"
              style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13, color: '#2C2822', width: '100%' }}
            />
          </div>
          <Link href="/deals/new">
            <button style={{ padding: '7px 14px', background: '#4E6E96', color: '#fff', border: 'none', borderRadius: 7, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 8px rgba(78,110,150,0.28)' }}>
              + New Deal
            </button>
          </Link>
        </div>
      </div>

      <div style={{ padding: '0 28px 60px' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ padding: '22px 0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 300, color: '#0F0D09', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Deal{' '}
              <em style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: '#6480A2', fontSize: 36, fontWeight: 400 }}>Pipeline</em>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic', color: '#6E6860', marginTop: 5 }}>
              {loading ? 'Loading…' : `${kpis?.count ?? 0} active deals · ${fmtM(kpis?.totalVal) ?? '—'} total · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </div>
          </div>
        </div>

        {/* ── KPI STRIP ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 18 }}>
          {[
            { icon: '◈', iconBg: 'rgba(78,110,150,0.09)', iconColor: '#4E6E96', val: kpis?.count ?? '—', lbl: 'Active Deals' },
            { icon: '$', iconBg: 'rgba(78,110,150,0.09)', iconColor: '#4E6E96', val: fmtM(kpis?.totalVal) ?? '—', lbl: 'Total Value' },
            { icon: '↗', iconBg: 'rgba(21,102,54,0.08)',  iconColor: '#156636', val: fmtM(kpis?.wtdComm) ?? '—', lbl: 'Wtd. Commission', green: true },
            { icon: '◉', iconBg: 'rgba(140,90,4,0.09)',   iconColor: '#8C5A04', val: kpis?.loiCount ?? '—', lbl: 'In LOI / Accepted' },
            { icon: '⏱', iconBg: 'rgba(184,55,20,0.08)',  iconColor: '#B83714', val: kpis?.actionNeeded ?? '—', lbl: 'Action Needed', rust: true },
          ].map((k, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.055)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: k.iconBg, color: k.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {k.icon}
              </div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: k.green ? '#156636' : k.rust ? '#B83714' : '#0F0D09', lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {loading ? '—' : k.val}
                </div>
                <div style={{ fontSize: 11, color: '#524D46', marginTop: 3 }}>{k.lbl}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── KANBAN ── */}
        {view === 'kanban' && (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {loading ? (
              <div style={{ padding: 40, color: '#6E6860', fontSize: 13 }}>Loading pipeline…</div>
            ) : (
              KANBAN_STAGES.map(stage => (
                <KanbanCol key={stage.key} stage={stage} deals={filtered} />
              ))
            )}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(0,0,0,0.065)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Deal Name','Stage','Value','Commission','Prob.','Address','Close Date','Updated'].map(h => (
                    <th key={h} style={{ background: 'rgba(0,0,0,0.025)', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: '#6E6860', textTransform: 'uppercase', padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.065)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6E6860', fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontStyle: 'italic' }}>No active deals in the pipeline.</td></tr>
                ) : filtered.map(deal => {
                  const showComm = COMMISSION_STAGES.has(deal.stage);
                  const stage = KANBAN_STAGES.find(s => s.key === deal.stage);
                  const days = daysAgo(deal.updated_at);
                  return (
                    <tr key={deal.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', transition: 'background .1s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,110,150,0.025)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '11px 14px' }}>
                        <Link href={`/deals/${deal.id}`} style={{ fontWeight: 600, color: '#4E6E96', textDecoration: 'none', fontSize: 13 }}>
                          {deal.deal_name || deal.address || '(untitled)'}
                        </Link>
                        {deal.deal_type && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'rgba(78,110,150,0.09)', color: '#4E6E96', border: '1px solid rgba(78,110,150,0.2)' }}>{deal.deal_type}</span>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {stage && <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: stage.colorBg, color: stage.color }}>{deal.stage}</span>}
                      </td>
                      <td style={{ padding: '11px 14px', fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: '#0F0D09' }}>{fmtM(deal.deal_value) || '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {showComm && deal.commission_est
                          ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#156636', background: 'rgba(21,102,54,0.08)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(21,102,54,0.18)' }}>{fmtM(deal.commission_est)}</span>
                          : <span style={{ color: '#AFA89E' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: deal.probability >= 70 ? '#156636' : deal.probability >= 40 ? '#8C5A04' : '#6E6860' }}>
                        {deal.probability != null ? `${deal.probability}%` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#6E6860', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.address || '—'}{deal.submarket ? <span style={{ color: '#AFA89E' }}> · {deal.submarket}</span> : ''}
                      </td>
                      <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6E6860' }}>
                        {deal.close_date ? new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: days >= 14 ? '#8C5A04' : '#AFA89E' }}>
                        {days !== null ? `${days}d ago` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
