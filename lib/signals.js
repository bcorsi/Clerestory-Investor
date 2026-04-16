/* ═══════════════════════════════════════════════════════════
   Clerestory Signal Engine
   lib/signals.js

   Auto-generates signal strings from property data in the
   same format as the IE West Market Intelligence Column W:
   "LISTED 199d · DEBT 2026 · Prime hold 83mo · Partial vacant 63%"

   Also provides the AI synthesis prompt template that
   produces deal intelligence in Briana's research style.
   ═══════════════════════════════════════════════════════════ */

// ── SIGNAL STRING GENERATOR ───────────────────────────────
// Produces a one-line signal summary from property data
export function generateSignalString(property) {
  if (!property) return '';
  const p = property;
  const signals = [];

  // Hold period classification
  const lastSale = p.last_transfer_date ? new Date(p.last_transfer_date) : null;
  if (lastSale) {
    const holdMo = Math.round((new Date() - lastSale) / (1e3 * 60 * 60 * 24 * 30.44));
    const saleYr = lastSale.getFullYear();

    if (holdMo >= 240) signals.push(`LEGACY hold ${holdMo}mo`);
    else if (holdMo >= 120) signals.push(`Long hold ${holdMo}mo`);
    else if (holdMo >= 84) signals.push(`Mature hold ${holdMo}mo`);
    else if (holdMo >= 24) signals.push(`Prime hold ${holdMo}mo`);

    // Purchase era
    if (saleYr <= 2010) signals.push(`Pre-2010 buy ${saleYr}`);
    else if (saleYr <= 2015) signals.push(`Pre-2015 buy ${saleYr}`);
    else if (saleYr <= 2019) signals.push(`Pre-COVID buy ${saleYr}`);
    else if (saleYr >= 2020 && saleYr <= 2022) signals.push(`Peak buy ${saleYr}`);
    else signals.push(`Recent purchase`);
  }

  // Vacancy
  const vac = (p.vacancy_status || '').toLowerCase();
  if (vac === 'vacant' || vac === 'available') {
    signals.push('VACANT 100%');
  } else if (vac.includes('partial')) {
    signals.push('Partial vacant');
  }

  // Lease expiry
  if (p.lease_expiration) {
    const leaseDate = new Date(p.lease_expiration);
    const moToExp = Math.round((leaseDate - new Date()) / (1e3 * 60 * 60 * 24 * 30.44));
    if (moToExp <= 0) signals.push('Lease EXPIRED');
    else if (moToExp <= 12) signals.push(`Lease ${moToExp}mo`);
    else if (moToExp <= 24) signals.push(`Lease expiry ${moToExp}mo`);
  }

  // Owner type
  const ownerType = (p.owner_type || '').toLowerCase();
  if (ownerType.includes('institutional') || ownerType.includes('reit')) signals.push('Instl/REIT owner');
  else if (ownerType.includes('private equity') || ownerType.includes('pe')) signals.push('PE owner');
  else if (ownerType.includes('private')) signals.push('Private owner');
  else if (ownerType.includes('trust') || ownerType.includes('estate')) signals.push('Trust/Estate');
  else if (ownerType.includes('owner') && ownerType.includes('user')) signals.push('Owner-occupant');

  // Rent dislocation
  if (p.in_place_rent && p.market_rent && p.market_rent > 0) {
    const spread = ((p.market_rent - p.in_place_rent) / p.market_rent) * 100;
    if (spread >= 25) signals.push(`${spread.toFixed(0)}% below mkt`);
    else if (spread >= 15) signals.push(`Below market rent`);
  }

  // SLB
  if (p.slb_corridor) signals.push('SLB corridor');

  // WARN
  if ((p.catalyst_tags || []).some(t => t.toLowerCase().includes('warn'))) signals.push('WARN filing');

  // Building status
  if (p.building_status && p.building_status !== 'Existing') signals.push(p.building_status);

  return signals.join(' · ');
}

// ── EQUITY GAP CALCULATOR ─────────────────────────────────
export function getEquityGap(lastTransferDate) {
  if (!lastTransferDate) return null;
  const yr = new Date(lastTransferDate).getFullYear();
  if (yr <= 2010) return { label: 'Pre-2010 basis — 3-5x appreciation', icon: '🔥', color: '#B83714', priority: 'Priority Call', multiplier: '3-5x' };
  if (yr <= 2015) return { label: 'Pre-2015 basis — 2-3x appreciation', icon: '⭐', color: '#8C5A04', priority: 'Priority Call', multiplier: '2-3x' };
  if (yr <= 2020) return { label: 'Pre-2020 basis — 1.5-2x appreciation', icon: '✅', color: '#4E6E96', priority: 'Call List', multiplier: '1.5-2x' };
  return { label: 'Recent purchase', icon: '—', color: '#6E6860', priority: 'Call List', multiplier: '1x' };
}

