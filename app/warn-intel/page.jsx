'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import SlideDrawer from '@/components/SlideDrawer';
import { CATALYST_TAGS, CATALYST_CATEGORIES } from '@/lib/constants';

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
  const [notices, setNotices]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [total, setTotal]                   = useState(0);
  const [selectedId, setSelectedId]         = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [warnModalNotice, setWarnModalNotice] = useState(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage]     = useState(0);
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

      if (search) query = query.or(`company.ilike.%${search}%,county.ilike.%${search}%,address.ilike.%${search}%`);
      if (filter === 'new') query = query.is('converted_lead_id', null);
      if (filter === 'matched') query = query.not('matched_property_id', 'is', null);

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

  async function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());

    const col = (name) => {
      const aliases = {
        company:        ['company', 'employer', 'employer name', 'company name'],
        notice_date:    ['notice date', 'notice_date', 'warn date', 'date'],
        effective_date: ['effective date', 'effective_date', 'layoff date'],
        employees:      ['employees', 'employees affected', 'workers', 'layoff count', '# employees'],
        address:        ['address', 'street address', 'location'],
        county:         ['county', 'city', 'location city'],
      };
      const list = aliases[name] || [name];
      for (const a of list) {
        const idx = headers.indexOf(a);
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
      if (!vals[col('company')]) continue;
      rows.push({
        company:        vals[col('company')] || null,
        notice_date:    vals[col('notice_date')] || null,
        effective_date: vals[col('effective_date')] || null,
        employees:      parseInt(vals[col('employees')]) || null,
        address:        vals[col('address')] || null,
        county:         vals[col('county')] || null,
        is_industrial:  false,
        is_in_market:   false,
      });
    }

    if (rows.length === 0) { alert('No valid rows found in CSV.'); return; }
    const supabase = createClient();
    const { error } = await supabase.from('warn_notices').upsert(rows, { onConflict: 'company,notice_date', ignoreDuplicates: true });
    if (error) { alert(`Import error: ${error.message}`); return; }
    alert(`Imported ${rows.length} WARN filings.`);
    loadNotices();
    e.target.value = '';
  }

  async function searchPropertyDatabase(notice) {
    const supabase = createClient();
    const streetAddress = (notice.address || '').split(',')[0];
    const { data } = await supabase
      .from('properties')
      .select('id, address, city, tenant, owner, building_sf')
      .or(`address.ilike.%${streetAddress}%,tenant.ilike.%${notice.company}%,owner.ilike.%${notice.company}%`)
      .limit(5);
    if (data && data.length > 0) {
      const matches = data.map(p => `• ${p.address} (${p.city || ''}) — ${p.tenant || p.owner || 'No tenant/owner'}`).join('\n');
      alert(`Found ${data.length} match(es):\n\n${matches}`);
    } else {
      alert(`No matches found for "${notice.company}" or "${streetAddress}"`);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const newCount = notices.filter(n => !n.converted_lead_id).length;

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
          <label className="cl-btn cl-btn-secondary cl-btn-sm" style={{ cursor: 'pointer' }}>
            📥 Import CSV
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
          </label>
          <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={loadNotices}>↻ Refresh</button>
        </div>
      </div>

      {/* WARN explanation banner */}
      <div style={{
        background: 'rgba(88,56,160,0.06)', border: '1px solid rgba(88,56,160,0.15)',
        borderRadius: 10, padding: '14px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>⚡</span>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
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
              onClick={() => { setFilter(f.k); setPage(0); }} style={{ padding: '6px 14px' }}>
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
                { label: 'Status',      width: 90 },
                { label: 'Company',     width: null },
                { label: 'City',        width: 140 },
                { label: 'Address',     width: 220 },
                { label: 'Workers',     width: 100 },
                { label: 'Notice Date', width: 130 },
                { label: 'Effective',   width: 130 },
                { label: 'Days Since',  width: 110 },
                { label: 'Action',      width: 150 },
              ].map(col => (
                <th key={col.label} style={{
                  width: col.width || undefined,
                  background: 'rgba(0,0,0,0.025)',
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.1em', color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', padding: '14px 18px',
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
                <div className="cl-loading" style={{ padding: 48 }}><div className="cl-spinner" />Loading WARN filings…</div>
              </td></tr>
            ) : notices.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="cl-empty" style={{ padding: 56 }}>
                  <div className="cl-empty-label">No WARN filings found</div>
                  <div className="cl-empty-sub">Auto-sync runs daily at 6am. Check back tomorrow.</div>
                </div>
              </td></tr>
            ) : notices.map(notice => {
              const days = daysSince(notice.notice_date);
              const isNew = !notice.converted_lead_id;
              const isUrgent = days !== null && days <= 14;

              return (
                <tr key={notice.id}
                  onClick={() => { setSelectedId(notice.id); setSelectedNotice(notice); }}
                  style={{
                    background: selectedId === notice.id ? 'rgba(78,110,150,0.06)' : isNew ? 'rgba(184,55,20,0.02)' : undefined,
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    cursor: 'pointer', transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { if (selectedId !== notice.id) e.currentTarget.style.background = 'rgba(78,110,150,0.03)'; }}
                  onMouseLeave={e => { if (selectedId !== notice.id) e.currentTarget.style.background = isNew ? 'rgba(184,55,20,0.02)' : 'transparent'; }}
                >
                  {/* Status */}
                  <td style={{ padding: '18px 18px' }}>
                    {isNew ? (
                      <span className="cl-badge cl-badge-rust" style={{ fontSize: 11 }}>NEW</span>
                    ) : (
                      <span className="cl-badge cl-badge-gray" style={{ fontSize: 11 }}>LOGGED</span>
                    )}
                  </td>

                  {/* Company */}
                  <td style={{ padding: '18px 18px' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {notice.company}
                    </div>
                    {notice.matched_property_id && (
                      <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        ✓ Property matched
                      </div>
                    )}
                  </td>

                  {/* City */}
                  <td style={{ padding: '18px 18px', fontSize: 14, color: 'var(--text-secondary)' }}>
                    {notice.city || notice.county || '—'}
                  </td>

                  {/* Address */}
                  <td style={{ padding: '18px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {notice.address || '—'}
                  </td>

                  {/* Workers */}
                  <td style={{
                    padding: '18px 18px', fontFamily: 'var(--font-mono)', fontSize: 14,
                    color: (notice.employees || 0) >= 200 ? 'var(--rust)' : 'var(--text-secondary)',
                    fontWeight: (notice.employees || 0) >= 200 ? 600 : 400,
                  }}>
                    {notice.employees ? fmt(notice.employees) : '—'}
                  </td>

                  {/* Notice date */}
                  <td style={{
                    padding: '18px 18px', fontFamily: 'var(--font-mono)', fontSize: 13,
                    color: isUrgent ? 'var(--rust)' : 'var(--text-secondary)',
                    fontWeight: isUrgent ? 600 : 400,
                  }}>
                    {fmtDate(notice.notice_date)}
                  </td>

                  {/* Effective date */}
                  <td style={{ padding: '18px 18px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {fmtDate(notice.effective_date)}
                  </td>

                  {/* Days since */}
                  <td style={{
                    padding: '18px 18px', fontFamily: 'var(--font-mono)', fontSize: 13,
                    color: days !== null && days <= 7 ? 'var(--rust)' : days !== null && days <= 30 ? 'var(--amber)' : 'var(--text-tertiary)',
                  }}>
                    {days !== null ? `${days}d ago` : '—'}
                  </td>

                  {/* Action */}
                  <td style={{ padding: '18px 18px' }} onClick={e => e.stopPropagation()}>
                    {isNew ? (
                      <button
                        className="cl-btn cl-btn-primary cl-btn-sm"
                        onClick={() => setWarnModalNotice(notice)}
                        style={{ fontSize: 12 }}
                      >
                        + Create Lead
                      </button>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                        Lead created
                      </span>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {fmt(total)}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="cl-btn cl-btn-secondary cl-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="cl-btn cl-btn-secondary cl-btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* Slide Drawer */}
      <SlideDrawer
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setSelectedNotice(null); }}
        fullPageHref={selectedId ? `/warn-intel/${selectedId}` : undefined}
        title={selectedNotice?.company || 'WARN Filing'}
        subtitle={selectedNotice ? [selectedNotice.address, selectedNotice.county].filter(Boolean).join(' · ') : ''}
        badge={{ label: 'WARN', color: 'rust' }}
      >
        {selectedNotice && (
          <WarnDetail
            notice={selectedNotice}
            onCreateLead={() => setWarnModalNotice(selectedNotice)}
            onSearchProperty={searchPropertyDatabase}
            onClose={() => { setSelectedId(null); setSelectedNotice(null); }}
          />
        )}
      </SlideDrawer>

      {/* Create Lead Modal */}
      {warnModalNotice && (
        <CreateLeadFromWarnModal
          notice={warnModalNotice}
          onClose={() => setWarnModalNotice(null)}
          onSuccess={(leadId) => {
            setWarnModalNotice(null);
            setSelectedId(null);
            setSelectedNotice(null);
            setNotices(prev => prev.map(n =>
              n.id === warnModalNotice?.id ? { ...n, converted_lead_id: leadId } : n
            ));
          }}
        />
      )}
    </div>
  );
}

// ── WARN DETAIL (drawer) ──────────────────────────────────────
function WarnDetail({ notice, onCreateLead, onSearchProperty, onClose }) {
  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [propResults, setPropResults] = useState(null);
  const [propSearching, setPropSearching] = useState(false);
  const [form, setForm] = useState({
    company:        notice.company || '',
    address:        notice.address || '',
    county:         notice.county || '',
    employees:      notice.employees || '',
    notice_date:    notice.notice_date || '',
    effective_date: notice.effective_date || '',
    is_industrial:  notice.is_industrial || false,
    is_in_market:   notice.is_in_market || false,
    research_notes: notice.research_notes || '',
  });

  const days = daysSince(notice.notice_date);
  const window60 = notice.effective_date
    ? Math.floor((new Date(notice.effective_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function searchProperties() {
    setPropSearching(true);
    setPropResults(null);
    try {
      const supabase = createClient();
      const streetAddress = (notice.address || '').split(',')[0];
      const { data } = await supabase
        .from('properties')
        .select('id, address, city, tenant, owner, building_sf, vacancy_status')
        .or(`address.ilike.%${streetAddress}%,tenant.ilike.%${notice.company}%,owner.ilike.%${notice.company}%`)
        .limit(5);
      setPropResults(data || []);
      if (data && data.length > 0 && !notice.matched_property_id) {
        const supabase2 = createClient();
        await supabase2.from('warn_notices').update({ matched_property_id: data[0].id }).eq('id', notice.id);
      }
    } catch(e) { console.error(e); setPropResults([]); }
    finally { setPropSearching(false); }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('warn_notices').update({
        company:        form.company,
        address:        form.address,
        county:         form.county,
        employees:      parseInt(form.employees) || null,
        notice_date:    form.notice_date || null,
        effective_date: form.effective_date || null,
        is_industrial:  form.is_industrial,
        is_in_market:   form.is_in_market,
        research_notes: form.research_notes,
      }).eq('id', notice.id);
      setEditing(false);
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'rgba(0,0,0,0.025)', border: '1px solid var(--card-border)',
    borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 13,
    color: 'var(--text-primary)', outline: 'none',
  };
  const labelStyle = {
    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
    color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4, display: 'block',
  };

  return (
    <div>
      {/* 60-day window alert */}
      {window60 !== null && window60 > 0 && (
        <div style={{
          background: window60 <= 30 ? 'rgba(184,55,20,0.08)' : 'rgba(168,112,16,0.08)',
          border: `1px solid ${window60 <= 30 ? 'rgba(184,55,20,0.2)' : 'rgba(168,112,16,0.2)'}`,
          borderRadius: 10, padding: '14px 18px', marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>⏱</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: window60 <= 30 ? 'var(--rust)' : 'var(--amber)' }}>
              {window60} days until effective date
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
              The 60-day WARN window closes {fmtDate(notice.effective_date)}. Act before vacancy hits the market.
            </div>
          </div>
        </div>
      )}

      {/* KPI grid */}
      {!editing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'WORKERS',     value: notice.employees ? fmt(notice.employees) : '—' },
            { label: 'NOTICE DATE', value: fmtDate(notice.notice_date) },
            { label: 'EFFECTIVE',   value: fmtDate(notice.effective_date) },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: 'rgba(0,0,0,0.025)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 6 }}>{kpi.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {!notice.converted_lead_id && !editing && (
          <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={onCreateLead}>
            ⚡ Create Lead from Filing
          </button>
        )}
        {!editing && (
          <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={searchProperties}>
            {propSearching ? '🔍 Searching…' : '🔍 Search Property Database'}
          </button>
        )}
        {!editing && (
          <button className="cl-btn cl-btn-secondary cl-btn-sm"
            onClick={() => window.open(`/owner-search?q=${encodeURIComponent(notice.company)}`, '_blank')}>
            📋 Research Company
          </button>
        )}
        <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => setEditing(e => !e)}>
          ✏️ {editing ? 'Cancel Edit' : 'Edit Filing'}
        </button>
        {editing && (
          <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={saveEdit} disabled={saving}>
            {saving ? 'Saving…' : '✓ Save Changes'}
          </button>
        )}
      </div>

      {/* Edit form */}
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Company</label>
              <input style={inputStyle} value={form.company} onChange={e => setField('company', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>County</label>
              <input style={inputStyle} value={form.county} onChange={e => setField('county', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.address} onChange={e => setField('address', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Employees Affected</label>
              <input style={inputStyle} type="number" value={form.employees} onChange={e => setField('employees', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Notice Date</label>
              <input style={inputStyle} type="date" value={form.notice_date} onChange={e => setField('notice_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Effective Date</label>
              <input style={inputStyle} type="date" value={form.effective_date} onChange={e => setField('effective_date', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_industrial} onChange={e => setField('is_industrial', e.target.checked)} />
              <span style={{ color: 'var(--text-secondary)' }}>Industrial Property</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_in_market} onChange={e => setField('is_in_market', e.target.checked)} />
              <span style={{ color: 'var(--text-secondary)' }}>In My Market</span>
            </label>
          </div>
          <div>
            <label style={labelStyle}>Research Notes</label>
            <textarea
              value={form.research_notes}
              onChange={e => setField('research_notes', e.target.value)}
              placeholder="Matched property, outreach status, owner intel..."
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Filing details */}
          <div className="cl-card" style={{ padding: '16px 18px', marginBottom: 14 }}>
            <div className="cl-card-title" style={{ marginBottom: 12 }}>FILING DETAILS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Company',          value: notice.company },
                { label: 'Address',          value: notice.address || '—' },
                { label: 'County',           value: notice.county || '—' },
                { label: 'Workers Affected', value: notice.employees ? fmt(notice.employees) : '—' },
                { label: 'Notice Date',      value: fmtDate(notice.notice_date) },
                { label: 'Effective Date',   value: fmtDate(notice.effective_date) },
                { label: 'Days Since',       value: days !== null ? `${days} days ago` : '—' },
                { label: 'Industrial',       value: notice.is_industrial ? 'Yes' : 'No' },
                { label: 'In Market',        value: notice.is_in_market ? 'Yes' : 'No' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', width: 140, flexShrink: 0, paddingTop: 2 }}>
                    {row.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Research notes */}
          <div className="cl-card" style={{ padding: '16px 18px', marginBottom: 14 }}>
            <div className="cl-card-title" style={{ marginBottom: 10 }}>RESEARCH NOTES</div>
            <p style={{
              fontSize: 13, lineHeight: 1.6,
              color: notice.research_notes ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              fontStyle: notice.research_notes ? 'normal' : 'italic',
            }}>
              {notice.research_notes || 'No notes yet. Click Edit Filing to add research.'}
            </p>
          </div>

          {/* Property search results */}
          {propResults !== null && (
            <div className="cl-card" style={{ padding: '16px 18px', marginBottom: 14 }}>
              <div className="cl-card-title" style={{ marginBottom: 12 }}>
                PROPERTY DATABASE RESULTS{propResults.length > 0 ? ` — ${propResults.length} MATCH${propResults.length > 1 ? 'ES' : ''}` : ' — NO MATCHES'}
              </div>
              {propResults.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  No properties found matching "{notice.company}" or "{(notice.address || '').split(',')[0]}".
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {propResults.map(p => (
                    <div key={p.id} style={{ padding: '12px 14px', background: 'rgba(78,110,150,0.04)', borderRadius: 8, border: '1px solid rgba(78,110,150,0.12)' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>{p.address}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {p.city && <span>{p.city}</span>}
                        {p.building_sf && <span>{Number(p.building_sf).toLocaleString()} SF</span>}
                        {p.tenant && <span>Tenant: {p.tenant}</span>}
                        {p.owner && <span>Owner: {p.owner}</span>}
                        {p.vacancy_status && (
                          <span className={`cl-badge cl-badge-${p.vacancy_status === 'Vacant' ? 'rust' : 'green'}`} style={{ fontSize: 10 }}>
                            {p.vacancy_status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Why this matters */}
          <div className="cl-card" style={{ padding: '16px 18px', borderLeft: '3px solid var(--purple)' }}>
            <div className="cl-card-title" style={{ marginBottom: 12 }}>WHY THIS MATTERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚡</span>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65, fontWeight: 500 }}>
                  {notice.company} filed a WARN notice affecting {notice.employees ? `${Number(notice.employees).toLocaleString()} workers` : 'an unknown number of workers'} — effective {fmtDate(notice.effective_date)}.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🏭</span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {window60 !== null && window60 > 0
                    ? `You have ${window60} days before vacancy hits. That's your window to approach the owner before this building goes to market.`
                    : window60 !== null && window60 <= 0
                    ? `The effective date has passed — vacancy may already be occurring. Contact the property owner immediately.`
                    : `The 60-day window is your edge. Other brokers won't know until the space appears on CoStar.`
                  }
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>
                  {notice.matched_property_id || (propResults && propResults.length > 0) ? '✅' : '🔎'}
                </span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {notice.matched_property_id || (propResults && propResults.length > 0)
                    ? `Matched to ${propResults && propResults.length > 0 ? propResults[0].address : 'a tracked property'} in your database. Create a lead to start tracking outreach.`
                    : propResults !== null && propResults.length === 0
                    ? `No match found in your property database. This tenant may be at an untracked location — research the owner and consider adding the property.`
                    : `Click Search Property Database above to check if this address is in your tracked database.`
                  }
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── CREATE LEAD FROM WARN MODAL ───────────────────────────────
function CreateLeadFromWarnModal({ notice, onClose, onSuccess }) {
  const [saving, setSaving]         = useState(false);
  const [matchedProp, setMatchedProp] = useState(null);

  const autoSuggested = ['WARN Notice', 'M&A — Acquisition', 'Relocation Risk'];
  const [selectedTags, setSelectedTags] = useState(autoSuggested);
  const [form, setForm] = useState({
    lead_name: notice.company || '',
    company:   notice.company || '',
    address:   notice.address || '',
    city:      notice.county || '',
    stage:     'New',
    priority:  'High',
    source:    'WARN Intel',
    notes:     `WARN filing: ${notice.employees ? Number(notice.employees).toLocaleString() : '—'} workers affected. Notice: ${notice.notice_date || '—'}. Effective: ${notice.effective_date || '—'}.`,
  });

  useEffect(() => {
    async function findProperty() {
      if (!notice.address && !notice.company) return;
      try {
        const supabase = createClient();
        const streetAddress = (notice.address || '').split(',')[0];
        const { data } = await supabase
          .from('properties')
          .select('id, address, city, building_sf, lease_expiration, owner_type, tenant')
          .or(`address.ilike.%${streetAddress}%,tenant.ilike.%${notice.company}%,owner.ilike.%${notice.company}%`)
          .limit(1)
          .single();
        if (data) {
          setMatchedProp(data);
          const extra = [];
          if (data.lease_expiration) {
            const months = Math.round((new Date(data.lease_expiration) - new Date()) / (1000 * 60 * 60 * 24 * 30));
            if (months <= 12) extra.push('Lease Exp < 12 Mo');
            else if (months <= 24) extra.push('Lease Exp 12–24 Mo');
          }
          if (data.owner_type === 'Owner-User') extra.push('SLB Potential');
          if (extra.length > 0) setSelectedTags(prev => [...new Set([...prev, ...extra])]);
        }
      } catch(e) { /* no match found */ }
    }
    findProperty();
  }, []);

  function toggleTag(key) {
    setSelectedTags(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  const score = Math.min(100, selectedTags.reduce((s, key) => {
    const tag = CATALYST_TAGS.find(t => t.key === key);
    return s + (tag?.scoreBoost || 5);
  }, matchedProp ? 20 : 10));

  async function handleCreate() {
    setSaving(true);
    try {
      const supabase = createClient();
      const catalystPayload = selectedTags.map(key => {
        const tag = CATALYST_TAGS.find(t => t.key === key);
        return {
          tag:      tag?.label || key,
          category: tag ? tag.category.toLowerCase().split(' ')[0] : 'owner',
          priority: tag?.priority?.toLowerCase() || 'medium',
        };
      });

      const { data: lead, error } = await supabase.from('leads').insert({
        lead_name:     form.lead_name,
        company:       form.company,
        address:       form.address,
        city:          form.city,
        stage:         form.stage,
        priority:      form.priority,
        source:        form.source,
        score,
        catalyst_tags: JSON.stringify(catalystPayload),
        notes:         form.notes,
        ...(matchedProp ? { property_id: matchedProp.id } : {}),
      }).select('id').single();

      if (error) throw error;

      await supabase.from('warn_notices')
        .update({ converted_lead_id: lead.id })
        .eq('id', notice.id);

      onSuccess(lead.id);
    } catch(e) {
      console.error('Create lead error:', e);
      alert('Error creating lead: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'rgba(0,0,0,0.025)', border: '1px solid var(--card-border)',
    borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 13,
    color: 'var(--text-primary)', outline: 'none',
  };
  const labelStyle = {
    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
    color: 'var(--text-tertiary)', textTransform: 'uppercase',
    marginBottom: 4, display: 'block',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 16,
        width: '100%', maxWidth: 700,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }}>
        {/* Modal header */}
        <div style={{
          background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.08)',
          padding: '18px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              Create Lead from WARN Filing
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{notice.company}</div>
          </div>
          <button onClick={onClose} style={{ fontSize: 22, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Matched property banner */}
          {matchedProp && (
            <div style={{
              background: 'rgba(24,112,66,0.06)', border: '1px solid rgba(24,112,66,0.2)',
              borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>Matched to tracked property</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {matchedProp.address}{matchedProp.building_sf ? ` · ${Number(matchedProp.building_sf).toLocaleString()} SF` : ''}
                </div>
              </div>
            </div>
          )}

          {/* Lead form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Lead Name</label>
              <input style={inputStyle} value={form.lead_name} onChange={e => setForm(f => ({ ...f, lead_name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input style={inputStyle} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>City / County</label>
              <input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Stage</label>
              <select style={inputStyle} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                {['New', 'Researching', 'Decision Maker Identified', 'Contacted'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {/* Catalyst tags */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Catalyst Tags</label>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
                color: score >= 70 ? 'var(--rust)' : score >= 50 ? 'var(--amber)' : 'var(--blue)',
              }}>
                Score: {score}
              </div>
            </div>
            {Object.keys(CATALYST_CATEGORIES).map(cat => {
              const catTags = CATALYST_TAGS.filter(t => t.category === cat);
              const catStyle = CATALYST_CATEGORIES[cat];
              return (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: catStyle.color, marginBottom: 8,
                  }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {catTags.map(tag => {
                      const selected = selectedTags.includes(tag.key);
                      const isAuto = autoSuggested.includes(tag.key);
                      return (
                        <div key={tag.key} onClick={() => toggleTag(tag.key)} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                          fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)',
                          border: `1.5px solid ${selected ? catStyle.color : 'rgba(0,0,0,0.12)'}`,
                          background: selected ? catStyle.bg : 'transparent',
                          color: selected ? catStyle.color : 'var(--text-tertiary)',
                          transition: 'all 0.12s',
                        }}>
                          {isAuto && selected && <span style={{ fontSize: 8 }}>★</span>}
                          {tag.label}
                          {tag.priority === 'HIGH' && <span style={{ fontSize: 8, opacity: 0.6 }}>●</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: 4 }}>
              ★ Auto-suggested from WARN filing · Score updates as you select tags
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
            <button className="cl-btn cl-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="cl-btn cl-btn-primary" onClick={handleCreate} disabled={saving} style={{ minWidth: 180 }}>
              {saving ? 'Creating…' : `⚡ Create Lead (Score: ${score})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
