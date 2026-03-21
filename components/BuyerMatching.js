'use client';

import { useState, useMemo } from 'react';

// ── BUYER MATCHING ENGINE ────────────────────────────────────
// Formula from Blueprint Section 5.4:
// Market match: +20 | Deal type: +20 | SF fit: +15 | Price fit: +15
// SLB bonus: +10 | Clear height: +5 | Power: +5 | Timing: +10
// Total possible: 100

function calculateMatchScore(property, account) {
  let score = 0;
  const reasons = [];

  // 1. Market match (+20)
  const propMarket = guessMarket(property);
  const buyerMarkets = account.preferred_markets || [];
  if (propMarket && buyerMarkets.includes(propMarket)) {
    score += 20;
    reasons.push(`Market: ${propMarket} ✓`);
  }

  // 2. Deal type match (+20)
  const propDealTypes = inferDealTypes(property);
  const buyerDealTypes = account.deal_type_preference || [];
  const dealOverlap = propDealTypes.filter(t => buyerDealTypes.includes(t));
  if (dealOverlap.length > 0) {
    score += 20;
    reasons.push(`Deal type: ${dealOverlap.join(', ')} ✓`);
  }

  // 3. SF in range (+15)
  const sf = property.building_sf;
  if (sf && account.min_sf && account.max_sf) {
    if (sf >= account.min_sf && sf <= account.max_sf) {
      score += 15;
      reasons.push(`SF: ${sf.toLocaleString()} in range ✓`);
    } else if (sf >= account.min_sf * 0.8 && sf <= account.max_sf * 1.2) {
      score += 8; // partial credit for near-miss
      reasons.push(`SF: ${sf.toLocaleString()} near range`);
    }
  } else if (sf && account.min_sf && sf >= account.min_sf) {
    score += 10; // no max specified, above min
    reasons.push(`SF: above min ✓`);
  }

  // 4. Price in range (+15)
  const pricePsf = property.price_psf || property.last_sale_price && property.building_sf
    ? Math.round(property.last_sale_price / property.building_sf)
    : null;
  if (pricePsf && account.min_price_psf && account.max_price_psf) {
    if (pricePsf >= account.min_price_psf && pricePsf <= account.max_price_psf) {
      score += 15;
      reasons.push(`$/SF: $${pricePsf} in range ✓`);
    } else if (pricePsf >= account.min_price_psf * 0.8 && pricePsf <= account.max_price_psf * 1.3) {
      score += 8;
      reasons.push(`$/SF: $${pricePsf} near range`);
    }
  }

  // 5. SLB bonus (+10)
  const propTags = property.catalyst_tags || [];
  const hasSLB = propTags.some(t => t.toLowerCase().includes('slb'));
  const buyerWantsSLB = buyerDealTypes.includes('SLB');
  if (hasSLB && buyerWantsSLB) {
    score += 10;
    reasons.push('SLB match ✓');
  }

  // 6. Clear height (+5)
  if (property.clear_height && account.min_clear_height) {
    if (property.clear_height >= account.min_clear_height) {
      score += 5;
      reasons.push(`Clear: ${property.clear_height}' ≥ ${account.min_clear_height}' ✓`);
    }
  } else if (!account.min_clear_height) {
    score += 3; // no requirement = partial credit
  }

  // 7. Power (+5)
  if (!account.power_requirement || account.power_requirement === 'Any' || account.power_requirement === 'Standard') {
    score += 5;
  }

  // 8. Timing (+10)
  if (account.acquisition_timing === 'Actively Buying Now') {
    score += 10;
    reasons.push('Actively buying ✓');
  } else if (account.acquisition_timing === 'Buying Selectively') {
    score += 5;
    reasons.push('Buying selectively');
  }

  return { score, reasons };
}

