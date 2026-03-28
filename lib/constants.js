// ══════════════════════════════════════════════════════════════
// CLERESTORY — constants.js
// All dropdown values, building specs, taxonomy
// Drop into: lib/constants.js
// ══════════════════════════════════════════════════════════════

// ── MARKETS & SUBMARKETS ─────────────────────────────────────
export const MARKETS = [
  'SGV',
  'IE West',
  'IE East',
  'IE South',
  'LA North',
  'LA South',
  'OC',
  'San Diego',
  'Ventura',
];

export const SUBMARKETS = {
  'SGV': [
    'Mid Valley',
    'Industry / Whittier',
    'Azusa / Covina',
    'El Monte / Baldwin Park',
    'Irwindale / Duarte',
    'Pomona / Walnut',
    'West SGV',
  ],
  'IE West': [
    'Ontario Airport',
    'Ontario East',
    'Fontana',
    'Rancho Cucamonga',
    'Chino / Chino Hills',
    'Mira Loma / Jurupa Valley',
    'Riverside West',
  ],
  'IE East': [
    'San Bernardino',
    'Riverside East',
    'Redlands / Loma Linda',
    'Moreno Valley',
    'Perris',
    'Hemet',
  ],
  'IE South': [
    'Corona',
    'Temecula / Murrieta',
    'Menifee',
    'Lake Elsinore',
  ],
  'LA North': [
    'San Fernando Valley',
    'Burbank / Glendale',
    'Santa Clarita',
    'Chatsworth / Northridge',
  ],
  'LA South': [
    'Commerce / Vernon',
    'City of Commerce',
    'Gardena / Hawthorne',
    'Carson / Torrance',
    'Long Beach',
    'Compton / Lynwood',
  ],
  'OC': [
    'Anaheim / Fullerton',
    'Santa Ana / Garden Grove',
    'Orange / Tustin',
    'Irvine',
    'South OC',
  ],
  'San Diego': [
    'Otay Mesa',
    'Miramar',
    'Kearny Mesa',
    'National City / Chula Vista',
    'El Cajon / Santee',
  ],
  'Ventura': [
    'Oxnard / Port Hueneme',
    'Camarillo',
    'Thousand Oaks',
    'Simi Valley',
  ],
};

// ── PROPERTY TYPES ───────────────────────────────────────────
export const PROP_TYPES = [
  'Warehouse / Distribution',
  'Manufacturing',
  'Flex / R&D',
  'Cold Storage / Refrigerated',
  'Food Processing',
  'Truck Terminal',
  'IOS (Outdoor Storage)',
  'Data Center',
  'Self Storage',
  'Auto / Dealership',
  'Mixed Use Industrial',
];

// ── RECORD TYPES ─────────────────────────────────────────────
export const RECORD_TYPES = [
  'Building',
  'Parcel (Land Only)',
  'IOS (Outdoor Storage)',
  'Portfolio',
];

// ── OWNER TYPES ──────────────────────────────────────────────
export const OWNER_TYPES = [
  'Owner-User',
  'Private Family / Trust',
  'Private Investor',
  'Private REIT',
  'Institutional REIT',
  'Pension Fund',
  'Life Company',
  'Developer',
  'LLC / Partnership',
  'Corporate / Public Company',
  'Government / Municipality',
  'Receiver / Trustee',
];

// ── OCCUPANCY STATUS ─────────────────────────────────────────
export const OCCUPANCY_STATUS = [
  'Occupied — Single Tenant',
  'Occupied — Multi Tenant',
  'Partially Occupied',
  'Vacant',
  'Owner-Occupied',
  'Under Construction',
  'Under Renovation',
];

// ── ZONING ───────────────────────────────────────────────────
export const ZONING_TYPES = [
  'M1 — Light Industrial',
  'M2 — General Industrial',
  'M3 — Heavy Industrial',
  'CM — Commercial Manufacturing',
  'MR1 — Restricted Industrial',
  'MR2 — Restricted Industrial',
  'IL — Industrial Limited',
  'IG — Industrial General',
  'IH — Industrial Heavy',
  'BP — Business Park',
  'SP — Specific Plan',
  'PD — Planned Development',
  'A1 — Agricultural',
];

