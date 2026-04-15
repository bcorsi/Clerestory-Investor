'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtM(n) {
  if (n == null) return '—';
  const v = Number(n);
  return v >= 1000000 ? '$' + (v / 1000000).toFixed(1) + 'M' : '$' + fmt(v);
}
function fmtPct(n) { return n != null ? Number(n).toFixed(1) + '%' : '—'; }

const STAGES = ['Tracking','Underwriting','Offer / LOI','Under Contract','Due Diligence','Non-Contingent','Closed'];
const STAGE_COLORS = {'Tracking':'#4E6E96','Underwriting':'#8C5A04','Offer / LOI':'#5838A0','Under Contract':'#156636','Due Diligence':'#156636','Non-Contingent':'#0A7B6A','Closed':'#156636'};
const STRAT = {'Core':{bg:'rgba(78,110,150,0.08)',c:'#4E6E96',b:'rgba(78,110,150,0.25)'},'Core+':{bg:'rgba(21,102,54,0.08)',c:'#156636',b:'rgba(21,102,54,0.25)'},'Value-Add':{bg:'rgba(140,90,4,0.08)',c:'#8C5A04',b:'rgba(140,90,4,0.25)'},'SLB':{bg:'rgba(184,55,20,0.08)',c:'#B83714',b:'rgba(184,55,20,0.25)'},'Sale-Leaseback':{bg:'rgba(184,55,20,0.08)',c:'#B83714',b:'rgba(184,55,20,0.25)'},'Development':{bg:'rgba(88,56,160,0.08)',c:'#5838A0',b:'rgba(88,56,160,0.25)'}};

export default function AcquisitionPipeline() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from('deals').select('*').not('stage','in','("Dead","Closed Lost")').order('created_at',{ascending:false});
      setDeals(data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  const active = deals.filter(d => !['Closed','Closed Won','Dead'].includes(d.stage));
  const totalBasis = deals.reduce((s,d) => s + (Number(d.deal_value)||0), 0);
  const totalEquity = deals.reduce((s,d) => s + (Number(d.equity_required)||0), 0);
  const capD = deals.filter(d => d.going_in_cap && d.deal_value);
  const wtdCap = capD.length ? capD.reduce((s,d) => s + Number(d.going_in_cap)*Number(d.deal_value),0) / capD.reduce((s,d) => s+Number(d.deal_value),0) : null;
  const irrD = deals.filter(d => d.target_irr && d.equity_required);
  const wtdIrr = irrD.length ? irrD.reduce((s,d) => s + Number(d.target_irr)*Number(d.equity_required),0) / irrD.reduce((s,d) => s+Number(d.equity_required),0) : null;

  const grouped = {};
  STAGES.forEach(s => { grouped[s] = []; });
  deals.forEach(d => {
    const st = d.stage || 'Tracking';
    const m = st === 'Off-Market Outreach' || st === 'Marketing' || st === 'LOI' ? 'Offer / LOI'
      : st === 'LOI Accepted' || st === 'PSA Negotiation' ? 'Under Contract'
      : st === 'Closed Won' ? 'Closed' : st;
    if (grouped[m]) grouped[m].push(d);
    else grouped['Tracking'].push(d);
  });

  return (
    <div>
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title" style={{fontSize:28}}>Acquisition{' '}<span style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontWeight:400,color:'var(--blue)'}}>Pipeline</span></h1>
          <p className="cl-page-subtitle" style={{fontSize:14}}>{loading ? 'Loading…' : deals.length + ' acquisitions · ' + fmtM(totalBasis) + ' total basis'}</p>
        </div>
        <div className="cl-page-actions">
          <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => setView(v => v==='kanban'?'table':'kanban')}>{view==='kanban'?'Table View':'Kanban View'}</button>
          <Link href="/deals/new" className="cl-btn cl-btn-primary cl-btn-sm" style={{textDecoration:'none'}}>+ New Acquisition</Link>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <KPI ic="◈" icc="var(--blue)" l="Active Acquisitions" v={active.length} />
        <KPI ic="$" icc="var(--blue)" l="Total Basis" v={fmtM(totalBasis)} />
        <KPI ic="↗" icc="var(--green)" l="Equity Deployed" v={fmtM(totalEquity)} vc="var(--green)" />
        <KPI ic="◉" icc="var(--green)" l="Wtd Going-In Cap" v={wtdCap ? fmtPct(wtdCap) : '—'} vc="var(--green)" s="target: 5.5%+" />
        <KPI ic="⟳" icc="var(--green)" l="Pipeline IRR" v={wtdIrr ? fmtPct(wtdIrr) : '—'} vc="var(--green)" s="levered, 5yr hold" />
      </div>

      {loading ? (
        <div className="cl-loading"><div className="cl-spinner"/>Loading acquisitions…</div>
      ) : view === 'kanban' ? (
        <div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:12}}>
          {STAGES.map(stage => <KanbanCol key={stage} stage={stage} deals={grouped[stage]||[]} />)}
        </div>
      ) : (
        <TblView deals={deals} />
      )}
    </div>
  );
}

