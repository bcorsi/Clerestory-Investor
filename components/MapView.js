'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { STAGE_COLORS, CATALYST_TAGS, fmt } from '../lib/constants';

const COLORS = { property: '#3b82f6', lead: '#8b5cf6', deal: '#f59e0b' };
const LABELS = { property: 'Property', lead: 'Lead', deal: 'Deal' };

// Simple geocode cache to avoid repeated lookups
const geoCache = {};

async function geocode(address) {
  if (!address) return null;
  if (geoCache[address]) return geoCache[address];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
    const data = await res.json();
    if (data?.[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geoCache[address] = coords;
      return coords;
    }
  } catch {}
  return null;
}

export default function MapView({ properties, leads, deals, onPropertyClick, onLeadClick, onDealClick }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [showLayer, setShowLayer] = useState({ property: true, lead: true, deal: true });
  const [catalystFilter, setCatalystFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geocoded, setGeocoded] = useState([]);

  // Build pin data
  const pins = useMemo(() => {
    const all = [];
    if (showLayer.property) {
      (properties || []).forEach(p => {
        if (!p.address) return;
        if (catalystFilter && !(p.catalyst_tags || []).includes(catalystFilter)) return;
        if (searchTerm && !`${p.address} ${p.city} ${p.owner} ${p.tenant}`.toLowerCase().includes(searchTerm.toLowerCase())) return;
        all.push({ type: 'property', id: p.id, label: p.address, sub: `${p.city || p.submarket || ''} · ${(p.total_sf || p.building_sf) ? Number(p.total_sf || p.building_sf).toLocaleString() + ' SF' : ''}`, record: p, address: `${p.address}, ${p.city || ''}, CA` });
      });
    }
    if (showLayer.lead) {
      (leads || []).filter(l => !['Converted', 'Dead'].includes(l.stage)).forEach(l => {
        if (!l.address) return;
        if (catalystFilter && !(l.catalyst_tags || []).includes(catalystFilter)) return;
        if (searchTerm && !`${l.address} ${l.lead_name} ${l.owner}`.toLowerCase().includes(searchTerm.toLowerCase())) return;
        all.push({ type: 'lead', id: l.id, label: l.lead_name, sub: `${l.address} · ${l.stage}`, record: l, address: `${l.address}, CA` });
      });
    }
    if (showLayer.deal) {
      (deals || []).filter(d => !['Closed', 'Dead'].includes(d.stage)).forEach(d => {
        if (!d.address) return;
        if (searchTerm && !`${d.address} ${d.deal_name}`.toLowerCase().includes(searchTerm.toLowerCase())) return;
        all.push({ type: 'deal', id: d.id, label: d.deal_name, sub: `${d.address} · ${d.stage}`, record: d, address: `${d.address}, CA` });
      });
    }
    return all;
  }, [properties, leads, deals, showLayer, catalystFilter, searchTerm]);

  // Geocode all pins
  useEffect(() => {
    let cancelled = false;
    async function geo() {
      setLoading(true);
      const results = [];
      for (const pin of pins) {
        const coords = await geocode(pin.address);
        if (cancelled) return;
        if (coords) results.push({ ...pin, ...coords });
      }
      setGeocoded(results);
      setLoading(false);
    }
    geo();
    return () => { cancelled = true; };
  }, [pins]);

  // Init Leaflet map
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    if (typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => {
      const L = window.L;
      const map = L.map(mapRef.current).setView([34.05, -117.75], 10);
      // Esri satellite tiles
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri', maxZoom: 19,
      }).addTo(map);
      // Labels overlay
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
      }).addTo(map);
      mapInstance.current = map;
    };
    document.head.appendChild(script);

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  // Update markers when geocoded pins change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !window.L) return;
    const L = window.L;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (geocoded.length === 0) return;

    geocoded.forEach(pin => {
      const color = COLORS[pin.type];
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;font-size:13px;min-width:160px;"><strong>${pin.label}</strong><br/><span style="color:#666;">${pin.sub}</span><br/><span style="color:${color};font-weight:600;text-transform:uppercase;font-size:11px;">${LABELS[pin.type]}</span></div>`);
      marker.on('click', () => setSelected(pin));
      markersRef.current.push(marker);
    });

    // Fit bounds
    if (geocoded.length > 0) {
      const bounds = L.latLngBounds(geocoded.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [geocoded]);

  const handleNavigate = (pin) => {
    if (pin.type === 'property') onPropertyClick?.(pin.record);
    else if (pin.type === 'lead') onLeadClick?.(pin.record);
    else if (pin.type === 'deal') onDealClick?.(pin.record);
  };

  const counts = { property: geocoded.filter(p => p.type === 'property').length, lead: geocoded.filter(p => p.type === 'lead').length, deal: geocoded.filter(p => p.type === 'deal').length };

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
          <input className="input" style={{ flex: 1, minWidth: '150px', fontSize: '13px' }} placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', height: '600px' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Geocoding {pins.length} addresses...</div>}
        </div>

        <div className="card" style={{ overflow: 'auto', padding: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{geocoded.length} pins on map</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {geocoded.slice(0, 100).map(pin => {
              const color = COLORS[pin.type];
              const isSel = selected?.id === pin.id && selected?.type === pin.type;
              return (
                <div key={`${pin.type}-${pin.id}`} onClick={() => setSelected(pin)}
                  style={{ padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', background: isSel ? color + '11' : 'var(--bg-input)', border: `1px solid ${isSel ? color : 'var(--border-subtle)'}`, transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div style={{ fontSize: '14px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pin.label}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{pin.type}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '16px' }}>{pin.sub}</div>
                  {isSel && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingLeft: '16px' }}>
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} onClick={e => { e.stopPropagation(); handleNavigate(pin); }}>Open →</button>
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