// ── BUILDING SPECS — STRUCTURE ───────────────────────────────
export const CLEAR_HEIGHTS = [
  "Under 18'",
  "18'",
  "20'",
  "22'",
  "24'",
  "26'",
  "28'",
  "30'",
  "32'",
  "36'",
  "40'",
  "Over 40'",
];

export const COLUMN_SPACINGS = [
  "30' × 30'",
  "40' × 40'",
  "50' × 50'",
  "50' × 52'",
  "52' × 50'",
  "52' × 52'",
  "54' × 50'",
  "56' × 50'",
  "60' × 50'",
  "60' × 60'",
  "Custom",
];

export const CONSTRUCTION_TYPES = [
  'Tilt-Up Concrete',
  'Masonry / Block',
  'Steel Frame',
  'Pre-Engineered Metal',
  'Wood Frame',
  'Concrete Panel',
  'Mixed',
];

export const ROOF_TYPES = [
  'Flat — TPO / EPDM',
  'Flat — Built-Up',
  'Flat — Metal',
  'Pitched — Metal',
  'Pitched — Shingle',
];

// ── BUILDING SPECS — LOADING ─────────────────────────────────
export const LOADING_TYPES = [
  'Dock-High Only',
  'Grade-Level Only',
  'Both Dock-High & Grade-Level',
  'Drive-In / Drive-Through',
  'Rail Served',
  'None',
];

export const TRUCK_COURT_DEPTHS = [
  "Under 100'",
  "100'",
  "110'",
  "120'",
  "130'",
  "135'",
  "140'",
  "150'",
  "160'",
  "185' (ULDC)",
  "Over 185'",
];

export const DOCK_LEVELER_TYPES = [
  'Mechanical',
  'Hydraulic',
  'Air-Powered',
  'Edge-of-Dock',
  'None / Unknown',
];

export const DOOR_SIZES = [
  "8' × 9'",
  "8' × 10'",
  "9' × 10'",
  "10' × 10'",
  "10' × 12'",
  "12' × 14'",
  "Custom",
];

// ── BUILDING SPECS — SYSTEMS ─────────────────────────────────
export const SPRINKLER_TYPES = [
  'ESFR (Early Suppression Fast Response)',
  'CMSA (Control Mode Specific Application)',
  'CMDA (Control Mode Density Area)',
  'Wet Pipe',
  'Dry Pipe',
  'Pre-Action',
  'None',
  'Unknown',
];

export const POWER_AMPERAGES = [
  '200A',
  '400A',
  '600A',
  '800A',
  '1,000A',
  '1,200A',
  '1,600A',
  '2,000A',
  '2,500A',
  '3,000A',
  '4,000A',
  'Custom',
];

export const POWER_VOLTAGES = [
  '120/208V 3-Phase',
  '120/240V Single Phase',
  '277/480V 3-Phase',
  '480V 3-Phase',
  'Custom',
];

export const HVAC_TYPES = [
  'Evaporative Cooler',
  'HVAC — Full',
  'HVAC — Office Only',
  'Radiant Heat',
  'Gas Unit Heaters',
  'None',
  'Unknown',
];

export const LIGHTING_TYPES = [
  'LED',
  'Fluorescent (T8)',
  'Metal Halide',
  'High Bay LED',
  'Skylights',
  'Mixed',
];

// ── BUILDING SPECS — SITE ────────────────────────────────────
export const YARD_TYPES = [
  'Secured / Fenced Yard',
  'Unsecured Yard',
  'No Yard',
  'Partial Yard',
];

export const PARKING_RATIOS = [
  'Under 1/1,000 SF',
  '1/1,000 SF',
  '1.5/1,000 SF',
  '2/1,000 SF',
  '3/1,000 SF',
  '4/1,000 SF',
  'Over 4/1,000 SF',
];

