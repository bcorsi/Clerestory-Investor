'use client';

import { useState } from 'react';
import { updateRow } from '../lib/db';

// ─── BUILDING SCORE ───────────────────────────────────────────
// Returns { score: 0-100, grade: 'A+'/A/B+/B/C, breakdown: [...] }
export function calculateBuildingScore(record) {
  const r = record || {};
  let score = 0;
  const breakdown = [];

  // 1. CLEAR HEIGHT (25 pts)
  const ch = parseInt(r.clear_height) || 0;
  const chPts = ch >= 40 ? 25 : ch >= 36 ? 20 : ch >= 32 ? 15 : ch >= 28 ? 10 : ch >= 24 ? 5 : 0;
  if (ch > 0) { score += chPts; breakdown.push({ label: `Clear Height (${ch}')`, pts: chPts, max: 25 }); }

  // 2. DOCK-HIGH RATIO (20 pts) — dock doors per 10,000 SF
  const sf = parseInt(r.building_sf) || 0;
  const dd = parseInt(r.dock_doors) || 0;
  const dhRatio = sf > 0 ? (dd / (sf / 10000)) : 0;
  const dhPts = dhRatio >= 1.0 ? 20 : dhRatio >= 0.7 ? 15 : dhRatio >= 0.5 ? 10 : dhRatio >= 0.3 ? 5 : 0;
  if (sf > 0 && dd >= 0) { score += dhPts; breakdown.push({ label: `DH Ratio (${dhRatio.toFixed(2)}/10k SF)`, pts: dhPts, max: 20 }); }

  // 3. TRUCK COURT DEPTH (20 pts)
  const tc = parseInt(r.truck_court_depth) || 0;
  const tcPts = tc >= 185 ? 20 : tc >= 135 ? 15 : tc >= 100 ? 10 : tc > 0 ? 3 : 0;
  if (tc > 0) { score += tcPts; breakdown.push({ label: `Truck Court (${tc}')`, pts: tcPts, max: 20 }); }

  // 4. OFFICE % (15 pts) — lower is better for industrial
  const offPct = parseInt(r.office_pct) || 0;
  const offPts = offPct === 0 ? 15 : offPct <= 5 ? 15 : offPct <= 10 ? 12 : offPct <= 15 ? 8 : offPct <= 25 ? 4 : 0;
  if (r.office_pct != null) { score += offPts; breakdown.push({ label: `Office % (${offPct}%)`, pts: offPts, max: 15 }); }

  // 5. POWER (10 pts)
  const amps = parseInt(r.power_amps) || 0;
  const ampPts = amps >= 2000 ? 10 : amps >= 1200 ? 7 : amps >= 800 ? 4 : amps > 0 ? 2 : 0;
  if (amps > 0) { score += ampPts; breakdown.push({ label: `Power (${amps}A)`, pts: ampPts, max: 10 }); }

  // 6. AGE / VINTAGE (10 pts)
  const yr = parseInt(r.year_built) || 0;
  const agePts = yr >= 2015 ? 10 : yr >= 2005 ? 8 : yr >= 1995 ? 5 : yr >= 1985 ? 2 : yr > 0 ? 0 : 0;
  if (yr > 0) { score += agePts; breakdown.push({ label: `Vintage (${yr})`, pts: agePts, max: 10 }); }

  const grade = score >= 85 ? 'A+' : score >= 70 ? 'A' : score >= 55 ? 'B+' : score >= 40 ? 'B' : 'C';
  return { score, grade, breakdown };
}

// ─── CALCULATED METRICS ───────────────────────────────────────
function calcMetrics(r) {
  const sf = parseInt(r.building_sf) || 0;
  const landAcres = parseFloat(r.land_acres) || 0;
  const lotSf = parseInt(r.lot_sf) || (landAcres * 43560) || 0;
  const dd = parseInt(r.dock_doors) || 0;
  const gd = parseInt(r.grade_doors) || 0;
  const offPct = parseInt(r.office_pct) || 0;

  return {
    dhRatio: sf > 0 ? (dd / (sf / 10000)) : null,
    coverageRatio: (sf > 0 && lotSf > 0) ? ((sf / lotSf) * 100) : null,
    landToBldg: (sf > 0 && lotSf > 0) ? (lotSf / sf) : null,
    officeSf: sf > 0 && offPct > 0 ? Math.round(sf * offPct / 100) : null,
    warehouseSf: sf > 0 && offPct > 0 ? Math.round(sf * (1 - offPct / 100)) : null,
    totalDoors: dd + gd,
  };
}

