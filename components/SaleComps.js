'use client';

import React, { useState, useMemo } from 'react';
import { fmt } from '../lib/constants';

const SALE_TYPES = ['Investment', 'Owner-User', 'SLB', 'Portfolio', 'Distress'];

export default function SaleComps({ comps, onCompClick }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSubmarket, setFilterSubmarket] = useState('');
  const [sortCol, setSortCol] = useState('sale_date');
  const [sortDir, setSortDir] = useState('desc');
  const [expanded, setExpanded] = useState(null);

  const submarkets = useMemo(() => {
    const s = new Set(comps.map((c) => c.submarket).filter(Boolean));
    return [...s].sort();
  }, [comps]);

  const filtered = useMemo(() => {
    let list = [...comps];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        [c.address, c.city, c.submarket, c.buyer, c.seller].some((f) => f && f.toLowerCase().includes(q))
      );
    }
    if (filterType) list = list.filter((c) => c.sale_type === filterType);
    if (filterSubmarket) list = list.filter((c) => c.submarket === filterSubmarket);

    list.sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    return list;
  }, [comps, search, filterType, filterSubmarket, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sortIcon = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const saleTypeColor = (type) => {
    const map = { Investment: 'tag-blue', 'Owner-User': 'tag-amber', SLB: 'tag-green', Portfolio: 'tag-purple', Distress: 'tag-red' };
    return map[type] || 'tag-ghost';
  };

  // Stats
  const avgPsf = filtered.length ? Math.round(filtered.filter(c => c.price_psf).reduce((s, c) => s + c.price_psf, 0) / filtered.filter(c => c.price_psf).length) : 0;
  const avgCap = filtered.filter(c => c.cap_rate).length ? (filtered.filter(c => c.cap_rate).reduce((s, c) => s + parseFloat(c.cap_rate), 0) / filtered.filter(c => c.cap_rate).length).toFixed(2) : null;

  return (
    <div>
      {/* Stats */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{filtered.length}</span> comps
          </div>
          {avgPsf > 0 && (
            <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
              Avg <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>${avgPsf}/SF</span>
            </div>
          )}
          {avgCap && (
            <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
              Avg Cap <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{avgCap}%</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="input" placeholder="Search comps..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: '220px' }} />
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ maxWidth: '150px' }}>
          <option value="">All Types</option>
          {SALE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {submarkets.length > 1 && (
          <select className="select" value={filterSubmarket} onChange={(e) => setFilterSubmarket(e.target.value)} style={{ maxWidth: '160px' }}>
            <option value="">All Submarkets</option>
            {submarkets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '15px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} comps
        </span>
      </div>

      {/* Table */}
      <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
        <table>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('address')}>Address{sortIcon('address')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('submarket')}>Submarket{sortIcon('submarket')}</th>
              <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('building_sf')}>Bldg SF{sortIcon('building_sf')}</th>
              <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('sale_price')}>Sale Price{sortIcon('sale_price')}</th>
              <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('price_psf')}>$/SF{sortIcon('price_psf')}</th>
              <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('cap_rate')}>Cap{sortIcon('cap_rate')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('sale_date')}>Date{sortIcon('sale_date')}</th>
              <th>Type</th>
              <th>Buyer</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <React.Fragment key={c.id}>
                <tr
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  style={{ background: expanded === c.id ? 'var(--bg-card-hover)' : undefined, cursor: 'pointer' }}
                >
                  <td className="text-primary" style={{ fontWeight: 500 }}>{c.address || '—'}</td>
                  <td>{c.submarket || c.city || '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '15px' }}>
                    {c.building_sf ? fmt.sf(c.building_sf) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '15px' }}>
                    {c.sale_price ? fmt.price(c.sale_price) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '15px', color: 'var(--accent)', fontWeight: 600 }}>
                    {c.price_psf ? `$${parseFloat(c.price_psf).toFixed(0)}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '15px' }}>
                    {c.cap_rate ? `${parseFloat(c.cap_rate).toFixed(2)}%` : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '15px' }}>
                    {c.sale_date ? c.sale_date.slice(0, 7) : '—'}
                  </td>
                  <td>
                    {c.sale_type && <span className={`tag ${saleTypeColor(c.sale_type)}`} style={{ fontSize: '15px' }}>{c.sale_type}</span>}
                  </td>
                  <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '15px' }}>
                    {c.buyer || '—'}
                  </td>
                </tr>
                {expanded === c.id && (
                  <tr>
                    <td colSpan={9} style={{ padding: 0, background: 'var(--bg-card-hover)' }}>
                      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: c.notes ? '12px' : 0 }}>
                          {[
                            ['Address', c.address],
                            ['City', c.city],
                            ['Submarket', c.submarket],
                            ['Sale Type', null, false, c.sale_type],
                            ['Building SF', c.building_sf ? fmt.sf(c.building_sf) : null],
                            ['Land (AC)', c.land_acres ? `${c.land_acres} ac` : null],
                            ['Year Built', c.year_built],
                            ['Clear Height', c.clear_height ? `${c.clear_height}'` : null],
                            ['Sale Price', c.sale_price ? fmt.price(c.sale_price) : null],
                            ['Price/SF', c.price_psf ? `$${parseFloat(c.price_psf).toFixed(0)}/SF` : null],
                            ['Cap Rate', c.cap_rate ? `${parseFloat(c.cap_rate).toFixed(2)}%` : null],
                            ['Sale Date', c.sale_date],
                            ['Buyer', c.buyer],
                            ['Seller', c.seller],
                          ].map(([label, val, mono, tagVal]) => (
                            <div key={label}>
                              <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                              {tagVal ? (
                                <span className={`tag ${saleTypeColor(tagVal)}`}>{tagVal}</span>
                              ) : (
                                <div style={{ fontSize: '15px', color: val ? 'var(--text-primary)' : 'var(--text-muted)' }}>{val || '—'}</div>
                              )}
                            </div>
                          ))}
                        </div>
                        {c.notes && (
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>Notes</div>
                            <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.notes}</div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No sale comps found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
