'use client';

import { useState, useMemo, useEffect } from 'react';
import { fetchAll } from '../lib/db';

function xirr(cashflows) {
  if (!cashflows || cashflows.length < 2) return null;
  if (!cashflows.some(c => c.amount > 0) || !cashflows.some(c => c.amount < 0)) return null;
  const d0 = cashflows[0].date;
  const days = cashflows.map(c => (c.date - d0) / 86400000);
  const npv = r => cashflows.reduce((s, c, i) => s + c.amount / Math.pow(1 + r, days[i] / 365), 0);
  const dnpv = r => cashflows.reduce((s, c, i) => s + (-days[i] / 365) * c.amount / Math.pow(1 + r, days[i] / 365 + 1), 0);
  let g = 0.1;
  for (let i = 0; i < 100; i++) {
    const n = npv(g), dn = dnpv(g);
    if (Math.abs(dn) < 1e-12) break;
    const next = g - n / dn;
    if (Math.abs(next - g) < 1e-8) return next;
    g = next;
    if (g < -0.99) g = -0.5;
    if (g > 10) g = 5;
  }
  return isFinite(g) ? g : null;
}

const $ = n => { if (n == null || isNaN(n)) return '—'; const a = Math.abs(n), s = n < 0 ? '-' : ''; return a >= 1e6 ? s+'$'+(a/1e6).toFixed(1)+'M' : a >= 1e3 ? s+'$'+(a/1e3).toFixed(0)+'K' : s+'$'+Math.round(a); };
const pct = n => n != null && !isNaN(n) ? n.toFixed(1)+'%' : '—';

const Sl = ({ label, value, onChange, min, max, step, display, unit }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'12px', margin:'10px 0' }}>
    <label style={{ fontSize:'13px', color:'var(--ink3)', width:'200px', flexShrink:0 }}>{label}</label>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{ flex:1, height:'6px', accentColor:'var(--accent)' }}/>
    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'14px', fontWeight:600, minWidth:'70px', textAlign:'right' }}>{display||value}{unit||''}</span>
  </div>
);

const MC = ({ label, value, color, small }) => (
  <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', padding:small?'10px 14px':'16px 18px' }}>
    <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink4)', marginBottom:'6px' }}>{label}</div>
    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:small?'18px':'26px', fontWeight:700, color:color||'var(--ink)', lineHeight:1 }}>{value}</div>
  </div>
);

const Row = ({ label, value, color, bold, bg }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:bold?'14px 20px':'10px 20px', borderBottom:bold?'none':'1px solid var(--line3)', background:bg||'transparent' }}>
    <span style={{ fontSize:'13px', color:bold?(color||'var(--blue)'):'var(--ink3)', fontWeight:bold?600:400 }}>{label}</span>
    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:bold?'15px':'13px', fontWeight:bold?700:500, color:color||'var(--ink2)' }}>{value}</span>
  </div>
);

