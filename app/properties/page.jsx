'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  SCORE_COLORS, getGrade, getFitColors, getBuildingColors, getOrsColors, getOrsLabel,
  PROPERTY_TAG_CATEGORIES, PROPERTY_TAGS, CATALYST_CATEGORIES, CATALYST_TAGS,
  getTagStyle, isPropertyTag, isCatalystTag,
  getAllPropertyTagNames, getAllCatalystTagNames,
  getPropertyTagsByCategory, getCatalystTagsByCategory,
} from '@/lib/catalyst-constants';

/* ═══════════════════════════════════════════════════════════
   Properties — Physical Asset Database
   app/properties/page.jsx  (Clerestory-Investor)
   v5 rebuild — April 2026

   ① Scores: Fit (teal) · Building (indigo) · ORS (ember)
   ② SF → K, Land → 1 decimal, Coverage → whole %
   ③ Status column DELETED
   ④ Tags: catalyst (warm) | divider | property (cool)
   ⑤ Full 81-tag taxonomy in Bulk Tag + Advanced Filters
   ═══════════════════════════════════════════════════════════ */

const fmt = (n) => n == null ? '—' : Number(n).toLocaleString();
const fmtSFK = (n) => { if (n == null) return '—'; if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${Math.round(n/1e3)}K`; return fmt(n); };
const fmtLand = (n) => n == null ? '—' : Number(n).toFixed(1);
const fmtCov = (sf, ac) => (!sf || !ac) ? '—' : `${Math.round((sf / (ac * 43560)) * 100)}%`;
const fmtSF = (n) => { if (n == null) return '—'; if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`; return fmt(n); };
const monthsUntil = (d) => d ? Math.round((new Date(d) - new Date()) / (1e3*60*60*24*30.44)) : null;
const fmtExpiry = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '—';
const ago = (d) => { if (!d) return ''; const h = Math.round((Date.now()-new Date(d).getTime())/36e5); if (h<1) return 'now'; if (h<24) return `${h}h`; const days=Math.round(h/24); return days===1?'1d':`${days}d`; };

const CL = { bg:'#F4F1EC',bg2:'#EAE6DF',card:'#FFFFFF',ink:'#0F0D09',ink2:'#2C2822',ink3:'#524D46',ink4:'#6E6860',line:'rgba(0,0,0,0.08)',line2:'rgba(0,0,0,0.055)',shadow:'0 1px 4px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05)',shadowMd:'0 4px 16px rgba(0,0,0,0.10),0 1px 4px rgba(0,0,0,0.06)',radius:10 };

const ghostBtn = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:7,fontFamily:"'Instrument Sans',sans-serif",fontSize:13,fontWeight:500,cursor:'pointer',border:`1px solid ${CL.line}`,background:CL.card,color:CL.ink3,whiteSpace:'nowrap',transition:'all .12s' };
const primaryBtn = { ...ghostBtn,background:'#3730A3',color:'#fff',borderColor:'#3730A3' };

