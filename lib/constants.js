// ══════════════════════════════════════════════════════════════
// CLERESTORY — Constants & Taxonomy
// Source of truth: Naming Conventions v2 + Catalyst Field Guide v3
// ══════════════════════════════════════════════════════════════

// ─── MARKETS & SUBMARKETS ────────────────────────────────────
export const MARKETS = ['SGV', 'IE', 'LA', 'OC', 'Ventura'];

export const SUBMARKETS = {
  SGV: [
    'City of Industry',
    'Vernon',
    'El Monte / South El Monte',
    'Irwindale',
    'Azusa / Covina',
    'Pomona',
    'SGV — Other',
  ],
  IE: [
    'Ontario Airport',
    'Fontana',
    'Rancho Cucamonga',
    'Chino',
    'Chino Hills / Diamond Bar',
    'Rialto / Colton',
    'San Bernardino',
    'Riverside',
    'Moreno Valley / Perris',
    'Jurupa Valley',
    'IE — Other',
  ],
  LA: [
    'Vernon',
    'Commerce',
    'Carson / Torrance',
    'Compton',
    'Santa Fe Springs',
    'Downey',
    'Paramount',
    'South Gate',
    'Long Beach',
    'Gardena / Hawthorne',
    'LA — Other',
  ],
  OC: [
    'Anaheim',
    'Fullerton / Buena Park',
    'Santa Ana',
    'Irvine',
    'Brea / Placentia',
    'Lake Forest',
    'Orange',
    'OC — Other',
  ],
  Ventura: [
    'Oxnard',
    'Camarillo',
    'Ventura',
    'Simi Valley',
    'Moorpark',
    'Ventura — Other',
  ],
};

// ─── RECORD TYPES ────────────────────────────────────────────
export const RECORD_TYPES = [
  'Building',
  'Parcel (Land Only)',
  'IOS (Outdoor Storage)',
];

// ─── PROPERTY TYPES ──────────────────────────────────────────
export const PROP_TYPES = [
  'Warehouse/Distribution',
  'Manufacturing',
  'Flex/R&D',
  'Cold Storage',
  'Truck Terminal',
  'IOS (Outdoor Storage)',
  'Food Processing',
  'Data Center',
  'Other',
];

// ─── VACANCY STATUS ──────────────────────────────────────────
export const VACANCY_STATUS = ['Occupied', 'Vacant', 'Partial'];

// ─── OWNER TYPES ─────────────────────────────────────────────
export const OWNER_TYPES = [
  'Private',
  'Institutional',
  'REIT',
  'Fund',
  'Family/Trust',
  'Government',
  'Unknown',
];

// ─── LEASE TYPES ─────────────────────────────────────────────
export const LEASE_TYPES = [
  'NNN',
  'Gross',
  'Modified Gross',
  'Industrial Gross',
];

// ─── DEAL TYPES ──────────────────────────────────────────────
export const DEAL_TYPES = [
  'Investment Sale',
  'Owner-User Sale',
  'SLB',
  'Lease',
  'Sublease',
  'Development/Land',
];

// ─── DEAL STRATEGIES ─────────────────────────────────────────
export const STRATEGIES = [
  'Core',
  'Core Plus',
  'Value-Add',
  'Opportunistic',
  'Development',
  'Land Bank',
];

// ─── LEAD STAGES (Lead Gen kanban — 2 stages) ──────────────
export const LEAD_STAGES = [
  'Lead',
  'Owner Contacted',
];

export const LEAD_STAGE_COLORS = {
  'Lead':             '#6b7280',
  'Owner Contacted':  '#3b82f6',
};

// ─── LEAD KILL REASONS ──────────────────────────────────────
export const LEAD_KILL_REASONS = [
  'Not Interested',
  'Bad Timing',
  'Wrong Contact',
  'Already Listed',
  'No Response After Multiple Attempts',
  'Not a Fit',
  'Other',
];

// ─── DEAL STAGES (Deal Pipeline kanban — 9 stages) ──────────
export const DEAL_STAGES = [
  'Tracking',
  'Underwriting',
  'Marketing',
  'Offers/LOI',
  'LOI Accepted/PSA',
  'Due Diligence',
  'Closing',
  'Closed',
  'Dead',
];