// ── LEASE TYPES ──────────────────────────────────────────────
export const LEASE_TYPES = [
  'NNN (Triple Net)',
  'NN (Double Net)',
  'N (Net)',
  'MG (Modified Gross)',
  'IG (Industrial Gross)',
  'Gross',
  'FSG (Full Service Gross)',
];

// ── DEAL TYPES ───────────────────────────────────────────────
export const DEAL_TYPES = [
  'Investment Sale',
  'Sale-Leaseback (SLB)',
  'Owner-User Sale',
  'Portfolio Sale',
  'Land Sale',
  'Lease — New',
  'Lease — Renewal',
  'Lease — Expansion',
  'Lease — Sublease',
  'Lease Rep (Tenant)',
  'Buyer Rep',
  'JV / Recapitalization',
  'Note Sale',
];

// ── DEAL STAGES ──────────────────────────────────────────────
export const DEAL_STAGES = [
  'Tracking',
  'Underwriting',
  'Off-Market Outreach',
  'LOI',
  'LOI Accepted',
  'PSA Negotiation',
  'Due Diligence',
  'Non-Contingent',
  'Closing',
  'Closed Won',
  'Dead',
];

// ── DEAL PRIORITIES ──────────────────────────────────────────
export const DEAL_PRIORITIES = [
  'High',
  'Medium',
  'Low',
  'Watch',
];

// ── CONTACT TYPES ────────────────────────────────────────────
export const CONTACT_TYPES = [
  'Owner',
  'Decision Maker',
  'Tenant',
  'Buyer',
  'Investor',
  'Broker — Listing',
  'Broker — Tenant Rep',
  'Broker — Buyer Rep',
  'Lender',
  'Attorney',
  'Property Manager',
  'Accountant / CPA',
  'Title / Escrow',
  'Environmental',
  'Contractor',
  'Other',
];

// ── CATALYST TAGS (v3 Field Guide) ───────────────────────────
export const CATALYST_TAGS = [
  // Lease-based
  { key: 'lease_expiry', label: 'Lease Expiry', color: 'amber', icon: '📅', group: 'Lease' },
  { key: 'lease_expiry_12', label: 'Lease Exp. ≤12mo', color: 'rust', icon: '🔴', group: 'Lease' },
  { key: 'below_market_rent', label: 'Below Market Rent', color: 'amber', icon: '📉', group: 'Lease' },
  { key: 'renewal_risk', label: 'Renewal Risk', color: 'amber', icon: '⚠', group: 'Lease' },
  { key: 'sublease_availability', label: 'Sublease Available', color: 'blue', icon: '🔄', group: 'Lease' },

  // Owner-based
  { key: 'slb_potential', label: 'SLB Potential', color: 'green', icon: '💼', group: 'Owner' },
  { key: 'owner_user_exit', label: 'Owner-User Exit', color: 'green', icon: '🚪', group: 'Owner' },
  { key: 'estate_trust', label: 'Estate / Trust', color: 'purple', icon: '⚖', group: 'Owner' },
  { key: 'long_hold', label: 'Long Hold (10yr+)', color: 'blue', icon: '🕰', group: 'Owner' },
  { key: 'private_family', label: 'Private Family', color: 'blue', icon: '👨‍👩‍👧', group: 'Owner' },

  // Financial distress
  { key: 'nod_filed', label: 'NOD Filed', color: 'rust', icon: '🔴', group: 'Distress' },
  { key: 'loan_maturity', label: 'Loan Maturity', color: 'rust', icon: '🏦', group: 'Distress' },
  { key: 'reo_foreclosure', label: 'REO / Foreclosure', color: 'rust', icon: '⚠', group: 'Distress' },
  { key: 'ucc_lien', label: 'UCC / Lien', color: 'rust', icon: '📋', group: 'Distress' },
  { key: 'sba_maturity', label: 'SBA Loan Maturity', color: 'amber', icon: '💰', group: 'Distress' },

  // Business signals
  { key: 'warn_notice', label: 'WARN Notice', color: 'rust', icon: '⚠', group: 'Business' },
  { key: 'hiring_signal', label: 'Hiring Signal', color: 'green', icon: '📈', group: 'Business' },
  { key: 'capex_permit', label: 'CapEx Permit', color: 'purple', icon: '🔨', group: 'Business' },
  { key: 'vacancy', label: 'Vacancy', color: 'amber', icon: '🏚', group: 'Business' },
  { key: 'business_sale', label: 'Business For Sale', color: 'amber', icon: '💲', group: 'Business' },

  // Market
  { key: 'broker_intel', label: 'Broker Intel', color: 'blue', icon: '🗣', group: 'Market' },
  { key: 'grapevine', label: 'Grapevine', color: 'blue', icon: '👂', group: 'Market' },
  { key: 'off_market', label: 'Off-Market', color: 'green', icon: '🔒', group: 'Market' },
  { key: 'city_rda', label: 'City / RDA Disposition', color: 'purple', icon: '🏛', group: 'Market' },
  { key: 'utility_connection', label: 'Utility Connection App', color: 'purple', icon: '⚡', group: 'Market' },
];

