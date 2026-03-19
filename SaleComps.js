'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CATALYST_TAGS, fmt } from '../lib/constants';

const PIN_COLORS = { property: '#3b82f6', lead: '#8b5cf6', deal: '#f59e0b' };
const PIN_LABELS = { property: 'Property', lead: 'Lead', deal: 'Deal' };

// Geocode via Nominatim (free, no key)
const geoCache = {};
async function geocode(address) {
  if (!address) return null;
  const key = address.trim().toLowerCase();
  if (geoCache[key]) return geoCache[key];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`);
    const data = await res.json();
    if (data?.[0]) {
      const c = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geoCache[key] = c;
      return c;
    }
  } catch (e) { console.error('Geocode error:', e); }
  return null;
}

export default function MapView({ properties, leads, deals, onPropertyClick, onLeadClick, onDealClick }) {
  const mapEl = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef([]);
  const [leafletReady, setLeafletReady] = useState(false);
  const [showLayer, setShowLayer] = useState({ property: true, lead: true, deal: true });
  const [catalystFilter, setCatalystFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [geocoded, setGeocoded] = useState([]);
  const [geoProgress, setGeoProgress] = useState('');

  // Load Leaflet CSS + JS once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.L) { setLeafletReady(true); return; }

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);

    const js = document.createElement('script');
    js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    js.onload = () => setLeafletReady(true);
    js.onerror = () => console.error('Failed to load Leaflet');
    document.head.appendChild(js);
  }, []);

  // Init map when Leaflet is loaded
  useEffect(() => {
    if (!leafletReady || !mapEl.current || mapObj.current) return;
    const L = window.L;
    const map = L.map(mapEl.current, { zoomControl: true }).setView([34.0, -117.7], 10);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri Satellite', maxZoom: 19,
    }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
    }).addTo(map);
    mapObj.current = map;
    // Force resize after mount
    setTimeout(() => map.invalidateSize(), 200);
  }, [leafletReady]);

  // Build pins from filtered records
  const pins = useMemo(() => {
    const all = [];
    const q = searchTerm.toLowerCase();
    if (showLayer.property) {
      (properties || []).forEach(p => {
        if (!p.address) return;
        if (catalystFilter && !(p.catalyst_tags || []).includes(catalystFilter)) return;
        if (q && !`${p.address} ${p.city} ${p.owner} ${p.tenant}`.toLowerCase().includes(q)) return;
        all.push({ type: 'property', id: p.id, label: p.address, sub: `${p.city || p.submarket || ''} · ${(p.total_sf || p.building_sf) ? Number(p.total_sf || p.building_sf).toLocaleString() + ' SF' : ''}`, record: p, address: `${p.address}, ${p.city || ''}, CA` });
      });
    }
    if (showLayer.lead) {
      (leads || []).filter(l => !['Converted', 'Dead'].includes(l.stage)).forEach(l => {
        if (!l.address) return;
        if (catalystFilter && !(l.catalyst_tags || []).includes(catalystFilter)) return;
        if (q && !`${l.address} ${l.lead_name} ${l.owner}`.toLowerCase().includes(q)) return;
        all.push({ type: 'lead', id: l.id, label: l.lead_name, sub: `${l.address} · ${l.stage}`, record: l, address: `${l.address}, CA` });
      });
    }
    if (showLayer.deal) {
      (deals || []).filter(d => !['Closed', 'Dead'].includes(d.stage)).forEach(d => {
        if (!d.address) return;
        if (q && !`${d.address} ${d.deal_name}`.toLowerCase().includes(q)) return;
        all.push({ type: 'deal', id: d.id, label: d.deal_name, sub: `${d.address} · ${d.stage}`, record: d, address: `${d.address}, CA` });
      });
    }
    return all;
  }, [properties, leads, deals, showLayer, catalystFilter, searchTerm]);

  // Geocode pins with progress
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const results = [];
      for (let i = 0; i < pins.length; i++) {
        if (cancelled) return;
        setGeoProgress(`Geocoding ${i + 1}/${pins.length}...`);
        const coords = await geocode(pins[i].address);
        if (coords) results.push({ ...pins[i], ...coords });
        // Rate limit: 1 req/sec for Nominatim
        if (!geoCache[pins[i].address?.trim().toLowerCase()] && i < pins.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
      if (!cancelled) { setGeocoded(results); setGeoProgress(''); }
    }
    if (pins.length > 0) run();
    else { setGeocoded([]); setGeoProgress(''); }
    return () => { cancelled = true; };
  }, [pins]);

  // Place markers on map
  useEffect(() => {
    const map = mapObj.current;
    if (!map || !window.L || geocoded.length === 0) return;
    const L = window.L;

    markers.current.forEach(m => map.removeLayer(m));
    markers.current = [];

    geocoded.forEach(pin => {
      const color = PIN_COLORS[pin.type];
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      });
      const m = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:system-ui;font-size:13px;min-width:180px;line-height:1.5;"><strong>${pin.label}</strong><br/><span style="color:#666;">${pin.sub}</span><br/><span style="color:${color};font-weight:700;text-transform:uppercase;font-size:11px;">${PIN_LABELS[pin.type]}</span></div>`);
      m.on('click', () => setSelected(pin));
      markers.current.push(m);
    });

    const bounds = L.latLngBounds(geocoded.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [geocoded]);

  const handleNav = (pin) => {
    if (pin.type === 'property') onPropertyClick?.(pin.record);
    else if (pin.type === 'lead') onLeadClick?.(pin.record);
    else if (pin.type === 'deal') onDealClick?.(pin.record);
  };

  const counts = {
    property: geocoded.filter(p => p.type === 'property').length,
    lead: geocoded.filter(p => p.type === 'lead').length,
    deal: geocoded.filter(p => p.type === 'deal').length,
  };

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[['property', '⌂ Properties', PIN_COLORS.property], ['lead', '◎ Leads', PIN_COLORS.lead], ['deal', '◈ Deals', PIN_COLORS.deal]].map(([key, label, color]) => (
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
          {geoProgress && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{geoProgress}</span>}
        </div>
      </div>

      {/* Map + List */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '600px', position: 'relative' }}>
          <div ref={mapEl} style={{ width: '100%', height: '100%' }} />
          {!leafletReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', fontSize: '14px', color: 'var(--text-muted)' }}>Loading map...</div>
          )}
        </div>

        <div className="card" style={{ height: '600px', overflow: 'auto', padding: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{geocoded.length} pins · {pins.length - geocoded.length > 0 ? `${pins.length - geocoded.length} pending` : 'all geocoded'}</div>
          {geocoded.length === 0 && !geoProgress && (
            <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--text-muted)', fontSize: '14px' }}>
              {pins.length === 0 ? 'No records with addresses. Add properties, leads, or deals with addresses to see them on the map.' : 'Geocoding in progress...'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {geocoded.slice(0, 100).map(pin => {
              const color = PIN_COLORS[pin.type];
              const isSel = selected?.id === pin.id && selected?.type === pin.type;
              return (
                <div key={`${pin.type}-${pin.id}`} onClick={() => { setSelected(pin); if (mapObj.current && window.L) mapObj.current.setView([pin.lat, pin.lng], 16); }}
                  style={{ padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', background: isSel ? color + '11' : 'var(--bg-input)', border: `1px solid ${isSel ? color : 'var(--border-subtle)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div style={{ fontSize: '14px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pin.label}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{pin.type}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '16px' }}>{pin.sub}</div>
                  {isSel && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingLeft: '16px' }}>
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} onClick={e => { e.stopPropagation(); handleNav(pin); }}>Open →</button>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.address)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '11px', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>📍 Google Maps</a>
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
