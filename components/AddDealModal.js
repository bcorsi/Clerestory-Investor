'use client';

import { useState } from 'react';
import { DEAL_STAGES, DEAL_TYPES, STRATEGIES, PRIORITIES, MARKETING_TYPES, MARKETS, SUBMARKETS } from '../lib/constants';
import { insertRow } from '../lib/db';

export default function AddDealModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    deal_name: '', stage: 'Tracking', deal_type: '', strategy: '',
    marketing_type: 'Off-Market',
    address: '', submarket: '', buyer: '', seller: '',
    deal_value: '', commission_rate: '', probability: '',
    close_date: '', priority: 'Medium', notes: '', onedrive_url: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.deal_name) return;
    setSaving(true);
    try {
      const data = {
        deal_name: form.deal_name,
        stage: form.stage,
        deal_type: form.deal_type,
        strategy: form.strategy,
        address: form.address,
        submarket: form.submarket,
        buyer: form.buyer || null,
        seller: form.seller || null,
        tenant_name: form.tenant_name || null,
        deal_value: form.deal_value ? parseFloat(form.deal_value) : null,
        commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : null,
        commission_est: form.deal_value && form.commission_rate
          ? parseFloat(form.deal_value) * parseFloat(form.commission_rate) / 100
          : null,
        probability: form.probability ? parseInt(form.probability) : null,
        priority: form.priority || 'Medium',
        marketing_type: form.marketing_type || 'Off-Market',
        close_date: form.close_date || null,
        onedrive_url: form.onedrive_url || null,
        notes: form.notes || null,
      };
      await insertRow('deals', data);
      onSave();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Deal</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Deal Name *</label>
            <input className="input" placeholder="918 Radecki Ct — SLB — Bridge" value={form.deal_name} onChange={(e) => set('deal_name', e.target.value)} />
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Stage</label>
              <select className="select" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                {DEAL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Deal Type</label>
              <select className="select" value={form.deal_type} onChange={(e) => set('deal_type', e.target.value)}>
                <option value="">Select</option>
                {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Strategy</label>
              <select className="select" value={form.strategy} onChange={(e) => set('strategy', e.target.value)}>
                <option value="">Select</option>
                {STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="input" placeholder="918 Radecki Ct" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Submarket</label>
              <input className="input" placeholder="City of Industry" value={form.submarket} onChange={(e) => set('submarket', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Buyer</label>
              <input className="input" value={form.buyer} onChange={(e) => set('buyer', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Seller</label>
              <input className="input" value={form.seller} onChange={(e) => set('seller', e.target.value)} />
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Deal Value ($)</label>
              <input className="input" type="number" placeholder="31400000" value={form.deal_value} onChange={(e) => set('deal_value', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Commission Rate (%)</label>
              <input className="input" type="number" step="0.1" placeholder="2.0" value={form.commission_rate} onChange={(e) => set('commission_rate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Probability %</label>
              <input className="input" type="number" min="0" max="100" placeholder="72" value={form.probability} onChange={(e) => set('probability', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Close Date</label>
              <input className="input" type="date" value={form.close_date} onChange={(e) => set('close_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">OneDrive Folder Link</label>
            <input className="input" placeholder="https://collaborateicg-my.sharepoint.com/..." value={form.onedrive_url} onChange={(e) => set('onedrive_url', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.deal_name}>
            {saving ? 'Saving...' : 'Add Deal'}
          </button>
        </div>
      </div>
    </div>
  );
}
