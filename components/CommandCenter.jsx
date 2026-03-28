'use client';
import { useState, useMemo } from 'react';
import { DEAL_STAGES, STAGE_COLORS, COMMISSION_VISIBLE_STAGES, getCatalystStyle, getScoreRing, calculateAIScore, fmt } from '../lib/constants';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const isAfternoon = () => new Date().getHours() >= 16;

export default function CommandCenter({ onNavigate, counts = {}, properties = [], deals = [], leads = [], tasks = [], leaseComps = [], saleComps = [], accounts = [], contacts = [], onCatalystClick }) {
  const [briefType, setBriefType] = useState(null);

  // ── Computed metrics ──
  const totalPipeline = useMemo(() => {
    return deals.reduce((s, d) => s + (parseFloat(String(d.deal_value || d.value || 0).replace(/[$M,]/g, '')) || 0), 0);
  }, [deals]);

  const overdueTasks = useMemo(() => tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) < new Date()), [tasks]);
  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter(t => !t.completed && t.due_date && t.due_date.slice(0, 10) === today);
  }, [tasks]);

  const hotLeads = useMemo(() => leads.filter(l => l.score >= 80 || l.tier === 'A+' || l.tier === 'A'), [leads]);

  // ── Catalyst alerts: properties with HIGH priority catalysts ──
  const catalystAlerts = useMemo(() => {
    const alerts = [];
    properties.forEach(p => {
      (p.catalyst_tags || []).forEach(tag => {
        const style = getCatalystStyle(tag);
        if (style.priority === 'HIGH') {
          alerts.push({ property: p, tag, style, score: p.ai_score || calculateAIScore(p.catalyst_tags || []), address: p.address });
        }
      });
    });
    return alerts.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8);
  }, [properties]);

  // ── Deal stage groups ──
  const stageGroups = useMemo(() => {
    return DEAL_STAGES.filter(s => !['Closed Won', 'Closed Lost', 'Dead'].includes(s))
      .map(s => ({ stage: s, deals: deals.filter(d => d.stage === s) }))
      .filter(g => g.deals.length > 0);
  }, [deals]);

  // ── Build intelligence brief from REAL data ──
  const brief = useMemo(() => {
    const parts = [];
    const now = new Date();
    const yesterday = new Date(now - 86400000);

    if (briefType === 'morning') {
      // New leads (created recently)
      const newLeads = leads.filter(l => l.created_at && new Date(l.created_at) > yesterday);
      if (newLeads.length > 0) {
        parts.push(`${newLeads.length} new lead${newLeads.length > 1 ? 's' : ''} since yesterday: ${newLeads.slice(0, 3).map(l => `**${l.lead_name || l.name}**`).join(', ')}.`);
      }

      // High-score properties
      const dropEverything = properties.filter(p => (p.ai_score || calculateAIScore(p.catalyst_tags || [])) >= 80);
      if (dropEverything.length > 0) {
        const top = dropEverything[0];
        parts.push(`**${top.address || top.name}** scores ${top.ai_score || calculateAIScore(top.catalyst_tags || [])} — ${(top.catalyst_tags || []).slice(0, 3).join(', ')}. Call now.`);
      }

      // Overdue tasks
      if (overdueTasks.length > 0) {
        parts.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} — oldest: **${overdueTasks[0].title || overdueTasks[0].text || 'Unnamed'}**.`);
      }

      // Today's tasks
      if (todayTasks.length > 0) {
        parts.push(`${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today.`);
      }

      // Pipeline summary
      if (deals.length > 0) {
        const pipeVal = totalPipeline >= 1000000 ? `$${(totalPipeline / 1000000).toFixed(1)}M` : fmt.price(totalPipeline);
        parts.push(`Pipeline at **${pipeVal}** across ${deals.length} deals.`);
      }

      // Hot leads not contacted
      const uncontacted = leads.filter(l => (l.score >= 70 || l.tier === 'A+') && !l.last_contacted);
      if (uncontacted.length > 0) {
        parts.push(`${uncontacted.length} high-priority lead${uncontacted.length > 1 ? 's' : ''} not yet contacted.`);
      }

      if (parts.length === 0) parts.push('No new signals overnight. Pipeline steady. Check WARN Intel for today\'s filings.');
    } else {
      // Evening recap
      const completedToday = tasks.filter(t => t.completed && t.completed_at && new Date(t.completed_at).toDateString() === now.toDateString());
      if (completedToday.length > 0) {
        parts.push(`${completedToday.length} task${completedToday.length > 1 ? 's' : ''} completed today.`);
      }

      if (deals.length > 0) {
        const pipeVal = totalPipeline >= 1000000 ? `$${(totalPipeline / 1000000).toFixed(1)}M` : fmt.price(totalPipeline);
        parts.push(`Pipeline at **${pipeVal}**.`);
      }

      // Tomorrow's priority
      const topLead = leads.filter(l => l.score >= 60).sort((a, b) => (b.score || 0) - (a.score || 0))[0];
      if (topLead) {
        parts.push(`Tomorrow's first call: **${topLead.lead_name || topLead.name}** — Score ${topLead.score}, ${(topLead.catalyst_tags || []).slice(0, 2).join(', ') || 'active lead'}.`);
      }

      if (parts.length === 0) parts.push('Quiet day. Review pipeline and prep for tomorrow.');
    }

    return parts.join(' ');
  }, [briefType, leads, properties, deals, tasks, overdueTasks, todayTasks, totalPipeline]);

  // ── Render ──
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <div style={S.topbarInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              {getGreeting()}, <em style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)' }}>Briana</em>
            </div>
            <button style={{ ...S.briefBtn, ...(briefType === 'morning' ? S.briefBtnMorning : {}) }} onClick={() => setBriefType(briefType === 'morning' ? null : 'morning')}>
              ☀ Morning Brief
            </button>
            <button style={{ ...S.briefBtn, ...(briefType === 'evening' ? S.briefBtnEvening : {}) }} onClick={() => setBriefType(briefType === 'evening' ? null : 'evening')}>
              🌙 Evening Recap
            </button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={S.searchWrap}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#6E6860" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="#6E6860" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input placeholder="Search everything..." style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink2)', width: '100%' }} />
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 4, padding: '2px 5px' }}>⌘K</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>

          {/* BRIEF PANEL */}
          {briefType && (
            <div style={{ ...S.briefPanel, borderLeftColor: briefType === 'morning' ? 'var(--blue)' : 'var(--purple)', background: briefType === 'morning' ? 'rgba(78,110,150,0.04)' : 'rgba(88,56,160,0.04)', borderColor: briefType === 'morning' ? 'var(--blue-bdr)' : 'var(--purple-bdr)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: briefType === 'morning' ? 'var(--blue)' : 'var(--purple)', display: 'inline-block', animation: 'blink 1.4s infinite' }} />
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: briefType === 'morning' ? 'var(--blue)' : 'var(--purple)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {briefType === 'morning' ? 'Intelligence' : 'Evening Recap'}
                </span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink2)' }}
                dangerouslySetInnerHTML={{ __html: brief.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--blue)">$1</strong>') }} />
            </div>
          )}

          {/* KPI STRIP */}
          <div style={S.kpiStrip}>
            {[
              { icon: '◈', label: 'Pipeline', val: totalPipeline >= 1000000 ? `$${(totalPipeline / 1000000).toFixed(0)}M` : fmt.price(totalPipeline), sub: `${deals.length} deals`, color: 'var(--blue)', page: 'deals' },
              { icon: '⚡', label: 'Active Leads', val: leads.length, sub: `${hotLeads.length} hot`, color: 'var(--amber)', page: 'leads' },
              { icon: '🏢', label: 'Properties', val: properties.length, sub: 'tracked', color: 'var(--blue)', page: 'properties' },
              { icon: '✓', label: 'Tasks Due', val: todayTasks.length + overdueTasks.length, sub: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'today', color: overdueTasks.length > 0 ? 'var(--rust)' : 'var(--blue)', page: 'tasks' },
            ].map((k, i) => (
              <div key={i} style={{ ...S.kpiCard, cursor: 'pointer' }} onClick={() => onNavigate(k.page)}>
                <div style={{ ...S.kpiIcon, background: `${k.color}11`, color: k.color }}>{k.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: k.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>{k.label}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 1 }}>{k.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ⚡ CATALYST ALERTS */}
          {catalystAlerts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 15, color: 'var(--rust)' }}>⚡</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', fontWeight: 600 }}>Catalyst Alerts</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--rust)', background: 'var(--rust-bg)', border: '1px solid var(--rust-bdr)', padding: '1px 7px', borderRadius: 20 }}>{catalystAlerts.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
                {catalystAlerts.map((a, i) => {
                  const ring = getScoreRing(a.score);
                  return (
                    <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderLeft: `3px solid ${a.style.color}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer' }}
                      onClick={() => onNavigate('properties')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', border: `2.5px solid ${ring.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: ring.color, flexShrink: 0 }}>
                          {a.score}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink2)' }}>{a.address || a.property.name}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            <span onClick={e => { e.stopPropagation(); onCatalystClick?.(a.tag); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 500, border: `1px solid ${a.style.bdr}`, background: a.style.bg, color: a.style.color, fontFamily: "'DM Mono',monospace", cursor: 'pointer' }}>
                              {a.style.dot} {a.tag}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PIPELINE BY STAGE */}
          {stageGroups.length > 0 && (
            <div style={S.stageStrip}>
              {stageGroups.map(g => (
                <div key={g.stage} style={S.stageGroup}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: STAGE_COLORS[g.stage] || 'var(--ink3)', marginBottom: 6 }}>{g.stage}</div>
                  {g.deals.map((d, i) => {
                    const showComm = COMMISSION_VISIBLE_STAGES.includes(g.stage) && d.commission_est;
                    return (
                      <div key={i} style={{ ...S.stageDeal, borderLeftColor: STAGE_COLORS[g.stage] || 'var(--ink3)' }} onClick={() => onNavigate('deals')}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink2)', marginBottom: 2 }}>{d.deal_name || d.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--ink3)' }}>{d.deal_value ? fmt.price(d.deal_value) : d.value || '—'}</span>
                          {showComm && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--green)', background: 'var(--green-bg)', padding: '1px 5px', borderRadius: 3 }}>{fmt.price(d.commission_est)} comm</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* 3-COL BODY */}
          <div style={S.body3col}>
            {/* TODAY'S TASKS */}
            <div style={S.col}>
              <div style={S.colHdr}>
                <span style={S.colTitle}>Today's Actions</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' }} onClick={() => onNavigate('tasks')}>View all →</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--rust)', background: 'var(--rust-bg)', border: '1px solid var(--rust-bdr)', padding: '2px 7px', borderRadius: 20 }}>{todayTasks.length + overdueTasks.length}</span>
                </div>
              </div>
              {[...overdueTasks, ...todayTasks].slice(0, 6).map((t, i, arr) => (
                <div key={t.id || i} style={{ ...S.taskRow, borderBottom: i < arr.length - 1 ? '1px solid var(--line2)' : 'none', cursor: 'pointer' }} onClick={() => onNavigate('tasks')}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${overdueTasks.includes(t) ? 'var(--rust)' : 'var(--line)'}`, flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.35 }}>{t.title || t.text}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 2 }}>{t.description || t.meta || ''}</div>
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: overdueTasks.includes(t) ? 'var(--rust)' : 'var(--ink4)', flexShrink: 0, background: overdueTasks.includes(t) ? 'var(--rust-bg)' : 'transparent', padding: '2px 5px', borderRadius: 4, border: overdueTasks.includes(t) ? '1px solid var(--rust-bdr)' : 'none' }}>
                    {overdueTasks.includes(t) ? 'Overdue' : 'Today'}
                  </span>
                </div>
              ))}
              {todayTasks.length === 0 && overdueTasks.length === 0 && (
                <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink4)', padding: '16px 0' }}>No tasks due today</div>
              )}
            </div>

            {/* HOT LEADS */}
            <div style={S.col}>
              <div style={S.colHdr}>
                <span style={S.colTitle}>Hot Leads</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' }} onClick={() => onNavigate('leads')}>View all →</span>
              </div>
              {(hotLeads.length > 0 ? hotLeads : leads).slice(0, 5).map((l, i, arr) => {
                const score = l.score || l.ai_score || 0;
                const ring = getScoreRing(score);
                return (
                  <div key={l.id || i} style={{ ...S.leadRow, borderBottom: i < arr.length - 1 ? '1px solid var(--line2)' : 'none', cursor: 'pointer' }} onClick={() => onNavigate('leads')}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${ring.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700, color: ring.color, flexShrink: 0 }}>
                      {score}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink2)' }}>{l.lead_name || l.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 1 }}>{l.address || l.city || ''}</div>
                    </div>
                    {(l.catalyst_tags || []).slice(0, 1).map((tag, ti) => {
                      const cs = getCatalystStyle(tag);
                      return <span key={ti} onClick={e => { e.stopPropagation(); onCatalystClick?.(tag); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 6px', borderRadius: 4, fontSize: 9.5, fontWeight: 500, border: `1px solid ${cs.bdr}`, background: cs.bg, color: cs.color, fontFamily: "'DM Mono',monospace", flexShrink: 0, cursor: 'pointer' }}>{cs.dot} {tag}</span>;
                    })}
                  </div>
                );
              })}
              {leads.length === 0 && <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink4)', padding: '16px 0' }}>No leads yet</div>}
            </div>

            {/* RECENT ACTIVITY */}
            <div style={S.col}>
              <div style={S.colHdr}>
                <span style={S.colTitle}>Market Intel</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' }} onClick={() => onNavigate('news')}>View all →</span>
              </div>
              <div style={{ padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink3)' }}>Lease Comps</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>{leaseComps.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink3)' }}>Sale Comps</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{saleComps.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink3)' }}>Accounts</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>{accounts.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink3)' }}>Contacts</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>{contacts.length}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const S = {
  topbar: { height: 60, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', position: 'sticky', top: 0, zIndex: 5, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' },
  topbarInner: { display: 'flex', alignItems: 'center', width: '100%', maxWidth: 1400, margin: '0 auto' },
  pageWrap: { maxWidth: 1400, margin: '0 auto', padding: '24px 28px 48px' },
  briefBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  briefBtnMorning: { background: 'var(--blue-bg)', borderColor: 'var(--blue-bdr)', color: 'var(--blue)' },
  briefBtnEvening: { background: 'var(--purple-bg)', borderColor: 'var(--purple-bdr)', color: 'var(--purple)' },
  briefPanel: { padding: '18px 24px', borderRadius: 10, border: '1px solid', borderLeft: '3px solid', marginBottom: 20 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 13px', width: 280 },
  kpiStrip: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
  kpiCard: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 },
  kpiIcon: { width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  stageStrip: { display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto' },
  stageGroup: { flex: '1 1 0', minWidth: 160 },
  stageDeal: { background: 'var(--card)', border: '1px solid var(--line2)', borderLeft: '3px solid', borderRadius: 8, padding: '10px 12px', marginBottom: 6, cursor: 'pointer' },
  body3col: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  col: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '16px 18px', minHeight: 200 },
  colHdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  colTitle: { fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', fontWeight: 600 },
  taskRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0' },
  leadRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' },
};
