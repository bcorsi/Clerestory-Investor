'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

// ─── HELPERS ──────────────────────────────────────────────────
function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtM(n) { if (!n) return '—'; const m = Number(n); return m >= 1_000_000 ? `$${(m/1_000_000).toFixed(2)}M` : `$${m.toLocaleString()}`; }
function fmtPct(n) { return n != null ? `${(Number(n) * 100).toFixed(2)}%` : '—'; }
function fmtPSF(price, sf) { return price && sf ? `$${Math.round(Number(price) / Number(sf))}/SF` : '—'; }

// ─── DEFAULTS ────────────────────────────────────────────────
const DEFAULT_SCENARIOS = [
  { key: 'base',     label: 'Base',     color: 'var(--amber)', capRate: 0.055 },
  { key: 'expected', label: 'Expected', color: 'var(--blue)',  capRate: 0.050 },
  { key: 'outlier',  label: 'Outlier',  color: 'var(--green)', capRate: 0.045 },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function BOVDashboardTab({ deal, property }) {
  const [generating, setGenerating]   = useState(false);
  const [aiSections, setAiSections]   = useState(null);
  const [editingAI, setEditingAI]     = useState(false);
  const [saving, setSaving]           = useState(false);

  // Financial inputs — seeded from deal record, editable
  const [noi, setNoi]                 = useState(deal?.noi_yr1 || '');
  const [askingPrice, setAskingPrice] = useState(deal?.asking_price || '');
  const [rentInPlace, setRentInPlace] = useState(property?.in_place_rent || '');
  const [marketRent, setMarketRent]   = useState(property?.market_rent || '');
  const [buildingSF, setBuildingSF]   = useState(deal?.building_sf || property?.building_sf || '');
  const [capBase, setCapBase]         = useState(deal?.cap_rate_base || 0.055);
  const [capExp, setCapExp]           = useState(deal?.cap_rate_expected || 0.050);
  const [capOut, setCapOut]           = useState(deal?.cap_rate_outlier || 0.045);
  const [rentRoll, setRentRoll]       = useState(() => {
    if (deal?.rent_roll && Array.isArray(deal.rent_roll) && deal.rent_roll.length > 0) return deal.rent_roll;
    return [{ tenant: property?.tenant || '', suite: '', sf: deal?.building_sf || property?.building_sf || '', rentPSF: property?.in_place_rent || '', type: 'NNN', leaseStart: '', leaseExpiry: property?.lease_expiration?.slice(0,10) || '', bumps: '3% annual', options: '' }];
  });

  // Computed pricing scenarios
  const noiNum = Number(noi) || 0;
  const sfNum  = Number(buildingSF) || 1;
  const scenarios = [
    { ...DEFAULT_SCENARIOS[0], price: noiNum / capBase,     psf: noiNum / capBase / sfNum },
    { ...DEFAULT_SCENARIOS[1], price: noiNum / capExp,      psf: noiNum / capExp / sfNum },
    { ...DEFAULT_SCENARIOS[2], price: noiNum / capOut,      psf: noiNum / capOut / sfNum },
  ];

  // In-place vs market rent gap
  const rentGapPct = rentInPlace && marketRent
    ? Math.round((Number(marketRent) - Number(rentInPlace)) / Number(rentInPlace) * 100)
    : null;
  const annualNOIUpside = rentGapPct && sfNum && rentInPlace
    ? Math.round((Number(marketRent) - Number(rentInPlace)) * sfNum * 12)
    : null;

  async function generateAI() {
    setGenerating(true);
    try {
      const prompt = `You are a senior industrial real estate broker at Colliers International analyzing a property for a BOV (Broker Opinion of Value). Generate a concise but sharp investment analysis.

PROPERTY:
- Address: ${property?.address || deal?.name || 'N/A'}
- Building SF: ${fmt(buildingSF)} SF
- Clear Height: ${property?.clear_height || deal?.clear_height || 'N/A'}'
- Year Built: ${property?.year_built || deal?.year_built || 'N/A'}
- Market: ${deal?.market || property?.city || 'SGV'}
- Submarket: ${deal?.submarket || 'N/A'}
- Tenant: ${property?.tenant || deal?.tenant || 'Owner-User'}
- In-Place Rent: $${rentInPlace}/SF NNN/mo
- Market Rent: $${marketRent}/SF NNN/mo
- Lease Expiry: ${property?.lease_expiration || 'N/A'}
- Catalyst Tags: ${JSON.stringify(deal?.catalyst_tags || [])}
- Deal Type: ${deal?.deal_type || 'Disposition'}

NOI Year 1: $${fmt(noi)}
Pricing: Base $${fmtM(scenarios[0].price)} (${fmtPct(capBase)} cap) | Expected $${fmtM(scenarios[1].price)} (${fmtPct(capExp)} cap) | Outlier $${fmtM(scenarios[2].price)} (${fmtPct(capOut)} cap)

Generate JSON only, no markdown, no explanation. Return:
{
  "strengths": ["string", "string", "string", "string"],
  "risks": ["string", "string", "string"],
  "thesis": "2-3 sentence investment thesis paragraph, seller-facing",
  "pricingRationale": "1-2 sentence rationale for the expected pricing scenario",
  "marketContext": "1-2 sentences on current SGV/IE industrial market conditions relevant to this deal"
}

Be specific to the data. Reference actual numbers. Write in institutional capital markets style.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setAiSections(parsed);
    } catch (e) {
      console.error('BOV AI generation error:', e);
      alert('Error generating AI analysis. Try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function saveBOV() {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('deals').update({
        noi_yr1: Number(noi) || null,
        cap_rate_base: capBase,
        cap_rate_expected: capExp,
        cap_rate_outlier: capOut,
        rent_roll: rentRoll,
        bov_generated_at: new Date().toISOString(),
        pricing_base:     scenarios[0].price || null,
        pricing_expected: scenarios[1].price || null,
        pricing_outlier:  scenarios[2].price || null,
      }).eq('id', deal.id);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  function addRentRollRow() {
    setRentRoll(prev => [...prev, { tenant: '', suite: '', sf: '', rentPSF: '', type: 'NNN', leaseStart: '', leaseExpiry: '', bumps: '3% annual', options: '' }]);
  }

  function updateRentRollRow(i, field, val) {
    setRentRoll(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  function removeRentRollRow(i) {
    setRentRoll(prev => prev.filter((_, idx) => idx !== i));
  }

  const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' };
  const labelStyle = { fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── INPUTS HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>BOV Dashboard</div>
          <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-tertiary)' }}>Disposition-side financial model — seller-facing</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveBOV} disabled={saving} className="cl-btn cl-btn-secondary cl-btn-sm">{saving ? 'Saving…' : '↓ Save BOV'}</button>
          <button onClick={() => window.print()} className="cl-btn cl-btn-secondary cl-btn-sm">⎙ Print / PDF</button>
        </div>
      </div>

      {/* ── FINANCIAL INPUTS ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
        <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.02)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Financial Assumptions</div>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            <div><label style={labelStyle}>NOI Year 1 ($)</label><input style={inputStyle} type="number" value={noi} onChange={e => setNoi(e.target.value)} placeholder="e.g. 2400000" /></div>
            <div><label style={labelStyle}>Building SF</label><input style={inputStyle} type="number" value={buildingSF} onChange={e => setBuildingSF(e.target.value)} placeholder="e.g. 186400" /></div>
            <div><label style={labelStyle}>In-Place Rent ($/SF/mo NNN)</label><input style={inputStyle} type="number" step="0.01" value={rentInPlace} onChange={e => setRentInPlace(e.target.value)} placeholder="e.g. 1.28" /></div>
            <div><label style={labelStyle}>Market Rent ($/SF/mo NNN)</label><input style={inputStyle} type="number" step="0.01" value={marketRent} onChange={e => setMarketRent(e.target.value)} placeholder="e.g. 1.52" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div><label style={{ ...labelStyle, color: 'var(--amber)' }}>Base Cap Rate</label><input style={{ ...inputStyle, borderColor: 'var(--amber-bdr, rgba(140,90,4,0.25))' }} type="number" step="0.001" value={capBase} onChange={e => setCapBase(Number(e.target.value))} /></div>
            <div><label style={{ ...labelStyle, color: 'var(--blue)' }}>Expected Cap Rate</label><input style={{ ...inputStyle, borderColor: 'var(--blue-bdr, rgba(78,110,150,0.3))' }} type="number" step="0.001" value={capExp} onChange={e => setCapExp(Number(e.target.value))} /></div>
            <div><label style={{ ...labelStyle, color: 'var(--green)' }}>Outlier Cap Rate</label><input style={{ ...inputStyle, borderColor: 'var(--green-bdr, rgba(21,102,54,0.28))' }} type="number" step="0.001" value={capOut} onChange={e => setCapOut(Number(e.target.value))} /></div>
          </div>
        </div>
      </div>

      {/* ── PRICING MATRIX ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
        <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Pricing Matrix — Variable Estimated Value</div>
          <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 12, fontStyle: 'italic', color: 'var(--text-tertiary)' }}>Cap rate sensitivity · Seller BOV</div>
        </div>

        {/* Scenario columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {scenarios.map((s, i) => (
            <div key={s.key} style={{ padding: '20px 22px', borderRight: i < 2 ? '1px solid var(--card-border)' : 'none', borderLeft: i === 1 ? '3px solid var(--blue)' : 'none' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: s.color, marginBottom: 14 }}>
                {s.label} Scenario
              </div>
              {[
                { lbl: 'Cap Rate',   val: fmtPct(s.capRate), big: false },
                { lbl: 'Total Value',val: fmtM(s.price),     big: true },
                { lbl: 'Price/SF',   val: s.price && sfNum ? `$${Math.round(s.price / sfNum)}/SF` : '—', big: false },
                { lbl: 'Yr 1 NOI',   val: fmtM(noiNum),      big: false },
                { lbl: 'NOI/SF/yr',  val: sfNum ? `$${(noiNum / sfNum).toFixed(2)}/SF` : '—', big: false },
              ].map(row => (
                <div key={row.lbl} style={{ marginBottom: row.big ? 14 : 8 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: row.big ? 4 : 2 }}>{row.lbl}</div>
                  {row.big ? (
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{row.val}</div>
                  ) : (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{row.val}</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Rent vs. Market summary */}
        {rentGapPct !== null && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--card-border)', background: 'rgba(21,102,54,0.04)', display: 'flex', gap: 24, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>In-Place vs. Market</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: rentGapPct > 0 ? 'var(--green)' : 'var(--rust)' }}>
                {rentGapPct > 0 ? `+${rentGapPct}% below market` : `${Math.abs(rentGapPct)}% above market`} — ${Number(rentInPlace).toFixed(2)} vs. ${Number(marketRent).toFixed(2)}/SF NNN
              </div>
            </div>
            {annualNOIUpside && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>Annual NOI Upside at Market</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>+{fmtM(annualNOIUpside)}/yr at renewal</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RENT ROLL ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
        <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Rent Roll</div>
          <button onClick={addRentRollRow} style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Row</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.025)' }}>
                {['Tenant','Suite','SF','Rent/SF/mo','Type','Lease Start','Lease Expiry','Bumps','Options',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rentRoll.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  {['tenant','suite','sf','rentPSF','type','leaseStart','leaseExpiry','bumps','options'].map(field => (
                    <td key={field} style={{ padding: '6px 8px' }}>
                      {field === 'type' ? (
                        <select value={row[field]} onChange={e => updateRentRollRow(i, field, e.target.value)} style={{ padding: '4px 6px', borderRadius: 5, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-primary)', outline: 'none' }}>
                          <option>NNN</option><option>MG</option><option>Gross</option><option>Vacant</option>
                        </select>
                      ) : (
                        <input
                          value={row[field] || ''}
                          onChange={e => updateRentRollRow(i, field, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid transparent', background: 'transparent', fontFamily: field === 'sf' || field === 'rentPSF' ? 'var(--font-mono)' : 'var(--font-ui)', fontSize: 12, color: 'var(--text-primary)', outline: 'none', width: field === 'tenant' ? 140 : field === 'bumps' || field === 'options' ? 100 : field === 'sf' ? 80 : 90 }}
                          onFocus={e => e.target.style.border = '1px solid var(--card-border)'}
                          onBlur={e => e.target.style.border = '1px solid transparent'}
                        />
                      )}
                    </td>
                  ))}
                  <td style={{ padding: '6px 8px' }}>
                    <button onClick={() => removeRentRollRow(i)} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ background: 'rgba(0,0,0,0.025)', fontWeight: 600 }}>
                <td colSpan={2} style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>TOTAL</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
                  {fmt(rentRoll.reduce((s, r) => s + (Number(r.sf) || 0), 0))} SF
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
                  ${rentRoll.reduce((s, r) => {
                    const sf = Number(r.sf) || 0; const rate = Number(r.rentPSF) || 0;
                    return s + (sf * rate);
                  }, 0).toLocaleString(undefined, {maximumFractionDigits: 0})}/mo
                </td>
                <td colSpan={6} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AI STRENGTHS & WEAKNESSES ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(88,56,160,0.18)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--card-shadow)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, #8B6FCC, var(--purple))' }} />
        <div style={{ padding: '11px 18px 11px 22px', borderBottom: '1px solid rgba(88,56,160,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--purple)' }}>✦</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--purple)' }}>AI Investment Analysis</span>
            <span style={{ fontFamily: 'var(--font-editorial)', fontSize: 12, fontStyle: 'italic', color: 'var(--text-tertiary)' }}>Generated from deal data · editable</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {aiSections && (
              <button onClick={() => setEditingAI(e => !e)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(88,56,160,0.22)', background: 'none', color: 'var(--purple)', fontSize: 12, fontFamily: 'var(--font-ui)', cursor: 'pointer' }}>
                {editingAI ? '✓ Done Editing' : '✎ Edit'}
              </button>
            )}
            <button
              onClick={generateAI}
              disabled={generating || !noi}
              style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: generating ? 'rgba(88,56,160,0.4)' : 'var(--purple)', color: '#fff', fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 500, cursor: 'pointer', opacity: !noi ? 0.5 : 1 }}
            >
              {generating ? '✦ Generating…' : aiSections ? '↺ Regenerate' : '✦ Generate Analysis'}
            </button>
          </div>
        </div>

        {!noi && !aiSections && (
          <div style={{ padding: '24px 22px', fontFamily: 'var(--font-editorial)', fontSize: 14, fontStyle: 'italic', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            Enter NOI Year 1 above, then generate AI analysis
          </div>
        )}

        {aiSections && (
          <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Investment Thesis */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>Investment Thesis</div>
              {editingAI ? (
                <textarea value={aiSections.thesis} onChange={e => setAiSections(p => ({ ...p, thesis: e.target.value }))} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-editorial)', fontSize: 14, fontStyle: 'italic', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }} />
              ) : (
                <p style={{ fontFamily: 'var(--font-editorial)', fontSize: 14.5, fontStyle: 'italic', lineHeight: 1.7, color: 'var(--text-primary)' }}>{aiSections.thesis}</p>
              )}
            </div>

            {/* Strengths */}
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 10 }}>Investment Strengths</div>
              {aiSections.strengths.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--green-bg)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  {editingAI ? (
                    <input value={s} onChange={e => setAiSections(p => ({ ...p, strengths: p.strengths.map((x, j) => j === i ? e.target.value : x) }))} style={{ flex: 1, padding: '4px 8px', borderRadius: 5, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }} />
                  ) : (
                    <span style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>{s}</span>
                  )}
                </div>
              ))}
              {editingAI && <button onClick={() => setAiSections(p => ({ ...p, strengths: [...p.strengths, ''] }))} style={{ fontSize: 12, color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add strength</button>}
            </div>

            {/* Risks */}
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 10 }}>Risk Factors</div>
              {aiSections.risks.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--rust-bg)', color: 'var(--rust)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>!</span>
                  {editingAI ? (
                    <input value={r} onChange={e => setAiSections(p => ({ ...p, risks: p.risks.map((x, j) => j === i ? e.target.value : x) }))} style={{ flex: 1, padding: '4px 8px', borderRadius: 5, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }} />
                  ) : (
                    <span style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>{r}</span>
                  )}
                </div>
              ))}
              {editingAI && <button onClick={() => setAiSections(p => ({ ...p, risks: [...p.risks, ''] }))} style={{ fontSize: 12, color: 'var(--rust)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add risk</button>}
            </div>

            {/* Pricing Rationale + Market Context */}
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ padding: '12px 14px', background: 'var(--blue-bg)', border: '1px solid rgba(78,110,150,0.22)', borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 6 }}>Pricing Rationale</div>
                {editingAI ? (
                  <textarea value={aiSections.pricingRationale} onChange={e => setAiSections(p => ({ ...p, pricingRationale: e.target.value }))} rows={2} style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontSize: 13, fontFamily: 'var(--font-ui)', outline: 'none', resize: 'vertical' }} />
                ) : (
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>{aiSections.pricingRationale}</p>
                )}
              </div>
              <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--card-border)', borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>Market Context</div>
                {editingAI ? (
                  <textarea value={aiSections.marketContext} onChange={e => setAiSections(p => ({ ...p, marketContext: e.target.value }))} rows={2} style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontSize: 13, fontFamily: 'var(--font-ui)', outline: 'none', resize: 'vertical' }} />
                ) : (
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>{aiSections.marketContext}</p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
