'use client';

import { useState, useMemo, useEffect } from 'react';
import { fetchAll } from '../lib/db';

const TYPE_CONFIG = {
  zone:       { label: 'Prospect Zones', defaultOn: true },
  substation: { label: 'Substations', defaultOn: true },
  project:    { label: 'Projects', defaultOn: true },
  parcel:     { label: 'Parcels', defaultOn: true },
  property:   { label: 'Properties', defaultOn: true },
  custom:     { label: 'Custom', defaultOn: true },
};

export default function CampaignMap({ campaignId, campaignTitle }) {
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleTypes, setVisibleTypes] = useState(
    Object.fromEntries(Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.defaultOn]))
  );
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    fetchAll('campaign_layers', { order: 'created_at' })
      .then(all => {
        const filtered = all.filter(l => l.campaign_id === campaignId);
        setLayers(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campaignId]);

  const featureTypes = useMemo(() => {
    const types = {};
    layers.forEach(l => { types[l.feature_type] = (types[l.feature_type] || 0) + 1; });
    return types;
  }, [layers]);

  const groups = useMemo(() => {
    const g = {};
    layers.forEach(l => {
      const grp = l.group_name || l.feature_type;
      if (!g[grp]) g[grp] = [];
      g[grp].push(l);
    });
    return g;
  }, [layers]);

  const visibleLayers = useMemo(() => {
    let filtered = layers.filter(l => visibleTypes[l.feature_type]);
    if (selectedGroup) filtered = filtered.filter(l => (l.group_name || l.feature_type) === selectedGroup);
    return filtered;
  }, [layers, visibleTypes, selectedGroup]);

  const toggleType = (type) => setVisibleTypes(prev => ({ ...prev, [type]: !prev[type] }));

  // Build Leaflet map HTML
  const mapHtml = useMemo(() => {
    if (visibleLayers.length === 0) return '';

    const center = visibleLayers.length > 0
      ? `[${visibleLayers.reduce((s, l) => s + parseFloat(l.latitude), 0) / visibleLayers.length}, ${visibleLayers.reduce((s, l) => s + parseFloat(l.longitude), 0) / visibleLayers.length}]`
      : '[34.0, -117.8]';

    const features = visibleLayers.map(l => {
      const lat = parseFloat(l.latitude);
      const lng = parseFloat(l.longitude);
      const c = l.color || '#5577A0';
      const name = (l.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const meta = l.metadata || {};

      if (l.feature_type === 'zone' && l.radius_meters) {
        return `L.circle([${lat},${lng}],{radius:${l.radius_meters},color:'${c}',weight:1.5,dashArray:'7 4',fillColor:'${c}',fillOpacity:0.07}).bindTooltip('${name}',{sticky:true,direction:'top'}).addTo(map);`;
      }

      if (l.feature_type === 'substation') {
        const st = l.status || 'taken';
        const bg = st==='gap'?'rgba(204,51,51,0.3)':st==='opportunity'?'rgba(26,122,84,0.3)':'rgba(232,160,32,0.25)';
        const bw = st==='gap'||st==='opportunity'?'3px':'2px';
        return `L.marker([${lat},${lng}],{icon:L.divIcon({html:'<div style="width:18px;height:18px;transform:rotate(45deg);background:${bg};border:${bw} solid ${c};box-shadow:0 0 8px ${c}88"></div>',className:'',iconSize:[22,22],iconAnchor:[11,11]})}).bindPopup('<div style="font-size:13px;font-weight:700;color:#fff;padding:6px">${name}<br/><span style="font-size:11px;color:${c}">${st.toUpperCase()}</span>${meta.note ? '<br/><span style="font-size:10px;color:#99AABB;margin-top:4px;display:block">' + String(meta.note).replace(/'/g,"\\'").slice(0,200) + '</span>' : ''}</div>').addTo(map);
L.marker([${lat},${lng}],{icon:L.divIcon({html:'<div style="font-size:9px;color:${c};font-weight:700;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,0.9);margin-top:14px;margin-left:14px">${name}</div>',className:'',iconSize:[0,0],iconAnchor:[0,0]})}).addTo(map);`;
      }

      if (l.feature_type === 'project') {
        const mw = l.size_value || 0;
        const r = Math.max(10, Math.min(22, 10 + Math.log(Math.max(1, mw / 40)) * 3.5));
        const dev = meta.developer ? String(meta.developer).replace(/'/g, "\\'") : '';
        const sub = meta.substation ? String(meta.substation).replace(/'/g, "\\'") : '';
        return `L.marker([${lat},${lng}],{icon:L.divIcon({html:'<div style="width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:${c};border:2.5px solid rgba(255,255,255,0.5);box-shadow:0 2px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center">${mw >= 100 ? '<span style="font-size:8px;font-weight:700;color:#fff">' + mw + '</span>' : ''}</div>',className:'',iconSize:[${r * 2},${r * 2}],iconAnchor:[${r},${r}]})}).bindPopup('<div style="padding:8px;font-size:12px;color:#fff"><div style="font-weight:700;font-size:13px;margin-bottom:2px">${name}</div><div style="color:#99AABB">${dev} · ${mw}MW</div>${sub ? '<div style="color:#667788;margin-top:2px">Sub: ' + sub + '</div>' : ''}</div>').addTo(map);`;
      }

      // Default: parcel or property — circle marker
      const r = l.feature_type === 'parcel' ? Math.max(4, Math.min(11, 4 + (l.acres || 5) / 20)) : 7;
      const popup = [
        name,
        l.apn ? 'APN: ' + l.apn : '',
        l.acres ? l.acres + ' ac' : '',
        l.distance_miles ? l.distance_miles + ' mi to sub' : '',
        l.group_name || '',
      ].filter(Boolean).join('<br/>');
      return `L.circleMarker([${lat},${lng}],{radius:${r},fillColor:'${c}',color:'${c}',weight:2,fillOpacity:0.75}).bindPopup('<div style="font-size:11px;color:#fff;padding:4px;line-height:1.5">${popup}</div>').addTo(map);`;
    }).join('\n');

    const bounds = visibleLayers.map(l => `[${l.latitude},${l.longitude}]`).join(',');

    return `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
<style>
body{margin:0;background:#111}
#map{width:100%;height:100vh}
.leaflet-popup-content-wrapper{background:rgba(20,32,50,0.97)!important;border:1px solid rgba(70,100,140,0.6)!important;border-radius:8px!important;box-shadow:0 4px 20px rgba(0,0,0,0.5)!important}
.leaflet-popup-tip{background:rgba(20,32,50,0.97)!important}
.leaflet-popup-content{margin:0!important}
</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView(${center},11);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
${features}
map.fitBounds([${bounds}],{padding:[40,40]});
<\/script></body></html>`;
  }, [visibleLayers]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading map data...</div>;
  if (layers.length === 0) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺</div>
      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>No Map Layers</div>
      <div style={{ fontSize: '13px' }}>Import geospatial data to visualize this campaign on a map.</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '12px' }}>
      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '620px', overflow: 'auto' }}>
        {/* Layer toggles */}
        <div className="card" style={{ padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>Layers</div>
          {Object.entries(featureTypes).map(([type, count]) => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '12px' }}>
              <input type="checkbox" checked={visibleTypes[type] || false} onChange={() => toggleType(type)} style={{ accentColor: 'var(--accent)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{TYPE_CONFIG[type]?.label || type}</span>
              <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '1px 5px', borderRadius: '8px' }}>{count}</span>
            </label>
          ))}
        </div>

        {/* Group filter */}
        <div className="card" style={{ padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>Groups</div>
          <div
            onClick={() => setSelectedGroup('')}
            style={{ padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: !selectedGroup ? 'var(--accent)' : 'var(--text-muted)', fontWeight: !selectedGroup ? 600 : 400, background: !selectedGroup ? 'var(--accent-bg, rgba(85,119,160,0.1))' : 'transparent' }}>
            All ({layers.length})
          </div>
          {Object.entries(groups).map(([grp, items]) => (
            <div key={grp}
              onClick={() => setSelectedGroup(selectedGroup === grp ? '' : grp)}
              style={{ padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: selectedGroup === grp ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: selectedGroup === grp ? 600 : 400, background: selectedGroup === grp ? 'var(--accent-bg, rgba(85,119,160,0.1))' : 'transparent' }}>
              {grp} ({items.length})
            </div>
          ))}
        </div>

        {/* Feature count summary */}
        <div className="card" style={{ padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '6px' }}>Showing</div>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>{visibleLayers.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>of {layers.length} features</div>
        </div>
      </div>

      {/* Map */}
      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--line)', height: '620px', background: '#111' }}>
        {mapHtml ? (
          <iframe srcDoc={mapHtml} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts" />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
            No visible features. Enable layers in the sidebar.
          </div>
        )}
      </div>
    </div>
  );
}
