'use client';

import { useState } from 'react';
import { LEASE_TYPES } from '../lib/constants';
import { insertRow } from '../lib/db';

export default function AddLeaseCompModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    address: '', city: '', submarket: '', tenant: '',
    rsf: '', rate: '', lease_type: 'NNN', term_months: '',
    start_date: '', free_rent_months: '', ti_psf: '',
    cam_psf: '', insurance_psf: '', tax_psf: '',
    escalations: '', options: '',
    landlord: '', broker_rep: '', source: '',
    building_sf: '', year_built: '', clear_height: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  // Auto-calculate totals
  const totalExpenses = (parseFloat(form.cam_psf) || 0) + (parseFloat(form.insurance_psf) || 0) + (parseFloat(form.tax_psf) || 0);
  const grossEquiv = form.rate ? parseFloat(form.rate) + totalExpenses : null;

  const handleSave = async () => {
    if (!form.address) return;
    setSaving(true);
    try {
      const data = {
        address: form.address,
        city: form.city || null,
        submarket: form.submarket || null,
        tenant: form.tenant || null,
        rsf: form.rsf ? parseInt(form.rsf) : null,
        rate: form.rate ? parseFloat(form.rate) : null,
        lease_type: form.lease_type || null,
        term_months: form.term_months ? parseInt(form.term_months) : null,
        start_date: form.start_date || null,
        free_rent_months: form.free_rent_months ? parseInt(form.free_rent_months) : null,
        ti_psf: form.ti_psf ? parseFloat(form.ti_psf) : null,
        notes: form.notes || null,
      };
      await insertRow('lease_comps', data);
      onSave();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Lease Comp</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Location */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '10px' }}>Location</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Address *</label>
              <input className="input" placeholder="15400 Don Julian Rd" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="input" placeholder="City of Industry" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Submarket</label>
              <input className="input" placeholder="City of Industry" value={form.submarket} onChange={(e) => set('submarket', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tenant</label>
              <input className="input" placeholder="Amazon" value={form.tenant} onChange={(e) => set('tenant', e.target.value)} />
            </div>
          </div>

          {/* Deal Terms */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '16px', marginBottom: '10px' }}>Deal Terms</div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">RSF</label>
              <input className="input" type="number" placeholder="185000" value={form.rsf} onChange={(e) => set('rsf', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Rate ($/SF/Mo)</label>
              <input className="input" type="number" step="0.01" placeholder="1.52" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Lease Type</label>
              <select className="select" value={form.lease_type} onChange={(e) => set('lease_type', e.target.value)}>
                {LEASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Term (months)</label>
              <input className="input" type="number" placeholder="60" value={form.term_months} onChange={(e) => set('term_months', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="input" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Free Rent (months)</label>
              <input className="input" type="number" placeholder="3" value={form.free_rent_months} onChange={(e) => set('free_rent_months', e.target.value)} />
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">TIs ($/SF)</label>
              <input className="input" type="number" step="0.01" placeholder="5.00" value={form.ti_psf} onChange={(e) => set('ti_psf', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Escalations</label>
              <input className="input" placeholder="3% annual" value={form.escalations} onChange={(e) => set('escalations', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Options</label>
              <input className="input" placeholder="2x5yr" value={form.options} onChange={(e) => set('options', e.target.value)} />
            </div>
          </div>

          {/* Expenses */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '16px', marginBottom: '10px' }}>Expenses ($/SF/Mo)</div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">CAM</label>
              <input className="input" type="number" step="0.01" placeholder="0.18" value={form.cam_psf} onChange={(e) => set('cam_psf', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Insurance</label>
              <input className="input" type="number" step="0.01" placeholder="0.04" value={form.insurance_psf} onChange={(e) => set('insurance_psf', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Property Tax</label>
              <input className="input" type="number" step="0.01" placeholder="0.14" value={form.tax_psf} onChange={(e) => set('tax_psf', e.target.value)} />
            </div>
          </div>
          {/* Auto-calculated totals */}
          {form.rate && totalExpenses > 0 && (
            <div style={{ display: 'flex', gap: '20px', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '15px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Expenses: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>${totalExpenses.toFixed(2)}</span></span>
              <span style={{ color: 'var(--text-muted)' }}>Gross Equiv: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>${grossEquiv.toFixed(2)}</span></span>
            </div>
          )}

          {/* Parties */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '8px', marginBottom: '10px' }}>Parties & Source</div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Landlord</label>
              <input className="input" value={form.landlord} onChange={(e) => set('landlord', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Broker / Rep</label>
              <input className="input" value={form.broker_rep} onChange={(e) => set('broker_rep', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Source</label>
              <input className="input" placeholder="CoStar / Broker intel" value={form.source} onChange={(e) => set('source', e.target.value)} />
            </div>
          </div>

          {/* Building */}
          <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '8px', marginBottom: '10px' }}>Building Info (optional)</div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Building SF</label>
              <input className="input" type="number" placeholder="185000" value={form.building_sf} onChange={(e) => set('building_sf', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Year Built</label>
              <input className="input" type="number" placeholder="2001" value={form.year_built} onChange={(e) => set('year_built', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Clear Height (ft)</label>
              <input className="input" type="number" placeholder="32" value={form.clear_height} onChange={(e) => set('clear_height', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.address}>
            {saving ? 'Saving...' : 'Add Comp'}
          </button>
        </div>
      </div>
    </div>
  );
}
