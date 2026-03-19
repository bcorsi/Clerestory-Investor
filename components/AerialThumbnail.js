'use client';

export default function AerialThumbnail({ address, city, size = '400x200', zoom = 18 }) {
  if (!address) return null;
  const query = `${address}, ${city || ''}, CA`;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  
  if (!key) {
    return (
      <div style={{ height: '160px', background: 'var(--bg3, #E4E0D8)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '12px', color: 'var(--ink4, #B0A89E)', textAlign: 'center' }}>
          <div style={{ marginBottom: '4px' }}>Satellite View</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>Google Maps key needed</div>
        </div>
      </div>
    );
  }

  const src = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(query)}&zoom=${zoom}&size=${size}&maptype=satellite&key=${key}`;

  return (
    <img
      src={src}
      alt={`Aerial: ${address}`}
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '10px', border: '1px solid var(--line, rgba(0,0,0,0.07))' }}
      loading="lazy"
    />
  );
}
