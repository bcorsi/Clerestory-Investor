'use client';
import { useState } from 'react';
import { updateRecord } from '../lib/useSupabase';

const MOCK_TASKS = {
  overdue: [
    { id: 1, text: 'Call Jodie re: Teledyne WARN broker appointment status', meta: { linkLabel: 'WARN Intel', linkColor: 'var(--rust)' }, detail: 'Teledyne Technologies · Fontana', daysAgo: '2 days ago' },
    { id: 2, text: 'Identify Cabot REIT asset manager for IE West portfolio', meta: { linkLabel: 'Lead', linkColor: 'var(--blue)' }, detail: 'Teledyne · 16830 Chestnut St', daysAgo: '3 days ago' },
    { id: 3, text: 'Send SLB investor demand summary to RJ Neu — comparable sales $240–275/SF', meta: { linkLabel: 'Deal', linkColor: 'var(--green)' }, detail: 'Pacific Mfg · Workman Mill', daysAgo: '1 day ago' },
  ],
  today: [
    { id: 4, text: 'Follow up with Bob Rosenthall re: SLB decision — board meeting was this week', meta: { linkLabel: 'Property', linkColor: 'var(--blue)' }, detail: '14022 Nelson Ave E · Baldwin Park', priority: 'high' },
    { id: 5, text: 'Send Tarhong UW model v2 to buyer group — updated with 5.25% exit cap', meta: { linkLabel: 'Deal', linkColor: 'var(--blue)' }, detail: 'Tarhong Industry Properties' },
    { id: 6, text: 'Review Rexford LOI counter — respond by EOD', meta: { linkLabel: 'Deal', linkColor: 'var(--blue)' }, detail: 'Rexford · 4800 Azusa Canyon Rd · Irwindale' },
    { id: 7, text: 'Draft lease comp report for Matrix Logistics — include Hacienda submarket', meta: { linkLabel: 'Deal', linkColor: 'var(--blue)' }, detail: 'Matrix Logistics · LOI stage' },
    { id: 8, text: 'Update lead score for Snak King — WARN permit confirmed today', meta: { linkLabel: 'Lead', linkColor: 'var(--amber)' }, detail: 'Snak King Corp · 16150 Stephens St' },
  ],
  thisWeek: [
    { id: 9, text: 'Prepare lease comps for Matrix Logistics meeting — Thu Mar 26', meta: { linkLabel: 'Deal', linkColor: 'var(--blue)' }, detail: 'Matrix Logistics · LOI stage', due: 'Mar 26' },
    { id: 10, text: 'Review Rexford Irwindale PSA draft from buyer counsel', meta: { linkLabel: 'Deal', linkColor: 'var(--blue)' }, detail: 'Rexford Industrial · LOI Accepted', due: 'Mar 27' },
    { id: 11, text: 'Run Snak King CapEx permit research — confirm SLB timing window', meta: { linkLabel: 'Lead', linkColor: 'var(--amber)' }, detail: 'Snak King Corp · 16150 Stephens St', due: 'Mar 27' },
    { id: 12, text: 'Schedule property tour with Pacific Mfg — Workman Mill full access', meta: { linkLabel: 'Property', linkColor: 'var(--blue)' }, detail: '4900 Workman Mill Rd · City of Industry', due: 'Mar 28' },
    { id: 13, text: 'Send Q1 activity report to Colliers branch manager', meta: { linkLabel: null }, detail: 'Internal', due: 'Mar 28' },
    { id: 14, text: 'Update deal probability — Tarhong and Valley Cold Storage', meta: { linkLabel: 'Deal', linkColor: 'var(--blue)' }, detail: 'Pipeline review', due: 'Mar 28' },
    { id: 15, text: 'Request updated rent roll for 16830 Chestnut St', meta: { linkLabel: 'Property', linkColor: 'var(--blue)' }, detail: 'Cabot portfolio · Fontana', due: 'Mar 29' },
    { id: 16, text: 'Follow up on NOD filing — 18421 Railroad St ownership research', meta: { linkLabel: 'Lead', linkColor: 'var(--amber)' }, detail: 'Acromill LLC · IE South', due: 'Mar 29' },
  ],
};

