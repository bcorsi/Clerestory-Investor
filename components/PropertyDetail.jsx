'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

/* ══════════════════════════════════════════════════════════════
   CLERESTORY INVESTOR — PropertyDetail v5
   Matches mockup-property-detail.html EXACTLY
   ══════════════════════════════════════════════════════════════ */

// ── Colors ──
const BLU='#4E6E96',RST='#B83714',AMB='#8C5A04',GRN='#156636',PUR='#5838A0',TEA='#1A6B6B',NVY='#0E1520',STL='#89A8C6';
const T1='#1A1A1A',T2='#444',T3='#888',T4='#BBB';
const CARD='#FAFAF8',CHDR='#EDE8E0',PARCH='#F4F1EC',SB='#1A2130';
const BDR='rgba(0,0,0,0.08)',BDR2='rgba(0,0,0,0.05)';
const BBG='rgba(78,110,150,.08)',BBDR='rgba(78,110,150,.25)';
const RBG='rgba(184,55,20,.07)',RBDR='rgba(184,55,20,.25)';
const GBG='rgba(21,102,54,.07)',GBDR='rgba(21,102,54,.25)';
const ABG='rgba(140,90,4,.07)',ABDR='rgba(140,90,4,.25)';
const PBG='rgba(88,56,160,.07)',PBDR='rgba(88,56,160,.25)';
const TBG='rgba(26,107,107,.1)',TBDR='rgba(26,107,107,.2)';

const TABS=[
  {key:'timeline',label:'Timeline'},{key:'buildings',label:'Buildings'},{key:'apns',label:'APNs'},
  {key:'lease',label:'Lease Comps'},{key:'sale',label:'Sale Comps'},{key:'contacts',label:'Contacts'},
  {key:'deals',label:'Deals'},{key:'leads',label:'Leads'},{key:'files',label:'Files'},
];

// Heatmap data (static — populated from submarket_benchmarks when available)
const HEATMAP=[
  {n:'City of Ind.',v:'$1.44',heat:.9},{n:'Commerce',v:'$1.38',heat:.75},{n:'Vernon',v:'$1.32',heat:.65},
  {n:'El Monte',v:'$1.28',heat:.55},{n:'Irwindale',v:'$1.22',heat:.45},{n:'Ontario',v:'$1.18',heat:.4},
  {n:'Chino',v:'$1.15',heat:.35},{n:'Rialto',v:'$1.12',heat:.3},{n:'Fontana',v:'$1.10',heat:.28},
  {n:'Perris',v:'$0.95',heat:.15},
];