export const CATALYST_TAG_KEYS = CATALYST_TAGS.map(t => t.key);
export const CATALYST_TAG_LABELS = Object.fromEntries(CATALYST_TAGS.map(t => [t.key, t.label]));
export const CATALYST_TAG_COLORS = Object.fromEntries(CATALYST_TAGS.map(t => [t.key, t.color]));

// Color maps for rendering
export const TAG_BG = {
  rust: 'var(--rust-bg)',
  amber: 'var(--amber-bg)',
  green: 'var(--green-bg)',
  blue: 'var(--blue-bg)',
  purple: 'var(--purple-bg)',
};
export const TAG_BDR = {
  rust: 'var(--rust-bdr)',
  amber: 'var(--amber-bdr)',
  green: 'var(--green-bdr)',
  blue: 'var(--blue-bdr)',
  purple: 'var(--purple-bdr)',
};
export const TAG_COLOR = {
  rust: 'var(--rust)',
  amber: 'var(--amber)',
  green: 'var(--green)',
  blue: 'var(--blue)',
  purple: 'var(--purple)',
};

// ── LEAD SOURCES ─────────────────────────────────────────────
export const LEAD_SOURCES = [
  'WARN Intel',
  'Broker Intel',
  'Broker Network',
  'Direct Outreach',
  'NOD Filing',
  'CapEx Permit Pull',
  'UCC / Lien Filing',
  'SBA Loan Maturity',
  'Probate / Estate',
  'City / RDA Disposition',
  'Utility Connection Application',
  'CoStar / Loopnet',
  'LinkedIn Signal',
  'News / Press Release',
  'Referral',
  'Grapevine',
  'Cold Call',
  'Direct Mail',
  'Other',
];

// ── LEAD STAGES ──────────────────────────────────────────────
export const LEAD_STAGES = [
  'New',
  'Researching',
  'Owner Identified',
  'Owner Contacted',
  'Meeting Scheduled',
  'Proposal Sent',
  'Pipeline Ready',
  'Converted to Deal',
  'Dead',
  'Archived',
];

// ── COMP TYPES ───────────────────────────────────────────────
export const COMP_TRANSACTION_TYPES = [
  'New Lease',
  'Lease Renewal',
  'Lease Expansion',
  'Sublease',
  'Short-Term / Month-to-Month',
];

export const SALE_COMP_TYPES = [
  'Investment Sale',
  'Sale-Leaseback',
  'Owner-User Sale',
  'Portfolio Sale',
  'Land Sale',
  'Distressed / REO',
  'Auction',
];

// ── CAMPAIGN TYPES ───────────────────────────────────────────
export const CAMPAIGN_TYPES = [
  'Direct Mail',
  'Cold Call',
  'Email Outreach',
  'LinkedIn',
  'BOV Drop',
  'Market Report',
  'Newsletter',
  'Event / Networking',
];

