'use client';

import { useState, useRef } from 'react';
import { insertProperty, insertRow } from '../lib/db';

// ── Naming Normalization ──────────────────────────────────────
// Standardizes company/owner/tenant names for consistency

const STREET_SUFFIXES = { 'st': 'St', 'st.': 'St', 'street': 'St', 'ave': 'Ave', 'ave.': 'Ave', 'avenue': 'Ave', 'blvd': 'Blvd', 'blvd.': 'Blvd', 'boulevard': 'Blvd', 'dr': 'Dr', 'dr.': 'Dr', 'drive': 'Dr', 'rd': 'Rd', 'rd.': 'Rd', 'road': 'Rd', 'ln': 'Ln', 'ln.': 'Ln', 'lane': 'Ln', 'ct': 'Ct', 'ct.': 'Ct', 'court': 'Ct', 'pl': 'Pl', 'pl.': 'Pl', 'place': 'Pl', 'pkwy': 'Pkwy', 'parkway': 'Pkwy', 'cir': 'Cir', 'circle': 'Cir', 'way': 'Way' };
const ENTITY_SUFFIXES = { 'llc': 'LLC', 'l.l.c.': 'LLC', 'inc': 'Inc', 'inc.': 'Inc', 'incorporated': 'Inc', 'corp': 'Corp', 'corp.': 'Corp', 'corporation': 'Corp', 'co': 'Co', 'co.': 'Co', 'company': 'Co', 'lp': 'LP', 'l.p.': 'LP', 'ltd': 'Ltd', 'ltd.': 'Ltd', 'limited': 'Ltd' };
const DIRECTIONALS = { 'n': 'N', 'n.': 'N', 'north': 'N', 's': 'S', 's.': 'S', 'south': 'S', 'e': 'E', 'e.': 'E', 'east': 'E', 'w': 'W', 'w.': 'W', 'west': 'W' };

