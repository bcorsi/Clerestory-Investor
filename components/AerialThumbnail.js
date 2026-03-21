'use client';

import { useState, useMemo } from 'react';

const PARCEL_COLOR = '#5577A0';

export default function AerialThumbnail({ address, city, apns, size = '600x400', zoom = 17, height = 280 }) {
  if (!address) return null;
  const query = `${address}, ${city || ''}, CA`;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  const [useMap, setUseMap] = useState(true);

  // Build APN where clause for ArcGIS
  const apnList = (apns || []).map(a => typeof a === 'string' ? a : a.apn).filter(Boolean);
  const apnWhere = apnList.length > 0 ? apnList.map(a => `APN='${a.replace(/-/g, '')}'`).join(' OR ') : '';

  const mapHtml = useMemo(() => {
    // Geocode approximation from city
    const COORDS = {
      'city of industry': [34.0198, -117.9587], 'vernon': [33.9925, -118.2301], 'el monte': [34.0686, -118.0276],
      'south el monte': [34.0519, -118.0465], 'irwindale': [34.1070, -117.9354], 'azusa': [34.1336, -117.9076],
      'baldwin park': [34.0853, -117.9609], 'ontario': [34.0633, -117.6509], 'fontana': [34.0922, -117.4350],
      'rancho cucamonga': [34.1064, -117.5931], 'chino': [34.0122, -117.6889], 'rialto': [34.1064, -117.3703],
      'pomona': [34.0551, -117.7500], 'west covina': [34.0686, -117.9390], 'santa fe springs': [33.9472, -118.0854],
      'commerce': [33.9967, -118.1598], 'downey': [33.9401, -118.1332], 'carson': [33.8314, -118.2620],
      'compton': [33.8958, -118.2201], 'torrance': [33.8358, -118.3406], 'anaheim': [33.8366, -117.9143],
      'irvine': [33.6846, -117.8265], 'los angeles': [34.0522, -118.2437], 'riverside': [33.9533, -117.3962],
      'san bernardino': [34.1083, -117.2898], 'colton': [34.0739, -117.3136],
    };
    const c = (city || '').toLowerCase().trim();
    const center = COORDS[c] || [34.0, -117.8];

    return `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
<style>body{margin:0}#map{width:100%;height:${height}px}.info{position:absolute;bottom:8px;left:8px;z-index:1000;background:rgba(30,37,53,0.88);border-radius:6px;padding:5px 10px;font-family:'Instrument Sans',sans-serif;font-size:11px;color:rgba(240,235,225,0.85);backdrop-filter:blur(4px)}</style>
</head><body><div id="map"></div><div class="info" id="info">Loading parcels...</div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${center[0]},${center[1]}],${zoom});
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);

// Geocode address to get precise center
var geocodeUrl='https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&outSR=4326&maxLocations=1&singleLine='+encodeURIComponent('${query}');
fetch(geocodeUrl).then(function(r){return r.json()}).then(function(data){
  if(data.candidates&&data.candidates.length>0){
    var loc=data.candidates[0].location;
    map.setView([loc.y,loc.x],${zoom});
    queryParcels(loc.y,loc.x);
  } else {
    queryParcels(${center[0]},${center[1]});
  }
}).catch(function(){queryParcels(${center[0]},${center[1]});});

function queryParcels(lat,lng){
  var info=document.getElementById('info');
  ${apnWhere ? `
  // Query by APN
  var url='https://arcgis.lacounty.gov/arcgis/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query?where='+encodeURIComponent("${apnWhere}")+'&outFields=APN&returnGeometry=true&f=geojson&outSR=4326';
  fetch(url).then(function(r){return r.json()}).then(function(data){
    if(data.features&&data.features.length>0){
      drawParcels(data,info);
    } else {
      // Try SB County
      var sbUrl='https://gis.sbcounty.gov/arcgis/rest/services/Parcels/MapServer/0/query?where='+encodeURIComponent("${apnWhere}")+'&outFields=APN&returnGeometry=true&f=geojson&outSR=4326';
      fetch(sbUrl).then(function(r){return r.json()}).then(function(d2){
        if(d2.features&&d2.features.length>0) drawParcels(d2,info);
        else pointQuery(lat,lng,info);
      }).catch(function(){pointQuery(lat,lng,info);});
    }
  }).catch(function(){pointQuery(lat,lng,info);});
  ` : `pointQuery(lat,lng,info);`}
}

function pointQuery(lat,lng,info){
  var geom=JSON.stringify({x:lng,y:lat,spatialReference:{wkid:4326}});
  var url='https://arcgis.lacounty.gov/arcgis/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query?geometry='+encodeURIComponent(geom)+'&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=APN,AIN,SitusAddress&returnGeometry=true&f=geojson&outSR=4326&inSR=4326&distance=50&units=esriSRUnit_Meter';
  fetch(url).then(function(r){return r.json()}).then(function(data){
    if(data.features&&data.features.length>0) drawParcels(data,info);
    else {
      // Try SB County
      var sbUrl='https://gis.sbcounty.gov/arcgis/rest/services/Parcels/MapServer/0/query?geometry='+encodeURIComponent(geom)+'&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=APN&returnGeometry=true&f=geojson&outSR=4326&inSR=4326';
      fetch(sbUrl).then(function(r){return r.json()}).then(function(d2){
        if(d2.features&&d2.features.length>0) drawParcels(d2,info);
        else { info.textContent='${address.replace(/'/g,"\\'")}'; }
      }).catch(function(){ info.textContent='${address.replace(/'/g,"\\'")}'; });
    }
  }).catch(function(){ info.textContent='${address.replace(/'/g,"\\'")}'; });
}

function drawParcels(data,info){
  // Draw ALL parcels with same style — one merged outline
  var group=L.geoJSON(data,{style:{color:'${PARCEL_COLOR}',weight:3,fillColor:'${PARCEL_COLOR}',fillOpacity:0.15,dashArray:null}}).addTo(map);
  // Fit bounds to parcel
  map.fitBounds(group.getBounds(),{padding:[20,20],maxZoom:18});
  info.textContent=data.features.length+' parcel'+(data.features.length>1?'s':'')+' · ${address.replace(/'/g,"\\'")}';
}
<\/script></body></html>`;
  }, [address, city, apns, height, zoom]);

  if (!useMap && key) {
    const src = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(query)}&zoom=${zoom}&size=${size}&maptype=satellite&key=${key}`;
    return (
      <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--line)' }}>
        <img src={src} alt={`Aerial: ${address}`} style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
        <button onClick={() => setUseMap(true)} style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(30,37,53,0.88)', color: 'rgba(240,235,225,0.85)', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>Show Parcels</button>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
      <iframe srcDoc={mapHtml} style={{ width: '100%', height: `${height}px`, border: 'none', display: 'block' }} sandbox="allow-scripts" />
    </div>
  );
}
