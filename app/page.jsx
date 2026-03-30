'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtM(n) { return n != null ? `$${(Number(n)/1000000).toFixed(1)}M` : null; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DEAL_STAGES = ['Tracking','Underwriting','Off-Market Outreach','Marketing','LOI','LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won'];

// ── SF LIGHTNING CARD COMPONENTS ──────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: '#FAFAF8',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 12,
      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, action, actionHref }) {
  return (
    <div style={{
      background: '#EDE8E0',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      padding: '10px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 38,
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#78726A',
      }}>
        {title}
      </span>
      {action && (
        <Link href={actionHref || '#'} style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.08em',
          color: 'var(--blue)',
          textDecoration: 'none',
        }}>
          {action}
        </Link>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────
export default function CommandCenter() {
  const hour = new Date().getHours();
  const [brief, setBrief] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('cl_brief') || (hour >= 5 && hour < 17 ? 'morning' : 'evening');
  }
  return hour >= 5 && hour < 17 ? 'morning' : 'evening';
});
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [hotLeads, setHotLeads] = useState([]);
  const [catalysts, setCatalysts] = useState([]);
  const [warnAlerts, setWarnAlerts] = useState([]);

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
        supabase.from('deals').select('id,deal_name,stage,deal_value,commission_est,updated_at').not('stage', 'in', '("Closed Won","Closed Lost","Dead")').order('updated_at', { ascending: false }).limit(6),
        supabase.from('tasks').select('id,title,due_date,priority,status').neq('status','done').lte('due_date', tomorrow).order('due_date', { ascending: true }).limit(6),
        supabase.from('leads').select('id,company_name,score,catalyst_tags').eq('status','active').order('score', { ascending: false, nullsFirst: false }).limit(5),
        supabase.from('properties').select('id,address,city,catalyst_tags,score').not('catalyst_tags','eq','[]').not('catalyst_tags','is',null).order('score', { ascending: false, nullsFirst: false }).limit(4),
        supabase.from('warn_notices').select('id,company_name,city,layoff_count,notice_date,lead_created').order('notice_date', { ascending: false }).limit(4),
      ]);

      setKpis({ properties: propCount||0, activeLeads: leadCount||0, activeDeals: dealCount||0 });
      setPipeline(dealData||[]);
      setTasks(taskData||[]);
      setHotLeads(leadData||[]);
      setCatalysts(catalystData||[]);
      setWarnAlerts(warnData||[]);
    } catch(e) {
      console.error('Command Center error:', e);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter(t => t.due_date < today).length;
  const todayCount   = tasks.filter(t => t.due_date === today).length;
  const stageCounts  = DEAL_STAGES.reduce((acc, s) => { acc[s] = pipeline.filter(d => d.stage === s).length; return acc; }, {});

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 38,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          marginBottom: 6,
        }}>
          {hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'},{' '}
          <em style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontWeight: 300, color: 'var(--blue3)' }}>
            Briana
          </em>.
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-tertiary)' }}>
            {loading ? '...' : `${fmt(kpis?.activeDeals)} active deals · ${overdueCount > 0 ? `${overdueCount} overdue · ` : ''}${todayCount} tasks today · ${warnAlerts.length} WARN alerts`}
          </span>
          {/* Morning/Evening toggle */}
          <div style={{ display: 'flex', gap: 3, background: 'rgba(0,0,0,0.05)', borderRadius: 20, padding: 3, marginLeft: 'auto' }}>
            {['morning','evening'].map(b => (
              <button key={b} onClick={() => { setBrief(b); localStorage.setItem('cl_brief', b); }} style={{
                padding: '5px 14px', borderRadius: 16,
                fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: brief === b ? 'white' : 'transparent',
                color: brief === b ? 'var(--blue)' : 'var(--text-tertiary)',
                boxShadow: brief === b ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>
                {b === 'morning' ? '☀️ Morning Brief' : '🌙 Evening Recap'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Intelligence Brief */}
      <div style={{
        background: '#FAFAF8',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 22,
      }}>
        {/* Blue left accent */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(to bottom, var(--blue), var(--blue3))' }} />
        <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px 10px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', animation: 'cl-pulse 2.4s ease-in-out infinite', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-editorial)', fontSize: 17, fontStyle: 'italic', color: 'var(--blue)' }}>
            {brief === 'morning' ? 'Morning Intelligence Brief' : 'Evening Recap'}
          </span>
        </div>
        <div style={{ padding: '20px 22px', paddingLeft: 26 }}>
          <p style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--text-secondary)' }}>
            {brief === 'morning' ? (
              <>
                You have <strong style={{ color: 'var(--blue)', fontWeight: 600 }}>{todayCount} tasks due today</strong>
                {overdueCount > 0 && <span style={{ color: 'var(--rust)', fontWeight: 600 }}> and {overdueCount} overdue</span>}.
                {warnAlerts.length > 0 && <> <strong style={{ color: 'var(--blue)', fontWeight: 600 }}>{warnAlerts.length} new WARN filings</strong> overnight.</>}
                {' '}Review your pipeline and prioritize outreach before 10am.
              </>
            ) : (
              <>
                <strong style={{ color: 'var(--blue)', fontWeight: 600 }}>{fmt(kpis?.activeDeals)} active deals</strong> in pipeline.
                {hotLeads.length > 0 && <> <strong style={{ color: 'var(--blue)', fontWeight: 600 }}>{hotLeads.length} hot leads</strong> to follow up on.</>}
                {catalysts.length > 0 && <> <span style={{ color: 'var(--rust)', fontWeight: 600 }}>{catalysts.length} catalyst alerts</span> flagged this week.</>}
                {' '}Review your day before signing off.
              </>
            )}
          </p>
        </div>
        <div style={{ padding: '10px 22px', borderTop: '1px solid rgba(0,0,0,0.05)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textAlign: 'right' }}>
          WHERE SIGNALS BECOME STRATEGY
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Active Pipeline', value: loading ? null : fmt(kpis?.activeDeals), sub: null, href: '/deals' },
          { label: 'Tasks Due', value: loading ? null : fmt(todayCount + overdueCount), sub: overdueCount > 0 ? `${overdueCount} overdue` : null, color: overdueCount > 0 ? 'var(--rust)' : 'var(--amber)', href: '/tasks' },
          { label: 'Active Leads', value: loading ? null : fmt(kpis?.activeLeads), color: 'var(--blue)', href: '/leads' },
          { label: 'Properties', value: loading ? null : fmt(kpis?.properties), href: '/properties' },
          { label: 'WARN Alerts', value: loading ? null : fmt(warnAlerts.length), color: 'var(--purple)', href: '/warn-intel' },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'}
            >
              <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '8px 16px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#78726A' }}>{kpi.label}</span>
              </div>
              <div style={{ padding: '14px 16px 16px' }}>
                {kpi.value === null ? (
                  <div style={{ height: 42, width: 48, borderRadius: 6, background: 'rgba(0,0,0,0.06)', animation: 'cl-shimmer 1.2s infinite' }} />
                ) : (
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, color: kpi.color || 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {kpi.value}
                  </div>
                )}
                {kpi.sub && <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 12, fontStyle: 'italic', color: 'var(--rust)', marginTop: 4 }}>{kpi.sub}</div>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pipeline Card */}
      <Card style={{ marginBottom: 22 }}>
        <CardHeader title="Deal Pipeline" action="VIEW ALL →" actionHref="/deals" />
        <div style={{ padding: '16px 18px' }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
            {DEAL_STAGES.slice(0,10).map((s, i) => {
              const count = stageCounts[s] || 0;
              return <div key={s} style={{ flex: 1, background: count > 0 ? (i <= 1 ? 'var(--blue3)' : i <= 4 ? 'var(--blue)' : i <= 7 ? 'var(--amber)' : 'var(--green)') : '#E8E4DC', borderRadius: 2 }} />;
            })}
          </div>
          <div style={{ display: 'flex' }}>
            {DEAL_STAGES.slice(0,10).map((stage, i) => {
              const count = stageCounts[stage] || 0;
              const labels = ['Tracking','UW','Off-Mkt','Marketing','LOI','Accepted','PSA','DD','Non-Cont','Closed'];
              return (
                <div key={stage} style={{ flex: 1, textAlign: 'center', padding: '10px 2px', borderRight: i < 9 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: count > 0 ? 20 : 16, fontWeight: 700, color: count > 0 ? 'var(--text-primary)' : '#D4CFCA', lineHeight: 1 }}>
                    {count > 0 ? count : '—'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginTop: 4, textTransform: 'uppercase' }}>
                    {labels[i]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 3 Column: Tasks / Deals / Leads */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>

        {/* Tasks */}
        <Card>
          <CardHeader title="Today's Tasks" action="ALL →" actionHref="/tasks" />
          {loading ? <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div> :
            tasks.length === 0 ? (
              <div className="cl-empty" style={{ padding: '24px 16px' }}>
                <div className="cl-empty-label">No tasks due</div>
                <div className="cl-empty-sub">Clear schedule</div>
              </div>
            ) : tasks.map(task => {
              const overdue = task.due_date < today;
              const dueToday = task.due_date === today;
              return (
                <div key={task.id} style={{
                  padding: '12px 18px',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  background: overdue ? '#FFF8F5' : 'transparent',
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid rgba(0,0,0,0.12)', flexShrink: 0, marginTop: 2, cursor: 'pointer' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: overdue ? 'var(--rust)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 11, fontStyle: 'italic', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {overdue ? 'Overdue' : dueToday ? 'Due today' : fmtDate(task.due_date)}
                    </div>
                  </div>
                  {task.priority === 'high' && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--blue)', flexShrink: 0 }}>HIGH</span>
                  )}
                </div>
              );
            })
          }
        </Card>

        {/* Active Deals */}
        <Card>
          <CardHeader title="Active Deals" action="ALL →" actionHref="/deals" />
          {loading ? <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div> :
            pipeline.length === 0 ? (
              <div className="cl-empty" style={{ padding: '24px 16px' }}>
                <div className="cl-empty-label">No active deals</div>
                <div className="cl-empty-sub">Convert a lead to start</div>
              </div>
            ) : pipeline.map(deal => {
              const showComm = ['LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won'].includes(deal.stage);
              return (
                <Link key={deal.id} href={`/deals/${deal.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{
                    padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.1s', cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,110,150,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {deal.deal_name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {deal.stage}{deal.deal_value ? ` · ${fmtM(deal.deal_value)}` : ''}
                      </div>
                    </div>
                    {showComm && deal.commission_est && (
                      <span className="cl-commission" style={{ fontSize: 9 }}>{fmtM(deal.commission_est)}</span>
                    )}
                  </div>
                </Link>
              );
            })
          }
        </Card>

        {/* Hot Leads */}
        <Card>
          <CardHeader title="Hot Leads" action="ALL →" actionHref="/leads" />
          {loading ? <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div> :
            hotLeads.length === 0 ? (
              <div className="cl-empty" style={{ padding: '24px 16px' }}>
                <div className="cl-empty-label">No active leads</div>
                <div className="cl-empty-sub">Import properties to generate leads</div>
              </div>
            ) : hotLeads.map(lead => {
              const tags = Array.isArray(lead.catalyst_tags) ? lead.catalyst_tags.slice(0,2) : [];
              const scoreColor = lead.score >= 75 ? 'var(--rust)' : lead.score >= 50 ? 'var(--amber)' : 'var(--blue)';
              return (
                <Link key={lead.id} href={`/leads/${lead.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{
                    padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,110,150,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {lead.score != null && (
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${scoreColor}`, color: scoreColor,
                        fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
                      }}>
                        {lead.score}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.company_name || 'Unnamed Lead'}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
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
            })
          }
        </Card>
      </div>

      {/* This Week divider */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        THIS WEEK
      </div>

      {/* 2 col: Catalyst Alerts / WARN Intel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>

        {/* Catalyst Alerts */}
        <Card>
          <CardHeader title="⚡ Catalyst Alerts" action="ALL →" actionHref="/properties" />
          {loading ? <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div> :
            catalysts.length === 0 ? (
              <div className="cl-empty" style={{ padding: '20px' }}>
                <div className="cl-empty-label">No catalyst alerts</div>
              </div>
            ) : catalysts.map(prop => {
              const tags = Array.isArray(prop.catalyst_tags) ? prop.catalyst_tags : [];
              const high = tags.some(t => (typeof t === 'object' ? t.priority : null) === 'high');
              const scoreColor = (prop.score||0) >= 75 ? 'var(--rust)' : (prop.score||0) >= 50 ? 'var(--amber)' : 'var(--blue)';
              return (
                <div key={prop.id} style={{
                  padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderLeft: `3px solid ${high ? 'var(--rust)' : 'var(--amber)'}`,
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {prop.score != null && (
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${scoreColor}`, color: scoreColor,
                      fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
                    }}>
                      {prop.score}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {prop.address}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, alignItems: 'center' }}>
                      {tags.slice(0,2).map((tag, i) => {
                        const cat = typeof tag === 'object' ? tag.category : 'asset';
                        const lbl = typeof tag === 'object' ? tag.tag : tag;
                        return <span key={i} className={`cl-catalyst cl-catalyst--${cat}`} style={{ fontSize: 8 }}>{lbl}</span>;
                      })}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 4 }}>{prop.city}</span>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </Card>

        {/* WARN Intel */}
        <Card>
          <CardHeader title="WARN Intel" action="ALL →" actionHref="/warn-intel" />
          {loading ? <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div> :
            warnAlerts.length === 0 ? (
              <div className="cl-empty" style={{ padding: '20px' }}>
                <div className="cl-empty-label">No recent WARN filings</div>
                <div className="cl-empty-sub">Auto-sync runs daily at 6am</div>
              </div>
            ) : warnAlerts.map(w => (
              <div key={w.id} style={{ padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚡</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {w.company_name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {w.city}{w.layoff_count ? ` · ${fmt(w.layoff_count)} workers` : ''} · {fmtDate(w.notice_date)}
                  </div>
                </div>
                {!w.lead_created && (
                  <span className="cl-badge cl-badge-amber" style={{ fontSize: 8, flexShrink: 0 }}>NEW</span>
                )}
              </div>
            ))
          }
        </Card>
      </div>

      {/* SoCal News */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        SOCAL INDUSTRIAL NEWS
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { tag: 'WARN', tagColor: 'rust', title: 'IE West vacancy climbs to 9.2% as new supply hits market', source: 'CoStar', time: '2h ago' },
          { tag: 'REIT', tagColor: 'blue', title: 'Rexford announces $130M in dispositions for FY2026', source: 'Bloomberg', time: '4h ago' },
          { tag: 'BESS', tagColor: 'purple', title: 'BESS developers accelerate Long Beach land acquisitions near SCE substations', source: 'LADWP Report', time: '1d ago' },
        ].map((article, i) => (
          <div key={i} style={{
            background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'}
          >
            <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={`cl-badge cl-badge-${article.tagColor}`} style={{ fontSize: 8 }}>{article.tag}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>{article.source} · {article.time}</span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5 }}>{article.title}</div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes cl-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.7)} }
        @keyframes cl-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
    </div>
  );
}
