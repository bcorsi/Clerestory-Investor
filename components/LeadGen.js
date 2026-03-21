'use client';

import { useState } from 'react';
import { LEAD_STAGES, LEAD_STAGE_COLORS, LEAD_SUBSTEPS, LEAD_KILL_REASONS, PROP_TYPES, catalystTagClass } from '../lib/constants';
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
  const [killing, setKilling] = useState(null); // lead id being killed
  const [showDead, setShowDead] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [listPropType, setListPropType] = useState('');
  const [listSort, setListSort] = useState('score');
  const [listSortDir, setListSortDir] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('active');
  const [dragLead, setDragLead] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const active = leads.filter((l) => !['Converted', 'Dead'].includes(l.stage));
  const convertedLeads = leads.filter((l) => l.stage === 'Converted');
  const deadLeads = leads.filter((l) => l.stage === 'Dead');
  const byStage = LEAD_STAGES.reduce((acc, s) => { acc[s] = active.filter((l) => l.stage === s); return acc; }, {});
  const tierColor = (t) => ({ 'A+': 'var(--green)', A: 'var(--blue)', B: 'var(--amber)', C: 'var(--ink3)' }[t] || 'var(--ink3)');

  const statusLeads = statusFilter === 'all' ? leads : statusFilter === 'converted' ? convertedLeads : statusFilter === 'dead' ? deadLeads : active;

  const filteredActive = (() => {
    let rows = statusLeads;
    if (listSearch) { const q = listSearch.toLowerCase(); rows = rows.filter(l => `${l.lead_name} ${l.address} ${l.owner} ${l.company} ${l.decision_maker}`.toLowerCase().includes(q)); }
    if (listPropType) rows = rows.filter(l => l.prop_type === listPropType);
    rows = [...rows].sort((a, b) => {
      let va = a[listSort], vb = b[listSort];
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return listSortDir === 'asc' ? va - vb : vb - va;
      return listSortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return rows;
  })();
  const toggleListSort = (f) => { if (listSort === f) setListSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setListSort(f); setListSortDir('desc'); } };
  const si = (f) => listSort === f ? (listSortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const visibleStages = showDead ? [...LEAD_STAGES, 'Dead'] : LEAD_STAGES;

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragLead || dragLead.stage === targetStage) { setDragLead(null); return; }
    try {
      await updateRow('leads', dragLead.id, { stage: targetStage });
      onRefresh();
      showToast(`Moved to ${targetStage}`);
    } catch (err) { console.error(err); }
    setDragLead(null);
  };

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

  const handleKill = async (lead, reason, e) => {
    if (e) e.stopPropagation();
    try {
      await updateRow('leads', lead.id, { stage: 'Dead', kill_reason: reason, killed_at: new Date().toISOString() });
      setKilling(null);
      onRefresh();
      showToast(`Lead killed: ${reason}`);
    } catch (err) { console.error(err); }
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

  const toggleSub = async (leadId, step) => {
    const lead = leads.find(l => l.id === leadId);
    const current = lead?.substeps || {};
    const updated = { ...current, [step]: !current[step] };
    // Optimistic local update
    const k = `${leadId}::${step}`;
    setSubsteps((p) => ({ ...p, [k]: !p[k] }));
    try { await updateRow('leads', leadId, { substeps: updated }); onRefresh?.(); } catch (e) { console.error(e); }
  };

  const ViewToggle = () => (
    <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-input)', borderRadius: '6px', padding: '2px' }}>
      {[['kanban', '⊞'], ['list', '☰']].map(([v, icon]) => (
        <button key={v} onClick={() => setView(v)} style={{ padding: '4px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer',  background: view === v ? 'var(--bg-card)' : 'transparent', color: view === v ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.15s' }}>{icon}</button>
      ))}
    </div>
  );

  const Card = ({ lead }) => {
    const open = expanded === lead.id;
    const subs = LEAD_SUBSTEPS[lead.stage] || [];
    const done = subs.filter((s) => (lead.substeps || {})[s]).length;

    return (
      <div onClick={() => setExpanded(open ? null : lead.id)} onDoubleClick={() => onLeadClick?.(lead)}
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `3px solid ${tierColor(lead.tier)}`, borderRadius: 'var(--radius)', padding: '12px', cursor: 'pointer', marginBottom: '8px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{  fontWeight: 600, color: 'var(--text-primary)', flex: 1, marginRight: '8px' }}>{lead.lead_name}</span>
          <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
            {lead.tier && <span style={{  fontWeight: 700, padding: '2px 5px', borderRadius: '3px', background: tierColor(lead.tier) + '22', color: tierColor(lead.tier) }}>{lead.tier}</span>}
            {lead.score != null && <span style={{  fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 5px', borderRadius: '3px' }}>{lead.score}</span>}
          </div>
        </div>

        {lead.address && <div style={{  color: 'var(--text-muted)', marginBottom: '5px' }}>{lead.address}{lead.submarket ? ` · ${lead.submarket}` : ''}</div>}

        {subs.length > 0 && (
          <div style={{ marginBottom: '6px' }}>
            <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${subs.length > 0 ? Math.round(done / subs.length * 100) : 0}%`, height: '100%', background: tierColor(lead.tier), transition: 'width 0.3s' }} />
            </div>
            <div style={{  color: 'var(--text-muted)', marginTop: '2px' }}>{done}/{subs.length} steps</div>
          </div>
        )}

        {aiStep[lead.id]
          ? <div style={{  color: 'var(--amber)', fontWeight: 500, marginBottom: '5px' }}>✦ {aiStep[lead.id]}</div>
          : lead.next_action && <div style={{  color: 'var(--text-secondary)', marginBottom: '5px' }}>→ {lead.next_action}</div>}

        {lead.catalyst_tags?.length > 0 && (
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {lead.catalyst_tags.slice(0, 2).map((t) => <span key={t} className={`tag ${catalystTagClass(t)}`} style={{  }}>{t}</span>)}
          </div>
        )}

        {open && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '8px' }} onClick={(e) => e.stopPropagation()}>
            {subs.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '6px' }}>Substeps</div>
                {subs.map((step) => {
                  const checked = (lead.substeps || {})[step] || false;
                  return (
                    <div key={step} onClick={() => toggleSub(lead.id, step)} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '3px 0', cursor: 'pointer' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, border: '2px solid', borderColor: checked ? 'var(--accent)' : 'var(--border)', background: checked ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',  fontWeight: 700 }}>{checked ? '✓' : ''}</div>
                      <span style={{  color: checked ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: checked ? 'line-through' : 'none' }}>{step}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {lead.decision_maker && <div style={{  marginBottom: '2px' }}><span style={{ color: 'var(--text-muted)' }}>DM: </span>{lead.decision_maker}</div>}
            {lead.phone && <div style={{  fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '2px' }}>{lead.phone}</div>}
            {lead.notes && <div style={{  color: 'var(--text-secondary)', lineHeight: 1.5, margin: '6px 0 10px' }}>{lead.notes.slice(0, 180)}{lead.notes.length > 180 ? '...' : ''}</div>}

            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '13px', color: 'var(--amber)', borderColor: 'var(--amber)' }} onClick={(e) => handleAI(lead, e)} disabled={aiLoading === lead.id}>
                {aiLoading === lead.id ? '⟳ Thinking...' : '✦ AI Next Step'}
              </button>
              {LEAD_STAGES.filter((s) => s !== lead.stage).map((s) => (
                <button key={s} className="btn btn-ghost btn-sm" style={{ fontSize: '13px' }} onClick={(e) => handleStage(lead, s, e)}>→ {s}</button>
              ))}
              <button className="btn btn-primary btn-sm" style={{ fontSize: '13px' }} disabled={converting === lead.id} onClick={(e) => handleConvert(lead, e)}>
                {converting === lead.id ? '...' : '⚡ Convert'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '6px' }}>
              {killing === lead.id ? (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', width: '100%' }}>
                  {LEAD_KILL_REASONS.map(reason => (
                    <button key={reason} className="btn btn-ghost btn-sm" style={{ fontSize: '11px', color: 'var(--red)', borderColor: 'var(--red)' }}
                      onClick={(e) => handleKill(lead, reason, e)}>{reason}</button>
                  ))}
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }} onClick={(e) => { e.stopPropagation(); setKilling(null); }}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '13px', color: 'var(--red)', borderColor: 'var(--red)' }}
                  onClick={(e) => { e.stopPropagation(); setKilling(lead.id); }}>✕ Kill Lead</button>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '13px', width: '100%' }} onClick={() => onLeadClick?.(lead)}>Open Full Page →</button>
          </div>
        )}
      </div>
    );
  };


  return (
    <div>
      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 0 14px', marginBottom: '0' }}>
        {/* Stage filter pills */}
        {[['Lead', statusLeads.filter(l => l.stage !== 'Owner Contacted').length, 'var(--blue)'],
          ['Owner Contacted', statusLeads.filter(l => l.stage === 'Owner Contacted').length, 'var(--green)']
        ].map(([label, count, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--ink2)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontWeight: 500 }}>{label}</span>
            <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color }}>{count}</span>
          </div>
        ))}
        {deadLeads.length > 0 && (
          <button onClick={() => setShowDead(!showDead)} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', color: 'var(--ink3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Instrument Sans',sans-serif" }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink3)' }} />
            <span>Dead</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, color: showDead ? 'var(--ink2)' : 'var(--ink4)' }}>{deadLeads.length}</span>
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button className={`btn btn-sm ${view === 'kanban' ? 'btn-blue' : ''}`} onClick={() => setView('kanban')}>⊞</button>
          <button className={`btn btn-sm ${view === 'list' ? 'btn-blue' : ''}`} onClick={() => setView('list')}>☰</button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleStages.length}, minmax(260px, 1fr))`, gap: 0, overflowX: 'auto' }}>
          {visibleStages.map(stage => {
            const stageLeads = byStage[stage] || [];
            return (
              <div key={stage} className="stage-col"
                onDragOver={e => { e.preventDefault(); setDragOver(stage); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, stage)}>

                <div className="stage-head">
                  <div className="sh-left">
                    <div className="stage-dot" style={{ background: LEAD_STAGE_COLORS[stage] || 'var(--ink3)' }} />
                    <div className="stage-name">{stage}</div>
                  </div>
                  <div className="stage-count" style={{ color: LEAD_STAGE_COLORS[stage] || 'var(--ink4)' }}>{stageLeads.length}</div>
                </div>

                <div style={{ padding: '8px', minHeight: '100px', background: dragOver === stage ? 'rgba(85,119,160,0.06)' : 'transparent', transition: 'background 0.15s' }}>
                  {stageLeads.map(lead => (
                    <div key={lead.id} className="deal-card" draggable
                      onDragStart={e => { setDragLead(lead); e.dataTransfer.effectAllowed = 'move'; }}
                      onClick={() => onLeadClick?.(lead)}
                      style={{ opacity: dragLead?.id === lead.id ? 0.4 : 1, borderLeftColor: LEAD_STAGE_COLORS[stage] || 'var(--blue2)', marginBottom: '8px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div className="dc-name">{lead.lead_name}</div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                          {lead.tier && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', fontWeight: 700, color: {'A+':'var(--green)',A:'var(--blue)',B:'var(--amber)',C:'var(--ink3)'}[lead.tier] || 'var(--ink3)' }}>{lead.tier}</span>}
                          {lead.score && <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', fontWeight: 700, color: 'var(--blue2)' }}>{lead.score}</span>}
                        </div>
                      </div>
                      {lead.address && <div className="dc-address">{lead.address}{lead.city ? ' · ' + (lead.market || lead.submarket || lead.city) : ''}</div>}
                      <div style={{ fontSize: '12px', color: 'var(--ink4)', marginTop: '4px' }}>
                        {lead.substep_index != null && LEAD_SUBSTEPS[stage] && (
                          <span>{lead.substep_index}/{LEAD_SUBSTEPS[stage].length} steps</span>
                        )}
                      </div>
                      {lead.next_action && <div style={{ fontSize: '12px', color: 'var(--amber)', marginTop: '4px' }}>→ {lead.next_action}</div>}
                      {(lead.catalyst_tags||[]).length > 0 && (
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {(lead.catalyst_tags||[]).slice(0,2).map(t => <span key={t} className={`tag ${catalystTagClass(t)}`}>{t}</span>)}
                          {(lead.catalyst_tags||[]).length > 2 && <span className="tag tag-ghost">+{lead.catalyst_tags.length-2}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="table-container">
          <table>
            <thead><tr><th>Lead</th><th>Address</th><th>Stage</th><th>Tier</th><th>Score</th><th>Catalysts</th><th>Next Action</th></tr></thead>
            <tbody>
              {statusLeads.concat(showDead ? deadLeads : []).map(lead => (
                <tr key={lead.id} onClick={() => onLeadClick?.(lead)} style={{ cursor: 'pointer', opacity: lead.stage === 'Dead' ? 0.5 : lead.stage === 'Converted' ? 0.7 : 1 }}>
                  <td style={{ fontWeight: 500 }}>{lead.lead_name}</td>
                  <td>{lead.address || '—'}</td>
                  <td><span className="badge" style={{ background: (LEAD_STAGE_COLORS[lead.stage]||'var(--ink3)') + '14', borderColor: (LEAD_STAGE_COLORS[lead.stage]||'var(--ink3)') + '44', color: LEAD_STAGE_COLORS[lead.stage]||'var(--ink3)' }}>{lead.stage}</span></td>
                  <td>{lead.tier && <span style={{ fontWeight: 700, color: {'A+':'var(--green)',A:'var(--blue)',B:'var(--amber)',C:'var(--ink3)'}[lead.tier]||'var(--ink3)' }}>{lead.tier}</span>}</td>
                  <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--blue)' }}>{lead.score || '—'}</td>
                  <td><div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>{(lead.catalyst_tags||[]).slice(0,2).map(t => <span key={t} className={`tag ${catalystTagClass(t)}`}>{t}</span>)}</div></td>
                  <td style={{ fontSize: '12px', color: 'var(--amber)' }}>{lead.next_action || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
