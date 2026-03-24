'use client';

import React, { useState, useMemo } from 'react';
import { MARKETS, SUBMARKETS, RECORD_TYPES, VACANCY_STATUS, CATALYST_TAGS, catalystTagClass, fmt } from '../lib/constants';

export default function PropertiesList({ properties, onPropertyClick }) {
  const [filterMarket, setFilterMarket] = useState('');
  const [filterSubmarket, setFilterSubmarket] = useState('');
  const [filterCatalyst, setFilterCatalyst] = useState('');
  const [filterVacancy, setFilterVacancy] = useState('');
  const [sortBy, setSortBy] = useState('probability');
  const [sortAsc, setSortAsc] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const availableSubmarkets = filterMarket ? (SUBMARKETS[filterMarket] || []) : [];

  const filtered = useMemo(() => {
    let list = [...properties];
    if (localSearch) {
      const q = localSearch.toLowerCase();
      list = list.filter((p) =>
        [p.address, p.city, p.owner, p.tenant, p.submarket].some((f) => f && f.toLowerCase().includes(q))
      );
    }
    if (filterMarket) list = list.filter((p) => p.market === filterMarket);
    if (filterSubmarket) list = list.filter((p) => p.submarket === filterSubmarket);
    if (filterCatalyst) list = list.filter((p) => (p.catalyst_tags || []).includes(filterCatalyst));
    if (filterVacancy) list = list.filter((p) => p.vacancy_status === filterVacancy);
    list.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (va == null) va = sortAsc ? Infinity : -Infinity;
      if (vb == null) vb = sortAsc ? Infinity : -Infinity;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [properties, filterMarket, filterSubmarket, filterCatalyst, filterVacancy, sortBy, sortAsc, localSearch]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(false); }
  };
  const sortIndicator = (col) => sortBy !== col ? '' : sortAsc ? ' ↑' : ' ↓';
  const urgencyColor = (prob) => {
    if (prob >= 80) return 'var(--red)';
    if (prob >= 60) return 'var(--amber)';
    if (prob >= 40) return 'var(--accent)';
    return 'var(--text-muted)';
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Filter by address, owner, tenant..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} style={{ maxWidth: '260px' }} />
        <select className="select" value={filterMarket} onChange={(e) => { setFilterMarket(e.target.value); setFilterSubmarket(''); }} style={{ maxWidth: '120px' }}>
          <option value="">All Markets</option>
          {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {availableSubmarkets.length > 0 && (
          <select className="select" value={filterSubmarket} onChange={(e) => setFilterSubmarket(e.target.value)} style={{ maxWidth: '200px' }}>
            <option value="">All Submarkets</option>
            {availableSubmarkets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select className="select" value={filterVacancy} onChange={(e) => setFilterVacancy(e.target.value)} style={{ maxWidth: '140px' }}>
          <option value="">All Vacancy</option>
          {VACANCY_STATUS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="select" value={filterCatalyst} onChange={(e) => setFilterCatalyst(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">All Catalysts</option>
          {CATALYST_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="fc-count">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '28px' }}></th>
              <th onClick={() => toggleSort('address')} style={{ cursor: 'pointer' }}>Address{sortIndicator('address')}</th>
              <th onClick={() => toggleSort('submarket')} style={{ cursor: 'pointer' }}>Submarket{sortIndicator('submarket')}</th>
              <th onClick={() => toggleSort('building_sf')} style={{ cursor: 'pointer' }}>Bldg SF{sortIndicator('building_sf')}</th>
              <th onClick={() => toggleSort('land_acres')} style={{ cursor: 'pointer' }}>Land AC{sortIndicator('land_acres')}</th>
              <th onClick={() => toggleSort('coverage_ratio')} style={{ cursor: 'pointer' }}>Coverage{sortIndicator('coverage_ratio')}</th>
              <th onClick={() => toggleSort('prop_type')} style={{ cursor: 'pointer' }}>Type{sortIndicator('prop_type')}</th>
              <th onClick={() => toggleSort('clear_height')} style={{ cursor: 'pointer' }}>Clear Ht{sortIndicator('clear_height')}</th>
              <th onClick={() => toggleSort('dock_high_doors')} style={{ cursor: 'pointer' }}>DH/GL{sortIndicator('dock_high_doors')}</th>
              <th onClick={() => toggleSort('year_built')} style={{ cursor: 'pointer' }}>Built{sortIndicator('year_built')}</th>
              <th onClick={() => toggleSort('owner')} style={{ cursor: 'pointer' }}>Owner{sortIndicator('owner')}</th>
              <th onClick={() => toggleSort('vacancy_status')} style={{ cursor: 'pointer' }}>Status{sortIndicator('vacancy_status')}</th>
              <th>Catalysts</th>
              <th onClick={() => toggleSort('probability')} style={{ cursor: 'pointer' }}>Prob{sortIndicator('probability')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <React.Fragment key={p.id}>
                <tr
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  style={{ cursor: 'pointer', background: expanded === p.id ? 'var(--bg)' : undefined }}
                >
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>{expanded === p.id ? '▼' : '▶'}</td>
                  <td className="text-primary" style={{ fontWeight: 600 }}>{p.address}</td>
                  <td>
                    <span className="tag tag-ghost">{p.market}</span>
                    {' '}{p.submarket}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {(p.total_sf || p.building_sf) ? fmt.sf(p.total_sf || p.building_sf) : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{p.land_acres ? `${Number(p.land_acres).toFixed(2)} ac` : '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {(p.building_sf || p.total_sf) && p.land_acres
                      ? `${(((p.total_sf || p.building_sf) / (p.land_acres * 43560)) * 100).toFixed(1)}%`
                      : p.coverage_ratio ? `${p.coverage_ratio}%` : '—'}
                  </td>
                  <td style={{ fontSize: '12px' }}>{p.prop_type || p.record_type || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{p.clear_height ? `${p.clear_height}'` : '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {(p.dock_high_doors || p.grade_level_doors)
                      ? `${p.dock_high_doors || 0}/${p.grade_level_doors || 0}`
                      : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{p.year_built || '—'}</td>
                  <td>{p.owner || '—'}</td>
                  <td>
                    {p.vacancy_status && (
                      <span className={`tag ${p.vacancy_status === 'Vacant' ? 'tag-red' : p.vacancy_status === 'Partial' ? 'tag-amber' : 'tag-green'}`}>
                        {p.vacancy_status}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(p.catalyst_tags || []).slice(0, 3).map((tag) => (
                        <span key={tag} className={`tag ${catalystTagClass(tag)}`}>{tag}</span>
                      ))}
                      {(p.catalyst_tags || []).length > 3 && (
                        <span className="tag tag-ghost">+{p.catalyst_tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {p.probability != null && (
                      <div className="prob-bar">
                        <div className="prob-bar-track">
                          <div className="prob-bar-fill" style={{ width: `${p.probability}%`, background: urgencyColor(p.probability) }} />
                        </div>
                        <span className="prob-bar-label" style={{ color: urgencyColor(p.probability) }}>{p.probability}%</span>
                      </div>
                    )}
                  </td>
                </tr>
                {expanded === p.id && (
                  <tr>
                    <td colSpan={14} style={{ padding: 0, border: 'none' }}>
                      <div style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)', padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>City</span><div style={{ fontWeight: 500 }}>{p.city || '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tenant</span><div style={{ fontWeight: 500 }}>{p.tenant || '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zoning</span><div style={{ fontWeight: 500 }}>{p.zoning || '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Land SF</span><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{p.land_acres ? fmt.sf(Math.round(p.land_acres * 43560)) : p.land_sf ? fmt.sf(p.land_sf) : '—'}</div></div>
                          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>APN</span><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{p.apn || '—'}</div></div>
                        </div>
                        {p.notes && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '6px', borderLeft: '3px solid var(--accent)', marginBottom: '12px' }}>{p.notes}</div>}
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onPropertyClick(p); }}>
                          Open Full Detail →
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={14} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No properties match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