export const STAGE_COLORS = {
  'Tracking':        '#3b82f6',
  'Underwriting':    '#8b5cf6',
  'Marketing':       '#f59e0b',
  'Offers/LOI':      '#f97316',
  'LOI Accepted/PSA':'#ef4444',
  'Due Diligence':   '#ec4899',
  'Closing':         '#10b981',
  'Closed':          '#22c55e',
  'Dead':            '#374151',
};

// ─── MARKETING TYPE (on-market vs off-market toggle) ────────
export const MARKETING_TYPES = ['On-Market', 'Off-Market'];

// ─── LEAD SUBSTEPS ───────────────────────────────────────────
export const LEAD_SUBSTEPS = {
  'Lead': [
    'Research company online',
    'Verify ownership (County Assessor)',
    'Identify decision maker',
    'Find contact info (phone/email)',
    'Check catalyst signals',
    'Score and tier the lead',
  ],
  'Owner Contacted': [
    'Left voicemail',
    'Spoke with gatekeeper',
    'Got decision maker contact',
    'Sent intro email/letter',
    'Scheduled callback',
    'Had initial conversation',
    'Meeting scheduled',
    'Meeting held',
    'Follow-up sent',
  ],
};

// ─── TASK PRIORITIES ─────────────────────────────────────────
export const TASK_PRIORITIES = ['High', 'Medium', 'Low'];
export const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'To-Do'];

export const ACTIVITY_OUTCOMES = [
  'Left VM',
  'Spoke',
  'No Answer',
  'Meeting Set',
  'Not Interested',
  'Follow Up',
  'Completed',
];

// ─── LEAD TIERS ──────────────────────────────────────────────
export const LEAD_TIERS = ['A+', 'A', 'B', 'C'];

// ─── DEAL PRIORITY ───────────────────────────────────────────
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

// ─── STAGE → DEFAULT PROBABILITY ────────────────────────────
export const STAGE_PROBABILITY = {
  'Tracking':        10,
  'Underwriting':    30,
  'Marketing':       40,
  'Offers/LOI':      55,
  'LOI Accepted/PSA':75,
  'Due Diligence':   85,
  'Closing':         95,
  'Closed':          100,
  'Dead':            0,
};

// ─── BUYER OUTREACH FIELDS ──────────────────────────────────
export const OUTREACH_DIRECTIONS = ['Outbound', 'Inbound'];
export const OUTREACH_METHODS = ['Call', 'Email', 'Meeting', 'Tour'];
export const OUTREACH_OUTCOMES = ['Interested', 'Passed', 'Requested Info', 'Offer Coming', 'No Response', 'Scheduled Tour', 'Other'];

// ─── CONTACT TYPES ───────────────────────────────────────────
export const CONTACT_TYPES = [
  'Owner',
  'Tenant',
  'Buyer',
  'Broker',
  'Lender',
  'Attorney',
  'Investor',
  'Other',
];

// ─── ACCOUNT TYPES ───────────────────────────────────────────
export const ACCOUNT_TYPES = [
  'Owner',
  'Institutional Buyer',
  'Private Buyer',
  'Tenant',
  'Broker / Advisor',
  'Lender',
  'Investor',
  'Developer',
  'Other',
];

// ─── SALE TYPES (for comps) ──────────────────────────────────
export const SALE_TYPES = [
  'Investment',
  'Owner-User',
  'SLB',
  'Portfolio',
  'Distress',
];

// ─── CATALYST TAGS (Field Guide v3 — all 26) ────────────────
// Grouped by category for the UI filter + tag picker
export const CATALYST_CATEGORIES = {
  'Owner Signal': [
    'SLB Potential',
    'Distress / Special Servicer',
    'Tax Delinquent',
    'NOD Filed',
    'Estate / Probate',
    'Overleveraged',
    'Partnership Dispute',
    'Long Hold Period',
    'Short Hold Period',
    'Absentee Owner',
    'UCC / Lien Activity',
    'SBA Loan Maturity',
  ],
  'Occupier Signal': [
    'WARN Notice',
    'M&A - Acquisition',
    'M&A - Consolidation',
    'Bankruptcy',
    'Relocation Risk',
    'Expansion Potential',
    'Downsizing',
    'Corporate Restructuring',
    'Hiring Signal',
  ],
  'Asset Signal': [
    'Expiring Lease < 12 Mo',
    'Expiring Lease 12-24 Mo',
    'Vacancy',
    'Functionally Challenged',
    'Under-Market Rent',
    'Deferred Maintenance',
    'Major CapEx Permit',
    'Environmental',
  ],
  'Market Signal': [
    'Opportunity Zone',
    'Zoning Change',
    'Infrastructure Project',
    'Market Pressure',
    'New Construction Nearby',
  ],
};

