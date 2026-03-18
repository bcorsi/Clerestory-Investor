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
  ],
  OC: [],
  Ventura: [],
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

// ─── LEAD STAGES (Lead Gen kanban) ───────────────────────────
export const LEAD_STAGES = [
  'Lead',
  'Owner Contacted',
  'Meeting/Proposal',
];

export const LEAD_STAGE_COLORS = {
  'Lead':             '#6b7280',
  'Owner Contacted':  '#3b82f6',
  'Meeting/Proposal': '#8b5cf6',
};

// ─── DEAL STAGES (Deal Pipeline kanban — full 10-stage lifecycle) ───
export const DEAL_STAGES = [
  'Lead',
  'Owner Contacted',
  'Meeting/Proposal',
  'Listing/Marketing',
  'Offers/LOI',
  'LOI Accepted/PSA',
  'Due Diligence',
  'Closing',
  'Closed',
  'Dead',
];

export const STAGE_COLORS = {
  'Lead':              '#6b7280',
  'Owner Contacted':   '#3b82f6',
  'Meeting/Proposal':  '#8b5cf6',
  'Listing/Marketing': '#f59e0b',
  'Offers/LOI':        '#f97316',
  'LOI Accepted/PSA':  '#ef4444',
  'Due Diligence':     '#ec4899',
  'Closing':           '#10b981',
  'Closed':            '#22c55e',
  'Dead':              '#374151',
};

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
  ],
  'Meeting/Proposal': [
    'Meeting scheduled',
    'Prep comp analysis',
    'Prepare deck/proposal',
    'Meeting held',
    'Follow-up email sent',
    'Next meeting scheduled',
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
  'Owner / Capital': [
    'SLB Potential',
    'Distress / Special Servicer',
    'Short Hold Period',
    'Long Hold Period',
    'Tax Delinquent',
    'Estate / Probate',
    'Overleveraged',
    'Partnership Dispute',
  ],
  'Occupier / Company': [
    'WARN Notice',
    'M&A - Acquisition',
    'M&A - Consolidation',
    'Bankruptcy',
    'Relocation Risk',
    'Expansion Potential',
    'Downsizing',
    'Corporate Restructuring',
  ],
  'Asset / Property': [
    'Expiring Lease < 12 Mo',
    'Expiring Lease 12-24 Mo',
    'Vacancy',
    'Functionally Challenged',
    'Under-Market Rent',
    'Deferred Maintenance',
    'Environmental',
  ],
  'Market / External': [
    'Absentee Owner',
    'Opportunity Zone',
    'Zoning Change',
    'Infrastructure Project',
  ],
};

// Flat list for dropdowns
export const CATALYST_TAGS = Object.values(CATALYST_CATEGORIES).flat();

// ─── AI SCORE WEIGHTS (from Field Guide) ─────────────────────
export const CATALYST_WEIGHTS = {
  'SLB Potential':               25,
  'Distress / Special Servicer': 30,
  'WARN Notice':                 20,
  'M&A - Acquisition':           20,
  'M&A - Consolidation':         20,
  'Bankruptcy':                  30,
  'Expiring Lease < 12 Mo':     25,
  'Expiring Lease 12-24 Mo':    15,
  'Vacancy':                     25,
  'Long Hold Period':            20,
  'Short Hold Period':           15,
  'Absentee Owner':              0,
  'Opportunity Zone':            0,
  'Functionally Challenged':     0,
  'Under-Market Rent':           0,
  'Relocation Risk':             0,
  'Expansion Potential':         0,
  'Zoning Change':               0,
  'Tax Delinquent':              15,
  'Estate / Probate':            15,
  'Overleveraged':               20,
  'Partnership Dispute':         15,
  'Downsizing':                  10,
  'Corporate Restructuring':     10,
  'Deferred Maintenance':        5,
  'Environmental':               5,
  'Infrastructure Project':      0,
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