function KPI({ic,icc,l,v,vc,s}) {
  return <div style={{background:'#FAFAF8',border:'1px solid rgba(0,0,0,0.06)',borderRadius:10,padding:'14px 16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:12}}>
    <div style={{width:36,height:36,borderRadius:8,background:icc+'15',color:icc,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{ic}</div>
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:vc||'var(--text-primary)',lineHeight:1}}>{v}</div>
      <div style={{fontSize:12,color:'#78726A',marginTop:3}}>{l}</div>
      {s && <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#78726A',marginTop:2}}>{s}</div>}
    </div>
  </div>;
}

function KanbanCol({stage,deals}) {
  const color = STAGE_COLORS[stage]||'#4E6E96';
  const colVal = deals.reduce((s,d) => s+(Number(d.deal_value)||0),0);
  return <div style={{flex:'0 0 250px',display:'flex',flexDirection:'column'}}>
    <div style={{padding:'10px 12px',borderRadius:'8px 8px 0 0',marginBottom:8,background:color+'18',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <span style={{fontSize:12,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',color}}>{stage}</span>
      <span style={{fontFamily:'var(--font-mono)',fontSize:11,background:color+'22',padding:'2px 7px',borderRadius:20,color}}>{deals.length}</span>
    </div>
    {colVal > 0 && <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'#78726A',marginTop:-4,marginBottom:6,paddingLeft:12}}>{fmtM(colVal)}</div>}
    {deals.map(d => <DealCard key={d.id} deal={d} sc={color} />)}
    <Link href="/deals/new" style={{display:'flex',alignItems:'center',justifyContent:'center',height:38,borderRadius:7,border:'1px dashed rgba(0,0,0,0.1)',color:'#78726A',fontSize:12,textDecoration:'none',marginTop:4}}>+ Add</Link>
  </div>;
}

function DealCard({deal,sc}) {
  const cap = deal.going_in_cap ? Number(deal.going_in_cap).toFixed(1)+'% cap' : null;
  const irr = deal.target_irr ? Number(deal.target_irr).toFixed(1)+'% IRR' : null;
  const psf = deal.deal_value && deal.building_sf ? '$'+Math.round(Number(deal.deal_value)/Number(deal.building_sf))+'/SF' : null;
  const str = deal.strategy_type || deal.deal_type || '';
  const ss = STRAT[str] || {bg:'rgba(0,0,0,0.04)',c:'#78726A',b:'rgba(0,0,0,0.1)'};
  return <Link href={'/deals/'+deal.id} style={{textDecoration:'none',color:'inherit'}}>
    <div style={{background:'#FAFAF8',borderRadius:8,padding:14,marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'1px solid rgba(0,0,0,0.06)',cursor:'pointer',borderLeft:deal.priority==='Critical'||deal.priority==='High'?'3px solid #B83714':'3px solid '+sc+'44'}}>
      <div style={{fontSize:14,fontWeight:500,color:'#2C2822',marginBottom:3,paddingLeft:4}}>{deal.deal_name||deal.company||'—'}</div>
      <div style={{fontSize:12,color:'#78726A',paddingLeft:4,marginBottom:8}}>{deal.address||'—'}{deal.building_sf ? ' · '+fmt(deal.building_sf)+' SF' : ''}</div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',paddingLeft:4,marginBottom:4}}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:'#2C2822',lineHeight:1}}>{deal.deal_value?fmtM(deal.deal_value):'—'}</span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'#156636',fontWeight:500}}>{cap||'—'}</span>
      </div>
      {(irr||psf) && <div style={{display:'flex',justifyContent:'space-between',paddingLeft:4,fontFamily:'var(--font-mono)',fontSize:11,marginBottom:6}}>
        <span style={{color:'#156636',fontWeight:500}}>{irr||''}</span>
        <span style={{color:'#78726A'}}>{psf||''}</span>
      </div>}
      {str && <div style={{paddingLeft:4,marginTop:4}}><span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:4,background:ss.bg,color:ss.c,border:'1px solid '+ss.b}}>{str}</span></div>}
      <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#78726A',paddingLeft:4,marginTop:6}}>
        {deal.target_close_date ? 'Close '+new Date(deal.target_close_date).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : deal.updated_at ? 'Updated '+new Date(deal.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''}
        {deal.close_probability!=null && <span style={{marginLeft:8}}>{deal.close_probability}% prob</span>}
      </div>
    </div>
  </Link>;
}

function TblView({deals}) {
  const hdr = ['Name / Address','Stage','Strategy','SF','Acq Price','$/SF','Cap','IRR','Equity','Prob.','Close'];
  return <div style={{borderRadius:12,border:'1px solid rgba(0,0,0,0.08)',boxShadow:'0 2px 6px rgba(0,0,0,0.06)',overflow:'hidden'}}>
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:14,minWidth:1100,background:'#FAFAF8'}}>
        <thead><tr>{hdr.map(h => <th key={h} style={{background:'#EDE8E0',fontFamily:'var(--font-mono)',fontSize:10,fontWeight:600,letterSpacing:'0.1em',color:'#78726A',textTransform:'uppercase',padding:'11px 14px',textAlign:'left',borderBottom:'1px solid rgba(0,0,0,0.08)',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
        <tbody>
          {deals.length === 0 ? <tr><td colSpan={11} style={{padding:40,textAlign:'center',color:'#78726A'}}>No acquisitions yet.</td></tr>
          : deals.map(d => {
            const str = d.strategy_type||d.deal_type||'';
            const ss = STRAT[str]||{};
            return <tr key={d.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)',cursor:'pointer'}} onClick={()=>window.location.href='/deals/'+d.id}>
              <td style={{padding:'10px 14px'}}><div style={{fontWeight:500,color:'#2C2822',fontSize:14}}>{d.deal_name||d.company||'—'}</div><div style={{fontSize:12,color:'#78726A'}}>{d.address||'—'}</div></td>
              <td><span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:(STAGE_COLORS[d.stage]||'#4E6E96')+'15',color:STAGE_COLORS[d.stage]||'#4E6E96'}}>{d.stage||'—'}</span></td>
              <td style={{fontSize:12,color:ss.c||'#78726A'}}>{str||'—'}</td>
              <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{d.building_sf?fmt(d.building_sf):'—'}</td>
              <td style={{fontFamily:'var(--font-mono)',fontSize:13,fontWeight:500}}>{d.deal_value?fmtM(d.deal_value):'—'}</td>
              <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{d.deal_value&&d.building_sf?'$'+Math.round(Number(d.deal_value)/Number(d.building_sf)):'—'}</td>
              <td style={{fontFamily:'var(--font-mono)',fontSize:12,color:'#156636',fontWeight:500}}>{d.going_in_cap?fmtPct(d.going_in_cap):'—'}</td>
              <td style={{fontFamily:'var(--font-mono)',fontSize:12,color:'#156636',fontWeight:500}}>{d.target_irr?fmtPct(d.target_irr):'—'}</td>
              <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{d.equity_required?fmtM(d.equity_required):'—'}</td>
              <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{d.close_probability!=null?d.close_probability+'%':'—'}</td>
              <td style={{fontFamily:'var(--font-mono)',fontSize:12,color:'#78726A'}}>{d.target_close_date?new Date(d.target_close_date).toLocaleDateString('en-US',{month:'short',year:'numeric'}):'—'}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </div>;
}
