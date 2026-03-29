'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

// ─── HELPERS ──────────────────────────────────────────────
function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtM(n) { return n != null ? `$${(Number(n)/1000000).toFixed(1)}M` : '—'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const HOUR = new Date().getHours();
const IS_MORNING = HOUR >= 5 && HOUR < 17;

const DEAL_STAGES = [
  'Tracking','Underwriting','Off-Market Outreach','Marketing',
  'LOI','LOI Accepted','PSA Negotiation','Due Diligence',
  'Non-Contingent','Closed Won',
];

// ─── PAGE ─────────────────────────────────────────────────
export default function CommandCenter() {
  const [brief, setBrief]           = useState(IS_MORNING ? 'morning' : 'evening');
  const [kpis, setKpis]             = useState(null);
  const [pipeline, setPipeline]     = useState([]);
  const [tasks, setTasks]           = useState([]);
  const [hotLeads, setHotLeads]     = useState([]);
  const [catalysts, setCatalysts]   = useState([]);
  const [warnAlerts, setWarnAlerts] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const [
        { count: propCount },
        { count: leadCount },
        { count: dealCount },
        { data: dealData },
        { data: taskData },
        { data: leadData },
        { data: catalystData },
        { data: warnData },
      ] = await Promise.all([
        supabase.from('properties').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('deals').select('*', { count: 'exact', head: true }).not('stage', 'in', '("Closed Won","Closed Lost","Dead")'),
        supabase.from('deals')
          .select('id, name, stage, asking_price, commission_est, property_id, updated_at')
          .not('stage', 'in', '("Closed Won","Closed Lost","Dead")')
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase.from('tasks')
          .select('id, title, due_date, priority, status, property_id, lead_id, deal_id')
          .neq('status', 'done')
          .lte('due_date', tomorrow)
          .order('due_date', { ascending: true })
          .limit(8),
        supabase.from('leads')
          .select('id, company_name, score, status, catalyst_tags, property_id, updated_at')
          .eq('status', 'active')
          .order('score', { ascending: false, nullsFirst: false })
          .limit(6),
        supabase.from('properties')
          .select('id, address, city, catalyst_tags, score')
          .not('catalyst_tags', 'eq', '[]')
          .not('catalyst_tags', 'is', null)
          .order('score', { ascending: false, nullsFirst: false })
          .limit(5),
        supabase.from('warn_notices')
          .select('id, company_name, city, layoff_count, notice_date, lead_created')
          .order('notice_date', { ascending: false })
          .limit(4),
      ]);

      setKpis({
        properties: propCount || 0,
        activeLeads: leadCount || 0,
        activeDeals: dealCount || 0,
      });
      setPipeline(dealData || []);
      setTasks(taskData || []);
      setHotLeads(leadData || []);
      setCatalysts(catalystData || []);
      setWarnAlerts(warnData || []);
    } catch (e) {
      console.error('Command Center load error:', e);
    } finally {
      setLoading(false);
    }
  }

  // Stage counts for pipeline strip
  const stageCounts = DEAL_STAGES.reduce((acc, s) => {
    acc[s] = pipeline.filter(d => d.stage === s).length;
    return acc;
  }, {});

  const overdueCount = tasks.filter(t => t.due_date < new Date().toISOString().split('T')[0]).length;
  const todayCount   = tasks.filter(t => t.due_date === new Date().toISOString().split('T')[0]).length;

  return (
    <div>
      {/* ── GREETING ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            {HOUR < 12 ? 'Good morning' : HOUR < 17 ? 'Good afternoon' : 'Good evening'}, Briana.
          </h1>

          {/* Morning / Evening toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-pill)', padding: 3 }}>
            <button
              onClick={() => setBrief('morning')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 11,
                fontFamily: 'var(--font-ui)',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: brief === 'morning' ? 'white' : 'transparent',
                color: brief === 'morning' ? 'var(--blue)' : 'var(--text-tertiary)',
                boxShadow: brief === 'morning' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 150ms ease',
              }}
            >
              ☀️ Morning Brief
            </button>
            <button
              onClick={() => setBrief('evening')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 11,
                fontFamily: 'var(--font-ui)',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: brief === 'evening' ? 'white' : 'transparent',
                color: brief === 'evening' ? 'var(--purple)' : 'var(--text-tertiary)',
                boxShadow: brief === 'evening' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 150ms ease',
              }}
            >
              🌙 Evening Recap
            </button>
          </div>
        </div>

        <p style={{
          fontFamily: 'var(--font-editorial)',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'var(--text-secondary)',
        }}>
          {brief === 'morning'
            ? `You have ${overdueCount > 0 ? `${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} and ` : ''}${todayCount} task${todayCount !== 1 ? 's' : ''} due today.${warnAlerts.length > 0 ? ` ${warnAlerts.length} new WARN filings overnight.` : ''}`
            : `${pipeline.length} active deal${pipeline.length !== 1 ? 's' : ''} in pipeline.${hotLeads.length > 0 ? ` ${hotLeads.length} hot leads to follow up on.` : ''} Review your day before signing off.`
          }
        </p>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="cl-kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: 24 }}>
        <KpiCard label="Properties" value={loading ? '…' : fmt(kpis?.properties)} href="/properties" />
        <KpiCard label="Active Leads" value={loading ? '…' : fmt(kpis?.activeLeads)} href="/leads" color="var(--amber)" />
        <KpiCard label="Active Deals" value={loading ? '…' : fmt(kpis?.activeDeals)} href="/deals" color="var(--blue)" />
        <KpiCard label="Tasks Due" value={loading ? '…' : fmt(todayCount + overdueCount)} href="/tasks" color={overdueCount > 0 ? 'var(--rust)' : undefined} />
        <KpiCard label="WARN Alerts" value={loading ? '…' : fmt(warnAlerts.length)} href="/warn-intel" color="var(--purple)" />
      </div>

      {/* ── PIPELINE STRIP ── */}
      <div className="cl-card" style={{ marginBottom: 20, padding: '14px 18px' }}>
        <div className="cl-card-header" style={{ marginBottom: 12 }}>
          <span className="cl-card-title">DEAL PIPELINE</span>
          <Link href="/deals" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--blue)', letterSpacing: '0.06em' }}>
            VIEW ALL →
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {DEAL_STAGES.slice(0, 8).map(stage => {
            const count = stageCounts[stage] || 0;
            const isActive = count > 0;
            return (
              <div key={stage} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, flexShrink: 0,
              }}>
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--blue-bg)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isActive ? 'rgba(78,110,150,0.2)' : 'var(--card-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 15, fontWeight: 700,
                  color: isActive ? 'var(--blue)' : 'var(--text-tertiary)',
                }}>
                  {count}
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8,
                  color: isActive ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  letterSpacing: '0.04em', textAlign: 'center',
                  maxWidth: 52, lineHeight: 1.3,
                }}>
                  {stage.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3-COLUMN BODY ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 16,
        marginBottom: 20,
      }}>
        {/* Tasks */}
        <div className="cl-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="cl-card-title">TASKS</span>
            <Link href="/tasks" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--blue)', letterSpacing: '0.06em' }}>ALL →</Link>
          </div>
          {loading ? <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div> :
            tasks.length === 0 ? (
              <div className="cl-empty" style={{ padding: '24px 16px' }}>
                <div className="cl-empty-label">No tasks due</div>
                <div className="cl-empty-sub">Clear schedule today</div>
              </div>
            ) : (
              <div>
                {tasks.map(task => {
                  const overdue = task.due_date < new Date().toISOString().split('T')[0];
                  const today   = task.due_date === new Date().toISOString().split('T')[0];
                  return (
                    <div key={task.id} style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid rgba(0,0,0,0.04)',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                        background: overdue ? 'var(--rust)' : today ? 'var(--amber)' : 'var(--blue3)',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {task.title}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: overdue ? 'var(--rust)' : 'var(--text-tertiary)' }}>
                          {overdue ? '⚠ OVERDUE · ' : ''}{fmtDate(task.due_date)}
                        </div>
                      </div>
                      {task.priority === 'high' && (
                        <span className="cl-badge cl-badge-rust" style={{ fontSize: 8 }}>!</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        {/* Pipeline deals */}
        <div className="cl-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="cl-card-title">ACTIVE DEALS</span>
            <Link href="/deals" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--blue)', letterSpacing: '0.06em' }}>ALL →</Link>
          </div>
          {loading ? <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div> :
            pipeline.length === 0 ? (
              <div className="cl-empty" style={{ padding: '24px 16px' }}>
                <div className="cl-empty-label">No active deals</div>
                <div className="cl-empty-sub">Convert a lead to start a deal</div>
              </div>
            ) : (
              <div>
                {pipeline.slice(0, 6).map(deal => (
                  <Link key={deal.id} href={`/deals/${deal.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{
                      padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)',
                      transition: 'background 120ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,110,150,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="cl-badge cl-badge-blue" style={{ fontSize: 8 }}>{deal.stage}</span>
                        {deal.commission_est && (
                          <span className="cl-commission" style={{ fontSize: 9 }}>
                            {fmtM(deal.commission_est)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          }
        </div>

        {/* Hot Leads */}
        <div className="cl-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="cl-card-title">HOT LEADS</span>
            <Link href="/leads" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--blue)', letterSpacing: '0.06em' }}>ALL →</Link>
          </div>
          {loading ? <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div> :
            hotLeads.length === 0 ? (
              <div className="cl-empty" style={{ padding: '24px 16px' }}>
                <div className="cl-empty-label">No active leads</div>
                <div className="cl-empty-sub">Import properties to generate leads</div>
              </div>
            ) : (
              <div>
                {hotLeads.map(lead => {
                  const tags = Array.isArray(lead.catalyst_tags) ? lead.catalyst_tags.slice(0, 2) : [];
                  return (
                    <Link key={lead.id} href={`/leads/${lead.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                      <div style={{
                        padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,110,150,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Mini score */}
                        {lead.score != null && (
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: lead.score >= 75 ? 'var(--rust-bg)' : lead.score >= 50 ? 'var(--amber-bg)' : 'var(--blue-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                            color: lead.score >= 75 ? 'var(--rust)' : lead.score >= 50 ? 'var(--amber)' : 'var(--blue)',
                            flexShrink: 0,
                          }}>
                            {lead.score}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                            {lead.company_name || 'Unnamed Lead'}
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {tags.map((tag, i) => {
                              const cat = typeof tag === 'object' ? tag.category : 'asset';
                              const lbl = typeof tag === 'object' ? tag.tag : tag;
                              return <span key={i} className={`cl-catalyst cl-catalyst--${cat}`} style={{ fontSize: 8 }}>{lbl}</span>;
                            })}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* ── THIS WEEK SECTION ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.12em', color: 'var(--text-tertiary)',
          marginBottom: 12, paddingBottom: 8,
          borderBottom: '1px solid var(--card-border)',
        }}>
          THIS WEEK
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Catalyst Alerts */}
          <div className="cl-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between' }}>
              <span className="cl-card-title">⚡ CATALYST ALERTS</span>
              <Link href="/properties" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--blue)', letterSpacing: '0.06em' }}>ALL →</Link>
            </div>
            {loading ? <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div> :
              catalysts.length === 0 ? (
                <div className="cl-empty" style={{ padding: '20px 16px' }}>
                  <div className="cl-empty-label">No catalyst alerts</div>
                </div>
              ) : (
                <div>
                  {catalysts.map(prop => {
                    const tags = Array.isArray(prop.catalyst_tags) ? prop.catalyst_tags : [];
                    const highPriority = tags.some(t => (typeof t === 'object' ? t.priority : null) === 'high');
                    return (
                      <div key={prop.id} style={{
                        padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}>
                        <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>
                          {highPriority ? '🔴' : '🟠'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                            {prop.address}
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {tags.slice(0, 3).map((tag, i) => {
                              const cat = typeof tag === 'object' ? tag.category : 'asset';
                              const lbl = typeof tag === 'object' ? tag.tag : tag;
                              return <span key={i} className={`cl-catalyst cl-catalyst--${cat}`} style={{ fontSize: 8 }}>{lbl}</span>;
                            })}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                          {prop.city}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>

          {/* WARN Feed */}
          <div className="cl-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between' }}>
              <span className="cl-card-title">WARN INTEL</span>
              <Link href="/warn-intel" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--blue)', letterSpacing: '0.06em' }}>ALL →</Link>
            </div>
            {loading ? <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div> :
              warnAlerts.length === 0 ? (
                <div className="cl-empty" style={{ padding: '20px 16px' }}>
                  <div className="cl-empty-label">No recent WARN filings</div>
                  <div className="cl-empty-sub">Auto-sync runs daily at 6am</div>
                </div>
              ) : (
                <div>
                  {warnAlerts.map(w => (
                    <div key={w.id} style={{
                      padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}>
                      <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>⚡</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                          {w.company_name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>
                          {w.city} · {w.layoff_count ? `${fmt(w.layoff_count)} workers` : 'layoff'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>
                          {fmtDate(w.notice_date)}
                        </span>
                        {!w.lead_created && (
                          <span className="cl-badge cl-badge-amber" style={{ fontSize: 8 }}>NEW</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </div>

      {/* ── NEWS FEED ── */}
      <div style={{ marginTop: 20 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.12em', color: 'var(--text-tertiary)',
          marginBottom: 12, paddingBottom: 8,
          borderBottom: '1px solid var(--card-border)',
        }}>
          SOCAL INDUSTRIAL NEWS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {[
            { title: 'IE West vacancy climbs to 9.2% as new supply hits market', source: 'CoStar', time: '2h ago', tag: 'Market' },
            { title: 'Rexford announces $130M in dispositions for FY2026', source: 'Bloomberg', time: '4h ago', tag: 'REIT' },
            { title: 'BESS developers accelerate Long Beach land acquisitions near SCE substations', source: 'LADWP Report', time: '1d ago', tag: 'BESS' },
            { title: 'Tesla Semi charging depots expanding into SGV industrial corridor', source: 'Reuters', time: '2d ago', tag: 'EV' },
          ].map((article, i) => (
            <div key={i} className="cl-card" style={{ padding: '14px 16px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--card-shadow)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span className="cl-badge cl-badge-blue" style={{ fontSize: 8 }}>{article.tag}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                  {article.source} · {article.time}
                </span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {article.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────
function KpiCard({ label, value, href, color }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="cl-kpi" style={{ cursor: 'pointer', transition: 'box-shadow 150ms ease' }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--card-shadow)'}
      >
        <div className="cl-kpi-label">{label}</div>
        <div className="cl-kpi-value" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      </div>
    </Link>
  );
}