const GRADE_COLOR = { 'A+': 'var(--green)', A: 'var(--blue)', 'B+': 'var(--amber)', B: 'var(--amber)', C: 'var(--ink3)' };
const fmt = v => v != null ? v : '—';
const fmtNum = v => v != null && !isNaN(v) ? Number(v).toLocaleString() : '—';

// ─── EDIT FIELD ───────────────────────────────────────────────
const EF = ({ label, value, onChange, type = 'number', unit, placeholder }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
    <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink4)' }}>{label}{unit && <span style={{ fontWeight: 400 }}> ({unit})</span>}</div>
    <input
      type={type} value={value ?? ''} placeholder={placeholder || '—'}
      onChange={e => onChange(e.target.value)}
      style={{ fontSize: '13px', padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '5px', color: 'var(--ink2)', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }}
    />
  </div>
);

// ─── SPEC ROW ─────────────────────────────────────────────────
const SR = ({ label, value, highlight, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line3)' }}>
    <span style={{ fontSize: '12px', color: 'var(--ink4)' }}>{label}</span>
    <span style={{ fontSize: '12px', fontWeight: highlight ? 700 : 500, color: highlight ? 'var(--blue)' : 'var(--ink2)', fontFamily: mono ? "'DM Mono',monospace" : 'inherit' }}>{value}</span>
  </div>
);

