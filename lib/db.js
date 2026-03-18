import { supabase, isConfigured } from './supabase';

// ══════════════════════════════════════════════════════════════
// CLERESTORY — Database Operations
// ══════════════════════════════════════════════════════════════

// ─── DEMO MODE (when Supabase is not configured) ─────────────
// Returns mock data so the app works before connecting to Supabase

const DEMO_PROPERTIES = [
  {
    id: 'demo-1', address: '918 Radecki Ct', city: 'City of Industry', zip: '91748',
    market: 'SGV', submarket: 'City of Industry', record_type: 'Building',
    prop_type: 'Warehouse/Distribution', building_sf: 115621, land_acres: 6.10,
    year_built: 1990, clear_height: 32, dock_doors: 14, grade_doors: 2,
    owner: 'Montana Avenue Capital Partners', owner_type: 'Fund',
    vacancy_status: 'Occupied', tenant: 'Acme Distribution LLC',
    lease_type: 'NNN', lease_expiration: '2027-06-30', in_place_rent: 1.05,
    catalyst_tags: ['SLB Potential', 'Long Hold Period'], probability: 72, ai_score: 74,
    notes: 'Strong SLB candidate. Owner held 18 years.', created_at: new Date().toISOString(),
    apns: [{ apn: '8476-012-001', acres: 4.20 }, { apn: '8476-012-002', acres: 1.90 }],
  },
  {
    id: 'demo-2', address: '14600 Slover Ave', city: 'Fontana', zip: '92337',
    market: 'IE', submarket: 'Fontana', record_type: 'Building',
    prop_type: 'Warehouse/Distribution', building_sf: 332000, land_acres: 18.50,
    year_built: 2019, clear_height: 36, dock_doors: 64, grade_doors: 4,
    owner: 'Prologis', owner_type: 'REIT',
    vacancy_status: 'Vacant', tenant: null,
    lease_type: null, lease_expiration: null, in_place_rent: null,
    catalyst_tags: ['Vacancy'], probability: 45, ai_score: 52,
    notes: 'Class A spec building. Went dark Q4 2025.', created_at: new Date().toISOString(),
    apns: [{ apn: '0239-111-012', acres: 18.50 }],
  },
  {
    id: 'demo-3', address: '10650 Hemlock Ave', city: 'Fontana', zip: '92337',
    market: 'IE', submarket: 'Fontana', record_type: 'IOS (Outdoor Storage)',
    prop_type: 'IOS (Outdoor Storage)', building_sf: 0, land_acres: 26.00,
    year_built: null, clear_height: null, dock_doors: 0, grade_doors: 0,
    owner: 'Hemlock Land Holdings LLC', owner_type: 'Private',
    vacancy_status: 'Vacant', tenant: null,
    catalyst_tags: ['Absentee Owner', 'Tax Delinquent'], probability: 58, ai_score: 61,
    notes: 'IOS parcel. Absentee owner in TX. Tax delinquent 2 years.', created_at: new Date().toISOString(),
    apns: [{ apn: '0257-301-044', acres: 26.00 }],
  },
  {
    id: 'demo-4', address: '4900 Workman Mill Rd', city: 'City of Industry', zip: '91748',
    market: 'SGV', submarket: 'City of Industry', record_type: 'Building',
    prop_type: 'Manufacturing', building_sf: 72088, land_acres: 3.80,
    year_built: 1978, clear_height: 24, dock_doors: 6, grade_doors: 3,
    owner: 'Chen Family Trust', owner_type: 'Family/Trust',
    vacancy_status: 'Occupied', tenant: 'Pacific Manufacturing Inc',
    lease_type: 'NNN', lease_expiration: '2026-09-30', in_place_rent: 0.92,
    catalyst_tags: ['Expiring Lease < 12 Mo', 'Under-Market Rent', 'Functionally Challenged'],
    probability: 81, ai_score: 83,
    notes: 'Lease expires Q3 2026. Below market rent. Low clear height.', created_at: new Date().toISOString(),
    apns: [{ apn: '8565-025-005', acres: 3.80 }],
  },
  {
    id: 'demo-5', address: '2850 Fruitland Ave', city: 'Vernon', zip: '90058',
    market: 'SGV', submarket: 'Vernon', record_type: 'Building',
    prop_type: 'Food Processing', building_sf: 50000, land_acres: 2.40,
    year_built: 1965, clear_height: 22, dock_doors: 4, grade_doors: 2,
    owner: 'Rodriguez Family', owner_type: 'Private',
    vacancy_status: 'Occupied', tenant: 'Rodriguez Produce LLC',
    lease_type: 'Gross', lease_expiration: null, in_place_rent: 1.45,
    catalyst_tags: ['SLB Potential', 'Long Hold Period', 'Functionally Challenged'],
    probability: 68, ai_score: 70,
    notes: 'Owner-user 30+ years. SLB conversation started.', created_at: new Date().toISOString(),
    apns: [{ apn: '6316-019-008', acres: 2.40 }],
  },
];

