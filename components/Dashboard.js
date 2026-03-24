'use client';

import { useState, useMemo } from 'react';
import { DEAL_STAGES, STAGE_COLORS, LEAD_STAGES, LEAD_STAGE_COLORS, CATALYST_URGENCY, AI_MODEL_OPUS, fmt } from '../lib/constants';

async function getMorningBrief(context) {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL_OPUS, max_tokens: 400,
        system: 'You are a CRE brokerage intelligence assistant. Write crisp, actionable morning briefs. Be specific about what to do TODAY. No fluff, no greeting, no bullet points.',
        messages: [{ role: 'user', content: `It's ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. Write a 2-3 sentence morning brief based on this data.

Active deals: ${context.activeDeals} (pipeline: ${context.pipelineValue})
Weighted commission: ${context.weightedComm}
Hot leads (A+ or A tier): ${context.hotLeadCount}
Overdue tasks: ${context.overdueTasks}
Leads needing first contact: ${context.untouchedLeads}
Deals closing this month: ${context.closingThisMonth}
Top priority lead: ${context.topLead || 'None'}
Top priority deal: ${context.topDeal || 'None'}

Reply with ONLY the brief — no preamble, no bullet points.` }],
      }),
    });
    const data = await res.json();
    if (data.error) return null;
    return data.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

function TimeGreeting() {
  const hour = new Date().getHours();
  const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return <>Good <em>{tod},</em> Briana.</>;
}

function DayOfWeek() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + new Date().getFullYear();
}