function normalizeName(name) {
  if (!name || typeof name !== 'string') return name;
  let s = name.trim().replace(/\s+/g, ' ');
  // Title case
  s = s.replace(/\b\w+/g, (w) => {
    const lower = w.toLowerCase();
    if (ENTITY_SUFFIXES[lower]) return ENTITY_SUFFIXES[lower];
    if (STREET_SUFFIXES[lower]) return STREET_SUFFIXES[lower];
    if (DIRECTIONALS[lower]) return DIRECTIONALS[lower];
    if (['the', 'of', 'and', 'a', 'an', 'in', 'at', 'by', 'for', 'on', 'to'].includes(lower) && s.indexOf(w) > 0) return lower;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
  // Ensure first letter is always capitalized
  if (s.length) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'string') return addr;
  let s = addr.trim().replace(/\s+/g, ' ');
  // Normalize street suffixes and directionals
  s = s.replace(/\b\w+\.?\b/g, (w) => {
    const lower = w.toLowerCase().replace(/\.$/, '');
    if (STREET_SUFFIXES[lower + '.'] || STREET_SUFFIXES[lower]) return STREET_SUFFIXES[lower + '.'] || STREET_SUFFIXES[lower];
    if (DIRECTIONALS[lower + '.'] || DIRECTIONALS[lower]) return DIRECTIONALS[lower + '.'] || DIRECTIONALS[lower];
    return w;
  });
  // Capitalize first letter of each word
  s = s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  return s;
}

// Column name mapping — flexible to handle common variations
const COL_MAP = {
  // ── Properties ─────────────────────────────────────
  address: ['address', 'street address', 'street', 'property address', 'location', 'property'],
  city: ['city', 'municipality', 'city/community'],
  zip: ['zip', 'zip code', 'zipcode', 'postal code', 'postal'],
  market: ['market', 'mkt', 'region'],
  submarket: ['submarket', 'sub market', 'sub-market', 'micro market', 'submarket/area'],
  record_type: ['record type', 'record_type', 'type'],
  prop_type: ['property type', 'prop type', 'prop_type', 'use type', 'building type', 'product type'],
  building_sf: ['building sf', 'building_sf', 'sf', 'square feet', 'sqft', 'rsf', 'rentable sf', 'gla', 'size', 'building size', 'bldg sf', 'total sf'],
  land_acres: ['land acres', 'land_acres', 'acres', 'acreage', 'lot size', 'site acres', 'land area'],
  year_built: ['year built', 'year_built', 'yr built', 'vintage', 'built'],
  clear_height: ['clear height', 'clear_height', 'clear ht', 'ceiling height', 'clear'],
  dock_doors: ['dock doors', 'dock_doors', 'docks', 'dock high doors', 'dh doors'],
  grade_doors: ['grade doors', 'grade_doors', 'grade level', 'gl doors', 'grade level doors'],
  owner: ['owner', 'owner name', 'property owner', 'ownership', 'landlord'],
  owner_type: ['owner type', 'owner_type', 'ownership type'],
  tenant: ['tenant', 'tenant name', 'occupant', 'lessee', 'tenant/buyer'],
  vacancy_status: ['vacancy status', 'vacancy_status', 'vacancy', 'status', 'occupancy'],
  lease_type: ['lease type', 'lease_type', 'rent type', 'lease structure'],
  lease_expiration: ['lease expiration', 'lease_expiration', 'lease exp', 'expiration', 'lease end', 'expiration date'],
  in_place_rent: ['in place rent', 'in_place_rent', 'rent', 'asking rent', 'contract rent', 'current rent'],
  probability: ['probability', 'prob', 'probability %'],
  notes: ['notes', 'comments', 'description', 'comment'],
  apn: ['apn', 'apn1', 'assessor parcel', 'parcel number', 'parcel'],

  // ── Lease Comps (full field set) ───────────────────
  rate: ['rate', 'lease rate', 'asking rate', 'nnn rate', 'starting rate', 'base rate', 'rent/sf/mo', 'monthly rate', 'rate psf', 'rate (psf/mo)', '$/sf/mo'],
  gross_equivalent: ['gross equivalent', 'gross equiv', 'gross_equivalent', 'gross rate', 'effective gross', 'all-in rate'],
  total_expenses_psf: ['expenses', 'total expenses', 'total_expenses_psf', 'opex', 'expense load', 'cam', 'cam/sf', 'nnn expenses', 'nnn charges', 'operating expenses'],
  term_months: ['term', 'term months', 'term_months', 'lease term', 'months', 'term (months)', 'lease term (mo)'],
  start_date: ['start date', 'start_date', 'lease start', 'commencement', 'commence date', 'lease date', 'execution date', 'date', 'deal date', 'transaction date', 'lease commencement'],
  end_date: ['end date', 'end_date', 'lease end', 'expiration', 'expiration date'],
  free_rent_months: ['free rent', 'free_rent_months', 'free rent months', 'fr', 'fr months', 'abated rent', 'rent abatement', 'concession months'],
  ti_psf: ['ti', 'ti psf', 'ti_psf', 'tenant improvements', 'ti/sf', 'ti per sf', 'tenant improvement', 'ti allowance', 'improvement allowance'],
  escalation: ['escalation', 'escalations', 'annual escalation', 'bumps', 'annual increase', 'rent bumps', 'annual bump', 'escalation %'],
  deal_type: ['deal type', 'deal_type', 'transaction type', 'trans type', 'transaction', 'type of transaction', 'lease/sale'],
  broker: ['broker', 'listing broker', 'broker name', 'leasing broker', 'rep broker'],
  landlord: ['landlord', 'landlord name', 'lessor', 'll', 'owner/landlord'],
  source: ['source', 'data source', 'comp source'],

  // ── Sale Comps ─────────────────────────────────────
  sale_price: ['sale price', 'sale_price', 'price', 'purchase price', 'sold price', 'total price', 'consideration'],
  price_psf: ['price psf', 'price_psf', '$/sf', 'price/sf', 'psf', 'per sf', 'price per sf'],
  cap_rate: ['cap rate', 'cap_rate', 'cap', 'oir', 'capitalization rate', 'going in cap'],
  sale_date: ['sale date', 'sale_date', 'close date', 'closing date', 'sold date', 'recorded date', 'date of sale'],
  sale_type: ['sale type', 'sale_type', 'transaction type', 'deal type'],
  buyer: ['buyer', 'buyer name', 'purchaser', 'grantee', 'acquiring party'],
  seller: ['seller', 'seller name', 'vendor', 'grantor', 'disposing party'],

  // ── Contacts ───────────────────────────────────────
  name: ['name', 'full name', 'contact name', 'person'],
  company: ['company', 'company name', 'firm', 'organization'],
  email: ['email', 'email address', 'e-mail'],
  phone: ['phone', 'phone number', 'telephone', 'tel', 'mobile'],
  contact_type: ['contact type', 'contact_type', 'role', 'type'],
};

function mapColumns(headers) {
  const mapping = {};
  headers.forEach((h) => {
    const lower = h.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(COL_MAP)) {
      if (aliases.includes(lower)) {
        mapping[h] = field;
        break;
      }
    }
  });
  return mapping;
}

