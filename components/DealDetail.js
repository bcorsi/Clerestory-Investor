'use client';

import { useState } from 'react';
import { DEAL_STAGES, STAGE_COLORS, DEAL_TYPES, STRATEGIES, fmt } from '../lib/constants';
import { updateRow } from '../lib/db';

export default function DealDetail({ deal, activities, tasks, properties, contacts, onRefresh, showToast, onPropertyClick, onAddActivity, onAddTask }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...deal });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => {
    const updated = { ...f, [field]: val };
    if ((field === 'deal_value' || field === 'commission_rate') && updated.deal_value && updated.commission_rate) {
      updated.commission_est = (parseFloat(updated.deal_value) * parseFloat(updated.commission_rate) / 100).toFixed(0);
    }
    return updated;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRow('deals', deal.id, {
        deal_name: form.deal_name, stage: form.stage, deal_type: form.deal_type,
        strategy: form.strategy, address: form.address, submarket: form.submarket,
        buyer: form.buyer, seller: form.seller, tenant_name: form.tenant_name,
        deal_value: form.deal_value ? parseFloat(form.deal_value) : null,
        commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : null,
        commission_est: form.commission_est ? parseFloat(form.commission_est) : null,
        probability: form.probability ? parseInt(form.probability) : null,
        close_date: form.close_date || null,
        notes: form.notes,
      });
      onRefresh();
      setEditing(false);
      showToast('Deal updated');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const linkedActivities = activities.filter((a) => a.deal_id === deal.id);
  const linkedTasks = (tasks || []).filter((t) => t.deal_id === deal.id);
  const pendingTasks = linkedTasks.filter((t) => !t.completed).length;
  const linkedProperty = properties.find((p) => p.id === deal.property_id || p.address === deal.address);

  const stageColor = STAGE_COLORS[deal.stage] || '#6b7280';

  const Field = ({ label, value, mono, highlight }) => (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: highlight ? 'var(--accent)' : value ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', fontWeight: highlight ? 700 : 400 }}>{value || '—'}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{deal.deal_name}</h2>
              <span style={{ padding: '3px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600, background: stageColor + '22', color: stageColor }}>
                {deal.stage}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {deal.address}{deal.submarket ? ` · ${deal.submarket}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onAddActivity && onAddActivity(null, deal.id)}>+ Activity</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
          </div>
        </div>

        {/* Financials strip */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {deal.deal_value && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Deal Value</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>{fmt.price(deal.deal_value)}</div>
            </div>
          )}
          {deal.commission_est && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Est. Commission</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>{fmt.price(deal.commission_est)}</div>
            </div>
          )}
          {deal.probability != null && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Probability</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{deal.probability}%</div>
            </div>
          )}
          {deal.close_date && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Est. Close</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{deal.close_date}</div>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Deal Name</label>
              <input className="input" value={form.deal_name || ''} onChange={(e) => set('deal_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Stage</label>
              <select className="select" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                {DEAL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Deal Type</label>
              <select className="select" value={form.deal_type || ''} onChange={(e) => set('deal_type', e.target.value)}>
                <option value="">Select</option>
                {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {[['buyer','Buyer'],['seller','Seller'],['tenant_name','Tenant'],['deal_value','Deal Value ($)'],['commission_rate','Commission Rate (%)'],['probability','Probability (%)'],['close_date','Close Date']].map(([f, l]) => (
              <div key={f} className="form-group">
                <label className="form-label">{l}</label>
                <input className="input" type={['deal_value','commission_rate','probability'].includes(f) ? 'number' : f === 'close_date' ? 'date' : 'text'} value={form[f] || ''} onChange={(e) => set(f, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Notes</label>
            <textarea className="textarea" rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Deal Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Type" value={deal.deal_type} />
              <Field label="Strategy" value={deal.strategy} />
              <Field label="Buyer" value={deal.buyer} />
              <Field label="Seller" value={deal.seller} />
              <Field label="Tenant" value={deal.tenant_name} />
              <Field label="Commission Rate" value={deal.commission_rate ? `${deal.commission_rate}%` : null} />
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Notes</h3>
            <div style={{ fontSize: '13px', color: deal.notes ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.7 }}>{deal.notes || 'No notes'}</div>
          </div>
        </div>
      )}

      {/* Linked property */}
      {linkedProperty && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Property</h3>
          <div onClick={() => onPropertyClick && onPropertyClick(linkedProperty)} style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{linkedProperty.address}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {linkedProperty.submarket} · {linkedProperty.building_sf ? fmt.sf(linkedProperty.building_sf) : ''} · {linkedProperty.owner}
            </div>
          </div>
        </div>
      )}

      {/* Stage pipeline progress */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Pipeline Stage</h3>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap' }}>
          {DEAL_STAGES.filter(s => s !== 'Dead').map((s, i) => {
            const isActive = s === deal.stage;
            const isPast = DEAL_STAGES.indexOf(s) < DEAL_STAGES.indexOf(deal.stage);
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <div style={{
                  padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: isActive ? 700 : 500,
                  background: isActive ? STAGE_COLORS[s] : isPast ? STAGE_COLORS[s] + '44' : 'var(--bg-input)',
                  color: isActive ? 'white' : isPast ? STAGE_COLORS[s] : 'var(--text-muted)',
                  border: `1px solid ${isActive ? STAGE_COLORS[s] : 'var(--border)'}`,
                  whiteSpace: 'nowrap',
                }}>
                  {s}
                </div>
                {i < DEAL_STAGES.filter(s => s !== 'Dead').length - 1 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>›</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tasks {pendingTasks > 0 && <span style={{ color: '#ef4444' }}>({pendingTasks} pending)</span>}
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onAddTask?.(deal.id)}>+ Task</button>
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
          <button className="btn btn-ghost btn-sm" onClick={() => onAddActivity && onAddActivity(null, deal.id)}>+ Log</button>
        </div>
        {linkedActivities.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No activities yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {linkedActivities.map((a) => (
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