// ── AI SYNTHESIS PROMPT ───────────────────────────────────
// This prompt produces the exact rhetoric style from Briana's
// deal intelligence research — company intel, signal stacking,
// basis dislocation, comp evidence, clear verdict.
//
// Used by PropertyDetail AI Synthesis and the Research Agent.
export function buildSynthesisPrompt(property, extras = {}) {
  const p = property;
  const signalStr = generateSignalString(p);
  const eq = getEquityGap(p.last_transfer_date);
  const holdMo = p.last_transfer_date ? Math.round((new Date() - new Date(p.last_transfer_date)) / (1e3 * 60 * 60 * 24 * 30.44)) : null;

  const context = [
    `Address: ${p.address || '—'}, ${p.city || '—'}`,
    `Market: ${p.market || '—'} · ${p.submarket || '—'}`,
    `Building: ${p.building_sf ? Number(p.building_sf).toLocaleString() + ' SF' : '—'} · ${p.clear_height ? p.clear_height + "' clear" : '—'} · ${p.year_built || '—'}`,
    `Land: ${p.land_acres ? p.land_acres + ' acres' : '—'}`,
    `Owner: ${p.owner || '—'} (${p.owner_type || 'Unknown type'})`,
    p.last_transfer_date ? `Acquired: ${new Date(p.last_transfer_date).getFullYear()} (${holdMo} months ago)` : null,
    p.last_sale_price ? `Last sale: $${Number(p.last_sale_price).toLocaleString()}${p.price_psf ? ` ($${Number(p.price_psf).toFixed(0)}/SF)` : ''}` : null,
    eq ? `Equity gap: ${eq.label}` : null,
    `Tenant: ${p.tenant || 'Vacant'}`,
    `Vacancy: ${p.vacancy_status || '—'}`,
    p.lease_expiration ? `Lease expires: ${p.lease_expiration}` : null,
    p.in_place_rent ? `In-place rent: $${Number(p.in_place_rent).toFixed(2)}/SF` : null,
    p.market_rent ? `Market rent: $${Number(p.market_rent).toFixed(2)}/SF` : null,
    p.dock_doors ? `Dock doors: ${p.dock_doors}` : null,
    p.truck_court_depth ? `Truck court: ${p.truck_court_depth}'` : null,
    signalStr ? `Active signals: ${signalStr}` : null,
    (p.catalyst_tags || []).length > 0 ? `Catalyst tags: ${p.catalyst_tags.join(', ')}` : null,
  ].filter(Boolean).join('\n');

  // Recent activities if provided
  const activityLines = (extras.activities || []).slice(0, 5).map(a =>
    `${a.activity_type || 'note'}: ${a.subject || '—'}${a.body ? ' — ' + a.body : ''} (${a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'})`
  ).join('\n');

  // Nearby comps if provided
  const compLines = (extras.comps || []).slice(0, 5).map(c =>
    `${c.address || '—'}: ${c.building_sf ? Number(c.building_sf).toLocaleString() + ' SF' : '—'} @ $${c.price_psf || c.rate || '—'}/SF (${c.sale_date || c.start_date || '—'})`
  ).join('\n');

  return `You are Clerestory, an AI acquisition intelligence system for institutional industrial real estate investors in Southern California.

Write a deal intelligence brief for this property. Your writing style should match this exact pattern:

STYLE GUIDE (follow this precisely):
• Lead with the COMPANY — who they are, what they do, revenue if known, employee count, industry
• Then the OWNER SIGNAL — founder age/succession, PE backing, leadership changes, out-of-state HQ, absentee owner, estate/trust structure
• Then the PROPERTY SIGNAL — hold period, basis dislocation (${eq ? eq.multiplier + ' appreciation' : 'calculate from acquisition year'}), vacancy, lease vintage, rent spread
• Then COMP EVIDENCE — cite specific nearby sales with $/SF, buyer name, and date. Example: "TA Realty bought 120 Puente @ $363/SF. Rexford active on Nelson corridor."
• End with a CLEAR VERDICT — one sentence: "STRONGEST sale-leaseback candidate — founders aging, no succession plan, massive RE basis dislocation." or "WATCH — institutional hold cycle not yet mature, 36mo to disposition window."

EXAMPLES OF GOOD OUTPUT:
"Brighton Collectibles = 180+ retail stores. Founded 1972. Jerry Kohl ~mid-70s, late career. HQ IS the property. Private family-owned. $100M+ revenue. STRONGEST sale-leaseback candidate — founders aging, no public succession plan, massive RE basis dislocation."

"PE-BACKED by Falfurrias Capital Partners since Aug 2024. New CEO Oct 2025 replacing 40-year founder. Leadership transition + PE = STRONGEST disposition signal in the entire dataset."

"Aerospace machining. RE owned personally by founder Gerald Niznick (NOT the company). Niznick lives in Las Vegas = absentee owner. Estate planning / succession play."

DO NOT:
• Write generic corporate analysis
• Use phrases like "Based on the available data" or "It appears that"
• Hedge with "may" "might" "could potentially"
• Write more than 4-5 sentences
• Skip the comp evidence section

PROPERTY DATA:
${context}
${activityLines ? '\nRECENT ACTIVITY:\n' + activityLines : ''}
${compLines ? '\nNEARBY COMPS:\n' + compLines : ''}

Write the brief now. Be specific. Use numbers. Name names. Give a clear action recommendation.`;
}
