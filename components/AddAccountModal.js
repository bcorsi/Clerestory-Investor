'use client';

import { useState } from 'react';
import { ACCOUNT_TYPES } from '../lib/constants';
import { MARKETS } from '../lib/constants';
import { insertRow } from '../lib/db';

export default function AddAccountModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', account_type: '', market: '', city: '',
    phone: '', email: '', website: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await insertRow('accounts', form);
      onSave();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const markets = MARKETS || ['SGV', 'IE', 'LA', 'OC', 'Ventura', 'National', 'Other'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Account</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Company Name *</label>
              <input
                className="input"
                placeholder="Bridge Industrial"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="select" value={form.account_type} onChange={(e) => set('account_type', e.target.value)}>
                <option value="">Select</option>
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Market</label>
              <select className="select" value={form.market} onChange={(e) => set('market', e.target.value)}>
                <option value="">Select</option>
                {markets.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">City / HQ</label>
              <input className="input" placeholder="Chicago" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="input" placeholder="(312) 555-0100" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Website</label>
            <input className="input" placeholder="example.com" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" rows={3} placeholder="Active SGV buyer. Focus on Class A distribution..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving...' : 'Add Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
