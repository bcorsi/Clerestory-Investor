'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

function fmt(n){return n!=null?Number(n).toLocaleString():'—'}
function fmtM(n){if(n==null)return'—';const v=Number(n);return v>=1e6?'$'+(v/1e6).toFixed(1)+'M':'$'+fmt(v)}
function fmtPct(n){return n!=null?Number(n).toFixed(1)+'%':'—'}
function fmtD(d){if(!d)return'—';return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}

const B='#4E6E96',G='#156636',R='#B83714',A='#8C5A04',P='#5838A0',T='#1A6B6B';
const STAGES=['Tracking','Underwriting','Offer / LOI','Under Contract','Due Diligence','Non-Contingent','Closed'];
const SMAP={'Off-Market Outreach':'Offer / LOI','Marketing':'Offer / LOI','LOI':'Offer / LOI','LOI Accepted':'Under Contract','PSA Negotiation':'Under Contract','Closed Won':'Closed'};

export default function AcquisitionDetail(){
  const {id}=useParams();
  const [deal,setDeal]=useState(null);
  const [prop,setProp]=useState(null);
  const [acts,setActs]=useState([]);
  const [contacts,setContacts]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [files,setFiles]=useState([]);
  const [saleComps,setSaleComps]=useState([]);
  const [leaseComps,setLeaseComps]=useState([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState(0);
  const [logType,setLogType]=useState('call');
  const [logNote,setLogNote]=useState('');
  const [synth,setSynth]=useState(null);
  const [synthLoading,setSynthLoading]=useState(false);
  const mapRef=useRef(null);
  const mapInst=useRef(null);

  useEffect(()=>{if(id)loadAll()},[id]);

  async function loadAll(){
    setLoading(true);
    try{
      const sb=createClient();
      const [{data:d},{data:a},{data:dc},{data:t},{data:f}]=await Promise.all([
        sb.from('deals').select('*').eq('id',id).single(),
        sb.from('activities').select('*').eq('deal_id',id).order('created_at',{ascending:false}),
        sb.from('deal_contacts').select('*,contacts(*)').eq('deal_id',id),
        sb.from('tasks').select('*').eq('deal_id',id).order('due_date',{ascending:true}),
        sb.from('file_attachments').select('*').eq('deal_id',id).order('created_at',{ascending:false}),
      ]);
      setDeal(d);setActs(a||[]);setContacts(dc||[]);setTasks(t||[]);setFiles(f||[]);
      if(d?.ai_synthesis)setSynth(d.ai_synthesis);
      // Load linked property
      if(d?.property_id){
        const {data:p}=await sb.from('properties').select('*').eq('id',d.property_id).single();
        setProp(p);
        // Load comps near this property
        if(p?.market){
          const [sc,lc]=await Promise.all([
            sb.from('sale_comps').select('*').eq('market',p.market).order('sale_date',{ascending:false}).limit(10),
            sb.from('lease_comps').select('*').eq('market',p.market).order('commencement_date',{ascending:false}).limit(10),
          ]);
          setSaleComps(sc.data||[]);setLeaseComps(lc.data||[]);
        }
      }
    }catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  // Init map
  useEffect(()=>{
    if(!deal||mapInst.current)return;
    const lat=deal.lat||prop?.lat;const lng=deal.lng||prop?.lng;
    if(!lat||!lng||!mapRef.current)return;
    if(typeof window==='undefined'||!window.L)return;
    const L=window.L;
    const m=L.map(mapRef.current,{zoomControl:false,attributionControl:false}).setView([lat,lng],17);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(m);
    L.marker([lat,lng]).addTo(m);
    mapInst.current=m;
  },[deal,prop]);

  async function logActivity(){
    if(!logNote.trim())return;
    try{
      const sb=createClient();
      await sb.from('activities').insert({deal_id:id,activity_type:logType,subject:logNote,activity_date:new Date().toISOString()});
      setLogNote('');loadAll();
    }catch(e){console.error(e)}
  }

  async function generateSynthesis(){
    if(!deal)return;setSynthLoading(true);
    try{
      const text=`Acquisition thesis for ${deal.deal_name||deal.address}: ${fmtM(deal.deal_value)} at ${fmtPct(deal.going_in_cap)} going-in cap. ${deal.strategy_type||deal.deal_type||''} strategy. ${acts.slice(0,3).map(a=>a.subject).join('. ')}`;
      setSynth(text);
      const sb=createClient();
      await sb.from('deals').update({ai_synthesis:text,ai_synthesis_date:new Date().toISOString()}).eq('id',id);
    }catch(e){console.error(e);setSynth('Synthesis unavailable.')}
    finally{setSynthLoading(false)}
  }

  async function advanceStage(){
    if(!deal)return;
    const ms=SMAP[deal.stage]||deal.stage;
    const idx=STAGES.indexOf(ms);
    if(idx>=0&&idx<STAGES.length-1){
      const next=STAGES[idx+1];
      const sb=createClient();
      await sb.from('deals').update({stage:next}).eq('id',id);
      await sb.from('activities').insert({deal_id:id,activity_type:'stage_change',subject:'Stage → '+next});
      loadAll();
    }
  }

  if(loading)return<div className="cl-loading"><div className="cl-spinner"/>Loading…</div>;
  if(!deal)return<div style={{padding:40,textAlign:'center',color:'#888'}}>Acquisition not found.</div>;

  const ms=SMAP[deal.stage]||deal.stage;
  const si=STAGES.indexOf(ms);
  const psf=deal.deal_value&&(deal.building_sf||prop?.building_sf)?Math.round(Number(deal.deal_value)/Number(deal.building_sf||prop?.building_sf)):null;
  const strat=deal.strategy_type||deal.deal_type||'';
  const hasMap=(deal.lat||prop?.lat)&&(deal.lng||prop?.lng);

  const TABS=['Overview','Underwriting','IC Memo','Property','Comps','Contacts','Seller Outreach','Tasks','Files'];

  return(
<div>
  {/* ── HEADER ── */}
  <div style={{background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.08)',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
    <div>
      <div style={{fontSize:12,color:'#888',marginBottom:4}}><Link href="/deals" style={{color:B,textDecoration:'none'}}>Acq Pipeline</Link><span style={{margin:'0 5px',opacity:.4}}>›</span>{deal.deal_name||deal.address}</div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:'#0E1520',marginBottom:5}}>{deal.deal_name||deal.company||deal.address}</h1>
      <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'#888',marginBottom:8}}>{(deal.address||'').toUpperCase()}{deal.city?' · '+deal.city.toUpperCase():''}{(deal.building_sf||prop?.building_sf)?' · '+fmt(deal.building_sf||prop?.building_sf)+' SF':''}</div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
        <Bdg c={B}>Acquisition</Bdg>
        <Bdg c={A}>● {ms}</Bdg>
        {deal.priority&&<Bdg c={R}>{deal.priority}</Bdg>}
        {strat&&<Bdg c={P}>{strat}</Bdg>}
      </div>
    </div>
    <div style={{display:'flex',gap:7}}><Btn onClick={()=>setTab(0)}>+ Activity</Btn><Btn blue onClick={advanceStage}>Advance Stage →</Btn></div>
  </div>

  {/* ── AERIAL MAP (compact) ── */}
  {hasMap&&<div ref={mapRef} style={{height:160,background:'#0d1410',position:'relative'}}/>}

  {/* ── STAGE TRACK ── */}
  <div style={{background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.08)',padding:'7px 24px',display:'flex',alignItems:'center',overflowX:'auto'}}>
    {STAGES.map((s,i)=>(
      <div key={s} style={{display:'flex',alignItems:'center',flexShrink:0}}>
        <span style={{fontSize:12,padding:'4px 10px',borderRadius:4,fontWeight:i===si?600:500,cursor:'pointer',
          background:i<si?'rgba(78,110,150,0.08)':i===si?B:'transparent',
          color:i<si?B:i===si?'#fff':'#BBB',
        }}>{i===si?'● ':''}{s}</span>
        {i<STAGES.length-1&&<span style={{color:'rgba(0,0,0,0.12)',margin:'0 3px',fontSize:14}}>›</span>}
      </div>
    ))}
  </div>

  {/* ── KPI STRIP ── */}
  <div style={{display:'flex',background:'#FAFAF8',borderBottom:'1px solid rgba(0,0,0,0.08)'}}>
    <DK l="Acq Price" v={fmtM(deal.deal_value)} s={psf?'~$'+psf+'/SF':null}/>
    <DK l="Going-In Cap" v={fmtPct(deal.going_in_cap)} vc={G}/>
    <DK l="Target IRR" v={fmtPct(deal.target_irr)} vc={G} s="levered · 5yr hold"/>
    <DK l="Equity Required" v={fmtM(deal.equity_required)} vc={B}/>
    <DK l="Basis $/SF" v={psf?'$'+psf:'—'} s={deal.replacement_cost_psf?'Replace ~$'+Math.round(Number(deal.replacement_cost_psf)):null}/>
    <DK l="Strategy" v={strat||'—'} last/>
  </div>

  {/* ── TABS ── */}
  <div style={{background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.08)',display:'flex',padding:'0 24px',overflowX:'auto'}}>
    {TABS.map((t,i)=>(
      <div key={t} onClick={()=>setTab(i)} style={{padding:'10px 14px',fontSize:13,color:i===tab?B:'#888',cursor:'pointer',borderBottom:i===tab?'2px solid '+B:'2px solid transparent',fontWeight:i===tab?500:400,whiteSpace:'nowrap',flexShrink:0}}>
        {t}{t==='IC Memo'&&<span style={{fontSize:9,background:'rgba(78,110,150,0.08)',color:B,borderRadius:7,padding:'1px 5px',marginLeft:4,fontWeight:600}}>AI</span>}
        {t==='Contacts'&&contacts.length>0&&<Ct>{contacts.length}</Ct>}
        {t==='Tasks'&&tasks.length>0&&<Ct>{tasks.length}</Ct>}
        {t==='Files'&&files.length>0&&<Ct>{files.length}</Ct>}
      </div>
    ))}
  </div>

  {/* ════ TAB 0: OVERVIEW ════ */}
  {tab===0&&(
  <div style={{display:'flex',padding:'18px 24px',gap:16,alignItems:'flex-start'}}>
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:14}}>

      {/* Investment Returns */}
      <Crd h="Investment Returns" a="Edit Assumptions">
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
          <RC l="Unlevered IRR" v={fmtPct(deal.unlevered_irr)} s="5yr hold"/>
          <RC l="Levered IRR" v={fmtPct(deal.target_irr)} s={deal.ltv_pct?deal.ltv_pct+'% LTV':null}/>
          <RC l="Equity Multiple" v={deal.equity_multiple?deal.equity_multiple+'×':'—'} last/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
          <SR l="Stab. Yield" v={deal.stabilized_noi&&deal.deal_value?(Number(deal.stabilized_noi)/Number(deal.deal_value)*100).toFixed(1)+'%':'—'} vc={G}/>
          <SR l="Cash-on-Cash" v="—" vc={B}/><SR l="Breakeven Occ." v="—"/><SR l="DSCR Yr 1" v="—" vc={G} last/>
        </div>
      </Crd>

      {/* AI Synthesis */}
      <div style={{background:'rgba(78,110,150,0.06)',border:'1px solid rgba(78,110,150,0.2)',borderRadius:8,overflow:'hidden'}}>
        <div style={{background:'rgba(78,110,150,0.1)',padding:'9px 14px',borderBottom:'1px solid rgba(78,110,150,0.15)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:B}}>✦ AI Synthesis</span>
          <span onClick={generateSynthesis} style={{fontSize:12,color:B,cursor:'pointer',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>{synthLoading?'Generating…':synth?'Refresh':'Generate'}</span>
        </div>
        <div style={{padding:'12px 14px',fontSize:14,lineHeight:1.75,color:'#444'}}>
          {synth||<div style={{textAlign:'center',padding:'16px 0',color:'#888'}}>
            <div style={{marginBottom:8}}>No synthesis yet. Generate an AI acquisition brief.</div>
            <button onClick={generateSynthesis} style={{background:B,color:'#fff',border:'none',padding:'8px 20px',borderRadius:6,fontSize:13,fontWeight:500,cursor:'pointer'}}>Generate Synthesis</button>
          </div>}
        </div>
      </div>

      {/* Activity Timeline */}
      <Crd h="Activity Timeline" a="+ Log Activity">
        <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
          <select value={logType} onChange={e=>setLogType(e.target.value)} style={{padding:'6px 10px',borderRadius:6,border:'1px solid rgba(0,0,0,0.08)',fontSize:13}}><option value="call">Call</option><option value="email">Email</option><option value="note">Note</option><option value="meeting">Meeting</option></select>
          <input value={logNote} onChange={e=>setLogNote(e.target.value)} placeholder="Notes…" onKeyDown={e=>e.key==='Enter'&&logActivity()} style={{flex:1,padding:'6px 10px',borderRadius:6,border:'1px solid rgba(0,0,0,0.08)',fontSize:13}}/>
          <button onClick={logActivity} style={{background:B,color:'#fff',border:'none',padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,cursor:'pointer'}}>Log</button>
        </div>
        {acts.length===0?<div style={{padding:16,textAlign:'center',color:'#888',fontSize:13}}>No activity yet.</div>
        :acts.map(a=>(
          <div key={a.id} style={{display:'flex',gap:9,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
            <div style={{width:27,height:27,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0,
              background:a.activity_type==='call'?'rgba(78,110,150,0.08)':a.activity_type==='stage_change'?'rgba(21,102,54,0.08)':a.activity_type==='email'?'rgba(88,56,160,0.08)':'rgba(140,90,4,0.08)',
              color:a.activity_type==='call'?B:a.activity_type==='stage_change'?G:a.activity_type==='email'?P:A,
            }}>{a.activity_type==='call'?'☏':a.activity_type==='stage_change'?'↑':a.activity_type==='email'?'✉':'✎'}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:'#1A1A1A'}}>{a.subject||a.activity_type}</div><div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',marginTop:2}}>{fmtD(a.activity_date||a.created_at)}</div></div>
          </div>
        ))}
      </Crd>

      {/* 3-Col Intel Grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
        <Crd h="Seller Intelligence">
          <DR k="Owner" v={deal.owner||prop?.owner||'—'}/><DR k="Owner Type" v={deal.owner_type||'—'}/>
          <DR k="Hold Period" v={deal.hold_period_years?deal.hold_period_years+' yrs':'—'}/><DR k="Readiness" v={deal.readiness_score||'—'} vc={A}/>
        </Crd>
        <Crd h="Active Catalysts">
          {(()=>{try{const tags=typeof deal.catalyst_tags==='string'?JSON.parse(deal.catalyst_tags):deal.catalyst_tags;
          return tags&&tags.length>0?tags.map((t,i)=><div key={i} style={{padding:'5px 0',borderBottom:'1px solid rgba(0,0,0,0.04)',fontSize:12,color:'#444'}}>{typeof t==='object'?t.tag:t}</div>)
          :<div style={{color:'#888',fontSize:12,padding:'8px 0'}}>No catalysts yet</div>}catch(e){return<div style={{color:'#888',fontSize:12,padding:'8px 0'}}>No catalysts yet</div>}})()}
        </Crd>
        <Crd h="Broker Intel">
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,paddingBottom:6,borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:A}}></div>
            <span style={{fontSize:12,fontWeight:600,color:'#1A1A1A'}}>No Active Listing</span>
          </div>
          <DR k="Listing Broker" v="—" vc={B}/><DR k="Last Sale Broker" v="—"/>
          <div style={{marginTop:8,paddingTop:6,borderTop:'1px solid rgba(0,0,0,0.06)'}}>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:G,marginBottom:4}}>⚡ Recommendation</div>
            <div style={{fontSize:12,color:'#1A1A1A',lineHeight:1.5,fontWeight:500}}>Go direct to owner. Off-market recommended.</div>
          </div>
        </Crd>
      </div>
    </div>

    {/* ── SIDEBAR ── */}
    <div style={{width:260,flexShrink:0,display:'flex',flexDirection:'column',gap:12}}>
      <Crd h="Portfolio Fit Score">
        <div style={{textAlign:'center',padding:'8px 0'}}>
          <div style={{width:76,height:76,borderRadius:'50%',border:'4px solid '+B,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:26,fontWeight:600,color:B}}>{deal.portfolio_fit_score||'—'}</span>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:'#1A1A1A'}}>{deal.portfolio_fit_grade||'Unscored'}</div>
        </div>
      </Crd>
      <Crd h="Acquisition Details" a="Edit">
        <DR k="Strategy" v={strat||'—'}/><DR k="Stage" v={ms} vc={A}/><DR k="Priority" v={deal.priority||'—'} vc={deal.priority==='High'?R:undefined}/>
        <DR k="Market" v={deal.market||'—'}/><DR k="Submarket" v={deal.submarket||'—'}/>
        <DR k="Building SF" v={(deal.building_sf||prop?.building_sf)?fmt(deal.building_sf||prop?.building_sf)+' SF':'—'} mono/>
        <DR k="Year Built" v={deal.year_built||prop?.year_built||'—'} mono/><DR k="Target Close" v={fmtD(deal.target_close_date)} vc={A}/>
      </Crd>
    </div>
  </div>
  )}

  {/* ════ TAB 1: UNDERWRITING ════ */}
  {tab===1&&<Pad><Crd h="Underwriting"><div style={{padding:40,textAlign:'center',color:'#888'}}>Quick UW form + Returns Dashboard + NOI Build + Sensitivity — coming next build cycle.</div></Crd></Pad>}

  {/* ════ TAB 2: IC MEMO ════ */}
  {tab===2&&<Pad><Crd h="Investment Committee Memo"><div style={{padding:40,textAlign:'center',color:'#888'}}>AI-generated IC Memo — coming next build cycle.</div></Crd></Pad>}

  {/* ════ TAB 3: PROPERTY ════ */}
  {tab===3&&<Pad>
    {prop ? (
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <h2 style={{fontSize:16,fontWeight:600}}>Property Details</h2>
          <Link href={'/properties/'+prop.id} style={{fontSize:13,color:B,textDecoration:'none',fontWeight:500}}>View Full Property Page →</Link>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Crd h="Building Specifications">
            <DR k="Building SF" v={prop.building_sf?fmt(prop.building_sf)+' SF':'—'} mono/>
            <DR k="Land Acres" v={prop.land_acres||'—'} mono/>
            <DR k="Year Built" v={prop.year_built||'—'} mono/>
            <DR k="Clear Height" v={prop.clear_height?prop.clear_height+"'":'—'} mono/>
            <DR k="Dock Doors" v={prop.dock_doors||'—'} mono/>
            <DR k="Grade Doors" v={prop.grade_doors||'—'} mono/>
            <DR k="Column Spacing" v={prop.column_spacing||'—'} mono/>
            <DR k="Construction" v={prop.construction_type||'—'}/>
          </Crd>
          <Crd h="Site & Systems">
            <DR k="Power" v={prop.power||'—'} mono/>
            <DR k="Sprinklers" v={prop.sprinklers||'—'}/>
            <DR k="Zoning" v={prop.zoning||'—'} mono/>
            <DR k="Parking Spaces" v={prop.parking_spaces||'—'} mono/>
            <DR k="Parking Ratio" v={prop.parking_ratio||'—'} mono/>
            <DR k="APN" v={prop.apn||'—'} mono/>
            <DR k="Owner" v={prop.owner||'—'}/>
            <DR k="Vacancy Status" v={prop.vacancy_status||'—'}/>
          </Crd>
        </div>
      </div>
    ) : (
      <Crd h="Property"><div style={{padding:24,textAlign:'center',color:'#888'}}>No property linked to this deal yet. Link a property from the Records page.</div></Crd>
    )}
  </Pad>}

  {/* ════ TAB 4: COMPS ════ */}
  {tab===4&&<Pad>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <Crd h={'Sale Comps · '+(deal.market||'—')}>
        {saleComps.length===0?<div style={{padding:16,textAlign:'center',color:'#888',fontSize:13}}>No sale comps in this market yet.</div>
        :saleComps.map(c=>(
          <div key={c.id} style={{padding:'8px 0',borderBottom:'1px solid rgba(0,0,0,0.04)',fontSize:13}}>
            <div style={{fontWeight:500,color:'#1A1A1A'}}>{c.address||c.property_name||'—'}</div>
            <div style={{display:'flex',gap:12,fontFamily:'var(--font-mono)',fontSize:11,color:'#888',marginTop:2}}>
              {c.sale_price&&<span>{fmtM(c.sale_price)}</span>}
              {c.price_per_sf&&<span>${Math.round(c.price_per_sf)}/SF</span>}
              {c.cap_rate&&<span>{Number(c.cap_rate).toFixed(1)}% cap</span>}
              {c.sale_date&&<span>{fmtD(c.sale_date)}</span>}
            </div>
          </div>
        ))}
      </Crd>
      <Crd h={'Lease Comps · '+(deal.market||'—')}>
        {leaseComps.length===0?<div style={{padding:16,textAlign:'center',color:'#888',fontSize:13}}>No lease comps in this market yet.</div>
        :leaseComps.map(c=>(
          <div key={c.id} style={{padding:'8px 0',borderBottom:'1px solid rgba(0,0,0,0.04)',fontSize:13}}>
            <div style={{fontWeight:500,color:'#1A1A1A'}}>{c.address||c.property_name||'—'}</div>
            <div style={{display:'flex',gap:12,fontFamily:'var(--font-mono)',fontSize:11,color:'#888',marginTop:2}}>
              {c.effective_rent&&<span>${Number(c.effective_rent).toFixed(2)}/SF</span>}
              {c.lease_type&&<span>{c.lease_type}</span>}
              {c.term_months&&<span>{c.term_months}mo</span>}
              {c.commencement_date&&<span>{fmtD(c.commencement_date)}</span>}
            </div>
          </div>
        ))}
      </Crd>
    </div>
  </Pad>}

  {/* ════ TAB 5: CONTACTS ════ */}
  {tab===5&&<Pad>
    {contacts.length===0?<Crd h="Contacts"><div style={{padding:20,textAlign:'center',color:'#888'}}>No contacts linked yet.</div></Crd>
    :contacts.map(dc=>{const c=dc.contacts||dc;return(
      <div key={dc.id} style={{background:'#FAFAF8',border:'1px solid rgba(0,0,0,0.06)',borderRadius:8,padding:12,marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:B,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#fff'}}>{(c.name||'?').slice(0,2).toUpperCase()}</div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:'#1A1A1A'}}>{c.name}</div><div style={{fontSize:12,color:'#888'}}>{c.title}{c.company?' · '+c.company:''}</div></div>
        {c.phone&&<span style={{fontSize:12,color:B,fontFamily:'var(--font-mono)'}}>{c.phone}</span>}
        {c.email&&<span style={{fontSize:12,color:'#888'}}>{c.email}</span>}
      </div>
    )})}
  </Pad>}

  {/* ════ TAB 6: SELLER OUTREACH ════ */}
  {tab===6&&<Pad><Crd h="Seller Outreach Log">
    {acts.filter(a=>['call','email','meeting'].includes(a.activity_type)).length===0
      ?<div style={{padding:20,textAlign:'center',color:'#888'}}>No outreach logged yet.</div>
      :acts.filter(a=>['call','email','meeting'].includes(a.activity_type)).map(a=>(
        <div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,0.04)',fontSize:13}}>
          <span style={{fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:3,background:a.activity_type==='call'?'rgba(78,110,150,0.08)':a.activity_type==='email'?'rgba(88,56,160,0.08)':'rgba(21,102,54,0.08)',color:a.activity_type==='call'?B:a.activity_type==='email'?P:G}}>{a.activity_type}</span>
          <span style={{flex:1,color:'#444'}}>{a.subject}</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888'}}>{fmtD(a.activity_date||a.created_at)}</span>
        </div>
      ))}
  </Crd></Pad>}

  {/* ════ TAB 7: TASKS ════ */}
  {tab===7&&<Pad><Crd h="Tasks">
    {tasks.length===0?<div style={{padding:20,textAlign:'center',color:'#888'}}>No tasks yet.</div>
    :tasks.map(t=>(
      <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
        <div style={{width:18,height:18,border:'2px solid '+(t.status==='done'?G:'rgba(0,0,0,0.15)'),borderRadius:4,background:t.status==='done'?G:'transparent'}}/>
        <span style={{flex:1,fontSize:13,color:t.status==='done'?'#888':'#1A1A1A',textDecoration:t.status==='done'?'line-through':'none'}}>{t.title}</span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:t.due_date&&new Date(t.due_date)<new Date()&&t.status!=='done'?R:'#888'}}>{fmtD(t.due_date)}</span>
      </div>
    ))}
  </Crd></Pad>}

  {/* ════ TAB 8: FILES ════ */}
  {tab===8&&<Pad><Crd h="Files">
    {files.length===0?<div style={{padding:20,textAlign:'center',color:'#888'}}>No files attached yet.</div>
    :files.map(f=>(
      <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
        <div style={{width:32,height:32,borderRadius:6,background:'rgba(78,110,150,0.08)',color:B,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>📄</div>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:'#1A1A1A'}}>{f.file_name||f.name||'File'}</div><div style={{fontSize:10,color:'#888'}}>{fmtD(f.created_at)}</div></div>
      </div>
    ))}
  </Crd></Pad>}
</div>
  );
}

/* ── Components ── */
function Crd({h,a,children}){return<div style={{background:'#FAFAF8',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>{h&&<div style={{background:'#EDE8E0',padding:'9px 14px',borderBottom:'1px solid rgba(0,0,0,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontFamily:'var(--font-mono)',fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#524D46'}}>{h}</span>{a&&<span style={{fontSize:12,color:B,cursor:'pointer',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>{a}</span>}</div>}<div style={{padding:'11px 14px'}}>{children}</div></div>}
function DK({l,v,vc,s,last}){return<div style={{flex:1,padding:'13px 16px',borderRight:last?'none':'1px solid rgba(0,0,0,0.06)'}}><div style={{fontSize:10,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:'#888',marginBottom:3}}>{l}</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:vc||'#1A1A1A',lineHeight:1}}>{v}</div>{s&&<div style={{fontSize:11,color:'#888',marginTop:2}}>{s}</div>}</div>}
function RC({l,v,s,last}){return<div style={{padding:'16px 18px',borderRight:last?'none':'1px solid rgba(0,0,0,0.06)',textAlign:'center'}}><div style={{fontSize:10,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:'#888',marginBottom:7}}>{l}</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:B,lineHeight:1}}>{v}</div>{s&&<div style={{fontSize:11,color:'#888',marginTop:4}}>{s}</div>}</div>}
function SR({l,v,vc,last}){return<div style={{padding:'12px 14px',borderRight:last?'none':'1px solid rgba(0,0,0,0.04)'}}><div style={{fontSize:10,color:'#888',marginBottom:4}}>{l}</div><div style={{fontFamily:'var(--font-mono)',fontSize:16,fontWeight:600,color:vc||'#1A1A1A'}}>{v}</div></div>}
function DR({k,v,vc,mono}){return<div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'5px 0',borderBottom:'1px solid rgba(0,0,0,0.05)',fontSize:13}}><span style={{color:'#888'}}>{k}</span><span style={{color:vc||'#1A1A1A',fontWeight:500,textAlign:'right',fontFamily:mono?'var(--font-mono)':undefined,fontSize:mono?12:undefined}}>{v}</span></div>}
function Bdg({c,children}){return<span style={{fontSize:11,fontWeight:500,padding:'3px 9px',borderRadius:4,background:c+'12',color:c,border:'1px solid '+c+'40'}}>{children}</span>}
function Btn({blue,onClick,children}){return<button onClick={onClick} style={{fontSize:12,padding:'7px 13px',borderRadius:5,cursor:'pointer',fontWeight:500,border:'1px solid '+(blue?B:'rgba(0,0,0,0.08)'),background:blue?B:'#fff',color:blue?'#fff':'#444',whiteSpace:'nowrap'}}>{children}</button>}
function Ct({children}){return<span style={{fontFamily:'var(--font-mono)',fontSize:10,background:'rgba(0,0,0,0.06)',borderRadius:7,padding:'1px 5px',marginLeft:4}}>{children}</span>}
function Pad({children}){return<div style={{padding:'18px 24px'}}>{children}</div>}
