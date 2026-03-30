'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import SlideDrawer from '@/components/SlideDrawer';
import Link from 'next/link';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const SCORE_COLOR = (s) => {
  if (s >= 75) return 'var(--rust)';
  if (s >= 50) return 'var(--amber)';
  if (s >= 25) return 'var(--blue)';
  return 'var(--text-tertiary)';
};

const STATUS_OPTIONS = ['active','watch','contacted','cold','converted','dead'];

export default function LeadsPage() {
  const [leads, setLeads]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('active');
  const [sortBy, setSortBy]         = useState('score');
  const [sortDir, setSortDir]       = useState('desc');
  const [page, setPage]             = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { loadLeads(); }, [search, statusFilter, sortBy, sortDir, page]);

  async function loadLeads() {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('leads')
        .select('id, company_name, address, city, score, status, catalyst_tags, contact_name, contact_phone, contact_email, follow_up_date, notes, building_sf, owner, created_at, updated_at', { count: 'exact' })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter) query = query.eq('status', statusFilter);
      if (search) query = query.or(`company_name.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`);
      query = query.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });

      const { data, error, count } = await query;
      if (error) throw error;
      setLeads(data || []);
      setTotal(count || 0);
    } catch(e) {
      console.error('Leads error:', e);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(lead) {
    setSelectedId(lead.id);
    setSelectedLead(lead);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Lead Gen</h1>
          <p className="cl-page-subtitle">
            {loading ? 'Loading…' : `${fmt(total)} lead${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="cl-page-actions">
          <button className="cl-btn cl-btn-primary cl-btn-sm">+ New Lead</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="cl-filter-bar">
        <input
          className="cl-search-input"
          placeholder="Search company, address, city…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ maxWidth: 340 }}
        />
        <div className="cl-tabs" style={{ margin: 0, border: 'none' }}>
          {[
            { k: 'active',    l: 'Active' },
            { k: '',          l: 'All' },
            { k: 'watch',     l: 'Watch' },
            { k: 'contacted', l: 'Contacted' },
            { k: 'converted', l: 'Converted' },
          ].map(f => (
            <button key={f.k} className={`cl-tab ${statusFilter === f.k ? 'cl-tab--active' : ''}`}
              onClick={() => { setStatus(f.k); setPage(0); }} style={{ padding: '6px 12px' }}>
              {f.l}
            </button>
          ))}
        </div>
        <select className="cl-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="score">Sort: Score</option>
          <option value="follow_up_date">Sort: Follow Up</option>
          <option value="updated_at">Sort: Recent</option>
          <option value="company_name">Sort: Name</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--card-bg)', fontSize: 14 }}>
          <thead>
            <tr>
              {[
                { key: 'score',        label: 'Score',      width: 80 },
                { key: 'company_name', label: 'Company',    width: null },
                { key: 'address',      label: 'Address',    width: 200 },
                { key: 'city',         label: 'City',       width: 130 },
                { key: 'building_sf',  label: 'SF',         width: 100 },
                { key: 'contact_name', label: 'Contact',    width: 150 },
                { key: 'status',       label: 'Status',     width: 100 },
                { key: 'follow_up_date', label: 'Follow Up', width: 110 },
                { key: 'catalyst_tags', label: 'Catalysts', width: 200 },
              ].map(col => (
                <th key={col.key} style={{
                  width: col.width || undefined,
                  background: 'rgba(0,0,0,0.025)',
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.1em', color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', padding: '12px 14px',
                  textAlign: 'left', borderBottom: '1px solid var(--card-border)',
                  whiteSpace: 'nowrap', cursor: 'pointer',
                }}
                onClick={() => {
                  if (sortBy === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                  else { setSortBy(col.key); setSortDir('desc'); }
                }}>
                  {col.label}
                  {sortBy === col.key && <span style={{ marginLeft: 4, opacity: 0.6 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}>
                <div className="cl-loading" style={{ padding: 40 }}><div className="cl-spinner" />Loading leads…</div>
              </td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="cl-empty" style={{ padding: 48 }}>
                  <div className="cl-empty-label">No leads found</div>
                  <div className="cl-empty-sub">
                    {statusFilter === 'active' ? 'Convert properties to leads to get started' : 'Try adjusting your filters'}
                  </div>
                </div>
              </td></tr>
            ) : leads.map(lead => (
              <LeadRow key={lead.id} lead={lead} selected={selectedId === lead.id} onClick={() => handleSelect(lead)} />
            ))}
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
        onClose={() => { setSelectedId(null); setSelectedLead(null); }}
        fullPageHref={selectedId ? `/leads/${selectedId}` : undefined}
        title={selectedLead?.company_name || 'Lead Detail'}
        subtitle={selectedLead ? [selectedLead.address, selectedLead.city].filter(Boolean).join(' · ') : ''}
        badge={selectedLead?.status ? { label: selectedLead.status, color: 'blue' } : undefined}
      >
        {selectedLead && <LeadDetail lead={selectedLead} onRefresh={loadLeads} />}
      </SlideDrawer>
    </div>
  );
}

// ── LEAD ROW ─────────────────────────────────────────────
function LeadRow({ lead, selected, onClick }) {
  const tags = Array.isArray(lead.catalyst_tags) ? lead.catalyst_tags : [];
  const scoreColor = lead.score != null ? SCORE_COLOR(lead.score) : 'var(--text-tertiary)';
  const followUpPast = lead.follow_up_date && new Date(lead.follow_up_date) < new Date();

  const statusColors = {
    active: 'green', watch: 'blue', contacted: 'amber',
    cold: 'gray', converted: 'purple', dead: 'gray'
  };

  return (
    <tr onClick={onClick} style={{
      background: selected ? 'rgba(78,110,150,0.06)' : undefined,
      borderBottom: '1px solid rgba(0,0,0,0.04)',
      cursor: 'pointer', transition: 'background 120ms',
    }}
    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(78,110,150,0.03)'; }}
    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Score */}
      <td style={{ padding: '12px 14px' }}>
        {lead.score != null ? (
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${scoreColor}`, color: scoreColor,
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
          }}>
            {lead.score}
          </div>
        ) : <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>—</span>}
      </td>

      {/* Company */}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--blue)', cursor: 'pointer' }}>
          {lead.company_name || 'Unnamed Lead'}
        </div>
        {lead.owner && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{lead.owner}</div>}
      </td>

      {/* Address */}
      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
        {lead.address || '—'}
      </td>

      {/* City */}
      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
        {lead.city || '—'}
      </td>

      {/* SF */}
      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
        {lead.building_sf ? fmt(lead.building_sf) : '—'}
      </td>

      {/* Contact */}
      <td style={{ padding: '12px 14px' }}>
        {lead.contact_name ? (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{lead.contact_name}</div>
            {lead.contact_phone && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{lead.contact_phone}</div>}
          </div>
        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
      </td>

      {/* Status */}
      <td style={{ padding: '12px 14px' }}>
        <span className={`cl-badge cl-badge-${statusColors[lead.status] || 'gray'}`} style={{ fontSize: 11 }}>
          {lead.status || '—'}
        </span>
      </td>

      {/* Follow up */}
      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12,
        color: followUpPast ? 'var(--rust)' : 'var(--text-secondary)',
        fontWeight: followUpPast ? 600 : 400,
      }}>
        {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
        {followUpPast && <span style={{ marginLeft: 4 }}>⚠</span>}
      </td>

      {/* Catalysts */}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {tags.slice(0, 3).map((tag, i) => {
            const cat = typeof tag === 'object' ? tag.category : 'asset';
            const lbl = typeof tag === 'object' ? tag.tag : tag;
            return <span key={i} className={`cl-catalyst cl-catalyst--${cat || 'asset'}`} style={{ fontSize: 10 }}>{lbl}</span>;
          })}
          {tags.length > 3 && <span className="cl-badge cl-badge-gray" style={{ fontSize: 10 }}>+{tags.length - 3}</span>}
        </div>
      </td>
    </tr>
  );
}

