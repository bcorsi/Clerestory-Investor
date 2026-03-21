'use client';

import { useState } from 'react';
import { TASK_PRIORITIES, fmt } from '../lib/constants';
import { updateRow, deleteRow } from '../lib/db';

export default function TaskDetail({
  task, leads, deals, properties, contacts, accounts, activities,
  onRefresh, showToast, onLeadClick, onDealClick, onPropertyClick, onContactClick, onAccountClick, onBack
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...task });
  const [saving, setSaving] = useState(false);

  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRow('tasks', task.id, {
        title: form.title, description: form.description || null,
        due_date: form.due_date || null, priority: form.priority,
      });
      onRefresh(); setEditing(false); showToast('Task updated');
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleToggle = async () => {
    try {
      await updateRow('tasks', task.id, { completed: !task.completed, completed_at: !task.completed ? new Date().toISOString() : null });
      onRefresh(); showToast(task.completed ? 'Reopened' : 'Completed');
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try { await deleteRow('tasks', task.id); onRefresh(); showToast('Deleted'); onBack?.(); }
    catch (e) { console.error(e); }
  };

  const pc = { High: 'var(--rust)', Medium: 'var(--amber)', Low: 'var(--ink3)' }[task.priority] || 'var(--ink3)';
  const overdue = !task.completed && task.due_date && new Date(task.due_date) < new Date();

  // Find all linked records
  const linkedLead = task.lead_id ? (leads || []).find(l => l.id === task.lead_id) : null;
  const linkedDeal = task.deal_id ? (deals || []).find(d => d.id === task.deal_id) : null;
  const linkedProperty = task.property_id ? (properties || []).find(p => p.id === task.property_id) : null;
  const linkedContact = task.contact_id ? (contacts || []).find(c => c.id === task.contact_id) : null;
  const linkedAccount = task.account_id ? (accounts || []).find(a => a.id === task.account_id) : null;

  // Also find related records through the linked records
  const relatedDeals = linkedProperty ? (deals || []).filter(d => d.property_id === linkedProperty.id).slice(0, 5) : [];
  const relatedContacts = linkedProperty ? (contacts || []).filter(c => c.property_id === linkedProperty.id).slice(0, 5)
    : linkedDeal ? (contacts || []).filter(c => c.deal_id === linkedDeal.id).slice(0, 5) : [];

  const LinkedRow = ({ label, name, subtitle, onClick }) => (
    <div onClick={onClick} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px', cursor: onClick ? 'pointer' : 'default', border: '1px solid transparent', transition: 'border-color 0.15s', marginBottom: '6px' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>{name}</div>
        {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</div>}
      </div>
      <span className="tag tag-ghost" style={{ fontSize: '11px' }}>{label}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* HEADER */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <button onClick={handleToggle} style={{
              width: '22px', height: '22px', borderRadius: '5px', flexShrink: 0, marginTop: '2px',
              border: '2px solid', borderColor: task.completed ? 'var(--accent)' : pc,
              background: task.completed ? 'var(--accent)' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '14px', fontWeight: 700,
            }}>{task.completed ? '✓' : ''}</button>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, textDecoration: task.completed ? 'line-through' : 'none', marginBottom: '6px' }}>{task.title}</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', padding: '2px 8px', borderRadius: '4px', background: pc + '22', color: pc, fontWeight: 600 }}>{task.priority}</span>
                {task.completed && <span className="tag tag-green" style={{ fontSize: '12px' }}>Completed</span>}
                {overdue && <span className="tag tag-red" style={{ fontSize: '12px' }}>⚠ Overdue</span>}
                {task.due_date && <span style={{ fontSize: '13px', color: overdue ? 'var(--red)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Due: {task.due_date}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={handleDelete}>Delete</button>
          </div>
        </div>

        {task.description && !editing && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{task.description}</div>
        )}

        {task.completed_at && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Completed: {new Date(task.completed_at).toLocaleDateString()}</div>
        )}
      </div>

      {/* EDIT FORM */}
      {editing && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Title</label>
              <input className="input" value={form.title || ''} onChange={e => set('title', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="input" type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Description</label>
              <textarea className="textarea" rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* LINKED RECORDS */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Linked Records</h3>

        {!linkedLead && !linkedDeal && !linkedProperty && !linkedContact && !linkedAccount ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No linked records</div>
        ) : (<>
          {linkedProperty && <LinkedRow label="Property" name={linkedProperty.address} subtitle={[linkedProperty.submarket, linkedProperty.building_sf ? linkedProperty.building_sf.toLocaleString() + ' SF' : '', linkedProperty.owner].filter(Boolean).join(' · ')} onClick={() => onPropertyClick?.(linkedProperty)} />}
          {linkedDeal && <LinkedRow label="Deal" name={linkedDeal.deal_name} subtitle={[linkedDeal.stage, linkedDeal.deal_value ? fmt.price(linkedDeal.deal_value) : ''].filter(Boolean).join(' · ')} onClick={() => onDealClick?.(linkedDeal)} />}
          {linkedLead && <LinkedRow label="Lead" name={linkedLead.lead_name} subtitle={[linkedLead.stage, linkedLead.tier, linkedLead.address].filter(Boolean).join(' · ')} onClick={() => onLeadClick?.(linkedLead)} />}
          {linkedContact && <LinkedRow label="Contact" name={linkedContact.name} subtitle={[linkedContact.contact_type, linkedContact.company, linkedContact.phone].filter(Boolean).join(' · ')} onClick={() => onContactClick?.(linkedContact)} />}
          {linkedAccount && <LinkedRow label="Account" name={linkedAccount.name} subtitle={[linkedAccount.account_type, linkedAccount.city].filter(Boolean).join(' · ')} onClick={() => onAccountClick?.(linkedAccount)} />}
        </>)}
      </div>

      {/* RELATED RECORDS (discovered through links) */}
      {(relatedDeals.length > 0 || relatedContacts.length > 0) && (
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Related Records</h3>
          {relatedDeals.filter(d => d.id !== task.deal_id).map(d => (
            <LinkedRow key={d.id} label="Deal" name={d.deal_name} subtitle={d.stage} onClick={() => onDealClick?.(d)} />
          ))}
          {relatedContacts.filter(c => c.id !== task.contact_id).map(c => (
            <LinkedRow key={c.id} label="Contact" name={c.name} subtitle={[c.contact_type, c.company].filter(Boolean).join(' · ')} onClick={() => onContactClick?.(c)} />
          ))}
        </div>
      )}
    </div>
  );
}
