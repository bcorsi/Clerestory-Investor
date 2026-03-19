'use client';

import { useState, useMemo } from 'react';
import { MARKETS, SUBMARKETS, RECORD_TYPES, VACANCY_STATUS, CATALYST_TAGS, catalystTagClass, fmt } from '../lib/constants';

export default function PropertiesList({ properties, onPropertyClick }) {
  const [filterMarket, setFilterMarket] = useState('');
  const [filterSubmarket, setFilterSubmarket] = useState('');
  const [filterCatalyst, setFilterCatalyst] = useState('');
  const [filterVacancy, setFilterVacancy] = useState('');
  const [sortBy, setSortBy] = useState('probability');
  const [sortAsc, setSortAsc] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

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

  const sortIndicator = (col) => {
    if (sortBy !== col) return '';
    return sortAsc ? ' ↑' : ' ↓';
  };

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
        <input
          className="input"
          placeholder="Filter by address, owner, tenant..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          style={{ maxWidth: '260px' }}
        />
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

        <span style={{ marginLeft: 'auto', fontSize: '15px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} results
        </span>
      </div>

      {/* Table */}
      <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('address')} style={{ cursor: 'pointer' }}>Address{sortIndicator('address')}</th>
              <th onClick={() => toggleSort('submarket')} style={{ cursor: 'pointer' }}>Submarket{sortIndicator('submarket')}</th>
              <th onClick={() => toggleSort('building_sf')} style={{ cursor: 'pointer' }}>Size{sortIndicator('building_sf')}</th>
              <th onClick={() => toggleSort('owner')} style={{ cursor: 'pointer' }}>Owner{sortIndicator('owner')}</th>
              <th onClick={() => toggleSort('vacancy_status')} style={{ cursor: 'pointer' }}>Status{sortIndicator('vacancy_status')}</th>
              <th>Catalysts</th>
              <th onClick={() => toggleSort('probability')} style={{ cursor: 'pointer' }}>Prob{sortIndicator('probability')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} onClick={() => onPropertyClick(p)}>
                <td className="text-primary">{p.address}</td>
                <td>
                  <span className="tag tag-ghost">{p.market}</span>
                  {' '}{p.submarket}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  {(p.total_sf || p.building_sf) ? fmt.sf(p.total_sf || p.building_sf) : p.land_acres ? fmt.acres(p.land_acres) : '—'}
                </td>
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
                      <span key={tag} className={`tag ${catalystTagClass(tag)}`} style={{ fontSize: '15px' }}>{tag}</span>
                    ))}
                    {(p.catalyst_tags || []).length > 3 && (
                      <span className="tag tag-ghost" style={{ fontSize: '15px' }}>+{p.catalyst_tags.length - 3}</span>
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
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
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