// Flat list for dropdowns
export const CATALYST_TAGS = Object.values(CATALYST_CATEGORIES).flat();

// ─── AI SCORE WEIGHTS (from Field Guide) ─────────────────────
export const CATALYST_WEIGHTS = {
  'SLB Potential':               25,   // Owner Signal — HIGH
  'Distress / Special Servicer': 30,   // Owner Signal — HIGH (max)
  'Tax Delinquent':              30,   // Owner Signal — HIGH (stacks with Distress)
  'WARN Notice':                 20,   // Occupier Signal — HIGH
  'M&A - Acquisition':           20,   // Occupier Signal — HIGH
  'M&A - Consolidation':         18,   // Occupier Signal — HIGH
  'Bankruptcy':                  30,   // Owner Signal — HIGH (max)
  'NOD Filed':                   25,   // Owner Signal — HIGH
  'Estate / Probate':            22,   // Owner Signal — HIGH
  'Expiring Lease < 12 Mo':     30,   // Asset Signal — HIGH (on lease factor)
  'Expiring Lease 12-24 Mo':    15,   // Asset Signal — MED
  'Vacancy':                     20,   // Asset Signal — MED (on lease factor)
  'UCC / Lien Activity':         15,   // Owner Signal — MED
  'Absentee Owner':              12,   // Owner Signal — MED
  'SBA Loan Maturity':           12,   // Owner Signal — MED
  'Relocation Risk':             12,   // Occupier Signal — MED
  'Long Hold Period':            10,   // Owner Signal — MED (on tenure factor)
  'Hiring Signal':               10,   // Occupier Signal — MED
  'Major CapEx Permit':          10,   // Asset Signal — MED
  'Functionally Challenged':     10,   // Asset Signal — MED
  'Expansion Potential':          8,   // Occupier Signal — MED
  'Under-Market Rent':            8,   // Asset Signal — MED
  'Zoning Change':                8,   // Market Signal — MED
  'Infrastructure Project':       8,   // Market/External — MED
  'Overleveraged':               20,   // Owner Signal — HIGH
  'Partnership Dispute':         15,   // Owner Signal — MED
  'Downsizing':                  12,   // Occupier Signal — MED
  'Corporate Restructuring':     12,   // Occupier Signal — MED
  'Deferred Maintenance':         8,   // Asset Signal — LOW-MED
  'Environmental':                5,   // Market Signal — LOW-MED (context)
  'Opportunity Zone':             5,   // Market Signal — MED
  'Market Pressure':              8,   // Market Signal — LOW-MED
  'New Construction Nearby':      3,   // Market Signal — LOW
  'Short Hold Period':            5,   // Owner Signal — LOW
};

// ─── CATALYST URGENCY ────────────────────────────────────────
export const CATALYST_URGENCY = {
  'SLB Potential':               'high',
  'Distress / Special Servicer': 'immediate',
  'WARN Notice':                 'immediate',
  'M&A - Acquisition':           'high',
  'M&A - Consolidation':         'high',
  'Bankruptcy':                  'immediate',
  'Expiring Lease < 12 Mo':     'high',
  'Expiring Lease 12-24 Mo':    'medium',
  'Vacancy':                     'high',
  'Long Hold Period':            'medium',
  'Short Hold Period':           'medium',
  'Absentee Owner':              'medium',
  'Opportunity Zone':            'low',
  'Functionally Challenged':     'medium',
  'Under-Market Rent':           'medium',
  'Relocation Risk':             'medium',
  'Expansion Potential':         'medium',
  'Zoning Change':               'medium',
  'Tax Delinquent':              'high',
  'Estate / Probate':            'high',
  'Overleveraged':               'high',
  'Partnership Dispute':         'medium',
  'Downsizing':                  'medium',
  'Corporate Restructuring':     'medium',
  'Deferred Maintenance':        'low',
  'Environmental':               'low',
  'Infrastructure Project':      'low',
};

