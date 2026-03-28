'use client';
import { useState } from 'react';
import { updateRecord } from '../lib/useSupabase';


export default function Tasks({ onSelectTask, tasks: propTasks, loading, onRefresh, toast, properties, deals, leads, onSelectProperty, onSelectDeal, onSelectLead }) {
  const [checked, setChecked] = useState(new Set());

  // Use only real Supabase tasks — no mock fallback
  const tasks = propTasks || [];

  // Compute summary counts from real data
  const now = new Date(); now.setHours(0,0,0,0);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate()+7);
  const overdueAll = tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) < now);
  const todayAll   = tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) < tomorrow);
  const weekAll    = tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) >= tomorrow && new Date(t.due_date) < weekEnd);
  const laterAll   = tasks.filter(t => !t.completed && (!t.due_date || new Date(t.due_date) >= weekEnd));
  const completedToday = tasks.filter(t => t.completed && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString());
  const openCount = tasks.filter(t => !t.completed).length;

  const toggle = async (id) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      await updateRecord('tasks', id, { completed: true, completed_at: new Date().toISOString() });
      toast?.('Task completed', 'success');
      onRefresh?.();
    } catch (e) { toast?.('Failed to update task', 'error'); }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>Tasks</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={S.btnGhost} onClick={() => {}}>Filter</button>
          <button style={S.btnBlue} onClick={() => {}}>+ Add Task</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* PAGE HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>My <em style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--rust)', fontSize: 36, fontWeight: 400 }}>Tasks</em></div>
              <div style={S.pageSub}>{openCount} open · {overdueAll.length} overdue · {todayAll.length} due today</div>
            </div>
          </div>

          {/* BODY GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
            <div>
              {loading ? (
                [1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 8 }} />)
              ) : tasks.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 15 }}>No tasks</div>
              ) : (
                /* ── Tasks grouped by due date ── */
                (() => {
                  const toRow = (t) => ({ id: t.id, text: t.title, detail: t.description, meta: { linkLabel: null } });
                  return (<>
                    {overdueAll.length > 0 && <TaskGroup label="Overdue" count={overdueAll.length} countStyle="rust">{overdueAll.map(t => <TaskRow key={t.id} task={toRow(t)} type="overdue" checked={checked.has(t.id)} onCheck={() => toggle(t.id)} dueLabel="Overdue" dueStyle="overdue" onSelect={onSelectTask} />)}</TaskGroup>}
                    {todayAll.length > 0   && <TaskGroup label="Today"   count={todayAll.length}   countStyle="amber">{todayAll.map(t =>   <TaskRow key={t.id} task={toRow(t)} type="normal"  checked={checked.has(t.id)} onCheck={() => toggle(t.id)} dueLabel="Today"   dueStyle="today"   onSelect={onSelectTask} />)}</TaskGroup>}
                    {weekAll.length > 0    && <TaskGroup label="This Week" count={weekAll.length}   countStyle="blue">{weekAll.map(t =>    <TaskRow key={t.id} task={toRow(t)} type="normal"  checked={checked.has(t.id)} onCheck={() => toggle(t.id)} dueLabel={t.due_date?.slice(5,10)} dueStyle="soon" onSelect={onSelectTask} />)}</TaskGroup>}
                    {laterAll.length > 0   && <TaskGroup label="Later"   count={laterAll.length}   countStyle="blue">{laterAll.map(t =>   <TaskRow key={t.id} task={toRow(t)} type="normal"  checked={checked.has(t.id)} onCheck={() => toggle(t.id)} dueLabel="—"       dueStyle="soon"   onSelect={onSelectTask} />)}</TaskGroup>}
                  </>);
                })()
              )}
            </div>

            {/* RIGHT PANEL */}
            <div>
              <div style={S.rightCard}>
                <div style={S.rcHdr}>Task Summary</div>
                {[
                  { label: 'Overdue', val: overdueAll.length, valStyle: 'rust' },
                  { label: 'Due Today', val: todayAll.length, valStyle: 'amber' },
                  { label: 'This Week', val: weekAll.length, valStyle: null },
                  { label: 'Later', val: laterAll.length, valStyle: null },
                  { label: 'Completed Today', val: completedToday.length, valStyle: 'green' },
                ].map(r => (
                  <div key={r.label} style={S.rcRow}>
                    <span style={{ fontSize: 13, color: 'var(--ink3)' }}>{r.label}</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: r.valStyle ? `var(--${r.valStyle})` : 'var(--ink)' }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskGroup({ label, count, countStyle, children }) {
  const ctStyle = countStyle === 'rust'
    ? { background: 'var(--rust-bg)', border: '1px solid var(--rust-bdr)', color: 'var(--rust)' }
    : countStyle === 'amber'
    ? { background: 'var(--amber-bg)', border: '1px solid var(--amber-bdr)', color: 'var(--amber)' }
    : { background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', color: 'var(--blue)' };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', padding: '0 0 8px', borderBottom: '1px solid var(--line)', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {label}
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: '2px 7px', borderRadius: 20, ...ctStyle }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function TaskRow({ task, type, checked, onCheck, dueLabel, dueStyle, onSelect }) {
  const [hover, setHover] = useState(false);
  const borderLeft = type === 'overdue' ? '3px solid var(--rust)' : type === 'high' ? '3px solid var(--amber)' : '1px solid var(--line2)';
  const dueColor = dueStyle === 'overdue'
    ? { background: 'var(--rust-bg)', border: '1px solid var(--rust-bdr)', color: 'var(--rust)' }
    : dueStyle === 'today'
    ? { background: 'var(--amber-bg)', border: '1px solid var(--amber-bdr)', color: 'var(--amber)' }
    : { background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--ink4)' };

  return (
    <div style={{ background: 'var(--card)', borderRadius: 10, border: borderLeft, borderRight: '1px solid var(--line2)', borderTop: '1px solid var(--line2)', borderBottom: '1px solid var(--line2)', padding: '12px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', boxShadow: hover ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'box-shadow 0.12s' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onSelect?.(task)}>
      <div style={{ width: 18, height: 18, borderRadius: 4, border: checked ? 'none' : '1.5px solid var(--line)', flexShrink: 0, marginTop: 2, cursor: 'pointer', background: checked ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={e => { e.stopPropagation(); onCheck(); }}>
        {checked && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.35, textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.5 : 1 }}>{task.text}</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12.5, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 3 }}>
          {task.meta.linkLabel && <span style={{ color: task.meta.linkColor, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); }}>{task.meta.linkLabel}</span>}
          {task.meta.linkLabel && <span> · </span>}
          {task.detail}
        </div>
      </div>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: '2px 8px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap', ...dueColor }}>{dueLabel}</span>
    </div>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', padding: '0 28px 60px' },
  pageHeader: { padding: '22px 0 16px' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em' },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  btnGhost: { display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  btnBlue: { display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontFamily: 'inherit' },
  rightCard: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', overflow: 'hidden', marginBottom: 14 },
  rcHdr: { padding: '11px 16px', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)' },
  rcRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid var(--line2)' },
};
