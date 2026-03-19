'use client';

import { useState, useMemo } from 'react';
import { CATALYST_TAGS, fmt } from '../lib/constants';

const COLORS = { property: '#3b82f6', lead: '#8b5cf6', deal: '#f59e0b' };

export default function MapView({ properties, leads, deals, onPropertyClick, onLeadClick, onDealClick }) {
  const [showLayer, setShowLayer] = useState({ property: true, lead: true, deal: true });
  const [catalystFilter, setCatalystFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [mapQuery, setMapQuery] = useState('industrial+properties+City+of+Industry+Ontario+Fontana+CA');

  const pins = useMemo(() => {
    const all = [];
    const q = searchTerm.toLowerCase();
    if (showLayer.property) {
      (properties || []).forEach(p => {
        if (!p.address) return;
        if (catalystFilter && !(p.catalyst_tags || []).includes(catalystFilter)) return;
        if (q && !`${p.address} ${p.city} ${p.owner} ${p.tenant}`.toLowerCase().includes(q)) return;
        all.push({ type: 'property', id: p.id, label: p.address, sub: `${p.city || p.submarket || ''} · ${(p.total_sf || p.building_sf) ? Number(p.total_sf || p.building_sf).toLocaleString() + ' SF' : ''} · ${p.owner || ''}`, record: p, query: `${p.address}, ${p.city || ''}, CA` });
      });
    }
    if (showLayer.lead) {
      (leads || []).filter(l => !['Converted', 'Dead'].includes(l.stage)).forEach(l => {
        if (!l.address) return;
        if (catalystFilter && !(l.catalyst_tags || []).includes(catalystFilter)) return;
        if (q && !`${l.address} ${l.lead_name} ${l.owner}`.toLowerCase().includes(q)) return;
        all.push({ type: 'lead', id: l.id, label: l.lead_name, sub: `${l.address} · ${l.stage} · ${l.tier || ''}`, record: l, query: `${l.address}, CA` });
      });
    }
    if (showLayer.deal) {
      (deals || []).filter(d => !['Closed', 'Dead'].includes(d.stage)).forEach(d => {
        if (!d.address) return;
        if (q && !`${d.address} ${d.deal_name}`.toLowerCase().includes(q)) return;
        all.push({ type: 'deal', id: d.id, label: d.deal_name, sub: `${d.address} · ${d.stage} · ${d.deal_value ? fmt.price(d.deal_value) : ''}`, record: d, query: `${d.address}, CA` });
      });
    }
    return all;
  }, [properties, leads, deals, showLayer, catalystFilter, searchTerm]);

  const handleSelect = (pin) => {
    setSelected(pin);
    setMapQuery(encodeURIComponent(pin.query));
  };

  const handleNav = (pin) => {
    if (pin.type === 'property') onPropertyClick?.(pin.record);
    else if (pin.type === 'lead') onLeadClick?.(pin.record);
    else if (pin.type === 'deal') onDealClick?.(pin.record);
  };

  const counts = {
    property: pins.filter(p => p.type === 'property').length,
    lead: pins.filter(p => p.type === 'lead').length,
    deal: pins.filter(p => p.type === 'deal').length,
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[['property', '⌂ Properties', COLORS.property], ['lead', '◎ Leads', COLORS.lead], ['deal', '◈ Deals', COLORS.deal]].map(([key, label, color]) => (
            <button key={key} onClick={() => setShowLayer(prev => ({ ...prev, [key]: !prev[key] }))}
              style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: showLayer[key] ? color + '22' : 'transparent', borderColor: showLayer[key] ? color : 'var(--border)', color: showLayer[key] ? color : 'var(--text-muted)' }}>
              {label} ({counts[key]})
            </button>
          ))}
          <select className="select" style={{ fontSize: '13px', maxWidth: '200px' }} value={catalystFilter} onChange={e => setCatalystFilter(e.target.value)}>
            <option value="">All catalysts</option>
            {CATALYST_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="input" style={{ flex: 1, minWidth: '150px', fontSize: '13px' }} placeholder="Search address, owner..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px' }}>
        {/* Map — always shows, updates query on click */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '650px' }}>
          <iframe
            key={mapQuery}
            src={`https://www.google.com/maps/embed/v1/${selected ? 'place' : 'search'}?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&maptype=satellite${selected ? '&zoom=17' : '&zoom=10'}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>

        {/* Record list */}
        <div className="card" style={{ height: '650px', overflow: 'auto', padding: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{pins.length} records · click to view on map</div>
          {pins.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--text-muted)', fontSize: '14px' }}>No records match filters</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {pins.slice(0, 200).map(pin => {
              const color = COLORS[pin.type];
              const isSel = selected?.id === pin.id && selected?.type === pin.type;
              return (
                <div key={`${pin.type}-${pin.id}`} onClick={() => handleSelect(pin)}
                  style={{ padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', background: isSel ? color + '11' : 'var(--bg-input)', border: `1px solid ${isSel ? color : 'transparent'}`, transition: 'border-color 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div style={{ fontSize: '14px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pin.label}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{pin.type}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '16px' }}>{pin.sub}</div>
                  {isSel && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingLeft: '16px' }}>
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} onClick={e => { e.stopPropagation(); handleNav(pin); }}>Open record →</button>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.query)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '11px', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>📍 Full Maps</a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
