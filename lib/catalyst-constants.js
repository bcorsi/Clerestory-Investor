// ══════════════════════════════════════════════════════════════════
// CLERESTORY — lib/catalyst-constants.js
// Complete tag taxonomy + score color architecture
// v7 · April 2026
//
// THREE SYSTEMS:
// 1. Score Palettes — Fit (green), Building (blue), ORS (warm)
// 2. Property Tags — 30 building characteristic tags, 6 subcategories
// 3. Catalyst Tags — 51 signal tags, 5 categories
// ══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════
// SCORE COLOR PALETTES — 3 scores × 5 grades = 15 colors
// Zero overlap between score types at any grade level
// ═══════════════════════════════════════════════════════════

export const SCORE_COLORS = {
  fit: {
    label: 'Portfolio Fit',
    grades: {
      'A+': { color: '#0E7C6B', bg: 'rgba(14,124,107,0.08)',  bdr: 'rgba(14,124,107,0.30)' },
      'A':  { color: '#1A9480', bg: 'rgba(26,148,128,0.08)',  bdr: 'rgba(26,148,128,0.30)' },
      'B+': { color: '#3AA898', bg: 'rgba(58,168,152,0.08)',  bdr: 'rgba(58,168,152,0.30)' },
      'B':  { color: '#6BB5A5', bg: 'rgba(107,181,165,0.08)', bdr: 'rgba(107,181,165,0.30)' },
      'C':  { color: '#8AADA0', bg: 'rgba(138,173,160,0.08)', bdr: 'rgba(138,173,160,0.30)' },
    },
  },
  building: {
    label: 'Building Score',
    grades: {
      'A+': { color: '#3730A3', bg: 'rgba(55,48,163,0.08)',   bdr: 'rgba(55,48,163,0.30)' },
      'A':  { color: '#4F46B5', bg: 'rgba(79,70,181,0.08)',   bdr: 'rgba(79,70,181,0.30)' },
      'B+': { color: '#6B64C4', bg: 'rgba(107,100,196,0.08)', bdr: 'rgba(107,100,196,0.30)' },
      'B':  { color: '#8B85CC', bg: 'rgba(139,133,204,0.08)', bdr: 'rgba(139,133,204,0.30)' },
      'C':  { color: '#A8A3D5', bg: 'rgba(168,163,213,0.08)', bdr: 'rgba(168,163,213,0.30)' },
    },
  },
  ors: {
    label: 'Seller Readiness',
    tiers: {
      'ACT NOW':  { min: 75, color: '#C41E1E', bg: 'rgba(196,30,30,0.08)',    bdr: 'rgba(196,30,30,0.30)' },
      'WARM':     { min: 50, color: '#D4652A', bg: 'rgba(212,101,42,0.08)',   bdr: 'rgba(212,101,42,0.30)' },
      'WATCH':    { min: 25, color: '#C99115', bg: 'rgba(201,145,21,0.08)',   bdr: 'rgba(201,145,21,0.30)' },
      'MONITOR':  { min: 0,  color: '#A89868', bg: 'rgba(168,152,104,0.08)',  bdr: 'rgba(168,152,104,0.30)' },
    },
  },
};

// Helper functions
export function getGrade(score) {
  if (score == null) return '—';
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B+';
  if (score >= 40) return 'B';
  return 'C';
}

export function getFitColors(score) {
  const g = getGrade(score);
  return SCORE_COLORS.fit.grades[g] || SCORE_COLORS.fit.grades['C'];
}

export function getBuildingColors(score) {
  const g = getGrade(score);
  return SCORE_COLORS.building.grades[g] || SCORE_COLORS.building.grades['C'];
}

export function getOrsColors(score) {
  if (score == null) return { ...SCORE_COLORS.ors.tiers['MONITOR'], label: '—' };
  if (score >= 75) return { ...SCORE_COLORS.ors.tiers['ACT NOW'], label: 'ACT NOW' };
  if (score >= 50) return { ...SCORE_COLORS.ors.tiers['WARM'], label: 'WARM' };
  if (score >= 25) return { ...SCORE_COLORS.ors.tiers['WATCH'], label: 'WATCH' };
  return { ...SCORE_COLORS.ors.tiers['MONITOR'], label: 'MONITOR' };
}

