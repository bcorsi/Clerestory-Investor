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

      if (search) query = query.or(`company.ilike.%${search}%,county.ilike.%${search}%,address.ilike.%${search}%`);
      if (filter === 'new') query = query.eq('converted_lead_id', false);
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

  async function createLead(notice) {
    try {
      const supabase = createClient();

      // Auto-search for matched property
      let matchedPropertyId = notice.matched_property_id || null;
      if (!matchedPropertyId && notice.address) {
        const streetAddress = notice.address.split(',')[0];
        const { data: propMatches } = await supabase
          .from('properties')
          .select('id')
          .or(`address.ilike.%${streetAddress}%,tenant.ilike.%${notice.company}%,owner.ilike.%${notice.company}%`)
          .limit(1);
        if (propMatches && propMatches.length > 0) {
          matchedPropertyId = propMatches[0].id;
          await supabase.from('warn_notices').update({ matched_property_id: matchedPropertyId }).eq('id', notice.id);
        }
      }

      const { data: lead, error } = await supabase.from('leads').insert({
        lead_name: notice.company,
        company: notice.company,
        address: notice.address,
        city: notice.county,
        stage: 'New',
        priority: 'Medium',
        catalyst_tags: [{ tag: 'WARN Act Filing', category: 'owner', priority: 'high' }],
        notes: `WARN filing: ${fmt(notice.employees)} workers affected. Notice: ${fmtDate(notice.notice_date)}. Effective: ${fmtDate(notice.effective_date)}.${matchedPropertyId ? ' Matched to tracked property.' : ''}`,
        ...(matchedPropertyId ? { property_id: matchedPropertyId } : {}),
      }).select('id').single();

      if (error) throw error;
      if (lead?.id) {
        await supabase.from('warn_notices').update({ converted_lead_id: lead.id }).eq('id', notice.id);
      }
      loadNotices();
      alert(`Lead created for ${notice.company}${matchedPropertyId ? ' — matched to tracked property!' : '.'}`);
    } catch(e) {
      console.error('Create lead error:', e);
      alert('Error creating lead. Check console.');
    }
  }

  async function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());

    // Map common CA EDD WARN CSV column names
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
              const isNew = !notice.converted_lead_id;
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
                      {notice.company}
                    </div>
                    {notice.matched_property_id && (
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
                    color: (notice.employees || 0) >= 200 ? 'var(--rust)' : 'var(--text-secondary)',
                    fontWeight: (notice.employees || 0) >= 200 ? 600 : 400,
                  }}>
                    {notice.employees ? fmt(notice.employees) : '—'}
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
        title={selectedNotice?.company || 'WARN Filing'}
        subtitle={selectedNotice ? [selectedNotice.address, selectedNotice.city].filter(Boolean).join(' · ') : ''}
        badge={{ label: 'WARN', color: 'rust' }}
      >
        {selectedNotice && <WarnDetail notice={selectedNotice} onCreateLead={createLead} onSearchProperty={searchPropertyDatabase} onClose={() => { setSelectedId(null); setSelectedNotice(null); }} />}
      </SlideDrawer>
    </div>
  );
}

// ── WARN DETAIL (drawer) ──────────────────────────────────
function WarnDetail({ notice, onCreateLead, onSearchProperty, onClose }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const window60 = notice.effective_date ? Math.floor((new Date(notice.effective_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

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
    width: '100%', padding: '7px 10px',
    background: 'rgba(0,0,0,0.025)', border: '1px solid var(--card-border)',
    borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-ui)', fontSize: 13,
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
      {!editing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'WORKERS',     value: notice.employees ? fmt(notice.employees) : '—' },
            { label: 'NOTICE DATE', value: fmtDate(notice.notice_date) },
            { label: 'EFFECTIVE',   value: fmtDate(notice.effective_date) },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: 'rgba(0,0,0,0.025)', borderRadius: 'var(--radius-md)', padding: '10px 12px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {!notice.converted_lead_id && !editing && (
          <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={() => { onCreateLead(notice); onClose(); }}>
            ⚡ Create Lead from Filing
          </button>
        )}
        {!editing && <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={searchProperties}>
          {propSearching ? '🔍 Searching…' : '🔍 Search Property Database'}
        </button>}
        {!editing && <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => window.open(`/owner-search?q=${encodeURIComponent(notice.company)}`, '_blank')}>📋 Research Company</button>}
        <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => setEditing(e => !e)}>
          ✏️ {editing ? 'Cancel Edit' : 'Edit Filing'}
        </button>
        {editing && (
          <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={saveEdit} disabled={saving}>
            {saving ? 'Saving…' : '✓ Save Changes'}
          </button>
        )}
      </div>

      {/* EDIT FORM */}
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
          {/* Read-only details */}
          <div className="cl-card" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <div className="cl-card-title" style={{ marginBottom: 10 }}>FILING DETAILS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                <div key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', width: 130, flexShrink: 0, paddingTop: 2 }}>
                    {row.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Research Notes */}
          <div className="cl-card" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <div className="cl-card-title" style={{ marginBottom: 8 }}>RESEARCH NOTES</div>
            <p style={{ fontSize: 13, color: notice.research_notes ? 'var(--text-secondary)' : 'var(--text-tertiary)', lineHeight: 1.6, fontStyle: notice.research_notes ? 'normal' : 'italic' }}>
              {notice.research_notes || 'No notes yet. Click Edit Filing to add research.'}
            </p>
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
        </>
      )}
    </div>
  );
}