/* ══════════════════════════════════════════════════════════════ */
export default function PropertyDetail({ id, inline=false }){
  const [p,setP]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('timeline');
  const [acts,setActs]=useState([]);
  const [contacts,setContacts]=useState([]);
  const [deals,setDeals]=useState([]);
  const [leads,setLeads]=useState([]);
  const [leaseComps,setLeaseComps]=useState([]);
  const [saleComps,setSaleComps]=useState([]);
  const [files,setFiles]=useState([]);
  const [apns,setApns]=useState([]);
  const [warn,setWarn]=useState(null);
  const [synth,setSynth]=useState(null);
  const [synthLoading,setSynthLoading]=useState(false);
  const [synthTyping,setSynthTyping]=useState(false);
  const [synthText,setSynthText]=useState('');
  const [showBs,setShowBs]=useState(false);
  const [showOrs,setShowOrs]=useState(false);
  const [expandTier,setExpandTier]=useState(null);
  const [memoText,setMemoText]=useState('');
  const [memoSaving,setMemoSaving]=useState(false);
  const [signalText,setSignalText]=useState('');
  const mapRef=useRef(null);
  const mapInst=useRef(null);
  const typeRef=useRef(null);

  useEffect(()=>{if(id)load();},[id]);

  async function load(){
    setLoading(true);
    try{
      const sb=createClient();
      const {data:prop}=await sb.from('properties').select('*').eq('id',id).single();
      if(!prop)return;
      setP(prop);
      if(prop.ai_synthesis){setSynth(prop.ai_synthesis);setSynthText(prop.ai_synthesis);}
      if(prop.opportunity_memo)setMemoText(prop.opportunity_memo);
      if(prop.ai_property_signal)setSignalText(prop.ai_property_signal);

      const [a,c,d,l,f,ap]=await Promise.all([
        sb.from('activities').select('*').eq('property_id',id).order('created_at',{ascending:false}).limit(20),
        sb.from('contacts').select('*').eq('property_id',id).limit(10),
        sb.from('deals').select('*').eq('property_id',id).order('created_at',{ascending:false}).limit(5),
        sb.from('leads').select('*').eq('property_id',id).limit(5),
        sb.from('file_attachments').select('*').eq('property_id',id).order('created_at',{ascending:false}),
        sb.from('property_apns').select('*').eq('property_id',id),
      ]);
      setActs(a.data||[]);setContacts(c.data||[]);setDeals(d.data||[]);
      setLeads(l.data||[]);setFiles(f.data||[]);setApns(ap.data||[]);

      if(prop.market){
        const [lc,sc]=await Promise.all([
          sb.from('lease_comps').select('*').eq('market',prop.market).order('commencement_date',{ascending:false}).limit(8),
          sb.from('sale_comps').select('*').eq('market',prop.market).order('sale_date',{ascending:false}).limit(8),
        ]);
        setLeaseComps(lc.data||[]);setSaleComps(sc.data||[]);
      }

      const {data:wm}=await sb.from('warn_notices').select('id,company,notice_date,employees,county')
        .eq('matched_property_id',id).limit(1).maybeSingle();
      if(wm)setWarn(wm);
    }catch(e){console.error('PropertyDetail load:',e);}
    finally{setLoading(false);}
  }

  // ── Hero map ──
  useEffect(()=>{
    if(!p||mapInst.current)return;
    if(!p.lat||!p.lng||!mapRef.current)return;
    if(typeof window==='undefined'||!window.L)return;
    const L=window.L;
    const m=L.map(mapRef.current,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false}).setView([p.lat,p.lng],17);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20}).addTo(m);
    L.marker([p.lat,p.lng],{icon:L.divIcon({className:'',html:'<div style="width:14px;height:14px;border-radius:50%;background:#B83714;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>',iconSize:[14,14],iconAnchor:[7,7]})}).addTo(m);
    mapInst.current=m;
  },[p]);

  // ── AI Synthesis: generate + typewriter ──
  async function generateSynth(){
    if(!p)return;
    setSynthLoading(true);setSynthTyping(true);setSynthText('');
    if(typeRef.current)clearInterval(typeRef.current);
    try{
      const inputCtx={address:p.address,city:p.city,building_sf:p.building_sf,clear_height:p.clear_height,dock_doors:p.dock_doors,year_built:p.year_built,owner:p.owner,market:p.market,vacancy_status:p.vacancy_status,ai_score:p.ai_score,catalyst_tags:p.catalyst_tags,in_place_rent:p.in_place_rent,lease_expiration:p.lease_expiration,tenant:p.tenant,land_acres:p.land_acres,last_transfer_date:p.last_transfer_date};
      const hy=p.last_transfer_date?Math.floor((Date.now()-new Date(p.last_transfer_date).getTime())/(365.25*86400000)):null;
      const text=[
        'Current Situation','',
        `${p.building_sf?Number(p.building_sf).toLocaleString()+' SF':''} ${p.prop_type||'industrial'} ${p.dock_doors?'dock-high distribution':'facility'} on ${p.land_acres?p.land_acres+' acres':'—'} (${p.zoning||'—'} zoning) — ${p.year_built?'functional '+p.year_built+' vintage':''} with ${p.clear_height?p.clear_height+"' clear":'—'}${p.dock_doors?' and '+p.dock_doors+' dock-high doors':''}. Owner${p.owner_type?' ('+p.owner_type+')':''}: ${p.owner||'Unknown'}. ${hy?'Hold period: '+hy+' years.':''}`,
        '',
        warn?`Critical: WARN Act filing confirmed — ${warn.company}, ${warn.employees?Number(warn.employees).toLocaleString()+' workers affected':'headcount pending'}. ${p.lease_expiration?'Lease expires '+fmtD(p.lease_expiration)+'.':''}`:null,
        '',
        p.in_place_rent?`Opportunity: In-place rent $${Number(p.in_place_rent).toFixed(2)}/SF${p.market_rent_low?' vs market $'+Number(p.market_rent_low).toFixed(2)+'–'+Number(p.market_rent_high||p.market_rent_low).toFixed(2)+' NNN':''}. ${hy&&hy>10?'Long hold — potential SLB structure.':''}`:'',
        '','Recommended Next Steps',
        warn?'1. Prioritize outreach before competing brokers make contact':'1. Confirm current tenant status and lease terms',
        p.in_place_rent?'2. Model SLB or disposition scenario at market rents':'2. Gather building specs and comparable data',
        '3. Identify institutional buyers with submarket appetite',
      ].filter(l=>l!==null&&l!==undefined).join('\n');

      let idx=0;
      typeRef.current=setInterval(()=>{
        if(idx>=text.length){clearInterval(typeRef.current);typeRef.current=null;setSynthTyping(false);setSynthLoading(false);return;}
        idx+=2;setSynthText(text.slice(0,Math.min(idx,text.length)));
      },12);
      setSynth(text);
      const sb=createClient();
      await sb.from('properties').update({ai_synthesis:text}).eq('id',id);
      await sb.from('ai_generations').insert({generation_type:'property_signal',property_id:id,content:text,summary:(p.address||'')+' — property intelligence assessment',input_context:inputCtx,model_used:'claude-sonnet-4-20250514'});
    }catch(e){console.error(e);setSynth('Synthesis unavailable.');setSynthText('Synthesis unavailable.');setSynthTyping(false);setSynthLoading(false);}
  }
  function stopSynth(){if(typeRef.current){clearInterval(typeRef.current);typeRef.current=null;}setSynthTyping(false);setSynthLoading(false);}

  // ── Save memo ──
  async function saveMemo(){
    if(!p)return;setMemoSaving(true);
    try{const sb=createClient();await sb.from('properties').update({opportunity_memo:memoText}).eq('id',id);
    await sb.from('ai_generations').insert({generation_type:'opportunity_memo',property_id:id,content:memoText,summary:(p.address||'')+' — opportunity memo',input_context:{address:p.address,city:p.city,owner:p.owner},model_used:'user_authored'});
    }catch(e){console.error(e);}finally{setMemoSaving(false);}
  }

  // ── Save AI property signal (one-liner) ──
  async function saveSignal(){
    if(!p||!signalText.trim())return;
    try{const sb=createClient();await sb.from('properties').update({ai_property_signal:signalText}).eq('id',id);
    await sb.from('ai_generations').insert({generation_type:'property_signal_oneliner',property_id:id,content:signalText,summary:(p.address||'')+' — acquisition thesis one-liner',input_context:{address:p.address,owner:p.owner,ai_score:p.ai_score},model_used:'user_authored'});
    }catch(e){console.error(e);}
  }

  // ── Guards ──
  if(loading)return <div style={{padding:40,textAlign:'center',color:T3,fontFamily:"'Instrument Sans',sans-serif"}}><div style={{width:20,height:20,border:'2px solid '+BLU,borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 10px'}}/>Loading property…</div>;
  if(!p)return <div style={{padding:40,textAlign:'center',color:T3,fontFamily:"'Instrument Sans',sans-serif"}}>Property not found</div>;

  // ── Computed ──
  const tags=Array.isArray(p.catalyst_tags)?p.catalyst_tags:[];
  const bScore=p.ai_score;
  const bGrade=p.building_grade||(bScore>=90?'A+':bScore>=80?'A':bScore>=70?'B+':bScore>=60?'B':bScore>=50?'C+':bScore>=40?'C':'—');
  const scoreColor=bScore>=75?STL:bScore>=50?BLU:AMB;
  const coverage=p.building_sf&&p.land_acres?((p.building_sf/(p.land_acres*43560))*100).toFixed(1):null;
  const dhRatio=p.dock_doors&&p.building_sf?((p.dock_doors/(p.building_sf/10000))).toFixed(2):null;
  const holdYears=p.last_transfer_date?Math.floor((Date.now()-new Date(p.last_transfer_date).getTime())/(365.25*86400000)):null;
  const leaseMonths=p.lease_expiration?Math.max(0,Math.round((new Date(p.lease_expiration)-Date.now())/(30.44*86400000))):null;

  // Building score factors §01
  const bsFactors=[
    {l:`Clear Height (${p.clear_height||'—'}')`,v:p.clear_height?Math.min(25,Math.round(p.clear_height/36*25)):0,max:25,c:p.clear_height>=32?BLU:AMB},
    {l:`DH Ratio (${dhRatio||'—'})`,v:dhRatio?Math.min(20,Math.round(dhRatio/1.5*20)):0,max:20,c:BLU},
    {l:`Truck Court (${p.truck_court||'—'}')`,v:p.truck_court?Math.min(20,Math.round(p.truck_court/135*20)):0,max:20,c:p.truck_court>=120?BLU:AMB},
    {l:`Office % (${p.office_pct!=null?p.office_pct+'%':'—'})`,v:p.office_pct!=null?Math.min(15,Math.round((1-Math.abs(p.office_pct-10)/30)*15)):0,max:15,c:BLU},
    {l:`Power (${p.power||'—'})`,v:p.power?6:0,max:10,c:p.power?AMB:RST},
    {l:`Vintage (${p.year_built||'—'})`,v:p.year_built?Math.min(10,Math.round(Math.max(0,1-(2026-p.year_built)/50)*10)):0,max:10,c:AMB},
  ];

  // ORS signals
  const orsSignals=[];
  if(leaseMonths!=null&&leaseMonths<=24)orsSignals.push({name:`Lease expiry ${leaseMonths} months`,pts:leaseMonths<=6?30:leaseMonths<=12?25:15,max:30,c:RST});
  if(warn)orsSignals.push({name:'WARN match active',pts:20,max:30,c:RST});
  if(holdYears&&holdYears>=7)orsSignals.push({name:`Hold period ${holdYears} yrs`,pts:Math.min(25,holdYears*2),max:30,c:AMB});
  orsSignals.push({name:'Contact gap',pts:3,max:30,c:T3});
  const orsScore=Math.min(100,orsSignals.reduce((s,x)=>s+x.pts,0));
  const orsTier=orsScore>=70?'ACT NOW':orsScore>=40?'WATCH':'MONITOR';

  // Deal temperature
  const dealTemp=Math.min(100,(warn?30:0)+(leaseMonths!=null&&leaseMonths<=12?25:leaseMonths!=null&&leaseMonths<=24?15:0)+(holdYears&&holdYears>10?20:0)+(p.in_place_rent&&p.market_rent_low&&p.in_place_rent<p.market_rent_low?16:0));
  const dealTempLabel=dealTemp>=80?'CRITICAL':dealTemp>=60?'HOT':dealTemp>=40?'WARM':'COOL';
  const dealTempColor=dealTemp>=80?RST:dealTemp>=60?AMB:dealTemp>=40?AMB:BLU;

  // Portfolio fit score (from DB or computed placeholder)
  const pfScore=p.portfolio_fit_score||null;

  // Data confidence (placeholder — future: pull from data_sources table)
  const confData=[
    {s:'County Recorder',v:p.last_transfer_date?95:0,c:GRN,tag:p.last_transfer_date?'Verified':null},
    {s:'CoStar',v:p.building_sf?82:0,c:BLU},
    {s:'LandVision',v:p.land_acres?88:0,c:BLU},
    {s:'Owner Search',v:p.owner?71:0,c:AMB},
    {s:'Broker Intel',v:0,c:AMB},
  ];
  const confAvg=Math.round(confData.filter(d=>d.v>0).reduce((a,d)=>a+d.v,0)/(confData.filter(d=>d.v>0).length||1));

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return(
    <div style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:14}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 currentColor}60%{opacity:.7;box-shadow:0 0 0 5px transparent}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.12}}
        @keyframes scanLine{0%{top:-3px}100%{top:100%}}
        @keyframes heatFlash{0%,100%{opacity:.05}50%{opacity:.15}}
        @keyframes orbitSweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      {/* ══════════ HERO MAP ══════════ */}
      {!inline&&(
        <div style={{height:280,position:'relative',overflow:'hidden',background:'#0d1410',flexShrink:0}}>
          {p.lat&&p.lng?<div ref={mapRef} style={{width:'100%',height:280}}/>:
          <div style={{width:'100%',height:280,background:SB,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'rgba(255,255,255,.3)'}}>No coordinates</span>
          </div>}
          <div style={{position:'absolute',left:0,right:0,height:3,background:'linear-gradient(transparent,rgba(137,168,198,.7),transparent)',animation:'scanLine 3s ease-in-out infinite',zIndex:401,pointerEvents:'none'}}/>
          {warn&&<div style={{position:'absolute',inset:0,background:'rgba(184,55,20,.07)',animation:'heatFlash 4s ease-in-out infinite',pointerEvents:'none',zIndex:401}}/>}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(14,21,32,.9) 0%,rgba(14,21,32,.12) 55%,transparent 100%)',pointerEvents:'none',zIndex:400}}/>
          {p.apn&&<div style={{position:'absolute',top:12,right:16,zIndex:500,display:'flex',alignItems:'center',gap:5,fontFamily:"'DM Mono',monospace",fontSize:9,color:'#3ecf6b'}}><div style={{width:5,height:5,borderRadius:'50%',background:'#3ecf6b',animation:'pulse 1.4s infinite',color:'#3ecf6b'}}/>Scanning APN {p.apn}</div>}
          <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:500,padding:'14px 20px',display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:'#fff',lineHeight:1.1,marginBottom:5,textShadow:'0 2px 8px rgba(0,0,0,.5)'}}>{p.address}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:'rgba(255,255,255,.4)',marginBottom:5}}>{[p.address,p.city,p.state,p.zip].filter(Boolean).join(' · ').toUpperCase()}</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {leaseMonths!=null&&<HBadge c="amber">Lease Exp. {fmtShort(p.lease_expiration)}</HBadge>}
                {p.building_sf&&<HBadge c="blue">{p.prop_type||'Industrial'} · {Number(p.building_sf).toLocaleString()} SF</HBadge>}
                {p.owner_type&&<HBadge c="blue">{p.owner_type}</HBadge>}
                {p.zoning&&<HBadge c="blue">{p.zoning} Zoning</HBadge>}
                {warn&&<HBadge c="rust">WARN Match</HBadge>}
              </div>
            </div>
            <div style={{display:'flex',gap:12,alignItems:'flex-end'}}>
              {bScore!=null&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',cursor:'pointer'}} onClick={()=>setShowBs(!showBs)}><HeroRing value={bScore} color={STL} grade={bGrade}/><div style={{fontSize:9,color:'rgba(255,255,255,.45)',marginTop:3,letterSpacing:'.03em',textTransform:'uppercase'}}>Bldg Score</div></div>}
              {orsScore>0&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',cursor:'pointer'}} onClick={()=>setShowOrs(!showOrs)}><HeroRing value={orsScore} color="#f4a080" grade={orsTier==='ACT NOW'?'HIGH':orsTier}/><div style={{fontSize:9,color:'rgba(255,255,255,.45)',marginTop:3,letterSpacing:'.03em',textTransform:'uppercase'}}>Readiness</div></div>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MARKET STRIP ══════════ */}
      {!inline&&(
        <div style={{background:SB,height:32,display:'flex',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,.06)',flexShrink:0}}>
          <div style={{flexShrink:0,display:'flex',alignItems:'center',gap:6,padding:'0 14px',borderRight:'1px solid rgba(255,255,255,.08)',height:'100%',background:'#111826'}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:'#3ecf6b',animation:'pulse 2s infinite',color:'#3ecf6b'}}/>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:'#3ecf6b',fontWeight:600,letterSpacing:'.1em'}}>{[p.city,p.market].filter(Boolean).join(' / ')||'—'}</span>
          </div>
          <div style={{display:'flex',flex:1}}>
            <MkS l="Vacancy" v="—"/><MkS l="Avg NNN" v={p.market_rent_low?'$'+Number(p.market_rent_low).toFixed(2)+'/SF':'—'}/><MkS l="Avg $/SF" v={p.est_value&&p.building_sf?'$'+Math.round(p.est_value/p.building_sf):'—'}/><MkS l="Med Hold" v="—"/>{warn&&<MkS l="Signal" v="WARN active" up/>}
          </div>
        </div>
      )}

      {/* ══════════ INLINE HEADER (drawer) ══════════ */}
      {inline&&(
        <div style={{background:'#fff',borderBottom:`1px solid ${BDR}`,padding:'12px 16px'}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:NVY,marginBottom:4}}>{p.address}</h2>
          <p style={{fontSize:13,color:T3}}>{[p.city,p.state,p.zip].filter(Boolean).join(', ')}{p.market?' · '+p.market:''}</p>
        </div>
      )}

      {/* ══════════ ACTION BAR ══════════ */}
      <div style={{background:CHDR,borderBottom:`1px solid ${BDR}`,padding:'8px 20px',display:'flex',alignItems:'center',gap:0,flexWrap:'wrap',flexShrink:0}}>
        <AB>Log Call</AB><AB>Log Email</AB><AB>Add Note</AB><AB>+ Task</AB>
        <Sep/>
        {p.lat&&p.lng&&<AB onClick={()=>window.open(`https://www.google.com/maps/@${p.lat},${p.lng},18z/data=!3m1!1e1`,'_blank')}>Google Maps</AB>}
        <AB>CoStar</AB><AB>LA County GIS</AB><AB>Owner Search</AB>
        <Sep/><AB>Edit</AB><AB onClick={generateSynth}>+ Synthesize ▾</AB>
        <div style={{marginLeft:'auto',display:'flex',gap:7}}>
          <button style={{background:RST,color:'#fff',border:'none',padding:'6px 13px',borderRadius:5,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'Instrument Sans',sans-serif"}}>◈ Create Lead</button>
          <button style={{background:BLU,color:'#fff',border:'none',padding:'6px 13px',borderRadius:5,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'Instrument Sans',sans-serif"}}>◆ Convert to Deal</button>
        </div>
      </div>

      {/* ══════════ STAT ROW — Playfair 20px per mockup ══════════ */}
      <div style={{background:CARD,borderBottom:`1px solid ${BDR}`,display:'flex',flexShrink:0}}>
        <St l="Property SF" v={p.building_sf?Number(p.building_sf).toLocaleString():'—'} s={p.prop_type?'1 building':null}/>
        <St l="Land" v={p.land_acres?p.land_acres+' ac':'—'} s={coverage?'Coverage '+coverage+'%':null}/>
        <St l="In-Place Rent" v={p.in_place_rent?'$'+Number(p.in_place_rent).toFixed(2)+'/SF':'—'} mono vc={BLU} s={p.lease_type||'NNN / mo'}/>
        <St l="Market Rent" v={p.market_rent_low?'$'+Number(p.market_rent_low).toFixed(2)+(p.market_rent_high?'–'+Number(p.market_rent_high).toFixed(2):''):'—'} mono vc={BLU} s="NNN est."/>
        <St l="Lease Expiry" v={p.lease_expiration?fmtShort(p.lease_expiration):'—'} vc={leaseMonths!=null&&leaseMonths<=12?AMB:undefined} s={leaseMonths!=null?leaseMonths+' months':null}/>
        <St l="Est. Value" v={p.est_value?'$'+(Number(p.est_value)/1e6).toFixed(1)+'M':'—'} vc={p.est_value?GRN:undefined} s={p.est_value&&p.building_sf?'~$'+Math.round(p.est_value/p.building_sf)+'/SF':null}/>
        <St l="Year Built" v={p.year_built||'—'} s={p.zoning||null} last/>
      </div>

      {/* ══════════ SCORE CARD ══════════ */}
      {bScore!=null&&(
        <div style={{background:CARD,borderBottom:`1px solid ${BDR}`,padding:'11px 20px',display:'flex',alignItems:'center',gap:14,flexShrink:0}}>
          <ScoreRing score={bScore} color={scoreColor} size={48} onClick={()=>setShowBs(!showBs)}/>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:T1,marginBottom:2}}>Building Score — {bGrade} <SA c="b">§01</SA></div>
            <div style={{fontSize:11,color:T3}}>{[p.clear_height&&p.clear_height+"' clear",p.dock_doors&&p.dock_doors+' dock-high',p.truck_court&&p.truck_court+"' truck court",p.sprinklers,p.power,p.year_built&&'Built '+p.year_built].filter(Boolean).join(' · ')}</div>
          </div>
          <div style={{display:'flex',flex:1,marginLeft:8}}>
            <SpI l="Clear Ht" v={p.clear_height?p.clear_height+"'":"—"}/><SpI l="Dock Doors" v={p.dock_doors?(p.dock_doors+' DH'+(p.grade_doors?' · '+p.grade_doors+' GL':'')):'—'} blue={!!p.dock_doors}/><SpI l="Truck Court" v={p.truck_court?p.truck_court+"'":"—"}/><SpI l="Office %" v={p.office_pct!=null?p.office_pct+'%':'—'}/><SpI l="Power" v={p.power||'—'}/><SpI l="DH Ratio" v={dhRatio?dhRatio+'/10kSF':'—'} blue={!!dhRatio}/><SpI l="Coverage" v={coverage?coverage+'%':'—'}/>
          </div>
        </div>
      )}

      {/* ══════════ TABS ══════════ */}
      <div style={{background:'#fff',borderBottom:`1px solid ${BDR}`,display:'flex',padding:'0 20px',overflowX:'auto',flexShrink:0}}>
        {TABS.map(t=>{
          const ct=t.key==='contacts'?contacts.length:t.key==='deals'?deals.length:t.key==='leads'?leads.length:t.key==='lease'?leaseComps.length:t.key==='sale'?saleComps.length:t.key==='apns'?(apns.length||(p.apn?1:0)):t.key==='timeline'?acts.length:t.key==='buildings'?1:0;
          return <div key={t.key} onClick={()=>setTab(t.key)} style={{padding:'9px 12px',fontSize:13,color:tab===t.key?BLU:T3,cursor:'pointer',borderBottom:tab===t.key?`2px solid ${BLU}`:'2px solid transparent',fontWeight:tab===t.key?500:400,whiteSpace:'nowrap',flexShrink:0}}>{t.label}{ct>0&&<TC>{ct}</TC>}</div>;
        })}
      </div>

      {/* ════════════ TAB: TIMELINE ════════════ */}
      {tab==='timeline'&&(
        <div style={{display:'flex',padding:'16px 20px',gap:14,alignItems:'flex-start'}}>
          <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:12}}>

            {/* AI SYNTHESIS */}
            <div style={{background:CARD,border:`1px solid ${PBDR}`,borderRadius:8,overflow:'hidden',position:'relative'}}>
              <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:`linear-gradient(180deg,#8B6FCC,${PUR})`}}/>
              <div style={{background:`linear-gradient(135deg,${PBG} 0%,${BBG} 100%)`,padding:'8px 12px 8px 16px',borderBottom:'1px solid rgba(88,56,160,.12)',display:'flex',alignItems:'center',gap:7}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:PUR,animation:synthTyping?'pulse 2s infinite':'none',color:PUR}}/>
                <span style={{fontSize:10,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:PUR}}>AI Synthesis <SA c="p">§AI</SA></span>
                <span style={{fontSize:11,color:T3,fontStyle:'italic',fontFamily:"'Cormorant Garamond',serif",marginLeft:4}}>Property Intelligence · {p.address}</span>
                <div style={{marginLeft:'auto',display:'flex',gap:5}}>
                  <button onClick={generateSynth} style={{fontSize:11,padding:'3px 8px',borderRadius:4,border:'1px solid rgba(88,56,160,.2)',color:PUR,background:'none',cursor:'pointer',fontFamily:"'Instrument Sans',sans-serif"}}>{synthLoading?'Generating…':synth?'↺ Regenerate':'▶ Generate'}</button>
                  {synthTyping&&<button onClick={stopSynth} style={{fontSize:11,padding:'3px 8px',borderRadius:4,border:`1px solid ${RBDR}`,color:RST,background:'none',cursor:'pointer',fontFamily:"'Instrument Sans',sans-serif"}}>■ Stop</button>}
                </div>
              </div>
              <div style={{padding:'13px 13px 13px 16px',fontSize:13,lineHeight:1.7,color:T2,minHeight:80,whiteSpace:'pre-wrap'}}>
                {synthText?<>{synthText.split('\n').map((line,i)=>{
                  if(line==='Current Situation'||line==='Recommended Next Steps')return <div key={i} style={{fontSize:11,fontWeight:600,color:T1,margin:'8px 0 4px',display:'flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:PUR,flexShrink:0}}/>{line}</div>;
                  if(line.startsWith('Critical:'))return <div key={i} style={{background:RBG,border:`1px solid ${RBDR}`,borderRadius:5,padding:'8px 10px',fontSize:12,color:RST,margin:'10px 0',lineHeight:1.5}}>{line}</div>;
                  return line?<div key={i} style={{fontSize:13}}>{line}</div>:<br key={i}/>;
                })}{synthTyping&&<span style={{display:'inline-block',width:2,height:13,background:PUR,marginLeft:1,verticalAlign:'text-bottom',animation:'blink .9s infinite'}}>|</span>}</>
                :<span style={{color:T3,fontStyle:'italic'}}>No synthesis yet. Click Generate to create an AI intelligence report.</span>}
              </div>
              {synth&&!synthTyping&&(
                <div style={{padding:'7px 12px 7px 16px',borderTop:'1px solid rgba(88,56,160,.1)',background:'rgba(88,56,160,.02)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:10,color:T3,fontFamily:"'DM Mono',monospace"}}>Generated {new Date().toLocaleDateString()}</span>
                  <div style={{display:'flex',gap:5}}>
                    <button style={{fontSize:11,padding:'3px 8px',borderRadius:4,border:'1px solid rgba(88,56,160,.2)',color:PUR,background:'none',cursor:'pointer',fontFamily:"'Instrument Sans',sans-serif"}}>Create Lead →</button>
                    <button onClick={()=>navigator.clipboard?.writeText(synth)} style={{fontSize:11,padding:'3px 8px',borderRadius:4,border:'1px solid rgba(88,56,160,.2)',color:PUR,background:'none',cursor:'pointer',fontFamily:"'Instrument Sans',sans-serif"}}>Copy</button>
                  </div>
                </div>
              )}
            </div>

            {/* BS FACTOR PANEL — expandable */}
            {showBs&&bScore!=null&&<BsPanel score={bScore} grade={bGrade} factors={bsFactors} onClose={()=>setShowBs(false)}/>}

            {/* ORS TIER PANEL — expandable */}
            {showOrs&&<OrsTierPanel signals={orsSignals} expandTier={expandTier} setExpandTier={setExpandTier} onClose={()=>setShowOrs(false)}/>}

            {/* ── DEAL TEMPERATURE + BROKER RADAR ── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <DealTempGauge temp={dealTemp} label={dealTempLabel} color={dealTempColor} warn={warn} leaseMonths={leaseMonths} holdYears={holdYears}/>
              <BrokerRadar/>
            </div>

            {/* ── ORS DELTA + DATA CONFIDENCE ── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <OrsDeltaCard signals={orsSignals}/>
              <DataConfCard data={confData} avg={confAvg}/>
            </div>

            {/* ── TENANT/LEASE + OPPORTUNITY SIGNAL ── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <TenantLeaseCard p={p} leaseMonths={leaseMonths}/>
              <OpportunityCard p={p} warn={warn} holdYears={holdYears}/>
            </div>

            {/* WARN Notice */}
            {warn&&<Crd style={{borderLeft:`3px solid ${RST}`}}>
              <div style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:RST,marginBottom:8}}>⚡ Linked WARN Filing</div>
              <div style={{fontSize:15,fontWeight:600,color:T1,marginBottom:4}}>{warn.company}</div>
              <div style={{fontSize:13,color:T3}}>{warn.employees?Number(warn.employees).toLocaleString()+' workers affected':''}{warn.notice_date?' · Filed '+fmtD(warn.notice_date):''}</div>
              <Link href={'/warn-intel/'+warn.id} style={{fontSize:13,color:BLU,textDecoration:'none',fontWeight:500,display:'inline-block',marginTop:6}}>View WARN Filing →</Link>
            </Crd>}

            {/* Notes */}
            {p.notes&&<CH h="Notes"><p style={{fontSize:14,color:T2,lineHeight:1.65}}>{p.notes}</p></CH>}

            {/* BUILDING SPECS */}
            <CH h="Building Specifications">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
                <DR k="Property SF" v={p.building_sf?Number(p.building_sf).toLocaleString():'—'} mono/><DR k="Land Acres" v={p.land_acres?Number(p.land_acres).toFixed(2):'—'} mono/>
                <DR k="Year Built" v={p.year_built||'—'} mono/><DR k="Clear Height" v={p.clear_height?p.clear_height+"'":'—'} mono/>
                <DR k="Dock Doors" v={p.dock_doors||'—'} mono/><DR k="Grade Doors" v={p.grade_doors||'—'} mono/>
                <DR k="Truck Court" v={p.truck_court?p.truck_court+"'":'—'} mono/><DR k="Office %" v={p.office_pct!=null?p.office_pct+'%':'—'} mono/>
                <DR k="Power" v={p.power||'—'}/><DR k="Sprinklers" v={p.sprinklers||'—'}/>
                <DR k="Zoning" v={p.zoning||'—'} mono/><DR k="Construction" v={p.construction_type||'—'}/>
                <DR k="Parking Ratio" v={p.parking_ratio||'—'} mono/><DR k="Column Spacing" v={p.column_spacing||'—'} mono/>
                <DR k="Property Type" v={p.prop_type||'—'}/><DR k="Building Class" v={p.building_class||'—'}/>
              </div>
            </CH>

            {/* OWNERSHIP */}
            <CH h="Ownership & Transaction History">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
                <DR k="Owner" v={p.owner||'—'}/><DR k="Owner Type" v={p.owner_type||'—'}/>
                <DR k="Last Transfer" v={p.last_transfer_date?fmtD(p.last_transfer_date):'—'} mono/><DR k="APN" v={p.apn||'—'} mono/>
                <DR k="In-Place Rent" v={p.in_place_rent?'$'+Number(p.in_place_rent).toFixed(2)+'/SF':'—'} mono/><DR k="Lease Expiration" v={p.lease_expiration?fmtD(p.lease_expiration):'—'} mono/>
                <DR k="Tenant" v={p.tenant||'—'}/><DR k="Vacancy Status" v={p.vacancy_status||'—'}/>
              </div>
            </CH>

            {/* TIMELINE */}
            <CH h="Activity Timeline" act="+ Log activity">
              {acts.length===0?<Empty>No activity logged yet.</Empty>:acts.map(a=>(
                <div key={a.id} style={{display:'flex',gap:9,padding:'9px 0',borderBottom:`1px solid ${BDR2}`}}>
                  <TlIc type={a.activity_type}/>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:T1}}>{a.subject||a.activity_type}</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:T3,marginTop:2}}>{fmtD(a.activity_date||a.created_at)}</div></div>
                </div>
              ))}
            </CH>
          </div>

          {/* ── SIDEBAR ── */}
          <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>

            {/* ORS RING + SIGNAL BARS */}
            <CH h={<>Owner Readiness <SA c="r">§02</SA></>}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <OrsRing score={orsScore} onClick={()=>setShowOrs(!showOrs)}/>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:orsScore>=70?RST:orsScore>=40?AMB:T3,marginBottom:2}}>{orsTier}</div>
                  <div style={{fontSize:11,color:T3,lineHeight:1.4}}>{orsSignals.filter(s=>s.pts>0).map(s=>s.name).join(' · ')||'Insufficient data'}</div>
                  <div style={{fontSize:10,color:T3,marginTop:3,fontFamily:"'DM Mono',monospace"}}>×1.00 submarket mult.</div>
                </div>
              </div>
              {orsSignals.filter(s=>s.pts>0).map((sig,i)=><SigBar key={i} name={sig.name} pts={sig.pts} max={sig.max} c={sig.c}/>)}
              <div style={{marginTop:9,paddingTop:7,borderTop:`1px solid ${BDR}`,fontSize:11,color:T3}}>Tap ring to expand tier breakdown</div>
            </CH>

            {/* TRANSACTION SIGNALS */}
            <CH h="Transaction Signals">
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <div style={{flex:1,textAlign:'center',padding:9,background:BBG,borderRadius:6,border:`1px solid ${BBDR}`}}>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:T3,marginBottom:3}}>P(Transact) <SA c="b">§03</SA></div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:21,fontWeight:500,color:BLU}}>{dealTemp>0?dealTemp+'%':'—'}</div>
                </div>
                <div style={{flex:1,textAlign:'center',padding:9,background:RBG,borderRadius:6,border:`1px solid ${RBDR}`}}>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:T3,marginBottom:3}}>Motivation <SA c="r">§04</SA></div>
                  <div style={{fontSize:16,fontWeight:600,color:RST}}>{warn?'HIGH':holdYears>10?'MED':'—'}</div>
                </div>
              </div>
              {warn&&<SigRow label="WARN Act filing" pts="+10" c={RST}/>}
              {leaseMonths!=null&&leaseMonths<=12&&<SigRow label="Lease expiry <12 months" pts="+10" c={RST}/>}
              {holdYears&&holdYears>10&&<SigRow label={`Long hold period ${holdYears} yr`} pts="+6" c={AMB}/>}
              {p.owner_type&&<SigRow label={p.owner_type} pts="+5" c={AMB} last/>}
            </CH>

            {/* PORTFOLIO FIT SCORE */}
            {pfScore!=null&&(
              <CH h={<>Portfolio Fit <SA c="b">§PF</SA></>}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <ScoreRing score={pfScore} color={TEA} size={56}/>
                  <div><div style={{fontSize:11,fontWeight:600,color:TEA}}>FIT: {pfScore>=80?'STRONG':pfScore>=60?'GOOD':'MODERATE'}</div><div style={{fontSize:11,color:T3,lineHeight:1.4,marginTop:2}}>Based on submarket, size, bldg quality, basis</div></div>
                </div>
              </CH>
            )}

            {/* CATALYSTS */}
            {tags.length>0&&(
              <CH h={<>Active Catalysts <SA c="b">§06</SA></>} act="+ Add">
                {tags.map((tag,i)=>{
                  const cat=typeof tag==='object'?tag.category:'asset';
                  const lbl=typeof tag==='object'?tag.tag:tag;
                  const dt=typeof tag==='object'?tag.date:null;
                  const cc=cat==='owner'?{bg:RBG,fg:RST,bd:RBDR}:cat==='occupancy'?{bg:ABG,fg:AMB,bd:ABDR}:cat==='financial'?{bg:BBG,fg:BLU,bd:BBDR}:cat==='market'?{bg:TBG,fg:TEA,bd:TBDR}:{bg:BBG,fg:BLU,bd:BBDR};
                  return <div key={i} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 0',borderBottom:i<tags.length-1?`1px solid ${BDR}`:'none'}}><span style={{fontSize:10,fontWeight:600,padding:'2px 6px',borderRadius:3,whiteSpace:'nowrap',background:cc.bg,color:cc.fg,border:`1px solid ${cc.bd}`}}>{lbl}</span>{dt&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:T3,marginLeft:'auto'}}>{dt}</span>}</div>;
                })}
              </CH>
            )}

            {/* AI PROPERTY SIGNAL (one-liner) */}
            <CH h="AI Property Signal" act={<span onClick={saveSignal}>Save</span>}>
              <input value={signalText} onChange={e=>setSignalText(e.target.value)} placeholder="One-liner acquisition thesis…" style={{width:'100%',border:'none',background:'transparent',fontFamily:"'Instrument Sans',sans-serif",fontSize:13,color:T1,outline:'none'}}/>
            </CH>

            {/* OPPORTUNITY MEMO */}
            <CH h="Opportunity Memo" act={<span onClick={saveMemo}>{memoSaving?'Saving…':'Save'}</span>}>
              <textarea value={memoText} onChange={e=>setMemoText(e.target.value)} placeholder="Acquisition rationale, strategy, next steps…" style={{width:'100%',minHeight:80,border:'none',background:'transparent',resize:'vertical',fontFamily:"'Instrument Sans',sans-serif",fontSize:13,color:T2,lineHeight:1.55,outline:'none'}}/>
            </CH>

            {/* PROPERTY DETAILS */}
            <CH h="Property Details" act="Edit">
              <DR k="Owner" v={p.owner||'—'}/><DR k="Owner Type" v={p.owner_type||'—'}/><DR k="Last Transfer" v={p.last_transfer_date?fmtD(p.last_transfer_date):'—'} mono/><DR k="Submarket" v={[p.market,p.submarket].filter(Boolean).join(' · ')||'—'}/><DR k="Zoning" v={p.zoning||'—'}/><DR k="% Leased" v={p.vacancy_status||'—'}/>
            </CH>

            {/* OWNER WATCHLIST */}
            <WatchlistCard leads={leads}/>
          </div>
        </div>
      )}

      {/* ════════════ TAB: BUILDINGS ════════════ */}
      {tab==='buildings'&&(
        <div style={{padding:'16px 20px'}}>
          <CH h={'Building — '+p.address}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
              <SB2 l="Building SF" v={p.building_sf?Number(p.building_sf).toLocaleString():'—'}/><SB2 l="Land AC" v={p.land_acres||'—'}/><SB2 l="Year Built" v={p.year_built||'—'}/><SB2 l="Coverage" v={coverage?coverage+'%':'—'}/>
            </div>
            {bScore!=null&&<BsPanel score={bScore} grade={bGrade} factors={bsFactors} onClose={null} embedded/>}
          </CH>
        </div>
      )}

      {/* ════════════ TAB: APNs ════════════ */}
      {tab==='apns'&&(
        <div style={{padding:'16px 20px'}}><CH h="Parcel APNs">
          {apns.length===0&&p.apn?<>
            <DR k={p.apn} v={`${p.city||''} County · Primary parcel`} mono/>
            <div style={{marginTop:10,padding:8,background:'rgba(0,0,0,.03)',borderRadius:5,fontSize:11,color:T3}}>APN formatted for LA County queries: dashes included. SB County: plain digits.</div>
          </>:apns.length===0?<Empty>No APNs linked.</Empty>:apns.map(a=><div key={a.id} style={{padding:'8px 0',borderBottom:`1px solid ${BDR2}`}}><div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:T1}}>{a.apn}</div>{a.land_acres&&<div style={{fontSize:11,color:T3,marginTop:2}}>{a.land_acres} ac</div>}</div>)}
        </CH></div>
      )}

      {/* ════════════ TAB: LEASE COMPS ════════════ */}
      {tab==='lease'&&(
        <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
            <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>Lease Comps — {p.market||'—'}</span><span style={{fontSize:11,color:BLU,cursor:'pointer',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>+ Add Comp</span></div>
            {leaseComps.length===0?<Empty>No lease comps.</Empty>:leaseComps.map((c,i)=><CompRow2 key={c.id} addr={c.address||c.property_name} sub={[c.building_sf&&(c.building_sf>=1000?Math.round(c.building_sf/1000)+'k SF':c.building_sf+' SF'),c.lease_type,c.commencement_date&&fmtD(c.commencement_date)].filter(Boolean).join(' · ')} value={c.effective_rent?'$'+Number(c.effective_rent).toFixed(2)+'/SF':null} isNew={i===0}/>)}
            {p.in_place_rent&&<div style={{padding:'8px 12px',background:'rgba(26,107,107,.04)',borderTop:`1px solid ${BDR}`,fontSize:11,color:TEA,fontWeight:600}}>In-place ${Number(p.in_place_rent).toFixed(2)}/SF{p.market_rent_low?' · market $'+Number(p.market_rent_low).toFixed(2)+(p.market_rent_high?'–'+Number(p.market_rent_high).toFixed(2):'')+' NNN':''}</div>}
          </div>
          {/* HEATMAP */}
          <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
            <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>Submarket Heatmap — NNN Rent $/SF</span></div>
            <div style={{padding:10}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:3}}>
                {HEATMAP.map((c,i)=>{const r=c.heat>.7?184:c.heat>.4?140:21;const g=c.heat>.7?55:c.heat>.4?90:102;const b=c.heat>.7?20:c.heat>.4?4:54;
                  return <div key={i} style={{borderRadius:5,padding:'7px 5px',textAlign:'center',cursor:'pointer',background:`rgb(${r},${g},${b})`,opacity:.85}}><div style={{fontSize:9,fontWeight:600,color:'rgba(255,255,255,.9)'}}>{c.n}</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600,color:'#fff',marginTop:2}}>{c.v}</div></div>;
                })}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8,fontSize:10,color:T3}}><span>Lower</span><div style={{flex:1,height:4,borderRadius:2,background:'linear-gradient(90deg,rgba(21,102,54,.3),rgba(21,102,54,.6),rgba(140,90,4,.5),rgba(184,55,20,.6))'}}/><span>Higher</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ TAB: SALE COMPS ════════════ */}
      {tab==='sale'&&(
        <div style={{padding:'16px 20px'}}>
          <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
            <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>Sale Comps — {p.market||'—'}</span><span style={{fontSize:11,color:BLU,cursor:'pointer',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>+ Add Comp</span></div>
            {saleComps.length===0?<Empty>No sale comps.</Empty>:saleComps.map((c,i)=><CompRow2 key={c.id} addr={c.address||c.property_name} sub={[c.building_sf&&(c.building_sf>=1000?Math.round(c.building_sf/1000)+'k SF':c.building_sf+' SF'),c.sale_date&&fmtD(c.sale_date)].filter(Boolean).join(' · ')} value={c.price_per_sf?'$'+Math.round(c.price_per_sf)+'/SF':c.sale_price?'$'+(Number(c.sale_price)/1e6).toFixed(1)+'M':null} isNew={i===0}/>)}
            {p.est_value&&p.building_sf&&<div style={{padding:'8px 12px',background:GBG,borderTop:`1px solid ${BDR}`,fontSize:11,color:GRN,fontWeight:600}}>Est. value ${Math.round(p.est_value/p.building_sf)}/SF</div>}
          </div>
        </div>
      )}

      {/* ════════════ TAB: CONTACTS ════════════ */}
      {tab==='contacts'&&(
        <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:8}}>
          {contacts.length===0?<CH h="Contacts"><Empty>No contacts linked.</Empty></CH>:contacts.map(c=>(
            <div key={c.id} style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:7,padding:11,display:'flex',gap:10,alignItems:'center'}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:BLU,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#fff',flexShrink:0}}>{(c.name||'?').slice(0,2).toUpperCase()}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T1}}>{c.name}</div><div style={{fontSize:11,color:T3}}>{c.title}{c.company?' · '+c.company:''}</div></div>
              {c.phone&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:BLU}}>{c.phone}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ════════════ TAB: DEALS ════════════ */}
      {tab==='deals'&&<div style={{padding:'16px 20px'}}><CH h="Linked Deals" act="+ Create Deal">
        {deals.length===0?<Empty>No deals linked.</Empty>:deals.map(d=><Link key={d.id} href={'/deals/'+d.id} style={{textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'space-between',padding:10,background:BBG,borderRadius:6,border:`1px solid rgba(78,110,150,.15)`,marginBottom:8}}><div><div style={{fontSize:14,fontWeight:600,color:T1}}>{d.deal_name||d.company||'—'}</div><div style={{fontSize:11,color:T3,fontFamily:"'DM Mono',monospace",marginTop:2}}>{d.stage||'—'}{d.deal_value?' · $'+(Number(d.deal_value)/1e6).toFixed(1)+'M':''}</div></div><span style={{fontSize:11,color:BLU,fontWeight:500}}>Open →</span></Link>)}
      </CH></div>}

      {/* ════════════ TAB: LEADS ════════════ */}
      {tab==='leads'&&<div style={{padding:'16px 20px'}}><CH h="Linked Leads" act="+ Create Lead">
        {leads.length===0?<Empty>No leads linked.</Empty>:leads.map(l=><Link key={l.id} href={'/leads/'+l.id} style={{textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'space-between',padding:10,background:RBG,borderRadius:6,border:`1px solid rgba(184,55,20,.15)`,marginBottom:8}}><div><div style={{fontSize:14,fontWeight:600,color:T1}}>{l.lead_name||l.company||'—'}</div><div style={{fontSize:11,color:T3,marginTop:2}}>{l.stage||'—'}{l.score?' · ORS '+l.score:''}</div></div>{l.score&&<div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:RST}}>{l.score}</div>}</Link>)}
      </CH></div>}

      {/* ════════════ TAB: FILES ════════════ */}
      {tab==='files'&&<div style={{padding:'16px 20px'}}><CH h="Attachments" act="+ Upload">
        {files.length===0?<Empty>No files attached.</Empty>:files.map(f=>(
          <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:9,background:'rgba(0,0,0,.02)',borderRadius:5,border:`1px solid ${BDR}`,marginBottom:6}}>
            <div style={{width:32,height:32,background:BBG,borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:BLU}}>{(f.file_name||'').split('.').pop()?.toUpperCase()?.slice(0,3)||'FILE'}</div>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:T1}}>{f.file_name||f.name||'File'}</div><div style={{fontSize:10,color:T3}}>{fmtD(f.created_at)}</div></div>
            <span style={{fontSize:11,color:BLU,cursor:'pointer'}}>Download</span>
          </div>
        ))}
      </CH></div>}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   DEAL TEMPERATURE GAUGE — SVG semicircle with needle
   ══════════════════════════════════════════════════════════════ */
