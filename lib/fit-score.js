/* ═══════════════════════════════════════════════════════════
   IDS Portfolio Fit Score Engine v2
   lib/fit-score.js

   All-cash buyer · Value-add · Entitled land · IOS
   Evaluates every property against IDS acquisition criteria.
   Properties meeting ≥2 criteria auto-surface as Acq Targets.

   IDS BUY BOX:
   • All-cash buyer, value-add + entitled land focus
   • 100K+ SF industrial OR 8+ acre entitled land/IOS
   • $20M+ deal size
   • WALT up to 3–4yr, vacant works
   • Markets: LA (Vernon/Commerce, Mid-Counties, SGV, SFV),
     OC, IE (West & East), San Diego
   • 32'+ clear (IE), 24'+ acceptable (infill)
   • Post-2000 ideal, post-1990 acceptable
   • Sub-50% coverage, truck court, below-market rent
   ═══════════════════════════════════════════════════════════ */

// ── MARKET LISTS ──────────────────────────────────────────
const IE_KEYWORDS = [
  'ontario', 'riverside', 'rancho cucamonga', 'fontana', 'rialto',
  'colton', 'san bernardino', 'redlands', 'moreno valley', 'perris',
  'jurupa', 'eastvale', 'mira loma', 'corona', 'norco',
  'chino', 'bloomington', 'ie west', 'ie east', 'ie central',
  'inland empire', 'ontario airport', 'i-10 corridor', 'i-15 corridor',
];

const LA_KEYWORDS = [
  'vernon', 'commerce', 'city of industry', 'santa fe springs',
  'la mirada', 'cerritos', 'norwalk', 'downey', 'south gate',
  'huntington park', 'pico rivera', 'whittier', 'montebello',
  'sgv', 'el monte', 'baldwin park', 'west covina', 'covina',
  'azusa', 'irwindale', 'duarte', 'monrovia', 'arcadia',
  'pomona', 'rowland', 'hacienda', 'garvey', 'pasadena',
  'sfv', 'san fernando', 'sun valley', 'burbank', 'glendale',
  'north hollywood', 'van nuys', 'chatsworth', 'sylmar', 'pacoima',
  'los angeles',
];

const OC_KEYWORDS = [
  'orange county', 'oc', 'anaheim', 'fullerton', 'irvine',
  'santa ana', 'garden grove',
];

const SD_KEYWORDS = [
  'san diego', 'carlsbad', 'oceanside', 'otay mesa', 'chula vista',
];

const ALL_MARKETS = [...IE_KEYWORDS, ...LA_KEYWORDS, ...OC_KEYWORDS, ...SD_KEYWORDS];

// ── HELPERS ───────────────────────────────────────────────
function matchesAny(text, keywords) {
  const t = (text || '').toLowerCase();
  return keywords.some(k => t.includes(k));
}

function getMarketString(p) {
  return [p.market, p.submarket, p.city].map(s => (s || '').toLowerCase()).join(' ');
}

