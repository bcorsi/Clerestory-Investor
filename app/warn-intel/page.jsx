'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import SlideDrawer from '@/components/SlideDrawer';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function daysSince(d) {
  if (!d) return null;
  return Math.floor((new Date() - new Date(d)) / (1000 * 60 * 60 * 24));
}

export default function WarnIntelPage() {
  const [notices, setNotices]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [total, setTotal]             = useState(0);
  const [selectedId, setSelectedId]   = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);

  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');
  const [page, setPage]               = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { loadNotices(); }, [search, filter, page]);

  async function loadNotices() {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('warn_notices')
        .select('*', { count: 'exact' })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('notice_date', { ascending: false });

      if (search) query = query.or(`company_name.ilike.%${search}%,city.ilike.%${search}%,address.ilike.%${search}%`);
      if (filter === 'new') query = query.eq('lead_created', false);
      if (filter === 'matched') query = query.not('property_id', 'is', null);

      const { data, error, count } = await query;
      if (error) throw error;
      setNotices(data || []);
      setTotal(count || 0);
    } catch(e) {
      console.error('WARN error:', e);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }

  async function createLead(notice) {
    try {
      const supabase = createClient();
      await supabase.from('leads').insert({
        company_name: notice.company_name,
        address: notice.address,
        city: notice.city,
        status: 'active',
        catalyst_tags: [{ tag: 'WARN Act Filing', category: 'owner', priority: 'high' }],
        notes: `WARN filing: ${fmt(notice.layoff_count)} workers. Notice date: ${fmtDate(notice.notice_date)}. Effective date: ${fmtDate(notice.effective_date)}.`,
      });
      await supabase.from('warn_notices').update({ lead_created: true }).eq('id', notice.id);
      loadNotices();
    } catch(e) {
      console.error('Create lead error:', e);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const newCount = notices.filter(n => !n.lead_created).length;

  return (
    <div>
      {/* Header */}
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">WARN Intel</h1>
          <p className="cl-page-subtitle">
            {loading ? 'Loading…' : `${fmt(total)} filing${total !== 1 ? 's' : ''}${newCount > 0 ? ` · ${newCount} new` : ''}`}
          </p>
        </div>
        <div className="cl-page-actions">
          <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={loadNotices}>↻ Refresh</button>
        </div>
      </div>

      {/* What is WARN banner */}
      <div style={{
        background: 'rgba(88,56,160,0.06)', border: '1px solid rgba(88,56,160,0.15)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--purple)' }}>WARN Act:</strong>{' '}
          California requires employers to file 60-day advance notice before mass layoffs of 50+ workers.
          Each filing is a signal that a tenant may vacate — creating a potential acquisition or leasing opportunity.
          Auto-sync runs daily at 6am.
        </p>
      </div>

      {/* Filter bar */}
      <div className="cl-filter-bar">
        <input
          className="cl-search-input"
          placeholder="Search company, city…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ maxWidth: 320 }}
        />
        <div className="cl-tabs" style={{ margin: 0, border: 'none' }}>
          {[
            { k: 'all',     l: 'All Filings' },
            { k: 'new',     l: '🔴 New' },
            { k: 'matched', l: 'Property Matched' },
          ].map(f => (
            <button key={f.k} className={`cl-tab ${filter === f.k ? 'cl-tab--active' : ''}`}
              onClick={() => { setFilter(f.k); setPage(0); }} style={{ padding: '6px 12px' }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--card-bg)', fontSize: 14 }}>
          <thead>
            <tr>
              {[
                { label: 'Status',      width: 80 },
                { label: 'Company',     width: null },
                { label: 'City',        width: 130 },
                { label: 'Address',     width: 200 },
                { label: 'Workers',     width: 90 },
                { label: 'Notice Date', width: 120 },
                { label: 'Effective',   width: 120 },
                { label: 'Days Since',  width: 100 },
                { label: 'Action',      width: 130 },
              ].map(col => (
                <th key={col.label} style={{
                  width: col.width || undefined,
                  background: 'rgba(0,0,0,0.025)',
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.1em', color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', padding: '12px 14px',
                  textAlign: 'left', borderBottom: '1px solid var(--card-border)',
                  whiteSpace: 'nowrap',
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}>
                <div className="cl-loading" style={{ padding: 40 }}><div className="cl-spinner" />Loading WARN filings…</div>
              </td></tr>
            ) : notices.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="cl-empty" style={{ padding: 48 }}>
                  <div className="cl-empty-label">No WARN filings found</div>
                  <div className="cl-empty-sub">Auto-sync runs daily at 6am. Check back tomorrow.</div>
                </div>
              </td></tr>
            ) : notices.map(notice => {
              const days = daysSince(notice.notice_date);
              const isNew = !notice.lead_created;
              const isUrgent = days !== null && days <= 14;

              return (
                <tr key={notice.id}
                  onClick={() => { setSelectedId(notice.id); setSelectedNotice(notice); }}
                  style={{
                    background: selectedId === notice.id ? 'rgba(78,110,150,0.06)' : isNew ? 'rgba(184,55,20,0.02)' : undefined,
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    cursor: 'pointer', transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { if (selectedId !== notice.id) e.currentTarget.style.background = 'rgba(78,110,150,0.03)'; }}
                  onMouseLeave={e => { if (selectedId !== notice.id) e.currentTarget.style.background = isNew ? 'rgba(184,55,20,0.02)' : 'transparent'; }}
                >
                  {/* Status */}
                  <td style={{ padding: '12px 14px' }}>
                    {isNew ? (
                      <span className="cl-badge cl-badge-rust" style={{ fontSize: 10 }}>NEW</span>
                    ) : (
                      <span className="cl-badge cl-badge-gray" style={{ fontSize: 10 }}>LOGGED</span>
                    )}
                  </td>

                  {/* Company */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {notice.company_name}
                    </div>
                    {notice.property_id && (
                      <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                        ✓ Property matched
                      </div>
                    )}
                  </td>

                  {/* City */}
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {notice.city || '—'}
                  </td>

                  {/* Address */}
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {notice.address || '—'}
                  </td>

                  {/* Workers */}
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 13,
                    color: (notice.layoff_count || 0) >= 200 ? 'var(--rust)' : 'var(--text-secondary)',
                    fontWeight: (notice.layoff_count || 0) >= 200 ? 600 : 400,
                  }}>
                    {notice.layoff_count ? fmt(notice.layoff_count) : '—'}
                  </td>

                  {/* Notice date */}
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: isUrgent ? 'var(--rust)' : 'var(--text-secondary)',
                    fontWeight: isUrgent ? 600 : 400,
                  }}>
                    {fmtDate(notice.notice_date)}
                  </td>

                  {/* Effective date */}
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {fmtDate(notice.effective_date)}
                  </td>

                  {/* Days since */}
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: days !== null && days <= 7 ? 'var(--rust)' : days !== null && days <= 30 ? 'var(--amber)' : 'var(--text-tertiary)',
                  }}>
                    {days !== null ? `${days}d ago` : '—'}
                  </td>

                  {/* Action */}
                  <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                    {isNew ? (
                      <button
                        className="cl-btn cl-btn-primary cl-btn-sm"
                        onClick={() => createLead(notice)}
                        style={{ fontSize: 11 }}
                      >
                        + Create Lead
                      </button>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>Lead created</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {fmt(total)}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="cl-btn cl-btn-secondary cl-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="cl-btn cl-btn-secondary cl-btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* Drawer */}
      <SlideDrawer
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setSelectedNotice(null); }}
        title={selectedNotice?.company_name || 'WARN Filing'}
        subtitle={selectedNotice ? [selectedNotice.address, selectedNotice.city].filter(Boolean).join(' · ') : ''}
        badge={{ label: 'WARN', color: 'rust' }}
      >
        {selectedNotice && <WarnDetail notice={selectedNotice} onCreateLead={createLead} onClose={() => { setSelectedId(null); setSelectedNotice(null); }} />}
      </SlideDrawer>
    </div>
  );
}

// ── WARN DETAIL (drawer) ──────────────────────────────────
function WarnDetail({ notice, onCreateLead, onClose }) {
  const days = daysSince(notice.notice_date);
  const window60 = notice.effective_date ? Math.floor((new Date(notice.effective_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div>
      {/* 60-day window alert */}
      {window60 !== null && window60 > 0 && (
        <div style={{
          background: window60 <= 30 ? 'rgba(184,55,20,0.08)' : 'rgba(168,112,16,0.08)',
          border: `1px solid ${window60 <= 30 ? 'rgba(184,55,20,0.2)' : 'rgba(168,112,16,0.2)'}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>⏱</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: window60 <= 30 ? 'var(--rust)' : 'var(--amber)' }}>
              {window60} days until effective date
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              The 60-day WARN window closes {fmtDate(notice.effective_date)}. Act before vacancy hits the market.
            </div>
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'WORKERS',     value: notice.layoff_count ? fmt(notice.layoff_count) : '—' },
          { label: 'NOTICE DATE', value: fmtDate(notice.notice_date) },
          { label: 'EFFECTIVE',   value: fmtDate(notice.effective_date) },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'rgba(0,0,0,0.025)', borderRadius: 'var(--radius-md)', padding: '10px 12px', border: '1px solid var(--card-border)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {!notice.lead_created && (
          <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={() => { onCreateLead(notice); onClose(); }}>
            ⚡ Create Lead from Filing
          </button>
        )}
        <button className="cl-btn cl-btn-secondary cl-btn-sm">🔍 Search Property Database</button>
        <button className="cl-btn cl-btn-secondary cl-btn-sm">📋 Research Company</button>
      </div>

      {/* Details */}
      <div className="cl-card" style={{ padding: '14px 16px', marginBottom: 12 }}>
        <div className="cl-card-title" style={{ marginBottom: 10 }}>FILING DETAILS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Company', value: notice.company_name },
            { label: 'Address', value: notice.address || '—' },
            { label: 'City', value: notice.city || '—' },
            { label: 'Workers Affected', value: notice.layoff_count ? fmt(notice.layoff_count) : '—' },
            { label: 'Notice Date', value: fmtDate(notice.notice_date) },
            { label: 'Effective Date', value: fmtDate(notice.effective_date) },
            { label: 'Days Since Filing', value: days !== null ? `${days} days ago` : '—' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', width: 120, flexShrink: 0, paddingTop: 2 }}>
                {row.label.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Why this matters */}
      <div className="cl-card" style={{ padding: '14px 16px', borderLeft: '3px solid var(--purple)' }}>
        <div className="cl-card-title" style={{ marginBottom: 8 }}>WHY THIS MATTERS</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontFamily: 'var(--font-editorial)', fontStyle: 'italic' }}>
          A WARN filing means this tenant is contracting. If they occupy the building, the owner may face vacancy in 60 days.
          That creates a window to approach the owner before the building hits the market — when you have an information edge
          every other broker lacks.
        </p>
      </div>
    </div>
  );
}