export function getOrsLabel(score) {
  if (score == null) return '—';
  if (score >= 75) return 'ACT NOW';
  if (score >= 50) return 'WARM';
  if (score >= 25) return 'WATCH';
  return 'MONITOR';
}


// ═══════════════════════════════════════════════════════════
// PROPERTY TAGS — building characteristics
// 30 tags across 6 subcategories
// Cool muted tones — clearly distinct from catalyst signals
// ═══════════════════════════════════════════════════════════

export const PROPERTY_TAG_CATEGORIES = {
  structure:  { color: '#6B5B95', bg: 'rgba(107,91,149,0.08)',  bdr: 'rgba(107,91,149,0.28)', label: 'Structure & Loading' },
  coverage:   { color: '#2A7B6F', bg: 'rgba(42,123,111,0.08)',  bdr: 'rgba(42,123,111,0.28)', label: 'Coverage & Land' },
  vintage:    { color: '#8B6B4A', bg: 'rgba(139,107,74,0.08)',  bdr: 'rgba(139,107,74,0.28)', label: 'Vintage & Age' },
  systems:    { color: '#5A6B8A', bg: 'rgba(90,107,138,0.08)',  bdr: 'rgba(90,107,138,0.28)', label: 'Systems & Utilities' },
  config:     { color: '#7A5B7A', bg: 'rgba(122,91,122,0.08)',  bdr: 'rgba(122,91,122,0.28)', label: 'Configuration' },
  deficiency: { color: '#9E6B6B', bg: 'rgba(158,107,107,0.08)', bdr: 'rgba(158,107,107,0.28)', label: 'Deficiency Flags' },
};

export const PROPERTY_TAGS = [
  // Structure & Loading
  { tag: 'High Clear',          category: 'structure',  autoRule: 'clear_height >= 32' },
  { tag: 'Low Clear Height',    category: 'structure',  autoRule: 'clear_height < 24' },
  { tag: 'High DH Ratio',       category: 'structure',  autoRule: 'dh_ratio >= 1.0' },
  { tag: 'Low DH Ratio',        category: 'structure',  autoRule: 'dh_ratio < 0.6' },
  { tag: 'Grade-Level Only',    category: 'structure',  autoRule: 'dock_doors = 0 AND grade_doors > 0' },
  { tag: 'Deep Truck Court',    category: 'structure',  autoRule: 'truck_court_depth >= 130' },
  { tag: 'Small Truck Court',   category: 'structure',  autoRule: 'truck_court_depth < 100' },
  { tag: 'Large Footprint',     category: 'structure',  autoRule: 'building_sf > 200000' },
  { tag: 'Small Bay',           category: 'structure',  autoRule: 'building_sf < 25000' },

  // Coverage & Land
  { tag: 'High Coverage',       category: 'coverage',   autoRule: 'coverage > 55' },
  { tag: 'Covered Land Play',   category: 'coverage',   autoRule: 'coverage < 35' },
  { tag: 'Excess Land',         category: 'coverage',   autoRule: 'land_to_building > 2.5' },
  { tag: 'Corner Lot',          category: 'coverage',   autoRule: 'manual' },
  { tag: 'Multi-Parcel',        category: 'coverage',   autoRule: 'apn_count > 1' },
  { tag: 'Multi-Building',      category: 'coverage',   autoRule: 'building_count > 1' },

  // Vintage & Age
  { tag: 'Vintage Pre-1985',    category: 'vintage',    autoRule: 'year_built < 1985' },
  { tag: 'Vintage Pre-2000',    category: 'vintage',    autoRule: 'year_built < 2000' },
  { tag: 'Modern Build',        category: 'vintage',    autoRule: 'age <= 10' },
  { tag: 'New Construction',    category: 'vintage',    autoRule: 'age <= 2 OR building_status = Under Construction' },

  // Systems & Utilities
  { tag: 'Heavy Power',         category: 'systems',    autoRule: 'power_amps >= 2000' },
  { tag: 'Light Power',         category: 'systems',    autoRule: 'power_amps < 600' },
  { tag: 'ESFR Sprinklers',     category: 'systems',    autoRule: 'sprinklers contains ESFR' },
  { tag: 'No Sprinklers',       category: 'systems',    autoRule: 'sprinklers is null' },
  { tag: 'Rail Served',         category: 'systems',    autoRule: 'rail_served = true' },
  { tag: 'Cold Storage',        category: 'systems',    autoRule: 'manual' },
  { tag: 'Food Grade',          category: 'systems',    autoRule: 'manual' },

  // Configuration
  { tag: 'High Office',         category: 'config',     autoRule: 'office_pct > 25' },
  { tag: 'Flex / R&D',          category: 'config',     autoRule: 'prop_type contains Flex or R&D' },
  { tag: 'Yard / Open Storage', category: 'config',     autoRule: 'manual' },
  { tag: 'Fenced / Secured',    category: 'config',     autoRule: 'manual' },

  // Deficiency Flags
  { tag: 'Functional Obsolescence', category: 'deficiency', autoRule: 'building_score < 40' },
  { tag: 'Environmental Flag',      category: 'deficiency', autoRule: 'manual' },
  { tag: 'Deferred Maintenance',    category: 'deficiency', autoRule: 'manual' },
  { tag: 'Flood Zone',              category: 'deficiency', autoRule: 'manual' },
  { tag: 'Roof Replacement Needed', category: 'deficiency', autoRule: 'manual' },
];