function guessMarket(p) {
  const sub = (p.submarket || '').toLowerCase();
  const city = (p.city || '').toLowerCase();
  if (sub.includes('sgv') || sub.includes('industry') || sub.includes('el monte') || sub.includes('vernon') || sub.includes('baldwin') || sub.includes('irwindale') || sub.includes('azusa') || sub.includes('walnut') || sub.includes('covina') || sub.includes('puente')) return 'SGV';
  if (sub.includes('ie') || sub.includes('fontana') || sub.includes('ontario') || sub.includes('rancho') || sub.includes('chino') || sub.includes('jurupa') || sub.includes('riverside') || sub.includes('corona')) return 'IE';
  if (sub.includes('oc') || sub.includes('irvine') || sub.includes('anaheim') || sub.includes('santa ana')) return 'OC';
  if (sub.includes('south bay') || sub.includes('carson') || sub.includes('compton') || sub.includes('torrance')) return 'LA';
  if (sub.includes('central la') || sub.includes('vernon') || sub.includes('commerce')) return 'LA';
  if (sub.includes('sfv') || sub.includes('san fernando') || sub.includes('sylmar') || sub.includes('burbank')) return 'LA';
  // City fallback
  if (['city of industry','el monte','south el monte','irwindale','baldwin park','azusa','west covina','covina','walnut','la puente'].includes(city)) return 'SGV';
  if (['ontario','fontana','rancho cucamonga','chino','jurupa valley','riverside','corona','redlands','rialto','colton','upland','montclair'].includes(city)) return 'IE';
  return null;
}

function inferDealTypes(p) {
  const types = [];
  const tags = (p.catalyst_tags || []).map(t => t.toLowerCase());
  const vac = (p.vacancy_status || '').toLowerCase();
  
  if (tags.some(t => t.includes('slb'))) types.push('SLB');
  if (tags.some(t => t.includes('value') || t.includes('under-market') || t.includes('functionally'))) types.push('Value-Add');
  if (tags.some(t => t.includes('distress') || t.includes('delinquent'))) types.push('Distress');
  if (vac === 'vacant') types.push('Value-Add');
  if (tags.some(t => t.includes('owner-user'))) types.push('Owner-User');
  if (types.length === 0) types.push('Core', 'Value-Add', 'SLB');
  return [...new Set(types)];
}