function DealTempGauge({temp,label,color,warn:w,leaseMonths:lm,holdYears:hy}){
  // Needle angle: 0° = leftmost (-90°), 180° = rightmost (90°). Map temp 0-100 to -90 to 90.
  const angle=-90+(temp/100)*180;
  return(
    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
      <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>Deal Temperature <SA c="r">§03</SA></span></div>
      <div style={{padding:'11px 13px',display:'flex',gap:12,alignItems:'center'}}>
        <div style={{flexShrink:0}}>
          <svg width="120" height="80" viewBox="0 0 120 80">
            <path d="M12,72 A52,52 0 0,1 108,72" fill="none" stroke={CHDR} strokeWidth="10" strokeLinecap="round"/>
            <path d="M12,72 A52,52 0 0,1 32,28" fill="none" stroke="rgba(78,110,150,.35)" strokeWidth="10" strokeLinecap="round"/>
            <path d="M32,28 A52,52 0 0,1 60,16" fill="none" stroke="rgba(140,90,4,.45)" strokeWidth="10" strokeLinecap="round"/>
            <path d="M60,16 A52,52 0 0,1 108,72" fill="none" stroke="rgba(184,55,20,.55)" strokeWidth="10" strokeLinecap="round"/>
            <line x1="60" y1="72" x2="60" y2="24" stroke={NVY} strokeWidth="2.5" strokeLinecap="round" style={{transformOrigin:'60px 72px',transform:`rotate(${angle}deg)`,transition:'transform 1.4s cubic-bezier(.4,0,.2,1)'}}/>
            <circle cx="60" cy="72" r="5" fill={NVY}/>
            <text x="60" y="68" textAnchor="middle" fontFamily="Playfair Display,serif" fontSize="12" fontWeight="700" fill={RST}>{temp}°</text>
          </svg>
        </div>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color}}>{label}</div>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T3,marginBottom:6}}>Deal Temperature</div>
          <div style={{fontSize:11,color:T2,lineHeight:1.5}}>{[w&&'WARN',lm!=null&&lm<=12&&'lease expiry '+lm+'mo',hy&&hy>10&&'long hold'].filter(Boolean).join(' + ')||'Low signal activity'}{temp>=60?' → act immediately':''}</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BROKER RADAR — animated sweep
   ══════════════════════════════════════════════════════════════ */
