'use client';

import { useState, useMemo } from 'react';
import { CATALYST_TAGS, fmt } from '../lib/constants';

const COLORS = { property: '#3b82f6', lead: '#8b5cf6', deal: '#f59e0b' };

// Simple address-to-approximate-coords for SoCal industrial cities
const CITY_COORDS = {
  'city of industry': [34.0198, -117.9587], 'vernon': [33.9925, -118.2301], 'el monte': [34.0686, -118.0276],
  'south el monte': [34.0519, -118.0465], 'irwindale': [34.1070, -117.9354], 'azusa': [34.1336, -117.9076],
  'covina': [34.0900, -117.8903], 'west covina': [34.0686, -117.9390], 'pomona': [34.0551, -117.7500],
  'la puente': [34.0200, -117.9495], 'baldwin park': [34.0853, -117.9609], 'santa fe springs': [33.9472, -118.0854],
  'whittier': [33.9792, -118.0328], 'la mirada': [33.9172, -118.0120], 'ontario': [34.0633, -117.6509],
  'fontana': [34.0922, -117.4350], 'rancho cucamonga': [34.1064, -117.5931], 'chino': [34.0122, -117.6889],
  'rialto': [34.1064, -117.3703], 'colton': [34.0739, -117.3136], 'san bernardino': [34.1083, -117.2898],
  'riverside': [33.9533, -117.3962], 'moreno valley': [33.9425, -117.2297], 'perris': [33.7825, -117.2286],
  'jurupa valley': [33.9994, -117.4706], 'redlands': [34.0556, -117.1825], 'upland': [34.0975, -117.6484],
  'montclair': [34.0775, -117.6898], 'commerce': [33.9967, -118.1598], 'carson': [33.8314, -118.2620],
  'torrance': [33.8358, -118.3406], 'compton': [33.8958, -118.2201], 'paramount': [33.8894, -118.1598],
  'downey': [33.9401, -118.1332], 'gardena': [33.8883, -118.3090], 'long beach': [33.7701, -118.1937],
  'los angeles': [34.0522, -118.2437], 'anaheim': [33.8366, -117.9143], 'fullerton': [33.8703, -117.9242],
  'santa ana': [33.7455, -117.8677], 'irvine': [33.6846, -117.8265], 'brea': [33.9167, -117.9001],
  'oxnard': [34.1975, -119.1771], 'camarillo': [34.2164, -119.0376], 'san diego': [32.7157, -117.1611],
  'hacienda heights': [33.9930, -117.9684], 'south gate': [33.9547, -118.2120],
};

function guessCoords(address, city) {
  const c = (city || '').toLowerCase().trim();
  if (CITY_COORDS[c]) return CITY_COORDS[c];
  // Try to extract city from address
  const parts = (address || '').toLowerCase().split(',');
  for (const part of parts) {
    const t = part.trim();
    if (CITY_COORDS[t]) return CITY_COORDS[t];
    for (const [k, v] of Object.entries(CITY_COORDS)) {
      if (t.includes(k)) return v;
    }
  }
  return [34.0, -117.8]; // default SoCal center
}