// ═══════════════════════════════════════════════════════════
// CATALYST TAGS — transaction signals
// 51 tags across 5 categories
// Warm saturated tones — clearly distinct from property tags
// ═══════════════════════════════════════════════════════════

export const CATALYST_CATEGORIES = {
  owner:    { color: '#B83714', bg: 'rgba(184,55,20,0.08)',  bdr: 'rgba(184,55,20,0.28)',  label: 'Owner Signal' },
  occupier: { color: '#C67A1A', bg: 'rgba(198,122,26,0.08)', bdr: 'rgba(198,122,26,0.28)', label: 'Occupier Signal' },
  asset:    { color: '#7B4EA0', bg: 'rgba(123,78,160,0.08)', bdr: 'rgba(123,78,160,0.28)', label: 'Asset Signal' },
  market:   { color: '#1A6B8A', bg: 'rgba(26,107,138,0.08)', bdr: 'rgba(26,107,138,0.28)', label: 'Market Signal' },
  location: { color: '#2E7D32', bg: 'rgba(46,125,50,0.08)',  bdr: 'rgba(46,125,50,0.28)',  label: 'Location Signal' },
};

export const CATALYST_TAGS = [
  // ── Owner Signals (#B83714 crimson) ────────────────────
  { tag: 'SLB Potential',             category: 'owner', boost: 25, priority: 'HIGH',  desc: 'Owner-user who could monetize and stay as tenant' },
  { tag: 'Distress / Special Servicer', category: 'owner', boost: 30, priority: 'CRIT', desc: 'Lender involvement — forced disposition likely' },
  { tag: 'Owner-User',                category: 'owner', boost: 15, priority: 'HIGH',  desc: 'Owner occupies building — personal financial triggers' },
  { tag: 'Long Hold (7+ yr)',         category: 'owner', boost: 12, priority: 'MED',   desc: 'Approaching prime sell window — equity gap building' },
  { tag: 'Legacy Hold (20+ yr)',      category: 'owner', boost: 25, priority: 'HIGH',  desc: '20+ year ownership — maximum equity gap' },
  { tag: 'Pre-2010 Basis',            category: 'owner', boost: 20, priority: 'HIGH',  desc: '3–5× appreciation since acquisition' },
  { tag: 'Pre-2015 Basis',            category: 'owner', boost: 15, priority: 'HIGH',  desc: '2–3× appreciation since acquisition' },
  { tag: 'Pre-COVID Basis',           category: 'owner', boost: 10, priority: 'MED',   desc: '1.5–2× appreciation (2016–2020)' },
  { tag: 'Absentee Owner',            category: 'owner', boost: 18, priority: 'HIGH',  desc: 'Owner address differs — less emotional attachment' },
  { tag: 'Family Trust',              category: 'owner', boost: 20, priority: 'HIGH',  desc: 'Trust signals estate/succession planning' },
  { tag: 'Individual Owner',          category: 'owner', boost: 15, priority: 'MED',   desc: 'Single individual — personal triggers' },
  { tag: 'Succession Signal',         category: 'owner', boost: 22, priority: 'HIGH',  desc: 'Owner 55+ or business transition underway' },
  { tag: 'No Refi 5+ Years',          category: 'owner', boost: 12, priority: 'MED',   desc: 'No refinance — cleaner disposition path' },
  { tag: 'M&A / Restructuring',       category: 'owner', boost: 28, priority: 'CRIT',  desc: 'Corporate restructuring — RE rationalization' },
  { tag: 'Repeat Seller',             category: 'owner', boost: 15, priority: 'MED',   desc: 'Has sold industrial before — low friction' },
  { tag: 'Private Capital',           category: 'owner', boost: 10, priority: 'MED',   desc: 'Non-institutional — decision-maker accessible' },
  { tag: 'Out-of-State Owner',        category: 'owner', boost: 10, priority: 'MED',   desc: 'Geographic distance reduces attachment' },
  { tag: 'Prior Listing — Expired',   category: 'owner', boost: 14, priority: 'HIGH',  desc: 'Already decided to sell once — highest conviction' },
  { tag: 'Institutional Owner',       category: 'owner', boost: 0,  priority: 'MED',   desc: 'Applies institutional deduction multiplier' },
  { tag: 'Short Hold (<3yr)',         category: 'owner', boost: 8,  priority: 'MED',   desc: 'Recent acquisition — may be repositioning' },
  { tag: 'NOD Filed',                 category: 'owner', boost: 25, priority: 'CRIT',  desc: 'Notice of Default — foreclosure timeline' },
  { tag: 'Bankruptcy Filing',         category: 'owner', boost: 25, priority: 'CRIT',  desc: 'Owner bankruptcy — court-ordered disposition' },

  // ── Occupier Signals (#C67A1A burnt gold) ──────────────
  { tag: 'WARN Filing',               category: 'occupier', boost: 30, priority: 'CRIT', desc: 'Layoff/closure — space vacant in 60–90 days' },
  { tag: 'Tenant Bankruptcy',         category: 'occupier', boost: 25, priority: 'CRIT', desc: 'Tenant in bankruptcy — lease rejection likely' },
  { tag: 'Tenant Downsizing',         category: 'occupier', boost: 12, priority: 'MED',  desc: 'Tenant reducing headcount or operations' },
  { tag: 'Headcount Shrinking',       category: 'occupier', boost: 8,  priority: 'MED',  desc: 'Employee count declining — contraction signal' },
  { tag: 'Tenant Renewal Risk',       category: 'occupier', boost: 15, priority: 'HIGH', desc: 'Signals tenant may not renew' },
  { tag: 'Hiring Signal',             category: 'occupier', boost: 8,  priority: 'LOW',  desc: 'Tenant growing — positive but owner may not capture' },
  { tag: 'Expansion Potential',        category: 'occupier', boost: 8, priority: 'MED',  desc: 'Tenant needs more space' },
  { tag: 'Partial Vacancy',           category: 'occupier', boost: 12, priority: 'MED',  desc: 'Building partially occupied — revenue gap' },
  { tag: 'Contraction Risk',          category: 'occupier', boost: 12, priority: 'MED',  desc: 'Tenant industry downturn — space reduction likely' },

  // ── Asset Signals (#7B4EA0 violet) ─────────────────────
  { tag: 'Lease Exp < 12 Mo',         category: 'asset', boost: 20, priority: 'HIGH',  desc: 'Imminent expiry — owner must decide' },
  { tag: 'Lease Exp 12–24 Mo',        category: 'asset', boost: 12, priority: 'MED',   desc: 'Decision window opening' },
  { tag: 'Below Market Rent',         category: 'asset', boost: 10, priority: 'MED',   desc: 'Rent >15% below market — value-add opp' },
  { tag: 'Over-Market Rent',          category: 'asset', boost: -5, priority: 'LOW',   desc: 'Above-market — reduces seller urgency' },
  { tag: 'Lease-Up Opportunity',      category: 'asset', boost: 15, priority: 'HIGH',  desc: 'Vacant in strong demand submarket' },
  { tag: 'Vacant',                    category: 'asset', boost: 18, priority: 'HIGH',  desc: 'No tenant — owner carrying with no income' },
  { tag: 'Covered Land / Redev',      category: 'asset', boost: 15, priority: 'HIGH',  desc: 'Low coverage — highest-and-best-use analysis' },
  { tag: 'Capex Permit Pulled',       category: 'asset', boost: 12, priority: 'MED',   desc: 'Reinvestment or pre-sale improvement' },
  { tag: 'BESS / Energy Storage',     category: 'asset', boost: 20, priority: 'HIGH',  desc: 'Battery storage site — land premium' },
  { tag: 'Infrastructure Proximity',  category: 'asset', boost: 14, priority: 'MED',   desc: 'Near substation, port, rail, highway' },
  { tag: 'Debt Maturity',             category: 'asset', boost: 15, priority: 'HIGH',  desc: 'Loan coming due — refi or sell pressure' },
  { tag: 'Tax Pressure',              category: 'asset', boost: 8,  priority: 'MED',   desc: 'Property tax burden or reassessment' },

  // ── Market Signals (#1A6B8A deep teal) ─────────────────
  { tag: 'Sub-5% Vacancy',            category: 'market', boost: 16, priority: 'HIGH', desc: "Seller's market — optimal exit pricing" },
  { tag: 'Rising Rents',              category: 'market', boost: 10, priority: 'MED',  desc: 'Submarket rents trending up' },
  { tag: 'Market Rent Growth',        category: 'market', boost: 12, priority: 'MED',  desc: 'Significant rent growth — dislocation widening' },
  { tag: 'Market Rent Dislocation',   category: 'market', boost: 15, priority: 'HIGH', desc: 'Submarket-wide gap — value-add opportunity' },
  { tag: 'Institutional Buyer Interest', category: 'market', boost: 12, priority: 'MED', desc: 'REIT/fund activity — comp-setting buyers' },
  { tag: 'Competing Listing',         category: 'market', boost: 10, priority: 'MED',  desc: 'Similar property listed nearby' },
  { tag: 'Zoning Change',             category: 'market', boost: 12, priority: 'MED',  desc: 'Entitlement change — new use unlocked' },
  { tag: 'Infrastructure Project',    category: 'market', boost: 8,  priority: 'MED',  desc: 'Highway/rail/port project creating demand' },
  { tag: 'Opportunity Zone',          category: 'market', boost: 5,  priority: 'LOW',  desc: 'Tax-advantaged buyer match' },

  // ── Location Signals (#2E7D32 forest green) ────────────
  { tag: 'SLB Corridor',              category: 'location', boost: 18, priority: 'HIGH', desc: 'Submarket with high SLB activity — auto-applied' },
  { tag: 'Succession Market',         category: 'location', boost: 16, priority: 'HIGH', desc: 'Aging ownership base — auto-applied' },
  { tag: 'Owner Proximity',           category: 'location', boost: 18, priority: 'HIGH', desc: 'Owner <10mi from property' },
];


