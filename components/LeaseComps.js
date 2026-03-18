'use client';

import React, { useState, useMemo } from 'react';
import { LEASE_TYPES, fmt } from '../lib/constants';

export default function LeaseComps({ comps, onCompClick }) {
  const [search, setSearch] = useState('');
  const [filterSubmarket, setFilterSubmarket] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('start_date');
  const [sortAsc, setSortAsc] = useState(false);

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
        <span style={{ marginLeft: 'auto', fontSize: '15px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} comps
        </span>
      </div>

      <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('address')} style={{ cursor: 'pointer' }}>Address{si('address')}</th>
              <th>Submarket</th>
              <th onClick={() => toggleSort('tenant')} style={{ cursor: 'pointer' }}>Tenant{si('tenant')}</th>
              <th onClick={() => toggleSort('rsf')} style={{ cursor: 'pointer' }}>RSF{si('rsf')}</th>
              <th onClick={() => toggleSort('rate')} style={{ cursor: 'pointer' }}>Rate{si('rate')}</th>
              <th>Gross Equiv</th>
              <th>Type</th>
              <th onClick={() => toggleSort('term_months')} style={{ cursor: 'pointer' }}>Term{si('term_months')}</th>
              <th onClick={() => toggleSort('start_date')} style={{ cursor: 'pointer' }}>Start{si('start_date')}</th>
              <th>FR</th>
              <th>TIs</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => onCompClick(c)} style={{ cursor: 'pointer' }}>
                <td className="text-primary">{c.address}</td>
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
                <td style={{ fontFamily: 'var(--font-mono)' }}>{c.free_rent_months ? `${c.free_rent_months} mo` : '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{c.ti_psf ? `$${Number(c.ti_psf).toFixed(2)}` : '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No comps found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
