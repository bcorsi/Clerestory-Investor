'use client';

import { useState } from 'react';
import { TASK_PRIORITIES } from '../lib/constants';
import { insertRow } from '../lib/db';

export default function AddTaskModal({ onClose, onSave, defaultLeadId, defaultDealId, defaultPropertyId, defaultContactId, leads, deals, properties, contacts }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'High',
    lead_id: defaultLeadId || '',
    deal_id: defaultDealId || '',
    property_id: defaultPropertyId || '',
    contact_id: defaultContactId || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await insertRow('tasks', {
        ...form,
        lead_id: form.lead_id || null,
        deal_id: form.deal_id || null,
        property_id: form.property_id || null,
        contact_id: form.contact_id || null,
        due_date: form.due_date || null,
      });
      onSave();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const priorityColor = (p) => ({ High: 'var(--rust)', Medium: 'var(--amber)', Low: 'var(--ink3)' }[p]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Task</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Task *</label>
            <input className="input" placeholder="Call Jerry Kohl re: SLB opportunity" value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {TASK_PRIORITIES.map((p) => (
                  <button key={p} type="button" onClick={() => set('priority', p)} style={{
                    flex: 1, padding: '6px 4px', borderRadius: '6px', border: '1px solid', cursor: 'pointer',
                     fontWeight: 500, transition: 'all 0.15s',
                    background: form.priority === p ? priorityColor(p) : 'transparent',
                    borderColor: form.priority === p ? priorityColor(p) : 'var(--border)',
                    color: form.priority === p ? 'white' : 'var(--text-muted)',
                  }}>{p}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="input" type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="input" placeholder="Optional details..." value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {/* Link to record */}
          <div style={{  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', margin: '4px 0 8px' }}>Link To (optional)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {leads?.length > 0 && (
              <div className="form-group">
                <label className="form-label">Lead</label>
                <select className="select" value={form.lead_id} onChange={(e) => set('lead_id', e.target.value)}>
                  <option value="">None</option>
                  {leads.filter(l => l.stage !== 'Converted').map((l) => <option key={l.id} value={l.id}>{l.lead_name}</option>)}
                </select>
              </div>
            )}
            {deals?.length > 0 && (
              <div className="form-group">
                <label className="form-label">Deal</label>
                <select className="select" value={form.deal_id} onChange={(e) => set('deal_id', e.target.value)}>
                  <option value="">None</option>
                  {deals.map((d) => <option key={d.id} value={d.id}>{d.deal_name}</option>)}
                </select>
              </div>
            )}
            {properties?.length > 0 && (
              <div className="form-group">
                <label className="form-label">Property</label>
                <select className="select" value={form.property_id} onChange={(e) => set('property_id', e.target.value)}>
                  <option value="">None</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
              </div>
            )}
            {contacts?.length > 0 && (
              <div className="form-group">
                <label className="form-label">Contact</label>
                <select className="select" value={form.contact_id} onChange={(e) => set('contact_id', e.target.value)}>
                  <option value="">None</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? 'Saving...' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