// ═══════════════════════════════════════════════════════════
// STYLE LOOKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════

export function getPropertyTagStyle(tagName) {
  const tag = PROPERTY_TAGS.find(t => t.tag === tagName);
  const cat = tag?.category || 'structure';
  return PROPERTY_TAG_CATEGORIES[cat] || PROPERTY_TAG_CATEGORIES.structure;
}

export function getCatalystStyle(tagName) {
  const tag = CATALYST_TAGS.find(t => t.tag === tagName);
  const cat = tag?.category || 'asset';
  return CATALYST_CATEGORIES[cat] || CATALYST_CATEGORIES.asset;
}

// Determine if a tag is a property tag or catalyst tag
export function isPropertyTag(tagName) {
  return PROPERTY_TAGS.some(t => t.tag === tagName);
}

export function isCatalystTag(tagName) {
  return CATALYST_TAGS.some(t => t.tag === tagName);
}

// Get style for any tag (auto-detects type)
export function getTagStyle(tagName) {
  if (isPropertyTag(tagName)) return getPropertyTagStyle(tagName);
  if (isCatalystTag(tagName)) return getCatalystStyle(tagName);
  // Fallback — try to guess from name
  const t = (tagName || '').toLowerCase();
  if (t.includes('high clear') || t.includes('low clear') || t.includes('dh ratio') || t.includes('truck court') || t.includes('footprint') || t.includes('bay')) return PROPERTY_TAG_CATEGORIES.structure;
  if (t.includes('coverage') || t.includes('land') || t.includes('parcel') || t.includes('building') || t.includes('corner')) return PROPERTY_TAG_CATEGORIES.coverage;
  if (t.includes('vintage') || t.includes('modern') || t.includes('construction')) return PROPERTY_TAG_CATEGORIES.vintage;
  if (t.includes('power') || t.includes('sprinkler') || t.includes('rail') || t.includes('cold') || t.includes('food')) return PROPERTY_TAG_CATEGORIES.systems;
  if (t.includes('office') || t.includes('flex') || t.includes('yard') || t.includes('fenced')) return PROPERTY_TAG_CATEGORIES.config;
  if (t.includes('obsolescence') || t.includes('environmental') || t.includes('maintenance') || t.includes('flood') || t.includes('roof')) return PROPERTY_TAG_CATEGORIES.deficiency;
  // Default to asset catalyst
  return CATALYST_CATEGORIES.asset;
}

