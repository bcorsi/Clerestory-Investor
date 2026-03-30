'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import SlideDrawer from '@/components/SlideDrawer';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function LeaseCompsPage() {
  const [comps, setComps]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedComp, setSelectedComp] = useState(null);

  const [search, setSearch]         = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy]         = useState('start_date');
  const [sortDir, setSortDir]       = useState('desc');
  const [page, setPage]             = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { loadComps(); }, [search, cityFilter, sortBy, sortDir, page]);

  async function loadComps() {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('lease_comps')
        .select('id, address, city, submarket, tenant, rsf, rate, lease_type, term_months, start_date, end_date, free_rent_months, ti_psf, gross_equivalent, total_expenses_psf, escalation, deal_type, landlord, broker, source, notes', { count: 'exact' })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });

      if (search) query = query.or(`address.ilike.%${search}%,tenant.ilike.%${search}%,city.ilike.%${search}%`);
      if (cityFilter) query = query.eq('city', cityFilter);

      const { data, error, count } = await query;
      if (error) throw error;
      setComps(data || []);
      setTotal(count || 0);
    } catch(e) {
      console.error(e);
      setComps([]);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Lease Comps</h1>
          <p className="cl-page-subtitle">
            {loading ? 'Loading…' : `${fmt(total)} comp${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="cl-page-actions">
          <button className="cl-btn cl-btn-secondary cl-btn-sm">Import CSV</button>
          <button className="cl-btn cl-btn-primary cl-btn-sm">+ Add Comp</button>
        </div>
      </div>

      <div className="cl-filter-bar">
        <input className="cl-search-input" placeholder="Search address, tenant, city…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }} style={{ maxWidth: 340 }} />
        <select className="cl-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="start_date">Sort: Date</option>
          <option value="rate">Sort: Rate</option>
          <option value="rsf">Sort: Size</option>
          <option value="gross_equivalent">Sort: Gross Rate</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--card-bg)', fontSize: 14, minWidth: 1200 }}>
          <thead>
            <tr>
              {[
                { label: 'Address',     width: null },
                { label: 'City',        width: 130 },
                { label: 'Tenant',      width: 180 },
                { label: 'RSF',         width: 100 },
                { label: 'NNN Rate',    width: 90 },
                { label: 'Gross Equiv', width: 100 },
                { label: 'Type',        width: 80 },
                { label: 'Term',        width: 80 },
                { label: 'Start',       width: 90 },
                { label: 'TI/SF',       width: 75 },
                { label: 'Free Rent',   width: 85 },
                { label: 'Escalation',  width: 90 },
                { label: 'Landlord',    width: 160 },
              ].map(col => (
                <th key={col.label} style={{
                  width: col.width || undefined,
                  background: 'rgba(0,0,0,0.025)',
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.1em', color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', padding: '12px 14px',
                  textAlign: 'left', borderBottom: '1px solid var(--card-border)',
                  whiteSpace: 'nowrap', cursor: 'pointer',
                }}
                onClick={() => {
                  const key = { 'Address': 'address', 'City': 'city', 'Tenant': 'tenant', 'RSF': 'rsf', 'NNN Rate': 'rate', 'Gross Equiv': 'gross_equivalent', 'Start': 'start_date', 'TI/SF': 'ti_psf' }[col.label];
                  if (key) { if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortDir('desc'); } }
                }}>
                  {col.label}
                  {sortBy === { 'Address': 'address', 'City': 'city', 'Tenant': 'tenant', 'RSF': 'rsf', 'NNN Rate': 'rate', 'Gross Equiv': 'gross_equivalent', 'Start': 'start_date', 'TI/SF': 'ti_psf' }[col.label] && (
                    <span style={{ marginLeft: 4, opacity: 0.6 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13}><div className="cl-loading" style={{ padding: 40 }}><div className="cl-spinner" /></div></td></tr>
            ) : comps.length === 0 ? (
              <tr><td colSpan={13}>
                <div className="cl-empty" style={{ padding: 48 }}>
                  <div className="cl-empty-label">No lease comps found</div>
                  <div className="cl-empty-sub">Import from CoStar or add manually</div>
                </div>
              </td></tr>
            ) : comps.map(comp => (
              <tr key={comp.id}
                onClick={() => { setSelectedId(comp.id); setSelectedComp(comp); }}
                style={{
                  background: selectedId === comp.id ? 'rgba(78,110,150,0.06)' : undefined,
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  cursor: 'pointer', transition: 'background 120ms',
                }}
                onMouseEnter={e => { if (selectedId !== comp.id) e.currentTarget.style.background = 'rgba(78,110,150,0.03)'; }}
                onMouseLeave={e => { if (selectedId !== comp.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: 'var(--blue)' }}>{comp.address}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>{comp.city}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.tenant || '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{comp.rsf ? fmt(comp.rsf) : '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {comp.rate ? `$${Number(comp.rate).toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                  {comp.gross_equivalent ? `$${Number(comp.gross_equivalent).toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {comp.lease_type ? <span className="cl-badge cl-badge-blue" style={{ fontSize: 10 }}>{comp.lease_type}</span> : '—'}
                </td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {comp.term_months ? `${comp.term_months}mo` : '—'}
                </td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {fmtDate(comp.start_date)}
                </td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {comp.ti_psf ? `$${Number(comp.ti_psf).toFixed(0)}` : '—'}
                </td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {comp.free_rent_months ? `${comp.free_rent_months}mo` : '—'}
                </td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {comp.escalation ? `${(Number(comp.escalation) * 100).toFixed(1)}%` : '—'}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {comp.landlord || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      <SlideDrawer
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setSelectedComp(null); }}
        title={selectedComp?.address || 'Lease Comp'}
        subtitle={[selectedComp?.city, selectedComp?.tenant].filter(Boolean).join(' · ')}
        badge={{ label: 'Lease Comp', color: 'blue' }}
      >
        {selectedComp && <LeaseCompDetail comp={selectedComp} />}
      </SlideDrawer>
    </div>
  );
}

function LeaseCompDetail({ comp }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'NNN RATE',    value: comp.rate ? `$${Number(comp.rate).toFixed(2)}/SF/mo` : '—' },
          { label: 'GROSS EQUIV', value: comp.gross_equivalent ? `$${Number(comp.gross_equivalent).toFixed(2)}/SF/mo` : '—' },
          { label: 'RSF',         value: comp.rsf ? `${fmt(comp.rsf)} SF` : '—' },
          { label: 'TERM',        value: comp.term_months ? `${comp.term_months} months` : '—' },
          { label: 'START',       value: fmtDate(comp.start_date) },
          { label: 'END',         value: fmtDate(comp.end_date) },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'rgba(0,0,0,0.025)', borderRadius: 'var(--radius-md)', padding: '10px 12px', border: '1px solid var(--card-border)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="cl-card" style={{ padding: '14px 16px' }}>
        <div className="cl-card-title" style={{ marginBottom: 10 }}>DEAL TERMS</div>
        {[
          { label: 'Lease Type',   value: comp.lease_type },
          { label: 'Deal Type',    value: comp.deal_type },
          { label: 'Free Rent',    value: comp.free_rent_months ? `${comp.free_rent_months} months` : null },
          { label: 'TI/SF',        value: comp.ti_psf ? `$${Number(comp.ti_psf).toFixed(0)}/SF` : null },
          { label: 'Escalation',   value: comp.escalation ? `${(Number(comp.escalation) * 100).toFixed(1)}%/yr` : null },
          { label: 'Total Expenses', value: comp.total_expenses_psf ? `$${Number(comp.total_expenses_psf).toFixed(2)}/SF/mo` : null },
          { label: 'Landlord',     value: comp.landlord },
          { label: 'Broker',       value: comp.broker },
          { label: 'Source',       value: comp.source },
        ].filter(r => r.value).map(row => (
          <div key={row.label} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', width: 100, flexShrink: 0, paddingTop: 2 }}>
              {row.label.toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{row.value}</span>
          </div>
        ))}
      </div>

      {comp.notes && (
        <div className="cl-card" style={{ padding: '14px 16px', marginTop: 12 }}>
          <div className="cl-card-title" style={{ marginBottom: 8 }}>NOTES</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{comp.notes}</p>
        </div>
      )}
    </div>
  );
}