const DEMO_DEALS = [
  {
    id: 'deal-1', deal_name: '918 Radecki Ct — SLB — Bridge', stage: 'Marketing',
    deal_type: 'SLB', strategy: 'SLB', address: '918 Radecki Ct', submarket: 'City of Industry',
    buyer: 'Bridge Industrial', seller: 'Montana Avenue Capital Partners',
    deal_value: 31400000, commission_rate: 2.0, commission_est: 628000,
    probability: 72, priority: 'High', close_date: '2026-09-30',
    notes: 'SLB deal. Meeting scheduled for next week.', created_at: new Date().toISOString(),
  },
  {
    id: 'deal-2', deal_name: '10650 Hemlock Ave — Sale — TBD', stage: 'Tracking',
    deal_type: 'Sale', strategy: 'Investment Sale', address: '10650 Hemlock Ave', submarket: 'Fontana',
    buyer: null, seller: 'Hemlock Land Holdings LLC',
    deal_value: 92000000, commission_rate: 1.5, commission_est: 1380000,
    probability: 30, priority: 'Medium', close_date: null,
    notes: 'IOS land play. Need to reach owner.', created_at: new Date().toISOString(),
  },
  {
    id: 'deal-3', deal_name: '4900 Workman Mill Rd — Lease — Pacific Mfg', stage: 'Offers/LOI',
    deal_type: 'Lease', strategy: 'Lease-Up', address: '4900 Workman Mill Rd', submarket: 'City of Industry',
    buyer: null, seller: null, tenant_name: 'Pacific Manufacturing Inc',
    deal_value: 720000, commission_rate: 4.0, commission_est: 28800,
    probability: 81, priority: 'High', close_date: '2026-08-15',
    notes: 'Renewal negotiation. Pushing to market rate.', created_at: new Date().toISOString(),
  },
  {
    id: 'deal-4', deal_name: '14600 Slover Ave — Lease — TBD', stage: 'Marketing',
    deal_type: 'Lease', strategy: 'Lease-Up', address: '14600 Slover Ave', submarket: 'Fontana',
    buyer: null, seller: null,
    deal_value: null, commission_rate: 3.0, commission_est: null,
    probability: 45, priority: 'Medium', close_date: null,
    notes: 'Marketing for Prologis. Class A vacancy.', created_at: new Date().toISOString(),
  },
  {
    id: 'deal-5', deal_name: '2850 Fruitland Ave — SLB — Rodriguez', stage: 'Tracking',
    deal_type: 'SLB', strategy: 'SLB', address: '2850 Fruitland Ave', submarket: 'Vernon',
    buyer: null, seller: 'Rodriguez Family',
    deal_value: 13000000, commission_rate: 2.5, commission_est: 325000,
    probability: 35, priority: 'Medium', close_date: null,
    notes: 'Initial SLB conversation. Owner interested but cautious.', created_at: new Date().toISOString(),
  },
];

