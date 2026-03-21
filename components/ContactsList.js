'use client';

import React, { useState, useMemo } from 'react';
import { CONTACT_TYPES } from '../lib/constants';

export default function ContactsList({ contacts, onContactClick }) {
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (key) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };
  const sortInd = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const filtered = useMemo(() => {
    let list = [...contacts];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        [c.name, c.company, c.email, c.phone].some((f) => f && f.toLowerCase().includes(q))
      );
    }
    if (filterType) list = list.filter((c) => c.contact_type === filterType);
    if (sortKey) {
      list.sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (va == null) return 1; if (vb == null) return -1;
        va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return list;
  }, [contacts, filterType, search, sortKey, sortDir]);

  const typeColor = (type) => {
    const map = { Owner: 'tag-amber', Buyer: 'tag-green', Tenant: 'tag-blue', Broker: 'tag-purple', Investor: 'tag-green', Lender: 'tag-ghost' };
    return map[type] || 'tag-ghost';
  };

  const DetailPanel = ({ c }) => (
    <tr>
      <td colSpan={6} style={{ padding: 0, background: 'var(--bg)' }}>
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: c.notes ? '12px' : 0 }}>
            {[
              ['Name', c.name], ['Company', c.company], ['Title', c.title],
              ['Phone', c.phone, true], ['Email', c.email], ['Type', null, false, c.contact_type],
            ].map(([label, val, mono, tagVal]) => (
              <div key={label}>
                <div style={{  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                {tagVal ? (
                  <span className={`tag ${typeColor(tagVal)}`}>{tagVal}</span>
                ) : (
                  <div style={{  color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{val || '—'}</div>
                )}
              </div>
            ))}
          </div>
          {c.notes && (
            <div>
              <div style={{  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>Notes</div>
              <div style={{  color: 'var(--text-secondary)', lineHeight: '1.6' }}>{c.notes}</div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
        <input className="input" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: '260px' }} />
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ maxWidth: '160px' }}>
          <option value="">All Types</option>
          {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ marginLeft: 'auto',  color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} contacts
        </span>
      </div>

      <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>Name{sortInd('name')}</th><th onClick={() => toggleSort('company')} style={{ cursor: 'pointer' }}>Company{sortInd('company')}</th><th onClick={() => toggleSort('contact_type')} style={{ cursor: 'pointer' }}>Type{sortInd('contact_type')}</th><th onClick={() => toggleSort('phone')} style={{ cursor: 'pointer' }}>Phone{sortInd('phone')}</th><th onClick={() => toggleSort('email')} style={{ cursor: 'pointer' }}>Email{sortInd('email')}</th><th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <React.Fragment key={c.id}>
                <tr
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  onDoubleClick={() => onContactClick && onContactClick(c)}
                  style={{ background: expanded === c.id ? 'var(--bg)' : undefined, cursor: 'pointer' }}
                >
                  <td className="text-primary">{c.name}</td>
                  <td>{c.company || '—'}</td>
                  <td><span className={`tag ${typeColor(c.contact_type)}`}>{c.contact_type}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)',  }}>{c.phone || '—'}</td>
                  <td style={{  }}>{c.email || '—'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.notes || '—'}</td>
                </tr>
                {expanded === c.id && <DetailPanel c={c} />}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No contacts found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
