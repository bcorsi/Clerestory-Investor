'use client';

import { useState } from 'react';
import { LEAD_STAGES, LEAD_STAGE_COLORS, LEAD_SUBSTEPS } from '../lib/constants';
import { updateRow, convertLeadToDeal, insertRow } from '../lib/db';

const MODEL = 'claude-sonnet-4-20250514';

async function getAINextStep(lead) {
  const prompt = `You are a commercial real estate broker assistant. Based on this lead intel, give the single most important next action to take RIGHT NOW. Be specific and direct — max 15 words.

Lead: ${lead.lead_name}
Stage: ${lead.stage}
Score: ${lead.score || 'N/A'} | Tier: ${lead.tier || 'N/A'}
Decision Maker: ${lead.decision_maker || 'Unknown'}
Phone: ${lead.phone || 'None'}
Address: ${lead.address || 'N/A'}
Catalysts: ${(lead.catalyst_tags || []).join(', ') || 'None'}
Intel: ${lead.notes || 'None'}

Reply with ONLY the next action — no preamble.`;

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 80, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) return 'Review lead intel and identify next contact';
  return data.content?.[0]?.text?.trim() || 'Review lead intel and identify next contact';
}

export default function LeadGen({ leads, onRefresh, showToast, onLeadClick }) {
  const [view, setView] = useState('kanban');
  const [converting, setConverting] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [aiStep, setAiStep] = useState({});
  const [aiLoading, setAiLoading] = useState(null);
  const [substeps, setSubsteps] = useState({});

  const active = leads.filter((l) => l.stage !== 'Converted');
  const byStage = LEAD_STAGES.reduce((acc, s) => { acc[s] = active.filter((l) => l.stage === s); return acc; }, {});
  const tierColor = (t) => ({ 'A+': '#22c55e', A: '#3b82f6', B: '#f59e0b', C: '#6b7280' }[t] || '#6b7280');

  const handleConvert = async (lead, e) => {
    e.stopPropagation();
    if (!confirm(`Convert "${lead.lead_name}" to a Deal?`)) return;
    setConverting(lead.id);
    try { await convertLeadToDeal(lead); onRefresh(); showToast(`${lead.lead_name} → Deal created`); }
    catch (err) { console.error(err); }
    finally { setConverting(null); }
  };

  const handleStage = async (lead, stage, e) => {
    e.stopPropagation();
    try { await updateRow('leads', lead.id, { stage }); onRefresh(); showToast(`Moved to ${stage}`); }
    catch (err) { console.error(err); }
  };

  const handleAI = async (lead, e) => {
    e.stopPropagation();
    setAiLoading(lead.id);
    try {
      const step = await getAINextStep(lead);
      setAiStep((p) => ({ ...p, [lead.id]: step }));

      // Auto-create a task linked to this lead
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      await insertRow('tasks', {
        title: step,
        description: `AI-generated next step for ${lead.lead_name}`,
        due_date: tomorrow,
        priority: lead.priority || 'Medium',
        lead_id: lead.id,
        property_id: lead.property_id || null,
      });

      // Update the lead's next_action field
      await updateRow('leads', lead.id, { next_action: step, next_action_date: tomorrow });

      onRefresh();
      showToast(`Task created: ${step.slice(0, 40)}...`);
    } catch (err) { console.error(err); }
    finally { setAiLoading(null); }
  };

  const toggleSub = (leadId, step) => {
    const k = `${leadId}::${step}`;
    setSubsteps((p) => ({ ...p, [k]: !p[k] }));
  };

  const ViewToggle = () => (
    <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-input)', borderRadius: '6px', padding: '2px' }}>
      {[['kanban', '⊞'], ['list', '☰']].map(([v, icon]) => (
        <button key={v} onClick={() => setView(v)} style={{ padding: '4px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '15px', background: view === v ? 'var(--bg-card)' : 'transparent', color: view === v ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.15s' }}>{icon}</button>
      ))}
    </div>
  );

  const Card = ({ lead }) => {
    const open = expanded === lead.id;
    const subs = LEAD_SUBSTEPS[lead.stage] || [];
    const done = subs.filter((s) => substeps[`${lead.id}::${s}`]).length;

    return (
      <div onClick={() => setExpanded(open ? null : lead.id)} onDoubleClick={() => onLeadClick?.(lead)}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${tierColor(lead.tier)}`, borderRadius: 'var(--radius)', padding: '12px', cursor: 'pointer', marginBottom: '8px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', flex: 1, marginRight: '8px' }}>{lead.lead_name}</span>
          <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
            {lead.tier && <span style={{ fontSize: '15px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', background: tierColor(lead.tier) + '22', color: tierColor(lead.tier) }}>{lead.tier}</span>}
            {lead.score != null && <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 5px', borderRadius: '3px' }}>{lead.score}</span>}
          </div>
        </div>

        {lead.address && <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '5px' }}>{lead.address}{lead.submarket ? ` · ${lead.submarket}` : ''}</div>}

        {subs.length > 0 && (
          <div style={{ marginBottom: '6px' }}>
            <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${subs.length > 0 ? Math.round(done / subs.length * 100) : 0}%`, height: '100%', background: tierColor(lead.tier), transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' }}>{done}/{subs.length} steps</div>
          </div>
        )}

        {aiStep[lead.id]
          ? <div style={{ fontSize: '15px', color: 'var(--amber)', fontWeight: 500, marginBottom: '5px' }}>✦ {aiStep[lead.id]}</div>
          : lead.next_action && <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '5px' }}>→ {lead.next_action}</div>}

        {lead.catalyst_tags?.length > 0 && (
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {lead.catalyst_tags.slice(0, 2).map((t) => <span key={t} className="tag tag-ghost" style={{ fontSize: '15px' }}>{t}</span>)}
          </div>
        )}

        {open && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '8px' }} onClick={(e) => e.stopPropagation()}>
            {subs.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '6px' }}>Substeps</div>
                {subs.map((step) => {
                  const checked = substeps[`${lead.id}::${step}`] || false;
                  return (
                    <div key={step} onClick={() => toggleSub(lead.id, step)} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '3px 0', cursor: 'pointer' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, border: '2px solid', borderColor: checked ? 'var(--accent)' : 'var(--border)', background: checked ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '15px', fontWeight: 700 }}>{checked ? '✓' : ''}</div>
                      <span style={{ fontSize: '15px', color: checked ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: checked ? 'line-through' : 'none' }}>{step}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {lead.decision_maker && <div style={{ fontSize: '15px', marginBottom: '2px' }}><span style={{ color: 'var(--text-muted)' }}>DM: </span>{lead.decision_maker}</div>}
            {lead.phone && <div style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '2px' }}>{lead.phone}</div>}
            {lead.notes && <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '6px 0 10px' }}>{lead.notes.slice(0, 180)}{lead.notes.length > 180 ? '...' : ''}</div>}

            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '15px', color: 'var(--amber)', borderColor: 'var(--amber)' }} onClick={(e) => handleAI(lead, e)} disabled={aiLoading === lead.id}>
                {aiLoading === lead.id ? '⟳ Thinking...' : '✦ AI Next Step'}
              </button>
              {LEAD_STAGES.filter((s) => s !== lead.stage).map((s) => (
                <button key={s} className="btn btn-ghost btn-sm" style={{ fontSize: '15px' }} onClick={(e) => handleStage(lead, s, e)}>→ {s}</button>
              ))}
              <button className="btn btn-primary btn-sm" style={{ fontSize: '15px', marginLeft: 'auto' }} disabled={converting === lead.id} onClick={(e) => handleConvert(lead, e)}>
                {converting === lead.id ? '...' : '⚡ Convert'}
              </button>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '15px', width: '100%' }} onClick={() => onLeadClick?.(lead)}>Open Full Page →</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {LEAD_STAGES.map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', color: 'var(--text-muted)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: LEAD_STAGE_COLORS[s] }} />
              <span>{s}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{byStage[s]?.length || 0}</span>
            </div>
          ))}
        </div>
        <ViewToggle />
      </div>

      {view === 'list' ? (
        <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          <table>
            <thead>
              <tr><th>Lead</th><th>Stage</th><th>Tier</th><th>Score</th><th>Decision Maker</th><th>Phone</th><th>Next Action</th><th>Priority</th></tr>
            </thead>
            <tbody>
              {active.map((lead) => (
                <tr key={lead.id} onClick={() => onLeadClick?.(lead)} style={{ cursor: 'pointer' }}>
                  <td><div style={{ fontWeight: 500 }}>{lead.lead_name}</div>{lead.address && <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{lead.address}</div>}</td>
                  <td><span style={{ fontSize: '15px', padding: '2px 7px', borderRadius: '4px', background: (LEAD_STAGE_COLORS[lead.stage] || '#6b7280') + '22', color: LEAD_STAGE_COLORS[lead.stage] || '#6b7280', fontWeight: 600 }}>{lead.stage}</span></td>
                  <td>{lead.tier && <span style={{ fontWeight: 700, color: tierColor(lead.tier) }}>{lead.tier}</span>}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: 'var(--accent)' }}>{lead.score ?? '—'}</td>
                  <td style={{ fontSize: '15px' }}>{lead.decision_maker || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '15px' }}>{lead.phone || '—'}</td>
                  <td style={{ fontSize: '15px', color: 'var(--amber)' }}>{lead.next_action || '—'}</td>
                  <td>{lead.priority && <span className={`tag ${lead.priority === 'High' ? 'tag-amber' : 'tag-ghost'}`} style={{ fontSize: '15px' }}>{lead.priority}</span>}</td>
                </tr>
              ))}
              {active.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No active leads</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${LEAD_STAGES.length}, 1fr)`, gap: '12px', alignItems: 'start' }}>
          {LEAD_STAGES.map((stage) => (
            <div key={stage}>
              <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', borderTop: `3px solid ${LEAD_STAGE_COLORS[stage]}`, marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>{stage}</span>
                <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{byStage[stage]?.length || 0}</span>
              </div>
              {(byStage[stage] || []).map((lead) => <Card key={lead.id} lead={lead} />)}
              {!(byStage[stage]?.length) && <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>Empty</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
