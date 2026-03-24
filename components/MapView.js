'use client';

import { useState, useMemo } from 'react';
import { CATALYST_TAGS, fmt } from '../lib/constants';

const COLORS = { property: '#5577A0', lead: '#6040A8', deal: '#B87A10' };
const PARCEL_COLOR = '#5577A0';

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
  'oxnard': [34.1975, -119.1771], 'camarillo': [34.2164, -119.0376],
  'hacienda heights': [33.9930, -117.9684], 'south gate': [33.9547, -118.2120],
  'costa mesa': [33.6411, -117.9187], 'buena park': [33.8675, -117.9981],
};

function guessCoords(address, city) {
  const c = (city || '').toLowerCase().trim();
  if (CITY_COORDS[c]) return CITY_COORDS[c];
  const parts = (address || '').toLowerCase().split(',');
  for (const part of parts) {
    const t = part.trim();
    if (CITY_COORDS[t]) return CITY_COORDS[t];
    for (const [k, v] of Object.entries(CITY_COORDS)) { if (t.includes(k)) return v; }
  }
  return [34.0, -117.8];
}

export default function MapView({ properties, leads, deals, onPropertyClick, onLeadClick, onDealClick }) {
  const [showLayer, setShowLayer] = useState({ property: true, lead: true, deal: true });
  const [catalystFilter, setCatalystFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [parcelLoading, setParcelLoading] = useState(false);

  const pins = useMemo(() => {
    const all = [];
    const q = searchTerm.toLowerCase();
    if (showLayer.property) {
      (properties || []).forEach(p => {
        if (!p.address) return;
        if (catalystFilter && !(p.catalyst_tags || []).includes(catalystFilter)) return;
        if (q && !`${p.address} ${p.city} ${p.owner} ${p.tenant}`.toLowerCase().includes(q)) return;
        const hasGeo = p.latitude && p.longitude;
        const [lat, lng] = hasGeo ? [parseFloat(p.latitude), parseFloat(p.longitude)] : guessCoords(p.address, p.city);
        all.push({ type: 'property', id: p.id, label: p.address, sub: `${p.city || p.submarket || ''} · ${(p.total_sf || p.building_sf) ? Number(p.total_sf || p.building_sf).toLocaleString() + ' SF' : ''} · ${p.owner || ''}`, record: p, lat, lng, apns: p.apns || [], parcelGeometry: p.parcel_geometry || null });
      });
    }
    if (showLayer.lead) {
      (leads || []).filter(l => !['Converted', 'Dead'].includes(l.stage)).forEach(l => {
        if (!l.address) return;
        if (catalystFilter && !(l.catalyst_tags || []).includes(catalystFilter)) return;
        if (q && !`${l.address} ${l.lead_name} ${l.owner}`.toLowerCase().includes(q)) return;
        const [lat, lng] = guessCoords(l.address, l.city);
        all.push({ type: 'lead', id: l.id, label: l.lead_name, sub: `${l.address} · ${l.stage}`, record: l, lat, lng, apns: [] });
      });
    }
    if (showLayer.deal) {
      (deals || []).filter(d => !['Closed', 'Dead'].includes(d.stage)).forEach(d => {
        if (!d.address) return;
        if (q && !`${d.address} ${d.deal_name}`.toLowerCase().includes(q)) return;
        const [lat, lng] = guessCoords(d.address, d.submarket);
        all.push({ type: 'deal', id: d.id, label: d.deal_name, sub: `${d.address} · ${d.stage}`, record: d, lat, lng, apns: [] });
      });
    }
    return all;
  }, [properties, leads, deals, showLayer, catalystFilter, searchTerm]);

  const handleNav = (pin) => {
    if (pin.type === 'property') onPropertyClick?.(pin.record);
    else if (pin.type === 'lead') onLeadClick?.(pin.record);
    else if (pin.type === 'deal') onDealClick?.(pin.record);
  };

  const counts = { property: pins.filter(p => p.type === 'property').length, lead: pins.filter(p => p.type === 'lead').length, deal: pins.filter(p => p.type === 'deal').length };

  // Build Leaflet map with parcel overlay support
  const mapHtml = useMemo(() => {
    const center = selected ? `[${selected.lat}, ${selected.lng}]` : pins.length > 0 ? `[${pins.reduce((s, p) => s + p.lat, 0) / pins.length}, ${pins.reduce((s, p) => s + p.lng, 0) / pins.length}]` : '[34.0, -117.8]';
    const zoom = selected ? 17 : 10;

    const markerJs = pins.map(p => {
      const c = COLORS[p.type];
      const isSel = selected?.id === p.id && selected?.type === p.type;
      return `L.circleMarker([${p.lat},${p.lng}],{radius:${isSel ? 10 : 7},fillColor:'${c}',color:'${isSel ? '#fff' : c}',weight:${isSel ? 3 : 1.5},fillOpacity:${isSel ? 1 : 0.85}}).addTo(map).bindPopup('<b>${p.label.replace(/'/g, "\\'")}</b><br/><span style="color:#666">${p.sub.replace(/'/g, "\\'")}</span>');`;
    }).join('\n');

    // APN list for parcel query (only for selected property)
    const apnList = selected?.apns?.map(a => a.apn || a).filter(Boolean) || [];
    const apnQuery = apnList.length > 0 ? apnList.map(a => `APN='${a.replace(/-/g, '')}'`).join(' OR ') : '';

    return `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
<style>body{margin:0;font-family:'Instrument Sans',sans-serif}#map{width:100%;height:100vh}.info{position:absolute;top:10px;right:10px;z-index:1000;background:rgba(255,255,255,0.95);border-radius:8px;padding:8px 12px;font-size:12px;color:#3C3830;box-shadow:0 2px 8px rgba(0,0,0,0.12);border:1px solid rgba(0,0,0,0.07)}</style>
</head><body><div id="map"></div>
${selected && apnList.length > 0 ? '<div class="info" id="parcel-info">Loading parcels...</div>' : ''}
<script>
var map=L.map('map').setView(${center},${zoom});
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
${markerJs}
${pins.length > 1 && !selected ? `map.fitBounds([${pins.map(p => `[${p.lat},${p.lng}]`).join(',')}],{padding:[30,30]});` : ''}

${selected && apnList.length > 0 ? `
// Query ArcGIS for parcel polygons (or use stored geometry)
(function(){
  ${selected.parcelGeometry?.features?.length > 0 ? `
  // ── STORED GEOMETRY (instant) ──
  var data = ${JSON.stringify(selected.parcelGeometry)};
  var group = L.geoJSON(data, {style:{color:'${PARCEL_COLOR}',weight:4,fillColor:'${PARCEL_COLOR}',fillOpacity:0.15}}).addTo(map);
  map.fitBounds(group.getBounds(), {padding:[40,40], maxZoom:18});
  var info = document.getElementById('parcel-info');
  if(info) info.textContent = data.features.length + ' parcel' + (data.features.length>1?'s':'') + ' \\u00B7 ' + '${selected?.label?.replace(/'/g, "\\'") || ''}';
  ` : `
  // ── LIVE QUERY ──
  var apnWhere = "${apnQuery}";
  var url = 'https://arcgis.lacounty.gov/arcgis/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query?where=' + encodeURIComponent(apnWhere) + '&outFields=APN,AIN&returnGeometry=true&f=geojson&outSR=4326';
  
  fetch(url).then(function(r){return r.json()}).then(function(data){
    var info = document.getElementById('parcel-info');
    if(!data.features || data.features.length===0){
      var sbUrl = 'https://gis.sbcounty.gov/arcgis/rest/services/Parcels/MapServer/0/query?where=' + encodeURIComponent(apnWhere) + '&outFields=APN&returnGeometry=true&f=geojson&outSR=4326';
      return fetch(sbUrl).then(function(r){return r.json()});
    }
    return data;
  }).then(function(data){
    var info = document.getElementById('parcel-info');
    if(!data || !data.features || data.features.length===0){
      if(info) info.textContent = 'No parcels found for APNs';
      return;
    }
    var group = L.geoJSON(data, {style:{color:'${PARCEL_COLOR}',weight:4,fillColor:'${PARCEL_COLOR}',fillOpacity:0.15}}).addTo(map);
    map.fitBounds(group.getBounds(), {padding:[40,40], maxZoom:18});
    if(info) info.textContent = data.features.length + ' parcel' + (data.features.length>1?'s':'') + ' \\u00B7 ' + '${selected?.label?.replace(/'/g, "\\'") || ''}';
  }).catch(function(e){
    var info = document.getElementById('parcel-info');
    if(info) info.textContent = 'Parcel query error';
    console.error(e);
  });
  `}
})();
` : ''}

${selected && apnList.length === 0 ? `
// No APNs — try geocoding-based parcel search
(function(){
  var lat = ${selected.lat};
  var lng = ${selected.lng};
  var geom = JSON.stringify({x:lng,y:lat,spatialReference:{wkid:4326}});
  var url = 'https://arcgis.lacounty.gov/arcgis/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query?geometry='+encodeURIComponent(geom)+'&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=APN,AIN,SitusAddress&returnGeometry=true&f=geojson&outSR=4326&inSR=4326';
  fetch(url).then(function(r){return r.json()}).then(function(data){
    if(data.features && data.features.length>0){
      L.geoJSON(data, {style:{color:'${PARCEL_COLOR}',weight:3,fillColor:'${PARCEL_COLOR}',fillOpacity:0.2}}).addTo(map);
      map.fitBounds(L.geoJSON(data).getBounds(), {padding:[40,40], maxZoom:18});
    }
  }).catch(function(e){console.error(e)});
})();
` : ''}
<\/script></body></html>`;
  }, [pins, selected]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '14px 18px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px' }}>
        {[['property', 'Properties', COLORS.property], ['lead', 'Leads', COLORS.lead], ['deal', 'Deals', COLORS.deal]].map(([key, label, color]) => (
          <button key={key} onClick={() => setShowLayer(prev => ({ ...prev, [key]: !prev[key] }))}
            style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: showLayer[key] ? color + '14' : 'transparent', borderColor: showLayer[key] ? color + '44' : 'var(--line)', color: showLayer[key] ? color : 'var(--ink4)' }}>
            {label} ({counts[key]})
          </button>
        ))}
        <select className="select" style={{ fontSize: '12px', maxWidth: '180px' }} value={catalystFilter} onChange={e => setCatalystFilter(e.target.value)}>
          <option value="">All catalysts</option>
          {CATALYST_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className="input" style={{ flex: 1, minWidth: '150px', fontSize: '12px' }} placeholder="Search address, owner..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '14px' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden', height: '650px' }}>
          <iframe srcDoc={mapHtml} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts" />
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', height: '650px', overflow: 'auto' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg)', fontSize: '13px', fontWeight: 600, color: 'var(--ink2)' }}>{pins.length} Records</div>
          {pins.length === 0 && <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--ink4)', fontSize: '13px' }}>No records match filters</div>}
          <div>
            {pins.slice(0, 200).map(pin => {
              const color = COLORS[pin.type];
              const isSel = selected?.id === pin.id && selected?.type === pin.type;
              return (
                <div key={`${pin.type}-${pin.id}`} onClick={() => setSelected(isSel ? null : pin)}
                  style={{ padding: '12px 16px', cursor: 'pointer', background: isSel ? color + '0C' : 'var(--card)', borderBottom: '1px solid var(--line3)', borderLeft: isSel ? `3px solid ${color}` : '3px solid transparent', transition: 'all 0.1s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pin.label}</div>
                    <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{pin.type}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink4)', paddingLeft: '16px' }}>{pin.sub}</div>
                  {isSel && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingLeft: '16px' }}>
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} onClick={e => { e.stopPropagation(); handleNav(pin); }}>Open →</button>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.label + ', CA')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ fontSize: '11px', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>Google Maps ↗</a>
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
