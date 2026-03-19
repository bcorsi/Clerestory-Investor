'use client';

import { useState, useEffect } from 'react';

export default function AerialImage({ address, city, style }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!address) return;
    const fullAddr = `${address}, ${city || ''}, CA`;
    fetch(`/api/aerial?address=${encodeURIComponent(fullAddr)}`)
      .then(r => r.json())
      .then(data => { if (data.url) setUrl(data.url); else setError(true); })
      .catch(() => setError(true));
  }, [address, city]);

  if (!address || error) return null;
  if (!url) return (
    <div style={{ width: '100%', height: '180px', background: 'var(--bg-input)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', ...style }}>
      Loading aerial...
    </div>
  );

  return (
    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', ' + (city || '') + ', CA')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: '6px', overflow: 'hidden', ...style }}>
      <img src={url} alt={`Aerial view of ${address}`} style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
    </a>
  );
}
