// ══════════════════════════════════════════════════════════════════
// CLERESTORY INVESTOR — lib/constants.js
// All dropdown values, markets, submarkets, building specs
// + Investor-mode pipeline stages, portfolio fit, investment returns
// April 14, 2026
// ══════════════════════════════════════════════════════════════════

// ── MARKETS ───────────────────────────────────────────────────────
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

// ── SUBMARKETS (all SoCal — mirrors submarket_benchmarks table) ───
export const SUBMARKETS = {
  'SGV': [
    'City of Industry',
    'Vernon',
    'El Monte / South El Monte',
    'Irwindale / Duarte',
    'Azusa / Covina',
    'Pomona / Walnut',
    'West SGV',
    'Alhambra / Monterey Park',
    'Commerce / Vernon',
  ],
  'IE West': [
    'Ontario Airport',
    'Ontario East',
    'Fontana',
    'Rancho Cucamonga',
    'Chino / Chino Hills',
    'Mira Loma / Jurupa Valley',
    'Riverside West',
    'Rialto / Colton',
    'Upland / Claremont',
  ],
  'IE East': [
    'San Bernardino',
    'Riverside East',
    'Redlands / Loma Linda',
    'Moreno Valley',
    'Perris',
    'Hemet',
    'Victorville / Hesperia',
    'Yucaipa / Calimesa',
  ],
  'IE South': [
    'Corona',
    'Temecula / Murrieta',
    'Menifee',
    'Lake Elsinore',
    'Eastvale / Jurupa',
  ],
  'LA North': [
    'San Fernando Valley',
    'Burbank / Glendale',
    'Santa Clarita',
    'Chatsworth / Northridge',
    'Sylmar / San Fernando',
    'Pacoima / Arleta',
  ],
  'LA South': [
    'Commerce / Vernon',
    'City of Commerce',
    'Gardena / Hawthorne',
    'Carson / Torrance',
    'Long Beach',
    'Compton / Lynwood',
    'Santa Fe Springs / Pico Rivera',
    'Downey / Norwalk',
    'South Bay',
  ],
  'OC': [
    'Anaheim / Fullerton',
    'Santa Ana / Garden Grove',
    'Orange / Tustin',
    'Irvine',
    'South OC',
    'Brea / La Habra',
    'Buena Park / La Palma',
  ],
  'San Diego': [
    'Otay Mesa',
    'Miramar',
    'Kearny Mesa',
    'National City / Chula Vista',
    'El Cajon / Santee',
    'Poway',
    'Sorrento Valley',
  ],
  'Ventura': [
    'Oxnard / Port Hueneme',
    'Camarillo',
    'Thousand Oaks',
    'Simi Valley',
    'Moorpark',
    'Santa Paula / Fillmore',
  ],
};

// ── FLAT SUBMARKET LIST (for dropdowns) ──────────────────────────
export const ALL_SUBMARKETS = Object.values(SUBMARKETS).flat().sort();

// ── PROPERTY TYPES ────────────────────────────────────────────────
export const PROP_TYPES = [
  'Warehouse / Distribution',
  'Manufacturing',
  'Flex / R&D',
  'Cold Storage / Food Processing',
  'Truck Terminal / Cross-Dock',
  'Outdoor Storage',
  'Data Center / Mission Critical',
  'BESS / Energy Storage Site',
  'Land / Development Site',
  'Mixed Use Industrial',
];

// ── OWNER TYPES ───────────────────────────────────────────────────
export const OWNER_TYPES = [
  'Owner-User',
  'Private LLC',
  'Family Trust',
  'Individual',
  'Corp / C-Corp',
  'S-Corp',
  'Partnership / LP',
  'Institutional REIT',
  'Private Equity',
  'Pension Fund',
  'Insurance Company',
  'Foreign Investor',
  'Non-Profit',
  'Government / Municipality',
];

// ── LEAD STAGES (same — used for Acquisition Targets) ────────────
export const LEAD_STAGES = [
  'New',
  'Researching',
  'Decision Maker Identified',
  'Contact Info Found',
  'Owner Contacted',
  'Converted',
  'Dead',
];

// ══════════════════════════════════════════════════════════════════
// INVESTOR-MODE PIPELINE STAGES
// ══════════════════════════════════════════════════════════════════

export const DEAL_STAGES = [
  'Tracking',
  'Underwriting',
  'Offer / LOI',
  'Under Contract',
  'Due Diligence',
  'Non-Contingent',
  'Closed',
  'Asset Management',
  'Dead',
];

// Investment returns appear at these stages and beyond
// (replaces COMMISSION_STAGES from broker mode)
export const RETURNS_STAGES = [
  'Offer / LOI', 'Under Contract', 'Due Diligence',
  'Non-Contingent', 'Closed', 'Asset Management',
];

// ── ACQUISITION STRATEGY TYPES ───────────────────────────────────
export const STRATEGY_TYPES = [
  'Core',
  'Core+',
  'Value-Add',
  'Opportunistic',
  'Sale-Leaseback',
  'Development',
  'Land Bank',
];

// ── HOLDING STATUS ───────────────────────────────────────────────
export const HOLDING_STATUS = [
  'Active',
  'Stabilizing',
  'Lease-Up',
  'Disposing',
  'Sold',
];

// ── ASSET EVENT TYPES ────────────────────────────────────────────
export const ASSET_EVENT_TYPES = [
  'Lease Renewal',
  'Lease Expiry',
  'New Lease',
  'Tenant Move-Out',
  'CapEx / TI',
  'Refinance',
  'Loan Maturity',
  'Disposition',
  'Insurance Renewal',
  'Tax Reassessment',
  'Environmental',
];