export default function Dashboard({
  properties, deals, leads, contacts, leaseComps, saleComps,
  tasks, activities, campaigns,
  onPropertyClick, onDealClick, onLeadClick, onContactClick, onTaskClick, setPage,
  morningBrief, setMorningBrief, saveDailyBrief
}) {
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState(false);
  const [eveningBrief, setEveningBrief] = useState(null);
  const [eveningLoading, setEveningLoading] = useState(false);

  // ─── COMPUTED DATA ────────────────────────────────────────
  const activeDeals = useMemo(() => deals.filter(d => !['Closed', 'Dead'].includes(d.stage)), [deals]);
  const totalPipeline = useMemo(() => activeDeals.reduce((s, d) => s + (d.deal_value || 0), 0), [activeDeals]);
  const totalCommission = useMemo(() => activeDeals.reduce((s, d) => s + (d.commission_est || 0), 0), [activeDeals]);
  const weightedComm = useMemo(() => activeDeals.reduce((s, d) => s + (d.commission_est || 0) * ((d.probability || 0) / 100), 0), [activeDeals]);

  const activeLeads = useMemo(() => leads.filter(l => !['Converted', 'Dead'].includes(l.stage)), [leads]);
  const hotLeads = useMemo(() => activeLeads.filter(l => ['A+', 'A'].includes(l.tier)).sort((a, b) => (b.score || 0) - (a.score || 0)), [activeLeads]);
  const untouchedLeads = useMemo(() => activeLeads.filter(l => l.stage === 'Lead' && !l.last_contact_date), [activeLeads]);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);
  const overdueTasks = useMemo(() => tasks.filter(t => !t.completed && t.due_date && t.due_date < today), [tasks, today]);
  const todayTasks = useMemo(() => tasks.filter(t => !t.completed && t.due_date === today), [tasks, today]);
  const upcomingTasks = useMemo(() => tasks.filter(t => !t.completed && t.due_date && t.due_date > today && t.due_date <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]).sort((a, b) => a.due_date.localeCompare(b.due_date)), [tasks, today]);

  const closingThisMonth = useMemo(() => activeDeals.filter(d => d.close_date && d.close_date.startsWith(thisMonth)), [activeDeals, thisMonth]);

  const recentActivities = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    return activities.filter(a => a.activity_date && a.activity_date >= cutoff).sort((a, b) => (b.activity_date || '').localeCompare(a.activity_date || '')).slice(0, 8);
  }, [activities]);

  const dealsByStage = useMemo(() => {
    const map = {};
    DEAL_STAGES.forEach(s => { map[s] = deals.filter(d => d.stage === s); });
    return map;
  }, [deals]);

  const leadsByStage = useMemo(() => {
    const map = {};
    LEAD_STAGES.forEach(s => { map[s] = activeLeads.filter(l => l.stage === s); });
    return map;
  }, [activeLeads]);

  const urgentCatalysts = useMemo(() => {
    const signals = [];
    const seenRecords = new Set();
    // Track property addresses that are already represented by a lead
    const leadAddresses = new Set(activeLeads.map(l => l.address).filter(Boolean));

    // Leads first (more actionable) — ONE row per lead, collect ALL urgent tags
    activeLeads.forEach(item => {
      const key = 'lead::' + (item.id || item.lead_name);
      if (seenRecords.has(key)) return;
      const urgentTags = (item.catalyst_tags || []).filter(tag => {
        const urg = CATALYST_URGENCY[tag];
        return urg === 'immediate' || urg === 'high';
      });
      if (urgentTags.length === 0) return;
      seenRecords.add(key);
      const topUrgency = urgentTags.some(t => CATALYST_URGENCY[t] === 'immediate') ? 'immediate' : 'high';
      signals.push({ label: item.lead_name, tags: urgentTags, urgency: topUrgency, type: 'lead', record: item });
    });

    // Properties — skip if a lead already covers this address — ONE row per property
    properties.forEach(item => {
      if (leadAddresses.has(item.address)) return;
      const key = 'prop::' + (item.id || item.address);
      if (seenRecords.has(key)) return;
      const urgentTags = (item.catalyst_tags || []).filter(tag => {
        const urg = CATALYST_URGENCY[tag];
        return urg === 'immediate' || urg === 'high';
      });
      if (urgentTags.length === 0) return;
      seenRecords.add(key);
      const topUrgency = urgentTags.some(t => CATALYST_URGENCY[t] === 'immediate') ? 'immediate' : 'high';
      signals.push({ label: item.address, tags: urgentTags, urgency: topUrgency, type: 'property', record: item });
    });

    return signals.sort((a, b) => a.urgency === 'immediate' ? -1 : 1).slice(0, 6);
  }, [properties, activeLeads]);

  // ─── AI BRIEF ─────────────────────────────────────────────
  const generateBrief = async () => {
    setBriefLoading(true);
    setBriefError(false);
    const topLead = hotLeads[0];
    const sortedDeals = [...activeDeals].sort((a, b) => (b.probability || 0) - (a.probability || 0));
    const topDeal = sortedDeals[0];
    const result = await getMorningBrief({
      activeDeals: activeDeals.length,
      pipelineValue: fmt.price(totalPipeline),
      weightedComm: fmt.price(Math.round(weightedComm)),
      hotLeadCount: hotLeads.length,
      overdueTasks: overdueTasks.length,
      untouchedLeads: untouchedLeads.length,
      closingThisMonth: closingThisMonth.length,
      topLead: topLead ? `${topLead.lead_name} (${topLead.tier}, score ${topLead.score})` : null,
      topDeal: topDeal ? `${topDeal.deal_name} (${topDeal.probability}% probability)` : null,
    });
    if (result) {
      setMorningBrief(result);
      // Save to database so it persists across refreshes
      saveDailyBrief(result, {
        activeDeals: activeDeals.length,
        pipelineValue: totalPipeline,
        hotLeadCount: hotLeads.length,
      }).catch(() => {});
    }
    else setBriefError(true);
    setBriefLoading(false);
  };

  // Evening Brief
  const generateEveningBrief = async () => {
    setEveningLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const todayActs = (activities || []).filter(a => a.activity_date && a.activity_date.startsWith(today));
    const todayNotes = (tasks || []).filter(t => t.completed_at && t.completed_at.startsWith(today));
    const recentDeals = deals.filter(d => d.updated_at && d.updated_at.startsWith(today));
    
    const actSummary = todayActs.map(a => `${a.activity_type}: ${a.subject}${a.outcome ? ' → ' + a.outcome : ''}`).join('\n') || 'No activities logged today';
    const tasksDone = todayNotes.length;
    const context = `Activities today:\n${actSummary}\n\nTasks completed: ${tasksDone}\nDeals touched: ${recentDeals.length}\nActive deals: ${activeDeals.length}\nPipeline: ${fmt.price(totalPipeline)}\nHot leads: ${hotLeads.length}\nOverdue tasks: ${overdueTasks.length}`;
    
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 400,
          system: 'You are a CRE brokerage assistant. Write a concise evening recap of what was accomplished today. Mention specific activities, deals progressed, and any wins. End with 1-2 priorities for tomorrow. No fluff, no greeting. 3-4 sentences max.',
          messages: [{ role: 'user', content: `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.\n\n${context}\n\nWrite the evening recap.` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || data.error || 'Could not generate evening brief.';
      setEveningBrief(text);
      saveDailyBrief(text, { type: 'evening', activitiesLogged: todayActs.length, tasksCompleted: tasksDone }).catch(() => {});
    } catch (e) { setEveningBrief('Error generating brief.'); }
    finally { setEveningLoading(false); }
  };

  // ─── HELPERS ──────────────────────────────────────────────
  const priorityColor = (p) => ({ Urgent: 'var(--red)', High: 'var(--amber)', Medium: 'var(--accent)', Low: 'var(--text-muted)' }[p] || 'var(--text-muted)');
  const tierColor = (t) => ({ 'A+': 'var(--green)', A: 'var(--blue)', B: 'var(--amber)', C: 'var(--ink3)' }[t] || 'var(--ink3)');
  const activityIcon = (type) => ({ Call: '📞', Email: '✉', Meeting: '🤝', 'To-Do': '☐' }[type] || '•');

  const findLinkedName = (act) => {
    if (act.deal_id) { const d = deals.find(x => x.id === act.deal_id); return d?.deal_name; }
    if (act.lead_id) { const l = leads.find(x => x.id === act.lead_id); return l?.lead_name; }
    if (act.property_id) { const p = properties.find(x => x.id === act.property_id); return p?.address; }
    if (act.contact_id) { const c = contacts.find(x => x.id === act.contact_id); return c?.name; }
    return null;
  };

  return (
    <div>
      {/* ─── GREETING ───────────────────────────────────── */}
      <div className="greeting">
        <h1><TimeGreeting /></h1>
        <div className="greeting-date"><DayOfWeek /></div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button className="ai-btn" onClick={generateBrief} disabled={briefLoading}>
            <svg viewBox="0 0 12 12" fill="currentColor" style={{ width: 12, height: 12 }}><path d="M6 1l1.2 2.6L10 4.8l-2.8 1.4L6 9 4.8 6.2 2 4.8l2.8-1.2z"/></svg>
            {briefLoading ? 'Generating...' : 'Morning Brief'}
          </button>
          <button className="btn btn-blue" onClick={generateEveningBrief} disabled={eveningLoading}>
            {eveningLoading ? 'Generating...' : '✦ Evening Brief'}
          </button>
        </div>
      </div>

      {/* ─── AI STRIP ───────────────────────────────────── */}
      {(morningBrief || briefLoading || briefError) && (
        <div className="ai-strip">
          <div className="ai-pulse"></div>
          <div className="ai-tag">Intelligence</div>
          <div className="ai-text">
            {briefLoading ? <em style={{ color: 'var(--ink4)' }}>Analyzing your pipeline, leads, and tasks...</em>
              : briefError ? <span style={{ color: 'var(--ink4)' }}>Could not generate brief. Click to retry.</span>
              : <span dangerouslySetInnerHTML={{ __html: morningBrief?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '' }} />}
          </div>
        </div>
      )}

      {(eveningBrief || eveningLoading) && (
        <div className="ai-strip" style={{ borderBottomColor: 'var(--purple-bdr)' }}>
          <div className="ai-pulse" style={{ background: 'var(--purple)' }}></div>
          <div className="ai-tag" style={{ color: 'var(--purple)' }}>Evening Recap</div>
          <div className="ai-text">
            {eveningLoading ? <em style={{ color: 'var(--ink4)' }}>Reviewing today's activities...</em>
              : <span dangerouslySetInnerHTML={{ __html: eveningBrief?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '' }} />}
          </div>
        </div>
      )}

      {/* ─── METRICS ───────────────────────────────────── */}
      <div className="metrics-bar">
        <div className="metric-cell" onClick={() => setPage('pipeline')} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Pipeline</div>
          <div className="metric-val">{activeDeals.length}</div>
          <div className="metric-sub">{totalPipeline > 0 ? `$${(totalPipeline / 1000000).toFixed(1)}M value` : 'No active deals'}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">Commission</div>
          <div className="metric-val accent">{fmt.price(Math.round(totalCommission))}</div>
          <div className="metric-sub">{fmt.price(Math.round(weightedComm))} weighted</div>
        </div>
        <div className="metric-cell" onClick={() => setPage('lead-gen')} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Active Leads</div>
          <div className="metric-val">{activeLeads.length}</div>
          <div className="metric-sub">{hotLeads.length} hot (A+/A)</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">Properties</div>
          <div className="metric-val">{properties.length}</div>
          <div className="metric-sub">{fmt.sf(properties.reduce((s, p) => s + (p.building_sf || 0), 0))}</div>
        </div>
        <div className="metric-cell" onClick={() => setPage('tasks')} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Tasks Due</div>
          <div className={`metric-val ${overdueTasks.length > 0 ? 'danger' : ''}`}>{todayTasks.length + overdueTasks.length}</div>
          <div className={`metric-sub ${overdueTasks.length > 0 ? 'danger' : ''}`}>{overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'All on track'}</div>
        </div>
      </div>

      {/* ─── MAIN GRID: 3-column layout ─────────────────────── */}
      <div className="three-col">

        {/* ── COLUMN 1: Today's Actions ─────────────────────── */}
        <div className="col-card">
          <div className="col-head">
            <div className="col-title"><div className="live-dot"></div>Today's Actions</div>
            <span className="col-link" onClick={() => setPage('tasks')}>View all →</span>
          </div>

            {[...overdueTasks, ...todayTasks].length === 0 ? (
              <div style={{ padding: '20px 22px', textAlign: 'center', color: 'var(--ink4)', fontSize: '13px' }}>No tasks due today</div>
            ) : (
              <div>
                {[...overdueTasks.map(t => ({...t, _overdue: true})), ...todayTasks].slice(0, 8).map(task => {
                  const linkedProp = task.property_id && properties.find(p => p.id === task.property_id);
                  const linkedLead = task.lead_id && leads.find(l => l.id === task.lead_id);
                  const linkedDeal = task.deal_id && deals.find(d => d.id === task.deal_id);
                  const linkedLabel = linkedDeal?.deal_name || linkedLead?.lead_name || linkedLead?.address || linkedProp?.address;
                  return (
                  <div key={task.id} className={`task-item ${task._overdue ? 'overdue' : ''}`} onClick={() => onTaskClick?.(task)} style={{ cursor: 'pointer' }}>
                    <div className="t-dot" style={{ background: task._overdue ? 'var(--rust)' : priorityColor(task.priority) }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t-name">{task.title}</div>
                      {linkedLabel && <div style={{ fontSize: '11px', color: 'var(--ink4)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkedDeal ? '💰' : linkedLead ? '🎯' : '📍'} {linkedLabel}</div>}
                      {task._overdue && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--rust)', letterSpacing: '0.1em', marginTop: '3px' }}>Overdue · {task.due_date}</div>}
                    </div>
                    <span className={`t-pri ${task.priority === 'High' ? 'h' : 'm'}`}>{task.priority}</span>
                  </div>
                  );
                })}
              </div>
            )}

            {upcomingTasks.length > 0 && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>This Week</div>
                {upcomingTasks.slice(0, 4).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                    <span style={{  fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: '56px' }}>{new Date(task.due_date + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</span>
                    <span style={{  color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  </div>
                ))}
              </div>
            )}

          {/* Catalyst Alerts */}
          {urgentCatalysts.length > 0 && (
            <div className="card">
              <h3 style={{  fontWeight: 600, marginBottom: '12px' }}>⚡ Catalyst Alerts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {urgentCatalysts.map((sig, i) => (
                  <div key={i} onClick={() => sig.type === 'lead' ? onLeadClick?.(sig.record) : onPropertyClick?.(sig.record)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.15s', background: sig.urgency === 'immediate' ? 'var(--bg)' : 'var(--amber-bg)' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    <span style={{ fontWeight: 700, color: sig.urgency === 'immediate' ? 'var(--red)' : 'var(--amber)', flexShrink: 0, paddingTop: '2px' }}>
                      {sig.urgency === 'immediate' ? '!!!' : '!!'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{sig.label}</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {sig.tags.map(tag => (
                          <span key={tag} style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '3px', background: sig.urgency === 'immediate' ? 'rgba(180,50,50,0.12)' : 'rgba(184,122,16,0.12)', color: sig.urgency === 'immediate' ? 'var(--red)' : 'var(--amber)', border: `1px solid ${sig.urgency === 'immediate' ? 'rgba(180,50,50,0.2)' : 'rgba(184,122,16,0.2)'}` }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, paddingTop: '2px' }}>{sig.type === 'lead' ? '◎' : '⌂'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── COLUMN 2: Pipeline ──────────────── */}
        <div className="col-card">
          <div className="col-head">
            <div className="col-title">Pipeline</div>
            <span className="col-link" onClick={() => setPage('pipeline')}>View →</span>
          </div>

          <div style={{ display: 'flex', gap: '0', height: '4px', margin: '14px 20px 16px', borderRadius: '2px', overflow: 'hidden', background: 'var(--bg2)' }}>
            {DEAL_STAGES.filter(s => (dealsByStage[s]?.length || 0) > 0 && s !== 'Dead').map(stage => {
              const pct = ((dealsByStage[stage]?.length || 0) / Math.max(activeDeals.length, 1)) * 100;
              return <div key={stage} style={{ width: `${Math.max(pct, 3)}%`, background: STAGE_COLORS[stage] }} />;
            })}
          </div>

          <div>
            {DEAL_STAGES.filter(s => s !== 'Dead').map(stage => {
              const count = dealsByStage[stage]?.length || 0;
              const value = (dealsByStage[stage] || []).reduce((s, d) => s + (d.deal_value || 0), 0);
              return (
                <div key={stage} className="pipe-row" onClick={() => setPage('pipeline')}>
                  <div className="pipe-stage">
                    <span className="s-dot" style={{ background: STAGE_COLORS[stage] }} />
                    {stage}
                  </div>
                  <div className="pipe-num">{count}</div>
                  <div className="pipe-val">{value > 0 ? `$${(value/1e6).toFixed(1)}M` : '—'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COLUMN 3: Hot Leads ───────────── */}
        <div className="col-card">
          <div className="col-head">
            <div className="col-title" style={{ fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--rust)', fontFamily: 'var(--font-body)' }}>▲ Hot Leads</div>
          </div>

          {hotLeads.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--ink3)' }}>No A+/A tier leads yet</div>
          ) : (
            <div>
              {hotLeads.slice(0, 7).map((lead, i) => (
                <div key={lead.id} onClick={() => onLeadClick?.(lead)} className={`hot-lead ${i === 0 ? 'top' : ''}`} style={{ cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="hl-name">{lead.lead_name}{lead.address ? ` — ${lead.address}` : ''}</div>
                    <div className="hl-sub">{lead.submarket || lead.market || ''}{lead.building_sf ? ` · ${Number(lead.building_sf).toLocaleString()} SF` : ''}</div>
                  </div>
                  {lead.score && <div className="hl-score">{lead.score}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── CAMPAIGNS ────────────────────────────────────────── */}
      {(campaigns || []).length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Campaigns</h3>
            <button className="btn btn-sm" onClick={() => setPage?.('campaigns')}>View All →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {(campaigns || []).filter(c => c.status === 'Active').slice(0, 4).map(c => (
              <div key={c.id} onClick={() => setPage?.('campaigns')} style={{ padding: '14px', background: 'var(--bg-input)', borderRadius: '8px', borderLeft: '3px solid var(--purple)', cursor: 'pointer' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink2)', marginBottom: '4px' }}>{c.title || c.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--ink4)' }}>{c.target_count ? `${c.target_count} targets` : ''}{c.status ? ` · ${c.status}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── NEWS FEED (top 4 + link) ──────────────────────────── */}
      <DashboardNews setPage={setPage} />
    </div>
  );
}

function DashboardNews({ setPage }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 800,
          system: 'You are a CRE market research assistant. Search for the latest Southern California industrial real estate news. Return ONLY a JSON array of 5-8 articles, each with: title, source, date, summary (1 sentence), and url. Focus on: IE/SGV/LA industrial deals, tenant moves, construction starts, vacancy rates, rent trends, cap rate changes. Return valid JSON only, no markdown.',
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: 'Find the latest Southern California industrial real estate news from the past 7 days. Include deals, tenant moves, market reports, and construction activity. Return as JSON array.' }],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        setArticles(Array.isArray(parsed) ? parsed : []);
      } catch {
        setArticles([{ title: 'News loaded', summary: text.slice(0, 200), source: 'AI Search', date: new Date().toLocaleDateString() }]);
      }
      setFetched(true);
    } catch { setArticles([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SoCal Industrial News</h3>
        {!fetched && <button className="btn btn-sm" onClick={fetchNews} disabled={loading} style={{ fontSize: '13px', background: 'var(--accent)', color: '#fff', border: 'none' }}>{loading ? '⟳ Searching...' : '🔍 Load News'}</button>}
      </div>
      {!fetched && !loading && <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Click "Load News" to fetch latest SoCal industrial articles</div>}
      {articles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {articles.slice(0, 4).map((a, i) => (
            <div key={i} style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '6px', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none', borderBottom: '1px dashed var(--accent)' }}>{a.title}</a> : a.title}</div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{a.date}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{a.summary}</div>
              {a.source && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{a.source}</div>}
            </div>
          ))}
          <button className="btn" style={{ alignSelf: 'flex-start', marginTop: '8px' }} onClick={() => setPage?.('news-feed')}>
            View Full News Feed →
          </button>
        </div>
      )}
    </div>
  );
}