function BrokerRadar(){
  return(
    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
      <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>Competing Broker Radar</span></div>
      <div style={{padding:'11px 13px',display:'flex',gap:12,alignItems:'center'}}>
        <div style={{flexShrink:0,width:90,height:90}}>
          <svg width="90" height="90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(21,102,54,.2)" strokeWidth=".5"/>
            <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(21,102,54,.15)" strokeWidth=".5"/>
            <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(21,102,54,.1)" strokeWidth=".5"/>
            <line x1="50" y1="8" x2="50" y2="92" stroke="rgba(21,102,54,.1)" strokeWidth=".5"/>
            <line x1="8" y1="50" x2="92" y2="50" stroke="rgba(21,102,54,.1)" strokeWidth=".5"/>
            <path d="M50,50 L50,8 A42,42 0 0,1 84,69 Z" fill="rgba(21,102,54,.1)" style={{transformOrigin:'50px 50px',animation:'orbitSweep 3.5s linear infinite'}}/>
            <circle cx="70" cy="32" r="4" fill={RST} style={{animation:'blink 1.2s infinite'}}/>
            <circle cx="36" cy="74" r="3.5" fill={AMB} style={{animation:'blink 2s infinite'}}/>
            <circle cx="50" cy="50" r="3" fill="rgba(21,102,54,.7)"/>
          </svg>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:600,color:T1,marginBottom:3}}>Scanning…</div>
          <div style={{fontSize:11,color:T2,lineHeight:1.5,marginBottom:6}}>Broker intel data not yet populated. Connect CoStar activity + county records to detect competing activity.</div>
          <div style={{display:'flex',gap:5}}>
            <span style={{fontSize:10,padding:'2px 6px',borderRadius:3,background:'rgba(0,0,0,.04)',color:T3,border:`1px solid ${BDR}`,fontWeight:600}}>No data yet</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ORS SCORE DELTA CARD
   ══════════════════════════════════════════════════════════════ */