export default function Underwriting({ deal, property, leaseComps, saleComps, properties, deals, standalone }) {
  const [selectedPropId, setSelectedPropId] = useState(null);
  const [selectedDealId, setSelectedDealId] = useState(null);
  const p = standalone ? (properties||[]).find(pr=>pr.id===selectedPropId)||{} : (property||{});
  const d = standalone ? (deals||[]).find(dl=>dl.id===selectedDealId)||{} : (deal||{});

  // ─── DB COMPS ─────────────────────────────────────────────
  // Fetch comps from DB if not passed as props (i.e. when on DealDetail)
  const [dbLeaseComps, setDbLeaseComps] = useState([]);
  const [dbSaleComps, setDbSaleComps] = useState([]);
  useEffect(() => {
    if (!leaseComps && (p?.address || d?.address)) {
      fetchAll('lease_comps', {}).then(all => {
        const addr = p.address || d.address || '';
        const mkt = p.submarket || p.market || d.submarket || '';
        const sf = p.building_sf || d.building_sf;
        const filtered = all.filter(c =>
          (mkt && (c.submarket === mkt || c.market === mkt)) ||
          (sf && c.building_sf && Math.abs(c.building_sf - sf) / sf < 0.5)
        ).slice(0, 12);
        setDbLeaseComps(filtered);
      }).catch(() => {});
    }
    if (!saleComps && (p?.address || d?.address)) {
      fetchAll('sale_comps', {}).then(all => {
        const mkt = p.submarket || p.market || d.submarket || '';
        const sf = p.building_sf || d.building_sf;
        const filtered = all.filter(c =>
          (mkt && (c.submarket === mkt || c.market === mkt)) ||
          (sf && c.building_sf && Math.abs(c.building_sf - sf) / sf < 0.5)
        ).slice(0, 12);
        setDbSaleComps(filtered);
      }).catch(() => {});
    }
  }, [p?.address, p?.submarket, p?.market, d?.address, d?.submarket, leaseComps, saleComps]);

  const effectiveLeaseComps = leaseComps || dbLeaseComps;
  const effectiveSaleComps = saleComps || dbSaleComps;

  // ─── AI STRENGTHS / RISKS ─────────────────────────────────
  const [aiStrengths, setAiStrengths] = useState(null);
  const [aiRisks, setAiRisks] = useState(null);
  const [editingStrengths, setEditingStrengths] = useState(false);
  const [editingRisks, setEditingRisks] = useState(false);
  const [strengthsDraft, setStrengthsDraft] = useState('');
  const [risksDraft, setRisksDraft] = useState('');
  const [srLoading, setSrLoading] = useState(false);

  const generateStrengthsRisks = async (currentMetrics) => {
    setSrLoading(true);
    try {
      const { goingInCap, levIRR, unlevIRR, eqMult, y1dscr, ppsf, avgSalePsf, avgLeaseRate, rent } = currentMetrics;
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 500,
          system: 'You are a CRE investment analyst. Given underwriting metrics, identify the key investment strengths and risks. Be concise and specific. Return ONLY valid JSON with this exact format: {"strengths":[{"label":"string","level":"Strong|Good|Moderate"}],"risks":[{"label":"string","level":"High|Medium|Low"}]}. 3-5 items per category max.',
          messages: [{ role: 'user', content: `Property: ${p.address || d.deal_name || 'Unknown'}\nBuilding SF: ${Number(sf).toLocaleString()}\nPurchase Price: $${(purchasePrice/1e6).toFixed(2)}M\nPrice/SF: $${Math.round(ppsf)}\nGoing-In Cap: ${goingInCap.toFixed(2)}%\nLevered IRR: ${levIRR != null ? (levIRR*100).toFixed(1)+'%' : 'N/A'}\nUnlevered IRR: ${unlevIRR != null ? (unlevIRR*100).toFixed(1)+'%' : 'N/A'}\nEquity Multiple: ${eqMult.toFixed(2)}x\nYear 1 DSCR: ${y1dscr ? y1dscr.toFixed(2)+'x' : 'N/A'}\nAvg Lease Comp Rate: ${avgLeaseRate ? '$'+avgLeaseRate.toFixed(2)+'/SF' : 'N/A'}\nAvg Sale Comp $/SF: ${avgSalePsf ? '$'+avgSalePsf : 'N/A'}\nIn-Place Rent: $${rent.toFixed(2)}/SF/mo\nYear Built: ${p.year_built || 'Unknown'}\nClear Height: ${p.clear_height || 'Unknown'}\nMarket: ${p.submarket || p.market || d.submarket || 'SoCal Industrial'}\nCatalyst Tags: ${(p.catalyst_tags || []).join(', ') || 'None'}\n\nIdentify investment strengths and risks. Return JSON only.` }],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setAiStrengths(parsed.strengths || []);
      setAiRisks(parsed.risks || []);
    } catch (e) {
      console.error('Strengths/risks AI error:', e);
    } finally { setSrLoading(false); }
  };

  // ─── MEMO EXPORT ──────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const handleExportMemo = async (currentMetrics) => {
    setExporting(true);
    try {
      const { goingInCap, levIRR, unlevIRR, eqMult, y1dscr } = currentMetrics;
      const strengths = aiStrengths?.map(s => `${s.label} (${s.level})`).join('; ') || 'Auto-calculated from model';
      const risks = aiRisks?.map(r => `${r.label} (${r.level})`).join('; ') || 'Auto-calculated from model';
      const res = await fetch('/api/export-memo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: p.address || d.address || d.deal_name || 'Unknown Property',
          city: p.city || d.city || '',
          building_sf: sf, purchase_price: purchasePrice,
          going_in_cap: goingInCap.toFixed(2),
          levered_irr: levIRR != null ? (levIRR*100).toFixed(1) : null,
          unlevered_irr: unlevIRR != null ? (unlevIRR*100).toFixed(1) : null,
          equity_multiple: eqMult.toFixed(2),
          dscr: y1dscr ? y1dscr.toFixed(2) : null,
          market_rent: rent, avg_lease_rate: effectiveLeaseComps.length ? effectiveLeaseComps.reduce((s,c)=>s+c.rate,0)/effectiveLeaseComps.length : null,
          avg_sale_psf: effectiveSaleComps.length ? Math.round(effectiveSaleComps.reduce((s,c)=>s+c.price_psf,0)/effectiveSaleComps.length) : null,
          strengths, risks,
          deal_name: d.deal_name || null,
          notes: d.notes || p.notes || null,
        }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${((p.address||d.deal_name||'Deal').replace(/[^a-zA-Z0-9]/g,'_'))}_Memo.docx`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const defSf = d.building_sf||p.building_sf||p.total_sf||52000;
  const defPrice = d.deal_value||d.purchase_price||(p.estimated_value)||9800000;
  const defRent = p.in_place_rent||p.market_rent||d.market_rent||1.25;

  const [sf, setSf] = useState(defSf);
  const [purchasePrice, setPP] = useState(defPrice);
  const [marketRent, setMR] = useState(Math.round(defRent*100));
  const [vacancy, setVac] = useState(5);
  const [expRatio, setExpR] = useState(8);
  const [mgmtFee, setMgmt] = useState(4);
  const [reserves, setRes] = useState(8);
  const [rentGrowth, setRG] = useState(3);
  const [expGrowth, setEG] = useState(2);
  const [holdYrs, setHold] = useState(5);
  const [exitCap, setEC] = useState(550);
  const [closCost, setCC] = useState(2);
  const [sellCost, setSC] = useState(2);
  const [vacMo, setVM] = useState(3);
  const [tiSf, setTI] = useState(10);
  const [capexSf, setCX] = useState(5);
  const [useLev, setUseLev] = useState(true);
  const [ltv, setLTV] = useState(65);
  const [intRate, setIR] = useState(625);
  const [amortYrs, setAmort] = useState(30);
  const [ioPer, setIO] = useState(2);

  useMemo(() => { if(defSf>0) setSf(defSf); if(defPrice>0) setPP(defPrice); if(defRent>0) setMR(Math.round(defRent*100)); }, [defSf,defPrice,defRent]);

  const avgLR = (effectiveLeaseComps||[]).filter(c=>c.rate>0);
  const avgLeaseRate = avgLR.length ? avgLR.reduce((s,c)=>s+c.rate,0)/avgLR.length : null;
  const avgSR = (effectiveSaleComps||[]).filter(c=>c.price_psf>0);
  const avgSalePsf = avgSR.length ? Math.round(avgSR.reduce((s,c)=>s+c.price_psf,0)/avgSR.length) : null;
  const avgCR = (effectiveSaleComps||[]).filter(c=>c.cap_rate>0);
  const avgCapRate = avgCR.length ? avgCR.reduce((s,c)=>s+parseFloat(c.cap_rate),0)/avgCR.length : null;

  const rent = marketRent/100;
  const ppsf = sf>0 ? purchasePrice/sf : 0;
  const acqCosts = purchasePrice*(closCost/100);
  const repoVac = sf*rent*vacMo;
  const repoTI = sf*tiSf;
  const repoCX = sf*capexSf;
  const totalRepo = repoVac+repoTI+repoCX;
  const totalBasis = purchasePrice+acqCosts+totalRepo;
  const basisPsf = sf>0 ? totalBasis/sf : 0;
  const loanAmt = useLev ? purchasePrice*(ltv/100) : 0;
  const totalEquity = totalBasis - loanAmt;

  const years = useMemo(() => {
    const arr = [];
    for (let yr=1; yr<=holdYrs; yr++) {
      const gm = Math.pow(1+rentGrowth/100,yr-1);
      const em = Math.pow(1+expGrowth/100,yr-1);
      const annR = sf*rent*12*gm;
      const vLoss = annR*(vacancy/100);
      const egi = annR-vLoss;
      const opex = egi*(expRatio/100)*em;
      const mgmt = egi*(mgmtFee/100);
      const res = sf*(reserves/100)*12*em;
      const noi = egi-opex-mgmt-res;
      let ds=0;
      if (useLev && loanAmt>0) {
        const mr = (intRate/10000)/12;
        if (yr<=ioPer) { ds = loanAmt*(intRate/10000); }
        else { const tp=amortYrs*12; ds = mr>0 ? loanAmt*(mr*Math.pow(1+mr,tp))/(Math.pow(1+mr,tp)-1)*12 : 0; }
      }
      const btcf = noi-ds;
      const dscr = ds>0 ? noi/ds : null;
      arr.push({ yr,annR,vLoss,egi,opex,mgmt,res,noi,ds,btcf,dscr });
    }
    return arr;
  }, [sf,rent,vacancy,expRatio,mgmtFee,reserves,rentGrowth,expGrowth,holdYrs,useLev,loanAmt,intRate,amortYrs,ioPer]);

  const y1 = years[0]||{};
  const y1Noi = y1.noi||0;
  const goingInCap = totalBasis>0 ? (y1Noi/totalBasis)*100 : 0;
  const exitNoi = years.length>0 ? years[years.length-1].noi : 0;
  const ecPct = exitCap/100;
  const exitVal = ecPct>0 ? exitNoi/(ecPct/100) : 0;
  const netSale = exitVal - exitVal*(sellCost/100);
  const netEquity = netSale - loanAmt;
  const eqMult = totalEquity>0 ? (netEquity+years.reduce((s,y)=>s+y.btcf,0))/totalEquity : 0;

  const levIRR = useMemo(() => {
    const t = new Date();
    const cfs = [{date:t,amount:-totalEquity}];
    years.forEach((y,i)=>{ const dt=new Date(t); dt.setFullYear(dt.getFullYear()+y.yr); cfs.push({date:dt,amount:y.btcf+(i===years.length-1?netEquity:0)}); });
    return xirr(cfs);
  }, [totalEquity,years,netEquity]);

  const unlevIRR = useMemo(() => {
    const t = new Date();
    const cfs = [{date:t,amount:-totalBasis}];
    years.forEach((y,i)=>{ const dt=new Date(t); dt.setFullYear(dt.getFullYear()+y.yr); cfs.push({date:dt,amount:y.noi+(i===years.length-1?netSale:0)}); });
    return xirr(cfs);
  }, [totalBasis,years,netSale]);

  const sensEC = [exitCap-100,exitCap-50,exitCap,exitCap+50,exitCap+100].map(c=>c/100);
  const sensRG = [rentGrowth-2,rentGrowth-1,rentGrowth,rentGrowth+1,rentGrowth+2];

  const sensGrid = useMemo(() => sensRG.map(rg => sensEC.map(ec => {
    const yrs = [];
    for (let yr=1;yr<=holdYrs;yr++) {
      const gm=Math.pow(1+rg/100,yr-1), em=Math.pow(1+expGrowth/100,yr-1);
      const ar=sf*rent*12*gm, vl=ar*(vacancy/100), egi=ar-vl;
      const noi=egi-egi*(expRatio/100)*em-egi*(mgmtFee/100)-sf*(reserves/100)*12*em;
      let ds=0;
      if(useLev&&loanAmt>0){ const mr=(intRate/10000)/12; ds=yr<=ioPer?loanAmt*(intRate/10000):mr>0?loanAmt*(mr*Math.pow(1+mr,amortYrs*12))/(Math.pow(1+mr,amortYrs*12)-1)*12:0; }
      yrs.push({noi,btcf:noi-ds});
    }
    const ln=yrs[yrs.length-1].noi, ev=ec>0?ln/(ec/100):0, ns=ev-ev*(sellCost/100), ne=ns-loanAmt;
    const t=new Date(), cfs=[{date:t,amount:-totalEquity}];
    yrs.forEach((y,i)=>{ const dt=new Date(t); dt.setFullYear(dt.getFullYear()+i+1); cfs.push({date:dt,amount:y.btcf+(i===yrs.length-1?ne:0)}); });
    return xirr(cfs);
  })), [sensEC,sensRG,holdYrs,sf,rent,vacancy,expRatio,mgmtFee,reserves,expGrowth,useLev,loanAmt,intRate,amortYrs,ioPer,sellCost,totalEquity]);

  const ic = v => { if(v==null) return 'var(--ink4)'; if(v>=0.15) return 'var(--green)'; if(v>=0.10) return '#2E8B57'; if(v>=0.07) return 'var(--amber)'; return 'var(--rust)'; };

  return (
    <div>
      {standalone && (
        <div style={{ padding:'20px 36px', borderBottom:'1px solid var(--line)', display:'flex', gap:'16px', alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ fontSize:'13px', color:'var(--ink3)', fontWeight:600 }}>Load from:</div>
          <select className="select" style={{ maxWidth:'300px' }} value={selectedPropId||''} onChange={e=>setSelectedPropId(e.target.value||null)}>
            <option value="">— Select property —</option>
            {(properties||[]).map(pr=><option key={pr.id} value={pr.id}>{pr.address}, {pr.city} ({pr.building_sf?Number(pr.building_sf).toLocaleString()+' SF':'—'})</option>)}
          </select>
          <select className="select" style={{ maxWidth:'300px' }} value={selectedDealId||''} onChange={e=>setSelectedDealId(e.target.value||null)}>
            <option value="">— Select deal —</option>
            {(deals||[]).map(dl=><option key={dl.id} value={dl.id}>{dl.deal_name} ({dl.deal_value?$(dl.deal_value):'—'})</option>)}
          </select>
          <div style={{ fontSize:'12px', color:'var(--ink4)' }}>or adjust inputs below</div>
        </div>
      )}

      <div style={{ padding:'10px 36px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:'11px', color:'var(--ink4)' }}>
          {(effectiveLeaseComps.length > 0 || effectiveSaleComps.length > 0) && (
            <span>📊 {effectiveLeaseComps.length} lease comp{effectiveLeaseComps.length !== 1 ? 's' : ''} · {effectiveSaleComps.length} sale comp{effectiveSaleComps.length !== 1 ? 's' : ''} from database</span>
          )}
        </div>
        <button onClick={() => handleExportMemo({ goingInCap, levIRR, unlevIRR, eqMult, y1dscr: y1.dscr })} disabled={exporting}
          style={{ fontSize:'12px', fontWeight:600, padding:'6px 14px', background:'var(--card)', border:'1px solid var(--line)', borderRadius:'6px', color:'var(--ink2)', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
          {exporting ? '↻ Exporting...' : '↓ Export Memo'}
        </button>
      </div>

      <div className="metrics-bar" style={{ gridTemplateColumns:'repeat(6,1fr)' }}>
        <MC label="Purchase Price" value={$(purchasePrice)} />
        <MC label="Price / SF" value={ppsf>0?'$'+Math.round(ppsf):'—'} color="var(--accent)" />
        <MC label="All-In Basis / SF" value={basisPsf>0?'$'+Math.round(basisPsf):'—'} />
        <MC label="Going-In Cap" value={pct(goingInCap)} color={goingInCap>=5.5?'var(--green)':goingInCap>=4.5?'var(--amber)':'var(--ink3)'} />
        <MC label={`Levered IRR (${holdYrs}yr)`} value={levIRR!=null?pct(levIRR*100):'—'} color={ic(levIRR)} />
        <MC label="Equity Multiple" value={eqMult>0?eqMult.toFixed(2)+'x':'—'} color="var(--blue)" />
      </div>

      <div style={{ padding:'28px 36px 48px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'28px' }}>
        <div>
          <div className="sec-head">Property & Acquisition</div>
          <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', padding:'20px', marginBottom:'20px' }}>
            <Sl label="Building SF" value={sf} onChange={v=>setSf(Math.round(v))} min={5000} max={500000} step={1000} display={Number(sf).toLocaleString()} unit=" SF"/>
            <Sl label="Purchase Price" value={purchasePrice} onChange={v=>setPP(Math.round(v))} min={500000} max={50000000} step={100000} display={$(purchasePrice)}/>
            <Sl label="Market Rent (NNN)" value={marketRent} onChange={setMR} min={40} max={250} step={1} display={'$'+(marketRent/100).toFixed(2)} unit="/SF/mo"/>
            <Sl label="Vacancy %" value={vacancy} onChange={setVac} min={0} max={30} step={1} display={vacancy} unit="%"/>
            <Sl label="Closing Costs" value={closCost} onChange={setCC} min={0} max={5} step={0.5} display={closCost} unit="%"/>
          </div>

          <div className="sec-head">Growth & Hold</div>
          <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', padding:'20px', marginBottom:'20px' }}>
            <Sl label="Rent Growth / year" value={rentGrowth} onChange={setRG} min={-3} max={8} step={0.5} display={rentGrowth} unit="%"/>
            <Sl label="Expense Growth / year" value={expGrowth} onChange={setEG} min={0} max={6} step={0.5} display={expGrowth} unit="%"/>
            <Sl label="Hold Period" value={holdYrs} onChange={v=>setHold(Math.round(v))} min={1} max={10} step={1} display={holdYrs} unit=" years"/>
            <Sl label="Exit Cap Rate" value={exitCap} onChange={setEC} min={350} max={800} step={5} display={(exitCap/100).toFixed(2)} unit="%"/>
            <Sl label="Selling Costs" value={sellCost} onChange={setSC} min={0} max={5} step={0.5} display={sellCost} unit="%"/>
          </div>

          <div className="sec-head">Repositioning Costs</div>
          <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', padding:'20px', marginBottom:'20px' }}>
            <Sl label="Vacancy Period" value={vacMo} onChange={v=>setVM(Math.round(v))} min={0} max={24} step={1} display={vacMo} unit=" mo"/>
            <Sl label="TI / Leasing" value={tiSf} onChange={setTI} min={0} max={40} step={1} display={'$'+tiSf} unit="/SF"/>
            <Sl label="CapEx" value={capexSf} onChange={setCX} min={0} max={30} step={1} display={'$'+capexSf} unit="/SF"/>
            <div style={{ marginTop:'10px', padding:'10px 14px', background:'var(--bg)', borderRadius:'8px', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:'13px', fontWeight:600, color:'var(--ink3)' }}>Total Repositioning</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'14px', fontWeight:700, color:'var(--rust)' }}>{$(totalRepo)}</span>
            </div>
          </div>

          <div className="sec-head" style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            Debt Structure
            <label style={{ fontSize:'12px', display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', color:'var(--ink3)' }}>
              <input type="checkbox" checked={useLev} onChange={e=>setUseLev(e.target.checked)}/> Use leverage
            </label>
          </div>
          {useLev && (
            <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', padding:'20px', marginBottom:'20px' }}>
              <Sl label="LTV" value={ltv} onChange={setLTV} min={0} max={80} step={5} display={ltv} unit="%"/>
              <Sl label="Interest Rate" value={intRate} onChange={setIR} min={400} max={1000} step={5} display={(intRate/100).toFixed(2)} unit="%"/>
              <Sl label="Amortization" value={amortYrs} onChange={v=>setAmort(Math.round(v))} min={15} max={30} step={5} display={amortYrs} unit=" yr"/>
              <Sl label="IO Period" value={ioPer} onChange={v=>setIO(Math.round(v))} min={0} max={5} step={1} display={ioPer} unit=" yr"/>
              <div style={{ marginTop:'10px', padding:'10px 14px', background:'var(--bg)', borderRadius:'8px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ fontSize:'12px', color:'var(--ink4)' }}>Loan Amount</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'13px', fontWeight:600 }}>{$(loanAmt)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ fontSize:'12px', color:'var(--ink4)' }}>Equity Required</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'13px', fontWeight:600 }}>{$(totalEquity)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'12px', color:'var(--ink4)' }}>Year 1 DSCR</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'13px', fontWeight:600, color:(y1.dscr||0)>=1.25?'var(--green)':'var(--rust)' }}>{y1.dscr?y1.dscr.toFixed(2)+'x':'—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="sec-head">Year 1 NOI Waterfall</div>
          <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', overflow:'hidden', marginBottom:'20px' }}>
            <Row label={`Gross rent (${Number(sf).toLocaleString()} SF × $${rent.toFixed(2)} × 12)`} value={$(y1.annR)} color="var(--blue)"/>
            <Row label={`Less: vacancy (${vacancy}%)`} value={'('+$(y1.vLoss)+')'} color="var(--rust)"/>
            <Row label="Effective gross income" value={$(y1.egi)}/>
            <Row label={`Less: OpEx (${expRatio}% EGI)`} value={'('+$(y1.opex)+')'} color="var(--rust)"/>
            <Row label={`Less: management (${mgmtFee}%)`} value={'('+$(y1.mgmt)+')'} color="var(--rust)"/>
            <Row label={`Less: reserves ($${(reserves/100).toFixed(2)}/SF/mo)`} value={'('+$(y1.res)+')'} color="var(--rust)"/>
            <Row label="Stabilized NOI" value={$(y1Noi)} color="var(--blue)" bold bg="var(--blue-bg)"/>
          </div>

          <div className="sec-head">Return Summary</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
            <MC label="Unlevered IRR" value={unlevIRR!=null?pct(unlevIRR*100):'—'} color={ic(unlevIRR)} small/>
            <MC label="Levered IRR" value={levIRR!=null?pct(levIRR*100):'—'} color={ic(levIRR)} small/>
            <MC label="Equity Multiple" value={eqMult>0?eqMult.toFixed(2)+'x':'—'} color="var(--blue)" small/>
            <MC label="Yield on Cost" value={pct(goingInCap)} color={goingInCap>=5.5?'var(--green)':'var(--amber)'} small/>
            <MC label="Exit Value" value={$(exitVal)} small/>
            <MC label="Net Profit" value={$(netSale-totalBasis)} color={(netSale-totalBasis)>=0?'var(--green)':'var(--rust)'} small/>
          </div>

          <div className="sec-head">Multi-Year Pro Forma</div>
          <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', overflow:'auto', marginBottom:'20px' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead><tr style={{ borderBottom:'2px solid var(--line)' }}>
                <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--ink3)', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Year</th>
                {years.map(y=><th key={y.yr} style={{ padding:'10px 8px', textAlign:'right', fontWeight:700, color:'var(--ink3)', fontSize:'11px' }}>{y.yr}</th>)}
              </tr></thead>
              <tbody>
                {[['Revenue',y=>$(y.annR),null],['Vacancy',y=>'('+$(y.vLoss)+')','var(--rust)'],['EGI',y=>$(y.egi),null],['Expenses',y=>'('+$(y.opex+y.mgmt+y.res)+')','var(--rust)'],['NOI',y=>$(y.noi),'var(--blue)'],...(useLev?[['Debt Service',y=>'('+$(y.ds)+')','var(--rust)']]:[] ),['Cash Flow',y=>$(y.btcf),y=>y.btcf>=0?'var(--green)':'var(--rust)'],...(useLev?[['DSCR',y=>y.dscr?y.dscr.toFixed(2)+'x':'—',y=>(y.dscr||0)>=1.25?'var(--green)':'var(--rust)']]:[] )].map(([label,getter,cfn])=>(
                  <tr key={label} style={{ borderBottom:'1px solid var(--line3)',...(label==='NOI'||label==='Cash Flow'?{fontWeight:600}:{}) }}>
                    <td style={{ padding:'8px 12px', color:'var(--ink3)' }}>{label}</td>
                    {years.map(y=><td key={y.yr} style={{ padding:'8px', textAlign:'right', fontFamily:"'DM Mono',monospace", color:typeof cfn==='function'?cfn(y):(cfn||'var(--ink2)') }}>{getter(y)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sec-head">IRR Sensitivity (Levered)</div>
          <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', overflow:'auto', marginBottom:'20px' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead><tr>
                <th style={{ padding:'10px', textAlign:'center', fontSize:'10px', color:'var(--ink4)', fontWeight:700 }}>Rent ↓ / Exit Cap →</th>
                {sensEC.map(ec=><th key={ec} style={{ padding:'10px 6px', textAlign:'center', fontWeight:600, fontSize:'11px', color:ec===exitCap/100?'var(--accent)':'var(--ink3)' }}>{ec.toFixed(1)}%</th>)}
              </tr></thead>
              <tbody>
                {sensGrid.map((row,ri)=>(
                  <tr key={ri} style={{ borderTop:'1px solid var(--line3)' }}>
                    <td style={{ padding:'8px 12px', textAlign:'center', fontWeight:600, fontSize:'11px', color:sensRG[ri]===rentGrowth?'var(--accent)':'var(--ink3)' }}>{sensRG[ri]}%</td>
                    {row.map((irr,ci)=>{ const base=sensRG[ri]===rentGrowth&&sensEC[ci]===exitCap/100; return (
                      <td key={ci} style={{ padding:'8px 6px', textAlign:'center', fontFamily:"'DM Mono',monospace", fontWeight:base?700:500, fontSize:'12px', color:ic(irr), background:base?'rgba(107,131,166,0.1)':'transparent', border:base?'2px solid var(--accent)':'none', borderRadius:base?'4px':0 }}>
                        {irr!=null?(irr*100).toFixed(1)+'%':'—'}
                      </td>
                    ); })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(avgSalePsf||avgLeaseRate||avgCapRate) && (<>
            <div className="sec-head">Comp Benchmarks</div>
            <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', padding:'16px 20px', marginBottom:'20px' }}>
              {ppsf>0&&avgSalePsf&&<div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'8px 0' }}>
                <span style={{ fontSize:'12px', color:'var(--ink3)', width:'120px', textAlign:'right' }}>Subject $/SF</span>
                <div style={{ flex:1, height:'10px', background:'var(--bg3)', borderRadius:'5px', overflow:'hidden' }}><div style={{ height:'100%', width:`${Math.min(ppsf/(avgSalePsf*1.3)*100,100)}%`, background:ppsf<avgSalePsf?'var(--green)':'var(--amber)', borderRadius:'5px' }}/></div>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'12px', fontWeight:600, width:'70px' }}>${Math.round(ppsf)}/SF</span>
              </div>}
              {avgSalePsf&&<div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'8px 0' }}>
                <span style={{ fontSize:'12px', color:'var(--ink3)', width:'120px', textAlign:'right' }}>Market Avg</span>
                <div style={{ flex:1, height:'10px', background:'var(--bg3)', borderRadius:'5px', overflow:'hidden' }}><div style={{ height:'100%', width:`${Math.min(avgSalePsf/(avgSalePsf*1.3)*100,100)}%`, background:'var(--amber)', borderRadius:'5px' }}/></div>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'12px', fontWeight:600, width:'70px' }}>${avgSalePsf}/SF</span>
              </div>}
              {avgLeaseRate&&<div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderTop:'1px solid var(--line3)', marginTop:'8px' }}>
                <span style={{ fontSize:'12px', color:'var(--ink3)' }}>Avg Lease Comp Rate</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'12px', fontWeight:600 }}>${avgLeaseRate.toFixed(2)}/SF NNN</span>
              </div>}
              {avgCapRate&&<div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderTop:'1px solid var(--line3)' }}>
                <span style={{ fontSize:'12px', color:'var(--ink3)' }}>Avg Sale Comp Cap Rate</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'12px', fontWeight:600 }}>{avgCapRate.toFixed(2)}%</span>
              </div>}
            </div>
          </>)}

          <div className="sec-head" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>Risk / Reward</span>
            <button
              onClick={() => generateStrengthsRisks({ goingInCap, levIRR, unlevIRR, eqMult, y1dscr: y1.dscr, ppsf, avgSalePsf, avgLeaseRate, rent })}
              disabled={srLoading}
              style={{ fontSize:'11px', fontWeight:600, padding:'4px 10px', background:'var(--blue-bg)', border:'1px solid var(--blue-bdr)', borderRadius:'5px', color:'var(--blue)', cursor:'pointer', letterSpacing:'0.03em' }}>
              {srLoading ? '✦ Generating...' : aiStrengths ? '✦ Regenerate' : '✦ AI Generate'}
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            {/* STRENGTHS */}
            <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                <div style={{ fontSize:'13px', fontWeight:600, color:'var(--green)' }}>Strengths</div>
                {aiStrengths && (
                  <button onClick={() => { setEditingStrengths(!editingStrengths); setStrengthsDraft(aiStrengths.map(s=>`${s.label} | ${s.level}`).join('\n')); }}
                    style={{ fontSize:'10px', padding:'2px 7px', background:'transparent', border:'1px solid var(--line)', borderRadius:'4px', color:'var(--ink4)', cursor:'pointer' }}>
                    {editingStrengths ? 'Done' : 'Edit'}
                  </button>
                )}
              </div>
              {editingStrengths ? (
                <div>
                  <div style={{ fontSize:'10px', color:'var(--ink4)', marginBottom:'4px' }}>One per line: Label | Level (Strong/Good/Moderate)</div>
                  <textarea value={strengthsDraft} onChange={e => setStrengthsDraft(e.target.value)} rows={6}
                    style={{ width:'100%', fontSize:'12px', padding:'6px', background:'var(--bg)', border:'1px solid var(--line)', borderRadius:'6px', color:'var(--ink2)', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }} />
                  <button onClick={() => { const parsed = strengthsDraft.split('\n').filter(Boolean).map(line => { const [label,level]=line.split('|').map(s=>s.trim()); return {label:label||line.trim(),level:level||'Good'}; }); setAiStrengths(parsed); setEditingStrengths(false); }}
                    style={{ marginTop:'6px', fontSize:'11px', padding:'4px 10px', background:'var(--green-bg)', border:'1px solid rgba(26,122,72,0.3)', borderRadius:'4px', color:'var(--green)', cursor:'pointer', fontWeight:600 }}>Save</button>
                </div>
              ) : aiStrengths ? (
                aiStrengths.length === 0
                  ? <div style={{ fontSize:'12px', color:'var(--ink4)', fontStyle:'italic' }}>No strengths identified</div>
                  : aiStrengths.map((s,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--line3)', fontSize:'12px' }}>
                      <span style={{ color:'var(--ink3)' }}>{s.label}</span>
                      <span className="badge badge-green" style={{ fontSize:'10px' }}>{s.level}</span>
                    </div>
                  ))
              ) : (
                [ppsf>0&&avgSalePsf&&ppsf<avgSalePsf*0.9&&['Below-market basis','Strong'],goingInCap>=5.5&&['Strong yield','Strong'],(levIRR||0)>=0.12&&['Double-digit IRR','Strong'],(y1.dscr||0)>=1.5&&['Healthy DSCR','Good'],eqMult>=2&&['2x+ equity multiple','Strong'],rent>0&&avgLeaseRate&&rent<avgLeaseRate*0.95&&['Mark-to-market upside','Good']].filter(Boolean).map(([l,lv])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--line3)', fontSize:'12px' }}>
                    <span style={{ color:'var(--ink3)' }}>{l}</span><span className="badge badge-green" style={{ fontSize:'10px' }}>{lv}</span>
                  </div>
                ))
              )}
            </div>
            {/* RISKS */}
            <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:'10px', padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                <div style={{ fontSize:'13px', fontWeight:600, color:'var(--rust)' }}>Risks</div>
                {aiRisks && (
                  <button onClick={() => { setEditingRisks(!editingRisks); setRisksDraft(aiRisks.map(r=>`${r.label} | ${r.level}`).join('\n')); }}
                    style={{ fontSize:'10px', padding:'2px 7px', background:'transparent', border:'1px solid var(--line)', borderRadius:'4px', color:'var(--ink4)', cursor:'pointer' }}>
                    {editingRisks ? 'Done' : 'Edit'}
                  </button>
                )}
              </div>
              {editingRisks ? (
                <div>
                  <div style={{ fontSize:'10px', color:'var(--ink4)', marginBottom:'4px' }}>One per line: Label | Level (High/Medium/Low)</div>
                  <textarea value={risksDraft} onChange={e => setRisksDraft(e.target.value)} rows={6}
                    style={{ width:'100%', fontSize:'12px', padding:'6px', background:'var(--bg)', border:'1px solid var(--line)', borderRadius:'6px', color:'var(--ink2)', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }} />
                  <button onClick={() => { const parsed = risksDraft.split('\n').filter(Boolean).map(line => { const [label,level]=line.split('|').map(s=>s.trim()); return {label:label||line.trim(),level:level||'Medium'}; }); setAiRisks(parsed); setEditingRisks(false); }}
                    style={{ marginTop:'6px', fontSize:'11px', padding:'4px 10px', background:'rgba(180,50,50,0.08)', border:'1px solid rgba(180,50,50,0.2)', borderRadius:'4px', color:'var(--rust)', cursor:'pointer', fontWeight:600 }}>Save</button>
                </div>
              ) : aiRisks ? (
                aiRisks.length === 0
                  ? <div style={{ fontSize:'12px', color:'var(--ink4)', fontStyle:'italic' }}>No risks identified</div>
                  : aiRisks.map((r,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--line3)', fontSize:'12px' }}>
                      <span style={{ color:'var(--ink3)' }}>{r.label}</span>
                      <span className={`badge ${r.level==='High'?'badge-warn':'badge-amber'}`} style={{ fontSize:'10px' }}>{r.level}</span>
                    </div>
                  ))
              ) : (
                [goingInCap<4.5&&goingInCap>0&&['Low yield on cost','High'],(y1.dscr||99)<1.25&&useLev&&['Tight DSCR','High'],(levIRR||0)<0.08&&levIRR!=null&&['Below-threshold IRR','Medium'],vacMo>9&&['Extended vacancy','High'],ecPct>6.5&&['Aggressive exit cap','Medium'],p.year_built&&p.year_built<1990&&[`Vintage (${p.year_built})`,'Medium'],p.clear_height&&parseInt(p.clear_height)<28&&[`Low clear (${p.clear_height}')`,'Medium']].filter(Boolean).map(([l,lv])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--line3)', fontSize:'12px' }}>
                    <span style={{ color:'var(--ink3)' }}>{l}</span><span className={`badge ${lv==='High'?'badge-warn':'badge-amber'}`} style={{ fontSize:'10px' }}>{lv}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