const getSignalColor = (tag) => { const s = getTagStyle(tag); return s.color; };
const isUrgentTag = (tag) => { const t=(tag||'').toLowerCase(); return t.includes('warn')||t.includes('nod')||t.includes('bankruptcy')||t.includes('distress')||t.includes('vacant'); };

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortCol, setSortCol] = useState('ai_score');
  const [sortDir, setSortDir] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [signals, setSignals] = useState([]);
  const [deltas, setDeltas] = useState({ props:0, signals:0 });
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState({ minScore:0,minFit:0,minOrs:0,minSF:'',maxSF:'',minHt:0,expiry:'Any',submarket:'Any',ownerType:'Any',holdYears:'Any',catalyst:'Any',propTag:'Any' });
  const [savedViews, setSavedViews] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [showCampaignPicker, setShowCampaignPicker] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagMode, setBulkTagMode] = useState('add');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [comparisonAI, setComparisonAI] = useState('');
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [bulkTagTab, setBulkTagTab] = useState('catalyst');

  useEffect(() => { fetchProperties(); loadSavedViews(); }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('properties').select('*').order('ai_score',{ascending:false,nullsFirst:false});
      if (error) throw error;
      const list = data || [];
      setProperties(list);
      let tickerItems = [];
      try { const { data: news } = await supabase.from('news_articles').select('title,source,published_at,url').order('published_at',{ascending:false}).limit(10); if (news?.length) tickerItems = news.map(n=>({tag:n.source||'Market Intel',addr:n.title||'—',city:'',time:n.published_at})); } catch{}
      const propSigs = list.filter(p=>(p.catalyst_tags||[]).length>0&&p.updated_at).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)).slice(0,Math.max(0,15-tickerItems.length)).map(p=>({tag:(p.catalyst_tags||[])[0],addr:p.property_name||p.address||'—',city:p.city,time:p.updated_at}));
      setSignals([...tickerItems,...propSigs]);
      const cutoff = new Date(Date.now()-7*864e5).toISOString();
      setDeltas({ props:list.filter(p=>p.created_at>cutoff).length, signals:list.filter(p=>p.updated_at>cutoff&&(p.catalyst_tags||[]).length>0).length });
    } catch(err){console.error(err)} finally{setLoading(false)}
  };

  const loadSavedViews = () => { try { const raw = typeof window!=='undefined'?localStorage.getItem('cl_saved_views'):null; if(raw) setSavedViews(JSON.parse(raw)); } catch{} };
  const saveView = () => { const name=prompt('Name this view:'); if(!name) return; const view={name,filter:activeFilter,adv:{...advFilters},search,sort:sortCol,dir:sortDir}; const next=[...savedViews,view]; setSavedViews(next); try{localStorage.setItem('cl_saved_views',JSON.stringify(next))}catch{} };
  const loadView = (v) => { setActiveFilter(v.filter||'All'); if(v.adv) setAdvFilters(v.adv); if(v.search) setSearch(v.search); if(v.sort){setSortCol(v.sort);setSortDir(v.dir||'desc')} setShowSaved(false); };
  const deleteView = (i) => { const next=savedViews.filter((_,j)=>j!==i); setSavedViews(next); try{localStorage.setItem('cl_saved_views',JSON.stringify(next))}catch{} };

  const filtered = useMemo(() => {
    let list = [...properties];
    if (search.trim()) { const q=search.toLowerCase(); list=list.filter(p=>[p.property_name,p.address,p.city,p.submarket,p.owner,p.tenant].some(f=>(f||'').toLowerCase().includes(q))); }
    const mktMatch = (p,terms) => { const s=[p.market,p.submarket,p.city].map(v=>(v||'').toLowerCase()).join(' '); return terms.some(t=>s.includes(t)); };
    switch(activeFilter) {
      case 'SGV': list=list.filter(p=>mktMatch(p,['sgv','san gabriel','city of industry','el monte','baldwin park','west covina','covina','azusa','irwindale','pomona','arcadia','monrovia','duarte','rowland','hacienda','pasadena'])); break;
      case 'IE': list=list.filter(p=>mktMatch(p,['ie','inland empire','ontario','riverside','rancho cucamonga','fontana','rialto','san bernardino','chino','corona','moreno valley','perris','jurupa','eastvale','mira loma','colton','bloomington'])); break;
      case 'OC': list=list.filter(p=>mktMatch(p,['orange county','oc','anaheim','fullerton','irvine','santa ana'])); break;
      case 'SD': list=list.filter(p=>mktMatch(p,['san diego','carlsbad','oceanside','otay mesa','chula vista'])); break;
      case 'SFV': list=list.filter(p=>mktMatch(p,['sfv','san fernando','sun valley','burbank','chatsworth','sylmar','pacoima','van nuys'])); break;
      case 'South Bay': list=list.filter(p=>mktMatch(p,['south bay','long beach','carson','torrance','compton','gardena'])); break;
      case 'WARN': list=list.filter(p=>(p.catalyst_tags||[]).some(t=>t.toLowerCase().includes('warn'))); break;
      case 'Lease Expiry': list=list.filter(p=>{const m=monthsUntil(p.lease_expiration);return m!=null&&m<=24;}); break;
      case 'SLB': list=list.filter(p=>(p.catalyst_tags||[]).some(t=>t.toLowerCase().includes('slb'))); break;
      case 'High Fit': list=list.filter(p=>(p.fit_score||0)>=65); break;
      case 'Acq Target': list=list.filter(p=>p.is_acq_target===true); break;
    }
    const af = advFilters;
    if(af.minScore>0) list=list.filter(p=>(p.ai_score||0)>=af.minScore);
    if(af.minFit>0) list=list.filter(p=>(p.fit_score||0)>=af.minFit);
    if(af.minOrs>0) list=list.filter(p=>(p.probability||0)>=af.minOrs);
    if(af.minSF) list=list.filter(p=>(p.building_sf||0)>=parseInt(af.minSF.replace(/,/g,''))||0);
    if(af.maxSF) list=list.filter(p=>(p.building_sf||0)<=parseInt(af.maxSF.replace(/,/g,''))||Infinity);
    if(af.minHt>0) list=list.filter(p=>(p.clear_height||0)>=af.minHt);
    if(af.expiry!=='Any'){const map={'≤6mo':6,'≤12mo':12,'≤24mo':24,'≤36mo':36,'Expired':0};const mo=map[af.expiry];if(mo===0)list=list.filter(p=>p.lease_expiration&&new Date(p.lease_expiration)<new Date());else if(mo)list=list.filter(p=>{const m=monthsUntil(p.lease_expiration);return m!=null&&m<=mo;});}
    if(af.submarket!=='Any') list=list.filter(p=>(p.submarket||'').toLowerCase().includes(af.submarket.toLowerCase()));
    if(af.ownerType!=='Any') list=list.filter(p=>(p.owner_type||'').toLowerCase().includes(af.ownerType.toLowerCase()));
    if(af.holdYears!=='Any'){const yrs=parseInt(af.holdYears);if(yrs)list=list.filter(p=>{if(!p.last_transfer_date)return false;return(new Date().getFullYear()-new Date(p.last_transfer_date).getFullYear())>=yrs;});}
    if(af.catalyst!=='Any') list=list.filter(p=>(p.catalyst_tags||[]).some(t=>t.toLowerCase().includes(af.catalyst.toLowerCase())));
    if(af.propTag!=='Any') list=list.filter(p=>(p.catalyst_tags||[]).some(t=>t.toLowerCase().includes(af.propTag.toLowerCase())));
    list.sort((a,b)=>{let va=a[sortCol],vb=b[sortCol];if(va==null)va=sortDir==='desc'?-Infinity:Infinity;if(vb==null)vb=sortDir==='desc'?-Infinity:Infinity;if(typeof va==='string'){va=va.toLowerCase();vb=(vb||'').toLowerCase();}return sortDir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0);});
    return list;
  }, [properties,search,activeFilter,sortCol,sortDir,advFilters]);

  const kpis = useMemo(() => {
    const totalSF=filtered.reduce((s,p)=>s+(p.building_sf||0),0);
    const sigs=filtered.filter(p=>(p.catalyst_tags||[]).length>0).length;
    const acqTargets=filtered.filter(p=>p.is_acq_target===true).length;
    return { total:filtered.length, totalSF, signals:sigs, acqTargets };
  }, [filtered]);

  const counts = useMemo(() => {
    const m=(p,t)=>[p.market,p.submarket,p.city].map(v=>(v||'').toLowerCase()).join(' ');
    const mf=(terms)=>properties.filter(p=>terms.some(t=>m(p).includes(t))).length;
    return { all:properties.length, sgv:mf(['sgv','san gabriel','city of industry','el monte','baldwin park','west covina','covina','azusa','irwindale','pomona']), ie:mf(['ie','inland empire','ontario','riverside','rancho cucamonga','fontana','rialto','san bernardino','chino','corona','moreno valley','perris']), oc:mf(['orange county','oc','anaheim','fullerton','irvine']), sd:mf(['san diego','carlsbad','oceanside','otay mesa']), sfv:mf(['sfv','san fernando','sun valley','burbank','chatsworth']), sb:mf(['south bay','long beach','carson','torrance','compton']) };
  }, [properties]);

  const submarkets = useMemo(()=>[...new Set(properties.map(p=>p.submarket).filter(Boolean))].sort(),[properties]);
  const handleSort = useCallback((col)=>{if(sortCol===col)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortCol(col);setSortDir('desc')}},[sortCol]);
  const toggleSelect = (id) => setSelected(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;});
  const toggleAll = () => {if(selected.size===filtered.length)setSelected(new Set());else setSelected(new Set(filtered.map(p=>p.id)));};
  const clearSelection = () => setSelected(new Set());
  const compareProps = useMemo(()=>[...selected].slice(0,3).map(id=>properties.find(p=>p.id===id)).filter(Boolean),[selected,properties]);

  // Bulk actions
  const handleExportCSV = () => { const rows=properties.filter(p=>selected.has(p.id)); if(!rows.length)return; const h=['Property Name','Address','City','Submarket','Building SF','Clear Height','Land Acres','Year Built','Owner','Building Score','Fit Score','Catalyst Tags']; const csv=[h.join(','),...rows.map(p=>[`"${(p.property_name||'').replace(/"/g,'""')}"`,`"${(p.address||'').replace(/"/g,'""')}"`,`"${p.city||''}"`,`"${p.submarket||''}"`,p.building_sf||'',p.clear_height||'',p.land_acres||'',p.year_built||'',`"${(p.owner||'').replace(/"/g,'""')}"`,p.ai_score||'',p.fit_score||'',`"${(p.catalyst_tags||[]).join('; ')}"`].join(','))]; const blob=new Blob([csv.join('\n')],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`clerestory_properties_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };

  const handleBulkTag = async () => { if(!bulkTagInput.trim())return; setBulkProcessing(true); const tag=bulkTagInput.trim(); const ids=[...selected]; try{for(const id of ids){const prop=properties.find(p=>p.id===id);if(!prop)continue;const existing=Array.isArray(prop.catalyst_tags)?[...prop.catalyst_tags]:[];let updated;if(bulkTagMode==='add'){updated=existing.includes(tag)?existing:[...existing,tag]}else{updated=existing.filter(t=>t!==tag)}await supabase.from('properties').update({catalyst_tags:updated,updated_at:new Date().toISOString()}).eq('id',id);}setShowBulkTag(false);setBulkTagInput('');fetchProperties();}catch(err){alert('Error: '+err.message)}finally{setBulkProcessing(false)} };

  const openCampaignPicker = async () => { setShowCampaignPicker(true); try{const{data}=await supabase.from('research_campaigns').select('id,name,market,status').order('created_at',{ascending:false}).limit(20);setCampaigns(data||[]);}catch{} };
  const handleAddToCampaign = async (cid) => { setBulkProcessing(true); const ids=[...selected]; try{const targets=ids.map(id=>{const p=properties.find(pp=>pp.id===id);return{campaign_id:cid,owner:p?.owner||'—',address:p?.address||'—',city:p?.city||'',apn:'',status:'New',property_id:id}});const{error}=await supabase.from('campaign_targets').insert(targets);if(error)throw error;alert(`✓ ${ids.length} added`);setShowCampaignPicker(false);clearSelection();}catch(err){alert('Error: '+err.message)}finally{setBulkProcessing(false)} };
  const handleConvertToAcq = async () => { const ids=[...selected]; if(!confirm(`Create ${ids.length} acquisition${ids.length>1?'s':''}?`))return; setBulkProcessing(true); let c=0; try{for(const id of ids){const p=properties.find(pp=>pp.id===id);if(!p)continue;const{error}=await supabase.from('deals').insert({deal_name:p.property_name||p.address||'New Acquisition',address:p.address,city:p.city,market:p.market,stage:'Screening',deal_type:'Acquisition',property_id:id});if(!error)c++;}alert(`✓ ${c} created`);clearSelection();}catch(err){alert('Error: '+err.message)}finally{setBulkProcessing(false)} };

  const generateComparison = async () => { if(compareProps.length<2||comparisonLoading)return; setComparisonLoading(true); setComparisonAI(''); try{const ctx=compareProps.map(p=>({name:p.property_name||p.address,city:p.city,submarket:p.submarket,sf:p.building_sf,clear_ht:p.clear_height,year:p.year_built,dock_doors:p.dock_doors,truck_court:p.truck_court_depth,score:p.ai_score,ors:p.probability,owner:p.owner,owner_type:p.owner_type,tenant:p.tenant,vacancy:p.vacancy_status,lease_exp:p.lease_expiration,in_place_rent:p.in_place_rent,market_rent:p.market_rent,tags:(p.catalyst_tags||[]).slice(0,5)})); const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`You are Clerestory, an AI acquisition intelligence system. Compare these ${ctx.length} industrial properties for an institutional buyer. For each, summarize strengths and weaknesses. Give a clear recommendation on the strongest acquisition target with specific numbers. 4-6 sentences per property plus 2-3 sentence verdict.\n\nProperties:\n${JSON.stringify(ctx,null,2)}`,type:'property_comparison'})}); const data=await res.json(); setComparisonAI(data.content||data.text||'Error generating comparison.');}catch(e){setComparisonAI('Error: '+e.message)}finally{setComparisonLoading(false)} };

  const [newProp, setNewProp] = useState({property_name:'',address:'',city:'',state:'CA',zip:''});
  const handleAdd = async () => { if(!newProp.property_name&&!newProp.address)return; try{await supabase.from('properties').insert([{...newProp,property_name:newProp.property_name||newProp.address}]);setShowAddModal(false);setNewProp({property_name:'',address:'',city:'',state:'CA',zip:''});fetchProperties();}catch(err){alert('Error: '+err.message)} };

  const cols = [
    {key:'property_name',label:'Property',w:'auto'},
    {key:'fit_score',label:'Scores',w:172},
    {key:'building_sf',label:'SF',w:68},
    {key:'clear_height',label:'Clr',w:48},
    {key:'land_acres',label:'Land',w:52},
    {key:null,label:'Cov',w:48},
    {key:'year_built',label:'Year',w:52},
    {key:'owner',label:'Owner',w:130},
    {key:null,label:'Tags',w:'auto'},
  ];

  return (
    <>
      {/* TICKER */}
      {signals.length>0&&(<div style={{background:'linear-gradient(90deg,#1A2130,#1F2840,#1A2130)',borderRadius:CL.radius,overflow:'hidden',marginBottom:20,height:38,position:'relative',border:'1px solid rgba(100,128,162,0.15)'}}>
        <div style={{position:'absolute',left:0,top:0,bottom:0,width:110,background:'linear-gradient(90deg,#1A2130 70%,transparent)',zIndex:5,display:'flex',alignItems:'center',paddingLeft:14,gap:6}}><span style={{width:6,height:6,borderRadius:'50%',background:'#F08880',animation:'blink 1.4s infinite'}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(240,235,225,0.7)'}}>Market Intel</span></div>
        <div style={{display:'flex',gap:32,animation:'tickerScroll 40s linear infinite',paddingLeft:120,alignItems:'center',height:'100%'}}>{[...signals,...signals].map((s,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap',flexShrink:0}}><span style={{width:5,height:5,borderRadius:'50%',background:getSignalColor(s.tag),flexShrink:0}}/><span style={{fontSize:12.5,color:'rgba(245,240,232,0.85)'}}>{s.tag} — <span style={{fontWeight:500,color:'rgba(137,168,198,0.95)'}}>{s.addr}{s.city?`, ${s.city}`:''}</span></span><span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'rgba(200,215,235,0.38)'}}>{ago(s.time)}</span></div>))}</div>
      </div>)}

      {/* HEADER */}
      <div style={{padding:'28px 0 20px',display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
        <div><h1 style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:32,fontWeight:300,color:CL.ink,letterSpacing:'-0.02em',lineHeight:1,margin:0}}>Properties</h1><p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontStyle:'italic',color:CL.ink4,marginTop:6}}>{loading?'Loading…':`${kpis.total} properties · ${fmtSF(kpis.totalSF)} SF · SGV / IE Industrial`}</p></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button style={ghostBtn} onClick={()=>setShowFilters(p=>!p)}>⊕ {showFilters?'Hide':'Advanced'} Filters</button>
          <button style={ghostBtn} onClick={()=>setShowCompare(p=>!p)}>⊞ Compare{selected.size>0?` (${Math.min(selected.size,3)})`:''}</button>
          <button onClick={()=>setShowAddModal(true)} style={primaryBtn}>+ Add Property</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <KPI icon="🏢" value={kpis.total} label="Total Properties" delta={deltas.props>0?`+${deltas.props}`:null} color="#3730A3"/>
        <KPI icon="◫" value={fmtSF(kpis.totalSF)} label="Total SF Tracked" color="#1A6B8A"/>
        <KPI icon="◈" value={kpis.acqTargets} label="Acq Targets" color="#0E7C6B"/>
        <KPI icon="⚡" value={kpis.signals} label="Active Catalysts" delta={deltas.signals>0?`+${deltas.signals}`:null} color="#C41E1E"/>
      </div>

      {/* ADVANCED FILTERS */}
      {showFilters&&(<div style={{background:CL.card,borderRadius:CL.radius,boxShadow:CL.shadowMd,border:`1px solid ${CL.line2}`,padding:20,marginBottom:16,animation:'slideDown .25s ease'}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:CL.ink3,marginBottom:14}}>⊕ Advanced Filters</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
          <FilterField label="Min Building Score"><div style={{display:'flex',alignItems:'center',gap:8}}><input type="range" min="0" max="100" value={advFilters.minScore} onChange={e=>setAdvFilters(f=>({...f,minScore:Number(e.target.value)}))} style={{flex:1,accentColor:'#3730A3'}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'#3730A3',minWidth:28,textAlign:'right'}}>{advFilters.minScore}</span></div></FilterField>
          <FilterField label="Min Fit Score"><div style={{display:'flex',alignItems:'center',gap:8}}><input type="range" min="0" max="100" value={advFilters.minFit} onChange={e=>setAdvFilters(f=>({...f,minFit:Number(e.target.value)}))} style={{flex:1,accentColor:'#0E7C6B'}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'#0E7C6B',minWidth:28,textAlign:'right'}}>{advFilters.minFit}</span></div></FilterField>
          <FilterField label="Min ORS"><div style={{display:'flex',alignItems:'center',gap:8}}><input type="range" min="0" max="100" value={advFilters.minOrs} onChange={e=>setAdvFilters(f=>({...f,minOrs:Number(e.target.value)}))} style={{flex:1,accentColor:'#C41E1E'}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'#C41E1E',minWidth:28,textAlign:'right'}}>{advFilters.minOrs}</span></div></FilterField>
          <FilterField label="SF Range"><div style={{display:'flex',alignItems:'center',gap:6}}><input placeholder="Min" value={advFilters.minSF} onChange={e=>setAdvFilters(f=>({...f,minSF:e.target.value}))} style={fpInput}/><span style={{color:CL.ink4,fontSize:11}}>to</span><input placeholder="Max" value={advFilters.maxSF} onChange={e=>setAdvFilters(f=>({...f,maxSF:e.target.value}))} style={fpInput}/></div></FilterField>
          <FilterField label="Min Clear Height"><div style={{display:'flex',alignItems:'center',gap:8}}><input type="range" min="0" max="40" value={advFilters.minHt} onChange={e=>setAdvFilters(f=>({...f,minHt:Number(e.target.value)}))} style={{flex:1,accentColor:'#3730A3'}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'#3730A3',minWidth:28,textAlign:'right'}}>{advFilters.minHt}'</span></div></FilterField>
          <FilterField label="Lease Expiry"><select value={advFilters.expiry} onChange={e=>setAdvFilters(f=>({...f,expiry:e.target.value}))} style={fpSelect}>{['Any','≤6mo','≤12mo','≤24mo','≤36mo','Expired'].map(o=><option key={o}>{o}</option>)}</select></FilterField>
          <FilterField label="Submarket"><select value={advFilters.submarket} onChange={e=>setAdvFilters(f=>({...f,submarket:e.target.value}))} style={fpSelect}><option>Any</option>{submarkets.map(s=><option key={s}>{s}</option>)}</select></FilterField>
          <FilterField label="Owner Type"><select value={advFilters.ownerType} onChange={e=>setAdvFilters(f=>({...f,ownerType:e.target.value}))} style={fpSelect}>{['Any','Owner-User','Private','Institutional','Trust'].map(o=><option key={o}>{o}</option>)}</select></FilterField>
          <FilterField label="Hold Period"><select value={advFilters.holdYears} onChange={e=>setAdvFilters(f=>({...f,holdYears:e.target.value}))} style={fpSelect}>{['Any','10','15','20','25'].map(o=><option key={o} value={o}>{o==='Any'?'Any':`≥ ${o} years`}</option>)}</select></FilterField>
          <FilterField label="Catalyst Tag"><select value={advFilters.catalyst} onChange={e=>setAdvFilters(f=>({...f,catalyst:e.target.value}))} style={fpSelect}><option>Any</option>{getAllCatalystTagNames().map(t=><option key={t}>{t}</option>)}</select></FilterField>
          <FilterField label="Property Tag"><select value={advFilters.propTag} onChange={e=>setAdvFilters(f=>({...f,propTag:e.target.value}))} style={fpSelect}><option>Any</option>{getAllPropertyTagNames().map(t=><option key={t}>{t}</option>)}</select></FilterField>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16,paddingTop:14,borderTop:`1px solid ${CL.line}`}}>
          <button onClick={()=>setAdvFilters({minScore:0,minFit:0,minOrs:0,minSF:'',maxSF:'',minHt:0,expiry:'Any',submarket:'Any',ownerType:'Any',holdYears:'Any',catalyst:'Any',propTag:'Any'})} style={ghostBtn}>Clear All</button>
          <button onClick={()=>setShowFilters(false)} style={primaryBtn}>Apply · {filtered.length} results</button>
        </div>
      </div>)}

      {/* FILTER CHIPS + SEARCH */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {[{k:'All',ct:counts.all},{k:'SGV',ct:counts.sgv},{k:'IE',ct:counts.ie},{k:'OC',ct:counts.oc},{k:'SD',ct:counts.sd},{k:'SFV',ct:counts.sfv},{k:'South Bay',ct:counts.sb}].filter(f=>f.ct>0||f.k==='All').map(f=><Chip key={f.k} label={f.k} count={f.ct} active={activeFilter===f.k} onClick={()=>setActiveFilter(f.k)}/>)}
        <Sep/>
        {['WARN','Lease Expiry','SLB','High Fit','Acq Target'].map(f=><Chip key={f} label={f==='WARN'?'⚡ WARN':f==='High Fit'?'★ High Fit':f==='Acq Target'?'◈ Acq Target':f} active={activeFilter===f} onClick={()=>setActiveFilter(f)}/>)}
        <div style={{position:'relative',marginLeft:8}}>
          <button onClick={()=>setShowSaved(p=>!p)} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:7,fontSize:12,fontWeight:500,cursor:'pointer',border:'1px solid rgba(107,100,196,0.28)',background:'rgba(107,100,196,0.08)',color:'#6B64C4',fontFamily:"'Instrument Sans',sans-serif"}}>☆ Saved Views ▾</button>
          {showSaved&&(<div style={{position:'absolute',top:'calc(100% + 6px)',left:0,width:260,background:CL.card,borderRadius:10,boxShadow:CL.shadowMd,border:`1px solid ${CL.line2}`,zIndex:50,overflow:'hidden'}}>
            {savedViews.length===0&&<div style={{padding:'14px',fontSize:13,color:CL.ink4}}>No saved views yet</div>}
            {savedViews.map((v,i)=>(<div key={i} onClick={()=>loadView(v)} style={{padding:'10px 14px',fontSize:13,color:CL.ink2,cursor:'pointer',borderBottom:`1px solid ${CL.line2}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontWeight:500}}>{v.name}</span><span onClick={e=>{e.stopPropagation();deleteView(i)}} style={{fontSize:14,color:CL.ink4,cursor:'pointer',padding:'0 4px'}}>✕</span></div>))}
            <div onClick={saveView} style={{padding:'10px 14px',fontSize:12,color:'#6B64C4',cursor:'pointer',borderTop:`1px solid ${CL.line}`}}>+ Save current view…</div>
          </div>)}
        </div>
        <div style={{position:'relative',flex:1,maxWidth:360,marginLeft:'auto'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:CL.ink4,pointerEvents:'none'}}>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search properties, owners, tenants…" style={{width:'100%',padding:'8px 14px 8px 36px',border:`1px solid ${CL.line}`,borderRadius:8,fontFamily:"'Instrument Sans',sans-serif",fontSize:14,color:CL.ink,background:CL.card,outline:'none'}}/></div>
      </div>

      {/* TABLE */}
      <div style={{background:CL.card,borderRadius:12,boxShadow:CL.shadow,border:`1px solid ${CL.line2}`,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
          <colgroup><col style={{width:36}}/>{cols.map((c,i)=><col key={i} style={{width:c.w==='auto'?undefined:c.w}}/>)}<col style={{width:24}}/></colgroup>
          <thead><tr>
            <th style={{padding:'11px 10px',borderBottom:`2px solid ${CL.line}`,background:CL.bg}}><div onClick={toggleAll} style={{width:18,height:18,border:`2px solid ${selected.size===filtered.length&&filtered.length>0?'#3730A3':CL.line}`,borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',background:selected.size===filtered.length&&filtered.length>0?'#3730A3':'transparent'}}>{selected.size===filtered.length&&filtered.length>0?'✓':''}</div></th>
            {cols.map((col,i)=>(<th key={i} onClick={()=>col.key&&handleSort(col.key)} style={{padding:'11px 10px',textAlign:'left',fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',whiteSpace:'nowrap',color:sortCol===col.key?'#3730A3':CL.ink3,borderBottom:`2px solid ${CL.line}`,background:CL.bg,cursor:col.key?'pointer':'default',userSelect:'none'}}>{col.label}{col.key&&<span style={{opacity:sortCol===col.key?1:0.35,fontSize:10,marginLeft:4}}>{sortCol===col.key?(sortDir==='desc'?'↓':'↑'):'↕'}</span>}</th>))}
            <th style={{borderBottom:`2px solid ${CL.line}`,background:CL.bg}}/>
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={cols.length+2} style={{padding:48,textAlign:'center',color:CL.ink4,fontSize:16}}>Loading…</td></tr>:
            filtered.length===0?<tr><td colSpan={cols.length+2} style={{padding:48,textAlign:'center',color:CL.ink4,fontSize:16}}>No properties match filters.</td></tr>:
            filtered.map((p,idx)=>{
              const isSel=selected.has(p.id);
              const allTags=(p.catalyst_tags||[]);
              const catTags=allTags.filter(t=>isCatalystTag(t));
              const propTags=allTags.filter(t=>isPropertyTag(t));
              const unknownTags=allTags.filter(t=>!isCatalystTag(t)&&!isPropertyTag(t));
              const fitC=getFitColors(p.fit_score);
              const bldgC=getBuildingColors(p.ai_score);
              const orsC=getOrsColors(p.probability);
              return (
                <tr key={p.id} onClick={()=>router.push(`/properties/${p.id}`)} style={{borderBottom:`1px solid ${CL.line2}`,cursor:'pointer',transition:'background .1s',background:isSel?'rgba(55,48,163,0.04)':''}} onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='#F8F6F2'}} onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background=''}}>
                  <td style={{padding:'10px 10px',verticalAlign:'middle'}}><div onClick={e=>{e.stopPropagation();toggleSelect(p.id)}} style={{width:18,height:18,border:`2px solid ${isSel?'#3730A3':CL.line}`,borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',background:isSel?'#3730A3':'transparent',transition:'all .12s'}}>{isSel?'✓':''}</div></td>
                  {/* Property */}
                  <td style={{padding:'10px 10px',verticalAlign:'middle',overflow:'hidden'}}><div style={{fontWeight:600,color:CL.ink,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.property_name||p.address||'—'}</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:13,color:CL.ink4,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{[p.city,p.submarket].filter(Boolean).join(' · ')||'—'}</div></td>
                  {/* SCORES — Fit ring (teal) + Bldg number (indigo) + ORS number (ember) */}
                  <td style={{padding:'8px 10px',verticalAlign:'middle'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      {p.fit_score!=null?(<div style={{width:36,height:36,borderRadius:'50%',border:`2.5px solid ${fitC.bdr}`,background:fitC.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:fitC.color,lineHeight:1}}>{p.fit_score}</span><span style={{fontFamily:"'DM Mono',monospace",fontSize:7.5,color:fitC.color,marginTop:1}}>{p.fit_grade||getGrade(p.fit_score)}</span></div>):<span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:CL.ink4,width:36,textAlign:'center'}}>—</span>}
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',minWidth:32}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700,color:bldgC.color,lineHeight:1}}>{p.ai_score??'—'}</span><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:bldgC.color,marginTop:1,opacity:.7}}>Bldg</span></div>
                      <span style={{width:2,height:2,borderRadius:'50%',background:CL.line,flexShrink:0}}/>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',minWidth:32}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700,color:orsC.color,lineHeight:1}}>{p.probability??'—'}</span><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:orsC.color,marginTop:1,opacity:.7}}>ORS</span></div>
                      {p.is_acq_target&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:8,fontWeight:700,color:'#0E7C6B',background:'rgba(14,124,107,0.08)',border:'1px solid rgba(14,124,107,0.28)',borderRadius:3,padding:'1px 4px',flexShrink:0}}>ACQ</span>}
                    </div>
                  </td>
                  <td style={{padding:'10px 10px',fontFamily:"'DM Mono',monospace",fontSize:13,color:CL.ink2,verticalAlign:'middle'}}>{fmtSFK(p.building_sf)}</td>
                  <td style={{padding:'10px 10px',fontFamily:"'DM Mono',monospace",fontSize:13,color:CL.ink2,verticalAlign:'middle'}}>{p.clear_height?`${p.clear_height}'`:'—'}</td>
                  <td style={{padding:'10px 10px',fontFamily:"'DM Mono',monospace",fontSize:13,color:CL.ink2,verticalAlign:'middle'}}>{fmtLand(p.land_acres)}</td>
                  <td style={{padding:'10px 10px',fontFamily:"'DM Mono',monospace",fontSize:13,color:CL.ink2,verticalAlign:'middle'}}>{fmtCov(p.building_sf,p.land_acres)}</td>
                  <td style={{padding:'10px 10px',fontFamily:"'DM Mono',monospace",fontSize:13,color:CL.ink2,verticalAlign:'middle'}}>{p.year_built||'—'}</td>
                  <td style={{padding:'10px 10px',fontSize:13,color:CL.ink4,verticalAlign:'middle',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.owner||'—'}</td>
                  {/* TAGS — catalysts (warm) | divider | property tags (cool) */}
                  <td style={{padding:'8px 10px',verticalAlign:'middle'}}>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
                      {catTags.slice(0,2).map((tag,i)=>{const s=getTagStyle(tag);return<span key={`c${i}`} className={isUrgentTag(tag)?'catalyst-pulse':''} style={{display:'inline-flex',padding:'2px 7px',borderRadius:4,fontSize:10.5,fontWeight:600,background:s.bg,border:`1px solid ${s.bdr}`,color:s.color,whiteSpace:'nowrap'}}>{tag}</span>})}
                      {catTags.length>2&&<span style={{fontSize:10,color:CL.ink4,fontFamily:"'DM Mono',monospace"}}>+{catTags.length-2}</span>}
                      {catTags.length>0&&propTags.length>0&&<span style={{width:1,height:14,background:CL.line,margin:'0 2px',flexShrink:0}}/>}
                      {propTags.slice(0,1).map((tag,i)=>{const s=getTagStyle(tag);return<span key={`p${i}`} style={{display:'inline-flex',padding:'2px 7px',borderRadius:4,fontSize:10.5,fontWeight:600,background:s.bg,border:`1px solid ${s.bdr}`,color:s.color,whiteSpace:'nowrap'}}>{tag}</span>})}
                      {propTags.length>1&&<span style={{fontSize:10,color:'#6B5B95',fontFamily:"'DM Mono',monospace"}}>+{propTags.length-1}</span>}
                      {unknownTags.slice(0,1).map((tag,i)=>{const s=getTagStyle(tag);return<span key={`u${i}`} style={{display:'inline-flex',padding:'2px 7px',borderRadius:4,fontSize:10.5,fontWeight:600,background:s.bg,border:`1px solid ${s.bdr}`,color:s.color,whiteSpace:'nowrap'}}>{tag}</span>})}
                      {p.ai_synthesis&&<AISparkle text={p.ai_synthesis}/>}
                    </div>
                  </td>
                  <td style={{padding:'10px 4px',color:CL.ink4,fontSize:14,opacity:.5,verticalAlign:'middle'}}>›</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading&&filtered.length>0&&<div style={{padding:'14px 0',fontSize:14,color:CL.ink4}}>Showing {filtered.length} of {properties.length} properties</div>}

      {/* BULK BAR */}
      {selected.size>0&&(<div style={{position:'fixed',bottom:0,left:242,right:0,background:'linear-gradient(90deg,#1A2130,#1F2840)',padding:'12px 24px',display:'flex',alignItems:'center',gap:12,zIndex:50,boxShadow:'0 -4px 20px rgba(0,0,0,0.15)',borderTop:'2px solid rgba(100,128,162,0.25)'}}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:'#fff',marginRight:4}}>{selected.size}</span>
        <span style={{fontSize:13,color:'rgba(245,240,232,0.7)',marginRight:12}}>selected</span>
        <BulkBtn onClick={handleExportCSV}>📊 Export CSV</BulkBtn>
        <BulkBtn onClick={()=>setShowBulkTag(true)}>🏷 Bulk Tag</BulkBtn>
        <BulkBtn onClick={openCampaignPicker}>📬 Add to Campaign</BulkBtn>
        <BulkBtn green onClick={handleConvertToAcq}>◈ Convert to Acq</BulkBtn>
        <span onClick={clearSelection} style={{marginLeft:'auto',color:'rgba(245,240,232,0.5)',cursor:'pointer',fontSize:18,padding:'4px 8px'}}>✕</span>
      </div>)}

      {/* COMPARE DRAWER */}
      {showCompare&&(<div style={{position:'fixed',right:0,top:0,bottom:0,width:480,background:CL.card,boxShadow:'-8px 0 30px rgba(0,0,0,0.12)',zIndex:200,borderLeft:`1px solid ${CL.line2}`,display:'flex',flexDirection:'column',animation:'slideIn .3s ease'}}>
        <div style={{padding:'18px 24px',borderBottom:`1px solid ${CL.line}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:14,fontWeight:600}}>⊞ Property Comparison <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:CL.ink4,marginLeft:4}}>{Math.min(selected.size,3)} of 3 max</span></span><span onClick={()=>setShowCompare(false)} style={{color:CL.ink4,cursor:'pointer',fontSize:18}}>✕</span></div>
        {compareProps.length===0?(<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8,color:CL.ink4}}><div style={{fontSize:14}}>Select properties to compare</div></div>):(
          <div style={{flex:1,overflowY:'auto'}}>
            <div style={{display:'grid',gridTemplateColumns:`140px repeat(${compareProps.length},1fr)`,borderBottom:`1px solid ${CL.line2}`,background:CL.bg}}><div style={{padding:'9px 14px'}}/>{compareProps.map(p=><div key={p.id} style={{padding:'9px 14px',fontWeight:600,fontSize:12,color:'#3730A3'}}>{p.property_name||p.address||'—'}</div>)}</div>
            {[{l:'Building SF',fn:p=>fmt(p.building_sf),k:'building_sf'},{l:'Clear Height',fn:p=>p.clear_height?`${p.clear_height}'`:'—',k:'clear_height'},{l:'Year Built',fn:p=>p.year_built||'—',k:'year_built'},{l:'Dock Doors',fn:p=>p.dock_doors||'—',k:'dock_doors'},{l:'Truck Court',fn:p=>p.truck_court_depth?`${p.truck_court_depth}'`:'—',k:'truck_court_depth'},{l:'Building Score',fn:p=>p.ai_score!=null?`${p.ai_score} ${getGrade(p.ai_score)}`:'—',k:'ai_score'},{l:'Fit Score',fn:p=>p.fit_score!=null?`${p.fit_score} ${p.fit_grade||''}`:'—',k:'fit_score'},{l:'Land AC',fn:p=>p.land_acres?Number(p.land_acres).toFixed(1):'—',k:'land_acres'},{l:'Coverage',fn:p=>fmtCov(p.building_sf,p.land_acres)},{l:'Catalysts',fn:p=>(p.catalyst_tags||[]).slice(0,3).join(', ')||'—'}].map((row,ri)=>{
              const best=row.k?Math.max(...compareProps.map(p=>p[row.k]||0)):null;
              return(<div key={ri} style={{display:'grid',gridTemplateColumns:`140px repeat(${compareProps.length},1fr)`,borderBottom:`1px solid ${CL.line2}`}}><div style={{padding:'9px 14px',fontSize:12,color:CL.ink4,background:'rgba(0,0,0,0.015)'}}>{row.l}</div>{compareProps.map(p=>{const w=row.k&&best!=null&&(p[row.k]||0)===best&&compareProps.filter(pp=>(pp[row.k]||0)===best).length===1;return<div key={p.id} style={{padding:'9px 14px',fontFamily:"'DM Mono',monospace",fontSize:12,color:w?'#3730A3':CL.ink2,fontWeight:w?600:400,background:w?'rgba(55,48,163,0.04)':''}}>{row.fn(p)}</div>})}</div>);
            })}
            <div style={{borderTop:`2px solid ${CL.line}`,padding:'16px 20px'}}>
              {comparisonAI?(<div><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><span style={{fontSize:13,color:'#3730A3'}}>✦</span><span style={{fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#3730A3'}}>AI Acquisition Comparison</span><button onClick={generateComparison} disabled={comparisonLoading} style={{marginLeft:'auto',fontSize:11,color:'#3730A3',background:'none',border:'1px solid rgba(55,48,163,0.22)',borderRadius:5,padding:'3px 9px',cursor:'pointer',fontFamily:"'Instrument Sans',sans-serif"}}>↻ Regenerate</button></div><div style={{fontSize:13,lineHeight:1.72,color:CL.ink2,whiteSpace:'pre-wrap'}}>{comparisonAI}</div></div>):(<button onClick={generateComparison} disabled={comparisonLoading||compareProps.length<2} style={{width:'100%',padding:'14px',borderRadius:8,border:'1px solid rgba(55,48,163,0.22)',background:'rgba(55,48,163,0.06)',color:'#3730A3',fontSize:13,fontWeight:600,cursor:compareProps.length<2?'default':'pointer',opacity:compareProps.length<2?0.4:1,fontFamily:"'Instrument Sans',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{comparisonLoading?'⟳ Analyzing…':'✦ Generate AI Comparison'}</button>)}
            </div>
          </div>
        )}
      </div>)}

      {/* BULK TAG MODAL — full taxonomy */}
      {showBulkTag&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowBulkTag(false)}><div style={{background:'#fff',borderRadius:14,boxShadow:CL.shadowMd,padding:28,width:520,maxWidth:'90vw',maxHeight:'80vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <h2 style={{fontSize:20,fontWeight:500,marginBottom:4}}>🏷 Bulk Tag — {selected.size} Properties</h2>
        <p style={{fontSize:13,color:CL.ink4,marginBottom:16}}>Add or remove a tag from all selected properties.</p>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <button onClick={()=>setBulkTagMode('add')} style={{...ghostBtn,...(bulkTagMode==='add'?{background:'#3730A3',color:'#fff',borderColor:'#3730A3'}:{})}}>+ Add Tag</button>
          <button onClick={()=>setBulkTagMode('remove')} style={{...ghostBtn,...(bulkTagMode==='remove'?{background:'#C41E1E',color:'#fff',borderColor:'#C41E1E'}:{})}}>− Remove Tag</button>
        </div>
        <input value={bulkTagInput} onChange={e=>setBulkTagInput(e.target.value)} placeholder="Type tag name or select below…" style={{width:'100%',padding:'10px 14px',borderRadius:8,border:`1px solid ${CL.line}`,fontFamily:"'Instrument Sans',sans-serif",fontSize:14,color:CL.ink2,background:CL.bg,outline:'none',marginBottom:12}}/>
        {/* Tab toggle */}
        <div style={{display:'flex',gap:0,marginBottom:10,borderBottom:`1px solid ${CL.line}`}}>
          <button onClick={()=>setBulkTagTab('catalyst')} style={{padding:'8px 16px',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',background:'none',color:bulkTagTab==='catalyst'?'#C41E1E':CL.ink4,borderBottom:bulkTagTab==='catalyst'?'2px solid #C41E1E':'2px solid transparent',fontFamily:"'Instrument Sans',sans-serif"}}>Catalyst Tags ({CATALYST_TAGS.length})</button>
          <button onClick={()=>setBulkTagTab('property')} style={{padding:'8px 16px',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',background:'none',color:bulkTagTab==='property'?'#6B5B95':CL.ink4,borderBottom:bulkTagTab==='property'?'2px solid #6B5B95':'2px solid transparent',fontFamily:"'Instrument Sans',sans-serif"}}>Property Tags ({PROPERTY_TAGS.length})</button>
        </div>
        <div style={{flex:1,overflowY:'auto',maxHeight:300}}>
          {bulkTagTab==='catalyst'?Object.entries(getCatalystTagsByCategory()).map(([cat,data])=>(<div key={cat}><div style={{fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:data.color,margin:'10px 0 6px',paddingBottom:4,borderBottom:`1px solid ${data.bdr}`}}>{data.label}</div><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{data.tags.map(tag=>{const s=getTagStyle(tag);return<span key={tag} onClick={()=>setBulkTagInput(tag)} style={{display:'inline-flex',padding:'3px 9px',borderRadius:5,fontSize:11,fontWeight:500,background:bulkTagInput===tag?s.color:s.bg,border:`1px solid ${s.bdr}`,color:bulkTagInput===tag?'#fff':s.color,cursor:'pointer',transition:'all .12s'}}>{tag}</span>})}</div></div>)):Object.entries(getPropertyTagsByCategory()).map(([cat,data])=>(<div key={cat}><div style={{fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:data.color,margin:'10px 0 6px',paddingBottom:4,borderBottom:`1px solid ${data.bdr}`}}>{data.label}</div><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{data.tags.map(tag=>{const s=getTagStyle(tag);return<span key={tag} onClick={()=>setBulkTagInput(tag)} style={{display:'inline-flex',padding:'3px 9px',borderRadius:5,fontSize:11,fontWeight:500,background:bulkTagInput===tag?s.color:s.bg,border:`1px solid ${s.bdr}`,color:bulkTagInput===tag?'#fff':s.color,cursor:'pointer',transition:'all .12s'}}>{tag}</span>})}</div></div>))}
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16,paddingTop:12,borderTop:`1px solid ${CL.line}`}}>
          <button onClick={()=>setShowBulkTag(false)} style={ghostBtn}>Cancel</button>
          <button onClick={handleBulkTag} disabled={bulkProcessing||!bulkTagInput.trim()} style={{...primaryBtn,opacity:bulkProcessing||!bulkTagInput.trim()?0.5:1}}>{bulkProcessing?'⟳ Processing…':`${bulkTagMode==='add'?'Add':'Remove'} "${bulkTagInput}" → ${selected.size} properties`}</button>
        </div>
      </div></div>)}

      {/* CAMPAIGN PICKER */}
      {showCampaignPicker&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowCampaignPicker(false)}><div style={{background:'#fff',borderRadius:14,boxShadow:CL.shadowMd,padding:28,width:480,maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
        <h2 style={{fontSize:20,fontWeight:500,marginBottom:4}}>📬 Add to Campaign</h2>
        <p style={{fontSize:13,color:CL.ink4,marginBottom:20}}>Select a campaign for {selected.size} properties.</p>
        {campaigns.length===0?<div style={{padding:24,textAlign:'center',color:CL.ink4}}>No campaigns found.</div>:(<div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:300,overflowY:'auto'}}>{campaigns.map(c=>(<div key={c.id} onClick={()=>handleAddToCampaign(c.id)} style={{padding:'14px 18px',borderRadius:10,border:`1px solid ${CL.line2}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',background:CL.card}} onMouseEnter={e=>e.currentTarget.style.background=CL.bg} onMouseLeave={e=>e.currentTarget.style.background=CL.card}><div><div style={{fontSize:14,fontWeight:500,color:CL.ink2}}>{c.name}</div><div style={{fontSize:12,color:CL.ink4,marginTop:2}}>{c.market||'—'} · {c.status||'Active'}</div></div><span style={{fontSize:12,color:'#3730A3'}}>Add →</span></div>))}</div>)}
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}><button onClick={()=>setShowCampaignPicker(false)} style={ghostBtn}>Cancel</button></div>
      </div></div>)}

      {/* ADD PROPERTY */}
      {showAddModal&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowAddModal(false)}><div style={{background:'#fff',borderRadius:14,boxShadow:CL.shadowMd,padding:28,width:500,maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
        <h2 style={{fontSize:22,fontWeight:500,marginBottom:20}}>Add Property</h2>
        {['property_name','address','city','zip'].map(field=>(<div key={field} style={{marginBottom:14}}><label style={{fontSize:13,fontWeight:600,color:CL.ink3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6,display:'block'}}>{field.replace('_',' ')}</label><input value={newProp[field]||''} onChange={e=>setNewProp(prev=>({...prev,[field]:e.target.value}))} style={{width:'100%',padding:'10px 14px',borderRadius:8,border:`1px solid ${CL.line}`,fontFamily:"'Instrument Sans',sans-serif",fontSize:15,color:CL.ink2,background:CL.bg,outline:'none'}}/></div>))}
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}><button onClick={()=>setShowAddModal(false)} style={ghostBtn}>Cancel</button><button onClick={handleAdd} style={primaryBtn}>Add Property</button></div>
      </div></div>)}

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.1}}
        @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes catalystPulse{0%,100%{opacity:1}50%{opacity:0.6}}
        .catalyst-pulse{animation:catalystPulse 1.8s ease-in-out infinite;}
      `}</style>
    </>
  );
}

// SUB-COMPONENTS
function KPI({icon,value,label,delta,color}){return(<div style={{background:CL.card,borderRadius:12,boxShadow:CL.shadow,border:`1px solid ${CL.line2}`,padding:'18px 22px',display:'flex',alignItems:'center',gap:16}}><div style={{width:44,height:44,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,background:`${color}12`,color}}>{icon}</div><div><div style={{display:'flex',alignItems:'baseline',gap:6}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:CL.ink,lineHeight:1,letterSpacing:'-0.02em'}}>{value}</span>{delta&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:600,padding:'1px 5px',borderRadius:3,color,background:`${color}14`}}>{delta} <span style={{opacity:.6,fontWeight:400}}>7d</span></span>}</div><div style={{fontSize:13,color:CL.ink3,marginTop:4}}>{label}</div></div></div>)}
function Chip({label,count,active,onClick}){return(<button onClick={onClick} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:22,fontFamily:"'Instrument Sans',sans-serif",fontSize:13,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap',border:`1px solid ${active?'rgba(55,48,163,0.28)':CL.line}`,background:active?'rgba(55,48,163,0.08)':CL.card,color:active?'#3730A3':CL.ink3}}>{label}{count!=null&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:11,marginLeft:2}}>{count}</span>}</button>)}
function Sep(){return<div style={{width:1,height:24,background:CL.line,margin:'0 4px'}}/>}
function AISparkle({text}){const[show,setShow]=useState(false);const preview=text.length>300?text.slice(0,300)+'…':text;return(<span onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onClick={e=>e.stopPropagation()} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,borderRadius:'50%',background:'rgba(55,48,163,0.08)',color:'#3730A3',fontSize:9,cursor:'pointer',flexShrink:0,position:'relative'}}>✦{show&&(<div style={{position:'absolute',bottom:'calc(100% + 8px)',right:0,width:320,background:'#1A2130',color:'rgba(245,240,232,0.9)',padding:'12px 14px',borderRadius:8,fontSize:12,lineHeight:1.6,pointerEvents:'none',zIndex:60,boxShadow:'0 4px 16px rgba(0,0,0,0.3)'}}>{preview}<div style={{marginTop:6,fontSize:10,color:'rgba(137,168,198,0.5)',fontStyle:'italic'}}>Click property for full synthesis →</div><div style={{position:'absolute',top:'100%',right:16,width:0,height:0,borderLeft:'5px solid transparent',borderRight:'5px solid transparent',borderTop:'5px solid #1A2130'}}/></div>)}</span>)}
function BulkBtn({children,green,onClick}){return(<button onClick={onClick} style={{padding:'7px 14px',borderRadius:7,fontSize:12,fontWeight:500,cursor:'pointer',border:`1px solid ${green?'rgba(14,124,107,0.35)':'rgba(255,255,255,0.15)'}`,background:green?'rgba(14,124,107,0.30)':'rgba(255,255,255,0.08)',color:green?'#B8F0D0':'rgba(245,240,232,0.9)',fontFamily:"'Instrument Sans',sans-serif",whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:5}}>{children}</button>)}
function FilterField({label,children}){return(<div><label style={{display:'block',fontSize:11,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:CL.ink4,marginBottom:6}}>{label}</label>{children}</div>)}
const fpInput={padding:'7px 10px',border:`1px solid ${CL.line}`,borderRadius:6,fontFamily:"'DM Mono',monospace",fontSize:12,width:'100%',color:CL.ink2,background:CL.bg,outline:'none'};
const fpSelect={padding:'7px 10px',border:`1px solid ${CL.line}`,borderRadius:6,fontFamily:"'Instrument Sans',sans-serif",fontSize:12,width:'100%',color:CL.ink2,background:CL.bg,outline:'none',cursor:'pointer'};
const CL_bg='#F4F1EC';
