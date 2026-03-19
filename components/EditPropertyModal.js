'use client';

import { useState } from 'react';
import { MARKETS, SUBMARKETS, RECORD_TYPES, PROP_TYPES, VACANCY_STATUS, OWNER_TYPES, LEASE_TYPES, CATALYST_TAGS } from '../lib/constants';
import { updateRow } from '../lib/db';

export default function EditPropertyModal({ property, onClose, onSave }) {
  const [form, setForm] = useState({
    address: property.address || '',
    city: property.city || '',
    zip: property.zip || '',
    market: property.market || '',
    submarket: property.submarket || '',
    record_type: property.record_type || 'Building',
    prop_type: property.prop_type || '',
    building_sf: property.building_sf || '',
    land_acres: property.land_acres || '',
    year_built: property.year_built || '',
    clear_height: property.clear_height || '',
    dock_doors: property.dock_doors ?? '',
    grade_doors: property.grade_doors ?? '',
    office_pct: property.office_pct ?? '',
    owner: property.owner || '',
    owner_type: property.owner_type || '',
    vacancy_status: property.vacancy_status || '',
    tenant: property.tenant || '',
    lease_type: property.lease_type || '',
    lease_expiration: property.lease_expiration || '',
    in_place_rent: property.in_place_rent || '',
    market_rent: property.market_rent || '',
    catalyst_tags: property.catalyst_tags || [],
    probability: property.probability ?? '',
    ai_score: property.ai_score ?? '',
    notes: property.notes || '',
    onedrive_url: property.onedrive_url || '',
  });
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        address: form.address || null,
        city: form.city || null,
        zip: form.zip || null,
        market: form.market || null,
        submarket: form.submarket || null,
        record_type: form.record_type || null,
        prop_type: form.prop_type || null,
        building_sf: form.building_sf ? parseInt(form.building_sf) : null,
        land_acres: form.land_acres ? parseFloat(form.land_acres) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        clear_height: form.clear_height ? parseInt(form.clear_height) : null,
        dock_doors: form.dock_doors !== '' ? parseInt(form.dock_doors) : null,
        grade_doors: form.grade_doors !== '' ? parseInt(form.grade_doors) : null,
        office_pct: form.office_pct !== '' ? parseInt(form.office_pct) : null,
        owner: form.owner || null,
        owner_type: form.owner_type || null,
        vacancy_status: form.vacancy_status || null,
        tenant: form.tenant || null,
        lease_type: form.lease_type || null,
        lease_expiration: form.lease_expiration || null,
        in_place_rent: form.in_place_rent ? parseFloat(form.in_place_rent) : null,
        market_rent: form.market_rent ? parseFloat(form.market_rent) : null,
        catalyst_tags: form.catalyst_tags,
        probability: form.probability !== '' ? parseInt(form.probability) : null,
        ai_score: form.ai_score !== '' ? parseInt(form.ai_score) : null,
        notes: form.notes || null,
        onedrive_url: form.onedrive_url || null,
      };
      await updateRow('properties', property.id, updates);
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
          <h2>Edit Property</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Location */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '10px' }}>Location</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">ZIP</label>
              <input className="input" value={form.zip} onChange={(e) => set('zip', e.target.value)} />
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
              <input className="input" list="submarkets-list" value={form.submarket} onChange={(e) => set('submarket', e.target.value)} placeholder="Type or select..." />
              <datalist id="submarkets-list">
                {availableSubmarkets.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          {/* Physical */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '16px', marginBottom: '10px' }}>Physical</div>
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
              <input className="input" type="number" value={form.building_sf} onChange={(e) => set('building_sf', e.target.value)} />
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Land (acres)</label>
              <input className="input" type="number" step="0.01" value={form.land_acres} onChange={(e) => set('land_acres', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Clear Height (ft)</label>
              <input className="input" type="number" value={form.clear_height} onChange={(e) => set('clear_height', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Year Built</label>
              <input className="input" type="number" value={form.year_built} onChange={(e) => set('year_built', e.target.value)} />
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Dock Doors</label>
              <input className="input" type="number" value={form.dock_doors} onChange={(e) => set('dock_doors', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Grade Doors</label>
              <input className="input" type="number" value={form.grade_doors} onChange={(e) => set('grade_doors', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Office %</label>
              <input className="input" type="number" value={form.office_pct} onChange={(e) => set('office_pct', e.target.value)} />
            </div>
          </div>

          {/* Ownership & Tenancy */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '16px', marginBottom: '10px' }}>Ownership & Tenancy</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Owner</label>
              <input className="input" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
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
              <input className="input" value={form.tenant} onChange={(e) => set('tenant', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Lease Type</label>
              <select className="select" value={form.lease_type} onChange={(e) => set('lease_type', e.target.value)}>
                <option value="">Select</option>
                {LEASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Lease Expiration</label>
              <input className="input" type="date" value={form.lease_expiration} onChange={(e) => set('lease_expiration', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">In-Place Rent ($/SF/Mo)</label>
              <input className="input" type="number" step="0.01" value={form.in_place_rent} onChange={(e) => set('in_place_rent', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Market Rent ($/SF/Mo)</label>
              <input className="input" type="number" step="0.01" value={form.market_rent} onChange={(e) => set('market_rent', e.target.value)} />
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
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Probability %</label>
              <input className="input" type="number" min="0" max="100" value={form.probability} onChange={(e) => set('probability', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">AI Score</label>
              <input className="input" type="number" value={form.ai_score} onChange={(e) => set('ai_score', e.target.value)} />
            </div>
            <div></div>
          </div>

          {/* Links */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '16px', marginBottom: '10px' }}>Links</div>
          <div className="form-group">
            <label className="form-label">OneDrive Folder Link</label>
            <input className="input" placeholder="https://collaborateicg-my.sharepoint.com/..." value={form.onedrive_url} onChange={(e) => set('onedrive_url', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
