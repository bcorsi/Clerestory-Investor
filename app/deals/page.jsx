'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import SlideDrawer from '@/components/SlideDrawer';
import Link from 'next/link';

// ── CONSTANTS ─────────────────────────────────────────────
const STAGES = [
  { key: 'Tracking',            color: 'var(--text-tertiary)', bg: 'rgba(0,0,0,0.04)',    short: 'Tracking' },
  { key: 'Underwriting',        color: 'var(--blue)',          bg: 'var(--blue-bg)',       short: 'UW' },
  { key: 'Off-Market Outreach', color: 'var(--blue)',          bg: 'var(--blue-bg)',       short: 'Off-Mkt' },
  { key: 'Marketing',           color: 'var(--purple)',        bg: 'var(--purple-bg)',     short: 'Marketing' },
  { key: 'LOI',                 color: 'var(--amber)',         bg: 'var(--amber-bg)',      short: 'LOI' },
  { key: 'LOI Accepted',        color: 'var(--amber)',         bg: 'var(--amber-bg)',      short: 'Accepted' },
  { key: 'PSA Negotiation',     color: 'var(--amber)',         bg: 'var(--amber-bg)',      short: 'PSA' },
  { key: 'Due Diligence',       color: 'var(--green)',         bg: 'var(--green-bg)',      short: 'DD' },
  { key: 'Non-Contingent',      color: 'var(--green)',         bg: 'var(--green-bg)',      short: 'Non-Cont' },
  { key: 'Closed Won',          color: 'var(--green)',         bg: 'var(--green-bg)',      short: 'Closed' },
  { key: 'Closed Lost',         color: 'var(--rust)',          bg: 'var(--rust-bg)',       short: 'Lost' },
  { key: 'Dead',                color: 'var(--text-tertiary)', bg: 'rgba(0,0,0,0.04)',    short: 'Dead' },
];

const COMMISSION_STAGES = ['LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won'];
const ACTIVE_STAGES = STAGES.filter(s => !['Closed Won','Closed Lost','Dead'].includes(s.key));