const DEMO_CONTACTS = [
  { id: 'c-1', name: 'David Chen', company: 'Chen Family Trust', title: 'Trustee', contact_type: 'Owner', phone: '(626) 555-0101', email: 'dchen@example.com', notes: 'Owner of 4900 Workman Mill Rd.' },
  { id: 'c-2', name: 'Maria Rodriguez', company: 'Rodriguez Produce LLC', title: 'President', contact_type: 'Owner', phone: '(323) 555-0202', email: 'mrodriguez@example.com', notes: 'Owner-user 30+ years. Vernon.' },
  { id: 'c-3', name: 'James Park', company: 'Bridge Industrial', title: 'VP Acquisitions', contact_type: 'Buyer', phone: '(312) 555-0303', email: 'jpark@bridgeindustrial.com', notes: 'Active SGV buyer.' },
  { id: 'c-4', name: 'Sarah Kim', company: 'Pacific Manufacturing Inc', title: 'CFO', contact_type: 'Tenant', phone: '(626) 555-0404', email: 'skim@pacificmfg.com', notes: 'Tenant at 4900 Workman Mill. Lease expiring Q3.' },
];

const DEMO_ACCOUNTS = [
  {
    id: 'acct-1', name: 'Bridge Industrial', account_type: 'Institutional Buyer',
    website: 'bridgei2.com', phone: '(312) 506-0200', email: 'acquisitions@bridgei2.com',
    city: 'Chicago', market: 'National', notes: 'Active SoCal buyer. Focus on Class A distribution 100K–500K SF. Closed Radecki Ct deal Q3 2025.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'acct-2', name: 'Prologis', account_type: 'Institutional Buyer',
    website: 'prologis.com', phone: '(415) 394-9000', email: null,
    city: 'San Francisco', market: 'National', notes: 'REIT. 14600 Slover Ave vacancy in Fontana. Actively seeking leasing rep.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'acct-3', name: 'Chen Family Trust', account_type: 'Owner',
    website: null, phone: '(626) 555-0101', email: 'dchen@example.com',
    city: 'San Gabriel', market: 'SGV', notes: 'Private family trust. Hold 4900 Workman Mill Rd. Lease expiring Q3 2026. SLB candidate.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'acct-4', name: 'Montana Avenue Capital Partners', account_type: 'Investor',
    website: null, phone: '(310) 555-0505', email: 'info@montanaacp.com',
    city: 'Santa Monica', market: 'SGV', notes: 'Private equity. Owner of 918 Radecki Ct. Disposition program active.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'acct-5', name: 'Pacific Manufacturing Inc', account_type: 'Tenant',
    website: null, phone: '(626) 555-0404', email: 'skim@pacificmfg.com',
    city: 'City of Industry', market: 'SGV', notes: 'Tenant at 4900 Workman Mill Rd. Renewal negotiation underway. Pushing to market rate.',
    created_at: new Date().toISOString(),
  },
];