export default function Tasks({ onSelectTask, tasks: propTasks, loading, onRefresh, toast }) {
  const [checked, setChecked] = useState(new Set());

  // Build flat list from Supabase data or mock sections
  const hasSupa = propTasks && propTasks.length > 0;

  const toggle = async (id) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    // If this is a real Supabase task (numeric id), mark complete
    if (hasSupa && typeof id === 'number') {
      try {
        await updateRecord('tasks', id, { completed: true, completed_at: new Date().toISOString() });
        toast?.('Task completed ✓', 'success');
        onRefresh?.();
      } catch (e) { toast?.('Failed to update task', 'error'); }
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>Tasks</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={S.btnGhost} onClick={() => alert('Filter — coming soon')}>Filter</button>
          <button style={S.btnBlue} onClick={() => alert('Add Task — coming soon')}>+ Add Task</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* PAGE HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>My <em style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--rust)', fontSize: 36, fontWeight: 400 }}>Tasks</em></div>
              <div style={S.pageSub}>26 open · 3 overdue · 5 due today</div>
            </div>
          </div>

          {/* BODY GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
            <div>
              {loading ? (
                [1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 8 }} />)
              ) : hasSupa ? (
                /* ── Supabase tasks grouped by due date ── */
                (() => {
                  const now = new Date(); now.setHours(0,0,0,0);
                  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
                  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate()+7);
                  const overdue = propTasks.filter(t => t.due_date && new Date(t.due_date) < now);
                  const today   = propTasks.filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) < tomorrow);
                  const week    = propTasks.filter(t => t.due_date && new Date(t.due_date) >= tomorrow && new Date(t.due_date) < weekEnd);
                  const later   = propTasks.filter(t => !t.due_date || new Date(t.due_date) >= weekEnd);
                  const toRow = (t) => ({ id: t.id, text: t.title, detail: t.description, meta: { linkLabel: null } });
                  return (<>
                    {overdue.length > 0 && <TaskGroup label="Overdue" count={overdue.length} countStyle="rust">{overdue.map(t => <TaskRow key={t.id} task={toRow(t)} type="overdue" checked={checked.has(t.id)} onCheck={() => toggle(t.id)} dueLabel="Overdue" dueStyle="overdue" onSelect={onSelectTask} />)}</TaskGroup>}
                    {today.length > 0   && <TaskGroup label="Today"   count={today.length}   countStyle="amber">{today.map(t =>   <TaskRow key={t.id} task={toRow(t)} type="normal"  checked={checked.has(t.id)} onCheck={() => toggle(t.id)} dueLabel="Today"   dueStyle="today"   onSelect={onSelectTask} />)}</TaskGroup>}
                    {week.length > 0    && <TaskGroup label="This Week" count={week.length}   countStyle="blue">{week.map(t =>    <TaskRow key={t.id} task={toRow(t)} type="normal"  checked={checked.has(t.id)} onCheck={() => toggle(t.id)} dueLabel={t.due_date?.slice(5,10)} dueStyle="soon" onSelect={onSelectTask} />)}</TaskGroup>}
                    {later.length > 0   && <TaskGroup label="Later"   count={later.length}   countStyle="blue">{later.map(t =>   <TaskRow key={t.id} task={toRow(t)} type="normal"  checked={checked.has(t.id)} onCheck={() => toggle(t.id)} dueLabel="—"       dueStyle="soon"   onSelect={onSelectTask} />)}</TaskGroup>}
                    {propTasks.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 15 }}>No open tasks</div>}
                  </>);
                })()
              ) : (
                /* ── Mock tasks (fallback) ── */
                <>
                  <TaskGroup label="Overdue" count={MOCK_TASKS.overdue.length} countStyle="rust">
                    {MOCK_TASKS.overdue.map(t => (
                      <TaskRow key={t.id} task={t} type="overdue" checked={checked.has(t.id)} onCheck={() => toggle(t.id)}
                        dueLabel={t.daysAgo} dueStyle="overdue" onSelect={onSelectTask} />
                    ))}
                  </TaskGroup>
                  <TaskGroup label="Today" count={MOCK_TASKS.today.length} countStyle="amber">
                    {MOCK_TASKS.today.map(t => (
                      <TaskRow key={t.id} task={t} type={t.priority === 'high' ? 'high' : 'normal'} checked={checked.has(t.id)} onCheck={() => toggle(t.id)}
                        dueLabel="Today" dueStyle="today" onSelect={onSelectTask} />
                    ))}
                  </TaskGroup>
                  <TaskGroup label="This Week" count={MOCK_TASKS.thisWeek.length} countStyle="blue">
                    {MOCK_TASKS.thisWeek.map(t => (
                      <TaskRow key={t.id} task={t} type="normal" checked={checked.has(t.id)} onCheck={() => toggle(t.id)}
                        dueLabel={t.due} dueStyle="soon" onSelect={onSelectTask} />
                    ))}
                  </TaskGroup>
                </>
              )}
            </div>

            {/* RIGHT PANEL */}
            <div>
              <div style={S.rightCard}>
                <div style={S.rcHdr}>Task Summary</div>
                {[
                  { label: 'Overdue', val: 3, valStyle: 'rust' },
                  { label: 'Due Today', val: 5, valStyle: 'amber' },
                  { label: 'This Week', val: 8, valStyle: null },
                  { label: 'Later', val: 10, valStyle: null },
                  { label: 'Completed Today', val: 4, valStyle: 'green' },
                ].map(r => (
                  <div key={r.label} style={S.rcRow}>
                    <span style={{ fontSize: 13, color: 'var(--ink3)' }}>{r.label}</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: r.valStyle ? `var(--${r.valStyle})` : 'var(--ink)' }}>{r.val}</span>
                  </div>
                ))}
              </div>

              <div style={S.rightCard}>
                <div style={S.rcHdr}>By Deal / Property</div>
                {[
                  { label: 'Pacific Mfg · LOI', val: '3 tasks', color: 'var(--amber)' },
                  { label: 'Teledyne WARN', val: '2 overdue', color: 'var(--rust)' },
                  { label: 'Rexford Irwindale', val: '2 tasks', color: 'var(--blue)' },
                  { label: 'Matrix Logistics', val: '1 task', color: 'var(--blue)' },
                ].map(r => (
                  <div key={r.label} style={S.rcRow}>
                    <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{r.label}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: r.color }}>{r.val}</span>
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
          {task.meta.linkLabel && <span style={{ color: task.meta.linkColor, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); alert(`${task.meta.linkLabel} — coming soon`); }}>{task.meta.linkLabel}</span>}
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
