'use client';

import React, { useState, useMemo } from 'react';
import { TASK_PRIORITIES } from '../lib/constants';
import { updateRow, deleteRow } from '../lib/db';

export default function Tasks({ tasks, leads, deals, properties, contacts, onRefresh, showToast, onAdd, onTaskClick, onLeadClick, onDealClick, onPropertyClick, onContactClick }) {
  const [filter, setFilter] = useState('pending');
  const [filterPriority, setFilterPriority] = useState('');

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (filter === 'pending') list = list.filter((t) => !t.completed);
    if (filter === 'completed') list = list.filter((t) => t.completed);
    if (filterPriority) list = list.filter((t) => t.priority === filterPriority);
    return list.sort((a, b) => {
      if (!a.completed && b.completed) return -1;
      if (a.completed && !b.completed) return 1;
      const pa = { High: 0, Medium: 1, Low: 2 }[a.priority] ?? 1;
      const pb = { High: 0, Medium: 1, Low: 2 }[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
      return 0;
    });
  }, [tasks, filter, filterPriority]);

  const counts = {
    pending: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
    overdue: tasks.filter((t) => !t.completed && t.due_date && new Date(t.due_date) < new Date()).length,
  };

  const handleToggle = async (task) => {
    try {
      await updateRow('tasks', task.id, { completed: !task.completed, completed_at: !task.completed ? new Date().toISOString() : null });
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (task) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteRow('tasks', task.id);
      onRefresh();
      showToast('Task deleted');
    } catch (err) { console.error(err); }
  };

  const priorityColor = (p) => ({ High: 'var(--rust)', Medium: 'var(--amber)', Low: 'var(--ink3)' }[p] || 'var(--ink3)');

  const getLinkedRecord = (task) => {
    if (task.lead_id) {
      const l = leads.find(x => x.id === task.lead_id);
      return l ? { label: l.lead_name, type: 'Lead', record: l, onClick: () => onLeadClick?.(l) } : null;
    }
    if (task.deal_id) {
      const d = deals.find(x => x.id === task.deal_id);
      return d ? { label: d.deal_name, type: 'Deal', record: d, onClick: () => onDealClick?.(d) } : null;
    }
    if (task.property_id) {
      const p = properties.find(x => x.id === task.property_id);
      return p ? { label: p.address, type: 'Property', record: p, onClick: () => onPropertyClick?.(p) } : null;
    }
    if (task.contact_id) {
      const c = contacts.find(x => x.id === task.contact_id);
      return c ? { label: c.name, type: 'Contact', record: c, onClick: () => onContactClick?.(c) } : null;
    }
    return null;
  };

  const isOverdue = (task) => !task.completed && task.due_date && new Date(task.due_date) < new Date();
  const isDueToday = (task) => {
    if (!task.due_date || task.completed) return false;
    const today = new Date().toISOString().split('T')[0];
    return task.due_date === today;
  };

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center', minWidth: '100px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700 }}>{counts.pending}</div>
          <div style={{  color: 'var(--text-muted)' }}>Pending</div>
        </div>
        {counts.overdue > 0 && (
          <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center', borderColor: 'var(--red)' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--red)' }}>{counts.overdue}</div>
            <div style={{  color: 'var(--red)' }}>Overdue</div>
          </div>
        )}
        <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-muted)' }}>{counts.completed}</div>
          <div style={{  color: 'var(--text-muted)' }}>Done</div>
        </div>
      </div>

      {/* Filters + add */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['pending', 'completed', 'all'].map((f) => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)} style={{  textTransform: 'capitalize' }}>
              {f} {f !== 'all' ? `(${counts[f] ?? tasks.length})` : `(${tasks.length})`}
            </button>
          ))}
        </div>
        <select className="select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ maxWidth: '130px' }}>
          <option value="">All Priorities</option>
          {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={onAdd}>+ Task</button>
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtered.map((task) => {
          const linked = getLinkedRecord(task);
          const overdue = isOverdue(task);
          const dueToday = isDueToday(task);
          return (
            <div key={task.id} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderLeft: `3px solid ${task.completed ? 'var(--border)' : priorityColor(task.priority)}`,
              borderRadius: 'var(--radius)', padding: '12px 14px',
              display: 'flex', gap: '12px', alignItems: 'flex-start',
              opacity: task.completed ? 0.55 : 1,
              transition: 'opacity 0.15s',
            }}>
              {/* Checkbox */}
              <button onClick={() => handleToggle(task)} style={{
                width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                border: '2px solid', borderColor: task.completed ? 'var(--accent)' : priorityColor(task.priority),
                background: task.completed ? 'var(--accent)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',  fontWeight: 700,
              }}>
                {task.completed ? '✓' : ''}
              </button>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span onClick={() => onTaskClick?.(task)} style={{  fontWeight: 600, color: 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none', cursor: onTaskClick ? 'pointer' : 'default', borderBottom: onTaskClick ? '1px dashed var(--accent)' : 'none' }}>
                    {task.title}
                  </span>
                  <span style={{  padding: '1px 6px', borderRadius: '3px', background: priorityColor(task.priority) + '22', color: priorityColor(task.priority), fontWeight: 600 }}>
                    {task.priority}
                  </span>
                </div>
                {task.description && (
                  <div style={{  color: 'var(--text-muted)', marginBottom: '6px' }}>{task.description}</div>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {task.due_date && (
                    <span style={{  fontFamily: 'var(--font-mono)', color: overdue ? 'var(--red)' : dueToday ? 'var(--amber)' : 'var(--text-muted)', fontWeight: overdue || dueToday ? 600 : 400 }}>
                      {overdue ? '⚠ Overdue · ' : dueToday ? '⏰ Due today · ' : ''}{task.due_date}
                    </span>
                  )}
                  {linked && (
                    <span onClick={(e) => { e.stopPropagation(); linked.onClick?.(); }} style={{  color: 'var(--text-muted)', cursor: linked.onClick ? 'pointer' : 'default' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 500, borderBottom: '1px dashed var(--accent)' }}>{linked.type}</span>: {linked.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button onClick={() => handleDelete(task)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',  padding: '2px 4px', flexShrink: 0 }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>×</button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)',  border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
            {filter === 'pending' ? 'No pending tasks — nice work! 🎉' : filter === 'completed' ? 'No completed tasks yet' : 'No tasks'}
            <div style={{ marginTop: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={onAdd}>+ Add a task</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
