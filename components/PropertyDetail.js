'use client';
import { useState, useEffect, useMemo } from 'react';
import { fmt, CATALYST_URGENCY, CATALYST_TAGS, CADENCE_OPTIONS, STAGE_COLORS, LEAD_STAGE_COLORS, AI_MODEL_OPUS, AI_MODEL_SONNET } from '../lib/constants';
import { updateRow, insertRow, addApn, removeApn, addBuilding, removeBuilding, calculateProbability, setCadence, autoResearch } from '../lib/db';
import EditPropertyModal from './EditPropertyModal';
import BuyerMatching from './BuyerMatching';
import FilesLinks from './FilesLinks';
import AerialThumbnail from './AerialThumbnail';
import BuildingSpecs from './BuildingSpecs';
import CampaignTab from './CampaignTab';

const NOTE_TYPES = ['Note','Intel','Call Log','Meeting Note','Status Update'];
const LOG_TYPES = ['Call','Email','Meeting'];

export default function PropertyDetail({
  property: p, deals, leads, contacts, leaseComps, saleComps, activities, tasks, accounts,
  notes: allNotes, followUps: allFollowUps,
  onLeaseCompClick, onSaleCompClick, onDealClick, onLeadClick, onContactClick, onAccountClick, onCatalystClick, onCampaignClick,
  onAddActivity, onAddTask, showToast, onRefresh
}) {
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('Note');
  const [savingNote, setSavingNote] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState('Call');
  const [logSubject, setLogSubject] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logContactId, setLogContactId] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [showFuForm, setShowFuForm] = useState(false);
  const [fuReason, setFuReason] = useState('');
  const [fuDate, setFuDate] = useState('');
  const [savingFu, setSavingFu] = useState(false);
  const [showApnForm, setShowApnForm] = useState(false);
  const [newApn, setNewApn] = useState('');
  const [newApnAcres, setNewApnAcres] = useState('');
  const [savingApn, setSavingApn] = useState(false);
  const [showBldgForm, setShowBldgForm] = useState(false);
  const [bldgForm, setBldgForm] = useState({ building_name: '', building_sf: '', clear_height: '', dock_doors: '', grade_doors: '', year_built: '', office_pct: '', prop_type: '' });
  const [savingBldg, setSavingBldg] = useState(false);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filterText, setFilterText] = useState('');
  const [synth, setSynth] = useState(null);
  const [synthLoading, setSynthLoading] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [autoTagLoading, setAutoTagLoading] = useState(false);
  const [researching, setResearching] = useState(false);

  const [exporting, setExporting] = useState(false);

  const handleExportMemo = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: p,
          leaseComps: displayLC,
          saleComps: displaySC,
          deals: linkedDeals,
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(p.address || 'Property').replace(/[^a-zA-Z0-9]/g, '_')}_Memo.docx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast?.('Memo exported');
    } catch (e) {
      console.error(e);
      showToast?.('Export error — check console');
    } finally { setExporting(false); }
  };

  const linkedLeads = (leads||[]).filter(l => l.property_id===p.id||l.address===p.address);
  const linkedDeals = (deals||[]).filter(d => d.property_id===p.id||d.address===p.address);
  const linkedContacts = (contacts||[]).filter(c => c.property_id===p.id||c.company===p.owner||c.company===p.tenant);
  const displayLC = (leaseComps||[]).filter(c => c.property_id===p.id||c.address===p.address);
  const displaySC = (saleComps||[]).filter(c => c.property_id===p.id||c.address===p.address);
  const linkedActs = (activities||[]).filter(a => a.property_id===p.id);
  const linkedTasks = (tasks||[]).filter(t => t.property_id===p.id);
  const linkedNotes = (allNotes||[]).filter(n => n.property_id===p.id);
  const linkedFU = (allFollowUps||[]).filter(f => f.property_id===p.id);
  const avgLR = displayLC.length ? (displayLC.reduce((s,c)=>s+(c.rate||0),0)/displayLC.length).toFixed(2) : null;
  const heroSrc = p.aerial_url || p.hero_image || null;
  const avgSP = displaySC.filter(c=>c.price_psf).length ? Math.round(displaySC.filter(c=>c.price_psf).reduce((s,c)=>s+c.price_psf,0)/displaySC.filter(c=>c.price_psf).length) : null;
  const pendingTasks = linkedTasks.filter(t=>!t.completed).length;

  const timeline = [
    ...linkedActs.map(a=>({kind:'activity',id:a.id,date:a.activity_date||a.created_at,icon:a.activity_type==='Call'?'📞':a.activity_type==='Email'?'✉️':'🤝',label:a.activity_type,subject:a.subject,detail:a.notes,outcome:a.outcome})),
    ...linkedNotes.map(n=>({kind:'note',id:n.id,date:n.created_at,icon:'📝',label:n.note_type||'Note',subject:null,detail:n.content,pinned:n.pinned})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date));

  const toggleSort = k => { if(sortKey===k) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortKey(k); setSortDir('asc'); }};
  const sortInd = k => sortKey===k?(sortDir==='asc'?' ↑':' ↓'):'';
  const sortFilter = (rows,fields) => {
    let r=rows;
    if(filterText.trim()){const q=filterText.toLowerCase();r=r.filter(row=>fields.some(f=>{const v=row[f];return v&&String(v).toLowerCase().includes(q);}));}
    if(sortKey){r=[...r].sort((a,b)=>{let va=a[sortKey],vb=b[sortKey];if(va==null)return 1;if(vb==null)return -1;if(typeof va==='number'&&typeof vb==='number')return sortDir==='asc'?va-vb:vb-va;va=String(va).toLowerCase();vb=String(vb).toLowerCase();return sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va);});}
    return r;
  };
  const changeTab = t => { setActiveTab(t); setSortKey(null); setSortDir('asc'); setFilterText(''); };

  const urgBadge = tag => {const l=CATALYST_URGENCY?.[tag];if(l==='immediate')return'tag-red';if(l==='high')return'tag-amber';if(l==='medium')return'tag-blue';return'tag-ghost';};
  const probColor = v => v>=75?'var(--green)':v>=50?'var(--amber)':'var(--ink3)';
  const fmtAgo = d => {if(!d)return'';const dt=new Date(d);const time=dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});const x=Math.floor((Date.now()-dt)/86400000);if(x===0)return'Today '+time;if(x===1)return'Yesterday '+time;if(x<7)return x+'d ago '+time;return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' '+time;};
  const closeAll = () => {setShowNoteForm(false);setShowLogForm(false);setShowFuForm(false);};

  const handleAddNote = async()=>{if(!noteText.trim())return;setSavingNote(true);try{await insertRow('notes',{content:noteText.trim(),note_type:noteType,property_id:p.id});setNoteText('');setShowNoteForm(false);onRefresh?.();showToast?.('Note added');}catch(e){console.error(e);}finally{setSavingNote(false);}};
  const handleLogAct = async()=>{if(!logSubject.trim())return;setSavingLog(true);try{await insertRow('activities',{activity_type:logType,subject:logSubject.trim(),notes:logNotes||null,activity_date:new Date().toISOString().split('T')[0],property_id:p.id,contact_id:logContactId||null});setLogSubject('');setLogNotes('');setLogContactId('');setShowLogForm(false);onRefresh?.();showToast?.(`${logType} logged`);}catch(e){console.error(e);}finally{setSavingLog(false);}};
  const handleAddFu = async()=>{if(!fuReason.trim()||!fuDate)return;setSavingFu(true);try{await insertRow('follow_ups',{reason:fuReason.trim(),due_date:fuDate,property_id:p.id});setFuReason('');setFuDate('');setShowFuForm(false);onRefresh?.();showToast?.('Follow-up set');}catch(e){console.error(e);}finally{setSavingFu(false);}};
  const handleCompleteFu = async fu=>{try{await updateRow('follow_ups',fu.id,{completed:true,completed_at:new Date().toISOString()});onRefresh?.();}catch(e){console.error(e);}};
  const handleAddApn = async()=>{if(!newApn.trim())return;setSavingApn(true);try{await addApn(p.id,newApn.trim(),newApnAcres?parseFloat(newApnAcres):null);setNewApn('');setNewApnAcres('');setShowApnForm(false);onRefresh?.();showToast?.('APN added');}catch(e){console.error(e);}finally{setSavingApn(false);}};
  const handleRemoveApn = async a=>{if(!confirm(`Remove APN ${a.apn}?`))return;try{await removeApn(a.id);onRefresh?.();showToast?.('Removed');}catch(e){console.error(e);}};
  const handleAddBldg = async()=>{if(!bldgForm.building_sf)return;setSavingBldg(true);try{await addBuilding(p.id,{building_name:bldgForm.building_name||`Building ${(p.buildings||[]).length+1}`,building_sf:parseInt(bldgForm.building_sf)||null,clear_height:parseInt(bldgForm.clear_height)||null,dock_doors:parseInt(bldgForm.dock_doors)||0,grade_doors:parseInt(bldgForm.grade_doors)||0,year_built:parseInt(bldgForm.year_built)||null,office_pct:parseInt(bldgForm.office_pct)||null,prop_type:bldgForm.prop_type||null});setBldgForm({building_name:'',building_sf:'',clear_height:'',dock_doors:'',grade_doors:'',year_built:'',office_pct:'',prop_type:''});setShowBldgForm(false);onRefresh?.();showToast?.('Building added');}catch(e){console.error(e);}finally{setSavingBldg(false);}};
  const handleRemoveBldg = async b=>{if(!confirm(`Remove ${b.building_name||'this building'}?`))return;try{await removeBuilding(b.id);onRefresh?.();showToast?.('Building removed');}catch(e){console.error(e);}};

  // Load synthesis from record on mount
  useEffect(() => { if (p.ai_synthesis && !synth) setSynth(p.ai_synthesis); }, [p.ai_synthesis]);

  const handleSynthesize = async()=>{setSynthLoading(true);setSynth(null);const parts=[];if(p.notes)parts.push(`[Original Intel] ${p.notes}`);(allNotes||[]).filter(n=>n.property_id===p.id&&n.note_type!=='AI Synthesis').forEach(n=>parts.push(`[${n.note_type||'Note'} ${fmtAgo(n.created_at)}] ${n.content}`));linkedActs.forEach(a=>parts.push(`[${a.activity_type} ${fmtAgo(a.activity_date)}] ${a.subject}${a.notes?': '+a.notes:''}${a.outcome?' → '+a.outcome:''}`));const allText=parts.join('\n');if(!allText.trim()){setSynth('No notes or activities to synthesize yet.');setSynthLoading(false);return;}try{const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:AI_MODEL_OPUS,max_tokens:600,system:'You are a CRE brokerage intelligence assistant. Synthesize all notes, intel, and activities into a concise property status summary. Include: current situation, key contacts/owners, outstanding issues, and recommended next steps. Be specific and actionable.',messages:[{role:'user',content:`Property: ${p.address}, ${p.city||p.submarket}\nOwner: ${p.owner||'Unknown'}\nTenant: ${p.tenant||'Vacant'}\nSF: ${p.building_sf?.toLocaleString()||'N/A'}\n\nAll Intel & Timeline:\n${allText}\n\nSynthesize into a brief status report with next steps.`}]})});const data=await res.json();const text=data.content?.[0]?.text||'Could not generate synthesis.';setSynth(text);await updateRow('properties',p.id,{ai_synthesis:text,ai_synthesis_at:new Date().toISOString()});onRefresh?.();}catch{setSynth('Error connecting to AI.');}finally{setSynthLoading(false);}};

  // Catalyst tag management
  const addTag = async(tag)=>{const current=p.catalyst_tags||[];if(current.includes(tag))return;const updated=[...current,tag];try{const scores=calculateProbability({...p,catalyst_tags:updated});await updateRow('properties',p.id,{catalyst_tags:updated,ai_score:scores.rawScore,probability:scores.probability});onRefresh?.();showToast?.(`Added: ${tag} (score: ${scores.probability}%)`);}catch(e){console.error(e);}};
  const removeTag = async(tag)=>{const updated=(p.catalyst_tags||[]).filter(t=>t!==tag);try{const scores=calculateProbability({...p,catalyst_tags:updated});await updateRow('properties',p.id,{catalyst_tags:updated,ai_score:scores.rawScore,probability:scores.probability});onRefresh?.();showToast?.(`Removed: ${tag}`);}catch(e){console.error(e);}};
  const handleAutoTag = async()=>{setAutoTagLoading(true);try{const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:AI_MODEL_SONNET,max_tokens:200,system:`You are a CRE catalyst tag analyst. Given property data and notes, suggest relevant catalyst tags from this exact list: ${CATALYST_TAGS.join(', ')}. Return ONLY a JSON array of tag strings, no explanation.`,messages:[{role:'user',content:`Property: ${p.address}\nOwner: ${p.owner||'Unknown'} (${p.owner_type||'Unknown'})\nTenant: ${p.tenant||'Vacant'}\nVacancy: ${p.vacancy_status||'Unknown'}\nLease Exp: ${p.lease_expiration||'N/A'}\nRent: ${p.in_place_rent||'N/A'}\nSF: ${p.building_sf||'N/A'}\nYear Built: ${p.year_built||'N/A'}\nClear: ${p.clear_height||'N/A'}\nNotes: ${(p.notes||'').slice(0,500)}\n\nExisting tags: ${(p.catalyst_tags||[]).join(', ')||'None'}\n\nSuggest additional catalyst tags. Return JSON array only.`}]})});const data=await res.json();const text=data.content?.[0]?.text||'[]';const clean=text.replace(/```json|```/g,'').trim();const suggested=JSON.parse(clean);const newTags=suggested.filter(t=>CATALYST_TAGS.includes(t)&&!(p.catalyst_tags||[]).includes(t));if(newTags.length===0){showToast?.('No new tags suggested');}else{const updated=[...(p.catalyst_tags||[]),...newTags];const scores=calculateProbability({...p,catalyst_tags:updated});await updateRow('properties',p.id,{catalyst_tags:updated,ai_score:scores.rawScore,probability:scores.probability});onRefresh?.();showToast?.(`Added ${newTags.length} tags (score: ${scores.probability}%)`);}}catch(e){console.error(e);showToast?.('Error auto-suggesting tags');}finally{setAutoTagLoading(false);}};

  const handleAutoResearch = async () => {
    setResearching(true); showToast?.('✦ Researching... this may take 15-30 seconds');
    try {
      const result = await autoResearch('property', p);
      if (!result) { showToast?.('No results found'); setResearching(false); return; }
      const updates = {};
      if (result.building_sf && !p.building_sf) updates.building_sf = result.building_sf;
      if (result.year_built && !p.year_built) updates.year_built = result.year_built;
      if (result.clear_height && !p.clear_height) updates.clear_height = result.clear_height;
      if (result.dock_doors && !p.dock_doors) updates.dock_doors = result.dock_doors;
      if (result.land_acres && !p.land_acres) updates.land_acres = result.land_acres;
      if (result.prop_type && !p.prop_type) updates.prop_type = result.prop_type;
      if (result.owner && !p.owner) updates.owner = result.owner;
      if (result.owner_type && !p.owner_type) updates.owner_type = result.owner_type;
      if (result.tenant && !p.tenant) updates.tenant = result.tenant;
      if (result.vacancy_status && !p.vacancy_status) updates.vacancy_status = result.vacancy_status;
      if (result.zoning && !p.zoning) updates.zoning = result.zoning;
      // Auto-calculate Land SF from acres
      if ((updates.land_acres || p.land_acres) && !p.land_sf) {
        updates.land_sf = Math.round((updates.land_acres || p.land_acres) * 43560);
      }
      // Auto-lookup zoning via APN if still missing
      if (!p.zoning && !updates.zoning && (p.apns?.length > 0 || p.apn)) {
        try {
          const apn = p.apns?.[0]?.apn || p.apn;
          const zoningRes = await fetch('/api/ai', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: AI_MODEL_SONNET, max_tokens: 100,
              tools: [{ type: 'web_search_20250305', name: 'web_search' }],
              system: 'You are a zoning research assistant. Look up the zoning designation for this parcel. Return ONLY the zoning code (e.g., "M-2", "I-1", "M-1"). If not found, return "Unknown".',
              messages: [{ role: 'user', content: `What is the zoning for APN ${apn} in ${p.city || p.submarket || ''}, California? Search the county assessor or city zoning map.` }],
            }),
          });
          const zoningData = await zoningRes.json();
          const zoningText = (zoningData.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
          if (zoningText && zoningText !== 'Unknown' && zoningText.length < 20) updates.zoning = zoningText;
        } catch (ze) { console.error('Zoning lookup error:', ze); }
      }
      const summary = [result.news_summary, result.ma_activity, result.bankruptcy_info].filter(Boolean).join('\n\n');
      if (summary) await insertRow('notes', { content: `✦ Auto-Research:\n${summary}${result.sources?.length ? '\n\nSources: ' + result.sources.join(', ') : ''}`, note_type: 'Research', property_id: p.id });
      if (result.suggested_catalyst_tags?.length) { const current = p.catalyst_tags || []; const newTags = result.suggested_catalyst_tags.filter(t => !current.includes(t)); if (newTags.length) updates.catalyst_tags = [...current, ...newTags]; }
      if (Object.keys(updates).length > 0) { await updateRow('properties', p.id, updates); showToast?.(`Auto-filled ${Object.keys(updates).length} fields`); }
      else showToast?.('Research complete — no new data to fill');
      onRefresh?.();
    } catch (e) { console.error(e); showToast?.('Research error'); }
    finally { setResearching(false); }
  };

  const Field = ({label,value,mono,accent}) => value?(<div><div style={{fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-muted)',marginBottom:'2px'}}>{label}</div><div style={{fontSize:'14px',color:accent?'var(--accent)':'var(--text-primary)',fontFamily:mono?'var(--font-mono)':'inherit',fontWeight:accent?600:400}}>{value}</div></div>):null;
  const SH = ({title,count,onAdd,addLabel}) => (<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}><div style={{display:'flex',alignItems:'center',gap:'8px'}}><h3 style={{fontSize:'14px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.04em'}}>{title}</h3>{count!=null&&<span style={{fontSize:'12px',fontFamily:'var(--font-mono)',color:'var(--text-muted)',background:'var(--bg-input)',padding:'1px 6px',borderRadius:'10px'}}>{count}</span>}</div>{onAdd&&<button className="btn btn-ghost btn-sm" style={{fontSize:'12px'}} onClick={onAdd}>{addLabel||'+ Add'}</button>}</div>);
  const Th = ({field,children,align}) => (<th onClick={()=>toggleSort(field)} style={{padding:'6px 10px',textAlign:align||'left',fontSize:'12px',fontWeight:600,color:sortKey===field?'var(--accent)':'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.04em',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>{children}{sortInd(field)}</th>);
  const FB = ({ph}) => (<div style={{marginBottom:'12px'}}><input className="input" value={filterText} onChange={e=>setFilterText(e.target.value)} placeholder={ph||'Filter...'} style={{fontSize:'13px',maxWidth:'300px'}} /></div>);

  const tabs = [
    {id:'overview',label:'Overview'},
    {id:'leads',label:`Leads${linkedLeads.length?` (${linkedLeads.length})`:''}`},
    {id:'deals',label:`Deals${linkedDeals.length?` (${linkedDeals.length})`:''}`},
    {id:'contacts',label:`Contacts${linkedContacts.length?` (${linkedContacts.length})`:''}`},
    {id:'comps',label:`Comps${displayLC.length+displaySC.length?` (${displayLC.length+displaySC.length})`:''}`},
    {id:'campaigns',label:'Campaigns'},
    {id:'buyers',label:'Buyer Matches'},
    {id:'files',label:`Files${(p.file_links||[]).length?` (${(p.file_links||[]).length})`:''}`},
    {id:'tasks',label:`Tasks${pendingTasks?` (${pendingTasks})`:''}`},
  ];


  const leaseMonths = p.lease_expiration ? Math.max(0, Math.round((new Date(p.lease_expiration) - new Date()) / (30.44*86400000))) : null;

  // Warehouse SVG hero illustration
  const WarehouseSvg = () => (
    <svg width="100%" height="100%" viewBox="0 0 1200 280" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0E1824"/><stop offset="100%" stopColor="#1C2E40"/></linearGradient>
        <linearGradient id="glow" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor="#3A5A7A" stopOpacity="0.15"/><stop offset="100%" stopColor="#0E1824" stopOpacity="0"/></linearGradient>
      </defs>
      <rect width="1200" height="280" fill="url(#sky)"/>
      <rect x="0" y="0" width="1200" height="80" fill="url(#glow)"/>
      {/* Clerestory windows row — top */}
      {[0,130,260,390,520,650,780,910,1040].map((x,i) => (
        <g key={`c${i}`}>
          <rect x={x+8} y={40} width={114} height={55} rx={2} fill="#1E3248" stroke="#2A4560" strokeWidth={0.5}/>
          <rect x={x+14} y={44} width={30} height={47} rx={1} fill="#2C4A68" opacity={0.7 - i*0.04}/>
          <rect x={x+50} y={44} width={30} height={47} rx={1} fill="#2C4A68" opacity={0.6 - i*0.03}/>
          <rect x={x+86} y={44} width={30} height={47} rx={1} fill="#2C4A68" opacity={0.5 - i*0.02}/>
        </g>
      ))}
      {/* Divider line */}
      <line x1="0" y1="95" x2="1200" y2="95" stroke="#0E1520" strokeWidth={1.5}/>
      {/* Building mass — bottom */}
      <rect x="0" y="95" width="1200" height="185" fill="#141C28"/>
      {/* Dock doors */}
      {[40,160,280,400,520,700,820,940,1060].map((x,i) => (
        <g key={`d${i}`}>
          <rect x={x} y={120} width={90} height={100} rx={2} fill="#1A2535" stroke="#1E2E42" strokeWidth={0.5}/>
          <rect x={x+10} y={126} width={70} height={14} rx={1} fill="#22334A" opacity={0.5}/>
          <rect x={x+10} y={146} width={70} height={68} rx={1} fill="#1E2A3C" opacity={0.4}/>
        </g>
      ))}
      {/* Ground line */}
      <rect x="0" y="228" width="1200" height="52" fill="#101820"/>
      {/* Truck bays */}
      {[80,280,480,750,950].map((x,i) => (
        <rect key={`t${i}`} x={x} y={232} width={120} height={28} rx={3} fill="#182430" stroke="#1E2E42" strokeWidth={0.5}/>
      ))}
    </svg>
  );

  return (
    <div>
      {editing && <EditPropertyModal property={p} onClose={()=>setEditing(false)} onRefresh={onRefresh} showToast={showToast} />}

      {/* ═══ HERO ═══ */}
      <div className="prop-hero" style={{ position: 'relative', background: '#1C2E40', minHeight: '220px', overflow: 'hidden' }}>
        {heroSrc ? (
          <img src={heroSrc} alt="" style={{ width: '100%', height: '260px', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
        ) : (
          <div style={{ height: '220px', background: 'linear-gradient(135deg, #0E1824 0%, #1C2E40 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
        <div className="hero-address" style={{ position: 'absolute', bottom: '24px', left: '36px', right: '36px' }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '34px', fontWeight: 700, color: '#fff', marginBottom: '10px', letterSpacing: '-0.01em', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{p.address}</h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)' }}>{[p.city, p.zip].filter(Boolean).join(' · ')}</span>
            {p.vacancy_status && <span style={{ padding: '4px 12px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, background: p.vacancy_status === 'Occupied' ? 'rgba(26,122,72,0.3)' : 'rgba(192,60,24,0.3)', border: `1px solid ${p.vacancy_status === 'Occupied' ? 'rgba(26,122,72,0.5)' : 'rgba(192,60,24,0.5)'}`, color: p.vacancy_status === 'Occupied' ? '#6EE0A4' : '#F0906A' }}>{p.vacancy_status}</span>}
            {(p.catalyst_tags||[]).slice(0,3).map(tag => (
              <span key={tag} style={{ padding: '4px 12px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, background: 'rgba(184,122,16,0.3)', border: '1px solid rgba(184,122,16,0.5)', color: '#F0C060', cursor: 'pointer' }} onClick={() => onCatalystClick?.(tag)}>{tag}</span>
            ))}
            {(p.catalyst_tags||[]).length > 3 && <span style={{ padding: '4px 12px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>+{p.catalyst_tags.length - 3}</span>}
          </div>
        </div>
      </div>

      {/* ═══ ACTION BAR ═══ */}
      <div className="action-bar" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 36px', background: 'var(--card)', borderBottom: '1px solid var(--line)' }}>
        {p.ai_score != null && (
          <div className="score-pill" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', borderRadius: '10px' }}>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '14px', fontStyle: 'italic', color: 'var(--ink3)' }}>AI Score</span>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '28px', fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{p.ai_score}</span>
            <div style={{ width: '80px', height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(p.ai_score, 100)}%`, background: 'var(--blue2)', borderRadius: '2px' }} /></div>
          </div>
        )}
        {p.probability != null && (
          <div className="score-pill" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', background: 'var(--green-bg)', border: '1px solid var(--green-bdr)', borderRadius: '10px' }}>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '14px', fontStyle: 'italic', color: 'var(--ink3)' }}>Close Prob.</span>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '28px', fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>{p.probability}%</span>
            <div style={{ width: '80px', height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${p.probability}%`, background: 'var(--green)', borderRadius: '2px' }} /></div>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {onAddActivity && <button className="btn" onClick={() => onAddActivity(p.id)}>+ Activity</button>}
          {onAddTask && <button className="btn" onClick={() => onAddTask(p.id)}>+ Task</button>}
          <button className="btn" onClick={handleExportMemo} disabled={exporting}>
            {exporting ? '↻ Exporting...' : '↓ Export Memo'}
          </button>
          <button className="btn btn-blue" onClick={() => setEditing(true)}>Edit Property</button>
        </div>
      </div>

      {/* ═══ SUB NAV ═══ */}
      <div className="sub-nav">
        {tabs.map(tab => (
          <div key={tab.id} className={`sub-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => changeTab(tab.id)}>{tab.label}</div>
        ))}
      </div>

      {/* ═══ PAGE GRID ═══ */}
      {activeTab === 'overview' ? (
        <div className="page-grid">
          <div>
            {/* Stats Row */}
            <div className="stats-row">
              {[
                ['Total SF', (p.total_sf||p.building_sf) ? Number(p.total_sf||p.building_sf).toLocaleString() : '—'],
                ['Acres', p.land_acres || p.total_acres || '—'],
                ['Clear Height', (p.clear_height||p.max_clear_height) ? `${p.clear_height||p.max_clear_height}'` : '—'],
                ['Dock Doors', p.dock_doors ?? p.total_dock_doors ?? '—'],
                ['Buildings', p.building_count || (p.buildings||[]).length || '1'],
                ['Year Built', p.year_built || '—'],
              ].map(([label, val]) => (
                <div key={label} className="stat-cell">
                  <div className="stat-label">{label}</div>
                  <div className="stat-val">{val}</div>
                </div>
              ))}
            </div>

            {/* Building Specs + Score */}
            <BuildingSpecs record={p} recordType="properties" onRefresh={onRefresh} showToast={showToast} />

            {/* Timeline */}
            <div className="timeline-card">
              <div className="tl-head">
                <span className="tl-title">Timeline</span>
                <div className="tl-btns" style={{ display: 'flex', gap: '6px' }}>
                  <button className="tl-btn accent" onClick={handleSynthesize} disabled={synthLoading}>{synthLoading ? '✦ Synthesizing...' : '✦ Synthesize'}</button>
                  <button className="tl-btn" onClick={() => { closeAll(); setShowLogForm(!showLogForm); }}>{showLogForm ? 'Cancel' : '+ Log Call'}</button>
                  <button className="tl-btn" onClick={() => { closeAll(); setShowNoteForm(!showNoteForm); }}>{showNoteForm ? 'Cancel' : '+ Note'}</button>
                  <button className="tl-btn" onClick={() => { closeAll(); setShowFuForm(!showFuForm); }}>{showFuForm ? 'Cancel' : '+ Follow-Up'}</button>
                </div>
              </div>

              {/* Note form */}
              {showNoteForm && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                  <select className="select" value={noteType} onChange={e => setNoteType(e.target.value)} style={{ marginBottom: '8px', maxWidth: '180px' }}>
                    {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <textarea className="textarea" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add note..." rows={3} />
                  <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={handleAddNote} disabled={savingNote}>{savingNote ? 'Saving...' : 'Save Note'}</button>
                </div>
              )}

              {/* Log form */}
              {showLogForm && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    {LOG_TYPES.map(t => <button key={t} className={`btn btn-sm ${logType === t ? 'btn-blue' : ''}`} onClick={() => setLogType(t)}>{t}</button>)}
                  </div>
                  <input className="input" value={logSubject} onChange={e => setLogSubject(e.target.value)} placeholder="Subject..." style={{ marginBottom: '8px' }} />
                  <textarea className="textarea" value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Notes (optional)..." rows={2} />
                  <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={handleLogAct} disabled={savingLog}>{savingLog ? 'Saving...' : 'Log Activity'}</button>
                </div>
              )}

              {/* Follow-up form */}
              {showFuForm && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                  <input className="input" value={fuReason} onChange={e => setFuReason(e.target.value)} placeholder="Follow-up reason..." style={{ marginBottom: '8px' }} />
                  <input className="input" type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} style={{ marginBottom: '8px', maxWidth: '200px' }} />
                  <button className="btn btn-primary" onClick={handleAddFu} disabled={savingFu}>{savingFu ? 'Saving...' : 'Set Follow-Up'}</button>
                </div>
              )}

              {/* AI Synthesis */}
              {synth && (
                <div style={{ padding: '16px 20px', background: 'var(--purple-bg)', borderBottom: '1px solid rgba(96,64,168,0.2)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--purple)', textTransform: 'uppercase', marginBottom: '6px' }}>✦ AI Synthesis</div>
                  <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>{synth}</div>
                </div>
              )}

              {/* Follow-ups */}
              {linkedFU.filter(f => !f.completed).map(fu => {
                const od = new Date(fu.due_date) < new Date(new Date().toDateString());
                return (
                  <div key={fu.id} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--line2)' }}>
                    <span>{od ? '⚠' : '🔔'}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: od ? 'var(--rust)' : 'var(--amber)' }}>{fu.reason}</span>
                      <span style={{ fontSize: '12px', color: 'var(--ink4)', marginLeft: '8px', fontFamily: "'DM Mono',monospace" }}>{od ? 'OVERDUE · ' : ''}{fu.due_date}</span>
                    </div>
                    <button className="btn btn-sm" onClick={() => handleCompleteFu(fu)}>✓</button>
                  </div>
                );
              })}

              {/* Timeline entries */}
              {timeline.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink4)', fontSize: '13px' }}>No activity yet</div>
              ) : timeline.slice(0, 20).map(e => {
                const renderDetail = (text) => {
                  if (!text) return null;
                  // Split on URLs, make them clickable
                  const parts = text.split(/(https?:\/\/[^\s,]+)/g);
                  return parts.map((part, i) => {
                    if (/^https?:\/\//.test(part)) {
                      const display = part.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none', borderBottom: '1px dashed var(--blue)' }}>{display}</a>;
                    }
                    return <span key={i}>{part}</span>;
                  });
                };
                const isResearch = e.label === 'Research' || (e.detail && e.detail.startsWith('✦ Auto-Research'));
                return (
                <div key={`${e.kind}-${e.id}`} className="tl-entry">
                  <div className="tl-dot" style={isResearch ? { background: 'var(--purple)', boxShadow: '0 0 0 3px rgba(96,64,168,0.1)' } : e.kind === 'activity' ? { background: 'var(--amber)', boxShadow: '0 0 0 3px rgba(184,122,16,0.08)' } : {}} />
                  <div>
                    <div className="entry-date">
                      {isResearch && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--purple)', letterSpacing: '0.06em', marginRight: '8px' }}>✦ AUTO-RESEARCH</span>}
                      {e.date ? new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : ''}
                    </div>
                    <div className="entry-text">{e.subject && <strong>{e.subject}. </strong>}{renderDetail(e.detail)}{e.outcome && <span style={{ color: 'var(--green)' }}> → {e.outcome}</span>}</div>
                  </div>
                </div>
              );})}
            </div>

            {/* Buildings */}
            <div className="sec-head">Buildings <span style={{ fontSize: '11px', color: 'var(--ink4)', fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>({(p.buildings||[]).length || 1})</span></div>
            {(p.buildings && p.buildings.length > 0) ? p.buildings.map(b => (
              <div key={b.id} className="bld-card">
                <div className="bld-name">{b.building_name || 'Building'} — {b.prop_type || p.prop_type || 'Industrial'}</div>
                <div className="bld-stats">
                  <div><div className="bld-stat-label">Square Feet</div><div className="bld-stat-val">{b.building_sf ? Number(b.building_sf).toLocaleString() : '—'}</div></div>
                  <div><div className="bld-stat-label">Clear Height</div><div className="bld-stat-val">{b.clear_height ? `${b.clear_height}'` : '—'}</div></div>
                  <div><div className="bld-stat-label">Dock / GL</div><div className="bld-stat-val">{b.dock_doors || 0}D · {b.grade_doors || 0}GL</div></div>
                  <div><div className="bld-stat-label">Year Built</div><div className="bld-stat-val">{b.year_built || '—'}</div></div>
                </div>
                <button onClick={() => handleRemoveBldg(b)} style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--ink4)', fontSize: '11px', cursor: 'pointer' }}>Remove</button>
              </div>
            )) : (
              <div className="bld-card">
                <div className="bld-name">Building 1 — {p.prop_type || 'Industrial'}</div>
                <div className="bld-stats">
                  <div><div className="bld-stat-label">Square Feet</div><div className="bld-stat-val">{p.building_sf ? Number(p.building_sf).toLocaleString() : '—'}</div></div>
                  <div><div className="bld-stat-label">Clear Height</div><div className="bld-stat-val">{p.clear_height ? `${p.clear_height}'` : '—'}</div></div>
                  <div><div className="bld-stat-label">Dock / GL</div><div className="bld-stat-val">{p.dock_doors || 0}D · {p.grade_doors || 0}GL</div></div>
                  <div><div className="bld-stat-label">Year Built</div><div className="bld-stat-val">{p.year_built || '—'}</div></div>
                </div>
              </div>
            )}
            <button className="btn btn-sm" style={{ marginBottom: '20px' }} onClick={() => setShowBldgForm(!showBldgForm)}>{showBldgForm ? 'Cancel' : '+ Building'}</button>
            {showBldgForm && (
              <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--line)' }}>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Name</label><input className="input" value={bldgForm.building_name} onChange={e => setBldgForm({...bldgForm, building_name: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">SF</label><input className="input" type="number" value={bldgForm.building_sf} onChange={e => setBldgForm({...bldgForm, building_sf: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Clear Height</label><input className="input" type="number" value={bldgForm.clear_height} onChange={e => setBldgForm({...bldgForm, clear_height: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Dock Doors</label><input className="input" type="number" value={bldgForm.dock_doors} onChange={e => setBldgForm({...bldgForm, dock_doors: e.target.value})} /></div>
                </div>
                <button className="btn btn-primary" onClick={handleAddBldg} disabled={savingBldg}>{savingBldg ? 'Saving...' : 'Add Building'}</button>
              </div>
            )}

            {/* APNs */}
            <div className="sec-head">Parcels / APNs</div>
            {(p.apns||[]).length > 0 ? (p.apns||[]).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--line3)' }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', color: 'var(--ink2)' }}>{a.apn}</span>
                {a.acres && <span style={{ fontSize: '12px', color: 'var(--ink4)' }}>{a.acres} ac</span>}
                <button onClick={() => handleRemoveApn(a)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--ink4)', fontSize: '11px', cursor: 'pointer' }}>×</button>
              </div>
            )) : <div style={{ fontSize: '13px', color: 'var(--ink4)', marginBottom: '8px' }}>No APNs</div>}
            <button className="btn btn-sm" style={{ marginTop: '6px', marginBottom: '20px' }} onClick={() => setShowApnForm(!showApnForm)}>{showApnForm ? 'Cancel' : '+ APN'}</button>
            {showApnForm && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input className="input" value={newApn} onChange={e => setNewApn(e.target.value)} placeholder="APN..." style={{ maxWidth: '180px' }} />
                <input className="input" type="number" value={newApnAcres} onChange={e => setNewApnAcres(e.target.value)} placeholder="Acres" style={{ maxWidth: '100px' }} />
                <button className="btn btn-primary btn-sm" onClick={handleAddApn} disabled={savingApn}>{savingApn ? '...' : 'Add'}</button>
              </div>
            )}
          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div className="right-col">
            {/* Google Maps link — at top under header */}
            {p.address && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address+', '+(p.city||'')+', CA')}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '8px', textDecoration: 'none', color: 'var(--blue)', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
                📍 View on Google Maps
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--ink4)' }}>↗</span>
              </a>
            )}

            {/* Aerial with parcel overlay */}
            {p.address && (
              <div style={{ marginBottom: '14px' }}>
                <AerialThumbnail propertyId={p.id} address={p.address} city={p.city} apns={p.apns} parcelGeometry={p.parcel_geometry} latitude={p.latitude} longitude={p.longitude} height={220} />
              </div>
            )}

            {/* Owner & Tenant */}
            <div className="info-card">
              <div className="info-card-head">Owner & Tenant</div>
              <div className="info-grid">
                <div className="info-cell"><div className="i-label">Owner</div><div className="i-val">{p.owner || '—'}</div></div>
                <div className="info-cell"><div className="i-label">Type</div><div className="i-val">{p.owner_type || '—'}</div></div>
                <div className="info-cell"><div className="i-label">Tenant</div><div className="i-val">{p.tenant || '—'}</div></div>
                <div className="info-cell"><div className="i-label">Vacancy</div><div className={`i-val ${p.vacancy_status === 'Occupied' ? 'success' : p.vacancy_status === 'Vacant' ? 'danger' : ''}`}>{p.vacancy_status || '—'}</div></div>
              </div>
              {p.lease_expiration && (
                <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line2)' }}>
                  <div className="i-label">Lease Expiration</div>
                  <div className="lease-val">{new Date(p.lease_expiration).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).replace(/\//g, ' / ')}</div>
                  {leaseMonths != null && <div className="lease-note">← {leaseMonths} months remaining</div>}
                </div>
              )}
            </div>

            {/* AI Opportunity Signal — beefed up */}
            <div className="opp-card" style={{ marginTop: '14px' }}>
              <div className="opp-head">✦ AI Opportunity Signal</div>
              {synth ? (
                <div className="opp-body" style={{ lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--ink2)' }}>{`Property Status Summary: ${p.address}`}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{synth}</div>
                  {(p.catalyst_tags||[]).length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line2)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', marginBottom: '6px' }}>Active Catalysts</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(p.catalyst_tags||[]).map(tag => (
                          <span key={tag} className={`tag ${urgBadge(tag)}`} style={{ fontSize: '10px', cursor: 'pointer' }} onClick={() => onCatalystClick?.(tag)}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {linkedFU.filter(f => !f.completed).length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--line2)', fontSize: '12px', color: 'var(--amber)' }}>
                      ⚡ {linkedFU.filter(f => !f.completed).length} pending follow-up{linkedFU.filter(f => !f.completed).length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ) : (
                <div className="opp-body" style={{ color: 'var(--ink4)', fontStyle: 'italic' }}>Click "✦ Synthesize" on the Timeline to generate an AI opportunity signal with next steps, key contacts, and action items.</div>
              )}
            </div>

            {/* Follow-Up Cadence — moved up between timeline and property details */}
            <div style={{ marginTop: '14px', padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px' }}>
              <div className="i-label" style={{ marginBottom: '8px', fontWeight: 700 }}>Follow-Up Cadence</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {CADENCE_OPTIONS.map(c => (
                  <button key={c.label} className={`btn btn-sm ${p.follow_up_cadence === c.label ? 'btn-blue' : ''}`}
                    onClick={async () => { try { await setCadence('properties', p.id, c.label, c.days); onRefresh?.(); showToast?.(`${c.label} set`); } catch(e) { console.error(e); } }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes Section */}
            {linkedNotes.length > 0 && (
              <div style={{ marginTop: '14px', padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink3)', marginBottom: '10px' }}>Notes</div>
                {linkedNotes.slice(0, 5).map(n => (
                  <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line3)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--ink4)', textTransform: 'uppercase' }}>{n.note_type || 'Note'}</span>
                      <span style={{ fontSize: '10px', color: 'var(--ink4)', fontFamily: "'DM Mono',monospace" }}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</span>
                    </div>
                    <div style={{ color: 'var(--ink2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.content?.slice(0, 200)}{n.content?.length > 200 ? '...' : ''}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Property Details */}
            <div className="info-card" style={{ marginTop: '14px' }}>
              <div className="info-card-head">Property Details</div>
              <div className="info-grid">
                <div className="info-cell"><div className="i-label">Market</div><div className="i-val">{p.market || '—'}</div></div>
                <div className="info-cell"><div className="i-label">Submarket</div><div className="i-val">{p.submarket || p.city || '—'}</div></div>
                <div className="info-cell"><div className="i-label">Type</div><div className="i-val">{p.prop_type || '—'}</div></div>
                <div className="info-cell"><div className="i-label">Zoning</div><div className="i-val">{p.zoning || '—'}</div></div>
                <div className="info-cell"><div className="i-label">Land SF</div><div className="i-val">{p.land_acres ? Math.round(p.land_acres * 43560).toLocaleString() : p.land_sf ? Number(p.land_sf).toLocaleString() : '—'}</div></div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '14px' }}>
              <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAutoResearch} disabled={researching}>{researching ? '✦ Researching...' : '✦ Auto-Research'}</button>
              <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowTagPicker(!showTagPicker)}>{showTagPicker ? 'Done Adding Tags' : '+ Add Catalyst Tag'}</button>
              <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAutoTag} disabled={autoTagLoading}>{autoTagLoading ? '✦ Analyzing...' : '✦ AI Auto-Tag'}</button>
            </div>

            {/* Tag picker */}
            {showTagPicker && (
              <div style={{ marginTop: '10px', padding: '12px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--line)', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {CATALYST_TAGS.filter(t => !(p.catalyst_tags||[]).includes(t)).map(t => (
                  <button key={t} onClick={() => addTag(t)} className={`tag ${urgBadge(t)}`} style={{ cursor: 'pointer', opacity: 0.7, border: '1px dashed var(--line)' }}>{t}</button>
                ))}
              </div>
            )}

          </div>
        </div>
      ) : (
        /* ═══ TAB CONTENT (non-overview) ═══ */
        <div style={{ padding: '28px 36px' }}>
          {activeTab==='leads'&&(()=>{const rows=sortFilter(linkedLeads,['lead_name','address','decision_maker','tier','stage']);return(<div><SH title="Linked Leads — Signal Stack" count={linkedLeads.length} /><FB ph="Filter leads..." />{rows.length===0?<div style={{fontSize:'13px',color:'var(--ink4)',padding:'16px 0'}}>No leads linked to this property</div>:<div className="table-container"><table><thead><tr><Th field="lead_name">Lead</Th><Th field="stage">Stage</Th><Th field="tier">Tier</Th><Th field="score" align="right">Score</Th><th>Catalysts</th><Th field="next_action">Next Action</Th></tr></thead><tbody>{rows.map(l=>(<tr key={l.id} onClick={()=>onLeadClick?.(l)} style={{cursor:'pointer',opacity:l.stage==='Converted'?0.7:l.stage==='Dead'?0.4:1}}><td style={{fontWeight:500}}>{l.lead_name}</td><td><span className="badge" style={{background:(LEAD_STAGE_COLORS?.[l.stage]||'var(--ink3)')+'14',borderColor:(LEAD_STAGE_COLORS?.[l.stage]||'var(--ink3)')+'44',color:LEAD_STAGE_COLORS?.[l.stage]||'var(--ink3)'}}>{l.stage}</span></td><td>{l.tier&&<span style={{fontWeight:700,color:{'A+':'var(--green)',A:'var(--blue)',B:'var(--amber)',C:'var(--ink3)'}[l.tier]||'var(--ink3)'}}>{l.tier}</span>}</td><td style={{textAlign:'right',fontFamily:"'DM Mono',monospace",color:'var(--blue)'}}>{l.score??'—'}</td><td><div style={{display:'flex',gap:'3px',flexWrap:'wrap'}}>{(l.catalyst_tags||[]).slice(0,3).map(t=><span key={t} className="tag" style={{fontSize:'9px',padding:'1px 5px'}}>{t}</span>)}</div></td><td style={{color:'var(--amber)'}}>{l.next_action||'—'}</td></tr>))}</tbody></table></div>}</div>);})()}
          {activeTab==='deals'&&(()=>{const rows=sortFilter(linkedDeals,['deal_name','deal_type','buyer','seller','stage']);return(<div><SH title="Deals" count={linkedDeals.length} /><FB ph="Filter deals..." />{rows.length===0?<div style={{fontSize:'13px',color:'var(--ink4)',padding:'16px 0'}}>None</div>:<div className="table-container"><table><thead><tr><Th field="deal_name">Deal</Th><Th field="stage">Stage</Th><Th field="deal_value" align="right">Value</Th><Th field="commission_est" align="right">Comm</Th></tr></thead><tbody>{rows.map(d=>(<tr key={d.id} onClick={()=>onDealClick?.(d)} style={{cursor:'pointer'}}><td style={{fontWeight:500}}>{d.deal_name}</td><td><span className="badge" style={{background:(STAGE_COLORS?.[d.stage]||'var(--ink3)')+'14',borderColor:(STAGE_COLORS?.[d.stage]||'var(--ink3)')+'44',color:STAGE_COLORS?.[d.stage]||'var(--ink3)'}}>{d.stage}</span></td><td style={{textAlign:'right',fontFamily:"'DM Mono',monospace",color:'var(--blue)',fontWeight:600}}>{d.deal_value?fmt.price(d.deal_value):'—'}</td><td style={{textAlign:'right',fontFamily:"'DM Mono',monospace",color:'var(--green)'}}>{d.commission_est?fmt.price(d.commission_est):'—'}</td></tr>))}</tbody></table></div>}</div>);})()}
          {activeTab==='contacts'&&(()=>{const rows=sortFilter(linkedContacts,['name','company','title','contact_type','phone']);return(<div><SH title="Contacts" count={linkedContacts.length} /><FB ph="Filter contacts..." />{rows.length===0?<div style={{fontSize:'13px',color:'var(--ink4)',padding:'16px 0'}}>None</div>:<div className="table-container"><table><thead><tr><Th field="name">Name</Th><Th field="company">Company</Th><Th field="contact_type">Type</Th><Th field="phone">Phone</Th></tr></thead><tbody>{rows.map(c=>(<tr key={c.id} onClick={()=>onContactClick?.(c)} style={{cursor:'pointer'}}><td style={{fontWeight:500}}>{c.name}</td><td>{c.company||'—'}</td><td>{c.contact_type&&<span className="tag tag-blue">{c.contact_type}</span>}</td><td style={{fontFamily:"'DM Mono',monospace"}}>{c.phone||'—'}</td></tr>))}</tbody></table></div>}</div>);})()}
          {activeTab==='comps'&&(()=>{const lr=sortFilter(displayLC,['address','tenant','lease_type']);const sr=sortFilter(displaySC,['address','buyer','sale_type']);return(<div><SH title="Lease Comps" count={displayLC.length} />{lr.length===0?<div style={{fontSize:'13px',color:'var(--ink4)'}}>None</div>:<div className="table-container"><table><thead><tr><Th field="address">Address</Th><Th field="tenant">Tenant</Th><Th field="rsf" align="right">SF</Th><Th field="rate" align="right">Rate</Th><Th field="lease_type">Type</Th></tr></thead><tbody>{lr.map(c=>(<tr key={c.id} onClick={()=>onLeaseCompClick?.(c)} style={{cursor:'pointer'}}><td style={{fontWeight:500}}>{c.address}</td><td>{c.tenant||'—'}</td><td style={{textAlign:'right',fontFamily:"'DM Mono',monospace"}}>{c.rsf?c.rsf.toLocaleString():'—'}</td><td style={{textAlign:'right',fontFamily:"'DM Mono',monospace",color:'var(--blue)',fontWeight:600}}>${c.rate}/SF</td><td>{c.lease_type||'—'}</td></tr>))}</tbody></table></div>}<div style={{marginTop:'24px'}}><SH title="Sale Comps" count={displaySC.length} /></div>{sr.length===0?<div style={{fontSize:'13px',color:'var(--ink4)'}}>None</div>:<div className="table-container"><table><thead><tr><Th field="address">Address</Th><Th field="building_sf" align="right">SF</Th><Th field="sale_price" align="right">Price</Th><Th field="price_psf" align="right">$/SF</Th><Th field="cap_rate" align="right">Cap</Th></tr></thead><tbody>{sr.map(c=>(<tr key={c.id}><td style={{fontWeight:500}}>{c.address}</td><td style={{textAlign:'right',fontFamily:"'DM Mono',monospace"}}>{c.building_sf?c.building_sf.toLocaleString():'—'}</td><td style={{textAlign:'right',fontFamily:"'DM Mono',monospace"}}>{c.sale_price?fmt.price(c.sale_price):'—'}</td><td style={{textAlign:'right',fontFamily:"'DM Mono',monospace",color:'var(--blue)',fontWeight:600}}>{c.price_psf?'$'+Math.round(c.price_psf):'—'}</td><td style={{textAlign:'right',fontFamily:"'DM Mono',monospace"}}>{c.cap_rate?parseFloat(c.cap_rate).toFixed(2)+'%':'—'}</td></tr>))}</tbody></table></div>}</div>);})()}
          {activeTab==='campaigns'&&<CampaignTab record={p} onCampaignClick={onCampaignClick} />}
          {activeTab==='buyers'&&<BuyerMatching property={p} accounts={accounts||[]} onAccountClick={onAccountClick} />}
          {activeTab==='files'&&<FilesLinks record={p} table="properties" onRefresh={onRefresh} showToast={showToast} />}
          {activeTab==='tasks'&&(()=>{const rows=sortFilter(linkedTasks,['title','priority','due_date']);return(<div><SH title="Tasks" count={pendingTasks} onAdd={()=>onAddTask?.(p.id)} addLabel="+ Task" /><FB ph="Filter tasks..." />{rows.length===0?<div style={{fontSize:'13px',color:'var(--ink4)',padding:'16px 0'}}>None</div>:<div className="table-container"><table><thead><tr><Th field="title">Task</Th><Th field="priority">Priority</Th><Th field="due_date">Due</Th></tr></thead><tbody>{rows.map(t=>{const pc={High:'var(--rust)',Medium:'var(--amber)',Low:'var(--ink3)'}[t.priority]||'var(--ink3)';const od=!t.completed&&t.due_date&&new Date(t.due_date)<new Date();return(<tr key={t.id} style={{opacity:t.completed?0.6:1}}><td style={{fontWeight:500,textDecoration:t.completed?'line-through':'none'}}>{t.title}</td><td><span className="badge" style={{background:pc+'14',borderColor:pc+'44',color:pc}}>{t.priority}</span></td><td style={{fontFamily:"'DM Mono',monospace",color:od?'var(--rust)':'var(--ink4)'}}>{od?'OVERDUE · ':''}{t.due_date||'—'}</td></tr>);})}</tbody></table></div>}</div>);})()}
        </div>
      )}
    </div>
  );
}