function parseNum(val) {
  if (!val || val === '') return null;
  const cleaned = String(val).replace(/[$,%\s]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export default function CsvUpload({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [target, setTarget] = useState('properties');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"/, '').replace(/"$/, ''));
      const rows = lines.slice(1, 6).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/^"/, '').replace(/"$/, ''));
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ''; });
        return row;
      });
      const colMapping = mapColumns(headers);
      setPreview({ headers, rows, colMapping, totalRows: lines.length - 1 });
    };
    reader.readAsText(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.tsv'))) handleFile(f);
  };

  const doImport = async () => {
    if (!file || !preview) return;
    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"/, '').replace(/"$/, ''));
      const colMapping = preview.colMapping;

      let imported = 0;
      let errors = 0;

      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map((v) => v.trim().replace(/^"/, '').replace(/"$/, ''));
        const raw = {};
        headers.forEach((h, idx) => { raw[h] = vals[idx] || ''; });

        const mapped = {};
        for (const [csvCol, dbField] of Object.entries(colMapping)) {
          if (raw[csvCol] !== undefined) mapped[dbField] = raw[csvCol];
        }

        try {
          if (target === 'properties') {
            const propData = {
              address: normalizeAddress(mapped.address) || null,
              city: normalizeName(mapped.city) || null,
              zip: mapped.zip || null,
              market: mapped.market || null,
              submarket: mapped.submarket || null,
              record_type: mapped.record_type || null,
              prop_type: mapped.prop_type || null,
              building_sf: parseNum(mapped.building_sf),
              land_acres: parseNum(mapped.land_acres),
              year_built: parseNum(mapped.year_built),
              clear_height: parseNum(mapped.clear_height),
              dock_doors: parseNum(mapped.dock_doors),
              grade_doors: parseNum(mapped.grade_doors),
              owner: normalizeName(mapped.owner) || null,
              owner_type: mapped.owner_type || null,
              tenant: normalizeName(mapped.tenant) || null,
              vacancy_status: mapped.vacancy_status || null,
              lease_type: mapped.lease_type || null,
              lease_expiration: mapped.lease_expiration || null,
              in_place_rent: parseNum(mapped.in_place_rent),
              probability: parseNum(mapped.probability),
              notes: mapped.notes || null,
            };
            // Collect APNs from multiple columns
            const apns = [];
            if (mapped.apn) apns.push({ apn: mapped.apn, acres: parseNum(mapped.land_acres) });
            // Check for APN2, APN3, etc.
            for (let a = 2; a <= 5; a++) {
              const apnKey = headers.find((h) => h.toLowerCase().trim() === `apn${a}`);
              const acreKey = headers.find((h) => h.toLowerCase().trim() === `acres${a}`);
              if (apnKey && raw[apnKey]) {
                apns.push({ apn: raw[apnKey], acres: acreKey ? parseNum(raw[acreKey]) : null });
              }
            }

            if (propData.address) {
              await insertProperty(propData, apns);
              imported++;
            }
          } else if (target === 'lease_comps') {
            const data = {
              address: normalizeAddress(mapped.address) || null,
              city: normalizeName(mapped.city) || null,
              submarket: mapped.submarket || null,
              tenant: normalizeName(mapped.tenant) || null,
              landlord: normalizeName(mapped.landlord || mapped.owner) || null,
              rsf: parseNum(mapped.building_sf || mapped.rsf),
              rate: parseNum(mapped.rate || mapped.in_place_rent),
              gross_equivalent: parseNum(mapped.gross_equivalent),
              total_expenses_psf: parseNum(mapped.total_expenses_psf),
              lease_type: mapped.lease_type || null,
              term_months: parseNum(mapped.term_months),
              start_date: mapped.start_date || null,
              end_date: mapped.end_date || null,
              free_rent_months: parseNum(mapped.free_rent_months),
              ti_psf: parseNum(mapped.ti_psf),
              escalation: mapped.escalation || null,
              deal_type: mapped.deal_type || null,
              broker: mapped.broker || null,
              source: mapped.source || null,
              notes: mapped.notes || null,
            };
            // Auto-calculate gross equivalent if NNN rate + expenses provided
            if (!data.gross_equivalent && data.rate && data.total_expenses_psf) {
              data.gross_equivalent = data.rate + data.total_expenses_psf;
            }
            // Parse term from start/end dates if not provided
            if (!data.term_months && data.start_date && data.end_date) {
              try {
                const s = new Date(data.start_date);
                const e = new Date(data.end_date);
                data.term_months = Math.round((e - s) / (1000 * 60 * 60 * 24 * 30.44));
              } catch {}
            }
            if (data.address || data.tenant) { await insertRow('lease_comps', data); imported++; }
          } else if (target === 'sale_comps') {
            const data = {
              address: normalizeAddress(mapped.address) || null,
              city: normalizeName(mapped.city) || null,
              submarket: mapped.submarket || null,
              building_sf: parseNum(mapped.building_sf),
              land_acres: parseNum(mapped.land_acres),
              year_built: parseNum(mapped.year_built),
              clear_height: parseNum(mapped.clear_height),
              sale_price: parseNum(mapped.sale_price),
              price_psf: parseNum(mapped.price_psf),
              cap_rate: parseNum(mapped.cap_rate),
              sale_date: mapped.sale_date || mapped.start_date || null,
              sale_type: mapped.sale_type || mapped.deal_type || null,
              buyer: normalizeName(mapped.buyer) || null,
              seller: normalizeName(mapped.seller || mapped.owner) || null,
              notes: mapped.notes || null,
            };
            // Auto-calculate $/SF if not provided
            if (!data.price_psf && data.sale_price && data.building_sf) {
              data.price_psf = Math.round(data.sale_price / data.building_sf);
            }
            if (data.address) { await insertRow('sale_comps', data); imported++; }
          } else if (target === 'contacts') {
            const data = {
              name: normalizeName(mapped.name || raw[headers[0]]) || null,
              company: normalizeName(mapped.company) || null,
              email: mapped.email || null,
              phone: mapped.phone || null,
              contact_type: mapped.contact_type || null,
              notes: mapped.notes || null,
            };
            if (data.name) { await insertRow('contacts', data); imported++; }
          }
        } catch (err) {
          errors++;
          console.error(`Row ${i} error:`, err);
        }
      }

      setResult({ imported, errors, total: lines.length - 1 });
    } catch (err) {
      console.error('Import error:', err);
      setResult({ imported: 0, errors: 1, total: 0 });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import CSV</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Target */}
          <div className="form-group">
            <label className="form-label">Import into</label>
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value)} style={{ maxWidth: '200px' }}>
              <option value="properties">Properties</option>
              <option value="lease_comps">Lease Comps</option>
              <option value="sale_comps">Sale Comps</option>
              <option value="contacts">Contacts</option>
            </select>
          </div>

          {/* Drop zone */}
          {!file && (
            <div
              className={`upload-zone ${dragging ? 'dragging' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="upload-zone-icon">↑</div>
              <div className="upload-zone-text">Drop your CSV here or click to browse</div>
              <div className="upload-zone-sub">Supports .csv and .tsv files</div>
              <input ref={fileRef} type="file" accept=".csv,.tsv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
            </div>
          )}

          {/* Preview */}
          {preview && !result && (
            <div>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{  color: 'var(--text-secondary)' }}>
                  <strong>{file.name}</strong> · {preview.totalRows} rows · {Object.keys(preview.colMapping).length}/{preview.headers.length} columns mapped
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPreview(null); }}>Change file</button>
              </div>

              {/* Column mapping preview */}
              <div style={{ marginBottom: '16px',  }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {preview.headers.map((h) => {
                    const mapped = preview.colMapping[h];
                    return (
                      <span key={h} className={`tag ${mapped ? 'tag-green' : 'tag-ghost'}`}>
                        {h} {mapped ? `→ ${mapped}` : '(unmapped)'}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Data preview */}
              <div style={{ overflow: 'auto', maxHeight: '200px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <table>
                  <thead>
                    <tr>
                      {preview.headers.map((h) => (
                        <th key={h} style={{  padding: '6px 8px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i}>
                        {preview.headers.map((h) => (
                          <td key={h} style={{  padding: '4px 8px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>{result.errors === 0 ? '✓' : '⚠'}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                {result.imported} of {result.total} rows imported
              </div>
              {result.errors > 0 && (
                <div style={{  color: 'var(--red)' }}>{result.errors} errors (check console for details)</div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {result ? (
            <button className="btn btn-primary" onClick={onDone}>Done</button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={doImport} disabled={!preview || importing}>
                {importing ? 'Importing...' : `Import ${preview?.totalRows || 0} rows`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
