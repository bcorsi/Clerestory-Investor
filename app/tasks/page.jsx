'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PRIORITY_COLORS = { High: 'rust', Medium: 'amber', Low: 'gray' };

export default function TasksPage() {
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [tab, setTab]         = useState('pending');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { loadTasks(); }, [tab, search, page]);

  async function loadTasks() {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('tasks')
        .select('id, title, description, due_date, priority, completed, completed_at, lead_id, deal_id, property_id, created_at, updated_at', { count: 'exact' })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (tab === 'pending') query = query.eq('completed', false);
      if (tab === 'completed') query = query.eq('completed', true);
      if (search) query = query.ilike('title', `%${search}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      setTasks(data || []);
      setTotal(count || 0);
    } catch(e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleComplete(task) {
    try {
      const supabase = createClient();
      await supabase.from('tasks').update({
        completed: !task.completed,
        completed_at: !task.completed ? new Date().toISOString() : null,
      }).eq('id', task.id);
      loadTasks();
    } catch(e) { console.error(e); }
  }

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter(t => !t.completed && t.due_date && t.due_date < today).length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Tasks</h1>
          <p className="cl-page-subtitle">
            {loading ? 'Loading…' : `${total} task${total !== 1 ? 's' : ''}${overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}`}
          </p>
        </div>
        <div className="cl-page-actions">
          <button className="cl-btn cl-btn-primary cl-btn-sm">+ New Task</button>
        </div>
      </div>

      <div className="cl-filter-bar">
        <input className="cl-search-input" placeholder="Search tasks…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }} style={{ maxWidth: 300 }} />
        <div className="cl-tabs" style={{ margin: 0, border: 'none' }}>
          {[{ k: 'pending', l: 'Pending' }, { k: 'completed', l: 'Completed' }, { k: 'all', l: 'All' }].map(f => (
            <button key={f.k} className={`cl-tab ${tab === f.k ? 'cl-tab--active' : ''}`}
              onClick={() => { setTab(f.k); setPage(0); }} style={{ padding: '6px 12px' }}>{f.l}</button>
          ))}
        </div>
      </div>

      <div style={{ borderRadius: 12, border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)', background: 'var(--card-bg)', overflow: 'hidden' }}>
        {loading ? (
          <div className="cl-loading" style={{ padding: 40 }}><div className="cl-spinner" />Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="cl-empty" style={{ padding: 48 }}>
            <div className="cl-empty-label">{tab === 'pending' ? 'No pending tasks' : 'No tasks found'}</div>
            <div className="cl-empty-sub">Create a task from any lead, deal, or property</div>
          </div>
        ) : tasks.map(task => {
          const overdue = !task.completed && task.due_date && task.due_date < today;
          const dueToday = task.due_date === today;
          return (
            <div key={task.id} style={{
              padding: '14px 18px',
              display: 'flex', alignItems: 'flex-start', gap: 14,
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              background: overdue ? 'rgba(184,55,20,0.03)' : 'transparent',
              transition: 'background 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = overdue ? 'rgba(184,55,20,0.05)' : 'rgba(78,110,150,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = overdue ? 'rgba(184,55,20,0.03)' : 'transparent'}
            >
              {/* Checkbox */}
              <div
                onClick={() => toggleComplete(task)}
                style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                  border: task.completed ? 'none' : `2px solid ${overdue ? 'var(--rust)' : 'rgba(0,0,0,0.2)'}`,
                  background: task.completed ? 'var(--green)' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms',
                }}
              >
                {task.completed && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 500,
                  color: task.completed ? 'var(--text-tertiary)' : overdue ? 'var(--rust)' : 'var(--text-primary)',
                  textDecoration: task.completed ? 'line-through' : 'none',
                }}>
                  {task.title}
                </div>
                {task.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3, lineHeight: 1.4 }}>
                    {task.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
                  {task.due_date && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: overdue ? 'var(--rust)' : dueToday ? 'var(--amber)' : 'var(--text-tertiary)',
                      fontWeight: overdue || dueToday ? 600 : 400,
                    }}>
                      {overdue ? '⚠ Overdue · ' : dueToday ? '● Due today · ' : ''}{fmtDate(task.due_date)}
                    </span>
                  )}
                  {task.deal_id && <span className="cl-badge cl-badge-blue" style={{ fontSize: 9 }}>Deal</span>}
                  {task.lead_id && <span className="cl-badge cl-badge-amber" style={{ fontSize: 9 }}>Lead</span>}
                  {task.property_id && <span className="cl-badge cl-badge-gray" style={{ fontSize: 9 }}>Property</span>}
                </div>
              </div>

              {/* Priority */}
              {task.priority && (
                <span className={`cl-badge cl-badge-${PRIORITY_COLORS[task.priority] || 'gray'}`} style={{ fontSize: 10, flexShrink: 0, marginTop: 2 }}>
                  {task.priority}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 14 }}>
          <button className="cl-btn cl-btn-secondary cl-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <button className="cl-btn cl-btn-secondary cl-btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