export default function BuyerMatching({ property, accounts, onAccountClick }) {
  const [minScore, setMinScore] = useState(40);
  const [showAll, setShowAll] = useState(false);

  const matches = useMemo(() => {
    if (!accounts || !property) return [];
    
    const buyerAccounts = accounts.filter(a =>
      a.preferred_markets?.length > 0 &&
      a.acquisition_timing !== 'Not Buying' &&
      a.acquisition_timing !== 'Paused'
    );

    return buyerAccounts.map(a => {
      const { score, reasons } = calculateMatchScore(property, a);
      return { account: a, score, reasons };
    })
    .filter(m => showAll || m.score >= minScore)
    .sort((a, b) => b.score - a.score);
  }, [property, accounts, minScore, showAll]);

  const tier = (score) => {
    if (score >= 80) return { label: 'A', color: 'var(--green)', bg: 'var(--green-bg)' };
    if (score >= 60) return { label: 'B', color: 'var(--blue)', bg: 'var(--blue-bg)' };
    if (score >= 40) return { label: 'C', color: 'var(--amber)', bg: 'var(--amber-bg)' };
    return { label: 'D', color: 'var(--ink3)', bg: 'rgba(122,116,108,0.13)' };
  };

  const hot = matches.filter(m => m.score >= 80).length;
  const strong = matches.filter(m => m.score >= 60 && m.score < 80).length;

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {hot > 0 && (
            <div style={{ padding: '6px 14px', background: 'var(--green-bg)', border: '1px solid rgba(26,122,72,0.27)', borderRadius: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--green)' }}>{hot}</span>
              <span style={{  color: 'var(--green)', marginLeft: '6px' }}>hot matches (80+)</span>
            </div>
          )}
          {strong > 0 && (
            <div style={{ padding: '6px 14px', background: 'var(--blue-bg)', border: '1px solid rgba(85,119,160,0.27)', borderRadius: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--blue)' }}>{strong}</span>
              <span style={{  color: 'var(--blue)', marginLeft: '6px' }}>strong (60+)</span>
            </div>
          )}
          <div style={{ padding: '6px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{matches.length}</span>
            <span style={{  color: 'var(--text-muted)', marginLeft: '6px' }}>total</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{  color: 'var(--text-muted)' }}>Min score:</label>
          <select className="select" value={minScore} onChange={e => { setMinScore(+e.target.value); setShowAll(false); }} style={{ width: '80px' }}>
            <option value={80}>80+</option>
            <option value={60}>60+</option>
            <option value={40}>40+</option>
            <option value={20}>20+</option>
            <option value={0}>All</option>
          </select>
        </div>
      </div>

      {/* Match cards */}
      {matches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No buyer matches found above score {minScore}. Try lowering the threshold.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {matches.map(({ account: a, score, reasons }) => {
            const t = tier(score);
            return (
              <div key={a.id} className="card" style={{ padding: '14px 18px', borderLeft: `4px solid ${t.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span onClick={() => onAccountClick?.(a)} style={{  fontWeight: 700, cursor: onAccountClick ? 'pointer' : 'default', color: 'var(--text-primary)', borderBottom: onAccountClick ? '1px dashed var(--accent)' : 'none' }}>{a.name}</span>
                      <span style={{  padding: '2px 8px', borderRadius: '4px', background: t.bg, color: t.color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {score}/100 ({t.label})
                      </span>
                      {a.buyer_type && (
                        <span className="tag tag-ghost" style={{  }}>{a.buyer_type}</span>
                      )}
                      {a.acquisition_timing === 'Actively Buying Now' && (
                        <span className="tag tag-green" style={{  }}>Active</span>
                      )}
                    </div>
                    <div style={{  color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {[
                        a.city && a.hq_state ? `${a.city}, ${a.hq_state}` : a.city,
                        a.preferred_markets?.join(', '),
                        a.min_sf && a.max_sf ? `${(a.min_sf/1000).toFixed(0)}K–${(a.max_sf/1000).toFixed(0)}K SF` : null,
                        a.min_price_psf && a.max_price_psf ? `$${a.min_price_psf}–$${a.max_price_psf}/SF` : null,
                        a.est_capital_deployed,
                      ].filter(Boolean).join(' · ')}
                    </div>
                    {/* Match reasons */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {reasons.map((r, i) => (
                        <span key={i} style={{
                           padding: '2px 6px', borderRadius: '3px',
                          background: r.includes('✓') ? 'rgba(26,122,72,0.08)' : 'rgba(184,122,16,0.08)',
                          color: r.includes('✓') ? 'var(--green)' : 'var(--amber)',
                          fontFamily: 'var(--font-mono)',
                        }}>{r}</span>
                      ))}
                    </div>
                    {a.notes && (
                      <div style={{  color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                        {a.notes.length > 200 ? a.notes.slice(0, 200) + '...' : a.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0, marginLeft: '16px' }}>
                    {/* Score bar */}
                    <div style={{ width: '60px', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${score}%`, height: '100%', background: t.color, borderRadius: '3px' }} />
                    </div>
                    {a.phone && (
                      <a href={`tel:${a.phone}`} style={{  fontFamily: 'var(--font-mono)', color: 'var(--accent)', textDecoration: 'none' }}>{a.phone}</a>
                    )}
                    {a.deal_count && (
                      <span style={{  color: 'var(--text-muted)' }}>{a.deal_count} deals</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scoring methodology */}
      <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-input)', borderRadius: '8px',  color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Match Score Formula:</strong> Market (+20) · Deal Type (+20) · SF Fit (+15) · Price Fit (+15) · SLB Bonus (+10) · Clear Height (+5) · Power (+5) · Buyer Timing (+10) = 100 max.
        Tier A = 80+, B = 60+, C = 40+.
      </div>
    </div>
  );
}
