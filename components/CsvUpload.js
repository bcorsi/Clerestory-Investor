'use client';

import { useState, useRef } from 'react';
import { insertProperty, insertRow } from '../lib/db';

// Column name mapping — flexible to handle common variations
const COL_MAP = {
  // Properties
  address: ['address', 'street address', 'street', 'property address', 'location'],
  city: ['city', 'municipality'],
  zip: ['zip', 'zip code', 'zipcode', 'postal code', 'postal'],
  market: ['market', 'mkt'],
  submarket: ['submarket', 'sub market', 'sub-market', 'micro market'],
  record_type: ['record type', 'record_type', 'type'],
  prop_type: ['property type', 'prop type', 'prop_type', 'use type', 'building type'],
  building_sf: ['building sf', 'building_sf', 'sf', 'square feet', 'sqft', 'rsf', 'rentable sf', 'gla', 'size'],
  land_acres: ['land acres', 'land_acres', 'acres', 'acreage', 'lot size'],
  year_built: ['year built', 'year_built', 'yr built', 'vintage'],
  clear_height: ['clear height', 'clear_height', 'clear ht', 'ceiling height'],
  dock_doors: ['dock doors', 'dock_doors', 'docks'],
  grade_doors: ['grade doors', 'grade_doors', 'grade level', 'gl doors'],
  owner: ['owner', 'owner name', 'property owner', 'ownership'],
  owner_type: ['owner type', 'owner_type', 'ownership type'],
  tenant: ['tenant', 'tenant name', 'occupant', 'lessee'],
  vacancy_status: ['vacancy status', 'vacancy_status', 'vacancy', 'status', 'occupancy'],
  lease_type: ['lease type', 'lease_type', 'rent type'],
  lease_expiration: ['lease expiration', 'lease_expiration', 'lease exp', 'expiration', 'lease end'],
  in_place_rent: ['in place rent', 'in_place_rent', 'rent', 'rate', 'asking rent', 'contract rent'],
  probability: ['probability', 'prob', 'probability %'],
  notes: ['notes', 'comments', 'description'],
  // APNs
  apn: ['apn', 'apn1', 'assessor parcel', 'parcel number', 'parcel'],
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
              address: mapped.address || null,
              city: mapped.city || null,
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
              owner: mapped.owner || null,
              owner_type: mapped.owner_type || null,
              tenant: mapped.tenant || null,
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
              address: mapped.address || null,
              city: mapped.city || null,
              submarket: mapped.submarket || null,
              tenant: mapped.tenant || null,
              rsf: parseNum(mapped.building_sf),
              rate: parseNum(mapped.in_place_rent),
              lease_type: mapped.lease_type || null,
              notes: mapped.notes || null,
            };
            if (data.address) { await insertRow('lease_comps', data); imported++; }
          } else if (target === 'contacts') {
            const data = { name: mapped.name || raw[headers[0]], notes: mapped.notes || null };
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
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                  <strong>{file.name}</strong> · {preview.totalRows} rows · {Object.keys(preview.colMapping).length}/{preview.headers.length} columns mapped
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPreview(null); }}>Change file</button>
              </div>

              {/* Column mapping preview */}
              <div style={{ marginBottom: '16px', fontSize: '15px' }}>
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
                        <th key={h} style={{ fontSize: '15px', padding: '6px 8px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i}>
                        {preview.headers.map((h) => (
                          <td key={h} style={{ fontSize: '15px', padding: '4px 8px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row[h]}</td>
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
                <div style={{ fontSize: '15px', color: 'var(--red)' }}>{result.errors} errors (check console for details)</div>
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