export default function BuildingSpecs({ record, recordType = 'properties', onRefresh, showToast, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    truck_court_depth: record.truck_court_depth ?? '',
    column_spacing: record.column_spacing ?? '',
    bay_depth: record.bay_depth ?? '',
    power_amps: record.power_amps ?? '',
    power_volts: record.power_volts ?? '',
    sprinklers: record.sprinklers ?? '',
    rail_served: record.rail_served ?? false,
    yard_depth: record.yard_depth ?? '',
    parking_spaces: record.parking_spaces ?? '',
    trailer_spots: record.trailer_spots ?? '',
    lot_sf: record.lot_sf ?? '',
    eave_height: record.eave_height ?? '',
    skylight_pct: record.skylight_pct ?? '',
    evap_cooler: record.evap_cooler ?? false,
    zoning: record.zoning ?? '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        truck_court_depth: form.truck_court_depth !== '' ? parseInt(form.truck_court_depth) : null,
        column_spacing: form.column_spacing || null,
        bay_depth: form.bay_depth !== '' ? parseInt(form.bay_depth) : null,
        power_amps: form.power_amps !== '' ? parseInt(form.power_amps) : null,
        power_volts: form.power_volts !== '' ? parseInt(form.power_volts) : null,
        sprinklers: form.sprinklers || null,
        rail_served: form.rail_served || false,
        yard_depth: form.yard_depth !== '' ? parseInt(form.yard_depth) : null,
        parking_spaces: form.parking_spaces !== '' ? parseInt(form.parking_spaces) : null,
        trailer_spots: form.trailer_spots !== '' ? parseInt(form.trailer_spots) : null,
        lot_sf: form.lot_sf !== '' ? parseInt(form.lot_sf) : null,
        eave_height: form.eave_height !== '' ? parseInt(form.eave_height) : null,
        skylight_pct: form.skylight_pct !== '' ? parseInt(form.skylight_pct) : null,
        evap_cooler: form.evap_cooler || false,
        zoning: form.zoning || null,
      };
      await updateRow(recordType, record.id, updates);
      onRefresh?.();
      showToast?.('Building specs saved');
      setEditing(false);
    } catch (e) { console.error(e); showToast?.('Error saving specs'); }
    finally { setSaving(false); }
  };

  const r = { ...record, ...Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '')) };
  const { score, grade, breakdown } = calculateBuildingScore(r);
  const m = calcMetrics(r);
  const gradeColor = GRADE_COLOR[grade] || 'var(--ink3)';
  const hasScore = score > 0;

  // ─── SUMMARY STRIP (always visible) ──────────────────────
  const summaryItems = [
    record.clear_height && { label: 'Clear', value: `${record.clear_height}'` },
    m.dhRatio != null && { label: 'DH Ratio', value: `${m.dhRatio.toFixed(2)}/10k` },
    record.truck_court_depth && { label: 'Court', value: `${record.truck_court_depth}'` },
    record.office_pct != null && { label: 'Office', value: `${record.office_pct}%` },
    record.dock_doors != null && { label: 'Dock', value: `${record.dock_doors}D · ${record.grade_doors || 0}GL` },
  ].filter(Boolean);

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: expanded ? '1px solid var(--line)' : 'none', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink3)' }}>Property Score</div>
          {hasScore && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '22px', fontWeight: 700, color: gradeColor, lineHeight: 1 }}>{score}</div>
              <div style={{ padding: '2px 7px', borderRadius: '4px', background: `${gradeColor}18`, border: `1px solid ${gradeColor}40`, fontSize: '11px', fontWeight: 700, color: gradeColor }}>{grade}</div>
            </div>
          )}
          {!hasScore && <div style={{ fontSize: '12px', color: 'var(--ink4)', fontStyle: 'italic' }}>Add specs to generate score</div>}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={() => setEditing(!editing)}
            style={{ fontSize: '11px', padding: '4px 10px', background: editing ? 'var(--blue-bg)' : 'transparent', border: '1px solid var(--line)', borderRadius: '5px', color: editing ? 'var(--blue)' : 'var(--ink4)', cursor: 'pointer', fontWeight: 600 }}>
            {editing ? 'Cancel' : 'Edit Specs'}
          </button>
          <button onClick={() => setExpanded(!expanded)}
            style={{ fontSize: '11px', padding: '4px 10px', background: 'transparent', border: '1px solid var(--line)', borderRadius: '5px', color: 'var(--ink4)', cursor: 'pointer', fontWeight: 600 }}>
            {expanded ? '▲ Less' : '▼ All Specs'}
          </button>
        </div>
      </div>

      {/* ── SUMMARY STRIP ── */}
      {!expanded && summaryItems.length > 0 && (
        <div style={{ display: 'flex', gap: '0', borderBottom: editing ? '1px solid var(--line)' : 'none' }}>
          {summaryItems.map((item, i) => (
            <div key={i} style={{ flex: 1, padding: '10px 14px', borderRight: i < summaryItems.length - 1 ? '1px solid var(--line3)' : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{item.label}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink2)', fontFamily: "'DM Mono',monospace" }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── EXPANDED SPECS ── */}
      {expanded && !editing && (
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {/* Left column */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink4)', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid var(--line)' }}>Structure</div>
            <SR label="Building SF" value={fmtNum(record.building_sf)} mono />
            <SR label="Land Acres" value={record.land_acres ? `${record.land_acres} ac` : '—'} mono />
            <SR label="Lot SF" value={record.lot_sf ? fmtNum(record.lot_sf) : m.coverageRatio != null ? `~${fmtNum(Math.round((record.building_sf / (m.coverageRatio/100))))} (est.)` : '—'} mono />
            <SR label="Year Built" value={fmt(record.year_built)} mono />
            <SR label="Clear Height" value={record.clear_height ? `${record.clear_height}'` : '—'} highlight mono />
            <SR label="Eave Height" value={record.eave_height ? `${record.eave_height}'` : '—'} mono />
            <SR label="Column Spacing" value={record.column_spacing || '—'} />
            <SR label="Bay Depth" value={record.bay_depth ? `${record.bay_depth}'` : '—'} mono />
            <SR label="Skylight %" value={record.skylight_pct != null ? `${record.skylight_pct}%` : '—'} mono />

            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink4)', margin: '12px 0 6px', paddingBottom: '4px', borderBottom: '1px solid var(--line)' }}>Loading</div>
            <SR label="Dock Doors" value={record.dock_doors ?? '—'} highlight mono />
            <SR label="Grade Doors" value={record.grade_doors ?? '—'} mono />
            <SR label="Truck Court" value={record.truck_court_depth ? `${record.truck_court_depth}'` : '—'} highlight mono />
            <SR label="Yard Depth" value={record.yard_depth ? `${record.yard_depth}'` : '—'} mono />
            <SR label="Trailer Spots" value={record.trailer_spots ?? '—'} mono />
            <SR label="Parking Spaces" value={record.parking_spaces ?? '—'} mono />
          </div>

          {/* Right column */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink4)', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid var(--line)' }}>Systems</div>
            <SR label="Power" value={record.power_amps ? `${record.power_amps}A${record.power_volts ? ` / ${record.power_volts}V` : ''}` : '—'} mono />
            <SR label="Sprinklers" value={record.sprinklers || '—'} />
            <SR label="Rail Served" value={record.rail_served ? '✓ Yes' : record.rail_served === false ? 'No' : '—'} />
            <SR label="Evap Cooler" value={record.evap_cooler ? '✓ Yes' : record.evap_cooler === false ? 'No' : '—'} />
            <SR label="Zoning" value={record.zoning || '—'} />
            <SR label="Office %" value={record.office_pct != null ? `${record.office_pct}%` : '—'} mono />

            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink4)', margin: '12px 0 6px', paddingBottom: '4px', borderBottom: '1px solid var(--line)' }}>Calculated</div>
            <SR label="DH Ratio" value={m.dhRatio != null ? `${m.dhRatio.toFixed(2)} per 10k SF` : '—'} highlight mono />
            <SR label="Coverage Ratio" value={m.coverageRatio != null ? `${m.coverageRatio.toFixed(1)}%` : '—'} mono />
            <SR label="Land-to-Bldg" value={m.landToBldg != null ? `${m.landToBldg.toFixed(2)}x` : '—'} mono />
            <SR label="Office SF" value={m.officeSf != null ? fmtNum(m.officeSf) : '—'} mono />
            <SR label="Warehouse SF" value={m.warehouseSf != null ? fmtNum(m.warehouseSf) : '—'} mono />

            {/* Score breakdown */}
            {breakdown.length > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink4)', marginBottom: '8px' }}>Score Breakdown</div>
                {breakdown.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--ink3)', flex: 1 }}>{b.label}</div>
                    <div style={{ height: '6px', width: '80px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(b.pts / b.max) * 100}%`, background: b.pts >= b.max * 0.7 ? 'var(--green)' : b.pts >= b.max * 0.4 ? 'var(--amber)' : 'var(--rust)', borderRadius: '3px' }} />
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', fontWeight: 700, color: 'var(--ink2)', minWidth: '32px', textAlign: 'right' }}>{b.pts}/{b.max}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--line3)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink3)' }}>Total</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', fontWeight: 700, color: gradeColor }}>{score} / 100</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT FORM ── */}
      {editing && (
        <div style={{ padding: '16px', borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
            <EF label="Truck Court Depth" unit="ft" value={form.truck_court_depth} onChange={v => set('truck_court_depth', v)} />
            <EF label="Bay Depth" unit="ft" value={form.bay_depth} onChange={v => set('bay_depth', v)} />
            <EF label="Column Spacing" unit="e.g. 50'×52'" value={form.column_spacing} onChange={v => set('column_spacing', v)} type="text" />
            <EF label="Yard Depth" unit="ft" value={form.yard_depth} onChange={v => set('yard_depth', v)} />
            <EF label="Trailer Spots" value={form.trailer_spots} onChange={v => set('trailer_spots', v)} />
            <EF label="Parking Spaces" value={form.parking_spaces} onChange={v => set('parking_spaces', v)} />
            <EF label="Power Amps" unit="A" value={form.power_amps} onChange={v => set('power_amps', v)} />
            <EF label="Power Volts" unit="V" value={form.power_volts} onChange={v => set('power_volts', v)} />
            <EF label="Eave Height" unit="ft" value={form.eave_height} onChange={v => set('eave_height', v)} />
            <EF label="Lot SF" value={form.lot_sf} onChange={v => set('lot_sf', v)} />
            <EF label="Skylight %" value={form.skylight_pct} onChange={v => set('skylight_pct', v)} />
            <EF label="Zoning" value={form.zoning} onChange={v => set('zoning', v)} type="text" />
          </div>

          {/* Sprinklers dropdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink4)', marginBottom: '3px' }}>Sprinklers</div>
              <select value={form.sprinklers} onChange={e => set('sprinklers', e.target.value)}
                style={{ fontSize: '13px', padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '5px', color: 'var(--ink2)', width: '100%' }}>
                <option value="">—</option>
                <option>ESFR</option><option>ESFR-K25</option><option>Early Suppression</option>
                <option>Wet Pipe</option><option>Dry Pipe</option><option>None</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink4)' }}>Rail Served</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink2)', cursor: 'pointer', height: '30px' }}>
                <input type="checkbox" checked={!!form.rail_served} onChange={e => set('rail_served', e.target.checked)} style={{ accentColor: 'var(--accent)', width: '15px', height: '15px' }} />
                Rail access
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink4)' }}>Evap Cooler</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink2)', cursor: 'pointer', height: '30px' }}>
                <input type="checkbox" checked={!!form.evap_cooler} onChange={e => set('evap_cooler', e.target.checked)} style={{ accentColor: 'var(--accent)', width: '15px', height: '15px' }} />
                Has evap cooler
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button onClick={handleSave} disabled={saving}
              style={{ fontSize: '12px', fontWeight: 600, padding: '7px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {saving ? 'Saving...' : 'Save Specs'}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ fontSize: '12px', padding: '7px 14px', background: 'transparent', border: '1px solid var(--line)', borderRadius: '6px', color: 'var(--ink4)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
