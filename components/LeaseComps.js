'use client';

import React, { useState, useMemo } from 'react';
import { LEASE_TYPES, fmt } from '../lib/constants';

export default function LeaseComps({ comps, onCompClick }) {
  const [search, setSearch] = useState('');
  const [filterSubmarket, setFilterSubmarket] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('start_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const allSubmarkets = [...new Set(comps.map((c) => c.submarket).filter(Boolean))].sort();

  const filtered = useMemo(() => {
    let list = [...comps];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        [c.address, c.tenant, c.city].some((f) => f && f.toLowerCase().includes(q))
      );
    }
    if (filterSubmarket) list = list.filter((c) => c.submarket === filterSubmarket);
    if (filterType) list = list.filter((c) => c.lease_type === filterType);
    list.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (va == null) va = sortAsc ? Infinity : -Infinity;
      if (vb == null) vb = sortAsc ? Infinity : -Infinity;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [comps, search, filterSubmarket, filterType, sortBy, sortAsc]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(false); }
  };
  const si = (col) => sortBy === col ? (sortAsc ? ' ↑' : ' ↓') : '';

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Search address, tenant..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: '260px' }} />
        <select className="select" value={filterSubmarket} onChange={(e) => setFilterSubmarket(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">All Submarkets</option>
          {allSubmarkets.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ maxWidth: '160px' }}>
          <option value="">All Lease Types</option>
          {LEASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{filtered.length} comps</span>
      </div>

      <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '28px' }}></th>
              <th onClick={() => toggleSort('address')} style={{ cursor: 'pointer' }}>Address{si('address')}</th>
              <th>Submarket</th>
              <th onClick={() => toggleSort('tenant')} style={{ cursor: 'pointer' }}>Tenant{si('tenant')}</th>
              <th onClick={() => toggleSort('rsf')} style={{ cursor: 'pointer' }}>RSF{si('rsf')}</th>
              <th onClick={() => toggleSort('rate')} style={{ cursor: 'pointer' }}>Rate{si('rate')}</th>
              <th>Gross Equiv</th>
              <th>Type</th>
              <th onClick={() => toggleSort('term_months')} style={{ cursor: 'pointer' }}>Term{si('term_months')}</th>
              <th onClick={() => toggleSort('start_date')} style={{ cursor: 'pointer' }}>Start{si('start_date')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <React.Fragment key={c.id}>
                <tr
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  style={{ cursor: 'pointer', background: expanded === c.id ? 'var(--bg)' : undefined }}
                >
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>{expanded === c.id ? '▼' : '▶'}</td>
                  <td className="text-primary" style={{ fontWeight: 600 }}>{c.address}</td>
                  <td>{c.submarket || '—'}</td>
                  <td>{c.tenant || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{c.rsf ? fmt.sf(c.rsf) : '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                    {c.rate ? `$${Number(c.rate).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>
                    {c.gross_equivalent ? `$${Number(c.gross_equivalent).toFixed(2)}` : c.total_expenses_psf && c.rate ? `$${(Number(c.rate) + Number(c.total_expenses_psf)).toFixed(2)}` : '—'}
                  </td>
                  <td><span className="tag tag-ghost">{c.lease_type || '—'}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{c.term_months ? `${c.term_months} mo` : '—'}</td>
                  <td>{c.start_date ? fmt.date(c.start_date) : '—'}</td>
                </tr>
                {expanded === c.id && (
                  <tr>
                    <td colSpan={10} style={{ padding: 0, border: 'none' }}>
                      <div style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)', padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Free Rent</span><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{c.free_rent_months ? `${c.free_rent_months} mo` : '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TI $/SF</span><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{c.ti_psf ? `$${Number(c.ti_psf).toFixed(2)}` : '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Escalation</span><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{c.escalation || '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expenses $/SF</span><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{c.total_expenses_psf ? `$${Number(c.total_expenses_psf).toFixed(2)}` : '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Landlord</span><div style={{ fontWeight: 500 }}>{c.landlord || '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Broker</span><div style={{ fontWeight: 500 }}>{c.broker || '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</span><div style={{ fontWeight: 500 }}>{c.source || '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>City</span><div style={{ fontWeight: 500 }}>{c.city || '—'}</div></div>
                        </div>
                        {c.notes && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>{c.notes}</div>}
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onCompClick?.(c); }}>Open Full Detail →</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No comps found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