// ── LEAD DETAIL (drawer) ──────────────────────────────────
function LeadDetail({ lead, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const TABS = ['overview', 'activity', 'outreach', 'files'];

  useEffect(() => { loadActivity(); }, [lead.id]);

  async function loadActivity() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from('activities').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(20);
      setActivities(data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  const tags = Array.isArray(lead.catalyst_tags) ? lead.catalyst_tags : [];
  const scoreColor = lead.score != null ? SCORE_COLOR(lead.score) : 'var(--text-tertiary)';

  return (
    <div>
      {/* Score + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 10, marginBottom: 18, alignItems: 'center' }}>
        {lead.score != null && (
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `3px solid ${scoreColor}`, color: scoreColor,
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
          }}>
            {lead.score}
          </div>
        )}
        {[
          { label: 'STATUS',    value: lead.status || '—' },
          { label: 'SF',        value: lead.building_sf ? fmt(lead.building_sf) : '—' },
          { label: 'FOLLOW UP', value: lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'rgba(0,0,0,0.025)', borderRadius: 'var(--radius-md)', padding: '10px 12px', border: '1px solid var(--card-border)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Catalyst tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
          {tags.map((tag, i) => {
            const cat = typeof tag === 'object' ? tag.category : 'asset';
            const lbl = typeof tag === 'object' ? tag.tag : tag;
            return <span key={i} className={`cl-catalyst cl-catalyst--${cat || 'asset'}`}>{lbl}</span>;
          })}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {['📞 Log Call', '✉️ Log Email', '📝 Add Note', '+ Task'].map(a => (
          <button key={a} className="cl-btn cl-btn-secondary cl-btn-sm">{a}</button>
        ))}
      </div>

      {/* Tabs */}
      <div className="cl-tabs">
        {TABS.map(tab => (
          <button key={tab} className={`cl-tab ${activeTab === tab ? 'cl-tab--active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Contact info */}
          {(lead.contact_name || lead.contact_phone || lead.contact_email) && (
            <div className="cl-card" style={{ padding: '14px 16px' }}>
              <div className="cl-card-title" style={{ marginBottom: 10 }}>CONTACT</div>
              {lead.contact_name && <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{lead.contact_name}</div>}
              {lead.contact_phone && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📞</span>
                  <a href={`tel:${lead.contact_phone}`} style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none' }}>{lead.contact_phone}</a>
                </div>
              )}
              {lead.contact_email && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>✉️</span>
                  <a href={`mailto:${lead.contact_email}`} style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none' }}>{lead.contact_email}</a>
                </div>
              )}
            </div>
          )}
          {/* Notes */}
          {lead.notes && (
            <div className="cl-card" style={{ padding: '14px 16px' }}>
              <div className="cl-card-title" style={{ marginBottom: 8 }}>NOTES</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{lead.notes}</p>
            </div>
          )}
          {/* Convert to Deal */}
          <div className="cl-card" style={{ padding: '14px 16px', borderLeft: '3px solid var(--green)' }}>
            <div className="cl-card-title" style={{ marginBottom: 8 }}>PIPELINE</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Ready to move this lead into active deal tracking?</p>
            <button className="cl-btn cl-btn-primary cl-btn-sm">Convert to Deal →</button>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div>
          {loading ? (
            <div className="cl-loading"><div className="cl-spinner" /></div>
          ) : activities.length === 0 ? (
            <div className="cl-empty">
              <div className="cl-empty-label">No activity yet</div>
              <div className="cl-empty-sub">Log a call or note to start</div>
            </div>
          ) : activities.map((act, i) => (
            <div key={act.id} style={{ display: 'flex', gap: 12, paddingBottom: 16, borderLeft: '2px solid var(--card-border)', marginLeft: 8, paddingLeft: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: 'var(--blue3)', border: '2px solid var(--bg)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{act.subject || act.activity_type}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                    {new Date(act.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {act.body && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{act.body}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'outreach' && (
        <div className="cl-empty">
          <div className="cl-empty-label">No outreach logged</div>
          <div className="cl-empty-sub">Log calls and emails to track outreach history</div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="cl-empty">
          <div className="cl-empty-label">No files</div>
          <div className="cl-empty-sub">Upload BOVs, research, or documents</div>
        </div>
      )}
    </div>
  );
}