// ── ACTIVITY TYPES ───────────────────────────────────────────
export const ACTIVITY_TYPES = [
  'Call — Outbound',
  'Call — Inbound',
  'Email — Sent',
  'Email — Received',
  'Meeting — In Person',
  'Meeting — Video',
  'Note',
  'BOV Sent',
  'Proposal Sent',
  'LOI Sent',
  'LOI Received',
  'Task Completed',
  'Site Tour',
  'System — Auto',
];

// ── TASK PRIORITIES ──────────────────────────────────────────
export const TASK_PRIORITIES = ['High', 'Medium', 'Low'];

// ── FILE CATEGORIES ──────────────────────────────────────────
export const FILE_CATEGORIES = [
  'BOV',
  'OM / Offering Memo',
  'Lease Agreement',
  'PSA',
  'Appraisal',
  'Environmental',
  'Title',
  'Survey / Site Plan',
  'Photos / Aerials',
  'Financial Model',
  'Comp Analysis',
  'Market Report',
  'Correspondence',
  'Other',
];

// ── SCORE THRESHOLDS ─────────────────────────────────────────
export const SCORE_GRADES = [
  { min: 90, max: 100, grade: 'A+', color: 'var(--blue)' },
  { min: 80, max: 89, grade: 'A', color: 'var(--blue2)' },
  { min: 70, max: 79, grade: 'B+', color: 'var(--blue2)' },
  { min: 60, max: 69, grade: 'B', color: 'var(--amber)' },
  { min: 50, max: 59, grade: 'C+', color: 'var(--amber)' },
  { min: 0, max: 49, grade: 'C', color: 'var(--ink4)' },
];

export function getScoreGrade(score) {
  return SCORE_GRADES.find(g => score >= g.min && score <= g.max) ?? SCORE_GRADES[SCORE_GRADES.length - 1];
}

// ── BUILDING SCORE WEIGHTS ────────────────────────────────────
// Used to auto-calculate building score from specs
export const BUILDING_SCORE_WEIGHTS = {
  clearHeight: {
    weight: 25,
    score: (ft) => {
      if (ft >= 36) return 25;
      if (ft >= 32) return 20;
      if (ft >= 28) return 15;
      if (ft >= 24) return 10;
      if (ft >= 20) return 5;
      return 2;
    },
  },
  dhRatio: {
    // dock doors per 10,000 SF
    weight: 20,
    score: (ratio) => {
      if (ratio >= 1.2) return 20;
      if (ratio >= 1.0) return 16;
      if (ratio >= 0.8) return 12;
      if (ratio >= 0.6) return 8;
      return 4;
    },
  },
  truckCourt: {
    weight: 20,
    score: (ft) => {
      if (ft >= 185) return 20;
      if (ft >= 135) return 16;
      if (ft >= 120) return 12;
      if (ft >= 100) return 8;
      return 4;
    },
  },
  officePct: {
    weight: 15,
    score: (pct) => {
      if (pct <= 5) return 15;
      if (pct <= 10) return 12;
      if (pct <= 15) return 9;
      if (pct <= 25) return 6;
      return 3;
    },
  },
  power: {
    weight: 10,
    score: (amps) => {
      if (amps >= 2000) return 10;
      if (amps >= 1200) return 8;
      if (amps >= 800) return 6;
      if (amps >= 400) return 4;
      return 2;
    },
  },
  vintage: {
    weight: 10,
    score: (year) => {
      const age = new Date().getFullYear() - year;
      if (age <= 5) return 10;
      if (age <= 10) return 8;
      if (age <= 20) return 6;
      if (age <= 30) return 4;
      return 2;
    },
  },
};