// ─── FOLLOW-UP CADENCES ──────────────────────────────────────
export const CADENCE_OPTIONS = [
  { label: 'Weekly', days: 7 },
  { label: 'Biweekly', days: 14 },
  { label: 'Monthly', days: 30 },
  { label: 'Bimonthly', days: 60 },
  { label: 'Quarterly', days: 90 },
  { label: 'Biannually', days: 182 },
  { label: 'Annually', days: 365 },
];

// ─── DEAL CONTACT ROLES ─────────────────────────────────────
export const DEAL_CONTACT_ROLES = [
  'Seller', 'Buyer', 'Listing Broker', 'Buyer Broker', 'Attorney',
  'Lender', 'Title/Escrow', 'Property Manager', 'Tenant', 'Other'
];

// ─── AI MODELS (Two-Tier) ───────────────────────────────────
export const AI_MODEL_OPUS = 'claude-opus-4-20250514';
export const AI_MODEL_SONNET = 'claude-sonnet-4-20250514';

// ─── WARN NOTICE CITIES (All SoCal industrial) ─────────────
export const WARN_CITIES = [
  // SGV
  'City of Industry', 'Vernon', 'El Monte', 'South El Monte', 'Irwindale',
  'Azusa', 'Covina', 'West Covina', 'Pomona', 'La Puente', 'Baldwin Park',
  'Santa Fe Springs', 'Whittier', 'La Mirada', 'Hacienda Heights',
  // IE
  'Ontario', 'Fontana', 'Rancho Cucamonga', 'Chino', 'Rialto', 'Colton',
  'San Bernardino', 'Riverside', 'Moreno Valley', 'Perris', 'Jurupa Valley',
  'Redlands', 'Upland', 'Montclair', 'Mira Loma', 'Eastvale', 'Beaumont', 'Banning',
  // LA County
  'Commerce', 'Carson', 'Torrance', 'Compton', 'Paramount', 'Downey',
  'Gardena', 'Hawthorne', 'Inglewood', 'Lynwood', 'South Gate', 'Bell Gardens',
  'Los Angeles', 'Long Beach', 'Santa Clarita', 'Palmdale', 'Lancaster',
  // OC
  'Anaheim', 'Fullerton', 'Buena Park', 'Santa Ana', 'Orange', 'Irvine',
  'Lake Forest', 'Brea', 'Placentia', 'La Habra', 'Cypress', 'Stanton',
  // Ventura
  'Oxnard', 'Ventura', 'Camarillo', 'Thousand Oaks', 'Simi Valley', 'Moorpark',
  // San Diego
  'San Diego', 'Chula Vista', 'Oceanside', 'Escondido', 'Carlsbad', 'Vista',
  'San Marcos', 'El Cajon', 'National City', 'Otay Mesa',
];

// ─── STREET ABBREVIATIONS (Naming Conventions v2) ────────────
export const STREET_ABBREVS = {
  'Avenue':    'Ave',
  'Boulevard': 'Blvd',
  'Court':     'Ct',
  'Drive':     'Dr',
  'Road':      'Rd',
  'Street':    'St',
  'Way':       'Way',
  'Lane':      'Ln',
  'Parkway':   'Pkwy',
  'Circle':    'Cir',
  'Place':     'Pl',
  'Terrace':   'Ter',
};

// ─── FORMAT HELPERS ──────────────────────────────────────────
export const fmt = {
  sf: (n) => n ? `${Number(n).toLocaleString()} SF` : '',
  acres: (n) => n ? `${Number(n).toFixed(2)} acres` : '',
  price: (n) => n ? `$${Number(n).toLocaleString()}` : '',
  psf: (n) => n ? `$${Number(n).toLocaleString()} / SF` : '',
  rent: (n, type = 'NNN') => n ? `$${Number(n).toFixed(2)} / SF / Mo ${type}` : '',
  pct: (n) => n != null ? `${n}%` : '',
  capRate: (n) => n != null ? `${Number(n).toFixed(1)}%` : '',
  clearHt: (n) => n ? `${n}'` : '',
  apn: (s) => s || '',
  date: (d) => d ? new Date(d).toLocaleDateString('en-US') : '',
};

// ─── CATALYST TAG COLOR HELPER ───────────────────────────────
export const catalystTagClass = (tag) => {
  const level = CATALYST_URGENCY?.[tag];
  if (level === 'immediate') return 'tag-red';
  if (level === 'high') return 'tag-amber';
  if (level === 'medium') return 'tag-blue';
  return 'tag-ghost';
};