// ── FIT SCORE CALCULATION ─────────────────────────────────
export function calculateFitScore(property) {
  if (!property) return { score: 0, grade: '—', criteria: [], strategy: null, criteriaMet: 0, isAcqTarget: false };

  const p = property;
  const criteria = [];
  let score = 0;
  let criteriaMet = 0;
  const mkt = getMarketString(p);

  // Strategy classification
  const isIE = matchesAny(mkt, IE_KEYWORDS);
  const isLA = matchesAny(mkt, LA_KEYWORDS);
  const isOC = matchesAny(mkt, OC_KEYWORDS);
  const isSD = matchesAny(mkt, SD_KEYWORDS);
  const isTargetMarket = isIE || isLA || isOC || isSD;
  const strategy = isIE ? 'IE' : isSD ? 'San Diego' : isOC ? 'Orange County' : isLA ? 'LA Infill' : null;

  const sf = p.building_sf || 0;
  const acres = p.land_acres || 0;
  const isLandPlay = acres >= 8 && (sf === 0 || (sf > 0 && (sf / (acres * 43560)) < 0.20));

  // ① Target market (15 pts)
  if (isTargetMarket) {
    score += 15;
    criteriaMet++;
    criteria.push({ label: `${strategy || 'SoCal'} target market`, pts: 15, met: true });
  } else {
    criteria.push({ label: 'Outside target markets', pts: 0, met: false });
  }

  // ② Size — 100K+ SF OR 8+ acres entitled land (15 pts)
  if (isLandPlay && acres >= 10) {
    score += 15;
    criteriaMet++;
    criteria.push({ label: `${acres.toFixed(1)} ac entitled land (ideal)`, pts: 15, met: true });
  } else if (isLandPlay && acres >= 8) {
    score += 12;
    criteriaMet++;
    criteria.push({ label: `${acres.toFixed(1)} ac entitled land`, pts: 12, met: true });
  } else if (sf >= 400000) {
    score += 15;
    criteriaMet++;
    criteria.push({ label: `${(sf / 1000).toFixed(0)}K SF (sweet spot)`, pts: 15, met: true });
  } else if (sf >= 100000) {
    score += 10;
    criteriaMet++;
    criteria.push({ label: `${(sf / 1000).toFixed(0)}K SF (target range)`, pts: 10, met: true });
  } else if (sf >= 50000) {
    criteria.push({ label: `${(sf / 1000).toFixed(0)}K SF (below target)`, pts: 4, met: false });
    score += 4;
  } else {
    criteria.push({ label: `${sf > 0 ? (sf / 1000).toFixed(0) + 'K' : '—'} SF (too small)`, pts: 0, met: false });
  }

  // ③ Clear height — 32'+ (15 pts)
  const ch = p.clear_height || 0;
  if (isLandPlay) {
    score += 8;
    criteriaMet++;
    criteria.push({ label: 'Land play — clear ht N/A', pts: 8, met: true });
  } else if (ch >= 32) {
    score += 15;
    criteriaMet++;
    criteria.push({ label: `${ch}' clear (meets 32'+ req)`, pts: 15, met: true });
  } else if (ch >= 28) {
    score += 10;
    criteriaMet++;
    criteria.push({ label: `${ch}' clear (strong)`, pts: 10, met: true });
  } else if (ch >= 24) {
    score += 6;
    criteria.push({ label: `${ch}' clear (infill OK)`, pts: 6, met: false });
  } else if (ch > 20) {
    score += 3;
    criteria.push({ label: `${ch}' clear (below target)`, pts: 3, met: false });
  } else if (ch > 0) {
    criteria.push({ label: `${ch}' clear (too low)`, pts: 0, met: false });
  } else {
    criteria.push({ label: 'Clear height unknown', pts: 0, met: false });
  }

  // ④ Vintage — post-2000 ideal (10 pts)
  const yr = p.year_built || 0;
  if (isLandPlay) {
    score += 5;
    criteria.push({ label: 'Land play — vintage N/A', pts: 5, met: false });
  } else if (yr >= 2000) {
    score += 10;
    criteriaMet++;
    criteria.push({ label: `Built ${yr} (ideal vintage)`, pts: 10, met: true });
  } else if (yr >= 1990) {
    score += 7;
    criteriaMet++;
    criteria.push({ label: `Built ${yr} (acceptable)`, pts: 7, met: true });
  } else if (yr >= 1980) {
    score += 4;
    criteria.push({ label: `Built ${yr} (1980s, case-by-case)`, pts: 4, met: false });
  } else if (yr > 0) {
    criteria.push({ label: `Built ${yr} (pre-1980)`, pts: 0, met: false });
  } else {
    criteria.push({ label: 'Year built unknown', pts: 0, met: false });
  }

  // ⑤ Lease / vacancy — short WALT or vacant (10 pts)
  const vac = (p.vacancy_status || '').toLowerCase();
  const leaseExp = p.lease_expiration ? new Date(p.lease_expiration) : null;
  const monthsToExpiry = leaseExp ? Math.round((leaseExp - new Date()) / (1e3 * 60 * 60 * 24 * 30.44)) : null;

  if (vac.includes('vacant') || vac === 'available') {
    score += 10;
    criteriaMet++;
    criteria.push({ label: 'Vacant — value-add / lease-up', pts: 10, met: true });
  } else if (vac.includes('partial')) {
    score += 8;
    criteriaMet++;
    criteria.push({ label: 'Partial vacancy — upside', pts: 8, met: true });
  } else if (monthsToExpiry != null && monthsToExpiry <= 48) {
    score += 10;
    criteriaMet++;
    criteria.push({ label: `Leased, ${monthsToExpiry}mo remaining (sub-4yr)`, pts: 10, met: true });
  } else if (monthsToExpiry != null && monthsToExpiry <= 60) {
    score += 5;
    criteria.push({ label: `Leased, ${monthsToExpiry}mo (longer WALT)`, pts: 5, met: false });
  } else if (vac.includes('occupied')) {
    score += 2;
    criteria.push({ label: 'Leased (long-term)', pts: 2, met: false });
  } else {
    criteria.push({ label: 'Lease status unknown', pts: 0, met: false });
  }

  // ⑥ Deal size — $20M+ (10 pts)
  let estValue = p.last_sale_price || 0;
  if (!estValue && p.building_sf && p.price_psf) {
    estValue = p.building_sf * p.price_psf;
  }
  // Rough fallback if no price data
  if (!estValue && sf >= 100000) {
    estValue = sf * (isIE ? 200 : 350);
  }

  if (estValue >= 20000000) {
    score += 10;
    criteriaMet++;
    criteria.push({ label: `~$${(estValue / 1e6).toFixed(0)}M est. value (meets $20M+)`, pts: 10, met: true });
  } else if (estValue >= 10000000) {
    score += 5;
    criteria.push({ label: `~$${(estValue / 1e6).toFixed(0)}M est. value (below $20M)`, pts: 5, met: false });
  } else if (estValue > 0) {
    criteria.push({ label: `~$${(estValue / 1e6).toFixed(1)}M est. value (too small)`, pts: 0, met: false });
  } else {
    criteria.push({ label: 'Value unknown', pts: 0, met: false });
  }

  // ⑦ Truck court (5 pts)
  const tc = p.truck_court_depth || 0;
  if (tc >= 120) {
    score += 5;
    criteriaMet++;
    criteria.push({ label: `${tc}' truck court (excellent)`, pts: 5, met: true });
  } else if (tc >= 60) {
    score += 3;
    criteria.push({ label: `${tc}' truck court (adequate)`, pts: 3, met: false });
  } else if (tc > 0) {
    criteria.push({ label: `${tc}' truck court (tight)`, pts: 0, met: false });
  } else {
    criteria.push({ label: 'Truck court unknown', pts: 0, met: false });
  }

  // ⑧ Coverage ≤ 50% (5 pts)
  const coverage = (sf && acres > 0) ? (sf / (acres * 43560)) * 100 : null;
  if (coverage != null && coverage <= 50) {
    score += 5;
    criteriaMet++;
    criteria.push({ label: `${coverage.toFixed(1)}% coverage (sub-50%)`, pts: 5, met: true });
  } else if (coverage != null) {
    criteria.push({ label: `${coverage.toFixed(1)}% coverage`, pts: 0, met: false });
  } else {
    criteria.push({ label: 'Coverage unknown', pts: 0, met: false });
  }

  // ⑨ Below market rent / value-add upside (5 pts)
  if (p.in_place_rent && p.market_rent && p.market_rent > 0) {
    const spread = ((p.market_rent - p.in_place_rent) / p.market_rent) * 100;
    if (spread >= 15) {
      score += 5;
      criteriaMet++;
      criteria.push({ label: `${spread.toFixed(0)}% below market — value-add`, pts: 5, met: true });
    } else {
      criteria.push({ label: 'At/above market rent', pts: 0, met: false });
    }
  } else if (vac.includes('vacant') || vac === 'available') {
    // Vacant = full mark-to-market on lease-up
    score += 5;
    criteriaMet++;
    criteria.push({ label: 'Vacant — full MTM on lease-up', pts: 5, met: true });
  } else {
    criteria.push({ label: 'Rent data unavailable', pts: 0, met: false });
  }

  // Grade
  let grade;
  if (score >= 80) grade = 'A+';
  else if (score >= 65) grade = 'A';
  else if (score >= 50) grade = 'B+';
  else if (score >= 35) grade = 'B';
  else if (score >= 20) grade = 'C';
  else grade = 'D';

  const isAcqTarget = criteriaMet >= 2;

  return {
    score,
    grade,
    criteria,
    criteriaMet,
    totalCriteria: criteria.length,
    isAcqTarget,
    strategy,
    isLandPlay,
  };
}

// ── CONSTANTS ─────────────────────────────────────────────
export const FIT_THRESHOLD = 2;
export const FIT_SCORE_MAX = 100;