export function calculateBuildingScore(specs) {
  const { clearHeightFt, dockDoors, buildingSF, truckCourtFt, officePct, powerAmps, yearBuilt } = specs;
  let total = 0;
  const dhRatio = dockDoors && buildingSF ? (dockDoors / buildingSF) * 10000 : 0;

  if (clearHeightFt) total += BUILDING_SCORE_WEIGHTS.clearHeight.score(clearHeightFt);
  if (dhRatio) total += BUILDING_SCORE_WEIGHTS.dhRatio.score(dhRatio);
  if (truckCourtFt) total += BUILDING_SCORE_WEIGHTS.truckCourt.score(truckCourtFt);
  if (officePct != null) total += BUILDING_SCORE_WEIGHTS.officePct.score(officePct);
  if (powerAmps) total += BUILDING_SCORE_WEIGHTS.power.score(powerAmps);
  if (yearBuilt) total += BUILDING_SCORE_WEIGHTS.vintage.score(yearBuilt);

  return Math.min(100, Math.round(total));
}

// ── SGV / IE MARKET CONTEXT (for AI Signal) ──────────────────
export const SUBMARKET_BENCHMARKS = {
  'SGV': {
    avgClearHeight: 28,
    avgDHRatio: 0.82,
    avgTruckCourt: 120,
    vacancyRate: 2.1,
    avgAskingRent: 1.44,
    rentRange: '$1.38–1.52',
    replacementCost: 320,
  },
  'IE West': {
    avgClearHeight: 30,
    avgDHRatio: 0.95,
    avgTruckCourt: 130,
    vacancyRate: 2.8,
    avgAskingRent: 1.22,
    rentRange: '$1.10–1.32',
    replacementCost: 295,
  },
  'IE East': {
    avgClearHeight: 32,
    avgDHRatio: 1.05,
    avgTruckCourt: 135,
    vacancyRate: 4.2,
    avgAskingRent: 0.98,
    rentRange: '$0.88–1.10',
    replacementCost: 275,
  },
  'OC': {
    avgClearHeight: 26,
    avgDHRatio: 0.75,
    avgTruckCourt: 110,
    vacancyRate: 3.1,
    avgAskingRent: 1.65,
    rentRange: '$1.52–1.78',
    replacementCost: 345,
  },
};

// ── AI MODELS ────────────────────────────────────────────────
export const AI_MODEL_OPUS    = 'claude-opus-4-5';
export const AI_MODEL_SONNET  = 'claude-sonnet-4-5';
export const AI_MODEL_HAIKU   = 'claude-haiku-4-5';

// ── NUMBER FORMATTER ─────────────────────────────────────────
export const fmt = {
  price: (n, decimals = 0) => {
    if (n == null || isNaN(n)) return '—';
    const a = Math.abs(n);
    const s = n < 0 ? '-' : '';
    if (a >= 1_000_000) return s + '$' + (a / 1_000_000).toFixed(1) + 'M';
    if (a >= 1_000)     return s + '$' + (a / 1_000).toFixed(0) + 'K';
    return s + '$' + a.toFixed(decimals);
  },
  num: (n, decimals = 0) => {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals });
  },
  pct: (n, decimals = 1) => {
    if (n == null || isNaN(n)) return '—';
    return (Number(n) * 100).toFixed(decimals) + '%';
  },
  sf: (n) => {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US') + ' SF';
  },
  date: (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  clearHt: (n) => {
    if (n == null || isNaN(n)) return '—';
    return n + "'";
  },
};

// ── WARN INTEL — SGV / IE CITIES ─────────────────────────────
export const WARN_CITIES = [
  'Industry', 'City of Industry', 'El Monte', 'Baldwin Park', 'Irwindale',
  'Azusa', 'Covina', 'West Covina', 'Pomona', 'Walnut', 'Diamond Bar',
  'Ontario', 'Rancho Cucamonga', 'Fontana', 'Rialto', 'San Bernardino',
  'Riverside', 'Moreno Valley', 'Perris', 'Chino', 'Chino Hills',
  'Mira Loma', 'Jurupa Valley', 'Corona', 'Redlands', 'Loma Linda',
  'Colton', 'Bloomington', 'Eastvale', 'Norco', 'Montclair',
  'Upland', 'Claremont', 'La Verne', 'San Dimas', 'Glendora',
  'Duarte', 'Monrovia', 'Arcadia', 'Temple City', 'Rosemead',
  'South El Monte', 'Santa Fe Springs', 'Pico Rivera', 'Whittier',
  'Commerce', 'Vernon', 'Gardena', 'Hawthorne', 'Carson', 'Torrance',
  'Long Beach', 'Compton', 'Lynwood', 'South Gate', 'Downey',
];

