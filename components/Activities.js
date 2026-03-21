'use client';

import React, { useState, useMemo } from 'react';
import { ACTIVITY_TYPES, ACTIVITY_OUTCOMES } from '../lib/constants';
import { updateRow, deleteRow } from '../lib/db';

export default function Activities({ activities, onRefresh, showToast, onAdd }) {
  const [filter, setFilter] = useState('all'); // all | pending | completed
  const [filterType, setFilterType] = useState('');

  const filtered = useMemo(() => {
    let list = [...activities].sort((a, b) => {
      // Pending to-dos first, then by date
      if (!a.completed && b.completed) return -1;
      if (a.completed && !b.completed) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    if (filter === 'pending') list = list.filter((a) => !a.completed);
    if (filter === 'completed') list = list.filter((a) => a.completed);
    if (filterType) list = list.filter((a) => a.activity_type === filterType);
    return list;
  }, [activities, filter, filterType]);

  const handleToggle = async (activity) => {
    try {
      await updateRow('activities', activity.id, { completed: !activity.completed });
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (activity) => {
    if (!confirm('Delete this activity?')) return;
    try {
      await deleteRow('activities', activity.id);
      onRefresh();
      showToast('Activity deleted');
    } catch (err) { console.error(err); }
  };

  const typeIcon = (type) => {
    const map = { Call: '📞', Email: '✉️', Meeting: '🤝', 'To-Do': '✓' };
    return map[type] || '•';
  };

  const typeColor = (type) => {
    const map = { Call: 'tag-green', Email: 'tag-blue', Meeting: 'tag-purple', 'To-Do': 'tag-amber' };
    return map[type] || 'tag-ghost';
  };

  const counts = {
    all: activities.length,
    pending: activities.filter((a) => !a.completed).length,
    completed: activities.filter((a) => a.completed).length,
  };

  return (
    <div>
      {/* Filters + add */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['all', 'pending', 'completed'].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
              style={{  textTransform: 'capitalize' }}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ maxWidth: '130px' }}>
          <option value="">All Types</option>
          {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={onAdd}>
          + Activity
        </button>
      </div>

      {/* Activity list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map((activity) => (
          <div
            key={activity.id}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              opacity: activity.completed ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {/* Checkbox */}
            <button
              onClick={() => handleToggle(activity)}
              style={{
                width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                border: '2px solid', borderColor: activity.completed ? 'var(--accent)' : 'var(--border)',
                background: activity.completed ? 'var(--accent)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',  fontWeight: 700,
              }}
            >
              {activity.completed ? '✓' : ''}
            </button>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{  }}>{typeIcon(activity.activity_type)}</span>
                <span className={`tag ${typeColor(activity.activity_type)}`} style={{  }}>
                  {activity.activity_type}
                </span>
                {activity.subject && (
                  <span style={{
                     fontWeight: 600, color: 'var(--text-primary)',
                    textDecoration: activity.completed ? 'line-through' : 'none',
                  }}>
                    {activity.subject}
                  </span>
                )}
              </div>

              {/* Linked record */}
              {(activity.address || activity.lead_name) && (
                <div style={{  color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {activity.address || ''}
                </div>
              )}

              {/* Notes */}
              {activity.notes && (
                <div style={{  color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '4px' }}>
                  {activity.notes}
                </div>
              )}

              {/* Meta row */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {activity.activity_date && (
                  <span style={{  color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {activity.activity_date}
                  </span>
                )}
                {activity.due_date && !activity.completed && (
                  <span style={{  color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                    Due: {activity.due_date}
                  </span>
                )}
                {activity.outcome && (
                  <span className="tag tag-ghost" style={{  }}>{activity.outcome}</span>
                )}
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={() => handleDelete(activity)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',  padding: '2px 4px', flexShrink: 0 }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              ×
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)',  border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
            {filter === 'pending' ? 'No pending activities' : filter === 'completed' ? 'No completed activities' : 'No activities yet'}
            <div style={{ marginTop: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={onAdd}>+ Add your first activity</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