// ══════════════════════════════════════════════════════════════════
// PORTFOLIO FIT SCORE — weights and thresholds
// ══════════════════════════════════════════════════════════════════

export const PORTFOLIO_FIT_WEIGHTS = {
  submarket_match:      20,   // Is this in our target markets?
  size_fit:             15,   // Within min/max SF range?
  building_score:       20,   // Building quality vs minimum threshold
  cap_rate_fit:         15,   // Going-in cap vs our floor
  basis_replacement:    15,   // Basis $/SF vs replacement cost ratio
  strategy_match:       15,   // Strategy type alignment
};

// Grade bands for Portfolio Fit Score (same as Building Score)
export const FIT_GRADES = {
  90: 'A+',
  80: 'A',
  70: 'B+',
  60: 'B',
  50: 'C+',
  40: 'C',
  0:  'D',
};

// ══════════════════════════════════════════════════════════════════
// KPI LABELS — Investor mode
// ══════════════════════════════════════════════════════════════════

export const PIPELINE_KPIS = {
  count:        'Active Acquisitions',
  totalValue:   'Total Basis',
  equity:       'Equity Deployed',
  avgCap:       'Wtd Going-In Cap',
  pipelineIrr:  'Pipeline IRR',
  actionNeeded: 'Action Needed',
};

export const DEAL_DETAIL_KPIS = {
  acqPrice:     'Acq Price',
  goingInCap:   'Going-In Cap',
  targetIrr:    'Target IRR',
  equityReq:    'Equity Required',
  basisRatio:   'Basis vs Replacement',
  valueAdd:     'Value-Add Spread',
};

// ── PRIORITY LEVELS ───────────────────────────────────────────────
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

// ── LEASE TYPES ───────────────────────────────────────────────────
export const LEASE_TYPES = ['NNN', 'Modified Gross', 'Full Service Gross', 'Absolute Net'];

// ── BUILDING SPECS ────────────────────────────────────────────────
export const CLEAR_HEIGHT_OPTIONS = [
  "12'", "14'", "16'", "18'", "20'", "22'", "24'",
  "26'", "28'", "30'", "32'", "36'", "40'", "40'+",
];

export const SPRINKLER_TYPES = [
  'ESFR', 'CMSA', 'ESPR', 'Wet Pipe', 'Dry Pipe', 'None',
];

export const CONSTRUCTION_TYPES = [
  'Tilt-Up Concrete', 'Precast Concrete', 'Masonry', 'Metal', 'Wood Frame',
];

export const ROOF_TYPES = [
  'TPO', 'EPDM', 'Built-Up', 'Metal', 'Foam', 'Unknown',
];

export const LOADING_TYPES = [
  'Dock-High Only', 'Grade-Level Only', 'Both DH + GL',
  'Drive-In', 'Rail', 'Cross-Dock',
];

export const ZONING_TYPES = [
  'M-1 (Light Industrial)', 'M-2 (Heavy Industrial)', 'M-3 (Heavy/Restricted)',
  'M1-PD (Planned Development)', 'I-1', 'I-2',
  'CM (Commercial Manufacturing)', 'MU (Mixed Use)',
  'A-1 (Agricultural)', 'R&D',
];

export const POWER_OPTIONS = [
  '200A', '400A', '600A', '800A', '1,000A', '1,200A',
  '1,600A', '2,000A', '2,500A', '3,000A', '4,000A+',
];

export const HVAC_OPTIONS = [
  'Full HVAC', 'Office Only', 'Evap Cooler', 'Fan/Vent Only', 'None',
];

// ── SOURCE TYPES ──────────────────────────────────────────────────
export const LEAD_SOURCES = [
  'WARN Intel',
  'Research Campaign',
  'CoStar',
  'Broker Intel',
  'Cold Call / Canvassing',
  'Referral',
  'Owner Search',
  'Bankruptcy Radar',
  'Distress Watch',
  'Direct Mail',
  'LinkedIn',
  'Manual Entry',
];

// ── SUBMARKET BENCHMARK QUICK LOOKUP ─────────────────────────────
export const SUBMARKET_INTEL = {
  'City of Industry':       { slb: true, succession: true, mult: 1.10, vacancy: 6.5 },
  'Vernon':                 { slb: true, succession: true, mult: 1.12, vacancy: 5.2 },
  'El Monte / South El Monte': { slb: true, succession: true, mult: 1.08, vacancy: 8.1 },
  'Commerce / Vernon':      { slb: true, succession: true, mult: 1.12, vacancy: 5.5 },
  'Ontario Airport':        { slb: false, succession: false, mult: 1.15, vacancy: 4.5 },
  'Rancho Cucamonga':       { slb: true, succession: false, mult: 1.10, vacancy: 5.0 },
  'Chino / Chino Hills':    { slb: true, succession: true, mult: 1.08, vacancy: 4.8 },
  'Fontana':                { slb: false, succession: false, mult: 1.00, vacancy: 6.5 },
  'Anaheim / Fullerton':    { slb: true, succession: true, mult: 1.07, vacancy: 5.5 },
  'Kearny Mesa':            { slb: true, succession: true, mult: 1.05, vacancy: 5.0 },
  'San Fernando Valley':    { slb: true, succession: true, mult: 1.05, vacancy: 6.0 },
  'Oxnard / Port Hueneme':  { slb: true, succession: true, mult: 1.00, vacancy: 6.5 },
  'Camarillo':              { slb: true, succession: true, mult: 1.00, vacancy: 6.0 },
};
