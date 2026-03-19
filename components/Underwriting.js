'use client';

import { useState, useMemo } from 'react';
import { AI_MODEL_OPUS, fmt } from '../lib/constants';
import { updateRow } from '../lib/db';

export default function Underwriting({ deal, property, leaseComps, saleComps, onRefresh, showToast, onLeaseCompClick, onSaleCompClick }) {
  const defaults = {
    purchase_price: deal.deal_value || '',
    going_in_cap: '',
    noi: '',
    rent_psf: property?.in_place_rent || property?.market_rent || '',
    vacancy_pct: 5,
    opex_psf: 0.15,
    exit_cap: '',
    hold_years: 5,
    rent_growth: 3,
    ltv: 65,
    rate: 6.5,
    amort: 30,
    ...((deal.underwriting_inputs) || {}),
  };
  const [draft, setDraft] = useState(defaults);
  const [inputs, setInputs] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [memoText, setMemoText] = useState(deal.underwriting_memo || '');
  const [memoLoading, setMemoLoading] = useState(false);

  const setDraftField = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));
  const commitField = (k) => setInputs(prev => ({ ...prev, [k]: draft[k] }));
  const commitAll = () => setInputs({ ...draft });

  // Computed metrics
  const computed = useMemo(() => {
    const pp = parseFloat(inputs.purchase_price) || 0;
    const sf = property?.total_sf || property?.building_sf || 0;
    const pricePsf = pp && sf ? Math.round(pp / sf) : 0;
    const rentPsf = parseFloat(inputs.rent_psf) || 0;
    const vacPct = parseFloat(inputs.vacancy_pct) || 0;
    const opex = parseFloat(inputs.opex_psf) || 0;
    const grossRev = rentPsf * sf * 12;
    const effGross = grossRev * (1 - vacPct / 100);
    const totalOpex = opex * sf * 12;
    const noi = inputs.noi ? parseFloat(inputs.noi) : effGross - totalOpex;
    const goingInCap = inputs.going_in_cap ? parseFloat(inputs.going_in_cap) : (pp > 0 ? ((noi / pp) * 100) : 0);
    const exitCap = parseFloat(inputs.exit_cap) || (goingInCap + 0.5);
    const holdYrs = parseInt(inputs.hold_years) || 5;
    const rentGrowth = parseFloat(inputs.rent_growth) || 0;

    // Exit value
    const exitNoi = noi * Math.pow(1 + rentGrowth / 100, holdYrs);
    const exitValue = exitCap > 0 ? exitNoi / (exitCap / 100) : 0;

    // Debt
    const ltv = parseFloat(inputs.ltv) || 0;
    const loanAmt = pp * (ltv / 100);
    const equity = pp - loanAmt;
    const rate = parseFloat(inputs.rate) || 0;
    const amort = parseInt(inputs.amort) || 30;
    const monthlyRate = rate / 100 / 12;
    const numPayments = amort * 12;
    const monthlyPayment = monthlyRate > 0 ? loanAmt * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) : 0;
    const annualDS = monthlyPayment * 12;
    const dscr = annualDS > 0 ? noi / annualDS : 0;

    // Returns
    const cfBeforeDS = noi;
    const cfAfterDS = noi - annualDS;
    const unleveredYield = pp > 0 ? (noi / pp * 100) : 0;
    const cashOnCash = equity > 0 ? (cfAfterDS / equity * 100) : 0;

    // Simple IRR approximation (unlevered)
    const totalProfit = exitValue - pp + (noi * holdYrs);
    const equityMultiple = equity > 0 ? (exitValue - loanAmt + (cfAfterDS * holdYrs)) / equity : 0;
    const unleveredIRR = pp > 0 ? (Math.pow((exitValue + noi * holdYrs) / pp, 1 / holdYrs) - 1) * 100 : 0;
    const leveredIRR = equity > 0 ? (Math.pow((exitValue - loanAmt + cfAfterDS * holdYrs) / equity, 1 / holdYrs) - 1) * 100 : 0;

    return { pp, sf, pricePsf, noi, goingInCap, exitCap, exitValue, loanAmt, equity, annualDS, dscr, cfBeforeDS, cfAfterDS, unleveredYield, cashOnCash, equityMultiple, unleveredIRR, leveredIRR, holdYrs };
  }, [inputs, property]);

  // Pull relevant comps — broad matching
  const submarket = deal.submarket || property?.submarket || '';
  const city = deal.address?.split(',')[1]?.trim() || property?.city || '';
  const market = deal.market || property?.market || '';
  const sf = property?.total_sf || property?.building_sf || 0;
  const sfRange = [sf * 0.3, sf * 2.5]; // wider range

  const matchComp = (c) => {
    // Match by submarket
    if (submarket && c.submarket && c.submarket === submarket) return true;
    // Match by city
    if (city && c.city && c.city.toLowerCase() === city.toLowerCase()) return true;
    // Match by address city portion
    if (c.address && city && c.address.toLowerCase().includes(city.toLowerCase())) return true;
    // Match by market
    if (market && c.submarket && c.submarket.toLowerCase().includes(market.toLowerCase())) return true;
    // If no geo filters set, show all comps
    if (!submarket && !city && !market) return true;
    return false;
  };

  const relevantLeaseComps = useMemo(() =>
    (leaseComps || [])
      .filter(matchComp)
      .filter(c => !sf || !c.rsf || (c.rsf >= sfRange[0] && c.rsf <= sfRange[1]))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12)
  , [leaseComps, submarket, city, market, sf]);

  const relevantSaleComps = useMemo(() =>
    (saleComps || [])
      .filter(matchComp)
      .filter(c => !sf || !c.building_sf || (c.building_sf >= sfRange[0] && c.building_sf <= sfRange[1]))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12)
  , [saleComps, submarket, city, market, sf]);

  const handleSave = async () => {
    setSaving(true);
    setInputs({ ...draft }); // commit draft to inputs for metrics
    try {
      await updateRow('deals', deal.id, { underwriting_inputs: draft, underwriting_memo: memoText || null });
      onRefresh?.(); showToast?.('Underwriting saved');
    } catch (e) { console.error(e); showToast?.('Error saving — check that migration has been run'); }
    finally { setSaving(false); }
  };

  const handleGenerateMemo = async () => {
    setMemoLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_MODEL_OPUS, max_tokens: 800,
          system: 'You are a CRE investment analyst. Generate a concise 1-page investment memo for this deal. Include: deal summary, financial highlights (cap rate, IRR, DSCR, equity multiple), market context, comparable transactions, key risks, and investment recommendation. Professional tone, specific numbers. No fluff.',
          messages: [{ role: 'user', content: `Deal: ${deal.deal_name}\nAddress: ${deal.address}\nSubmarket: ${submarket}\nProperty: ${computed.sf?.toLocaleString()} SF\n\nPurchase Price: $${computed.pp?.toLocaleString()}\nPrice/SF: $${computed.pricePsf}\nGoing-In Cap: ${computed.goingInCap?.toFixed(2)}%\nNOI: $${Math.round(computed.noi)?.toLocaleString()}\nExit Cap: ${computed.exitCap?.toFixed(2)}%\nDSCR: ${computed.dscr?.toFixed(2)}x\nUnlevered IRR: ${computed.unleveredIRR?.toFixed(1)}%\nLevered IRR: ${computed.leveredIRR?.toFixed(1)}%\nEquity Multiple: ${computed.equityMultiple?.toFixed(2)}x\nCash-on-Cash: ${computed.cashOnCash?.toFixed(1)}%\nHold: ${computed.holdYrs} years\n\nLease Comps: ${relevantLeaseComps.map(c => `${c.address} $${c.rate}/SF ${c.lease_type || ''}`).join(', ') || 'None'}\nSale Comps: ${relevantSaleComps.map(c => `${c.address} $${c.price_psf}/SF ${c.cap_rate ? c.cap_rate + '% cap' : ''}`).join(', ') || 'None'}\n\nDeal Notes: ${deal.notes || 'None'}\n\nGenerate the investment memo.` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'Could not generate memo.';
      setMemoText(text);
      await updateRow('deals', deal.id, { underwriting_memo: text, underwriting_inputs: inputs });
      onRefresh?.();
    } catch { setMemoText('Error generating memo.'); }
    finally { setMemoLoading(false); }
  };

  const Metric = ({ label, value, color, sub }) => (
    <div style={{ padding: '12px 14px', background: 'var(--bg-input)', borderRadius: '6px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );

  const Input = ({ label, field, type, step, prefix, suffix, width }) => (
    <div className="form-group" style={{ flex: width || 1 }}>
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {prefix && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{prefix}</span>}
        <input className="input" type={type || 'number'} step={step || 'any'} value={draft[field] ?? ''} onChange={e => setDraftField(field, e.target.value)} onBlur={() => setInputs({ ...draft })} style={{ fontSize: '14px' }} />
        {suffix && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div>
      {/* METRICS DASHBOARD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <Metric label="Purchase Price" value={computed.pp ? '$' + computed.pp.toLocaleString() : '—'} color="var(--accent)" />
        <Metric label="Price / SF" value={computed.pricePsf ? '$' + computed.pricePsf.toLocaleString() : '—'} sub={computed.sf ? computed.sf.toLocaleString() + ' SF' : ''} />
        <Metric label="Going-In Cap" value={computed.goingInCap ? computed.goingInCap.toFixed(2) + '%' : '—'} color={computed.goingInCap >= 5 ? '#22c55e' : '#f59e0b'} />
        <Metric label="NOI" value={computed.noi ? '$' + Math.round(computed.noi).toLocaleString() : '—'} color="#22c55e" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <Metric label="DSCR" value={computed.dscr ? computed.dscr.toFixed(2) + 'x' : '—'} color={computed.dscr >= 1.25 ? '#22c55e' : '#ef4444'} />
        <Metric label="Unlevered IRR" value={computed.unleveredIRR ? computed.unleveredIRR.toFixed(1) + '%' : '—'} color="var(--accent)" />
        <Metric label="Levered IRR" value={computed.leveredIRR ? computed.leveredIRR.toFixed(1) + '%' : '—'} color={computed.leveredIRR >= 15 ? '#22c55e' : '#f59e0b'} />
        <Metric label="Equity Multiple" value={computed.equityMultiple ? computed.equityMultiple.toFixed(2) + 'x' : '—'} sub={computed.equity ? 'Equity: $' + Math.round(computed.equity).toLocaleString() : ''} />
      </div>

      {/* INPUTS */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assumptions</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? '...' : 'Save'}</button>
            <button className="btn btn-ghost btn-sm" style={{ color: '#8b5cf6', borderColor: '#8b5cf644' }} onClick={handleGenerateMemo} disabled={memoLoading}>{memoLoading ? '✦ Generating...' : '✦ Generate Memo'}</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <Input label="Purchase Price" field="purchase_price" prefix="$" />
          <Input label="Rent ($/SF/Mo)" field="rent_psf" prefix="$" step="0.01" />
          <Input label="Vacancy %" field="vacancy_pct" suffix="%" />
          <Input label="OpEx ($/SF/Mo)" field="opex_psf" prefix="$" step="0.01" />
          <Input label="NOI (override)" field="noi" prefix="$" />
          <Input label="Going-In Cap (override)" field="going_in_cap" suffix="%" step="0.01" />
          <Input label="Exit Cap" field="exit_cap" suffix="%" step="0.01" />
          <Input label="Hold (years)" field="hold_years" />
          <Input label="Rent Growth" field="rent_growth" suffix="%" step="0.1" />
          <Input label="LTV" field="ltv" suffix="%" />
          <Input label="Interest Rate" field="rate" suffix="%" step="0.01" />
          <Input label="Amortization" field="amort" suffix="yr" />
        </div>
      </div>

      {/* AI MEMO */}
      {memoText && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✦ Investment Memo (Opus)</h3>
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{memoText}</div>
        </div>
      )}

      {/* COMPS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Lease Comps ({relevantLeaseComps.length})</h3>
          {relevantLeaseComps.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No comps in {submarket || 'this submarket'}</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left', fontSize: '11px', padding: '6px 8px', color: 'var(--text-muted)' }}>Address</th>
                  <th style={{ textAlign: 'right', fontSize: '11px', padding: '6px 8px', color: 'var(--text-muted)' }}>SF</th>
                  <th style={{ textAlign: 'right', fontSize: '11px', padding: '6px 8px', color: 'var(--text-muted)' }}>Rate</th>
                  <th style={{ fontSize: '11px', padding: '6px 8px', color: 'var(--text-muted)' }}>Type</th>
                </tr></thead>
                <tbody>{relevantLeaseComps.map(c => (
                  <tr key={c.id} onClick={() => onLeaseCompClick?.(c)} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: onLeaseCompClick ? 'pointer' : 'default' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '6px 8px', fontSize: '13px', fontWeight: 500 }}>{c.address}</td>
                    <td style={{ padding: '6px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{c.rsf ? c.rsf.toLocaleString() : '—'}</td>
                    <td style={{ padding: '6px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>${c.rate}</td>
                    <td style={{ padding: '6px 8px', fontSize: '12px' }}>{c.lease_type || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Sale Comps ({relevantSaleComps.length})</h3>
          {relevantSaleComps.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No comps in {submarket || 'this submarket'}</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left', fontSize: '11px', padding: '6px 8px', color: 'var(--text-muted)' }}>Address</th>
                  <th style={{ textAlign: 'right', fontSize: '11px', padding: '6px 8px', color: 'var(--text-muted)' }}>$/SF</th>
                  <th style={{ textAlign: 'right', fontSize: '11px', padding: '6px 8px', color: 'var(--text-muted)' }}>Cap</th>
                  <th style={{ fontSize: '11px', padding: '6px 8px', color: 'var(--text-muted)' }}>Buyer</th>
                </tr></thead>
                <tbody>{relevantSaleComps.map(c => (
                  <tr key={c.id} onClick={() => onSaleCompClick?.(c)} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: onSaleCompClick ? 'pointer' : 'default' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '6px 8px', fontSize: '13px', fontWeight: 500 }}>{c.address}</td>
                    <td style={{ padding: '6px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>{c.price_psf ? '$' + Math.round(c.price_psf) : '—'}</td>
                    <td style={{ padding: '6px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{c.cap_rate ? parseFloat(c.cap_rate).toFixed(2) + '%' : '—'}</td>
                    <td style={{ padding: '6px 8px', fontSize: '12px' }}>{c.buyer || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* EXCEL UPLOAD */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Model Upload</h3>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Upload your full Excel acquisition model or link to OneDrive for the detailed underwriting.
        </div>
        {deal.onedrive_url ? (
          <a href={deal.onedrive_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, border: '1px solid var(--accent)' }}>📁 Open Excel Model in OneDrive ↗</a>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No OneDrive link set — add one in Deal Details → Edit → OneDrive Link</div>
        )}
      </div>
    </div>
  );
}
