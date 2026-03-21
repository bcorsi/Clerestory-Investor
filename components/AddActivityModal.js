'use client';

import { useState } from 'react';
import { ACTIVITY_TYPES, ACTIVITY_OUTCOMES } from '../lib/constants';
import { insertRow } from '../lib/db';

export default function AddActivityModal({ onClose, onSave, defaultLeadId, defaultDealId, defaultPropertyId, defaultContactId, leads, deals, properties, contacts }) {
  const [form, setForm] = useState({
    activity_type: 'Call',
    subject: '',
    notes: '',
    activity_date: new Date().toISOString().split('T')[0],
    due_date: '',
    completed: false,
    outcome: '',
    lead_id: defaultLeadId || '',
    deal_id: defaultDealId || '',
    property_id: defaultPropertyId || '',
    contact_id: defaultContactId || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.subject.trim()) return;
    setSaving(true);
    try {
      await insertRow('activities', {
        ...form,
        lead_id: form.lead_id || null,
        deal_id: form.deal_id || null,
        property_id: form.property_id || null,
        contact_id: form.contact_id || null,
        due_date: form.due_date || null,
        activity_date: form.activity_date || new Date().toISOString().split('T')[0],
      });
      onSave();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Log Activity</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Type selector */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('activity_type', t)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: '1px solid',
                    cursor: 'pointer',  fontWeight: 500, transition: 'all 0.15s',
                    background: form.activity_type === t ? 'var(--accent)' : 'transparent',
                    borderColor: form.activity_type === t ? 'var(--accent)' : 'var(--border)',
                    color: form.activity_type === t ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {t === 'Call' ? '📞' : t === 'Email' ? '✉️' : t === 'Meeting' ? '🤝' : '✓'} {t}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input
              className="input"
              placeholder={form.activity_type === 'Call' ? 'Called re: SLB opportunity' : form.activity_type === 'Email' ? 'Sent intro email' : form.activity_type === 'Meeting' ? 'Meeting with owner' : 'Follow up on proposal'}
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{form.activity_type === 'To-Do' ? 'Due Date' : 'Date'}</label>
              <input
                className="input"
                type="date"
                value={form.activity_type === 'To-Do' ? form.due_date : form.activity_date}
                onChange={(e) => set(form.activity_type === 'To-Do' ? 'due_date' : 'activity_date', e.target.value)}
              />
            </div>
            {form.activity_type !== 'To-Do' && (
              <div className="form-group">
                <label className="form-label">Outcome</label>
                <select className="select" value={form.outcome} onChange={(e) => set('outcome', e.target.value)}>
                  <option value="">Select</option>
                  {ACTIVITY_OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Link to record */}
          <div style={{  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', margin: '4px 0 10px' }}>
            Link To (optional)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {leads && leads.length > 0 && (
              <div className="form-group">
                <label className="form-label">Lead</label>
                <select className="select" value={form.lead_id} onChange={(e) => set('lead_id', e.target.value)}>
                  <option value="">None</option>
                  {leads.filter(l => l.stage !== 'Converted').map((l) => (
                    <option key={l.id} value={l.id}>{l.lead_name}</option>
                  ))}
                </select>
              </div>
            )}
            {deals && deals.length > 0 && (
              <div className="form-group">
                <label className="form-label">Deal</label>
                <select className="select" value={form.deal_id} onChange={(e) => set('deal_id', e.target.value)}>
                  <option value="">None</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>{d.deal_name}</option>
                  ))}
                </select>
              </div>
            )}
            {properties && properties.length > 0 && (
              <div className="form-group">
                <label className="form-label">Property</label>
                <select className="select" value={form.property_id} onChange={(e) => set('property_id', e.target.value)}>
                  <option value="">None</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
                </select>
              </div>
            )}
            {contacts && contacts.length > 0 && (
              <div className="form-group">
                <label className="form-label">Contact</label>
                <select className="select" value={form.contact_id} onChange={(e) => set('contact_id', e.target.value)}>
                  <option value="">None</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="What happened, what was said, next steps..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          {form.activity_type === 'To-Do' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="completed"
                checked={form.completed}
                onChange={(e) => set('completed', e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="completed" style={{  color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Mark as completed
              </label>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.subject.trim()}>
            {saving ? 'Saving...' : 'Log Activity'}
          </button>
        </div>
      </div>
    </div>
  );
}
