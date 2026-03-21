'use client';

import { useState } from 'react';
import { CONTACT_TYPES, fmt } from '../lib/constants';
import { updateRow } from '../lib/db';

export default function ContactDetail({ contact, activities, tasks, deals, properties, onRefresh, showToast, onDealClick, onPropertyClick, onAddActivity, onAddTask }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...contact });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRow('contacts', contact.id, {
        name: form.name, company: form.company, title: form.title,
        contact_type: form.contact_type, phone: form.phone,
        email: form.email, linkedin: form.linkedin, notes: form.notes,
      });
      onRefresh();
      setEditing(false);
      showToast('Contact updated');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const linkedActivities = activities.filter((a) => a.contact_id === contact.id);
  const linkedTasks = (tasks || []).filter((t) => t.contact_id === contact.id);
  const pendingTasks = linkedTasks.filter((t) => !t.completed).length;
  const linkedDeals = deals.filter((d) => d.buyer === contact.company || d.seller === contact.company || d.tenant_name === contact.company);
  const linkedProperties = properties.filter((p) => p.owner === contact.company || p.tenant === contact.company);

  const typeColor = (type) => {
    const map = { Owner: 'tag-amber', Buyer: 'tag-green', Tenant: 'tag-blue', Broker: 'tag-purple', Investor: 'tag-green', Lender: 'tag-ghost' };
    return map[type] || 'tag-ghost';
  };

  const Field = ({ label, value, mono }) => (
    <div>
      <div style={{  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{  color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value || '—'}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{contact.name}</h2>
              {contact.contact_type && <span className={`tag ${typeColor(contact.contact_type)}`}>{contact.contact_type}</span>}
            </div>
            <div style={{  color: 'var(--text-muted)' }}>
              {contact.title && <span>{contact.title}</span>}
              {contact.title && contact.company && <span> · </span>}
              {contact.company && <span>{contact.company}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onAddActivity && onAddActivity(null, null, null, contact.id)}>+ Activity</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[['name','Name'],['company','Company'],['title','Title'],['phone','Phone'],['email','Email'],['linkedin','LinkedIn']].map(([f, l]) => (
              <div key={f} className="form-group">
                <label className="form-label">{l}</label>
                <input className="input" value={form[f] || ''} onChange={(e) => set(f, e.target.value)} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="select" value={form.contact_type || ''} onChange={(e) => set('contact_type', e.target.value)}>
                <option value="">Select</option>
                {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Notes</label>
            <textarea className="textarea" rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="card">
            <h3 style={{  fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Contact Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="Phone" value={contact.phone} mono />
              <Field label="Email" value={contact.email} />
              <Field label="LinkedIn" value={contact.linkedin} />
              <Field label="Company" value={contact.company} />
              <Field label="Title" value={contact.title} />
            </div>
          </div>
          <div className="card">
            <h3 style={{  fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Notes</h3>
            <div style={{  color: contact.notes ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.7 }}>{contact.notes || 'No notes'}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Linked Properties */}
        <div className="card">
          <h3 style={{  fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Properties ({linkedProperties.length})</h3>
          {linkedProperties.length === 0 ? (
            <div style={{  color: 'var(--text-muted)' }}>None linked</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkedProperties.map((p) => (
                <div key={p.id} onClick={() => onPropertyClick && onPropertyClick(p)} style={{ padding: '8px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{  fontWeight: 500 }}>{p.address}</div>
                  <div style={{  color: 'var(--text-muted)' }}>{p.submarket} · {p.building_sf ? fmt.sf(p.building_sf) : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linked Deals */}
        <div className="card">
          <h3 style={{  fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Deals ({linkedDeals.length})</h3>
          {linkedDeals.length === 0 ? (
            <div style={{  color: 'var(--text-muted)' }}>None linked</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkedDeals.map((d) => (
                <div key={d.id} onClick={() => onDealClick && onDealClick(d)} style={{ padding: '8px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{  fontWeight: 500 }}>{d.deal_name}</div>
                  <div style={{  color: 'var(--text-muted)' }}>{d.stage} · {d.deal_value ? fmt.price(d.deal_value) : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{  fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tasks {pendingTasks > 0 && <span style={{ color: 'var(--rust)' }}>({pendingTasks} pending)</span>}
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onAddTask?.(null, null, null, contact.id)}>+ Task</button>
        </div>
        {linkedTasks.length === 0 ? (
          <div style={{  color: 'var(--text-muted)' }}>No tasks yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {linkedTasks.sort((a, b) => a.completed - b.completed).map((t) => {
              const pc = { High: 'var(--rust)', Medium: 'var(--amber)', Low: 'var(--ink3)' }[t.priority] || 'var(--ink3)';
              const overdue = !t.completed && t.due_date && new Date(t.due_date) < new Date();
              return (
                <div key={t.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '6px', borderLeft: `3px solid ${t.completed ? 'var(--border)' : pc}`, opacity: t.completed ? 0.6 : 1 }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, marginTop: '2px', border: '2px solid', borderColor: t.completed ? 'var(--accent)' : pc, background: t.completed ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',  }}>{t.completed ? '✓' : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{  fontWeight: 500, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>
                    {t.due_date && <div style={{  color: overdue ? 'var(--red)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{overdue ? '⚠ ' : ''}{t.due_date}</div>}
                  </div>
                  <span style={{  padding: '1px 5px', borderRadius: '3px', background: pc + '22', color: pc, flexShrink: 0 }}>{t.priority}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activities */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{  fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activities ({linkedActivities.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onAddActivity && onAddActivity(null, null, null, contact.id)}>+ Log</button>
        </div>
        {linkedActivities.length === 0 ? (
          <div style={{  color: 'var(--text-muted)' }}>No activities yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {linkedActivities.slice(0, 10).map((a) => (
              <div key={a.id} style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px', opacity: a.completed ? 0.6 : 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                  <span className="tag tag-blue" style={{  }}>{a.activity_type}</span>
                  <span style={{  fontWeight: 500 }}>{a.subject}</span>
                  {a.outcome && <span className="tag tag-ghost" style={{  }}>{a.outcome}</span>}
                </div>
                {a.notes && <div style={{  color: 'var(--text-muted)' }}>{a.notes}</div>}
                <div style={{  color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{a.activity_date}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