const DEMO_LEADS = [
  {
    id: 'lead-1', lead_name: 'Leegin Creative Leather Products (Brighton)', stage: 'Lead',
    address: '14022 Nelson Ave E', submarket: 'City of Industry', owner: 'Jerry & Terri Kohl',
    owner_type: 'Private', company: 'Leegin Creative Leather Products Inc',
    decision_maker: 'Jerry Kohl (Founder/President)', phone: '(626) 961-9381', email: '',
    catalyst_tags: ['SLB Potential', 'Long Hold Period'], tier: 'A+', score: 95,
    priority: 'High', next_action: 'CALL NOW', building_sf: null,
    notes: 'Brighton Collectibles = 180+ retail stores. Founded 1972. Jerry ~mid-70s, late career. HQ IS the property. STRONGEST SLB candidate.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'lead-2', lead_name: 'Snak King Corp — Stephens + Turnbull Canyon', stage: 'Lead',
    address: '16150 Stephens St', submarket: 'City of Industry', owner: 'Bear Investments No 2 LLC',
    owner_type: 'Fund', company: 'Snak King Corp',
    decision_maker: 'Michael Axelrod (CEO) / Barry Levin (Founder, Board)', phone: '(626) 336-7711', email: 'blevin@snakking.com',
    catalyst_tags: ['SLB Potential', 'PE-Backed', 'Management Change'], tier: 'A+', score: 95,
    priority: 'High', next_action: 'CALL NOW', building_sf: 320000,
    notes: 'PE-backed by Falfurrias Capital Partners since Aug 2024. New CEO Oct 2025. $329M revenue. PE + leadership change = strongest disposition signal.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'lead-3', lead_name: 'Tarhong Industry Properties — 780 Nogales', stage: 'Lead',
    address: '780 Nogales St', submarket: 'City of Industry', owner: 'Tarhong Industry Properties LLC',
    owner_type: 'Private', company: 'Thunder Group / Tarhong',
    decision_maker: 'Unknown — research needed', phone: '', email: '',
    catalyst_tags: ['Long Hold Period', 'Absentee Owner'], tier: 'A+', score: 90,
    priority: 'High', next_action: 'ID decision maker → call', building_sf: 278000,
    notes: 'Purchased ~2004 (22yr hold). 278K SF on 13.5 acres. #1 scored SGV CoStar property.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'lead-4', lead_name: 'Acromil LLC — 18421 Railroad St', stage: 'Owner Contacted',
    address: '18421 Railroad St', submarket: 'City of Industry', owner: 'Gerald Niznick (personal)',
    owner_type: 'Private', company: 'Acromil LLC',
    decision_maker: 'Gerald Niznick (Founder/Chairman, lives in Vegas)', phone: '(626) 964-2522', email: 'jkonheim@acromil.com',
    catalyst_tags: ['Absentee Owner', 'SLB Potential'], tier: 'A', score: 85,
    priority: 'High', next_action: 'Follow up with Niznick directly', building_sf: 108000,
    notes: 'Aerospace machining. RE owned personally by founder (NOT the company). Niznick lives in Vegas. Estate/succession play.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'lead-5', lead_name: 'Hitex Dyeing and Finishing — 355 Vineland', stage: 'Owner Contacted',
    address: '355 Vineland Ave', submarket: 'Baldwin Park',
    owner: 'Young Kim', owner_type: 'Private', company: 'Hitex Dyeing and Finishing Inc.',
    decision_maker: 'Young Kim (President)', phone: '626-363-0160', email: 'chadykim@hotmail.com',
    catalyst_tags: ['Owner-User', 'SLB Potential'], tier: 'A', score: 80,
    priority: 'High', next_action: 'Schedule meeting', building_sf: null,
    notes: 'Confirmed owner-user. 5ac. Good SLB candidate.',
    created_at: new Date().toISOString(),
  },
];

const DEMO_TASKS = [
  { id: 'task-1', title: 'Call Jerry Kohl re: SLB opportunity', priority: 'High', due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], completed: false, lead_id: 'lead-1', created_at: new Date().toISOString() },
  { id: 'task-2', title: 'Research Snak King PE ownership structure', priority: 'High', due_date: new Date(Date.now() + 172800000).toISOString().split('T')[0], completed: false, lead_id: 'lead-2', created_at: new Date().toISOString() },
  { id: 'task-3', title: 'Pull comps for 918 Radecki Ct LOI', priority: 'High', due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], completed: false, deal_id: 'deal-1', created_at: new Date().toISOString() },
  { id: 'task-4', title: 'Send lease renewal proposal to Pacific Mfg', priority: 'Medium', due_date: new Date(Date.now() + 259200000).toISOString().split('T')[0], completed: false, deal_id: 'deal-2', created_at: new Date().toISOString() },
  { id: 'task-5', title: 'Follow up on Acromil ownership research', priority: 'Medium', due_date: new Date(Date.now() + 432000000).toISOString().split('T')[0], completed: true, lead_id: 'lead-4', created_at: new Date().toISOString() },
];

