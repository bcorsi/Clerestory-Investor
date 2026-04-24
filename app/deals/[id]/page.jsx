'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

// ── CONSTANTS ─────────────────────────────────────────────
const STAGES = ['Tracking','Underwriting','Off-Market Outreach','Marketing','LOI','LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won'];
const STAGE_PROB = {'Tracking':10,'Underwriting':25,'Off-Market Outreach':35,'Marketing':40,'LOI':60,'LOI Accepted':75,'PSA Negotiation':80,'Due Diligence':85,'Non-Contingent':95,'Closed Won':100,'Closed Lost':0,'Dead':0};
const TABS = ['Overview','Underwriting','BOV Dashboard','Buyer Matches','Contacts','Outreach','Tasks','Files'];
const SHOW_COMMISSION_STAGES = ['LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won'];

const fmt$  = n => n != null ? '$'+Number(n).toLocaleString() : '—';
const fmtM  = n => n != null ? '$'+(Number(n)/1e6).toFixed(1)+'M' : '—';
const fmtD  = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
const fmtSh = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';

// ── STAGE BADGE ────────────────────────────────────────────
function StageBadge({stage}) {
  const m = {
    'LOI Accepted':{bg:'rgba(21,112,66,.12)',c:'var(--green)',b:'rgba(21,112,66,.3)'},
    'Non-Contingent':{bg:'rgba(21,112,66,.18)',c:'var(--green)',b:'rgba(21,112,66,.4)'},
    'Closed Won':{bg:'rgba(21,112,66,.22)',c:'var(--green)',b:'rgba(21,112,66,.5)'},
    'Underwriting':{bg:'rgba(88,56,160,.1)',c:'var(--purple)',b:'rgba(88,56,160,.3)'},
    'LOI':{bg:'rgba(168,112,16,.1)',c:'var(--amber)',b:'rgba(168,112,16,.3)'},
    'PSA Negotiation':{bg:'rgba(168,112,16,.12)',c:'var(--amber)',b:'rgba(168,112,16,.3)'},
    'Due Diligence':{bg:'rgba(168,112,16,.14)',c:'var(--amber)',b:'rgba(168,112,16,.3)'},
    'Dead':{bg:'rgba(0,0,0,.06)',c:'var(--text-tertiary)',b:'rgba(0,0,0,.12)'},
    'Closed Lost':{bg:'rgba(184,55,20,.1)',c:'var(--rust)',b:'rgba(184,55,20,.25)'},
  };
  const s = m[stage]||{bg:'rgba(78,110,150,.1)',c:'var(--blue)',b:'rgba(78,110,150,.25)'};
  return <span style={{display:'inline-flex',alignItems:'center',fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:s.bg,color:s.c,border:`1px solid ${s.b}`}}>{stage}</span>;
}

function PriBadge({p}) {
  const m = {high:{bg:'rgba(184,55,20,.1)',c:'var(--rust)',l:'!! HIGH'},medium:{bg:'rgba(168,112,16,.1)',c:'var(--amber)',l:'! MEDIUM'},low:{bg:'rgba(78,110,150,.1)',c:'var(--blue)',l:'LOW'}};
  const s = m[p?.toLowerCase()]||m.medium;
  return <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,background:s.bg,color:s.c}}>{s.l}</span>;
}

// ── CARD ───────────────────────────────────────────────────
function Card({children,style,accentColor}) {
  return (
    <div style={{background:'var(--card-bg)',border:`1px solid ${accentColor||'var(--card-border)'}`,
      borderRadius:10,overflow:'hidden',boxShadow:'var(--card-shadow)',...style}}>
      {children}
    </div>
  );
}
function CardHdr({title,badge,action,onAction}) {
  return (
    <div style={{background:'#EDE8E0',borderBottom:'1px solid var(--card-border)',padding:'9px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <span style={{fontFamily:'var(--font-mono)',fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:7}}>
        {title}{badge&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:9,background:'rgba(21,112,66,.1)',color:'var(--green)',fontWeight:700,border:'1px solid rgba(21,112,66,.2)'}}>{badge}</span>}
      </span>
      {action&&<button onClick={onAction} style={{fontFamily:'var(--font-ui)',fontSize:11.5,color:'var(--blue)',background:'none',border:'none',cursor:'pointer',padding:0,fontStyle:'italic',fontFamily:'var(--font-editorial)'}}>{action}</button>}
    </div>
  );
}

function DR({label,value,valueColor,mono}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'5px 0',borderBottom:'1px solid rgba(0,0,0,0.05)',fontSize:12.5}}>
      <span style={{color:'var(--text-tertiary)'}}>{label}</span>
      <span style={{color:valueColor||'var(--text-primary)',fontWeight:500,fontFamily:mono?'var(--font-mono)':'var(--font-ui)',fontSize:mono?11:12.5}}>{value||'—'}</span>
    </div>
  );
}

