'use client';

import React, { useState, useMemo } from 'react';
import { ACCOUNT_TYPES } from '../lib/constants';

const BUYER_TYPE_OPTS = ['All Types', 'REIT', 'Institutional', 'Private', 'Developer', 'Owner-User', 'Family Office'];
const TIMING_OPTS = ['All Timing', 'Actively Buying Now', 'Buying Selectively', 'Paused', 'Not Buying'];
const MARKET_OPTS = ['All Markets', 'SGV', 'IE', 'LA', 'OC', 'San Diego', 'Ventura'];

export default function AccountsList({ accounts, onAccountClick }) {
  const [filterType, setFilterType] = useState('');
  const [filterBuyerType, setFilterBuyerType] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [filterTiming, setFilterTiming] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [sortBy, setSortBy] = useState('score');

  const filtered = useMemo(() => {
    let list = [...accounts];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        [a.name, a.city, a.hq_state, a.notes, a.known_acquisitions, a.geographic_focus]
          .some((f) => f && f.toLowerCase().includes(q))
      );
    }
    if (filterType && filterType !== 'All Types') list = list.filter(a => a.account_type === filterType);
    if (filterBuyerType && filterBuyerType !== 'All Types') list = list.filter(a => a.buyer_type === filterBuyerType);
    if (filterMarket && filterMarket !== 'All Markets') list = list.filter(a => a.preferred_markets?.includes(filterMarket));
    if (filterTiming && filterTiming !== 'All Timing') list = list.filter(a => a.acquisition_timing === filterTiming);
    
    // Sort
    if (sortBy === 'score') list.sort((a, b) => (b.buyer_activity_score || 0) - (a.buyer_activity_score || 0));
    else if (sortBy === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sortBy === 'deals') list.sort((a, b) => (b.total_deals_closed || 0) - (a.total_deals_closed || 0));
    
    return list;
  }, [accounts, filterType, filterBuyerType, filterMarket, filterTiming, search, sortBy]);

  const typeColor = (type) => {
    const map = {
      'Owner': 'tag-amber', 'Owner-User': 'tag-amber',
      'Institutional Buyer': 'tag-green', 'Private Buyer': 'tag-green',
      'Tenant': 'tag-blue', 'Broker / Advisor': 'tag-purple',
      'Lender': 'tag-ghost', 'Investor': 'tag-green', 'Developer': 'tag-purple',
    };
    return map[type] || 'tag-ghost';
  };

  const timingColor = (t) => {
    if (t === 'Actively Buying Now') return { bg: 'var(--green-bg)', color: 'var(--green)', border: 'rgba(26,122,72,0.27)' };
    if (t === 'Buying Selectively') return { bg: 'var(--blue-bg)', color: 'var(--blue)', border: 'rgba(85,119,160,0.27)' };
    if (t === 'Paused') return { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'rgba(184,122,16,0.27)' };
    return { bg: 'var(--bg-input)', color: 'var(--text-muted)', border: 'var(--border)' };
  };

  const MarketPills = ({ markets }) => {
    if (!markets?.length) return <span style={{ color: 'var(--text-muted)',  }}>—</span>;
    const mColors = { SGV: 'var(--purple)', IE: 'var(--amber)', LA: 'var(--blue)', OC: 'var(--blue3)', 'San Diego': 'var(--green)', Ventura: 'var(--purple)' };
    return (
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {markets.map(m => (
          <span key={m} style={{
             fontWeight: 600, padding: '1px 5px', borderRadius: '3px',
            background: (mColors[m] || 'var(--ink3)') + '18', color: mColors[m] || 'var(--ink3)',
          }}>{m}</span>
        ))}
      </div>
    );
  };

  const DetailPanel = ({ a }) => (
    <tr><td colSpan={8} style={{ padding: 0, background: 'var(--bg)' }}>
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '12px' }}>
          {[
            ['HQ', [a.city, a.hq_state].filter(Boolean).join(', ')],
            ['Phone', a.phone, true],
            ['Website', a.website],
            ['Entity Type', a.entity_type],
            ['Buyer Type', a.buyer_type],
            ['Timing', a.acquisition_timing],
            ['Risk Profile', a.risk_profile],
            ['SF Range', a.min_sf && a.max_sf ? `${(a.min_sf/1000).toFixed(0)}K – ${(a.max_sf/1000).toFixed(0)}K SF` : null],
            ['$/SF Range', a.min_price_psf && a.max_price_psf ? `$${a.min_price_psf} – $${a.max_price_psf}` : null],
            ['Capital Deployed', a.est_capital_deployed],
            ['Deals Closed', a.total_deals_closed || a.deal_count],
            ['Activity Score', a.buyer_activity_score],
            ['Products', a.product_preference?.join(', ')],
            ['Deal Types', a.deal_type_preference?.join(', ')],
            ['Source', a.source],
          ].map(([label, val, mono]) => val ? (
            <div key={label}>
              <div style={{  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '3px' }}>{label}</div>
              <div style={{  color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{val}</div>
            </div>
          ) : null)}
        </div>
        {(a.known_acquisitions || a.notes) && (
          <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>Intel / Notes</div>
            <div style={{  color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a.notes || a.known_acquisitions}</div>
          </div>
        )}
      </div>
    </td></tr>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="input" placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '200px' }} />
        <select className="select" value={filterBuyerType} onChange={e => setFilterBuyerType(e.target.value)} style={{ maxWidth: '150px' }}>
          {BUYER_TYPE_OPTS.map(t => <option key={t} value={t === 'All Types' ? '' : t}>{t}</option>)}
        </select>
        <select className="select" value={filterMarket} onChange={e => setFilterMarket(e.target.value)} style={{ maxWidth: '130px' }}>
          {MARKET_OPTS.map(m => <option key={m} value={m === 'All Markets' ? '' : m}>{m}</option>)}
        </select>
        <select className="select" value={filterTiming} onChange={e => setFilterTiming(e.target.value)} style={{ maxWidth: '170px' }}>
          {TIMING_OPTS.map(t => <option key={t} value={t === 'All Timing' ? '' : t}>{t}</option>)}
        </select>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ maxWidth: '120px' }}>
          <option value="score">By Score</option>
          <option value="name">By Name</option>
          <option value="deals">By Deals</option>
        </select>
        <span style={{ marginLeft: 'auto',  color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} account{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Type</th>
              <th>Markets</th>
              <th>SF Range</th>
              <th>$/SF</th>
              <th>Timing</th>
              <th style={{ textAlign: 'right' }}>Deals</th>
              <th style={{ textAlign: 'right' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const tc = timingColor(a.acquisition_timing);
              return (
                <React.Fragment key={a.id}>
                  <tr
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    onDoubleClick={() => onAccountClick?.(a)}
                    style={{ background: expanded === a.id ? 'var(--bg)' : undefined, cursor: 'pointer' }}
                  >
                    <td className="text-primary" style={{ fontWeight: 600 }}>
                      {a.name}
                      {a.city && <span style={{  color: 'var(--text-muted)', marginLeft: '6px' }}>{a.city}{a.hq_state ? `, ${a.hq_state}` : ''}</span>}
                    </td>
                    <td><span className={`tag ${typeColor(a.account_type)}`} style={{  }}>{a.buyer_type || a.account_type || '—'}</span></td>
                    <td><MarketPills markets={a.preferred_markets} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)',  whiteSpace: 'nowrap' }}>
                      {a.min_sf && a.max_sf ? `${(a.min_sf/1000).toFixed(0)}K–${(a.max_sf/1000).toFixed(0)}K` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)',  whiteSpace: 'nowrap' }}>
                      {a.min_price_psf && a.max_price_psf ? `$${Math.round(a.min_price_psf)}–$${Math.round(a.max_price_psf)}` : '—'}
                    </td>
                    <td>
                      {a.acquisition_timing ? (
                        <span style={{  padding: '2px 6px', borderRadius: '4px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, whiteSpace: 'nowrap' }}>
                          {a.acquisition_timing === 'Actively Buying Now' ? 'Active' : a.acquisition_timing === 'Buying Selectively' ? 'Selective' : a.acquisition_timing}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)',  }}>{a.total_deals_closed || a.deal_count || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {a.buyer_activity_score ? (
                        <span style={{ fontFamily: 'var(--font-mono)',  fontWeight: 600, color: a.buyer_activity_score >= 80 ? 'var(--green)' : a.buyer_activity_score >= 50 ? 'var(--blue)' : 'var(--text-muted)' }}>
                          {a.buyer_activity_score}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                  {expanded === a.id && <DetailPanel a={a} />}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No accounts found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
