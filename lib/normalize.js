// ══════════════════════════════════════════════════════════════
// CLERESTORY — Naming Normalization
// Standardizes addresses, company names, and entity names
// ══════════════════════════════════════════════════════════════

const STREET_SUFFIXES = {
  'st': 'St', 'st.': 'St', 'street': 'St',
  'ave': 'Ave', 'ave.': 'Ave', 'avenue': 'Ave',
  'blvd': 'Blvd', 'blvd.': 'Blvd', 'boulevard': 'Blvd',
  'dr': 'Dr', 'dr.': 'Dr', 'drive': 'Dr',
  'rd': 'Rd', 'rd.': 'Rd', 'road': 'Rd',
  'ln': 'Ln', 'ln.': 'Ln', 'lane': 'Ln',
  'ct': 'Ct', 'ct.': 'Ct', 'court': 'Ct',
  'pl': 'Pl', 'pl.': 'Pl', 'place': 'Pl',
  'pkwy': 'Pkwy', 'parkway': 'Pkwy',
  'cir': 'Cir', 'circle': 'Cir',
  'way': 'Way', 'ter': 'Ter', 'terrace': 'Ter',
  'hwy': 'Hwy', 'highway': 'Hwy',
};

const ENTITY_SUFFIXES = {
  'llc': 'LLC', 'l.l.c.': 'LLC', 'l.l.c': 'LLC',
  'inc': 'Inc', 'inc.': 'Inc', 'incorporated': 'Inc',
  'corp': 'Corp', 'corp.': 'Corp', 'corporation': 'Corp',
  'co': 'Co', 'co.': 'Co', 'company': 'Co',
  'lp': 'LP', 'l.p.': 'LP', 'l.p': 'LP',
  'ltd': 'Ltd', 'ltd.': 'Ltd', 'limited': 'Ltd',
  'reit': 'REIT', 'etf': 'ETF',
};

const DIRECTIONALS = {
  'n': 'N', 'n.': 'N', 'north': 'N',
  's': 'S', 's.': 'S', 'south': 'S',
  'e': 'E', 'e.': 'E', 'east': 'E',
  'w': 'W', 'w.': 'W', 'west': 'W',
  'ne': 'NE', 'nw': 'NW', 'se': 'SE', 'sw': 'SW',
};

const LOWERCASE_WORDS = ['the', 'of', 'and', 'a', 'an', 'in', 'at', 'by', 'for', 'on', 'to', 'or', 'de', 'del', 'la', 'el'];

/**
 * Normalize an entity/company/person name.
 * Handles: LLC/Inc/Corp suffixes, title case, lowercase prepositions.
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return name;
  let s = name.trim().replace(/\s+/g, ' ');
  if (!s) return s;

  s = s.replace(/\b\w+\.?\b/g, (w, idx) => {
    const lower = w.toLowerCase().replace(/\.$/, '');
    const lowerDot = w.toLowerCase();
    // Entity suffixes stay uppercase
    if (ENTITY_SUFFIXES[lowerDot] || ENTITY_SUFFIXES[lower]) return ENTITY_SUFFIXES[lowerDot] || ENTITY_SUFFIXES[lower];
    // Directionals
    if (DIRECTIONALS[lowerDot] || DIRECTIONALS[lower]) return DIRECTIONALS[lowerDot] || DIRECTIONALS[lower];
    // Lowercase prepositions (not at start)
    if (idx > 0 && LOWERCASE_WORDS.includes(lower)) return lower;
    // Title case
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  // Ensure first char is always capitalized
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Normalize a street address.
 * Handles: directionals, street suffixes, consistent formatting.
 */
export function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'string') return addr;
  let s = addr.trim().replace(/\s+/g, ' ');
  if (!s) return s;

  s = s.replace(/\b\w+\.?\b/g, (w) => {
    const lower = w.toLowerCase().replace(/\.$/, '');
    const lowerDot = w.toLowerCase();
    if (STREET_SUFFIXES[lowerDot] || STREET_SUFFIXES[lower]) return STREET_SUFFIXES[lowerDot] || STREET_SUFFIXES[lower];
    if (DIRECTIONALS[lowerDot] || DIRECTIONALS[lower]) return DIRECTIONALS[lowerDot] || DIRECTIONALS[lower];
    return w;
  });

  // Capitalize first letter of each word
  s = s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  return s;
}

/**
 * Normalize a city name.
 */
export function normalizeCity(city) {
  return normalizeName(city);
}

/**
 * Batch-normalize an array of records (in-place).
 * Fields: address, city, owner, tenant, landlord, buyer, seller, company, name.
 */
export function normalizeRecords(records) {
  return records.map(r => {
    const out = { ...r };
    if (out.address) out.address = normalizeAddress(out.address);
    if (out.city) out.city = normalizeCity(out.city);
    if (out.owner) out.owner = normalizeName(out.owner);
    if (out.tenant) out.tenant = normalizeName(out.tenant);
    if (out.landlord) out.landlord = normalizeName(out.landlord);
    if (out.buyer) out.buyer = normalizeName(out.buyer);
    if (out.seller) out.seller = normalizeName(out.seller);
    if (out.company) out.company = normalizeName(out.company);
    if (out.name) out.name = normalizeName(out.name);
    return out;
  });
}
