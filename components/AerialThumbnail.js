'use client';

export default function AerialThumbnail({ address, city, size = '400x200', zoom = 18 }) {
  if (!address) return null;
  const query = `${address}, ${city || ''}, CA`;
  // Key must be NEXT_PUBLIC_ to be available client-side
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  
  const hasSrc = !!key;
  const src = hasSrc ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(query)}&zoom=${zoom}&size=${size}&maptype=satellite&key=${key}` : null;

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md, 3px)', overflow: 'hidden', marginBottom: '14px' }}>
      {hasSrc ? (
        <img src={src} alt={`Aerial: ${address}`} style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
      ) : (
        <div style={{ height: '128px', background: 'var(--bg3, #1E2430)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 300 128" preserveAspectRatio="none">
            <defs><pattern id="mapgrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0L0 0 0 20" fill="none" stroke="rgba(200,220,255,0.07)" strokeWidth="0.5"/></pattern></defs>
            <rect width="300" height="128" fill="url(#mapgrid)"/>
            <rect x="90" y="32" width="120" height="64" fill="rgba(212,140,20,0.07)" stroke="rgba(212,140,20,0.22)" strokeWidth="1"/>
            <circle cx="150" cy="64" r="4" fill="#F0A824"/>
            <circle cx="150" cy="64" r="11" fill="none" stroke="#F0A824" strokeWidth="1" opacity="0.3"/>
          </svg>
          <div style={{ fontSize: '10px', color: 'var(--ivory4, #504A40)', textAlign: 'center', zIndex: 1 }}>
            <div>{city || 'Map View'}</div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', borderTop: '1px solid var(--line, rgba(200,220,255,0.08))' }}>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, padding: '7px', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--amber2, #F0A824)', textAlign: 'center', textDecoration: 'none', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase' }}>Maps ↗</a>
        <div style={{ width: '1px', background: 'var(--line, rgba(200,220,255,0.08))' }} />
        <a href={`https://www.google.com/maps/@?api=1&map_action=map&basemap=satellite&zoom=18&center=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, padding: '7px', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--amber2, #F0A824)', textAlign: 'center', textDecoration: 'none', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase' }}>Aerial ↗</a>
      </div>
    </div>
  );
}
