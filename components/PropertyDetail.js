'use client';
import { useState, useEffect, useMemo } from 'react';
import { fmt, CATALYST_URGENCY, CATALYST_TAGS, CADENCE_OPTIONS, STAGE_COLORS, LEAD_STAGE_COLORS, AI_MODEL_OPUS, AI_MODEL_SONNET } from '../lib/constants';
import { updateRow, insertRow, addApn, removeApn, addBuilding, removeBuilding, calculateProbability, setCadence, autoResearch } from '../lib/db';
import EditPropertyModal from './EditPropertyModal';
import BuyerMatching from './BuyerMatching';
import FilesLinks from './FilesLinks';
import AerialThumbnail from './AerialThumbnail';
import AerialThumbnail from './AerialThumbnail';

const NOTE_TYPES = ['Note','Intel','Call Log','Meeting Note','Status Update'];
const LOG_TYPES = ['Call','Email','Meeting'];

export default function PropertyDetail({
  property: p, deals, leads, contacts, leaseComps, saleComps, activities, tasks, accounts,
  notes: allNotes, followUps: allFollowUps,
  onLeaseCompClick, onSaleCompClick, onDealClick, onLeadClick, onContactClick, onAccountClick, onCatalystClick,
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
  const probColor = v => v>=75?'#22c55e':v>=50?'#f59e0b':'#6b7280';
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
    {id:'buyers',label:'Buyer Matches'},
    {id:'files',label:`Files${(p.file_links||[]).length?` (${(p.file_links||[]).length})`:''}`},
    {id:'tasks',label:`Tasks${pendingTasks?` (${pendingTasks})`:''}`},
  ];

  return (
    <div style={{maxWidth:'1000px'}}>
      {/* HEADER */}
      <div className="card" style={{marginBottom:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <h2 style={{fontSize:'22px',fontWeight:700,marginBottom:'4px'}}>{p.address}</h2>
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
              <span style={{fontSize:'14px',color:'var(--text-muted)'}}>{[p.city,p.submarket,p.zip].filter(Boolean).join(' · ')}</span>
              {p.prop_type&&<span className="tag tag-ghost" style={{fontSize:'12px'}}>{p.prop_type}</span>}
              {p.vacancy_status&&<span className={`tag ${p.vacancy_status==='Vacant'?'tag-red':p.vacancy_status==='Partial'?'tag-amber':'tag-blue'}`} style={{fontSize:'12px'}}>{p.vacancy_status}</span>}
              {p.follow_up_cadence&&<span className="tag tag-blue" style={{fontSize:'11px'}}>🔄 {p.follow_up_cadence}</span>}
              {p.address&&<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address+', '+(p.city||'')+', CA')}`} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',color:'var(--accent)',textDecoration:'none',padding:'2px 8px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--bg-input)'}}>📍 Maps ↗</a>}
              {p.onedrive_url&&<a href={p.onedrive_url} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',color:'var(--accent)',textDecoration:'none',padding:'2px 8px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--bg-input)'}}>📁 OneDrive ↗</a>}
            </div>
          </div>
          <div style={{display:'flex',gap:'6px',flexShrink:0}}>
            {onAddActivity&&<button className="btn btn-ghost btn-sm" onClick={()=>onAddActivity(p.id)}>+ Activity</button>}
            {onAddTask&&<button className="btn btn-ghost btn-sm" onClick={()=>onAddTask(p.id)}>+ Task</button>}
            <div style={{position:'relative'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>{const dd=document.getElementById('prop-cadence-dd');dd.style.display=dd.style.display==='block'?'none':'block';}}>🔄 Cadence</button>
              <div id="prop-cadence-dd" style={{position:'absolute',right:0,top:'100%',marginTop:'4px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'8px',padding:'4px',zIndex:10,display:'none',minWidth:'140px',boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
                {CADENCE_OPTIONS.map(c=><div key={c.label} onClick={async()=>{try{await setCadence('properties',p.id,c.label,c.days);onRefresh?.();showToast?.(`${c.label} follow-up set`);}catch(e){console.error(e);}document.getElementById('prop-cadence-dd').style.display='none';}} style={{padding:'6px 12px',fontSize:'13px',cursor:'pointer',borderRadius:'4px',whiteSpace:'nowrap'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-input)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{c.label}</div>)}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{color:'#8b5cf6',borderColor:'#8b5cf644'}} onClick={handleAutoResearch} disabled={researching}>{researching?'✦ Researching...':'✦ Research'}</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setEditing(true)}>Edit</button>
          </div>
        </div>
        {/* CATALYST TAGS — clickable + add/remove + auto-suggest */}
        <div style={{marginTop:'10px'}}>
          <div style={{display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center'}}>
            {(p.catalyst_tags||[]).map(tag=><span key={tag} className={`tag ${urgBadge(tag)}`} style={{fontSize:'12px',cursor:'pointer',position:'relative'}} onClick={()=>onCatalystClick?.(tag)}>{tag}<span onClick={e=>{e.stopPropagation();removeTag(tag);}} style={{marginLeft:'4px',cursor:'pointer',opacity:0.6,fontSize:'11px'}}>×</span></span>)}
            <button className="btn btn-ghost btn-sm" style={{fontSize:'11px',padding:'2px 8px'}} onClick={()=>setShowTagPicker(!showTagPicker)}>{showTagPicker?'Done':'+ Tag'}</button>
            <button className="btn btn-ghost btn-sm" style={{fontSize:'11px',padding:'2px 8px',color:'#8b5cf6',borderColor:'#8b5cf644'}} onClick={handleAutoTag} disabled={autoTagLoading}>{autoTagLoading?'✦ Analyzing...':'✦ Auto-Tag'}</button>
          </div>
          {showTagPicker&&(<div style={{marginTop:'8px',padding:'10px',background:'var(--bg-input)',borderRadius:'6px',border:'1px solid var(--border)',display:'flex',gap:'4px',flexWrap:'wrap'}}>{CATALYST_TAGS.filter(t=>!(p.catalyst_tags||[]).includes(t)).map(t=><button key={t} onClick={()=>addTag(t)} className={`tag ${urgBadge(t)}`} style={{fontSize:'11px',cursor:'pointer',opacity:0.7,border:'1px dashed var(--border)'}}>{t}</button>)}</div>)}
        </div>
        {(p.ai_score!=null||p.probability!=null||avgLR||avgSP)&&(
          <div style={{display:'flex',gap:'20px',marginTop:'10px',paddingTop:'10px',borderTop:'1px solid var(--border-subtle)',flexWrap:'wrap'}}>
            {p.ai_score!=null&&<div style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{fontSize:'12px',color:'var(--text-muted)'}}>AI Score</span><span style={{fontSize:'15px',fontWeight:700,color:'var(--accent)',fontFamily:'var(--font-mono)'}}>{p.ai_score}</span></div>}
            {p.probability!=null&&<div style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{fontSize:'12px',color:'var(--text-muted)'}}>Probability</span><span style={{fontSize:'15px',fontWeight:700,color:probColor(p.probability),fontFamily:'var(--font-mono)'}}>{p.probability}%</span></div>}
            {avgLR&&<div style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{fontSize:'12px',color:'var(--text-muted)'}}>Avg Lease</span><span style={{fontSize:'15px',fontWeight:700,color:'var(--accent)',fontFamily:'var(--font-mono)'}}>${avgLR}/SF</span></div>}
            {avgSP&&<div style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{fontSize:'12px',color:'var(--text-muted)'}}>Avg Sale</span><span style={{fontSize:'15px',fontWeight:700,color:'var(--accent)',fontFamily:'var(--font-mono)'}}>${avgSP}/SF</span></div>}
          </div>
        )}
      </div>

      {/* TIMELINE */}
      <div className="card" style={{marginBottom:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <h3 style={{fontSize:'14px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Timeline</h3>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            <button className="btn btn-ghost btn-sm" style={{fontSize:'12px',color:'#8b5cf6',borderColor:'#8b5cf644'}} onClick={handleSynthesize} disabled={synthLoading}>{synthLoading?'✦ Synthesizing...':'✦ Synthesize'}</button>
            <button className="btn btn-ghost btn-sm" style={{fontSize:'12px'}} onClick={()=>{closeAll();setShowLogForm(!showLogForm);}}>{showLogForm?'Cancel':'+ Log Call/Email'}</button>
            <button className="btn btn-ghost btn-sm" style={{fontSize:'12px'}} onClick={()=>{closeAll();setShowNoteForm(!showNoteForm);}}>{showNoteForm?'Cancel':'+ Note'}</button>
            <button className="btn btn-ghost btn-sm" style={{fontSize:'12px'}} onClick={()=>{closeAll();setShowFuForm(!showFuForm);}}>{showFuForm?'Cancel':'+ Follow-Up'}</button>
          </div>
        </div>
        {synth&&(<div style={{padding:'14px',background:'#8b5cf611',border:'1px solid #8b5cf633',borderRadius:'8px',marginBottom:'14px',fontSize:'14px',lineHeight:1.7,color:'var(--text-primary)',whiteSpace:'pre-wrap'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}><span style={{fontSize:'11px',fontWeight:600,color:'#8b5cf6',textTransform:'uppercase'}}>✦ AI Synthesis (Opus)</span>{p.ai_synthesis_at&&<span style={{fontSize:'11px',color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>{new Date(p.ai_synthesis_at).toLocaleString()}</span>}</div>{synth}</div>)}
        {showLogForm&&(<div style={{padding:'12px',background:'var(--bg-input)',borderRadius:'6px',marginBottom:'12px',border:'1px solid var(--border)'}}>
          <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>{LOG_TYPES.map(t=><button key={t} onClick={()=>setLogType(t)} style={{padding:'3px 10px',borderRadius:'4px',border:'1px solid',fontSize:'12px',cursor:'pointer',borderColor:logType===t?'var(--accent)':'var(--border)',background:logType===t?'var(--accent-soft)':'transparent',color:logType===t?'var(--accent)':'var(--text-muted)'}}>{t==='Call'?'📞 Call':t==='Email'?'✉️ Email':'🤝 Meeting'}</button>)}</div>
          <input className="input" placeholder="Subject..." value={logSubject} onChange={e=>setLogSubject(e.target.value)} style={{marginBottom:'6px',fontSize:'14px'}} />
          {linkedContacts.length>0&&<select className="select" value={logContactId} onChange={e=>setLogContactId(e.target.value)} style={{marginBottom:'6px',fontSize:'13px'}}><option value="">Link to contact (optional)</option>{linkedContacts.map(c=><option key={c.id} value={c.id}>{c.name}{c.company?` — ${c.company}`:''}</option>)}</select>}
          <textarea className="textarea" rows={2} value={logNotes} onChange={e=>setLogNotes(e.target.value)} placeholder="Notes..." style={{marginBottom:'8px',fontSize:'13px'}} />
          <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}}><button className="btn btn-ghost btn-sm" onClick={()=>setShowLogForm(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleLogAct} disabled={savingLog||!logSubject.trim()}>{savingLog?'...':logType}</button></div>
        </div>)}
        {showNoteForm&&(<div style={{padding:'12px',background:'var(--bg-input)',borderRadius:'6px',marginBottom:'12px',border:'1px solid var(--border)'}}>
          <div style={{display:'flex',gap:'6px',marginBottom:'8px',flexWrap:'wrap'}}>{NOTE_TYPES.map(t=><button key={t} onClick={()=>setNoteType(t)} style={{padding:'3px 10px',borderRadius:'4px',border:'1px solid',fontSize:'12px',cursor:'pointer',borderColor:noteType===t?'var(--accent)':'var(--border)',background:noteType===t?'var(--accent-soft)':'transparent',color:noteType===t?'var(--accent)':'var(--text-muted)'}}>{t}</button>)}</div>
          <textarea className="textarea" rows={3} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Add a note..." style={{marginBottom:'8px',fontSize:'14px'}} />
          <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}}><button className="btn btn-ghost btn-sm" onClick={()=>setShowNoteForm(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={savingNote||!noteText.trim()}>{savingNote?'...':'Save'}</button></div>
        </div>)}
        {showFuForm&&(<div style={{padding:'12px',background:'var(--bg-input)',borderRadius:'6px',marginBottom:'12px',border:'1px solid var(--border)'}}>
          <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}><input className="input" style={{flex:1,fontSize:'14px'}} placeholder="Follow-up reason..." value={fuReason} onChange={e=>setFuReason(e.target.value)} /><input className="input" type="date" style={{width:'160px',fontSize:'14px'}} value={fuDate} onChange={e=>setFuDate(e.target.value)} /></div>
          <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}}><button className="btn btn-ghost btn-sm" onClick={()=>setShowFuForm(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleAddFu} disabled={savingFu||!fuReason.trim()||!fuDate}>{savingFu?'...':'Set'}</button></div>
        </div>)}
        {linkedFU.filter(f=>!f.completed).length>0&&(<div style={{marginBottom:'12px'}}>{linkedFU.filter(f=>!f.completed).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date)).map(fu=>{const od=new Date(fu.due_date)<new Date(new Date().toDateString());return(<div key={fu.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',marginBottom:'4px',borderRadius:'6px',background:od?'var(--red-soft)':'var(--amber-soft)',border:`1px solid ${od?'var(--red)':'var(--amber)'}33`}}><span>{od?'⚠':'🔔'}</span><div style={{flex:1}}><span style={{fontSize:'14px',fontWeight:500,color:od?'var(--red)':'var(--amber)'}}>{fu.reason}</span><span style={{fontSize:'12px',color:'var(--text-muted)',marginLeft:'8px',fontFamily:'var(--font-mono)'}}>{od?'OVERDUE · ':''}{fu.due_date}</span></div><button className="btn btn-ghost btn-sm" style={{fontSize:'11px'}} onClick={()=>handleCompleteFu(fu)}>✓</button></div>);})}</div>)}
        {timeline.length===0&&!p.notes?(<div style={{padding:'20px 0',textAlign:'center',color:'var(--text-muted)',fontSize:'14px'}}>No activity yet</div>):(
          <div style={{position:'relative',paddingLeft:'24px'}}>
            <div style={{position:'absolute',left:'7px',top:'4px',bottom:'4px',width:'2px',background:'var(--border)'}} />
            {p.notes&&linkedNotes.length===0&&(<div style={{position:'relative',paddingBottom:'14px'}}><div style={{position:'absolute',left:'-24px',top:'3px',width:'16px',height:'16px',borderRadius:'50%',background:'var(--bg-card)',border:'2px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px'}}>📝</div><div style={{padding:'10px 12px',background:'var(--bg-input)',borderRadius:'6px'}}><div style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'4px'}}>Notes</div><div style={{fontSize:'14px',color:'var(--text-secondary)',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{p.notes}</div></div></div>)}
            {timeline.map(item=>(<div key={item.id} style={{position:'relative',paddingBottom:'14px'}}><div style={{position:'absolute',left:'-24px',top:'3px',width:'16px',height:'16px',borderRadius:'50%',background:'var(--bg-card)',border:'2px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px'}}>{item.icon}</div><div style={{padding:'10px 12px',background:'var(--bg-input)',borderRadius:'6px'}}><div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:item.detail?'4px':0,flexWrap:'wrap'}}><span className={`tag ${item.kind==='note'?'tag-purple':'tag-blue'}`} style={{fontSize:'11px'}}>{item.label}</span>{item.subject&&<span style={{fontSize:'14px',fontWeight:500}}>{item.subject}</span>}{item.outcome&&<span className="tag tag-ghost" style={{fontSize:'11px'}}>{item.outcome}</span>}<span style={{fontSize:'12px',color:'var(--text-muted)',marginLeft:'auto',fontFamily:'var(--font-mono)'}}>{fmtAgo(item.date)}</span></div>{item.detail&&<div style={{fontSize:'14px',color:'var(--text-secondary)',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{item.detail}</div>}</div></div>))}
          </div>
        )}
      </div>

      {/* ROLLUP STATS BAR */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px',marginBottom:'16px'}}>
        {[
          ['Total SF',p.total_sf||p.building_sf?Number(p.total_sf||p.building_sf).toLocaleString():'—','var(--accent)'],
          ['Total Acres',p.total_acres||p.land_acres?Number(p.total_acres||p.land_acres).toFixed(2):'—','var(--text-primary)'],
          ['Max Clear',p.max_clear_height||p.clear_height?(p.max_clear_height||p.clear_height)+"'":'—','var(--text-primary)'],
          ['Dock Doors',String(p.total_dock_doors??p.dock_doors??0),'var(--text-primary)'],
          ['Buildings',String(p.building_count||(p.buildings||[]).length||1),'var(--accent)'],
          ['Parcels',String(p.parcel_count||(p.apns||[]).length||0),'var(--text-primary)'],
        ].map(([l,v,c])=>(<div key={l} className="card" style={{padding:'10px 14px',textAlign:'center'}}><div style={{fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'2px'}}>{l}</div><div style={{fontSize:'20px',fontWeight:700,color:c,fontFamily:'var(--font-mono)'}}>{v}</div></div>))}
      </div>

      {/* BUILDINGS + PARCELS + OWNER/TENANT */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
        <div className="card">
          <SH title="Buildings" count={(p.buildings||[]).length} onAdd={()=>setShowBldgForm(!showBldgForm)} addLabel={showBldgForm?'Cancel':'+ Building'} />
          {showBldgForm&&(<div style={{padding:'12px',background:'var(--bg-input)',borderRadius:'6px',marginBottom:'12px',border:'1px solid var(--border)'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'8px'}}>
              <input className="input" placeholder="Building name" value={bldgForm.building_name} onChange={e=>setBldgForm(f=>({...f,building_name:e.target.value}))} style={{gridColumn:'1/-1',fontSize:'13px'}} />
              <input className="input" placeholder="SF *" type="number" value={bldgForm.building_sf} onChange={e=>setBldgForm(f=>({...f,building_sf:e.target.value}))} style={{fontSize:'13px'}} />
              <input className="input" placeholder="Clear Height" type="number" value={bldgForm.clear_height} onChange={e=>setBldgForm(f=>({...f,clear_height:e.target.value}))} style={{fontSize:'13px'}} />
              <input className="input" placeholder="Dock Doors" type="number" value={bldgForm.dock_doors} onChange={e=>setBldgForm(f=>({...f,dock_doors:e.target.value}))} style={{fontSize:'13px'}} />
              <input className="input" placeholder="Grade Doors" type="number" value={bldgForm.grade_doors} onChange={e=>setBldgForm(f=>({...f,grade_doors:e.target.value}))} style={{fontSize:'13px'}} />
              <input className="input" placeholder="Year Built" type="number" value={bldgForm.year_built} onChange={e=>setBldgForm(f=>({...f,year_built:e.target.value}))} style={{fontSize:'13px'}} />
              <input className="input" placeholder="Office %" type="number" value={bldgForm.office_pct} onChange={e=>setBldgForm(f=>({...f,office_pct:e.target.value}))} style={{fontSize:'13px'}} />
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'6px'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowBldgForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleAddBldg} disabled={savingBldg||!bldgForm.building_sf}>{savingBldg?'...':'Add'}</button>
            </div>
          </div>)}
          {(p.buildings||[]).length>0?(<div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {(p.buildings||[]).map((b,i)=>(<div key={b.id||i} style={{padding:'10px 12px',background:'var(--bg-input)',borderRadius:'6px',border:'1px solid var(--border-subtle)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                <span style={{fontSize:'14px',fontWeight:600}}>{b.building_name||`Building ${i+1}`}</span>
                <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                  {b.prop_type&&<span className="tag tag-ghost" style={{fontSize:'11px'}}>{b.prop_type}</span>}
                  {b.id&&<button onClick={()=>handleRemoveBldg(b)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:'14px',padding:'0 2px'}}>×</button>}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',fontSize:'13px'}}>
                {b.building_sf&&<div><span style={{color:'var(--text-muted)',fontSize:'11px'}}>SF</span><div style={{fontFamily:'var(--font-mono)',fontWeight:600,color:'var(--accent)'}}>{Number(b.building_sf).toLocaleString()}</div></div>}
                {b.clear_height&&<div><span style={{color:'var(--text-muted)',fontSize:'11px'}}>Clear</span><div style={{fontFamily:'var(--font-mono)'}}>{b.clear_height}'</div></div>}
                {(b.dock_doors>0||b.grade_doors>0)&&<div><span style={{color:'var(--text-muted)',fontSize:'11px'}}>Doors</span><div style={{fontFamily:'var(--font-mono)'}}>{b.dock_doors||0}D / {b.grade_doors||0}GL</div></div>}
                {b.year_built&&<div><span style={{color:'var(--text-muted)',fontSize:'11px'}}>Built</span><div style={{fontFamily:'var(--font-mono)'}}>{b.year_built}</div></div>}
                {b.office_pct&&<div><span style={{color:'var(--text-muted)',fontSize:'11px'}}>Office</span><div style={{fontFamily:'var(--font-mono)'}}>{b.office_pct}%</div></div>}
              </div>
            </div>))}
          </div>):!showBldgForm&&<div style={{fontSize:'13px',color:'var(--text-muted)'}}>No buildings — add one above</div>}

          {/* APNs section below buildings */}
          <div style={{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid var(--border-subtle)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
              <div style={{fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-muted)'}}>APNs {p.apns?.length>0&&<span style={{fontFamily:'var(--font-mono)'}}>({p.apns.length})</span>}</div>
              <button className="btn btn-ghost btn-sm" style={{fontSize:'11px'}} onClick={()=>setShowApnForm(!showApnForm)}>{showApnForm?'Cancel':'+ APN'}</button>
            </div>
            {showApnForm&&(<div style={{display:'flex',gap:'6px',marginBottom:'8px',alignItems:'center'}}><input className="input" placeholder="XXXX-XXX-XXX" value={newApn} onChange={e=>setNewApn(e.target.value)} style={{flex:2,fontSize:'13px'}} /><input className="input" placeholder="Acres" type="number" step="0.01" value={newApnAcres} onChange={e=>setNewApnAcres(e.target.value)} style={{flex:1,fontSize:'13px'}} /><button className="btn btn-primary btn-sm" style={{fontSize:'11px',flexShrink:0}} onClick={handleAddApn} disabled={savingApn||!newApn.trim()}>{savingApn?'...':'Add'}</button></div>)}
            {p.apns?.length>0?(<div style={{display:'flex',flexDirection:'column',gap:'4px'}}>{p.apns.map((a,i)=>(<div key={a.id||i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 8px',background:'var(--bg-input)',borderRadius:'4px'}}><span style={{fontFamily:'var(--font-mono)',fontSize:'13px'}}>{a.apn}</span><div style={{display:'flex',gap:'8px',alignItems:'center'}}>{a.acres&&<span style={{fontSize:'12px',color:'var(--text-muted)'}}>{a.acres} ac</span>}{a.id&&<button onClick={()=>handleRemoveApn(a)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:'13px',padding:'0 2px'}}>×</button>}</div></div>))}</div>):!showApnForm&&<div style={{fontSize:'13px',color:'var(--text-muted)'}}>No APNs</div>}
          </div>
        </div>
        <div className="card">
          <SH title="Owner & Tenant" />
          <div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'8px',paddingBottom:'4px',borderBottom:'1px solid var(--border-subtle)'}}>Owner</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <Field label="Owner" value={p.owner} /><Field label="Owner Type" value={p.owner_type} />
              <Field label="Last Transfer" value={p.last_transfer_date?fmt.date(p.last_transfer_date):null} mono />
              <Field label="Last Sale" value={p.last_sale_price?fmt.price(p.last_sale_price):null} mono accent />
              <Field label="$/SF" value={p.price_psf?'$'+Number(p.price_psf).toLocaleString()+'/SF':null} mono />
            </div>
          </div>
          <div>
            <div style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'8px',paddingBottom:'4px',borderBottom:'1px solid var(--border-subtle)'}}>Tenant</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <Field label="Tenant" value={p.tenant} /><Field label="Vacancy" value={p.vacancy_status} />
              <Field label="Lease Type" value={p.lease_type} />
              <Field label="In-Place Rent" value={p.in_place_rent?'$'+Number(p.in_place_rent).toFixed(2)+'/SF/Mo':null} mono accent />
              <Field label="Market Rent" value={p.market_rent?'$'+Number(p.market_rent).toFixed(2)+'/SF/Mo':null} mono />
              <Field label="Lease Exp." value={p.lease_expiration?fmt.date(p.lease_expiration):null} mono />
            </div>
          </div>
        </div>
      </div>

      {/* AERIAL + QUICK INFO */}
      {p.address && (
        <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:'16px',marginBottom:'16px'}}>
          <AerialThumbnail address={p.address} city={p.city} />
          <div className="card" style={{padding:'16px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',alignContent:'start'}}>
            {[['Total SF',(p.total_sf||p.building_sf)?Number(p.total_sf||p.building_sf).toLocaleString():'—'],['Acres',p.land_acres||p.total_acres||'—'],['Clear Height',p.clear_height||p.max_clear_height?`${p.clear_height||p.max_clear_height}'`:'—'],['Dock Doors',p.dock_doors??p.total_dock_doors??'—'],['Year Built',p.year_built||'—'],['Buildings',p.building_count||'1']].map(([label,val])=>(
              <div key={label}><div style={{fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'2px'}}>{label}</div><div style={{fontSize:'16px',fontWeight:600,fontFamily:'var(--font-mono)'}}>{val}</div></div>
            ))}
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{display:'flex',gap:'2px',borderBottom:'1px solid var(--border)',marginBottom:'16px',overflowX:'auto'}}>
        {tabs.map(tab=><button key={tab.id} onClick={()=>changeTab(tab.id)} style={{padding:'8px 16px',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:500,whiteSpace:'nowrap',background:'transparent',color:activeTab===tab.id?'var(--accent)':'var(--text-muted)',borderBottom:activeTab===tab.id?'2px solid var(--accent)':'2px solid transparent',transition:'all 0.15s'}}>{tab.label}</button>)}
      </div>

      {activeTab==='overview'&&(<div className="card"><SH title="Linked Records" /><div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'12px'}}>{[['Leads',linkedLeads.length,'leads','#8b5cf6'],['Deals',linkedDeals.length,'deals','#f97316'],['Contacts',linkedContacts.length,'contacts','#3b82f6'],['Lease',displayLC.length,'comps','#10b981'],['Sale',displaySC.length,'comps','#22c55e'],['Tasks',pendingTasks,'tasks','#ef4444']].map(([l,c,t,col])=>(<div key={l} onClick={()=>changeTab(t)} style={{padding:'12px',background:'var(--bg-input)',borderRadius:'6px',cursor:'pointer',textAlign:'center',border:'1px solid transparent',transition:'border-color 0.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor=col} onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}><div style={{fontSize:'22px',fontWeight:700,color:c>0?col:'var(--text-muted)'}}>{c}</div><div style={{fontSize:'13px',color:'var(--text-muted)'}}>{l}</div></div>))}</div></div>)}

      {activeTab==='leads'&&(()=>{const rows=sortFilter(linkedLeads,['lead_name','address','decision_maker','tier','stage']);return(<div className="card"><SH title="Linked Leads — Signal Stack" count={linkedLeads.length} /><FB ph="Filter leads..." />{rows.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)',padding:'16px 0'}}>No leads linked to this property</div>:<div className="table-container" style={{overflowX:'auto'}}><table><thead><tr><Th field="lead_name">Lead</Th><Th field="stage">Stage</Th><Th field="tier">Tier</Th><Th field="score" align="right">Score</Th><th style={{fontSize:'12px',color:'var(--text-muted)',padding:'6px 10px'}}>Catalysts</th><Th field="next_action">Next Action</Th></tr></thead><tbody>{rows.map(l=>(<tr key={l.id} onClick={()=>onLeadClick?.(l)} style={{cursor:'pointer',opacity:l.stage==='Converted'?0.7:l.stage==='Dead'?0.4:1}}><td style={{fontWeight:500,fontSize:'14px'}}>{l.lead_name}</td><td><span style={{fontSize:'12px',padding:'2px 7px',borderRadius:'4px',background:(LEAD_STAGE_COLORS?.[l.stage]||'#6b7280')+'22',color:LEAD_STAGE_COLORS?.[l.stage]||'#6b7280',fontWeight:600}}>{l.stage}</span></td><td>{l.tier&&<span style={{fontWeight:700,color:{'A+':'#22c55e',A:'#3b82f6',B:'#f59e0b',C:'#6b7280'}[l.tier]||'#6b7280'}}>{l.tier}</span>}</td><td style={{textAlign:'right',fontFamily:'var(--font-mono)',fontSize:'13px',color:'var(--accent)'}}>{l.score??'—'}</td><td style={{maxWidth:'200px'}}><div style={{display:'flex',gap:'3px',flexWrap:'wrap'}}>{(l.catalyst_tags||[]).slice(0,3).map(t=><span key={t} className="tag" style={{fontSize:'8px',padding:'1px 5px'}}>{t}</span>)}{(l.catalyst_tags||[]).length>3&&<span style={{fontSize:'9px',color:'var(--text-muted)'}}>+{(l.catalyst_tags||[]).length-3}</span>}</div></td><td style={{fontSize:'13px',color:'var(--amber)'}}>{l.next_action||'—'}</td></tr>))}</tbody></table></div>}</div>);})()}

      {activeTab==='deals'&&(()=>{const rows=sortFilter(linkedDeals,['deal_name','deal_type','buyer','seller','stage']);return(<div className="card"><SH title="Deals" count={linkedDeals.length} /><FB ph="Filter deals..." />{rows.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)',padding:'16px 0'}}>None</div>:<div className="table-container" style={{overflowX:'auto'}}><table><thead><tr><Th field="deal_name">Deal</Th><Th field="stage">Stage</Th><Th field="deal_value" align="right">Value</Th><Th field="commission_est" align="right">Comm</Th></tr></thead><tbody>{rows.map(d=>(<tr key={d.id} onClick={()=>onDealClick?.(d)} style={{cursor:'pointer'}}><td style={{fontWeight:500,fontSize:'14px'}}>{d.deal_name}</td><td><span style={{fontSize:'12px',padding:'2px 7px',borderRadius:'4px',background:(STAGE_COLORS?.[d.stage]||'#6b7280')+'22',color:STAGE_COLORS?.[d.stage]||'#6b7280',fontWeight:600}}>{d.stage}</span></td><td style={{textAlign:'right',fontFamily:'var(--font-mono)',fontSize:'13px',color:'var(--accent)',fontWeight:600}}>{d.deal_value?fmt.price(d.deal_value):'—'}</td><td style={{textAlign:'right',fontFamily:'var(--font-mono)',fontSize:'13px',color:'#22c55e'}}>{d.commission_est?fmt.price(d.commission_est):'—'}</td></tr>))}</tbody></table></div>}</div>);})()}

      {activeTab==='contacts'&&(()=>{const rows=sortFilter(linkedContacts,['name','company','title','contact_type','phone']);return(<div className="card"><SH title="Contacts" count={linkedContacts.length} /><FB ph="Filter contacts..." />{rows.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)',padding:'16px 0'}}>None</div>:<div className="table-container" style={{overflowX:'auto'}}><table><thead><tr><Th field="name">Name</Th><Th field="company">Company</Th><Th field="contact_type">Type</Th><Th field="phone">Phone</Th></tr></thead><tbody>{rows.map(c=>(<tr key={c.id} onClick={()=>onContactClick?.(c)} style={{cursor:'pointer'}}><td style={{fontWeight:500,fontSize:'14px'}}>{c.name}</td><td style={{fontSize:'13px'}}>{c.company||'—'}</td><td>{c.contact_type&&<span className="tag tag-blue" style={{fontSize:'11px'}}>{c.contact_type}</span>}</td><td style={{fontFamily:'var(--font-mono)',fontSize:'13px'}}>{c.phone||'—'}</td></tr>))}</tbody></table></div>}</div>);})()}

      {activeTab==='comps'&&(()=>{const lr=sortFilter(displayLC,['address','tenant','lease_type']);const sr=sortFilter(displaySC,['address','buyer','sale_type']);return(<div style={{display:'flex',flexDirection:'column',gap:'16px'}}><div className="card"><SH title="Lease Comps" count={displayLC.length} /><FB ph="Filter..." />{lr.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)'}}>None</div>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><Th field="address">Address</Th><Th field="tenant">Tenant</Th><Th field="rsf" align="right">SF</Th><Th field="rate" align="right">Rate</Th><Th field="lease_type">Type</Th><Th field="term_months" align="right">Term</Th></tr></thead><tbody>{lr.map(c=>(<tr key={c.id} onClick={()=>onLeaseCompClick?.(c)} style={{borderBottom:'1px solid var(--border-subtle)',cursor:'pointer'}}><td style={{padding:'8px 10px',fontSize:'14px',fontWeight:500}}>{c.address}</td><td style={{padding:'8px 10px',fontSize:'13px',color:'var(--text-muted)'}}>{c.tenant||'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right'}}>{c.rsf?c.rsf.toLocaleString():'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right',color:'var(--accent)',fontWeight:600}}>${c.rate}/SF</td><td style={{padding:'8px 10px',fontSize:'13px'}}>{c.lease_type||'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right'}}>{c.term_months?c.term_months+'mo':'—'}</td></tr>))}</tbody></table></div>}</div><div className="card"><SH title="Sale Comps" count={displaySC.length} />{sr.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)'}}>None</div>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><Th field="address">Address</Th><Th field="building_sf" align="right">SF</Th><Th field="sale_price" align="right">Price</Th><Th field="price_psf" align="right">$/SF</Th><Th field="cap_rate" align="right">Cap</Th><Th field="buyer">Buyer</Th></tr></thead><tbody>{sr.map(c=>(<tr key={c.id} style={{borderBottom:'1px solid var(--border-subtle)'}}><td style={{padding:'8px 10px',fontSize:'14px',fontWeight:500}}>{c.address}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right'}}>{c.building_sf?c.building_sf.toLocaleString():'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right'}}>{c.sale_price?fmt.price(c.sale_price):'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right',color:'var(--accent)',fontWeight:600}}>{c.price_psf?'$'+Math.round(c.price_psf):'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right'}}>{c.cap_rate?parseFloat(c.cap_rate).toFixed(2)+'%':'—'}</td><td style={{padding:'8px 10px',fontSize:'13px'}}>{c.buyer||'—'}</td></tr>))}</tbody></table></div>}</div></div>);})()}

      {activeTab==='buyers'&&<div className="card"><BuyerMatching property={p} accounts={accounts||[]} onAccountClick={onAccountClick} /></div>}

      {activeTab==='files'&&<div className="card"><FilesLinks record={p} table="properties" onRefresh={onRefresh} showToast={showToast} /></div>}

      {activeTab==='tasks'&&(()=>{const rows=sortFilter(linkedTasks,['title','priority','due_date']);return(<div className="card"><SH title="Tasks" count={pendingTasks} onAdd={()=>onAddTask?.(p.id)} addLabel="+ Task" /><FB ph="Filter tasks..." />{rows.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)',padding:'16px 0'}}>None</div>:<div className="table-container" style={{overflowX:'auto'}}><table><thead><tr><Th field="completed">✓</Th><Th field="title">Task</Th><Th field="priority">Priority</Th><Th field="due_date">Due</Th></tr></thead><tbody>{rows.map(t=>{const pc={High:'#ef4444',Medium:'#f59e0b',Low:'#6b7280'}[t.priority]||'#6b7280';const od=!t.completed&&t.due_date&&new Date(t.due_date)<new Date();return(<tr key={t.id} style={{opacity:t.completed?0.6:1}}><td style={{width:'40px',textAlign:'center'}}><div style={{width:'14px',height:'14px',borderRadius:'3px',margin:'0 auto',border:'2px solid',borderColor:t.completed?'var(--accent)':pc,background:t.completed?'var(--accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'10px'}}>{t.completed?'✓':''}</div></td><td style={{fontSize:'14px',fontWeight:500,textDecoration:t.completed?'line-through':'none'}}>{t.title}</td><td><span style={{fontSize:'12px',padding:'1px 6px',borderRadius:'3px',background:pc+'22',color:pc,fontWeight:600}}>{t.priority}</span></td><td style={{fontFamily:'var(--font-mono)',fontSize:'13px',color:od?'var(--red)':'var(--text-muted)'}}>{od?'⚠ ':''}{t.due_date||'—'}</td></tr>);})}</tbody></table></div>}</div>);})()}

      {editing&&<EditPropertyModal property={p} onClose={()=>setEditing(false)} onSave={()=>{setEditing(false);showToast?.('Updated');onRefresh?.();}} />}
    </div>
  );
}
