'use client';

import { useState } from 'react';
import { insertRow } from '../lib/db';

const SALE_TYPES = ['Investment', 'Owner-User', 'SLB', 'Portfolio', 'Distress'];

export default function AddSaleCompModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    address: '', city: '', submarket: '',
    building_sf: '', land_acres: '', year_built: '', clear_height: '',
    sale_price: '', price_psf: '', cap_rate: '',
    sale_date: '', buyer: '', seller: '', sale_type: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => {
    const updated = { ...f, [field]: val };
    // Auto-calc price_psf
    if ((field === 'sale_price' || field === 'building_sf') && updated.sale_price && updated.building_sf) {
      updated.price_psf = (parseFloat(updated.sale_price) / parseInt(updated.building_sf)).toFixed(0);
    }
    return updated;
  });

  const handleSave = async () => {
    if (!form.address.trim()) return;
    setSaving(true);
    try {
      await insertRow('sale_comps', {
        ...form,
        building_sf: form.building_sf ? parseInt(form.building_sf) : null,
        land_acres: form.land_acres ? parseFloat(form.land_acres) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        clear_height: form.clear_height ? parseInt(form.clear_height) : null,
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        price_psf: form.price_psf ? parseFloat(form.price_psf) : null,
        cap_rate: form.cap_rate ? parseFloat(form.cap_rate) : null,
      });
      onSave();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Sale Comp</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Address *</label>
              <input className="input" placeholder="120 Puente Ave" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="input" placeholder="City of Industry" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Submarket</label>
              <input className="input" value={form.submarket} onChange={(e) => set('submarket', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Sale Type</label>
              <select className="select" value={form.sale_type} onChange={(e) => set('sale_type', e.target.value)}>
                <option value="">Select</option>
                {SALE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Building SF</label>
              <input className="input" type="number" placeholder="115000" value={form.building_sf} onChange={(e) => set('building_sf', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Land (Acres)</label>
              <input className="input" type="number" step="0.01" value={form.land_acres} onChange={(e) => set('land_acres', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Year Built</label>
              <input className="input" type="number" placeholder="1990" value={form.year_built} onChange={(e) => set('year_built', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Clear Ht (ft)</label>
              <input className="input" type="number" placeholder="32" value={form.clear_height} onChange={(e) => set('clear_height', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sale Price ($)</label>
              <input className="input" type="number" placeholder="31400000" value={form.sale_price} onChange={(e) => set('sale_price', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Price/SF (auto)</label>
              <input className="input" type="number" value={form.price_psf} onChange={(e) => set('price_psf', e.target.value)} placeholder="273" />
            </div>
            <div className="form-group">
              <label className="form-label">Cap Rate (%)</label>
              <input className="input" type="number" step="0.01" placeholder="5.25" value={form.cap_rate} onChange={(e) => set('cap_rate', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sale Date</label>
              <input className="input" type="date" value={form.sale_date} onChange={(e) => set('sale_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Buyer</label>
              <input className="input" placeholder="TA Realty" value={form.buyer} onChange={(e) => set('buyer', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Seller</label>
              <input className="input" value={form.seller} onChange={(e) => set('seller', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.address.trim()}>
            {saving ? 'Saving...' : 'Add Sale Comp'}
          </button>
        </div>
      </div>
    </div>
  );
}
