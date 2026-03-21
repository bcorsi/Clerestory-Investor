'use client';

import { useState, useMemo } from 'react';
import { fmt } from '../lib/constants';

export default function Underwriting({ deal, property, leaseComps, saleComps }) {
  const p = property || {};
  const d = deal || {};
  const sf = d.building_sf || p.building_sf || p.total_sf || 0;
  const price = d.deal_value || d.purchase_price || 0;
  const pricePsf = sf > 0 && price > 0 ? Math.round(price / sf) : 0;
  const inPlaceRent = p.in_place_rent || d.in_place_rent || 0;
  const marketRent = p.market_rent || d.market_rent || 1.25;

  // Comp averages
  const avgLeaseRate = leaseComps?.length ? (leaseComps.reduce((s, c) => s + (c.rate || 0), 0) / leaseComps.length).toFixed(2) : marketRent;
  const avgSalePsf = saleComps?.filter(c => c.price_psf)?.length ? Math.round(saleComps.filter(c => c.price_psf).reduce((s, c) => s + c.price_psf, 0) / saleComps.filter(c => c.price_psf).length) : null;
  const avgCapRate = saleComps?.filter(c => c.cap_rate)?.length ? (saleComps.filter(c => c.cap_rate).reduce((s, c) => s + parseFloat(c.cap_rate), 0) / saleComps.filter(c => c.cap_rate).length).toFixed(2) : '5.00';

  // Scenario sliders
  const [vacMonths, setVacMonths] = useState(6);
  const [rentSf, setRentSf] = useState(Math.round(parseFloat(avgLeaseRate) * 100));
  const [tiSf, setTiSf] = useState(10);
  const [capexSf, setCapexSf] = useState(5);
  const [exitCap, setExitCap] = useState(parseFloat(avgCapRate) * 100 || 500);

  // Calculate
  const rentActual = rentSf / 100;
  const exitCapPct = exitCap / 100;
  const vacCost = sf * rentActual * vacMonths;
  const tiCost = sf * tiSf;
  const capexCost = sf * capexSf;
  const totalReposition = vacCost + tiCost + capexCost;
  const allInBasis = price + totalReposition;
  const allInPsf = sf > 0 ? allInBasis / sf : 0;

  const annRent = sf * rentActual * 12;
  const occ = 0.95;
  const egi = annRent * occ + sf * 0.40 * 12 * occ;
  const expenses = sf * 0.40 * 12 + egi * 0.04 + sf * 0.08 * 12;
  const noi = egi - expenses;
  const stabCap = allInBasis > 0 ? (noi / allInBasis) * 100 : 0;
  const impliedVal = exitCapPct > 0 ? noi / (exitCapPct / 100) : 0;
  const profit = impliedVal - allInBasis;
  const profitPct = allInBasis > 0 ? (profit / allInBasis) * 100 : 0;

  const fmtDollar = (n) => n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(0) + 'K' : '$' + Math.round(n);

  // Risk scoring
  const strengths = [];
  const risks = [];
  if (pricePsf > 0 && avgSalePsf && pricePsf < avgSalePsf * 0.85) strengths.push(['Basis below market avg', 'Strong']);
  if (p.vacancy_status === 'Occupied') strengths.push(['Currently occupied', 'Good']);
  if (inPlaceRent > 0 && inPlaceRent < marketRent) strengths.push(['Mark-to-market rent upside', 'Strong']);
  if (sf >= 50000) strengths.push(['Scale — ' + Number(sf).toLocaleString() + ' SF', 'Good']);
  if (p.year_built && p.year_built < 1990) risks.push(['Vintage building (' + p.year_built + ')', 'Medium']);
  if (p.clear_height && parseInt(p.clear_height) < 28) risks.push(['Low clear height (' + p.clear_height + "')", 'Medium']);
  if (vacMonths > 9) risks.push(['Extended vacancy scenario', 'High']);
  if (stabCap < 4.5) risks.push(['Low yield on cost', 'High']);

  return (
    <div>
      {/* Metrics */}
      <div className="metrics-bar" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="metric-cell">
          <div className="metric-label">Purchase Price</div>
          <div className="metric-val">{price > 0 ? fmtDollar(price) : '—'}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">Price / SF</div>
          <div className="metric-val accent">{pricePsf > 0 ? '$' + pricePsf : '—'}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">Building Size</div>
          <div className="metric-val">{sf > 0 ? Number(sf).toLocaleString() + ' SF' : '—'}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">Market Avg $/SF</div>
          <div className="metric-val" style={{ color: 'var(--amber)' }}>{avgSalePsf ? '$' + avgSalePsf : '—'}</div>
        </div>
      </div>

      <div style={{ padding: '28px 36px 48px' }}>
        {/* NOI Waterfall */}
        <div className="sec-head">Stabilized NOI (at market rent)</div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
          {[
            ['Gross potential rent (' + Number(sf).toLocaleString() + ' SF × $' + rentActual.toFixed(2) + '/SF × 12)', fmtDollar(annRent), 'var(--blue)'],
            ['Less: vacancy (5%)', '(' + fmtDollar(annRent * 0.05) + ')', 'var(--rust)'],
            ['Effective gross rent', fmtDollar(annRent * occ), null],
            ['NNN reimbursements ($0.40/SF × 95%)', fmtDollar(sf * 0.40 * 12 * occ), null],
            ['Effective gross income', fmtDollar(egi), 'var(--blue)'],
            ['Less: operating expenses', '(' + fmtDollar(sf * 0.40 * 12) + ')', 'var(--rust)'],
            ['Less: management fee (4%)', '(' + fmtDollar(egi * 0.04) + ')', 'var(--rust)'],
            ['Less: reserves ($0.08/SF/mo)', '(' + fmtDollar(sf * 0.08 * 12) + ')', 'var(--rust)'],
          ].map(([label, val, color], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--line3)' }}>
              <span style={{ fontSize: '13px', color: 'var(--ink3)' }}>{label}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', fontWeight: 500, color: color || 'var(--ink2)' }}>{val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--blue-bg)' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--blue)' }}>Stabilized NOI</span>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '22px', fontWeight: 700, color: 'var(--blue)' }}>{fmtDollar(noi)}</span>
          </div>
        </div>

        {/* Return Metrics */}
        <div className="sec-head">Return Metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            ['Stabilized Cap Rate', stabCap.toFixed(1) + '%', stabCap >= 5.5 ? 'var(--green)' : stabCap >= 4.5 ? 'var(--amber)' : 'var(--ink3)'],
            ['Implied Value (' + exitCapPct.toFixed(1) + '% cap)', fmtDollar(impliedVal), 'var(--blue)'],
            ['Upside to Basis', fmtDollar(profit) + ' (' + (profitPct >= 0 ? '+' : '') + profitPct.toFixed(0) + '%)', profit >= 0 ? 'var(--green)' : 'var(--rust)'],
            ['In-Place Cap (est)', inPlaceRent > 0 && price > 0 ? ((inPlaceRent * sf * 12 * 0.65) / price * 100).toFixed(1) + '%' : '—', 'var(--amber)'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '8px' }}>{label}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '26px', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Comp Bars */}
        {avgSalePsf && pricePsf > 0 && (
          <>
            <div className="sec-head">Discount to Comps</div>
            <div style={{ marginBottom: '24px' }}>
              {[
                [p.address || d.deal_name || 'Subject', pricePsf, 'var(--green)'],
                ['Market Average', avgSalePsf, 'var(--amber)'],
              ].concat(
                (saleComps || []).slice(0, 3).map(c => [c.address || '—', Math.round(c.price_psf || 0), 'var(--ink3)'])
              ).map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
                  <span style={{ fontSize: '12px', color: 'var(--ink3)', width: '180px', textAlign: 'right' }}>{label}</span>
                  <div style={{ flex: 1, height: '10px', background: 'var(--bg3)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min((val / Math.max(...[pricePsf, avgSalePsf, ...(saleComps||[]).map(c => c.price_psf||0)].filter(Boolean)) * 1.1) * 100, 100)}%`, background: color, borderRadius: '5px' }} />
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '12px', fontWeight: 600, width: '60px', textAlign: 'right' }}>${val}/SF</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Risk/Reward Scorecard */}
        {(strengths.length > 0 || risks.length > 0) && (
          <>
            <div className="sec-head">Risk / Reward Scorecard</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--green)', marginBottom: '10px' }}>Strengths</div>
                {strengths.map(([label, level]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line3)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--ink3)' }}>{label}</span>
                    <span className="badge badge-green">{level}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--rust)', marginBottom: '10px' }}>Risks</div>
                {risks.map(([label, level]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line3)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--ink3)' }}>{label}</span>
                    <span className={`badge ${level === 'High' ? 'badge-warn' : 'badge-amber'}`}>{level}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Interactive Scenario Modeler */}
        <div className="sec-head">Interactive Scenario Modeler</div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>What if the tenant vacates? Adjust assumptions:</h3>

          {[
            ['Vacancy period (months)', vacMonths, setVacMonths, 0, 24, 1, vacMonths + ' mo'],
            ['Re-tenant rent ($/SF NNN)', rentSf, setRentSf, 60, 200, 1, '$' + (rentSf / 100).toFixed(2)],
            ['TI / leasing cost ($/SF)', tiSf, setTiSf, 0, 30, 1, '$' + tiSf],
            ['CapEx investment ($/SF)', capexSf, setCapexSf, 0, 25, 1, '$' + capexSf],
            ['Exit cap rate', exitCap, setExitCap, 350, 750, 5, (exitCap / 100).toFixed(2) + '%'],
          ].map(([label, val, setter, min, max, step, display]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0' }}>
              <label style={{ fontSize: '13px', color: 'var(--ink3)', width: '200px' }}>{label}</label>
              <input type="range" min={min} max={max} step={step} value={val} onChange={e => setter(parseInt(e.target.value))} style={{ flex: 1, height: '6px' }} />
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '14px', fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>{display}</span>
            </div>
          ))}

          {/* Results */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '20px' }}>
            {[
              ['Vacancy Cost', fmtDollar(vacCost), 'var(--rust)'],
              ['TI + Leasing', fmtDollar(tiCost), 'var(--rust)'],
              ['CapEx', fmtDollar(capexCost), 'var(--rust)'],
              ['Total Repositioning', fmtDollar(totalReposition), 'var(--rust)'],
              ['All-in Basis', fmtDollar(allInBasis), 'var(--ink)'],
              ['All-in $/SF', sf > 0 ? '$' + Math.round(allInPsf) : '—', 'var(--ink)'],
              ['Stabilized NOI', fmtDollar(noi), 'var(--blue)'],
              ['Yield on Total Cost', stabCap.toFixed(1) + '%', stabCap >= 5.5 ? 'var(--green)' : stabCap >= 4.5 ? 'var(--amber)' : 'var(--ink3)'],
              ['Profit at Exit', fmtDollar(profit) + ' (' + (profitPct >= 0 ? '+' : '') + profitPct.toFixed(0) + '%)', profit >= 0 ? 'var(--green)' : 'var(--rust)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: 'var(--bg)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink4)' }}>{label}</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '20px', fontWeight: 700, color, marginTop: '4px' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