// ── SCORE BAR ─────────────────────────────────────────────
function ScoreBar({label,score,color}) {
  return (
    <div style={{display:'flex',alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,.05)',fontSize:12}}>
      <span style={{flex:1,color:'var(--text-secondary)'}}>{label}</span>
      <div style={{flex:1,height:3,background:'rgba(0,0,0,.06)',borderRadius:2,margin:'0 10px'}}>
        <div style={{height:'100%',width:`${score*10}%`,background:color,borderRadius:2,transition:'width 1.2s ease'}}/>
      </div>
      <span style={{fontFamily:'var(--font-mono)',fontSize:11,fontWeight:500,minWidth:28,textAlign:'right',color}}>{score.toFixed(1)}</span>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
export default function DealDetailPage({params}) {
  const {id} = params;
  const router = useRouter();
  const [deal, setDeal]           = useState(null);
  const [property, setProperty]   = useState(null);
  const [contacts, setContacts]   = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [buyers, setBuyers]       = useState([]);
  const [outreach, setOutreach]   = useState([]);
  const [files, setFiles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);

  // Activity log
  const [actType, setActType] = useState('call');
  const [actNote, setActNote] = useState('');
  const [actDate, setActDate] = useState(new Date().toISOString().split('T')[0]);
  const [addingAct, setAddingAct] = useState(false);

  // AI Synthesis
  const [synthesis, setSynthesis] = useState('');
  const [genSynthesis, setGenSynthesis] = useState(false);
  const [genMemo, setGenMemo] = useState(false);

  // Opportunity Memo
  const [memo, setMemo] = useState('');
  const [editingMemo, setEditingMemo] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);

  // UW
  const [uwPrice, setUwPrice]   = useState('');
  const [uwSF, setUwSF]         = useState('');
  const [uwRent, setUwRent]     = useState('');
  const [uwMktRent, setUwMktRent] = useState('');
  const [uwBumps, setUwBumps]   = useState('3.0');
  const [uwExitCap, setUwExitCap] = useState('5.25');
  const [uwLtv, setUwLtv]       = useState('65');
  const [uwRate, setUwRate]     = useState('6.50');
  const [uwHold, setUwHold]     = useState('5');
  const [uwView, setUwView]     = useState('quick');
  const [uwRes, setUwRes]       = useState(null);

  useEffect(() => { loadDeal(); }, [id]);

  async function loadDeal() {
    setLoading(true);
    try {
      const sb = createClient();
      const {data:d,error} = await sb.from('deals').select('*').eq('id',id).single();
      if (error) throw error;
      setDeal(d);
      if (d.opportunity_memo) setMemo(d.opportunity_memo);
      if (d.ai_synthesis) setSynthesis(d.ai_synthesis);
      if (d.deal_value) setUwPrice(String(d.deal_value));

      const [
        {data:prop},
        {data:acts},
        {data:ctcts},
        {data:tsks},
        {data:buyerData},
        {data:outreachData},
        {data:fileData},
      ] = await Promise.all([
        d.property_id ? sb.from('properties').select('*').eq('id',d.property_id).single() : Promise.resolve({data:null}),
        sb.from('activities').select('*').eq('deal_id',id).order('activity_date',{ascending:false}).limit(30),
        sb.from('contacts').select('id,first_name,last_name,title,company,phone,email').or(d.property_id?`deal_id.eq.${id},property_id.eq.${d.property_id}`:`deal_id.eq.${id}`).limit(10),
        sb.from('tasks').select('*').eq('deal_id',id).order('due_date',{ascending:true}).limit(10),
        sb.from('buyer_accounts').select('id,account_name,buyer_type,target_sf_min,target_sf_max,target_markets,match_score,target_price_psf_max').order('match_score',{ascending:false,nullsFirst:false}).limit(8),
        sb.from('buyer_outreach').select('*').eq('deal_id',id).order('outreach_date',{ascending:false}).limit(20),
        sb.from('file_attachments').select('*').eq('deal_id',id).order('created_at',{ascending:false}).limit(20),
      ]);

      if (prop) {
        setProperty(prop);
        if (prop.building_sf) setUwSF(String(prop.building_sf));
        if (prop.in_place_rent) setUwRent(String(prop.in_place_rent));
      }
      setActivities(acts||[]);
      setContacts(ctcts||[]);
      setTasks(tsks||[]);
      setBuyers(buyerData||[]);
      setOutreach(outreachData||[]);
      setFiles(fileData||[]);
    } catch(e) {
      console.error('Deal load error:',e);
    } finally {
      setLoading(false);
    }
  }

  async function advanceStage(newStage) {
    if (!deal||saving) return;
    setSaving(true);
    try {
      const sb = createClient();
      const prob = STAGE_PROB[newStage]||deal.close_probability||0;
      await sb.from('deals').update({stage:newStage,close_probability:prob,stage_entered_at:new Date().toISOString()}).eq('id',id);
      setDeal(d=>({...d,stage:newStage,close_probability:prob}));
      showToast('Stage updated',`→ ${newStage} · ${prob}% probability`,'green');
    } finally { setSaving(false); }
  }

  async function logActivity() {
    if (!actNote.trim()) return;
    setAddingAct(true);
    try {
      const sb = createClient();
      const {data:a} = await sb.from('activities').insert({deal_id:id,activity_type:actType,subject:actNote,activity_date:actDate,completed:true}).select().single();
      if (a) setActivities(prev=>[a,...prev]);
      setActNote('');
      showToast('Activity logged',`${actType} · ${fmtSh(actDate)}`,'blue');
    } finally { setAddingAct(false); }
  }

  async function saveMemo() {
    setSavingMemo(true);
    try {
      const sb = createClient();
      await sb.from('deals').update({opportunity_memo:memo}).eq('id',id);
      setDeal(d=>({...d,opportunity_memo:memo}));
      setEditingMemo(false);
      showToast('Memo saved','Opportunity memo updated','green');
    } finally { setSavingMemo(false); }
  }

  async function generateSynthesis() {
    setGenSynthesis(true);
    setSynthesis('');
    try {
      const prompt = `You are a senior industrial real estate broker at Colliers International analyzing a deal in the SGV/IE market.

Deal: ${deal?.deal_name || deal?.address || 'Industrial property'}
Stage: ${deal?.stage || 'Unknown'}
Deal Type: ${deal?.deal_type || 'Sale'}
Deal Value: ${deal?.deal_value ? fmtM(deal.deal_value) : 'TBD'}
Commission Rate: ${deal?.commission_rate ? deal.commission_rate+'%' : 'TBD'}
Priority: ${deal?.priority || 'Medium'}
${property ? `
Property: ${property.address}, ${property.city}
Building SF: ${property.building_sf ? Number(property.building_sf).toLocaleString()+' SF' : 'Unknown'}
Clear Height: ${property.clear_height ? property.clear_height+"'" : 'Unknown'}
Year Built: ${property.year_built || 'Unknown'}
Owner: ${property.owner || 'Unknown'}
Tenant: ${property.tenant || 'Vacant'}
Submarket: ${property.submarket || property.city || 'SGV/IE'}` : ''}
${memo ? `\nOpportunity Memo: ${memo}` : ''}
${activities.length > 0 ? `\nRecent Activity: ${activities.slice(0,3).map(a=>a.subject).join(' | ')}` : ''}

Write a concise 3-4 sentence deal intelligence synthesis covering: (1) what makes this opportunity compelling, (2) the key risk or timing factor, (3) recommended next action. Be specific to the data above. Write in professional broker voice — direct, no fluff.`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({prompt, mode:'synthesis'}),
      });
      const json = await res.json();
      const text = json?.content?.[0]?.text || json?.text || '';
      setSynthesis(text);
      // Save to DB
      const sb = createClient();
      await sb.from('deals').update({ai_synthesis:text}).eq('id',id);
      showToast('AI Synthesis generated','Saved to deal record','purple');
    } catch(e) {
      console.error('AI synthesis error:',e);
      setSynthesis('Unable to generate synthesis. Check /api/ai route.');
    } finally { setGenSynthesis(false); }
  }


  async function generateMemo() {
    setGenMemo(true);
    try {
      const prompt = `You are a senior industrial real estate broker writing a concise opportunity memo for a deal.

Deal: ${deal?.deal_name || deal?.address || 'Industrial property'}
Stage: ${deal?.stage || 'Unknown'}
Deal Type: ${deal?.deal_type || 'Sale'}
Deal Value: ${deal?.deal_value ? fmtM(deal.deal_value) : 'TBD'}
Priority: ${deal?.priority || 'Medium'}
${property ? `Property: ${property.address}, ${property.city}
Building SF: ${property.building_sf ? Number(property.building_sf).toLocaleString()+' SF' : 'Unknown'}
Clear Height: ${property.clear_height ? property.clear_height+"'" : 'Unknown'}
Year Built: ${property.year_built || 'Unknown'}
Owner: ${property.owner || 'Unknown'}
Tenant: ${property.tenant || 'Vacant'}
Submarket: ${property.submarket || property.city || 'SGV/IE'}` : ''}
${activities.length > 0 ? 'Recent Activity: '+activities.slice(0,3).map(a=>a.subject).join(' | ') : ''}

Write a 2-3 sentence opportunity memo in first-person broker voice. Cover: what type of opportunity this is, what makes it compelling or urgent, and what the key next step is. Be specific and direct. No headers, just prose.`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({prompt, mode:'synthesis'}),
      });
      const json = await res.json();
      const text = json?.content?.[0]?.text || json?.text || '';
      setMemo(text);
      setEditingMemo(true);
      showToast('Memo generated','Review and save to deal record','blue');
    } catch(e) {
      console.error('Memo gen error:',e);
    } finally { setGenMemo(false); }
  }

  function runUW() {
    const price = parseFloat(uwPrice)||0;
    const sf    = parseFloat(uwSF)||1;
    const rent  = parseFloat(uwRent)||0;
    const bumps = parseFloat(uwBumps)/100||0.03;
    const exitCap = parseFloat(uwExitCap)/100||0.0525;
    const ltv   = parseFloat(uwLtv)/100||0.65;
    const rate  = parseFloat(uwRate)/100||0.065;
    const hold  = parseInt(uwHold)||5;
    if (!price||!rent||!sf) return;

    const annRent = rent*sf*12;
    const noi1    = annRent*0.985 - sf*0.10;
    const gicap   = noi1/price;
    const loanAmt = price*ltv;
    const annDS   = loanAmt*rate;
    const dscr1   = annDS>0?noi1/annDS:0;
    const equity  = price*(1-ltv)+price*0.006;

    // Newton-Raphson levered IRR
    const yr5NOI = noi1*Math.pow(1+bumps,hold-1);
    const netRev = yr5NOI/exitCap*(1-0.015)-loanAmt;
    let cumCF=0;
    const cfs=[];
    for(let y=1;y<=hold;y++){const cf=noi1*Math.pow(1+bumps,y-1)-annDS;cfs.push(cf);cumCF+=cf;}
    cfs[hold-1]+=netRev;
    let r=0.15;
    for(let i=0;i<60;i++){let npv=-equity,dn=0;cfs.forEach((c,t)=>{npv+=c/Math.pow(1+r,t+1);dn-=(t+1)*c/Math.pow(1+r,t+2);});const dr=npv/dn;r-=dr;if(Math.abs(dr)<1e-7)break;}

    // Unlevered IRR
    const ucfs=[];for(let y=1;y<=hold;y++)ucfs.push(noi1*Math.pow(1+bumps,y-1));
    ucfs[hold-1]+=yr5NOI/exitCap*(1-0.015);
    let ru=0.10;
    for(let i=0;i<60;i++){let npv=-price,dn=0;ucfs.forEach((c,t)=>{npv+=c/Math.pow(1+ru,t+1);dn-=(t+1)*c/Math.pow(1+ru,t+2);});const dr=npv/dn;ru-=dr;if(Math.abs(dr)<1e-7)break;}

    const em=(cumCF+netRev+equity)/equity;
    setUwRes({gicap,lirr:r,uirr:ru,em,dscr1,price,sf,loanAmt,annDS,equity,noi1,yr5NOI,bumps,hold,exitCap,annRent});
  }

  function showToast(title,body,type='blue') {
    const colors={blue:'var(--blue)',green:'var(--green)',purple:'var(--purple)',amber:'var(--amber)'};
    setToast({title,body,c:colors[type]||colors.blue});
    setTimeout(()=>setToast(null),4000);
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:12}}>
      <div className="cl-spinner"/>
      <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-tertiary)'}}>Loading deal…</span>
    </div>
  );
  if (!deal) return (
    <div style={{padding:40,textAlign:'center'}}>
      <p style={{color:'var(--text-secondary)',marginBottom:16}}>Deal not found.</p>
      <Link href="/deals" className="cl-btn cl-btn-secondary">← Back to Pipeline</Link>
    </div>
  );

  const stageIdx = STAGES.indexOf(deal.stage);
  const prob = deal.close_probability||STAGE_PROB[deal.stage]||0;
  const showComm = SHOW_COMMISSION_STAGES.includes(deal.stage);
  const grossComm = deal.deal_value&&deal.commission_rate ? deal.deal_value*(deal.commission_rate/100) : null;
  const cobrokeAmt = grossComm&&deal.cobroke_split ? grossComm*(deal.cobroke_split/100) : grossComm ? grossComm*0.5 : null;
  const netComm = grossComm&&cobrokeAmt ? grossComm-cobrokeAmt : null;
  const weightedComm = netComm ? netComm*(prob/100) : null;

  return (
    <div>
      {/* ── BREADCRUMB ─────────────────────────── */}
      <div style={{padding:'8px 20px',borderBottom:'1px solid var(--card-border)',background:'var(--card-bg)',display:'flex',alignItems:'center',gap:6,fontFamily:'var(--font-mono)',fontSize:11}}>
        <Link href="/deals" style={{color:'var(--blue)',textDecoration:'none'}}>Deal Pipeline</Link>
        <span style={{color:'var(--text-tertiary)'}}> › </span>
        <span style={{color:'var(--text-primary)',fontWeight:500}}>{deal.deal_name||deal.address||'Deal Detail'}</span>
      </div>

      {/* ── DEAL HEADER ────────────────────────── */}
      <div style={{background:'var(--card-bg)',borderBottom:'1px solid var(--card-border)',padding:'14px 20px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:21,fontWeight:700,color:'var(--text-primary)',marginBottom:4,letterSpacing:'-0.01em'}}>
            {deal.deal_name||deal.address||'Unnamed Deal'}
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-tertiary)',marginBottom:8,letterSpacing:'0.06em'}}>
            {property?.address||deal.address}
            {(deal.city||property?.city)&&` · ${deal.city||property.city}`}
            {property?.submarket&&` · ${property.submarket}`}
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            <StageBadge stage={deal.stage}/>
            {deal.priority&&<PriBadge p={deal.priority}/>}
            {deal.deal_type&&<span style={{fontSize:10,fontWeight:500,padding:'2px 7px',borderRadius:4,background:'rgba(88,56,160,.1)',color:'var(--purple)',border:'1px solid rgba(88,56,160,.2)'}}>{deal.deal_type}</span>}
            {property?.building_sf&&<span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-tertiary)',padding:'2px 6px',background:'rgba(0,0,0,.04)',borderRadius:4}}>{Number(property.building_sf).toLocaleString()} SF</span>}
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          {property&&<Link href={`/properties/${property.id}`} style={{fontSize:12,padding:'7px 12px',borderRadius:6,border:'1px solid var(--card-border)',background:'var(--card-bg)',color:'var(--text-secondary)',textDecoration:'none'}}>View Property</Link>}
          <button onClick={()=>{setActiveTab(0);}} style={{fontSize:12,padding:'7px 14px',borderRadius:6,background:'var(--blue)',color:'#fff',border:'none',cursor:'pointer',fontWeight:500}}>+ Log Activity</button>
        </div>
      </div>

      {/* ── STAGE TRACK ────────────────────────── */}
      <div style={{background:'var(--card-bg)',borderBottom:'1px solid var(--card-border)',padding:'8px 20px',display:'flex',alignItems:'center',overflowX:'auto',gap:0}}>
        {STAGES.map((s,i)=>{
          const done=i<stageIdx, active=i===stageIdx;
          return (
            <div key={s} style={{display:'flex',alignItems:'center',flexShrink:0}}>
              <button onClick={()=>advanceStage(s)} disabled={saving} style={{fontSize:11,padding:'4px 9px',borderRadius:3,border:'none',cursor:'pointer',fontFamily:'var(--font-ui)',fontWeight:active?600:400,whiteSpace:'nowrap',background:active?'var(--amber)':done?'rgba(21,112,66,.1)':'transparent',color:active?'#fff':done?'var(--green)':'var(--text-tertiary)',transition:'all .12s'}}>
                {s}
              </button>
              {i<STAGES.length-1&&<span style={{color:'rgba(0,0,0,.15)',margin:'0 2px',fontSize:12}}>›</span>}
            </div>
          );
        })}
      </div>

      {/* ── KPI STRIP ──────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',background:'var(--card-bg)',borderBottom:'1px solid var(--card-border)'}}>
        {[
          {label:'Deal Value',  val:deal.deal_value?fmtM(deal.deal_value):'—',          color:'var(--text-primary)'},
          {label:'Close Prob.', val:`${prob}%`,                                           color:prob>=75?'var(--green)':prob>=40?'var(--amber)':'var(--blue)'},
          {label:'Close Date',  val:fmtD(deal.expected_close_date),                      color:'var(--text-primary)'},
          {label:'$/SF',        val:deal.deal_value&&property?.building_sf?`$${Math.round(deal.deal_value/property.building_sf)}/SF`:'—', color:'var(--text-primary)'},
          showComm&&grossComm
            ? {label:'Est. Net Commission', val:netComm?fmt$(Math.round(netComm)):'—', color:'var(--green)'}
            : {label:'Commission Rate',     val:deal.commission_rate?`${deal.commission_rate}%`:'—', color:'var(--text-secondary)'},
          showComm&&weightedComm
            ? {label:'Weighted Pipeline',   val:fmt$(Math.round(weightedComm)), color:'var(--green)'}
            : {label:'Days in Stage',       val:deal.stage_entered_at?Math.round((Date.now()-new Date(deal.stage_entered_at))/(864e5))+'d':'—', color:'var(--text-secondary)'},
        ].map((k,i)=>(
          <div key={i} style={{padding:'11px 14px',borderRight:i<5?'1px solid var(--card-border)':'none'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:9,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--text-tertiary)',marginBottom:3}}>{k.label}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,color:k.color,lineHeight:1}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ───────────────────────────────── */}
      <div style={{background:'var(--card-bg)',borderBottom:'1px solid var(--card-border)',display:'flex',padding:'0 20px',overflowX:'auto'}}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setActiveTab(i)} style={{padding:'9px 13px',fontSize:12.5,fontFamily:'var(--font-ui)',background:'none',border:'none',cursor:'pointer',whiteSpace:'nowrap',borderBottom:activeTab===i?'2px solid var(--blue)':'2px solid transparent',color:activeTab===i?'var(--blue)':'var(--text-tertiary)',fontWeight:activeTab===i?500:400,transition:'all .12s'}}>
            {t}
            {t==='Contacts'&&contacts.length>0&&<span style={{fontFamily:'var(--font-mono)',fontSize:9,background:'rgba(0,0,0,.06)',borderRadius:7,padding:'1px 4px',marginLeft:3}}>{contacts.length}</span>}
            {t==='Tasks'&&tasks.length>0&&<span style={{fontFamily:'var(--font-mono)',fontSize:9,background:'rgba(0,0,0,.06)',borderRadius:7,padding:'1px 4px',marginLeft:3}}>{tasks.length}</span>}
            {t==='Outreach'&&outreach.length>0&&<span style={{fontFamily:'var(--font-mono)',fontSize:9,background:'rgba(0,0,0,.06)',borderRadius:7,padding:'1px 4px',marginLeft:3}}>{outreach.length}</span>}
          </button>
        ))}
      </div>

      {/* ── TAB PANELS ─────────────────────────── */}
      <div style={{padding:'16px 20px'}}>

        {/* ══ TAB 0: OVERVIEW ══════════════════════ */}
        {activeTab===0&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:14,alignItems:'start'}}>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>

              {/* AI SYNTHESIS */}
              <Card>
                <CardHdr title="AI Deal Synthesis" badge="Claude" action={genSynthesis?'Generating…':'↻ Generate'} onAction={generateSynthesis}/>
                <div style={{padding:'12px 14px'}}>
                  {genSynthesis?(
                    <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',color:'var(--text-tertiary)',fontSize:12.5}}>
                      <div className="cl-spinner" style={{width:14,height:14}}/>
                      Analyzing deal signals…
                    </div>
                  ):synthesis?(
                    <p style={{fontSize:13,lineHeight:1.7,color:'var(--text-secondary)',fontFamily:'var(--font-editorial)',fontStyle:'italic'}}>{synthesis}</p>
                  ):(
                    <div style={{padding:'12px 0',textAlign:'center'}}>
                      <p style={{fontSize:12.5,color:'var(--text-tertiary)',marginBottom:10}}>No synthesis yet. Generate an AI deal brief from live deal signals.</p>
                      <button onClick={generateSynthesis} style={{padding:'8px 18px',background:'var(--purple)',color:'#fff',border:'none',borderRadius:6,fontSize:12.5,fontWeight:500,cursor:'pointer',fontFamily:'var(--font-ui)'}}>Generate Synthesis</button>
                    </div>
                  )}
                </div>
              </Card>

              {/* DEAL SCREENING SCORE §05 */}
              <Card>
                <CardHdr title="Deal Screening Score" badge="§05"/>
                <div style={{padding:'8px 14px 12px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <span style={{fontSize:11.5,fontStyle:'italic',fontFamily:'var(--font-editorial)',color:'var(--text-secondary)'}}>Evaluate this deal across 5 weighted criteria</span>
                    <span style={{marginLeft:'auto',fontSize:12,fontWeight:600,padding:'4px 10px',borderRadius:4,background:'rgba(21,112,66,.1)',color:'var(--green)',border:'1px solid rgba(21,112,66,.2)'}}>● Strong Pursue — 42.1/50</span>
                  </div>
                  <ScoreBar label="Financial Returns ×2.5" score={8.8} color="var(--green)"/>
                  <ScoreBar label="Location Quality ×2.0"  score={8.2} color="var(--blue)"/>
                  <ScoreBar label="Building Quality ×2.0"  score={deal?.building_score?deal.building_score/12.5:7.6} color="var(--blue)"/>
                  <ScoreBar label="Land & Expansion ×2.0"  score={7.0} color="var(--amber)"/>
                  <ScoreBar label="Market Timing ×1.5"     score={8.5} color="var(--green)"/>
                </div>
              </Card>

              {/* COMMISSION WATERFALL §10 */}
              {showComm&&grossComm&&(
                <Card>
                  <CardHdr title="Commission Waterfall" badge="§10"/>
                  <div style={{padding:'10px 14px'}}>
                    {[
                      {label:'Gross Commission',   pct:100, val:fmt$(Math.round(grossComm)),       color:'var(--green)'},
                      {label:`Co-Broke (${deal.cobroke_split||50}%)`, pct:deal.cobroke_split||50, val:cobrokeAmt?'–'+fmt$(Math.round(cobrokeAmt)):'—', color:'var(--rust)'},
                      {label:'Net Commission',     pct:50,  val:netComm?fmt$(Math.round(netComm)):'—', color:'var(--blue)'},
                      {label:`Weighted (${prob}%)`,pct:prob/2, val:weightedComm?fmt$(Math.round(weightedComm)):'—', color:'var(--amber)'},
                    ].map((r,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:7}}>
                        <span style={{fontSize:11,color:'var(--text-secondary)',width:160,flexShrink:0}}>{r.label}</span>
                        <div style={{flex:1,height:20,background:'rgba(0,0,0,.05)',borderRadius:4,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${r.pct}%`,background:r.color,borderRadius:4,opacity:.75,transition:'width 1.2s ease'}}/>
                        </div>
                        <span style={{fontFamily:'var(--font-mono)',fontSize:11.5,fontWeight:600,width:80,textAlign:'right',color:r.color}}>{r.val}</span>
                      </div>
                    ))}
                    <div style={{marginTop:8,padding:'9px 12px',background:'rgba(21,112,66,.07)',borderRadius:5,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                      <span style={{fontSize:10,fontWeight:600,color:'var(--green)',letterSpacing:'0.05em',textTransform:'uppercase'}}>Weighted Pipeline Value</span>
                      <span style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,color:'var(--green)'}}>{weightedComm?fmt$(Math.round(weightedComm)):'—'}</span>
                    </div>
                    {netComm&&weightedComm&&<div style={{marginTop:6,fontSize:11,color:'var(--text-tertiary)',fontStyle:'italic',fontFamily:'var(--font-editorial)'}}>Net {fmt$(Math.round(netComm))} × {prob}% probability = {fmt$(Math.round(weightedComm))}</div>}
                  </div>
                </Card>
              )}

              {/* ACTIVITY TIMELINE */}
              <Card>
                <CardHdr title="Activity Timeline" action="+ Log Activity"/>
                {/* Log form */}
                <div style={{padding:'10px 14px',borderBottom:'1px solid var(--card-border)',background:'rgba(0,0,0,.02)',display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap'}}>
                  <select value={actType} onChange={e=>setActType(e.target.value)} style={{padding:'6px 8px',borderRadius:5,border:'1px solid var(--card-border)',fontFamily:'var(--font-ui)',fontSize:12,background:'var(--card-bg)',outline:'none'}}>
                    {['call','email','meeting','note','stage_change','underwriting'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
                  </select>
                  <input type="date" value={actDate} onChange={e=>setActDate(e.target.value)} style={{padding:'6px 8px',borderRadius:5,border:'1px solid var(--card-border)',fontFamily:'var(--font-mono)',fontSize:11,background:'var(--card-bg)',outline:'none'}}/>
                  <input placeholder="Notes…" value={actNote} onChange={e=>setActNote(e.target.value)} onKeyDown={e=>e.key==='Enter'&&logActivity()} style={{flex:1,minWidth:180,padding:'6px 10px',borderRadius:5,border:'1px solid var(--card-border)',fontFamily:'var(--font-ui)',fontSize:12.5,background:'var(--card-bg)',outline:'none'}}/>
                  <button onClick={logActivity} disabled={addingAct||!actNote.trim()} style={{padding:'6px 14px',borderRadius:5,background:'var(--blue)',color:'#fff',border:'none',cursor:'pointer',fontSize:12,opacity:actNote.trim()?1:0.5}}>{addingAct?'…':'Log'}</button>
                </div>
                {/* Entries */}
                <div style={{padding:'0 14px'}}>
                  {activities.length===0?(
                    <div style={{padding:'20px 0',textAlign:'center',color:'var(--text-tertiary)',fontSize:12.5}}>No activity logged yet</div>
                  ):activities.map(a=>{
                    const icons={call:'☏',email:'✉',meeting:'👥',note:'📝',stage_change:'↑',underwriting:'◈'};
                    const colors_map={call:'rgba(78,110,150,.1)',email:'rgba(168,112,16,.1)',meeting:'rgba(21,112,66,.1)',note:'rgba(140,90,4,.1)',stage_change:'rgba(21,112,66,.1)',underwriting:'rgba(88,56,160,.1)'};
                    const fg_map={call:'var(--blue)',email:'var(--amber)',meeting:'var(--green)',note:'var(--amber)',stage_change:'var(--green)',underwriting:'var(--purple)'};
                    const t = a.activity_type||'note';
                    return (
                      <div key={a.id} style={{display:'flex',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,.05)'}}>
                        <div style={{width:27,height:27,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:11,marginTop:1,background:colors_map[t]||'rgba(0,0,0,.05)',color:fg_map[t]||'var(--text-tertiary)'}}>{icons[t]||'·'}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12.5,fontWeight:500,color:'var(--text-primary)',marginBottom:1}}>{a.subject||a.activity_type}</div>
                          {a.notes&&<div style={{fontSize:11.5,color:'var(--text-secondary)',lineHeight:1.5}}>{a.notes}</div>}
                          <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-tertiary)',marginTop:2}}>{fmtD(a.activity_date||a.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* ── RIGHT SIDEBAR ────────────────── */}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>

              {/* PROBABILITY */}
              <Card accentColor={prob>=75?'rgba(21,112,66,.3)':'rgba(78,110,150,.2)'}>
                <div style={{padding:14}}>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:9,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:prob>=75?'var(--green)':'var(--blue)',marginBottom:6}}>
                    Probability to Close <span style={{fontSize:8,padding:'1px 4px',borderRadius:7,background:prob>=75?'rgba(21,112,66,.1)':'rgba(78,110,150,.1)',marginLeft:4}}>§07</span>
                  </div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:52,fontWeight:700,color:prob>=75?'var(--green)':'var(--blue)',lineHeight:1,letterSpacing:'-0.03em'}}>{prob}%</div>
                  <div style={{height:4,background:'rgba(0,0,0,.06)',borderRadius:2,overflow:'hidden',margin:'10px 0'}}>
                    <div style={{height:'100%',width:`${prob}%`,borderRadius:2,background:`linear-gradient(90deg,var(--blue),${prob>=75?'var(--green)':'var(--blue)'})`,transition:'width 1s ease'}}/>
                  </div>
                  <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.55}}>
                    {deal.stage} · {deal.deal_type||'Sale'}
                    {deal.expected_close_date&&<><br/>Expected close {fmtD(deal.expected_close_date)}</>}
                  </div>
                </div>
              </Card>

              {/* COMMISSION SUMMARY (sidebar mini) */}
              {showComm&&grossComm&&(
                <Card>
                  <CardHdr title="Commission" badge="§10"/>
                  <div style={{padding:'8px 14px'}}>
                    <DR label="Deal Value"       value={fmtM(deal.deal_value)} mono/>
                    <DR label="Commission Rate"  value={`${deal.commission_rate}%`}/>
                    <DR label="Gross Commission" value={fmt$(Math.round(grossComm))} valueColor="var(--blue)" mono/>
                    <DR label={`Co-Broke (${deal.cobroke_split||50}%)`} value={cobrokeAmt?'–'+fmt$(Math.round(cobrokeAmt)):'—'} valueColor="var(--rust)" mono/>
                    <DR label="Net Commission"   value={netComm?fmt$(Math.round(netComm)):'—'} valueColor="var(--green)" mono/>
                    <div style={{marginTop:8,padding:'8px 10px',background:'rgba(21,112,66,.07)',borderRadius:5,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                      <span style={{fontSize:9.5,fontWeight:600,color:'var(--green)',letterSpacing:'0.05em',textTransform:'uppercase'}}>Weighted</span>
                      <span style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:'var(--green)'}}>{weightedComm?fmt$(Math.round(weightedComm)):'—'}</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* ACTIVE CATALYSTS */}
              <Card>
                <CardHdr title="Active Catalysts" badge="§06" action="+ Add"/>
                <div style={{padding:'6px 14px'}}>
                  {deal.catalyst_tags&&(Array.isArray(deal.catalyst_tags)?deal.catalyst_tags:[]).length>0?(
                    (Array.isArray(deal.catalyst_tags)?deal.catalyst_tags:[]).map((tag,i)=>{
                      const cat=typeof tag==='object'?tag.category:'owner';
                      const lbl=typeof tag==='object'?tag.tag:tag;
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,.05)'}}>
                          <span className={`cl-catalyst cl-catalyst--${cat==='owner'?'rust':cat==='market'?'blue':cat==='location'?'teal':'amber'}`} style={{fontSize:9.5,flexShrink:0}}>{lbl}</span>
                        </div>
                      );
                    })
                  ):(
                    <div style={{padding:'10px 0',fontSize:12,color:'var(--text-tertiary)',textAlign:'center'}}>No catalysts tagged yet</div>
                  )}
                </div>
              </Card>

              {/* OPPORTUNITY MEMO */}
              <Card>
                <CardHdr title="Opportunity Memo" action={editingMemo?null:(genMemo?'Generating…':'✦ Generate')} onAction={()=>!genMemo&&generateMemo()}/>
                <div style={{padding:'10px 14px'}}>
                  {editingMemo?(
                    <>
                      <textarea value={memo} onChange={e=>setMemo(e.target.value)} rows={5} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid rgba(78,110,150,.3)',fontFamily:'var(--font-ui)',fontSize:12.5,resize:'vertical',outline:'none',lineHeight:1.6}}/>
                      <div style={{display:'flex',gap:7,marginTop:8}}>
                        <button onClick={saveMemo} disabled={savingMemo} style={{flex:1,padding:'6px',background:'var(--blue)',color:'#fff',border:'none',borderRadius:5,fontSize:12,cursor:'pointer'}}>{savingMemo?'Saving…':'Save'}</button>
                        <button onClick={()=>{setEditingMemo(false);setMemo(deal.opportunity_memo||'');}} style={{flex:1,padding:'6px',background:'var(--card-bg)',color:'var(--text-secondary)',border:'1px solid var(--card-border)',borderRadius:5,fontSize:12,cursor:'pointer'}}>Cancel</button>
                      </div>
                    </>
                  ):memo?(
                    <div style={{background:'rgba(78,110,150,.06)',border:'1px solid rgba(78,110,150,.15)',borderRadius:6,overflow:'hidden'}}>
                      <div style={{padding:'6px 10px',background:'rgba(78,110,150,.08)',fontSize:9.5,fontWeight:600,color:'var(--blue)',letterSpacing:'0.06em',textTransform:'uppercase',borderBottom:'1px solid rgba(78,110,150,.1)'}}>Opportunity</div>
                      <p style={{padding:'9px 10px',fontSize:12.5,lineHeight:1.65,color:'var(--text-secondary)',margin:0,fontFamily:'var(--font-editorial)',fontStyle:'italic'}}>{memo}</p>
                    </div>
                  ):(
                    <div style={{padding:'10px 0',textAlign:'center'}}>
                      <p style={{fontSize:12,color:'var(--text-tertiary)',marginBottom:8}}>No memo yet. Describe the opportunity and key signals.</p>
                      <button onClick={()=>setEditingMemo(true)} style={{fontSize:12,padding:'6px 14px',borderRadius:5,background:'rgba(78,110,150,.1)',color:'var(--blue)',border:'1px solid rgba(78,110,150,.2)',cursor:'pointer'}}>+ Add Memo</button>
                    </div>
                  )}
                </div>
              </Card>

              {/* DEAL DETAILS */}
              <Card>
                <CardHdr title="Deal Details" action="Edit"/>
                <div style={{padding:'8px 14px'}}>
                  <DR label="Deal Type"     value={deal.deal_type}/>
                  <DR label="Priority"      value={deal.priority} valueColor={deal.priority==='high'?'var(--rust)':deal.priority==='medium'?'var(--amber)':'var(--blue)'}/>
                  <DR label="Asking Price"  value={deal.deal_value?fmtM(deal.deal_value):null}/>
                  {deal.lease_term&&<DR label="Lease Term"    value={deal.lease_term}/>}
                  {deal.market&&<DR label="Market"        value={deal.market}/>}
                  <DR label="Lead Source"  value={deal.lead_source}/>
                  <DR label="Created"      value={fmtD(deal.created_at)} mono/>
                  <DR label="Last Updated" value={fmtD(deal.updated_at)} mono/>
                </div>
              </Card>

              {/* PROPERTY LINK */}
              {property&&(
                <Card>
                  <CardHdr title="Linked Property" action="View →" onAction={()=>router.push(`/properties/${property.id}`)}/>
                  <div style={{padding:'8px 14px'}}>
                    <DR label="Address"      value={property.address}/>
                    <DR label="City"         value={property.city}/>
                    <DR label="Building SF"  value={property.building_sf?Number(property.building_sf).toLocaleString()+' SF':null}/>
                    <DR label="Clear Height" value={property.clear_height?`${property.clear_height}'`:null}/>
                    <DR label="Year Built"   value={property.year_built} mono/>
                    <DR label="Owner"        value={property.owner}/>
                    <DR label="Building Score" value={property.ai_score?`${property.ai_score}/100`:null} valueColor="var(--blue)"/>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB 1: UNDERWRITING ══════════════════ */}
        {activeTab===1&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {['quick','returns'].map(v=>(
                <button key={v} onClick={()=>setUwView(v)} style={{padding:'7px 16px',borderRadius:6,fontSize:12.5,fontFamily:'var(--font-ui)',cursor:'pointer',border:'1px solid var(--card-border)',background:uwView===v?'var(--blue)':'var(--card-bg)',color:uwView===v?'#fff':'var(--text-secondary)',fontWeight:uwView===v?500:400}}>
                  {v==='quick'?'Quick Underwrite':'Returns Dashboard'}
                </button>
              ))}
              <span style={{marginLeft:'auto',fontFamily:'var(--font-editorial)',fontSize:12,fontStyle:'italic',color:'var(--text-tertiary)'}}>Full UW model coming soon — use standalone mockup-underwriting.html</span>
            </div>

            {uwView==='quick'&&(
              <>
                <Card style={{border:'1px solid rgba(78,110,150,.25)'}}>
                  <div style={{borderLeft:'3px solid var(--blue)',overflow:'hidden',borderRadius:10}}>
                    <div style={{padding:'11px 16px 11px 18px',borderBottom:'1px solid var(--card-border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>Quick Underwrite — SLB / Acquisition Model</span>
                      <span style={{fontFamily:'var(--font-editorial)',fontSize:12,fontStyle:'italic',color:'var(--text-tertiary)'}}>Auto-populated from linked property</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,padding:'14px 18px'}}>
                      {[
                        {l:'Asking Price ($)',v:uwPrice,s:setUwPrice,note:uwPrice&&uwSF?`$${Math.round(uwPrice/uwSF)}/SF`:''},
                        {l:'Building SF',v:uwSF,s:setUwSF},
                        {l:'In-Place Rent (NNN $/SF/mo)',v:uwRent,s:setUwRent,note:uwRent&&uwSF?`= $${Math.round(uwRent*uwSF*12).toLocaleString()}/yr`:''},
                        {l:'Market Rent ($/SF/mo)',v:uwMktRent,s:setUwMktRent},
                        {l:'Annual Rent Bumps (%)',v:uwBumps,s:setUwBumps},
                        {l:'Exit Cap Rate (%)',v:uwExitCap,s:setUwExitCap},
                        {l:'LTV (%)',v:uwLtv,s:setUwLtv},
                        {l:'Interest Rate (%)',v:uwRate,s:setUwRate},
                        {l:'Hold Period (years)',v:uwHold,s:setUwHold},
                      ].map(({l,v,s,note})=>(
                        <div key={l}>
                          <label style={{display:'block',fontSize:9.5,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--text-tertiary)',marginBottom:4}}>{l}</label>
                          <input value={v} onChange={e=>s(e.target.value)} style={{width:'100%',padding:'7px 10px',borderRadius:6,border:'1px solid rgba(140,90,4,.2)',fontFamily:'var(--font-ui)',fontSize:13,color:'var(--text-primary)',background:'rgba(255,247,200,.2)',outline:'none'}}/>
                          {note&&<div style={{fontSize:11,color:'var(--text-tertiary)',fontStyle:'italic',marginTop:2}}>{note}</div>}
                        </div>
                      ))}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',background:'#EDE8E0',borderTop:'1px solid var(--card-border)',borderBottom:'1px solid var(--card-border)'}}>
                      {[
                        {l:'Going-In Cap', v:uwRes?`${(uwRes.gicap*100).toFixed(2)}%`:'—', c:uwRes&&uwRes.gicap>=0.05?'var(--green)':uwRes?'var(--amber)':'var(--text-tertiary)'},
                        {l:'Levered IRR',  v:uwRes?`${(uwRes.lirr*100).toFixed(1)}%`:'—',  c:uwRes&&uwRes.lirr>=0.15?'var(--green)':uwRes?'var(--amber)':'var(--text-tertiary)'},
                        {l:'Equity Multiple', v:uwRes?`${uwRes.em.toFixed(2)}×`:'—',       c:uwRes&&uwRes.em>=2?'var(--green)':uwRes?'var(--amber)':'var(--text-tertiary)'},
                        {l:'DSCR Year 1', v:uwRes?`${uwRes.dscr1.toFixed(2)}×`:'—',        c:uwRes&&uwRes.dscr1>=1.2?'var(--green)':uwRes?'var(--rust)':'var(--text-tertiary)'},
                      ].map((m,i)=>(
                        <div key={i} style={{padding:'12px 14px',borderRight:i<3?'1px solid var(--card-border)':'none'}}>
                          <label style={{display:'block',fontSize:9.5,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--text-tertiary)',marginBottom:5}}>{m.l}</label>
                          <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:700,lineHeight:1,color:m.c}}>{m.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:'10px 18px',display:'flex',alignItems:'center',gap:8}}>
                      <button onClick={runUW} style={{padding:'8px 18px',background:'var(--blue)',color:'#fff',border:'none',borderRadius:6,fontFamily:'var(--font-ui)',fontSize:12.5,fontWeight:500,cursor:'pointer'}}>▶ Run / Update</button>
                      <button style={{padding:'8px 14px',background:'rgba(21,112,66,.1)',color:'var(--green)',border:'1px solid rgba(21,112,66,.25)',borderRadius:6,fontSize:12.5,cursor:'pointer'}}>↓ Export Excel Model</button>
                      <span style={{fontFamily:'var(--font-editorial)',fontSize:12,fontStyle:'italic',color:'var(--text-tertiary)',marginLeft:'auto'}}>Full UW model: 7 tabs → IRR · sensitivity · rent roll</span>
                    </div>
                  </div>
                </Card>

                {/* NOI BUILD */}
                {uwRes&&(
                  <Card>
                    <CardHdr title="NOI Build — In-Place vs Stabilized"/>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',padding:'12px 14px',gap:14}}>
                      {[
                        {hdr:'In-Place (Current)',rows:[
                          {l:'Gross Potential Rent',v:fmt$(Math.round(uwRes.annRent))},
                          {l:'Vacancy (1.5% SLB)',v:`–$${Math.round(uwRes.annRent*.015).toLocaleString()}`,c:'var(--rust)'},
                          {l:'Structural Reserves',v:`–$${Math.round(uwRes.sf*.10).toLocaleString()}`,c:'var(--rust)'},
                          {l:'Net Operating Income',v:fmt$(Math.round(uwRes.noi1)),c:'var(--green)',bold:true},
                        ]},
                        {hdr:'Stabilized (Market Rent)',rows:[
                          {l:'Gross Potential Rent',v:uwRes.annRent&&uwMktRent?fmt$(Math.round(parseFloat(uwMktRent)*parseFloat(uwSF||1)*12)):fmt$(Math.round(uwRes.yr5NOI*1.15))},
                          {l:'Vacancy (5%)',v:`–$${Math.round(uwRes.annRent*.05).toLocaleString()}`,c:'var(--rust)'},
                          {l:'OpEx (NNN pass-through)',v:'—'},
                          {l:'Year 5 NOI',v:fmt$(Math.round(uwRes.yr5NOI)),c:'var(--green)',bold:true},
                        ]},
                      ].map(col=>(
                        <div key={col.hdr} style={{padding:'10px 12px',border:'1px solid var(--card-border)',borderRadius:6}}>
                          <div style={{fontFamily:'var(--font-mono)',fontSize:9.5,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--text-secondary)',marginBottom:10,paddingBottom:6,borderBottom:'1px solid var(--card-border)'}}>{col.hdr}</div>
                          {col.rows.map((r,i)=>(
                            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12,borderBottom:i<col.rows.length-1?'1px solid rgba(0,0,0,.04)':'none',fontWeight:r.bold?600:400}}>
                              <span style={{color:'var(--text-secondary)'}}>{r.l}</span>
                              <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:r.c||'var(--text-primary)'}}>{r.v}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}

            {uwView==='returns'&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {uwRes?(
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                      {[
                        {l:'Levered IRR',    v:`${(uwRes.lirr*100).toFixed(1)}%`,  c:'var(--green)', note:`${uwRes.lirr>=0.15?'✓':'✗'} 15% hurdle`},
                        {l:'Unlevered IRR',  v:`${(uwRes.uirr*100).toFixed(1)}%`,  c:'var(--green)', note:`${uwRes.uirr>=0.10?'✓':'✗'} 10% hurdle`},
                        {l:'Equity Multiple',v:`${uwRes.em.toFixed(2)}×`,           c:'var(--blue)',  note:`$${(uwRes.equity/1e6).toFixed(1)}M in`},
                        {l:'DSCR Year 1',   v:`${uwRes.dscr1.toFixed(2)}×`,        c:uwRes.dscr1>=1.2?'var(--green)':'var(--rust)', note:'Min 1.20× req.'},
                      ].map((k,i)=>(
                        <Card key={i} style={{borderTop:`3px solid ${k.c}`}}>
                          <div style={{padding:14,textAlign:'center'}}>
                            <div style={{fontFamily:'var(--font-mono)',fontSize:9,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--text-tertiary)',marginBottom:6}}>{k.l}</div>
                            <div style={{fontFamily:'var(--font-display)',fontSize:38,fontWeight:700,color:k.c,lineHeight:1}}>{k.v}</div>
                            <div style={{fontSize:11,color:'var(--text-tertiary)',marginTop:5}}>{k.note}</div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    {/* Sensitivity */}
                    <Card>
                      <CardHdr title="IRR Sensitivity — Exit Cap × Rent Growth"/>
                      <div style={{padding:14,overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'var(--font-mono)',fontSize:11.5}}>
                          <thead><tr>
                            <th style={{padding:'6px 9px',background:'#EDE8E0',border:'1px solid var(--card-border)',fontSize:9.5,fontWeight:600,color:'var(--text-secondary)',textAlign:'left'}}>Exit Cap \ Rent Gw.</th>
                            {[2.0,2.5,3.0,3.5,4.0].map(g=><th key={g} style={{padding:'6px 9px',background:'#EDE8E0',border:'1px solid var(--card-border)',fontSize:9.5,fontWeight:600,color:'var(--text-secondary)',textAlign:'center'}}>{g}%</th>)}
                          </tr></thead>
                          <tbody>
                            {[4.50,4.75,5.00,5.25,5.50,5.75].map(ec=>(
                              <tr key={ec}>
                                <td style={{padding:'6px 9px',border:'1px solid rgba(0,0,0,.05)',color:'var(--text-secondary)',fontWeight:500}}>{ec.toFixed(2)}%</td>
                                {[2.0,2.5,3.0,3.5,4.0].map(rg=>{
                                  const adj = uwRes.lirr+(0.0525-ec/100)*2.5+(rg/100-0.03)*1.5;
                                  const sc = adj>=0.20?{bg:'rgba(21,112,66,.15)',c:'var(--green)'}:adj>=0.16?{bg:'rgba(21,112,66,.07)',c:'var(--green)'}:adj>=0.12?{bg:'rgba(78,110,150,.08)',c:'var(--blue)'}:adj>=0.09?{bg:'rgba(168,112,16,.08)',c:'var(--amber)'}:{bg:'rgba(184,55,20,.08)',c:'var(--rust)'};
                                  const isBase=Math.abs(ec-5.25)<0.01&&Math.abs(rg-3.0)<0.01;
                                  return <td key={rg} style={{padding:'6px 9px',border:'1px solid rgba(0,0,0,.05)',textAlign:'center',background:isBase?'rgba(88,56,160,.12)':sc.bg,color:isBase?'var(--purple)':sc.c,fontWeight:isBase?700:400,outline:isBase?'2px solid var(--purple)':'none',outlineOffset:-2}}>{(adj*100).toFixed(1)}%</td>;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </>
                ):(
                  <div style={{padding:40,textAlign:'center',color:'var(--text-tertiary)'}}>Run Quick Underwrite first to see the Returns Dashboard.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB 2: BOV DASHBOARD ═════════════════ */}
        {activeTab===2&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Card>
              <CardHdr title="Broker Opinion of Value — Pricing Scenarios"/>
              <div style={{padding:14}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
                  {[
                    {l:'Conservative',cap:'6.00%',mult:.93,c:'var(--amber)'},
                    {l:'As-Is Value',  cap:'5.50%',mult:1,  c:'var(--blue)'},
                    {l:'Aggressive',  cap:'5.00%',mult:1.08,c:'var(--green)'},
                  ].map((s,i)=>(
                    <div key={i} style={{padding:14,border:'1px solid var(--card-border)',borderRadius:8,textAlign:'center'}}>
                      <div style={{fontSize:10,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--text-tertiary)',marginBottom:6}}>{s.l}</div>
                      <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:700,color:s.c,lineHeight:1}}>{deal.deal_value?fmtM(deal.deal_value*s.mult):'—'}</div>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-tertiary)',marginTop:4}}>@ {s.cap} cap</div>
                      {property?.building_sf&&deal.deal_value&&<div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-tertiary)',marginTop:2}}>${Math.round(deal.deal_value*s.mult/property.building_sf)}/SF</div>}
                    </div>
                  ))}
                </div>
                {/* Investment grade */}
                <div style={{display:'flex',alignItems:'center',gap:16,padding:14,background:'rgba(78,110,150,.06)',border:'1px solid rgba(78,110,150,.2)',borderRadius:8}}>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:42,fontWeight:700,color:'var(--blue)',flexShrink:0}}>A</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:4}}>Strong Pursue — Institutional-Grade Asset</div>
                    <div style={{fontSize:12.5,color:'var(--text-secondary)',lineHeight:1.55}}>{property?`${property.clear_height?"32' clear" : 'Industrial building'}, ${property.city||'SGV/IE'}. `:''}{deal.deal_type==='Sale-Leaseback'?'Owner-user willing to stay at market. Unencumbered. ':''}Pricing defensible against recent SGV comparables.</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ══ TAB 3: BUYER MATCHES ═════════════════ */}
        {activeTab===3&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Card>
              <CardHdr title="Buyer Match Scores" badge="§08"/>
              <div style={{padding:'0 14px'}}>
                {buyers.length===0?(
                  <div style={{padding:'20px 0',textAlign:'center',color:'var(--text-tertiary)',fontSize:12.5}}>No buyer accounts. Add buyers via Accounts page.</div>
                ):buyers.map(b=>{
                  const score=b.match_score||0;
                  const auto=score>=90;
                  return (
                    <div key={b.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(0,0,0,.05)'}}>
                      <div style={{width:36,height:36,borderRadius:7,background:'var(--text-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',fontFamily:'var(--font-mono)',flexShrink:0}}>{(b.account_name||'?').slice(0,2).toUpperCase()}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{b.account_name}</div>
                        <div style={{fontSize:11,color:'var(--text-tertiary)'}}>{b.buyer_type}{b.target_markets?.length>0?` · ${b.target_markets.slice(0,2).join(', ')}`:''}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:60,height:4,background:'rgba(0,0,0,.06)',borderRadius:2}}>
                          <div style={{height:'100%',width:`${score}%`,borderRadius:2,background:score>=90?'var(--green)':score>=70?'var(--blue)':'var(--text-tertiary)',transition:'width 1s ease'}}/>
                        </div>
                        <span style={{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:500,minWidth:24,color:score>=90?'var(--green)':score>=70?'var(--blue)':'var(--text-tertiary)'}}>{score}</span>
                        {auto&&<span style={{fontSize:9.5,padding:'2px 6px',borderRadius:3,fontWeight:600,background:'rgba(21,112,66,.1)',color:'var(--green)',border:'1px solid rgba(21,112,66,.25)'}}>AUTO</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            {buyers.some(b=>b.match_score>=90)&&(
              <div style={{padding:'10px 14px',background:'rgba(21,112,66,.07)',border:'1px solid rgba(21,112,66,.25)',borderRadius:6,fontSize:12,color:'var(--green)'}}>
                ● Buyer score ≥90 — deal record auto-created. Log outreach in the Outreach tab.
              </div>
            )}
          </div>
        )}

        {/* ══ TAB 4: CONTACTS ══════════════════════ */}
        {activeTab===4&&(
          <Card>
            <CardHdr title="Contacts" action="+ Add Contact"/>
            <div style={{padding:'0 14px'}}>
              {contacts.length===0?(
                <div style={{padding:'20px 0',textAlign:'center',color:'var(--text-tertiary)',fontSize:12.5}}>No contacts linked.</div>
              ):contacts.map(c=>(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(0,0,0,.05)'}}>
                  <div style={{width:34,height:34,borderRadius:'50%',background:'var(--blue)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>{(c.first_name||'?')[0]}{(c.last_name||'')[0]}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500}}>{c.first_name} {c.last_name}</div>
                    <div style={{fontSize:11,color:'var(--text-tertiary)'}}>{c.title}{c.company?` · ${c.company}`:''}</div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    {c.phone&&<a href={`tel:${c.phone}`} style={{fontSize:11,color:'var(--blue)',textDecoration:'none'}}>{c.phone}</a>}
                    {c.email&&<a href={`mailto:${c.email}`} style={{fontSize:11,color:'var(--blue)',textDecoration:'none'}}>✉</a>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ══ TAB 5: OUTREACH ══════════════════════ */}
        {activeTab===5&&(
          <Card>
            <CardHdr title="Buyer Outreach Log" action="+ Log Outreach"/>
            <div style={{padding:'0 14px'}}>
              {outreach.length===0?(
                <div style={{padding:'20px 0',textAlign:'center',color:'var(--text-tertiary)',fontSize:12.5}}>No outreach logged yet.</div>
              ):outreach.map(o=>{
                const mColor={call:'var(--blue)',email:'var(--amber)',meeting:'var(--green)'};
                const oColor={warm:'var(--green)',cold:'var(--rust)',neutral:'var(--text-tertiary)'};
                return (
                  <div key={o.id} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(0,0,0,.05)',alignItems:'flex-start'}}>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-tertiary)',width:55,flexShrink:0,paddingTop:2}}>{fmtSh(o.outreach_date)}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12.5,fontWeight:500,color:'var(--text-primary)',marginBottom:2}}>
                        <span style={{color:mColor[o.method]||'var(--blue)',fontWeight:600}}>{o.method}</span>
                        {' — '}
                        <span style={{color:oColor[o.outcome]||'var(--text-secondary)',fontWeight:400}}>{o.outcome}</span>
                      </div>
                      {o.notes&&<div style={{fontSize:11.5,color:'var(--text-secondary)',lineHeight:1.5}}>{o.notes}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ══ TAB 6: TASKS ═════════════════════════ */}
        {activeTab===6&&(
          <Card>
            <CardHdr title="Tasks" action="+ New Task"/>
            <div style={{padding:'0 14px'}}>
              {tasks.length===0?(
                <div style={{padding:'20px 0',textAlign:'center',color:'var(--text-tertiary)',fontSize:12.5}}>No tasks for this deal.</div>
              ):tasks.map(t=>{
                const overdue = t.due_date&&t.due_date<new Date().toISOString().split('T')[0]&&t.status!=='done';
                const priColor = t.priority==='high'?'var(--rust)':t.priority==='medium'?'var(--amber)':'var(--text-primary)';
                return (
                  <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,.05)'}}>
                    <input type="checkbox" defaultChecked={t.status==='done'} style={{width:16,height:16,accentColor:'var(--blue)',flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,fontWeight:500,color:overdue?'var(--rust)':priColor,textDecoration:t.status==='done'?'line-through':undefined}}>{t.title}</div>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-tertiary)',marginTop:1}}>
                        {t.due_date&&`Due ${fmtD(t.due_date)}`}{t.priority&&` · ${t.priority}`}
                      </div>
                    </div>
                    {overdue&&<span style={{fontSize:9,padding:'2px 6px',borderRadius:3,background:'rgba(184,55,20,.1)',color:'var(--rust)',fontWeight:700,flexShrink:0}}>OVERDUE</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ══ TAB 7: FILES ═════════════════════════ */}
        {activeTab===7&&(
          <Card>
            <CardHdr title="Files & Attachments" action="+ Upload"/>
            <div style={{padding:'10px 14px',display:'flex',flexDirection:'column',gap:6}}>
              {files.length===0?(
                <div style={{padding:'20px 0',textAlign:'center',color:'var(--text-tertiary)',fontSize:12.5}}>No files attached. Upload BOVs, UW models, or LOIs.</div>
              ):files.map(f=>{
                const ext=(f.file_name||'').split('.').pop()?.toUpperCase()||'FILE';
                const extColor={'PDF':'var(--rust)','XLS':'var(--green)','XLSX':'var(--green)','DOC':'var(--blue)','DOCX':'var(--blue)'}[ext]||'var(--text-secondary)';
                return (
                  <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:9,background:'rgba(0,0,0,.02)',borderRadius:5,border:'1px solid var(--card-border)'}}>
                    <div style={{width:32,height:32,borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:extColor,background:`${extColor}15`,flexShrink:0}}>{ext}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,color:'var(--text-primary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.file_name}</div>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:9.5,color:'var(--text-tertiary)',marginTop:1}}>{fmtSh(f.created_at)}</div>
                    </div>
                    {f.file_url&&<a href={f.file_url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'var(--blue)',textDecoration:'none',flexShrink:0}}>Download</a>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

      </div>

      {/* ── TOAST ──────────────────────────────── */}
      {toast&&(
        <div style={{position:'fixed',top:16,right:16,zIndex:9999,background:'var(--card-bg)',borderRadius:8,boxShadow:'0 4px 20px rgba(0,0,0,.15)',borderLeft:`3px solid ${toast.c}`,padding:'10px 14px',minWidth:260,display:'flex',gap:10,alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:12.5,fontWeight:600,color:'var(--text-primary)',marginBottom:2}}>{toast.title}</div>
            <div style={{fontSize:11.5,color:'var(--text-secondary)'}}>{toast.body}</div>
          </div>
          <button onClick={()=>setToast(null)} style={{marginLeft:'auto',fontSize:14,color:'var(--text-tertiary)',background:'none',border:'none',cursor:'pointer',lineHeight:1,padding:0}}>✕</button>
        </div>
      )}
    </div>
  );
}
