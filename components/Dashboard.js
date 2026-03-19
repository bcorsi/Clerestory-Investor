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
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function DayOfWeek() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function Dashboard({
  properties, deals, leads, contacts, leaseComps, saleComps,
  tasks, activities,
  onPropertyClick, onDealClick, onLeadClick, onContactClick, setPage,
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
    const seen = new Set();
    // Track property addresses that are already represented by a lead
    const leadAddresses = new Set(activeLeads.map(l => l.address).filter(Boolean));

    // Leads first (more actionable)
    activeLeads.forEach(item => {
      (item.catalyst_tags || []).forEach(tag => {
        const urg = CATALYST_URGENCY[tag];
        const key = (item.address || item.lead_name) + '::' + tag;
        if ((urg === 'immediate' || urg === 'high') && !seen.has(key)) {
          seen.add(key);
          signals.push({ label: item.lead_name, tag, urgency: urg, type: 'lead', record: item });
        }
      });
    });

    // Properties — skip if a lead already covers this address
    properties.forEach(item => {
      if (leadAddresses.has(item.address)) return;
      (item.catalyst_tags || []).forEach(tag => {
        const urg = CATALYST_URGENCY[tag];
        const key = (item.address) + '::' + tag;
        if ((urg === 'immediate' || urg === 'high') && !seen.has(key)) {
          seen.add(key);
          signals.push({ label: item.address, tag, urgency: urg, type: 'property', record: item });
        }
      });
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
  const tierColor = (t) => ({ 'A+': '#22c55e', A: '#3b82f6', B: '#f59e0b', C: '#6b7280' }[t] || '#6b7280');
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
      {/* ─── MORNING HEADER ───────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>
              <TimeGreeting />
            </h2>
            <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}><DayOfWeek /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={generateBrief} disabled={briefLoading}
              style={{ fontSize: '15px', gap: '6px', color: 'var(--amber)', borderColor: 'var(--amber)' }}>
              {briefLoading ? '⟳ Generating...' : '✦ Morning Brief'}
            </button>
            <button className="btn btn-ghost" onClick={generateEveningBrief} disabled={eveningLoading}
              style={{ fontSize: '15px', gap: '6px', color: '#8b5cf6', borderColor: '#8b5cf644' }}>
              {eveningLoading ? '⟳ Generating...' : '✦ Evening Brief'}
            </button>
          </div>
        </div>

        {(morningBrief || briefLoading || briefError) && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.06), rgba(37, 99, 235, 0.04))',
            border: '1px solid rgba(217, 119, 6, 0.2)',
            borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: '8px',
          }}>
            {briefLoading ? (
              <div style={{ fontSize: '15px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Analyzing your pipeline, leads, and tasks...</div>
            ) : briefError ? (
              <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Could not generate brief. Click to retry.</div>
            ) : (
              <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.65', fontWeight: 450 }}>
                <span style={{ color: 'var(--amber)', fontWeight: 600, marginRight: '6px' }}>✦</span>
                {morningBrief}
              </div>
            )}
          </div>
        )}

        {(eveningBrief || eveningLoading) && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(37, 99, 235, 0.04))',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: '8px',
          }}>
            {eveningLoading ? (
              <div style={{ fontSize: '15px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Reviewing today's activities and progress...</div>
            ) : (
              <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.65', fontWeight: 450 }}>
                <span style={{ color: '#8b5cf6', fontWeight: 600, marginRight: '6px' }}>✦ Evening Recap</span>
                {eveningBrief}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── STAT CARDS ───────────────────────────────────────── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card" onClick={() => setPage('pipeline')} style={{ cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <div className="stat-label">Pipeline</div>
          <div className="stat-value">{activeDeals.length}</div>
          <div className="stat-sub">{totalPipeline > 0 ? `${(totalPipeline / 1000000).toFixed(1)}M value` : 'No active deals'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Commission</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: '24px' }}>{fmt.price(Math.round(totalCommission))}</div>
          <div className="stat-sub">{fmt.price(Math.round(weightedComm))} weighted</div>
        </div>
        <div className="stat-card" onClick={() => setPage('lead-gen')} style={{ cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <div className="stat-label">Active Leads</div>
          <div className="stat-value">{activeLeads.length}</div>
          <div className="stat-sub">{hotLeads.length} hot (A+/A)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Properties</div>
          <div className="stat-value">{properties.length}</div>
          <div className="stat-sub">{fmt.sf(properties.reduce((s, p) => s + (p.building_sf || 0), 0))}</div>
        </div>
        <div className="stat-card" onClick={() => setPage('tasks')} style={{ cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = overdueTasks.length > 0 ? 'var(--red)' : 'var(--border)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <div className="stat-label">Tasks Due</div>
          <div className="stat-value" style={overdueTasks.length > 0 ? { color: 'var(--red)' } : {}}>{todayTasks.length + overdueTasks.length}</div>
          <div className="stat-sub">{overdueTasks.length > 0 ? <span style={{ color: 'var(--red)' }}>{overdueTasks.length} overdue</span> : 'All on track'}</div>
        </div>
      </div>

      {/* ─── MAIN GRID: 3-column layout ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px' }}>

        {/* ── COLUMN 1: Today's Actions ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Overdue + Today Tasks */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                {overdueTasks.length > 0 ? '🔴 ' : ''}Today's Actions
              </h3>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '15px' }} onClick={() => setPage('tasks')}>All tasks →</button>
            </div>

            {[...overdueTasks, ...todayTasks].length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>No tasks due today</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[...overdueTasks.map(t => ({...t, _overdue: true})), ...todayTasks].slice(0, 8).map(task => (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '6px',
                    background: task._overdue ? 'var(--red-soft)' : 'transparent',
                    border: task._overdue ? '1px solid rgba(220,38,38,0.15)' : '1px solid transparent',
                  }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                      background: task._overdue ? 'var(--red)' : priorityColor(task.priority),
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                      {task._overdue && <div style={{ fontSize: '15px', color: 'var(--red)', fontWeight: 600 }}>OVERDUE — {task.due_date}</div>}
                    </div>
                    <span style={{ fontSize: '15px', color: priorityColor(task.priority), fontWeight: 600, flexShrink: 0 }}>{task.priority}</span>
                  </div>
                ))}
              </div>
            )}

            {upcomingTasks.length > 0 && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>This Week</div>
                {upcomingTasks.slice(0, 4).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                    <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: '56px' }}>{new Date(task.due_date + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</span>
                    <span style={{ fontSize: '15px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catalyst Alerts */}
          {urgentCatalysts.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>⚡ Catalyst Alerts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {urgentCatalysts.map((sig, i) => (
                  <div key={i} onClick={() => sig.type === 'lead' ? onLeadClick?.(sig.record) : onPropertyClick?.(sig.record)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.15s', background: sig.urgency === 'immediate' ? 'var(--red-soft)' : 'var(--amber-soft)' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: sig.urgency === 'immediate' ? 'var(--red)' : 'var(--amber)', flexShrink: 0 }}>
                      {sig.urgency === 'immediate' ? '!!!' : '!!'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sig.label}</div>
                      <div style={{ fontSize: '15px', color: sig.urgency === 'immediate' ? 'var(--red)' : 'var(--amber)' }}>{sig.tag}</div>
                    </div>
                    <span style={{ fontSize: '15px', color: 'var(--text-muted)', flexShrink: 0 }}>{sig.type === 'lead' ? '◎' : '⌂'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── COLUMN 2: Pipeline + Lead Funnel ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Pipeline Momentum */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Pipeline Momentum</h3>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '15px' }} onClick={() => setPage('pipeline')}>View pipeline →</button>
            </div>

            <div style={{ display: 'flex', gap: '2px', height: '24px', borderRadius: '5px', overflow: 'hidden', marginBottom: '14px' }}>
              {DEAL_STAGES.filter(s => (dealsByStage[s]?.length || 0) > 0).map(stage => {
                const pct = ((dealsByStage[stage]?.length || 0) / Math.max(deals.length, 1)) * 100;
                return (
                  <div key={stage} title={`${stage}: ${dealsByStage[stage]?.length || 0}`}
                    style={{ width: `${Math.max(pct, 3)}%`, background: STAGE_COLORS[stage], borderRadius: '2px', minWidth: '8px', opacity: 0.85, transition: 'opacity 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.85'} />
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {DEAL_STAGES.filter(s => s !== 'Dead').map(stage => {
                const count = dealsByStage[stage]?.length || 0;
                const value = (dealsByStage[stage] || []).reduce((s, d) => s + (d.deal_value || 0), 0);
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STAGE_COLORS[stage], flexShrink: 0 }} />
                    <span style={{ fontSize: '15px', color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)', flex: 1 }}>{stage}</span>
                    <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: count > 0 ? 600 : 400 }}>{count}</span>
                    {value > 0 && <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: '52px', textAlign: 'right' }}>{(value / 1000000).toFixed(1)}M</span>}
                  </div>
                );
              })}
            </div>

            {closingThisMonth.length > 0 && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--green)', marginBottom: '8px' }}>
                  Closing This Month ({closingThisMonth.length})
                </div>
                {closingThisMonth.map(deal => (
                  <div key={deal.id} onClick={() => onDealClick?.(deal)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', borderRadius: '5px', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{deal.deal_name}</div>
                    </div>
                    {deal.commission_est && <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 500 }}>{fmt.price(deal.commission_est)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lead Gen Funnel */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Lead Funnel</h3>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '15px' }} onClick={() => setPage('lead-gen')}>View leads →</button>
            </div>

            {LEAD_STAGES.map(stage => {
              const stageLeads = leadsByStage[stage] || [];
              const hotCount = stageLeads.filter(l => ['A+', 'A'].includes(l.tier)).length;
              return (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: LEAD_STAGE_COLORS[stage], flexShrink: 0 }} />
                  <span style={{ fontSize: '15px', color: 'var(--text-secondary)', flex: 1 }}>{stage}</span>
                  <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{stageLeads.length}</span>
                  {hotCount > 0 && <span style={{ fontSize: '15px', fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '1px 5px', borderRadius: '3px' }}>{hotCount} hot</span>}
                </div>
              );
            })}

            {untouchedLeads.length > 0 && (
              <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '6px', background: 'var(--amber-soft)', border: '1px solid rgba(217,119,6,0.15)' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--amber)' }}>
                  {untouchedLeads.length} lead{untouchedLeads.length !== 1 ? 's' : ''} awaiting first contact
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── COLUMN 3: Hot Leads + Activity Feed ───────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Hot Leads */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>🔥 Hot Leads</h3>
              <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>A+ and A tier</span>
            </div>

            {hotLeads.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>No A+/A tier leads yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {hotLeads.slice(0, 7).map(lead => (
                  <div key={lead.id} onClick={() => onLeadClick?.(lead)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                    borderLeft: `3px solid ${tierColor(lead.tier)}`, transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.lead_name}</div>
                      <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{lead.submarket || lead.address || ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: tierColor(lead.tier), background: tierColor(lead.tier) + '18', padding: '1px 5px', borderRadius: '3px' }}>{lead.tier}</span>
                      <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{lead.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Recent Activity</h3>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '15px' }} onClick={() => setPage('activities')}>View all →</button>
            </div>

            {recentActivities.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {recentActivities.map(act => {
                  const linked = findLinkedName(act);
                  return (
                    <div key={act.id} style={{ display: 'flex', gap: '10px', padding: '6px 4px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '15px', lineHeight: '18px', flexShrink: 0 }}>{activityIcon(act.activity_type)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {act.subject || act.activity_type}
                        </div>
                        <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                          {linked && <span>{linked} · </span>}
                          {act.outcome && <span style={{ color: act.outcome === 'Spoke' || act.outcome === 'Meeting Set' ? 'var(--green)' : 'var(--text-muted)' }}>{act.outcome} · </span>}
                          {act.activity_date}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Market Summary */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>By Market</h3>
            {['SGV', 'IE', 'LA', 'OC'].map(mkt => {
              const propCount = properties.filter(p => p.market === mkt).length;
              const dealCount = deals.filter(d => {
                const prop = properties.find(p => p.address === d.address);
                return prop?.market === mkt;
              }).length;
              if (propCount === 0 && dealCount === 0) return null;
              return (
                <div key={mkt} style={{ display: 'flex', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '36px' }}>{mkt}</span>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '15px', color: 'var(--text-muted)' }}>
                    <span>{propCount} prop</span>
                    <span>{dealCount} deal</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── NEWS FEED ─────────────────────────────────────────── */}
      <NewsFeed />
    </div>
  );
}

function NewsFeed() {
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
    } catch { setArticles([{ title: 'Error loading news', summary: 'Check API key and try again', source: '', date: '' }]); }
    finally { setLoading(false); }
  };

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SoCal Industrial News</h3>
        <button className="btn btn-ghost btn-sm" onClick={fetchNews} disabled={loading} style={{ fontSize: '12px' }}>{loading ? '⟳ Searching...' : fetched ? '⟳ Refresh' : '🔍 Load News'}</button>
      </div>
      {!fetched && !loading && <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Click "Load News" to fetch latest SoCal industrial articles</div>}
      {articles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {articles.map((a, i) => (
            <div key={i} style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '6px', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none', borderBottom: '1px dashed var(--accent)' }}>{a.title}</a> : a.title}</div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{a.date}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{a.summary}</div>
              {a.source && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{a.source}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