function stageConfig(stage) {
  return STAGES.find(s => s.key === stage) || { color: 'var(--text-tertiary)', bg: 'rgba(0,0,0,0.04)', short: stage };
}
function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtM(n) { return n != null ? `$${(Number(n)/1000000).toFixed(2)}M` : null; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── CARD COMPONENTS ───────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, action, actionHref }) {
  return (
    <div style={{
      background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)',
      padding: '10px 18px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', minHeight: 38,
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>
        {title}
      </span>
      {action && actionHref && (
        <Link href={actionHref} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', color: 'var(--blue)', textDecoration: 'none' }}>
          {action}
        </Link>
      )}
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────
export default function DealsPage() {
  const [deals, setDeals]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedId, setSelectedId]   = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [view, setView]               = useState('pipeline');
  const [stageFilter, setStageFilter] = useState('active');
  const [search, setSearch]           = useState('');

  useEffect(() => { loadDeals(); }, [stageFilter, search]);

  async function loadDeals() {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('deals')
        .select('id, name, stage, asking_price, commission_est, size_sf, address, city, tenant, created_at, updated_at, property_id, close_date, deal_type, notes')
        .order('updated_at', { ascending: false });

      if (stageFilter === 'active') {
        query = query.not('stage', 'in', '("Closed Won","Closed Lost","Dead")');
      } else if (stageFilter === 'closed') {
        query = query.in('stage', ['Closed Won', 'Closed Lost']);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,tenant.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDeals(data || []);
    } catch (e) {
      console.error('Deals load error:', e);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }

  const dealsByStage = STAGES.reduce((acc, s) => {
    acc[s.key] = deals.filter(d => d.stage === s.key);
    return acc;
  }, {});

  const totalValue = deals.filter(d => d.asking_price).reduce((s, d) => s + Number(d.asking_price), 0);
  const totalCommission = deals.filter(d => COMMISSION_STAGES.includes(d.stage) && d.commission_est).reduce((s, d) => s + Number(d.commission_est), 0);
  const activeCount = deals.filter(d => !['Closed Won','Closed Lost','Dead'].includes(d.stage)).length;

  function handleSelect(deal) {
    setSelectedId(deal.id);
    setSelectedDeal(deal);
  }

  return (
    <div>
      {/* Header */}
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Deal Pipeline</h1>
          <p className="cl-page-subtitle">
            {loading ? 'Loading…' : `${activeCount} active deal${activeCount !== 1 ? 's' : ''}${totalValue > 0 ? ` · ${fmtM(totalValue)} total value` : ''}`}
          </p>
        </div>
        <div className="cl-page-actions">
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)', padding: 3 }}>
            {[{k:'pipeline',l:'⬛ Pipeline'},{k:'list',l:'☰ List'}].map(v => (
              <button key={v.k} onClick={() => setView(v.k)} style={{
                padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 500,
                border: 'none', cursor: 'pointer',
                background: view === v.k ? 'white' : 'transparent',
                color: view === v.k ? 'var(--blue)' : 'var(--text-tertiary)',
                boxShadow: view === v.k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 150ms ease',
              }}>
                {v.l}
              </button>
            ))}
          </div>
          <button className="cl-btn cl-btn-primary cl-btn-sm">+ New Deal</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active Deals', value: fmt(activeCount) },
          { label: 'Pipeline Value', value: totalValue > 0 ? fmtM(totalValue) : '—', small: true },
          { label: 'Commission Tracked', value: totalCommission > 0 ? fmtM(totalCommission) : '—', small: true, color: 'var(--green)' },
          { label: 'In Due Diligence+', value: fmt(deals.filter(d => ['Due Diligence','Non-Contingent','Closed Won'].includes(d.stage)).length), color: 'var(--amber)' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '8px 16px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#78726A' }}>{kpi.label}</span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: kpi.small ? 24 : 36, fontWeight: 700, color: kpi.color || 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {kpi.value}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="cl-filter-bar">
        <input
          className="cl-search-input"
          placeholder="Search deals…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <div className="cl-tabs" style={{ margin: 0, border: 'none' }}>
          {[{k:'active',l:'Active'},{k:'all',l:'All'},{k:'closed',l:'Closed'}].map(f => (
            <button key={f.k} className={`cl-tab ${stageFilter === f.k ? 'cl-tab--active' : ''}`}
              onClick={() => setStageFilter(f.k)} style={{ padding: '6px 12px' }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── PIPELINE VIEW ── */}
      {view === 'pipeline' && (
        <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
          {loading ? (
            <div className="cl-loading"><div className="cl-spinner" />Loading deals…</div>
          ) : (
            <div style={{ display: 'flex', gap: 12, minWidth: 'max-content', alignItems: 'flex-start', paddingTop: 4 }}>
              {ACTIVE_STAGES.map(stage => {
                const stageDeals = dealsByStage[stage.key] || [];
                return (
                  <div key={stage.key} style={{ width: 224, flexShrink: 0 }}>
                    {/* Column header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        {stage.key}
                      </span>
                      {stageDeals.length > 0 && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, background: stage.bg, color: stage.color, padding: '1px 6px', borderRadius: 'var(--radius-pill)' }}>
                          {stageDeals.length}
                        </span>
                      )}
                    </div>
                    {/* Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                      {stageDeals.map(deal => (
                        <DealCard key={deal.id} deal={deal} selected={selectedId === deal.id} onClick={() => handleSelect(deal)} />
                      ))}
                      {stageDeals.length === 0 && (
                        <div style={{ border: '1.5px dashed rgba(0,0,0,0.08)', borderRadius: 'var(--radius-md)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(0,0,0,0.18)' }}>EMPTY</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Deal Name</th>
                <th>Stage</th>
                <th>Type</th>
                <th>Size</th>
                <th>Value</th>
                <th>Commission</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="cl-loading"><div className="cl-spinner" />Loading…</div></td></tr>
              ) : deals.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="cl-empty">
                    <div className="cl-empty-label">No deals found</div>
                    <div className="cl-empty-sub">Create your first deal to start tracking</div>
                  </div>
                </td></tr>
              ) : deals.map(deal => {
                const sc = stageConfig(deal.stage);
                const showComm = COMMISSION_STAGES.includes(deal.stage);
                return (
                  <tr key={deal.id} onClick={() => handleSelect(deal)}
                    style={{ background: selectedId === deal.id ? 'rgba(78,110,150,0.05)' : undefined }}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{deal.name}</div>
                      {deal.address && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{deal.address}{deal.city ? `, ${deal.city}` : ''}</div>}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '3px 7px', borderRadius: 'var(--radius-pill)', background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                        {deal.stage}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{deal.deal_type || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {deal.size_sf ? `${fmt(deal.size_sf)} SF` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{deal.asking_price ? fmtM(deal.asking_price) : '—'}</td>
                    <td>
                      {showComm && deal.commission_est ? (
                        <span className="cl-commission">{fmtM(deal.commission_est)}</span>
                      ) : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {fmtDate(deal.updated_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide Drawer */}
      <SlideDrawer
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setSelectedDeal(null); }}
        fullPageHref={selectedId ? `/deals/${selectedId}` : undefined}
        title={selectedDeal?.name || ''}
        subtitle={selectedDeal ? [selectedDeal.address, selectedDeal.city].filter(Boolean).join(' · ') : ''}
        badge={selectedDeal?.stage ? { label: selectedDeal.stage, color: 'blue' } : undefined}
      >
        {selectedId && <DealDetail deal={selectedDeal} id={selectedId} onRefresh={loadDeals} />}
      </SlideDrawer>
    </div>
  );
}

// ── DEAL CARD (kanban) ────────────────────────────────────
function DealCard({ deal, selected, onClick }) {
  const sc = stageConfig(deal.stage);
  const showComm = COMMISSION_STAGES.includes(deal.stage);

  return (
    <div onClick={onClick} style={{
      background: selected ? 'rgba(78,110,150,0.06)' : '#FAFAF8',
      border: `1px solid ${selected ? 'rgba(78,110,150,0.25)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 'var(--radius-md)', padding: '12px 14px',
      cursor: 'pointer', boxShadow: selected ? '0 2px 8px rgba(78,110,150,0.12)' : '0 2px 6px rgba(0,0,0,0.06)',
      transition: 'all 150ms ease',
    }}
    onMouseEnter={e => { if (!selected) e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)'; }}
    onMouseLeave={e => { if (!selected) e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'; }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, lineHeight: 1.3, color: 'var(--text-primary)' }}>
        {deal.name}
      </div>
      {(deal.address || deal.city) && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 8, letterSpacing: '0.03em' }}>
          {deal.city || deal.address}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        {deal.asking_price && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
            {fmtM(deal.asking_price)}
          </span>
        )}
        {showComm && deal.commission_est && (
          <span className="cl-commission" style={{ fontSize: 9 }}>
            {fmtM(deal.commission_est)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── DEAL DETAIL (inside drawer) ───────────────────────────
function DealDetail({ deal, id, onRefresh }) {
  const [full, setFull]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [comps, setComps]         = useState([]);

  const TABS = ['overview','timeline','contacts','comps','files'];

  useEffect(() => { if (id) loadDeal(id); }, [id]);

  async function loadDeal(dealId) {
    setLoading(true);
    try {
      const supabase = createClient();
      const [
        { data: dealData },
        { data: actData },
        { data: ctctData },
      ] = await Promise.all([
        supabase.from('deals').select('*').eq('id', dealId).single(),
        supabase.from('activities').select('*').eq('deal_id', dealId).order('created_at', { ascending: false }).limit(20),
        supabase.from('deal_contacts').select('contact_id, role, contacts(id, first_name, last_name, title, phone, email)').eq('deal_id', dealId),
      ]);
      setFull(dealData);
      setActivities(actData || []);
      setContacts(ctctData || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  const d = full || deal;
  if (loading) return <div className="cl-loading"><div className="cl-spinner" />Loading deal…</div>;
  if (!d) return <div className="cl-empty"><div className="cl-empty-label">Deal not found</div></div>;

  const sc = stageConfig(d.stage);
  const showComm = COMMISSION_STAGES.includes(d.stage);

  return (
    <div>
      {/* Stage track */}
      <div className="cl-stage-track" style={{ marginBottom: 20 }}>
        {STAGES.slice(0, 10).map((s, i) => {
          const stageIdx = STAGES.findIndex(x => x.key === d.stage);
          const thisIdx = i;
          const isDone   = thisIdx < stageIdx;
          const isActive = thisIdx === stageIdx;
          return (
            <div key={s.key} className={`cl-stage-step ${isActive ? 'cl-stage-step--active' : isDone ? 'cl-stage-step--done' : ''}`}>
              <span className="cl-stage-label">{s.short}</span>
              {i < 9 && <span className="cl-stage-arrow" />}
            </div>
          );
        })}
      </div>

      {/* KPI mini strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'TYPE',       value: d.deal_type || '—' },
          { label: 'SIZE',       value: d.size_sf ? `${fmt(d.size_sf)} SF` : '—' },
          { label: 'VALUE',      value: d.asking_price ? fmtM(d.asking_price) : '—' },
          { label: 'COMMISSION', value: showComm && d.commission_est ? fmtM(d.commission_est) : '—', color: showComm ? 'var(--green)' : undefined },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'rgba(0,0,0,0.025)', borderRadius: 'var(--radius-md)', padding: '10px 12px', border: '1px solid var(--card-border)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: kpi.color || 'var(--text-primary)' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['Log Call','Log Email','Add Note','+ Task'].map(a => (
          <button key={a} className="cl-btn cl-btn-secondary cl-btn-sm">{a}</button>
        ))}
      </div>

      {/* Tabs */}
      <div className="cl-tabs">
        {TABS.map(tab => (
          <button key={tab} className={`cl-tab ${activeTab === tab ? 'cl-tab--active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Property info */}
          {d.address && (
            <div className="cl-card" style={{ padding: '14px 16px' }}>
              <div className="cl-card-title" style={{ marginBottom: 10 }}>PROPERTY</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{d.address}</div>
              {d.city && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{d.city}</div>}
              {d.tenant && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Tenant: {d.tenant}</div>}
            </div>
          )}
          {/* Notes */}
          {d.notes && (
            <div className="cl-card" style={{ padding: '14px 16px' }}>
              <div className="cl-card-title" style={{ marginBottom: 8 }}>NOTES</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{d.notes}</p>
            </div>
          )}
          {/* Underwriting placeholder */}
          <div className="cl-card" style={{ padding: '14px 16px', borderLeft: '3px solid var(--blue3)' }}>
            <div className="cl-card-title" style={{ marginBottom: 8 }}>UNDERWRITING</div>
            <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
              {d.asking_price
                ? `Deal value ${fmtM(d.asking_price)}${d.size_sf ? ` · ${(Number(d.asking_price)/Number(d.size_sf)).toFixed(0)}/SF implied` : ''}. Run full underwriting model to analyze returns.`
                : 'No underwriting data yet. Add deal value to begin analysis.'}
            </p>
            <button className="cl-btn cl-btn-secondary cl-btn-sm">Export Excel Model</button>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div>
          {activities.length === 0 ? (
            <div className="cl-empty">
              <div className="cl-empty-label">No activity yet</div>
              <div className="cl-empty-sub">Log a call or note to start the timeline</div>
            </div>
          ) : activities.map((act, i) => (
            <div key={act.id} style={{ display: 'flex', gap: 12, paddingBottom: 16, borderLeft: '2px solid var(--card-border)', marginLeft: 8, paddingLeft: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: 'var(--blue3)', border: '2px solid var(--bg)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{act.subject || act.activity_type}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                    {new Date(act.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {act.body && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{act.body}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div>
          {contacts.length === 0 ? (
            <div className="cl-empty">
              <div className="cl-empty-label">No contacts linked</div>
              <div className="cl-empty-sub">Add contacts to this deal</div>
            </div>
          ) : contacts.map((dc, i) => {
            const c = dc.contacts;
            if (!c) return null;
            return (
              <div key={i} className="cl-card" style={{ padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue-bg)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  {(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.title}{dc.role ? ` · ${dc.role}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.phone && <a href={`tel:${c.phone}`} className="cl-btn cl-btn-ghost cl-btn-sm">📞</a>}
                  {c.email && <a href={`mailto:${c.email}`} className="cl-btn cl-btn-ghost cl-btn-sm">✉️</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'comps' && (
        <div className="cl-empty">
          <div className="cl-empty-label">No comps linked</div>
          <div className="cl-empty-sub">Link lease or sale comps to this deal</div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="cl-empty">
          <div className="cl-empty-label">No files</div>
          <div className="cl-empty-sub">Upload BOVs, PSAs, inspection reports</div>
        </div>
      )}
    </div>
  );
}
