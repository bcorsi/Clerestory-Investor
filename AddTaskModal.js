'use client';

import { useState } from 'react';
import { LEAD_STAGES, LEAD_TIERS, PRIORITIES, CATALYST_TAGS, SUBMARKETS } from '../lib/constants';
import { insertRow } from '../lib/db';

export default function AddLeadModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    lead_name: '', stage: 'Lead', address: '', submarket: '',
    owner: '', owner_type: '', company: '',
    decision_maker: '', phone: '', email: '',
    catalyst_tags: [], tier: '', score: '', priority: 'High',
    next_action: '', next_action_date: '',
    est_value: '', building_sf: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const toggleCatalyst = (tag) => {
    setForm((f) => ({
      ...f,
      catalyst_tags: f.catalyst_tags.includes(tag)
        ? f.catalyst_tags.filter((t) => t !== tag)
        : [...f.catalyst_tags, tag],
    }));
  };

  const handleSave = async () => {
    if (!form.lead_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        score: form.score ? parseInt(form.score) : null,
        est_value: form.est_value ? parseFloat(form.est_value) : null,
        building_sf: form.building_sf ? parseInt(form.building_sf) : null,
      };
      await insertRow('leads', payload);
      onSave();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const allSubmarkets = Object.values(SUBMARKETS || {}).flat();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Lead</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Lead name + stage */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Lead Name *</label>
              <input className="input" placeholder="Leegin Creative Leather Products" value={form.lead_name} onChange={(e) => set('lead_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Stage</label>
              <select className="select" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                {LEAD_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Address + submarket */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Property Address</label>
              <input className="input" placeholder="14022 Nelson Ave E" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Submarket</label>
              <input className="input" placeholder="City of Industry" value={form.submarket} onChange={(e) => set('submarket', e.target.value)} />
            </div>
          </div>

          {/* Owner + company */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Owner / Entity</label>
              <input className="input" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="input" value={form.company} onChange={(e) => set('company', e.target.value)} />
            </div>
          </div>

          {/* Decision maker + contact */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Decision Maker</label>
              <input className="input" placeholder="Jerry Kohl (Founder/President)" value={form.decision_maker} onChange={(e) => set('decision_maker', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="input" placeholder="(626) 961-9381" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Building SF</label>
              <input className="input" type="number" placeholder="108000" value={form.building_sf} onChange={(e) => set('building_sf', e.target.value)} />
            </div>
          </div>

          {/* Tier + score + priority */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tier</label>
              <select className="select" value={form.tier} onChange={(e) => set('tier', e.target.value)}>
                <option value="">Select</option>
                {LEAD_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Score (0–100)</label>
              <input className="input" type="number" min="0" max="100" value={form.score} onChange={(e) => set('score', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {(PRIORITIES || ['High', 'Medium', 'Low']).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Next action */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Next Action</label>
              <input className="input" placeholder="CALL NOW" value={form.next_action} onChange={(e) => set('next_action', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Next Action Date</label>
              <input className="input" type="date" value={form.next_action_date} onChange={(e) => set('next_action_date', e.target.value)} />
            </div>
          </div>

          {/* Est value */}
          <div className="form-group">
            <label className="form-label">Est. Deal Value ($)</label>
            <input className="input" type="number" placeholder="15000000" value={form.est_value} onChange={(e) => set('est_value', e.target.value)} />
          </div>

          {/* Catalyst tags */}
          <div className="form-group">
            <label className="form-label">Catalyst Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {(CATALYST_TAGS || []).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleCatalyst(tag)}
                  style={{
                    fontSize: '15px', padding: '3px 8px', borderRadius: '4px', border: '1px solid',
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: form.catalyst_tags.includes(tag) ? 'var(--accent)' : 'transparent',
                    borderColor: form.catalyst_tags.includes(tag) ? 'var(--accent)' : 'var(--border)',
                    color: form.catalyst_tags.includes(tag) ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes / Intel</label>
            <textarea className="textarea" rows={3} placeholder="Why they'll sell, comp evidence, key intel..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.lead_name.trim()}>
            {saving ? 'Saving...' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
