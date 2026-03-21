'use client';

import { useState } from 'react';
import { CONTACT_TYPES } from '../lib/constants';
import { insertRow } from '../lib/db';

export default function AddContactModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', company: '', title: '', contact_type: '',
    phone: '', email: '', linkedin: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await insertRow('contacts', form);
      onSave();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Contact</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="input" placeholder="David Chen" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="select" value={form.contact_type} onChange={(e) => set('contact_type', e.target.value)}>
                <option value="">Select</option>
                {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="input" value={form.company} onChange={(e) => set('company', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="input" placeholder="(626) 555-0101" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>
            {saving ? 'Saving...' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}
