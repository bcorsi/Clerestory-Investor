// CATALYST FIELD GUIDE v4 — Complete taxonomy
// Categories: Owner Signal (rust), Occupier Signal (amber), Asset Signal (blue), Market Signal (purple)

export const CATALYST_TAGS = [
  // ── OWNER SIGNALS (rust) ─────────────────────────────────
  { tag: 'SLB Potential',               category: 'owner',    priority: 'HIGH', boost: 25 },
  { tag: 'Distress / Special Servicer', category: 'owner',    priority: 'HIGH', boost: 30 },
  { tag: 'Tax Delinquency',             category: 'owner',    priority: 'HIGH', boost: 30 },
  { tag: 'NOD Filed',                   category: 'owner',    priority: 'HIGH', boost: 25 },
  { tag: 'Probate / Estate Sale',       category: 'owner',    priority: 'HIGH', boost: 22 },
  { tag: 'Absentee Owner',              category: 'owner',    priority: 'MED',  boost: 12 },
  { tag: 'Long Hold Period (15+ yrs)',  category: 'owner',    priority: 'MED',  boost: 10 },
  { tag: 'Short Hold Period (< 3 yrs)', category: 'owner',    priority: 'LOW',  boost: 5  },
  { tag: 'UCC / Lien Activity',         category: 'owner',    priority: 'MED',  boost: 15 },
  { tag: 'SBA Loan Maturity',           category: 'owner',    priority: 'MED',  boost: 12 },
  { tag: 'Owner-User',                  category: 'owner',    priority: 'MED',  boost: 8  },

  // ── OCCUPIER SIGNALS (amber) ──────────────────────────────
  { tag: 'WARN Notice',                 category: 'occupier', priority: 'HIGH', boost: 20 },
  { tag: 'WARN Act Filing',             category: 'occupier', priority: 'HIGH', boost: 20 },
  { tag: 'M&A — Acquisition',           category: 'occupier', priority: 'HIGH', boost: 20 },
  { tag: 'M&A — Consolidation',         category: 'occupier', priority: 'HIGH', boost: 18 },
  { tag: 'Corporate Restructuring',     category: 'occupier', priority: 'HIGH', boost: 18 },
  { tag: 'Relocation Risk',             category: 'occupier', priority: 'MED',  boost: 12 },
  { tag: 'Expansion Potential',         category: 'occupier', priority: 'MED',  boost: 8  },
  { tag: 'Hiring Signal — Real Estate', category: 'occupier', priority: 'MED',  boost: 10 },

  // ── ASSET SIGNALS (blue) ──────────────────────────────────
  { tag: 'Lease Exp < 12 Mo',           category: 'asset',    priority: 'HIGH', boost: 30 },
  { tag: 'Expiring Lease < 12 Mo',      category: 'asset',    priority: 'HIGH', boost: 30 },
  { tag: 'Lease Exp 12–24 Mo',          category: 'asset',    priority: 'MED',  boost: 15 },
  { tag: 'Vacancy',                     category: 'asset',    priority: 'MED',  boost: 20 },
  { tag: 'Functionally Challenged',     category: 'asset',    priority: 'MED',  boost: 10 },
  { tag: 'Major CapEx Permit',          category: 'asset',    priority: 'MED',  boost: 10 },
  { tag: 'Under-Market Rent',           category: 'asset',    priority: 'MED',  boost: 8  },

  // ── MARKET SIGNALS (purple) ───────────────────────────────
  { tag: 'Zoning Change',               category: 'market',   priority: 'MED',  boost: 8  },
  { tag: 'Opportunity Zone',            category: 'market',   priority: 'MED',  boost: 5  },
  { tag: 'Market Pressure',             category: 'market',   priority: 'LOW',  boost: 8  },
  { tag: 'Infrastructure Project',      category: 'market',   priority: 'MED',  boost: 8  },
  { tag: 'Environmental Risk',          category: 'market',   priority: 'LOW',  boost: 5  },
  { tag: 'New Construction Nearby',     category: 'market',   priority: 'LOW',  boost: 3  },
  { tag: 'BESS / Energy Storage',       category: 'market',   priority: 'HIGH', boost: 15 },
];

// ── CATALYST COLORS (by category) ────────────────────────
export const CATALYST_CATEGORY_COLORS = {
  owner:   { bg: 'rgba(184,55,20,0.08)',  bdr: 'rgba(184,55,20,0.28)',  color: '#B83714' },
  occupier:{ bg: 'rgba(140,90,4,0.08)',   bdr: 'rgba(140,90,4,0.28)',   color: '#8C5A04' },
  asset:   { bg: 'rgba(78,110,150,0.08)', bdr: 'rgba(78,110,150,0.28)', color: '#4E6E96' },
  market:  { bg: 'rgba(88,56,160,0.08)',  bdr: 'rgba(88,56,160,0.28)',  color: '#5838A0' },
};