function OrsDeltaCard({signals}){
  const icons=['⚠','📅','📞','🏗'];
  const colors=[RBG,ABG,BBG,GBG];
  return(
    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
      <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>ORS Score Delta <SA c="r">§02</SA></span>
        {signals.length>0&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:RBG,color:RST,fontWeight:700}}>+{signals.reduce((a,s)=>a+s.pts,0)} pts</span>}
      </div>
      <div style={{padding:'11px 13px'}}>
        {signals.filter(s=>s.pts>0).map((s,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 0',borderBottom:i<signals.length-1?`1px solid ${BDR}`:'none'}}>
            <div style={{width:26,height:26,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0,background:colors[i%4]}}>{icons[i%4]}</div>
            <span style={{fontSize:12,color:T2,flex:1}}>{s.name}</span>
            <div style={{width:70,height:3,background:CHDR,borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:s.c,width:Math.round(s.pts/s.max*100)+'%',transition:'width 1s ease'}}/></div>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:700,color:RST}}>+{s.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DATA CONFIDENCE CARD
   ══════════════════════════════════════════════════════════════ */
function DataConfCard({data,avg}){
  return(
    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
      <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>Data Confidence</span></div>
      <div style={{padding:'11px 13px'}}>
        {data.map((d,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
            <span style={{fontSize:11,color:T2,width:120,flexShrink:0}}>{d.s}</span>
            <div style={{flex:1,height:4,background:'rgba(0,0,0,.06)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:d.c,width:d.v+'%',transition:'width 1.2s ease'}}/></div>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:T3,width:28,textAlign:'right'}}>{d.v?d.v+'%':'—'}</span>
            {d.tag&&<span style={{fontSize:9,fontWeight:600,padding:'1px 5px',borderRadius:3,background:d.tag==='Verified'?GBG:RBG,color:d.tag==='Verified'?GRN:RST}}>{d.tag}</span>}
          </div>
        ))}
      </div>
      <div style={{margin:'0 12px 12px',padding:'7px 9px',borderRadius:5,background:PBG,border:`1px solid ${PBDR}`,fontSize:11,color:PUR}}>Overall: <strong>{avg}%</strong></div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TENANT / LEASE CARD
   ══════════════════════════════════════════════════════════════ */
function TenantLeaseCard({p,leaseMonths}){
  return(
    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
      <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>Tenant / Lease</span></div>
      <div style={{padding:'11px 13px'}}>
        <div style={{fontSize:14,fontWeight:600,color:T1,marginBottom:2}}>{p.tenant||p.owner||'—'}</div>
        <div style={{fontSize:11,color:T3,marginBottom:8}}>{p.owner_type||'—'} · {p.prop_type||'Industrial'}</div>
        {p.lease_expiration&&<>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:RST,lineHeight:1,marginTop:3}}>{fmtShort(p.lease_expiration)}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:12,fontStyle:'italic',color:RST,marginTop:1}}>{leaseMonths!=null?leaseMonths+' months remaining':''}</div>
        </>}
      </div>
      {(p.in_place_rent||p.market_rent_low)&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderTop:`1px solid ${BDR}`}}>
        <div style={{padding:'9px 12px',borderRight:`1px solid ${BDR}`}}><div style={{fontSize:10,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T3,marginBottom:3}}>In-Place Rent</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:600,color:RST}}>{p.in_place_rent?'$'+Number(p.in_place_rent).toFixed(2)+'/SF NNN':'—'}</div></div>
        <div style={{padding:'9px 12px'}}><div style={{fontSize:10,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T3,marginBottom:3}}>Market Rent</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:600,color:GRN}}>{p.market_rent_low?'$'+Number(p.market_rent_low).toFixed(2)+(p.market_rent_high?'–'+Number(p.market_rent_high).toFixed(2):'')+' NNN':'—'}</div></div>
      </div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   OPPORTUNITY SIGNAL CARD
   ══════════════════════════════════════════════════════════════ */