// ── LEAD SUBSTEPS (per stage) ─────────────────────────────────
export const LEAD_SUBSTEPS = {
  'Lead':           ['Identify owner', 'Verify occupancy', 'Research company', 'Find contact info'],
  'Contacted':      ['Left voicemail', 'Sent intro email', 'Connected on LinkedIn', 'Confirmed interest'],
  'Qualifying':     ['Confirm timeline', 'Confirm size needs', 'Understand motivation', 'Assess urgency'],
  'Meeting Set':    ['Send calendar invite', 'Prep property brief', 'Confirm meeting', 'Tour scheduled'],
  'Proposal':       ['Draft BOV/proposal', 'Review with principal', 'Send to owner', 'Follow up'],
  'Negotiating':    ['Counter received', 'Present to client', 'Agree on terms', 'PSA drafted'],
  'Under Contract': ['Escrow opened', 'Inspections scheduled', 'Contingencies cleared', 'Closing prep'],
  'Closed':         ['Commission received', 'Thank you sent', 'Add to closed comps', 'Request referral'],
  'Dead':           ['Note reason', 'Set re-engage reminder'],
};

// ── LEAD KILL REASONS ─────────────────────────────────────────
export const LEAD_KILL_REASONS = [
  'Not selling / owner-occupied long term',
  'Already in escrow / sold',
  'Price expectation too high',
  'No response after 5+ attempts',
  'Wrong contact — cannot reach decision maker',
  'Tenant has long-term lease',
  'Owner passed away / estate situation',
  'Company relocating out of market',
  'Property under renovation / not available',
  'Referred to another broker',
  'Other',
];

// ── OUTREACH METHODS ──────────────────────────────────────────
export const OUTREACH_METHODS = [
  'Phone call', 'Voicemail', 'Email', 'Text', 'LinkedIn',
  'In-person visit', 'Letter / mailer', 'Referral introduction',
];

// ── OUTREACH OUTCOMES ─────────────────────────────────────────
export const OUTREACH_OUTCOMES = [
  'Connected — interested', 'Connected — not interested',
  'Connected — follow up later', 'Left voicemail', 'No answer',
  'Wrong number', 'Email bounced', 'Referred to assistant', 'Meeting scheduled',
];

// ── DEAL CONTACT ROLES ────────────────────────────────────────
export const DEAL_CONTACT_ROLES = [
  'Decision Maker', 'Owner', 'Tenant Rep', 'Landlord Rep', 'Attorney',
  'Escrow Officer', 'Lender', 'Property Manager', 'Contractor', 'Other',
];

// ── CADENCE OPTIONS ───────────────────────────────────────────
export const CADENCE_OPTIONS = [
  { value: 3,  label: 'Hot — every 3 days' },
  { value: 7,  label: 'Active — weekly' },
  { value: 14, label: 'Warm — every 2 weeks' },
  { value: 30, label: 'Monitor — monthly' },
  { value: 60, label: 'Cold — every 2 months' },
  { value: 90, label: 'Dormant — quarterly' },
];

// ── STAGE COLORS (deal pipeline) ──────────────────────────────
export const STAGE_COLORS = {
  'Tracking':             '#7A8FA6',
  'Underwriting':         '#5577A0',
  'Off-Market Outreach':  '#8C5A04',
  'LOI':                  '#4E6E96',
  'LOI Accepted':         '#2E6EA6',
  'PSA Negotiation':      '#5838A0',
  'Due Diligence':        '#9B4A1A',
  'Non-Contingent':       '#1A6B3A',
  'Closing':              '#156636',
  'Closed Won':           '#0D4D28',
  'Dead':                 '#888',
};