export function getCatalystStyle(tagInput) {
  const tagName = (tagInput?.tag || tagInput || '').trim();

  // Exact match
  const exact = CATALYST_TAGS.find(t => t.tag.toLowerCase() === tagName.toLowerCase());
  if (exact) return { ...CATALYST_CATEGORY_COLORS[exact.category], tag: exact.tag, priority: exact.priority, boost: exact.boost, category: exact.category };

  // Fuzzy fallback
  const t = tagName.toLowerCase();
  if (t.includes('slb') || t.includes('sale-lease') || t.includes('sale leaseback')) return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('warn'))                                   return { ...CATALYST_CATEGORY_COLORS.occupier, tag: tagName };
  if (t.includes('distress') || t.includes('special serv')) return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('tax') && t.includes('delinq'))            return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('nod') || t.includes('notice of default')) return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('probate') || t.includes('estate'))        return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('absentee'))                               return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('long hold') || t.includes('hold period')) return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('short hold'))                             return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('ucc') || t.includes('lien'))              return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('sba') || t.includes('loan maturity'))     return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('owner-user') || t.includes('owner user')) return { ...CATALYST_CATEGORY_COLORS.owner, tag: tagName };
  if (t.includes('m&a') || t.includes('acquisition') || t.includes('consolidation')) return { ...CATALYST_CATEGORY_COLORS.occupier, tag: tagName };
  if (t.includes('restructur'))                             return { ...CATALYST_CATEGORY_COLORS.occupier, tag: tagName };
  if (t.includes('relocation'))                             return { ...CATALYST_CATEGORY_COLORS.occupier, tag: tagName };
  if (t.includes('expansion'))                              return { ...CATALYST_CATEGORY_COLORS.occupier, tag: tagName };
  if (t.includes('hiring'))                                 return { ...CATALYST_CATEGORY_COLORS.occupier, tag: tagName };
  if (t.includes('lease exp') || t.includes('expir'))      return { ...CATALYST_CATEGORY_COLORS.asset, tag: tagName };
  if (t.includes('vacanc'))                                 return { ...CATALYST_CATEGORY_COLORS.asset, tag: tagName };
  if (t.includes('functional') || t.includes('challenged')) return { ...CATALYST_CATEGORY_COLORS.asset, tag: tagName };
  if (t.includes('capex') || t.includes('permit'))         return { ...CATALYST_CATEGORY_COLORS.asset, tag: tagName };
  if (t.includes('under-market') || t.includes('below market')) return { ...CATALYST_CATEGORY_COLORS.asset, tag: tagName };
  if (t.includes('zoning'))                                 return { ...CATALYST_CATEGORY_COLORS.market, tag: tagName };
  if (t.includes('opportunity zone'))                       return { ...CATALYST_CATEGORY_COLORS.market, tag: tagName };
  if (t.includes('market pressure'))                        return { ...CATALYST_CATEGORY_COLORS.market, tag: tagName };
  if (t.includes('infrastructure') || t.includes('bess') || t.includes('energy')) return { ...CATALYST_CATEGORY_COLORS.market, tag: tagName };
  if (t.includes('environmental'))                          return { ...CATALYST_CATEGORY_COLORS.market, tag: tagName };
  if (t.includes('new construction'))                       return { ...CATALYST_CATEGORY_COLORS.market, tag: tagName };

  return { ...CATALYST_CATEGORY_COLORS.asset, tag: tagName };
}

// ── SCORE RING COLORS ─────────────────────────────────────
// Distinct from catalyst, stage, and priority colors
export function getScoreRing(score) {
  if (score >= 90) return { color: '#C0392B', grade: 'A+' }; // bright rust
  if (score >= 80) return { color: '#E07B54', grade: 'A'  }; // terracotta
  if (score >= 70) return { color: '#4E6E96', grade: 'B+' }; // blue
  if (score >= 60) return { color: '#7A9DBF', grade: 'B'  }; // steel blue
  if (score >= 50) return { color: '#8C5A04', grade: 'C+' }; // amber
  return             { color: '#78726A', grade: 'C'  };       // gray
}

// ── STAGE BADGE COLORS ────────────────────────────────────
// Distinct from catalyst (rust/amber/blue/purple) and score rings
export const STAGE_COLORS = {
  'New':                       { background: 'rgba(120,114,106,0.10)', color: '#78726A', border: '1px solid rgba(120,114,106,0.22)' },
  'Researching':               { background: 'rgba(88,56,160,0.09)',   color: '#5838A0', border: '1px solid rgba(88,56,160,0.22)'   },
  'Decision Maker Identified': { background: 'rgba(14,124,123,0.09)',  color: '#0A7C7B', border: '1px solid rgba(14,124,123,0.22)'  },
  'Contacted':                 { background: 'rgba(212,98,42,0.10)',   color: '#C45A1A', border: '1px solid rgba(212,98,42,0.25)'   },
  'Converted':                 { background: 'rgba(24,112,66,0.09)',   color: '#187042', border: '1px solid rgba(24,112,66,0.22)'   },
};

// ── PRIORITY BADGE COLORS ─────────────────────────────────
// Distinct from catalyst, stage, and score ring colors
export const PRIORITY_COLORS = {
  'Critical': { background: 'rgba(139,47,201,0.10)', color: '#8B2FC9', border: '1px solid rgba(139,47,201,0.25)' },
  'High':     { background: 'rgba(212,98,42,0.10)',  color: '#D4622A', border: '1px solid rgba(212,98,42,0.25)'  },
  'Medium':   { background: 'rgba(74,101,128,0.10)', color: '#4A6580', border: '1px solid rgba(74,101,128,0.22)' },
  'Low':      { background: 'rgba(122,154,126,0.10)',color: '#5A8A5E', border: '1px solid rgba(122,154,126,0.22)'},
};

export function fmt(val, type = 'number') {
  if (val == null || val === '') return '—';
  if (type === 'sf')       return Number(val).toLocaleString() + ' SF';
  if (type === 'acres')    return Number(val).toFixed(2) + ' AC';
  if (type === 'currency') return '$' + Number(val).toLocaleString();
  if (type === 'date')     return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return Number(val).toLocaleString();
}
