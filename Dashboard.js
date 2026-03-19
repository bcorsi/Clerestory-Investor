'use client';

import { useMemo } from 'react';
import { CATALYST_URGENCY, STAGE_COLORS, LEAD_STAGE_COLORS, catalystTagClass, fmt } from '../lib/constants';

export default function CatalystView({
  tag, properties, leads, deals,
  onPropertyClick, onLeadClick, onDealClick, onClear
}) {
  const matchedProperties = useMemo(() =>
    (properties || []).filter(p => (p.catalyst_tags || []).includes(tag))
  , [properties, tag]);

  const matchedLeads = useMemo(() =>
    (leads || []).filter(l => (l.catalyst_tags || []).includes(tag) && !['Converted', 'Dead'].includes(l.stage))
  , [leads, tag]);

  const matchedDeals = useMemo(() =>
    (deals || []).filter(d => {
      const linked = (properties || []).find(p => p.id === d.property_id || p.address === d.address);
      return linked && (linked.catalyst_tags || []).includes(tag);
    })
  , [deals, properties, tag]);

  const total = matchedProperties.length + matchedLeads.length + matchedDeals.length;
  const urgency = CATALYST_URGENCY[tag] || 'medium';
  const urgColor = { immediate: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280' }[urgency];

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: '16px', borderLeft: `3px solid ${urgColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span className={`tag ${catalystTagClass(tag)}`} style={{ fontSize: '14px', padding: '4px 12px' }}>{tag}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{total} records</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {matchedProperties.length} properties · {matchedLeads.length} leads · {matchedDeals.length} deals
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClear}>✕ Clear filter</button>
        </div>
      </div>

      {/* Properties */}
      {matchedProperties.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Properties ({matchedProperties.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table><thead><tr>
              <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Address</th>
              <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>City</th>
              <th style={{ textAlign: 'right', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>SF</th>
              <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Owner</th>
              <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Tenant</th>
              <th style={{ textAlign: 'right', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Score</th>
            </tr></thead><tbody>
              {matchedProperties.map(p => (
                <tr key={p.id} onClick={() => onPropertyClick?.(p)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 500 }}>{p.address}</td>
                  <td style={{ padding: '8px 10px', fontSize: '13px', color: 'var(--text-muted)' }}>{p.city || p.submarket || '—'}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right' }}>{(p.total_sf || p.building_sf) ? Number(p.total_sf || p.building_sf).toLocaleString() : '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: '13px' }}>{p.owner || '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: '13px' }}>{p.tenant || '—'}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>{p.probability ?? p.ai_score ?? '—'}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      )}

      {/* Leads */}
      {matchedLeads.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Leads ({matchedLeads.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table><thead><tr>
              <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Lead</th>
              <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Stage</th>
              <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Tier</th>
              <th style={{ textAlign: 'right', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Score</th>
              <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Next Action</th>
            </tr></thead><tbody>
              {matchedLeads.sort((a, b) => (b.score || 0) - (a.score || 0)).map(l => (
                <tr key={l.id} onClick={() => onLeadClick?.(l)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 500 }}>{l.lead_name}</td>
                  <td style={{ padding: '8px 10px' }}><span style={{ fontSize: '12px', padding: '2px 7px', borderRadius: '4px', background: (LEAD_STAGE_COLORS[l.stage] || '#6b7280') + '22', color: LEAD_STAGE_COLORS[l.stage] || '#6b7280', fontWeight: 600 }}>{l.stage}</span></td>
                  <td style={{ padding: '8px 10px' }}>{l.tier && <span style={{ fontWeight: 700, color: { 'A+': '#22c55e', A: '#3b82f6', B: '#f59e0b', C: '#6b7280' }[l.tier] || '#6b7280' }}>{l.tier}</span>}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>{l.score ?? '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: '13px', color: 'var(--amber)' }}>{l.next_action || '—'}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      )}

      {/* Deals */}
      {matchedDeals.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Deals ({matchedDeals.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table><thead><tr>
              <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Deal</th>
              <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Stage</th>
              <th style={{ textAlign: 'right', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Value</th>
              <th style={{ textAlign: 'right', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Commission</th>
            </tr></thead><tbody>
              {matchedDeals.map(d => (
                <tr key={d.id} onClick={() => onDealClick?.(d)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 500 }}>{d.deal_name}</td>
                  <td style={{ padding: '8px 10px' }}><span style={{ fontSize: '12px', padding: '2px 7px', borderRadius: '4px', background: (STAGE_COLORS[d.stage] || '#6b7280') + '22', color: STAGE_COLORS[d.stage] || '#6b7280', fontWeight: 600 }}>{d.stage}</span></td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>{d.deal_value ? fmt.price(d.deal_value) : '—'}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right', color: '#22c55e' }}>{d.commission_est ? fmt.price(d.commission_est) : '—'}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No records found with catalyst tag "{tag}"</div>
        </div>
      )}
    </div>
  );
}