// ── LEAD STAGE COLORS ─────────────────────────────────────────
export const LEAD_STAGE_COLORS = {
  'New':                  '#7A8FA6',
  'Researching':          '#8C5A04',
  'Owner Identified':     '#5577A0',
  'Owner Contacted':      '#4E6E96',
  'Meeting Scheduled':    '#5838A0',
  'Proposal Sent':        '#9B4A1A',
  'Pipeline Ready':       '#1A6B3A',
  'Converted to Deal':    '#0D4D28',
  'Dead':                 '#888',
  'Archived':             '#AAA',
  // Legacy stage names used in LeadGen
  'Lead':           '#7A8FA6',
  'Contacted':      '#8C5A04',
  'Qualifying':     '#5577A0',
  'Meeting Set':    '#4E6E96',
  'Proposal':       '#9B4A1A',
  'Negotiating':    '#5838A0',
  'Under Contract': '#1A6B3A',
  'Closed':         '#0D4D28',
};

// ── LEAD TIERS ────────────────────────────────────────────────
export const LEAD_TIERS = ['A+', 'A', 'B', 'C', 'D'];

// ── PRIORITIES ────────────────────────────────────────────────
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

// ── STRATEGIES ────────────────────────────────────────────────
export const STRATEGIES = [
  'Core', 'Core-Plus', 'Value-Add', 'Opportunistic',
  'Development', 'Sale-Leaseback', 'Owner-User', 'Distressed',
];

// ── MARKETING TYPES ───────────────────────────────────────────
export const MARKETING_TYPES = [
  'Off-Market', 'On-Market', 'Pocket Listing', 'Auction',
  'Portfolio Sale', 'Joint Venture', 'Direct Outreach',
];

// ── VACANCY STATUS ────────────────────────────────────────────
export const VACANCY_STATUS = [
  'Occupied — Owner', 'Occupied — Tenant',
  'Partially Vacant', 'Vacant', 'Under Construction', 'Redevelopment',
];

// ── ACCOUNT TYPES ─────────────────────────────────────────────
export const ACCOUNT_TYPES = [
  'REIT', 'Institutional', 'Private Equity', 'Family Office',
  'Developer', 'Owner-User', 'Tenant / Occupier', 'Government',
  'Non-Profit', 'Broker', 'Other',
];

// ── ACTIVITY OUTCOMES ─────────────────────────────────────────
export const ACTIVITY_OUTCOMES = [
  'Connected — interested', 'Connected — follow up later',
  'Connected — not interested', 'Left voicemail', 'No answer',
  'Email bounced', 'Meeting scheduled', 'Proposal requested',
  'Referral given', 'Dead end',
];

// ── CATALYST URGENCY (tag → urgency tier) ────────────────────
export const CATALYST_URGENCY = {
  'WARN Filed':          'critical',
  'Lease Expiry <12mo':  'critical',
  'Lease Expiry <24mo':  'high',
  'Lease Expiry <36mo':  'medium',
  'For Sale':            'critical',
  'Vacancy':             'high',
  'Distress Signal':     'high',
  'CapEx / Permits':     'medium',
  'SLB Potential':       'medium',
  'Ownership Change':    'medium',
  'Debt Maturity':       'high',
  'Expansion Signal':    'medium',
  'Relocation Signal':   'high',
  'M&A Activity':        'medium',
  'New Listing':         'high',
  'Price Reduction':     'high',
  'Watch':               'low',
};

// ── catalystTagClass (tag → CSS class suffix) ─────────────────
export function catalystTagClass(tag) {
  if (!tag) return 'ghost';
  const t = tag.toLowerCase();
  if (t.includes('warn') || t.includes('critical') || t.includes('distress') || t.includes('vacancy')) return 'red';
  if (t.includes('expiry') || t.includes('expiration') || t.includes('debt') || t.includes('for sale') || t.includes('relocation')) return 'amber';
  if (t.includes('slb') || t.includes('expansion') || t.includes('pipeline')) return 'green';
  if (t.includes('capex') || t.includes('permit') || t.includes('m&a') || t.includes('ownership')) return 'purple';
  if (t.includes('watch') || t.includes('research')) return 'blue';
  return 'ghost';
}