// Get all tag names for dropdowns
export function getAllPropertyTagNames() {
  return PROPERTY_TAGS.map(t => t.tag);
}

export function getAllCatalystTagNames() {
  return CATALYST_TAGS.map(t => t.tag);
}

export function getAllTagNames() {
  return [...getAllPropertyTagNames(), ...getAllCatalystTagNames()];
}

// Get tags grouped by category for filter panels
export function getPropertyTagsByCategory() {
  const grouped = {};
  PROPERTY_TAGS.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = { ...PROPERTY_TAG_CATEGORIES[t.category], tags: [] };
    grouped[t.category].tags.push(t.tag);
  });
  return grouped;
}

export function getCatalystTagsByCategory() {
  const grouped = {};
  CATALYST_TAGS.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = { ...CATALYST_CATEGORIES[t.category], tags: [] };
    grouped[t.category].tags.push(t.tag);
  });
  return grouped;
}


// ═══════════════════════════════════════════════════════════
// LEGACY EXPORTS — required by leads/page.jsx, warn-intel
// Kept for backwards compatibility
// ═══════════════════════════════════════════════════════════

// Lead pipeline stage colors (4-stage lead pipeline)
export const STAGE_COLORS = {
  'New':                       { bg: 'rgba(148,163,175,0.10)', bdr: 'rgba(148,163,175,0.30)', color: '#94A3AF' },
  'Lead':                      { bg: 'rgba(148,163,175,0.10)', bdr: 'rgba(148,163,175,0.30)', color: '#94A3AF' },
  'Decision Maker Identified': { bg: 'rgba(107,100,196,0.10)', bdr: 'rgba(107,100,196,0.30)', color: '#6B64C4' },
  'Contact Info Found':        { bg: 'rgba(26,148,128,0.10)',  bdr: 'rgba(26,148,128,0.30)',  color: '#1A9480' },
  'Owner Contacted':           { bg: 'rgba(212,101,42,0.10)',  bdr: 'rgba(212,101,42,0.30)',  color: '#D4652A' },
  'Converted':                 { bg: 'rgba(14,124,107,0.10)',  bdr: 'rgba(14,124,107,0.30)',  color: '#0E7C6B' },
};

// Priority level colors
export const PRIORITY_COLORS = {
  'Critical': { bg: 'rgba(196,30,30,0.10)',   bdr: 'rgba(196,30,30,0.30)',   color: '#C41E1E' },
  'High':     { bg: 'rgba(212,101,42,0.10)',  bdr: 'rgba(212,101,42,0.30)',  color: '#D4652A' },
  'Medium':   { bg: 'rgba(201,145,21,0.10)',  bdr: 'rgba(201,145,21,0.30)',  color: '#C99115' },
  'Low':      { bg: 'rgba(148,163,175,0.10)', bdr: 'rgba(148,163,175,0.30)', color: '#94A3AF' },
};

// Score ring helper (legacy — used by leads page)
export function getScoreRing(score) {
  if (score == null) return { grade: '—', color: '#94A3AF' };
  const g = getGrade(score);
  const c = SCORE_COLORS.building.grades[g] || SCORE_COLORS.building.grades['C'];
  return { grade: g, color: c.color };
}