const DEMO_LEASE_COMPS = [
  { id: 'lc-1', address: '15400 Don Julian Rd', city: 'City of Industry', submarket: 'City of Industry', tenant: 'Amazon', rsf: 185000, rate: 1.52, lease_type: 'NNN', term_months: 60, start_date: '2025-11-01', free_rent_months: 3, ti_psf: 5.00 },
  { id: 'lc-2', address: '1351 Doubleday Ave', city: 'Ontario', submarket: 'Ontario Airport', tenant: 'XPO Logistics', rsf: 72088, rate: 1.38, lease_type: 'NNN', term_months: 36, start_date: '2025-08-01', free_rent_months: 2, ti_psf: 3.00 },
  { id: 'lc-3', address: '9300 Flair Dr', city: 'El Monte', submarket: 'El Monte / South El Monte', tenant: 'Kforce Staffing', rsf: 28000, rate: 1.25, lease_type: 'Modified Gross', term_months: 36, start_date: '2026-01-01', free_rent_months: 1, ti_psf: 2.00 },
];

// ─── GENERIC CRUD ────────────────────────────────────────────

export async function fetchAll(table, options = {}) {
  if (!isConfigured()) {
    if (table === 'properties') return DEMO_PROPERTIES;
    if (table === 'deals') return DEMO_DEALS;
    if (table === 'contacts') return DEMO_CONTACTS;
    if (table === 'lease_comps') return DEMO_LEASE_COMPS;
    if (table === 'accounts') return DEMO_ACCOUNTS;
    if (table === 'leads') return DEMO_LEADS;
    if (table === 'activities') return [];
    if (table === 'tasks') return DEMO_TASKS;
    return [];
  }

  let query = supabase.from(table).select(options.select || '*');

  if (options.order) query = query.order(options.order, { ascending: options.asc ?? false });
  if (options.filters) {
    options.filters.forEach(([col, op, val]) => {
      query = query.filter(col, op, val);
    });
  }
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchOne(table, id) {
  if (!isConfigured()) {
    const demoMap = { properties: DEMO_PROPERTIES, deals: DEMO_DEALS, contacts: DEMO_CONTACTS, lease_comps: DEMO_LEASE_COMPS, accounts: DEMO_ACCOUNTS, leads: DEMO_LEADS };
    return (demoMap[table] || []).find((r) => r.id === id) || null;
  }

  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function insertRow(table, row) {
  if (!isConfigured()) return { ...row, id: `demo-${Date.now()}`, created_at: new Date().toISOString() };

  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, updates) {
  if (!isConfigured()) return { id, ...updates };

  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table, id) {
  if (!isConfigured()) return true;

  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ─── PROPERTY-SPECIFIC (with APNs) ──────────────────────────

export async function fetchProperties() {
  if (!isConfigured()) return DEMO_PROPERTIES;

  const { data, error } = await supabase
    .from('properties_with_apns')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function insertProperty(propData, apns = []) {
  if (!isConfigured()) {
    return { ...propData, id: `demo-${Date.now()}`, apns, created_at: new Date().toISOString() };
  }

  const { data: prop, error: propErr } = await supabase
    .from('properties')
    .insert(propData)
    .select()
    .single();

  if (propErr) throw propErr;

  if (apns.length > 0) {
    const apnRows = apns.map((a) => ({ property_id: prop.id, apn: a.apn, acres: a.acres }));
    const { error: apnErr } = await supabase.from('property_apns').insert(apnRows);
    if (apnErr) throw apnErr;
  }

  return { ...prop, apns };
}

// ─── CONVERT LEAD TO DEAL ────────────────────────────────────

export async function convertLeadToDeal(lead) {
  const dealData = {
    deal_name: lead.lead_name,
    stage: 'Tracking',
    deal_type: 'Investment Sale',
    property_id: lead.property_id || null,
    lead_id: lead.id,
    address: lead.address,
    submarket: lead.submarket,
    seller: lead.owner,
    deal_value: lead.est_value || null,
    priority: lead.priority || 'Medium',
    probability: 50,
    notes: `Converted from Lead Gen on ${new Date().toLocaleDateString()}.\n\n${lead.notes || ''}`,
  };

  if (!isConfigured()) {
    const newDeal = { ...dealData, id: `deal-${Date.now()}`, created_at: new Date().toISOString() };
    return newDeal;
  }

  const { data: deal, error: dealErr } = await supabase.from('deals').insert(dealData).select().single();
  if (dealErr) throw dealErr;

  // Mark lead as converted
  await supabase.from('leads').update({ stage: 'Converted', converted_deal_id: deal.id }).eq('id', lead.id);

  return deal;
}



// ─── CONVERT LEAD TO PROPERTY ────────────────────────────────

export async function convertLeadToProperty(lead) {
  const propData = {
    address: lead.address || null,
    submarket: lead.submarket || null,
    owner: lead.owner || lead.company || null,
    owner_type: lead.owner_type || 'Private',
    building_sf: lead.building_sf || null,
    catalyst_tags: lead.catalyst_tags || [],
    ai_score: lead.score || null,
    probability: lead.score || null,
    notes: 'Converted from Lead Gen on ' + new Date().toLocaleDateString() + '.\n\n' + (lead.notes || ''),
  };

  if (!isConfigured()) {
    const newProp = { ...propData, id: 'prop-' + Date.now(), created_at: new Date().toISOString(), apns: [] };
    return newProp;
  }

  const { data: prop, error: propErr } = await supabase.from('properties').insert(propData).select().single();
  if (propErr) throw propErr;

  // Link lead to the new property
  await supabase.from('leads').update({ property_id: prop.id }).eq('id', lead.id);

  return prop;
}

// ─── SEARCH ──────────────────────────────────────────────────

export async function globalSearch(query) {
  if (!query || query.trim().length < 2) return { properties: [], deals: [], contacts: [] };

  const q = query.toLowerCase().trim();

  if (!isConfigured()) {
    return {
      properties: DEMO_PROPERTIES.filter((p) =>
        [p.address, p.city, p.owner, p.tenant, p.submarket].some((f) => f && f.toLowerCase().includes(q))
      ),
      deals: DEMO_DEALS.filter((d) =>
        [d.deal_name, d.address, d.buyer, d.seller].some((f) => f && f.toLowerCase().includes(q))
      ),
      contacts: DEMO_CONTACTS.filter((c) =>
        [c.name, c.company, c.email].some((f) => f && f.toLowerCase().includes(q))
      ),
    };
  }

  const [props, deals, contacts] = await Promise.all([
    supabase.from('properties').select('id, address, city, market, submarket, building_sf, owner, tenant, probability').or(`address.ilike.%${q}%,city.ilike.%${q}%,owner.ilike.%${q}%,tenant.ilike.%${q}%`).limit(10),
    supabase.from('deals').select('id, deal_name, stage, address, deal_value, probability').or(`deal_name.ilike.%${q}%,address.ilike.%${q}%,buyer.ilike.%${q}%,seller.ilike.%${q}%`).limit(10),
    supabase.from('contacts').select('id, name, company, contact_type, phone, email').or(`name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%`).limit(10),
  ]);

  return {
    properties: props.data || [],
    deals: deals.data || [],
    contacts: contacts.data || [],
  };
}

// ─── DAILY BRIEFS ───────────────────────────────────────────

export async function getTodayBrief() {
  if (!isConfigured()) return null;
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_briefs')
    .select('*')
    .eq('brief_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

export async function saveDailyBrief(content, context = {}) {
  if (!isConfigured()) return { content, brief_date: new Date().toISOString().split('T')[0] };
  const today = new Date().toISOString().split('T')[0];
  // Delete any existing brief for today first, then insert fresh
  await supabase.from('daily_briefs').delete().eq('brief_date', today);
  const { data, error } = await supabase
    .from('daily_briefs')
    .insert({ brief_date: today, content, context })
    .select()
    .single();
  if (error) { console.error('Save brief error:', error); return null; }
  return data;
}
