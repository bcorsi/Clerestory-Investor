'use client';

import { useState } from 'react';
import { LEAD_STAGES, LEAD_STAGE_COLORS, LEAD_SUBSTEPS, LEAD_TIERS, PRIORITIES, fmt } from '../lib/constants';
import { updateRow, convertLeadToDeal, convertLeadToProperty } from '../lib/db';

const MODEL = 'claude-sonnet-4-20250514';
async function getAINextStep(lead) {
  const prompt = `You are a commercial real estate broker assistant. Based on this lead intel, give the single most important next action to take RIGHT NOW. Be specific and direct — max 15 words.\n\nLead: ${lead.lead_name}\nStage: ${lead.stage}\nScore: ${lead.score || 'N/A'} | Tier: ${lead.tier || 'N/A'}\nDecision Maker: ${lead.decision_maker || 'Unknown'}\nPhone: ${lead.phone || 'None'}\nAddress: ${lead.address || 'N/A'}\nCatalysts: ${(lead.catalyst_tags || []).join(', ') || 'None'}\nIntel: ${(lead.notes || '').slice(0, 500)}\n\nReply with ONLY the next action — no preamble.`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 80, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || 'Review lead intel and identify next contact';
  } catch { return 'Review lead intel and identify next contact'; }
}

export default function LeadDetail({ lead, activities, tasks, properties, onRefresh, showToast, onPropertyClick, onAddActivity, onAddTask, onConverted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...lead });
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertingProp, setConvertingProp] = useState(false);
  const [substeps, setSubsteps] = useState({});
  const [aiStep, setAiStep] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRow('leads', lead.id, {
        lead_name: form.lead_name, stage: form.stage, address: form.address,
        submarket: form.submarket, owner: form.owner, company: form.company,
        decision_maker: form.decision_maker, phone: form.phone, email: form.email,
        tier: form.tier, score: form.score ? parseInt(form.score) : null,
        priority: form.priority, next_action: form.next_action,
        next_action_date: form.next_action_date || null,
        est_value: form.est_value ? parseFloat(form.est_value) : null,
        notes: form.notes,
      });
      onRefresh();
      setEditing(false);
      showToast('Lead updated');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleConvert = async () => {
    if (!confirm(`Convert "${lead.lead_name}" to a Deal at Offers/LOI?`)) return;
    setConverting(true);
    try {
      await convertLeadToDeal(lead);
      onRefresh();
      showToast(`${lead.lead_name} converted to Deal`);
      if (onConverted) onConverted();
    } catch (err) { console.error(err); }
    finally { setConverting(false); }
  };

  const handleConvertToProperty = async () => {
    if (!confirm('Create a Property record from this lead? The lead will be linked to the new property.')) return;
    setConvertingProp(true);
    try {
      await convertLeadToProperty(lead);
      onRefresh();
      showToast(lead.address + ' added to Properties');
    } catch (err) { console.error(err); }
    finally { setConvertingProp(false); }
  };

  const linkedActivities = activities.filter((a) => a.lead_id === lead.id);
  const linkedTasks = (tasks || []).filter((t) => t.lead_id === lead.id);
  const pendingTasks = linkedTasks.filter((t) => !t.completed).length;
  const linkedProperty = properties.find((p) => p.address === lead.address || p.id === lead.property_id);
  const subs = LEAD_SUBSTEPS[lead.stage] || [];
  const toggleSub = (step) => setSubsteps((p) => ({ ...p, [step]: !p[step] }));
  const subsDone = subs.filter((s) => substeps[s]).length;

  const handleAI = async () => {
    setAiLoading(true);
    try { const s = await getAINextStep(lead); setAiStep(s); }
    catch (err) { console.error(err); }
    finally { setAiLoading(false); }
  };

  const mapsUrl = lead.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((lead.address || '') + ', ' + (lead.submarket || '') + ', CA')}` : null;

  const tierColor = (tier) => {
    const map = { 'A+': '#22c55e', 'A': '#3b82f6', 'B': '#f59e0b', 'C': '#6b7280' };
    return map[tier] || '#6b7280';
  };

  const stageColor = LEAD_STAGE_COLORS[lead.stage] || '#6b7280';

  const Field = ({ label, value, mono }) => (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value || '—'}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{lead.lead_name}</h2>
              {lead.tier && (
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: tierColor(lead.tier) + '22', color: tierColor(lead.tier) }}>
                  {lead.tier}
                </span>
              )}
              <span style={{ padding: '3px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600, background: stageColor + '22', color: stageColor }}>
                {lead.stage}
              </span>
              {lead.score != null && (
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>Score: {lead.score}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {lead.address}{lead.submarket ? ` · ${lead.submarket}` : ''}
              </span>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                  Google Maps ↗
                </a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onAddActivity && onAddActivity(lead.id)}>+ Activity</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
            {lead.stage !== 'Converted' && (
              <button className="btn btn-primary btn-sm" onClick={handleConvert} disabled={converting}>
                {converting ? 'Converting...' : 'Convert to Deal'}
              </button>
            )}
            {!linkedProperty && (
              <button className="btn btn-ghost btn-sm" onClick={handleConvertToProperty} disabled={convertingProp}>
                {convertingProp ? 'Creating...' : 'Create Property'}
              </button>
            )}
          </div>
        </div>

        {/* Next action strip */}
        {lead.next_action && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Next Action:</span>
            <span style={{ fontSize: '13px', color: 'var(--amber)', fontWeight: 500 }}>{lead.next_action}</span>
            {lead.next_action_date && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>· {lead.next_action_date}</span>}
          </div>
        )}
      </div>

      {editing ? (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Lead Name</label>
              <input className="input" value={form.lead_name || ''} onChange={(e) => set('lead_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Stage</label>
              <select className="select" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                {LEAD_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="select" value={form.priority || ''} onChange={(e) => set('priority', e.target.value)}>
                {(PRIORITIES || ['High', 'Medium', 'Low']).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {[['address','Address'],['submarket','Submarket'],['owner','Owner'],['company','Company'],['decision_maker','Decision Maker'],['phone','Phone'],['email','Email'],['next_action','Next Action'],['next_action_date','Next Action Date'],['score','Score (0-100)'],['est_value','Est. Value ($)']].map(([f, l]) => (
              <div key={f} className="form-group">
                <label className="form-label">{l}</label>
                <input className="input" type={['score','est_value'].includes(f) ? 'number' : f === 'next_action_date' ? 'date' : 'text'} value={form[f] || ''} onChange={(e) => set(f, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Notes / Intel</label>
            <textarea className="textarea" rows={4} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Contact Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="Decision Maker" value={lead.decision_maker} />
              <Field label="Company" value={lead.company} />
              <Field label="Owner / Entity" value={lead.owner} />
              <Field label="Phone" value={lead.phone} mono />
              <Field label="Email" value={lead.email} />
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Scoring</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="Score" value={lead.score != null ? String(lead.score) : null} />
              <Field label="Tier" value={lead.tier} />
              <Field label="Priority" value={lead.priority} />
              <Field label="Est. Value" value={lead.est_value ? fmt.price(lead.est_value) : null} />
              <Field label="Building SF" value={lead.building_sf ? lead.building_sf.toLocaleString() + ' SF' : null} />
            </div>
          </div>
        </div>
      )}

      {/* Intel/Notes */}
      {lead.notes && !editing && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Intel / Why They'll Sell</h3>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{lead.notes}</div>
        </div>
      )}

      {/* Catalyst tags */}
      {lead.catalyst_tags?.length > 0 && !editing && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Catalyst Tags</h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {lead.catalyst_tags.map((tag) => <span key={tag} className="tag tag-amber" style={{ fontSize: '11px' }}>{tag}</span>)}
          </div>
        </div>
      )}

      {/* Substeps + AI Next Step */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Substeps — {lead.stage} ({subsDone}/{subs.length})
            </h3>
          </div>
          {subs.length > 0 ? (
            <>
              <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ width: `${subs.length > 0 ? Math.round(subsDone / subs.length * 100) : 0}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px', transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {subs.map((step) => {
                  const checked = substeps[step] || false;
                  return (
                    <div key={step} onClick={() => toggleSub(step)} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '4px 0', cursor: 'pointer' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, border: '2px solid', borderColor: checked ? 'var(--accent)' : 'var(--border)', background: checked ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700 }}>{checked ? '✓' : ''}</div>
                      <span style={{ fontSize: '13px', color: checked ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checked ? 'line-through' : 'none' }}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No substeps defined for this stage</div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>AI Next Step</h3>
          <button className="btn btn-ghost" onClick={handleAI} disabled={aiLoading} style={{ width: '100%', marginBottom: '12px', color: 'var(--amber)', borderColor: 'var(--amber)' }}>
            {aiLoading ? 'Thinking...' : 'Get AI Recommendation'}
          </button>
          {aiStep && (
            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', borderLeft: '3px solid var(--amber)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--amber)', marginBottom: '4px' }}>{aiStep}</div>
            </div>
          )}
          {!aiStep && lead.next_action && (
            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Current Next Action</div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{lead.next_action}</div>
              {lead.next_action_date && <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>Due: {lead.next_action_date}</div>}
            </div>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{ display: 'block', textAlign: 'center', marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'var(--accent-soft)', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: '14px', border: '1px solid var(--accent)' }}>
              Call {lead.decision_maker || 'Contact'} — {lead.phone}
            </a>
          )}
        </div>
      </div>

      {/* Linked property */}
      {linkedProperty && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Linked Property</h3>
          <div onClick={() => onPropertyClick && onPropertyClick(linkedProperty)} style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{linkedProperty.address}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {linkedProperty.submarket} · {linkedProperty.building_sf ? linkedProperty.building_sf.toLocaleString() + ' SF' : ''} · {linkedProperty.owner}
            </div>
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tasks {pendingTasks > 0 && <span style={{ color: '#ef4444' }}>({pendingTasks} pending)</span>}
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onAddTask?.(lead.id)}>+ Task</button>
        </div>
        {linkedTasks.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No tasks yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {linkedTasks.sort((a, b) => a.completed - b.completed).map((t) => {
              const pc = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }[t.priority] || '#6b7280';
              const overdue = !t.completed && t.due_date && new Date(t.due_date) < new Date();
              return (
                <div key={t.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '6px', borderLeft: `3px solid ${t.completed ? 'var(--border)' : pc}`, opacity: t.completed ? 0.6 : 1 }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, marginTop: '2px', border: '2px solid', borderColor: t.completed ? 'var(--accent)' : pc, background: t.completed ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px' }}>{t.completed ? '✓' : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>
                    {t.due_date && <div style={{ fontSize: '11px', color: overdue ? 'var(--red)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{overdue ? '⚠ ' : ''}{t.due_date}</div>}
                  </div>
                  <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: pc + '22', color: pc, flexShrink: 0 }}>{t.priority}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activities */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activities ({linkedActivities.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onAddActivity && onAddActivity(lead.id)}>+ Log</button>
        </div>
        {linkedActivities.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No activities yet — log your first call</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {linkedActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((a) => (
              <div key={a.id} style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px', opacity: a.completed ? 0.6 : 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                  <span className="tag tag-blue" style={{ fontSize: '10px' }}>{a.activity_type}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{a.subject}</span>
                  {a.outcome && <span className="tag tag-ghost" style={{ fontSize: '10px' }}>{a.outcome}</span>}
                </div>
                {a.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.notes}</div>}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{a.activity_date}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