function OpportunityCard({p,warn:w,holdYears:hy}){
  return(
    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
      <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>Opportunity Signal</span></div>
      <div style={{padding:'11px 13px'}}>
        {w&&<div style={{background:RBG,border:`1px solid ${RBDR}`,borderRadius:5,padding:9,marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:RST,marginBottom:4}}>WARN Act Match — High Urgency</div>
          <div style={{fontSize:12,color:T2,lineHeight:1.5}}>{w.company} filed notice — {w.employees?Number(w.employees).toLocaleString()+' workers affected':'headcount pending'}. Priority outreach recommended.</div>
        </div>}
        <div style={{fontSize:12,color:T2,lineHeight:1.55}}>
          {p.in_place_rent&&p.market_rent_low&&<>Basis dislocation: in-place ${Number(p.in_place_rent).toFixed(2)} vs market ${Number(p.market_rent_low).toFixed(2)}{p.market_rent_high?'–'+Number(p.market_rent_high).toFixed(2):''} NNN. </>}
          {hy&&hy>10&&<>{p.owner} acquired {new Date(p.last_transfer_date).getFullYear()} ({hy} years). <strong style={{color:GRN}}>SLB structure likely.</strong></>}
          {!w&&!p.in_place_rent&&<span style={{color:T3,fontStyle:'italic'}}>Insufficient data for opportunity signals.</span>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BUILDING SCORE FACTORS PANEL
   ══════════════════════════════════════════════════════════════ */
function BsPanel({score,grade,factors,onClose,embedded}){
  return(
    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
      <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>{embedded?'Building Score — 6 Factor Breakdown':'Building Score Breakdown'} <SA c="b">§01</SA></span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:BLU}}>{score}</span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:BLU}}>{grade}</span>
          {onClose&&<span onClick={onClose} style={{fontSize:11,color:BLU,cursor:'pointer',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>✕ Close</span>}
        </div>
      </div>
      <div style={{padding:'11px 13px'}}>
        {factors.map((f,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
          <span style={{fontSize:10,color:T3,width:130,flexShrink:0}}>{f.l}</span>
          <div style={{flex:1,height:4,background:'rgba(0,0,0,.06)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:f.c,width:f.max>0?Math.round(f.v/f.max*100)+'%':'0%',transition:'width 1.2s ease'}}/></div>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:T3,width:32,textAlign:'right'}}>{f.v}/{f.max}</span>
        </div>)}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ORS TIER PANEL — accordion
   ══════════════════════════════════════════════════════════════ */
function OrsTierPanel({signals,expandTier,setExpandTier,onClose}){
  const tiers=[
    {n:'Tier 1 — Lease & Hold',c:RST,items:signals.filter(s=>s.name.includes('Lease')||s.name.includes('Hold'))},
    {n:'Tier 2 — WARN & Contact',c:AMB,items:signals.filter(s=>s.name.includes('WARN')||s.name.includes('Contact'))},
  ];
  tiers.forEach(t=>{t.pts=t.items.reduce((a,s)=>a+s.pts,0);t.max=55;});
  return(
    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
      <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>Owner Readiness — Signal Breakdown <SA c="r">§02</SA></span>
        <span onClick={onClose} style={{fontSize:11,color:BLU,cursor:'pointer',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>✕ Close</span>
      </div>
      {tiers.map((t,i)=><div key={i} style={{borderBottom:`1px solid ${BDR}`}}>
        <div onClick={()=>setExpandTier(expandTier===i?null:i)} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 12px',cursor:'pointer'}}>
          <div style={{width:32,height:32,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',background:t.c,flexShrink:0}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:12,fontWeight:700,color:'#fff'}}>{t.pts}</span></div>
          <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:T1}}>{t.n}</div><div style={{height:2,background:'rgba(0,0,0,.06)',borderRadius:2,marginTop:4,overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:t.c,width:t.max>0?Math.round(t.pts/t.max*100)+'%':'0%'}}/></div></div>
          <span style={{fontSize:14,color:T3,transition:'transform .2s',transform:expandTier===i?'rotate(90deg)':'none'}}>›</span>
        </div>
        {expandTier===i&&<div style={{padding:'0 12px 10px 52px'}}>{t.items.map((it,j)=><div key={j} style={{fontSize:12,color:T2,padding:'2px 0',display:'flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:t.c,display:'inline-block',flexShrink:0}}/>{it.name} (+{it.pts})</div>)}</div>}
      </div>)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   OWNER WATCHLIST SIDEBAR
   ══════════════════════════════════════════════════════════════ */
function WatchlistCard({leads}){
  if(!leads||leads.length===0)return null;
  return(
    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>
      <div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>Owner Watchlist</span></div>
      {leads.slice(0,5).map((o,i)=>{
        const score=o.score||0;
        const col=score>=70?RST:score>=40?AMB:'#ccc';
        return <div key={i} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 12px',borderBottom:`1px solid ${BDR}`,cursor:'pointer'}}>
          <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:col,animation:score>=40?'pulse 1.8s infinite':'none',color:col}}/>
          <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:T1}}>{o.lead_name||o.company||'—'}</div><div style={{fontSize:10,color:T3,marginTop:1}}>{o.address||'—'}</div></div>
          <div style={{textAlign:'right'}}>{score>0&&<div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,lineHeight:1,color:col}}>{score}</div>}</div>
        </div>;
      })}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   SMALL SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════ */
function St({l,v,s,vc,mono,last}){
  return <div style={{flex:1,padding:'11px 13px',borderRight:last?'none':`1px solid ${BDR}`}}>
    <div style={{fontSize:9,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T3,marginBottom:3}}>{l}</div>
    <div style={{fontFamily:mono?"'DM Mono',monospace":"'Playfair Display',serif",fontSize:mono?16:20,fontWeight:700,color:vc||T1,lineHeight:1}}>{v}</div>
    {s&&<div style={{fontSize:10,color:T3,marginTop:2}}>{s}</div>}
  </div>;
}
function SpI({l,v,blue}){return <div style={{flex:1,padding:'0 10px',borderLeft:`1px solid ${BDR}`,textAlign:'center'}}><div style={{fontSize:9,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:T3,marginBottom:2}}>{l}</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:blue?BLU:T1}}>{v}</div></div>;}
function ScoreRing({score,color,size=48,onClick}){if(score==null)return null;const r=(size/2)-5,circ=2*Math.PI*r,filled=(score/100)*circ,grade=score>=90?'A+':score>=80?'A':score>=70?'B+':score>=60?'B':score>=50?'C+':'C';return <div onClick={onClick} style={{width:size,height:size,position:'relative',cursor:onClick?'pointer':'default',flexShrink:0}}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:'rotate(-90deg)'}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth="4"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${filled} ${circ-filled}`} strokeLinecap="round"/></svg><div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:size*.33,fontWeight:500,color:NVY,lineHeight:1}}>{score}</span><span style={{fontSize:size*.17,fontWeight:600,color}}>{grade}</span></div></div>;}
function HeroRing({value,color,grade}){const size=56,r=22,circ=2*Math.PI*r,filled=(value/100)*circ;return <div style={{width:size,height:size,position:'relative'}}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:'rotate(-90deg)'}}><circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="4"/><circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${filled} ${circ-filled}`} strokeLinecap="round"/></svg><div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:500,color:'#fff',lineHeight:1}}>{value}</div><div style={{fontSize:8,fontWeight:600,color,marginTop:1}}>{grade}</div></div></div>;}
function OrsRing({score,onClick}){const size=62,r=25,circ=2*Math.PI*r,filled=(score/100)*circ;return <div onClick={onClick} style={{width:size,height:size,position:'relative',cursor:'pointer',flexShrink:0}}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:'rotate(-90deg)'}}><circle cx={31} cy={31} r={r} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth="5"/><circle cx={31} cy={31} r={r} fill="none" stroke={RST} strokeWidth="5" strokeDasharray={`${filled} ${circ-filled}`} strokeLinecap="round"/></svg><div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:21,fontWeight:700,color:RST,lineHeight:1}}>{score}</div><div style={{fontSize:8,color:T3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:1}}>/ 100</div></div></div>;}
function HBadge({children,c}){const m={amber:{bg:'rgba(140,90,4,.45)',fg:'#f2c94c',bd:'rgba(140,90,4,.5)'},blue:{bg:'rgba(78,110,150,.45)',fg:STL,bd:'rgba(78,110,150,.5)'},rust:{bg:'rgba(184,55,20,.45)',fg:'#f4a080',bd:'rgba(184,55,20,.5)'},green:{bg:'rgba(21,102,54,.45)',fg:'#6fcf97',bd:'rgba(21,102,54,.5)'}};const x=m[c]||m.blue;return <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:500,padding:'3px 8px',borderRadius:4,backdropFilter:'blur(4px)',background:x.bg,color:x.fg,border:`1px solid ${x.bd}`}}>{children}</span>;}
function MkS({l,v,up}){return <div style={{display:'flex',alignItems:'center',gap:5,padding:'0 12px',borderRight:'1px solid rgba(255,255,255,.05)'}}><span style={{fontSize:9,color:'rgba(255,255,255,.32)',letterSpacing:'.05em',textTransform:'uppercase'}}>{l}</span><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:up?'#6fcf97':'rgba(255,255,255,.7)',fontWeight:500}}>{v}</span></div>;}
function SA({children,c}){const m={b:{bg:BBG,fg:BLU},r:{bg:RBG,fg:RST},g:{bg:GBG,fg:GRN},p:{bg:PBG,fg:PUR}};const s=m[c]||m.b;return <span style={{display:'inline-flex',alignItems:'center',fontSize:9,fontWeight:600,padding:'1px 5px',borderRadius:9,verticalAlign:'middle',marginLeft:3,background:s.bg,color:s.fg}}>{children}</span>;}
function SigBar({name,pts,max,c}){return <div style={{marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}><span style={{fontSize:11,color:T2}}>{name}</span><span style={{fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:500,color:c}}>+{pts}</span></div><div style={{height:3,background:'rgba(0,0,0,.06)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:c,width:max>0?Math.round(pts/max*100)+'%':'0%',transition:'width 1.2s ease'}}/></div></div>;}
function SigRow({label,pts,c,last}){return <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:last?'none':`1px solid ${BDR}`,fontSize:12}}><span style={{color:T2}}>{label}</span><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:500,color:c}}>{pts}</span></div>;}
function Crd({children,style}){return <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden',padding:'14px 16px',...style}}>{children}</div>;}
function CH({h,act,children}){return <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:8,overflow:'hidden'}}>{h&&<div style={{background:CHDR,padding:'8px 13px',borderBottom:`1px solid ${BDR}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:T2}}>{h}</span>{act&&<span style={{fontSize:11,color:BLU,cursor:'pointer',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>{act}</span>}</div>}<div style={{padding:'11px 13px'}}>{children}</div></div>;}
function DR({k,v,mono}){return <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'5px 0',borderBottom:`1px solid ${BDR}`,fontSize:13}}><span style={{color:T3}}>{k}</span><span style={{color:T1,fontWeight:500,textAlign:'right',fontFamily:mono?"'DM Mono',monospace":undefined,fontSize:mono?11:undefined}}>{v}</span></div>;}
function CompRow2({addr,sub,value,isNew}){return <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',borderBottom:`1px solid ${BDR}`,background:isNew?'rgba(26,107,107,.03)':'transparent'}}><div><span style={{fontSize:12,fontWeight:600,color:T1}}>{addr||'—'}</span>{isNew&&<span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',padding:'1px 5px',borderRadius:3,background:TBG,color:TEA,marginLeft:5,animation:'blink 1.4s 4'}}>New</span>}<div style={{fontSize:10,color:T3,marginTop:1}}>{sub}</div></div>{value&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,color:T1,flexShrink:0}}>{value}</span>}</div>;}
function TlIc({type}){const s={call:{bg:BBG,c:BLU,i:'☏'},email:{bg:PBG,c:PUR,i:'✉'},note:{bg:ABG,c:AMB,i:'✎'},stage_change:{bg:GBG,c:GRN,i:'↑'},meeting:{bg:GBG,c:GRN,i:'◆'},warn:{bg:RBG,c:RST,i:'⚠'}};const x=s[type]||s.note;return <div style={{width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0,background:x.bg,color:x.c}}>{x.i}</div>;}
function AB({children,onClick}){return <button onClick={onClick} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 10px',fontSize:12,color:T2,border:'none',background:'none',cursor:'pointer',fontFamily:"'Instrument Sans',sans-serif",whiteSpace:'nowrap'}}>{children}</button>;}
function Sep(){return <div style={{width:1,height:16,background:BDR,margin:'0 4px'}}/>;}
function TC({children}){return <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,background:'rgba(0,0,0,.06)',borderRadius:7,padding:'1px 4px',marginLeft:3}}>{children}</span>;}
function SB2({l,v}){return <div style={{background:'rgba(0,0,0,.03)',borderRadius:6,padding:10,textAlign:'center'}}><div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.06em',color:T3,marginBottom:2}}>{l}</div><div style={{fontSize:18,fontWeight:500}}>{v}</div></div>;}
function Empty({children}){return <div style={{padding:20,textAlign:'center',color:T3,fontSize:14}}>{children}</div>;}
function fmtD(d){if(!d)return '—';return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function fmtShort(d){if(!d)return '—';return new Date(d).toLocaleDateString('en-US',{month:'short',year:'numeric'});}
