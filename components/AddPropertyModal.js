'use client';

import { useState } from 'react';
import { MARKETS, SUBMARKETS, RECORD_TYPES, PROP_TYPES, VACANCY_STATUS, OWNER_TYPES, LEASE_TYPES, CATALYST_TAGS, fmt } from '../lib/constants';
import { insertProperty } from '../lib/db';

export default function AddPropertyModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    address: '', city: '', zip: '', market: '', submarket: '',
    record_type: 'Building', prop_type: '', building_sf: '', land_acres: '',
    year_built: '', clear_height: '', dock_doors: '', grade_doors: '', office_pct: '',
    owner: '', owner_type: '', vacancy_status: '', tenant: '',
    lease_type: '', lease_expiration: '', in_place_rent: '',
    catalyst_tags: [], probability: '', notes: '', onedrive_url: '',
  });
  const [apns, setApns] = useState([{ apn: '', acres: '' }]);
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));
  const availableSubmarkets = form.market ? (SUBMARKETS[form.market] || []) : [];

  const toggleCatalyst = (tag) => {
    setForm((f) => ({
      ...f,
      catalyst_tags: f.catalyst_tags.includes(tag)
        ? f.catalyst_tags.filter((t) => t !== tag)
        : [...f.catalyst_tags, tag],
    }));
  };

  const updateApn = (i, field, val) => {
    const next = [...apns];
    next[i] = { ...next[i], [field]: val };
    setApns(next);
  };

  const addApn = () => setApns([...apns, { apn: '', acres: '' }]);
  const removeApn = (i) => setApns(apns.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.address) return;
    setSaving(true);
    try {
      // Only include fields that exist in the new schema
      const propData = {
        address: form.address,
        city: form.city,
        zip: form.zip,
        submarket: form.submarket,
        record_type: form.record_type,
        prop_type: form.prop_type,
        building_sf: form.building_sf ? parseInt(form.building_sf) : null,
        land_acres: form.land_acres ? parseFloat(form.land_acres) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        clear_height: form.clear_height ? parseInt(form.clear_height) : null,
        dock_doors: form.dock_doors ? parseInt(form.dock_doors) : null,
        grade_doors: form.grade_doors ? parseInt(form.grade_doors) : null,
        owner: form.owner,
        owner_type: form.owner_type,
        tenant: form.tenant,
        vacancy_status: form.vacancy_status,
        lease_expiration: form.lease_expiration || null,
        catalyst_tags: form.catalyst_tags,
        probability: form.probability ? parseInt(form.probability) : null,
        notes: form.notes,
        onedrive_url: form.onedrive_url || null,
      };
      const validApns = apns.filter((a) => a.apn.trim()).map((a) => ({
        apn: a.apn.trim(),
        acres: a.acres ? parseFloat(a.acres) : null,
      }));
      await insertProperty(propData, validApns);
      onSave();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Property</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Location */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '10px' }}>Location</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Address *</label>
              <input className="input" placeholder="918 Radecki Ct" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="input" placeholder="City of Industry" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">ZIP</label>
              <input className="input" placeholder="91748" value={form.zip} onChange={(e) => set('zip', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Market</label>
              <select className="select" value={form.market} onChange={(e) => { set('market', e.target.value); set('submarket', ''); }}>
                <option value="">Select</option>
                {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Submarket</label>
              <select className="select" value={form.submarket} onChange={(e) => set('submarket', e.target.value)}>
                <option value="">Select</option>
                {availableSubmarkets.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* APNs */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '16px', marginBottom: '10px' }}>
            Parcels / APNs
          </div>
          {apns.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
              <input className="input" placeholder="XXXX-XXX-XXX" value={a.apn} onChange={(e) => updateApn(i, 'apn', e.target.value)} style={{ flex: 2 }} />
              <input className="input" placeholder="Acres" value={a.acres} onChange={(e) => updateApn(i, 'acres', e.target.value)} style={{ flex: 1 }} />
              {apns.length > 1 && (
                <button className="btn btn-ghost btn-sm" onClick={() => removeApn(i)}>×</button>
              )}
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addApn} style={{ marginBottom: '16px' }}>+ Add APN</button>

          {/* Physical */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '8px', marginBottom: '10px' }}>Physical</div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Record Type</label>
              <select className="select" value={form.record_type} onChange={(e) => set('record_type', e.target.value)}>
                {RECORD_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Property Type</label>
              <select className="select" value={form.prop_type} onChange={(e) => set('prop_type', e.target.value)}>
                <option value="">Select</option>
                {PROP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Building SF</label>
              <input className="input" type="number" placeholder="115621" value={form.building_sf} onChange={(e) => set('building_sf', e.target.value)} />
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Land (acres)</label>
              <input className="input" type="number" step="0.01" placeholder="6.10" value={form.land_acres} onChange={(e) => set('land_acres', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Clear Height (ft)</label>
              <input className="input" type="number" placeholder="32" value={form.clear_height} onChange={(e) => set('clear_height', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Year Built</label>
              <input className="input" type="number" placeholder="1990" value={form.year_built} onChange={(e) => set('year_built', e.target.value)} />
            </div>
          </div>

          {/* Ownership + Tenancy */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '16px', marginBottom: '10px' }}>Ownership & Tenancy</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Owner</label>
              <input className="input" placeholder="Owner name" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Owner Type</label>
              <select className="select" value={form.owner_type} onChange={(e) => set('owner_type', e.target.value)}>
                <option value="">Select</option>
                {OWNER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Vacancy Status</label>
              <select className="select" value={form.vacancy_status} onChange={(e) => set('vacancy_status', e.target.value)}>
                <option value="">Select</option>
                {VACANCY_STATUS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tenant</label>
              <input className="input" placeholder="Tenant name" value={form.tenant} onChange={(e) => set('tenant', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Lease Type</label>
              <select className="select" value={form.lease_type} onChange={(e) => set('lease_type', e.target.value)}>
                <option value="">Select</option>
                {LEASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Intelligence */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '16px', marginBottom: '10px' }}>Intelligence</div>
          <div className="form-group">
            <label className="form-label">Catalyst Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATALYST_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag ${form.catalyst_tags.includes(tag) ? 'tag-amber' : 'tag-ghost'}`}
                  style={{ cursor: 'pointer', border: 'none', fontSize: '15px' }}
                  onClick={() => toggleCatalyst(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Probability %</label>
              <input className="input" type="number" min="0" max="100" placeholder="72" value={form.probability} onChange={(e) => set('probability', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">In-Place Rent ($/SF/Mo)</label>
              <input className="input" type="number" step="0.01" placeholder="1.05" value={form.in_place_rent} onChange={(e) => set('in_place_rent', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" placeholder="Notes, context, call history..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">OneDrive Folder Link</label>
            <input className="input" placeholder="https://collaborateicg-my.sharepoint.com/..." value={form.onedrive_url} onChange={(e) => set('onedrive_url', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.address}>
            {saving ? 'Saving...' : 'Add Property'}
          </button>
        </div>
      </div>
    </div>
  );
}
