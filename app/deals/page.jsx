'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STAGES = [
  'Tracking',
  'Underwriting',
  'Off-Market Outreach',
  'Marketing',
  'LOI',
  'LOI Accepted',
  'PSA Negotiation',
  'Due Diligence',
  'Non-Contingent',
  'Closed Won',
  'Closed Lost',
  'Dead',
];

const ACTIVE_STAGES = STAGES.filter(s => !['Closed Won','Closed Lost','Dead'].includes(s));

const COMMISSION_STAGES = new Set([
  'LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won',
]);

const STAGE_COLOR = (stage) => {
  if (['Closed Won'].includes(stage))                          return 'green';
  if (['Closed Lost','Dead'].includes(stage))                  return 'rust';
  if (['LOI Accepted','PSA Negotiation','Non-Contingent'].includes(stage)) return 'amber';
  if (['Due Diligence'].includes(stage))                       return 'purple';
  if (['LOI'].includes(stage))                                 return 'blue';
  return 'gray';
};

const PRIORITY_COLOR = { High: 'rust', Medium: 'amber', Low: 'gray' };

function fmtM(n) {
  if (!n) return '—';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function fmtSF(n) {
  if (!n) return '—';
  return Number(n).toLocaleString() + ' SF';
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const [deals, setDeals]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [stageFilter, setStage]   = useState('active');   // 'active' | stage name | 'all'
  const [search, setSearch]       = useState('');
  const [sortBy, setSortBy]       = useState('updated_at');
  const [sortDir, setSortDir]     = useState('desc');
  const [kpis, setKpis]           = useState(null);

  useEffect(() => { loadDeals(); }, [stageFilter, search, sortBy, sortDir]);

  async function loadDeals() {
    setLoading(true);
    try {
      const supabase = createClient();

      // KPIs — always load regardless of filter
      const [
        { count: totalActive },
        { data: valueData },
        { data: commData },
      ] = await Promise.all([
        supabase.from('deals').select('*', { count: 'exact', head: true })
          .not('stage', 'in', '("Closed Won","Closed Lost","Dead")'),
        supabase.from('deals').select('deal_value')
          .not('stage', 'in', '("Closed Won","Closed Lost","Dead")'),
        supabase.from('deals').select('commission_est')
          .in('stage', [...COMMISSION_STAGES]),
      ]);

      const pipeline_value = (valueData || []).reduce((a, d) => a + (d.deal_value || 0), 0);
      const commission_pipeline = (commData || []).reduce((a, d) => a + (d.commission_est || 0), 0);
      setKpis({ totalActive, pipeline_value, commission_pipeline });

      // Deals list
      let query = supabase
        .from('deals')
        .select(`
          id, deal_name, stage, deal_type, priority,
          deal_value, commission_est, probability,
          close_date, updated_at, created_at,
          address, city, building_sf,
          property_id, lead_id
        `)
        .order(sortBy, { ascending: sortDir === 'asc' });

      if (stageFilter === 'active') {
        query = query.not('stage', 'in', '("Closed Won","Closed Lost","Dead")');
      } else if (stageFilter !== 'all') {
        query = query.eq('stage', stageFilter);
      }

      if (search) {
        query = query.or(`deal_name.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      setDeals(data || []);
    } catch (err) {
      console.error('loadDeals error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = deals.filter(d => d.stage === s).length;
    return acc;
  }, {});
  const activeCount = deals.filter(d => !['Closed Won','Closed Lost','Dead'].includes(d.stage)).length;

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="cl-page">

      {/* ── PAGE HEADER ── */}
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Deal Pipeline</h1>
          <p className="cl-page-sub">
            {loading ? '...' : `${kpis?.totalActive ?? 0} active · ${fmtM(kpis?.pipeline_value)} pipeline value`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="cl-search"
            placeholder="Search deals…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <Link href="/deals/new" className="cl-btn cl-btn--primary">+ New Deal</Link>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="cl-kpi-strip" style={{ marginBottom: 20 }}>
        <div className="cl-kpi">
          <div className="cl-kpi-label">Active Deals</div>
          <div className="cl-kpi-value">{loading ? '—' : kpis?.totalActive ?? 0}</div>
        </div>
        <div className="cl-kpi">
          <div className="cl-kpi-label">Pipeline Value</div>
          <div className="cl-kpi-value" style={{ color: 'var(--blue2)' }}>
            {loading ? '—' : fmtM(kpis?.pipeline_value)}
          </div>
        </div>
        <div className="cl-kpi">
          <div className="cl-kpi-label">Commission Pipeline</div>
          <div className="cl-kpi-value" style={{ color: 'var(--green)' }}>
            {loading ? '—' : fmtM(kpis?.commission_pipeline)}
          </div>
        </div>
        <div className="cl-kpi">
          <div className="cl-kpi-label">Avg Deal Size</div>
          <div className="cl-kpi-value">
            {loading || !kpis?.totalActive ? '—'
              : fmtM((kpis.pipeline_value || 0) / (kpis.totalActive || 1))}
          </div>
        </div>
      </div>

      {/* ── STAGE PIPELINE TRACK ── */}
      <div className="cl-card" style={{ padding: '14px 16px', marginBottom: 16, overflowX: 'auto' }}>
        <div className="cl-stage-track" style={{ display: 'flex', gap: 0, minWidth: 700 }}>
          {ACTIVE_STAGES.map((s, i) => {
            const count = stageCounts[s] || 0;
            const isActive = stageFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStage(isActive ? 'active' : s)}
                className={`cl-stage-step ${isActive ? 'cl-stage-step--active' : ''}`}
                style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div className="cl-stage-label" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{s}</div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: isActive ? 'var(--blue2)' : count > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                }}>{count}</div>
                {i < ACTIVE_STAGES.length - 1 && <div className="cl-stage-arrow" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STAGE FILTER TABS ── */}
      <div className="cl-tabs" style={{ marginBottom: 12 }}>
        {[
          { key: 'active', label: `Active (${loading ? '…' : activeCount})` },
          { key: 'all',    label: 'All Deals' },
          { key: 'Closed Won',  label: `Closed Won (${stageCounts['Closed Won'] || 0})` },
          { key: 'Closed Lost', label: `Closed Lost (${stageCounts['Closed Lost'] || 0})` },
          { key: 'Dead',        label: `Dead (${stageCounts['Dead'] || 0})` },
        ].map(t => (
          <button
            key={t.key}
            className={`cl-tab ${stageFilter === t.key ? 'cl-tab--active' : ''}`}
            onClick={() => setStage(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── TABLE ── */}
      <div className="cl-table-wrap">
        <table className="cl-table">
          <thead>
            <tr>
              {[
                { key: 'deal_name',   label: 'Deal Name' },
                { key: 'stage',       label: 'Stage' },
                { key: 'deal_value',  label: 'Value' },
                { key: 'commission_est', label: 'Commission' },
                { key: 'probability', label: 'Prob.' },
                { key: 'address',     label: 'Address' },
                { key: 'building_sf', label: 'SF' },
                { key: 'close_date',  label: 'Close Date' },
                { key: 'updated_at',  label: 'Updated' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >
                  {col.label}
                  {sortBy === col.key && (
                    <span style={{ marginLeft: 4, opacity: 0.5 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>Loading…</td></tr>
            ) : deals.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No deals found</td></tr>
            ) : deals.map(deal => {
              const showComm = COMMISSION_STAGES.has(deal.stage);
              const sc = STAGE_COLOR(deal.stage);
              const daysOld = deal.updated_at
                ? Math.floor((Date.now() - new Date(deal.updated_at)) / 864e5)
                : null;
              return (
                <tr key={deal.id}>
                  <td>
                    <Link href={`/deals/${deal.id}`} className="cl-table-link" style={{ fontWeight: 600 }}>
                      {deal.deal_name || deal.address || '(untitled)'}
                    </Link>
                    {deal.deal_type && (
                      <span className="cl-badge cl-badge-gray" style={{ marginLeft: 6, fontSize: 9 }}>
                        {deal.deal_type}
                      </span>
                    )}
                    {deal.priority === 'High' && (
                      <span style={{ marginLeft: 4, color: 'var(--rust)', fontSize: 11 }}>!!</span>
                    )}
                  </td>
                  <td>
                    <span className={`cl-badge cl-badge-${sc}`}>{deal.stage}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {deal.deal_value ? fmtM(deal.deal_value) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {showComm && deal.commission_est ? (
                      <span className="cl-commission">{fmtM(deal.commission_est)}</span>
                    ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {deal.probability != null ? `${deal.probability}%` : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {deal.address || '—'}
                    {deal.city && <span style={{ color: 'var(--text-tertiary)' }}> · {deal.city}</span>}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {fmtSF(deal.building_sf)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {deal.close_date ? new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: daysOld > 14 ? 'var(--amber)' : 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {daysOld != null ? `${daysOld}d ago` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