export default function MapView({ properties, leads, deals, onPropertyClick, onLeadClick, onDealClick }) {
  const [showLayer, setShowLayer] = useState({ property: true, lead: true, deal: true });
  const [catalystFilter, setCatalystFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);

  const pins = useMemo(() => {
    const all = [];
    const q = searchTerm.toLowerCase();
    if (showLayer.property) {
      (properties || []).forEach(p => {
        if (!p.address) return;
        if (catalystFilter && !(p.catalyst_tags || []).includes(catalystFilter)) return;
        if (q && !`${p.address} ${p.city} ${p.owner} ${p.tenant}`.toLowerCase().includes(q)) return;
        const [lat, lng] = guessCoords(p.address, p.city);
        all.push({ type: 'property', id: p.id, label: p.address, sub: `${p.city || p.submarket || ''} · ${(p.total_sf || p.building_sf) ? Number(p.total_sf || p.building_sf).toLocaleString() + ' SF' : ''} · ${p.owner || ''}`, record: p, lat, lng, query: `${p.address}, ${p.city || ''}, CA` });
      });
    }
    if (showLayer.lead) {
      (leads || []).filter(l => !['Converted', 'Dead'].includes(l.stage)).forEach(l => {
        if (!l.address) return;
        if (catalystFilter && !(l.catalyst_tags || []).includes(catalystFilter)) return;
        if (q && !`${l.address} ${l.lead_name} ${l.owner}`.toLowerCase().includes(q)) return;
        const [lat, lng] = guessCoords(l.address, l.city);
        all.push({ type: 'lead', id: l.id, label: l.lead_name, sub: `${l.address} · ${l.stage}`, record: l, lat, lng, query: `${l.address}, CA` });
      });
    }
    if (showLayer.deal) {
      (deals || []).filter(d => !['Closed', 'Dead'].includes(d.stage)).forEach(d => {
        if (!d.address) return;
        if (q && !`${d.address} ${d.deal_name}`.toLowerCase().includes(q)) return;
        const [lat, lng] = guessCoords(d.address, d.submarket);
        all.push({ type: 'deal', id: d.id, label: d.deal_name, sub: `${d.address} · ${d.stage}`, record: d, lat, lng, query: `${d.address}, CA` });
      });
    }
    return all;
  }, [properties, leads, deals, showLayer, catalystFilter, searchTerm]);

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

  // Build self-contained Leaflet HTML for iframe srcdoc (avoids CORS)
  const mapHtml = useMemo(() => {
    const center = selected ? `[${selected.lat}, ${selected.lng}]` : pins.length > 0 ? `[${pins.reduce((s, p) => s + p.lat, 0) / pins.length}, ${pins.reduce((s, p) => s + p.lng, 0) / pins.length}]` : '[34.0, -117.8]';
    const zoom = selected ? 15 : 10;
    const markerJs = pins.map(p => {
      const c = COLORS[p.type];
      return `L.circleMarker([${p.lat},${p.lng}],{radius:7,fillColor:'${c}',color:'#fff',weight:2,fillOpacity:0.9}).addTo(map).bindPopup('<b>${p.label.replace(/'/g, "\\'")}</b><br/><span style="color:#666">${p.sub.replace(/'/g, "\\'")}</span>');`;
    }).join('\n');
    
    return `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
<style>body{margin:0}#map{width:100%;height:100vh}</style>
</head><body><div id="map"></div><script>
var map=L.map('map').setView(${center},${zoom});
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
${markerJs}
${pins.length > 1 && !selected ? `map.fitBounds([${pins.map(p => `[${p.lat},${p.lng}]`).join(',')}],{padding:[30,30]});` : ''}
<\/script></body></html>`;
  }, [pins, selected]);

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
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '650px' }}>
          <iframe srcDoc={mapHtml} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts" />
        </div>

        <div className="card" style={{ height: '650px', overflow: 'auto', padding: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{pins.length} records</div>
          {pins.length === 0 && <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--text-muted)', fontSize: '14px' }}>No records match filters</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pins.slice(0, 200).map(pin => {
              const color = COLORS[pin.type];
              const isSel = selected?.id === pin.id && selected?.type === pin.type;
              return (
                <div key={`${pin.type}-${pin.id}`} onClick={() => setSelected(isSel ? null : pin)}
                  style={{ padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', background: isSel ? color + '11' : 'var(--bg-input)', border: `1px solid ${isSel ? color : 'var(--border-subtle)'}`, transition: 'border-color 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div style={{ fontSize: '14px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pin.label}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{pin.type}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '16px' }}>{pin.sub}</div>
                  {isSel && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingLeft: '16px' }}>
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} onClick={e => { e.stopPropagation(); handleNav(pin); }}>Open →</button>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.query)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '11px', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>📍 Google Maps</a>
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
