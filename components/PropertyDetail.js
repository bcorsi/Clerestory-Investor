'use client';
import { useState, useMemo } from 'react';
import { fmt, CATALYST_URGENCY, STAGE_COLORS, LEAD_STAGE_COLORS } from '../lib/constants';
import { updateRow, insertRow, addApn, removeApn } from '../lib/db';
import EditPropertyModal from './EditPropertyModal';
import BuyerMatching from './BuyerMatching';

const NOTE_TYPES = ['Note','Intel','Call Log','Meeting Note','Status Update'];
const LOG_TYPES = ['Call','Email','Meeting'];

export default function PropertyDetail({
  property: p, deals, leads, contacts, leaseComps, saleComps, activities, tasks, accounts,
  notes: allNotes, followUps: allFollowUps,
  onLeaseCompClick, onSaleCompClick, onDealClick, onLeadClick, onContactClick, onAccountClick,
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
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filterText, setFilterText] = useState('');

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
  const fmtAgo = d => {if(!d)return'';const x=Math.floor((Date.now()-new Date(d))/86400000);if(x===0)return'Today';if(x===1)return'Yesterday';if(x<7)return x+'d ago';return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'});};
  const closeAll = () => {setShowNoteForm(false);setShowLogForm(false);setShowFuForm(false);};

  const handleAddNote = async()=>{if(!noteText.trim())return;setSavingNote(true);try{await insertRow('notes',{content:noteText.trim(),note_type:noteType,property_id:p.id});setNoteText('');setShowNoteForm(false);onRefresh?.();showToast?.('Note added');}catch(e){console.error(e);}finally{setSavingNote(false);}};
  const handleLogAct = async()=>{if(!logSubject.trim())return;setSavingLog(true);try{await insertRow('activities',{activity_type:logType,subject:logSubject.trim(),notes:logNotes||null,activity_date:new Date().toISOString().split('T')[0],property_id:p.id,contact_id:logContactId||null});setLogSubject('');setLogNotes('');setLogContactId('');setShowLogForm(false);onRefresh?.();showToast?.(`${logType} logged`);}catch(e){console.error(e);}finally{setSavingLog(false);}};
  const handleAddFu = async()=>{if(!fuReason.trim()||!fuDate)return;setSavingFu(true);try{await insertRow('follow_ups',{reason:fuReason.trim(),due_date:fuDate,property_id:p.id});setFuReason('');setFuDate('');setShowFuForm(false);onRefresh?.();showToast?.('Follow-up set');}catch(e){console.error(e);}finally{setSavingFu(false);}};
  const handleCompleteFu = async fu=>{try{await updateRow('follow_ups',fu.id,{completed:true,completed_at:new Date().toISOString()});onRefresh?.();}catch(e){console.error(e);}};
  const handleAddApn = async()=>{if(!newApn.trim())return;setSavingApn(true);try{await addApn(p.id,newApn.trim(),newApnAcres?parseFloat(newApnAcres):null);setNewApn('');setNewApnAcres('');setShowApnForm(false);onRefresh?.();showToast?.('APN added');}catch(e){console.error(e);}finally{setSavingApn(false);}};
  const handleRemoveApn = async a=>{if(!confirm(`Remove APN ${a.apn}?`))return;try{await removeApn(a.id);onRefresh?.();showToast?.('Removed');}catch(e){console.error(e);}};

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
              {p.address&&<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address+', '+(p.city||'')+', CA')}`} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',color:'var(--accent)',textDecoration:'none',padding:'2px 8px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--bg-input)'}}>Maps ↗</a>}
              {p.onedrive_url&&<a href={p.onedrive_url} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',color:'var(--accent)',textDecoration:'none',padding:'2px 8px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--bg-input)'}}>📁 OneDrive ↗</a>}
            </div>
          </div>
          <div style={{display:'flex',gap:'6px',flexShrink:0}}>
            {onAddActivity&&<button className="btn btn-ghost btn-sm" onClick={()=>onAddActivity(p.id)}>+ Activity</button>}
            {onAddTask&&<button className="btn btn-ghost btn-sm" onClick={()=>onAddTask(p.id)}>+ Task</button>}
            <button className="btn btn-ghost btn-sm" onClick={()=>setEditing(true)}>Edit</button>
          </div>
        </div>
        {p.catalyst_tags?.length>0&&(<div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginTop:'10px'}}>{p.catalyst_tags.map(tag=><span key={tag} className={`tag ${urgBadge(tag)}`} style={{fontSize:'12px'}}>{tag}</span>)}</div>)}
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
          <div style={{display:'flex',gap:'6px'}}>
            <button className="btn btn-ghost btn-sm" style={{fontSize:'12px'}} onClick={()=>{closeAll();setShowLogForm(!showLogForm);}}>{showLogForm?'Cancel':'+ Log Call/Email'}</button>
            <button className="btn btn-ghost btn-sm" style={{fontSize:'12px'}} onClick={()=>{closeAll();setShowNoteForm(!showNoteForm);}}>{showNoteForm?'Cancel':'+ Note'}</button>
            <button className="btn btn-ghost btn-sm" style={{fontSize:'12px'}} onClick={()=>{closeAll();setShowFuForm(!showFuForm);}}>{showFuForm?'Cancel':'+ Follow-Up'}</button>
          </div>
        </div>
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

      {/* PROPERTY DETAILS + OWNER/TENANT */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
        <div className="card">
          <SH title="Property Details" />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <Field label="Record Type" value={p.record_type} /><Field label="Property Type" value={p.prop_type} />
            <Field label="Building SF" value={p.building_sf?Number(p.building_sf).toLocaleString()+' SF':null} mono accent />
            <Field label="Land" value={p.land_acres?p.land_acres+' acres':null} mono />
            <Field label="Year Built" value={p.year_built} mono /><Field label="Clear Height" value={p.clear_height?p.clear_height+"'":null} mono />
            <Field label="Dock Doors" value={p.dock_doors!=null&&p.dock_doors!==''?String(p.dock_doors):null} mono />
            <Field label="Grade Doors" value={p.grade_doors!=null&&p.grade_doors!==''?String(p.grade_doors):null} mono />
            <Field label="Market" value={p.market} /><Field label="Submarket" value={p.submarket} />
          </div>
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

      {/* TABS */}
      <div style={{display:'flex',gap:'2px',borderBottom:'1px solid var(--border)',marginBottom:'16px',overflowX:'auto'}}>
        {tabs.map(tab=><button key={tab.id} onClick={()=>changeTab(tab.id)} style={{padding:'8px 16px',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:500,whiteSpace:'nowrap',background:'transparent',color:activeTab===tab.id?'var(--accent)':'var(--text-muted)',borderBottom:activeTab===tab.id?'2px solid var(--accent)':'2px solid transparent',transition:'all 0.15s'}}>{tab.label}</button>)}
      </div>

      {activeTab==='overview'&&(<div className="card"><SH title="Linked Records" /><div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'12px'}}>{[['Leads',linkedLeads.length,'leads','#8b5cf6'],['Deals',linkedDeals.length,'deals','#f97316'],['Contacts',linkedContacts.length,'contacts','#3b82f6'],['Lease',displayLC.length,'comps','#10b981'],['Sale',displaySC.length,'comps','#22c55e'],['Tasks',pendingTasks,'tasks','#ef4444']].map(([l,c,t,col])=>(<div key={l} onClick={()=>changeTab(t)} style={{padding:'12px',background:'var(--bg-input)',borderRadius:'6px',cursor:'pointer',textAlign:'center',border:'1px solid transparent',transition:'border-color 0.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor=col} onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}><div style={{fontSize:'22px',fontWeight:700,color:c>0?col:'var(--text-muted)'}}>{c}</div><div style={{fontSize:'13px',color:'var(--text-muted)'}}>{l}</div></div>))}</div></div>)}

      {activeTab==='leads'&&(()=>{const rows=sortFilter(linkedLeads,['lead_name','address','decision_maker','tier','stage']);return(<div className="card"><SH title="Leads" count={linkedLeads.length} /><FB ph="Filter leads..." />{rows.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)',padding:'16px 0'}}>None</div>:<div className="table-container" style={{overflowX:'auto'}}><table><thead><tr><Th field="lead_name">Lead</Th><Th field="stage">Stage</Th><Th field="tier">Tier</Th><Th field="score" align="right">Score</Th><Th field="next_action">Next Action</Th></tr></thead><tbody>{rows.map(l=>(<tr key={l.id} onClick={()=>onLeadClick?.(l)} style={{cursor:'pointer'}}><td style={{fontWeight:500,fontSize:'14px'}}>{l.lead_name}</td><td><span style={{fontSize:'12px',padding:'2px 7px',borderRadius:'4px',background:(LEAD_STAGE_COLORS?.[l.stage]||'#6b7280')+'22',color:LEAD_STAGE_COLORS?.[l.stage]||'#6b7280',fontWeight:600}}>{l.stage}</span></td><td>{l.tier&&<span style={{fontWeight:700,color:{'A+':'#22c55e',A:'#3b82f6',B:'#f59e0b',C:'#6b7280'}[l.tier]||'#6b7280'}}>{l.tier}</span>}</td><td style={{textAlign:'right',fontFamily:'var(--font-mono)',fontSize:'13px',color:'var(--accent)'}}>{l.score??'—'}</td><td style={{fontSize:'13px',color:'var(--amber)'}}>{l.next_action||'—'}</td></tr>))}</tbody></table></div>}</div>);})()}

      {activeTab==='deals'&&(()=>{const rows=sortFilter(linkedDeals,['deal_name','deal_type','buyer','seller','stage']);return(<div className="card"><SH title="Deals" count={linkedDeals.length} /><FB ph="Filter deals..." />{rows.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)',padding:'16px 0'}}>None</div>:<div className="table-container" style={{overflowX:'auto'}}><table><thead><tr><Th field="deal_name">Deal</Th><Th field="stage">Stage</Th><Th field="deal_value" align="right">Value</Th><Th field="commission_est" align="right">Comm</Th></tr></thead><tbody>{rows.map(d=>(<tr key={d.id} onClick={()=>onDealClick?.(d)} style={{cursor:'pointer'}}><td style={{fontWeight:500,fontSize:'14px'}}>{d.deal_name}</td><td><span style={{fontSize:'12px',padding:'2px 7px',borderRadius:'4px',background:(STAGE_COLORS?.[d.stage]||'#6b7280')+'22',color:STAGE_COLORS?.[d.stage]||'#6b7280',fontWeight:600}}>{d.stage}</span></td><td style={{textAlign:'right',fontFamily:'var(--font-mono)',fontSize:'13px',color:'var(--accent)',fontWeight:600}}>{d.deal_value?fmt.price(d.deal_value):'—'}</td><td style={{textAlign:'right',fontFamily:'var(--font-mono)',fontSize:'13px',color:'#22c55e'}}>{d.commission_est?fmt.price(d.commission_est):'—'}</td></tr>))}</tbody></table></div>}</div>);})()}

      {activeTab==='contacts'&&(()=>{const rows=sortFilter(linkedContacts,['name','company','title','contact_type','phone']);return(<div className="card"><SH title="Contacts" count={linkedContacts.length} /><FB ph="Filter contacts..." />{rows.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)',padding:'16px 0'}}>None</div>:<div className="table-container" style={{overflowX:'auto'}}><table><thead><tr><Th field="name">Name</Th><Th field="company">Company</Th><Th field="contact_type">Type</Th><Th field="phone">Phone</Th></tr></thead><tbody>{rows.map(c=>(<tr key={c.id} onClick={()=>onContactClick?.(c)} style={{cursor:'pointer'}}><td style={{fontWeight:500,fontSize:'14px'}}>{c.name}</td><td style={{fontSize:'13px'}}>{c.company||'—'}</td><td>{c.contact_type&&<span className="tag tag-blue" style={{fontSize:'11px'}}>{c.contact_type}</span>}</td><td style={{fontFamily:'var(--font-mono)',fontSize:'13px'}}>{c.phone||'—'}</td></tr>))}</tbody></table></div>}</div>);})()}

      {activeTab==='comps'&&(()=>{const lr=sortFilter(displayLC,['address','tenant','lease_type']);const sr=sortFilter(displaySC,['address','buyer','sale_type']);return(<div style={{display:'flex',flexDirection:'column',gap:'16px'}}><div className="card"><SH title="Lease Comps" count={displayLC.length} /><FB ph="Filter..." />{lr.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)'}}>None</div>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><Th field="address">Address</Th><Th field="tenant">Tenant</Th><Th field="rsf" align="right">SF</Th><Th field="rate" align="right">Rate</Th><Th field="lease_type">Type</Th><Th field="term_months" align="right">Term</Th></tr></thead><tbody>{lr.map(c=>(<tr key={c.id} onClick={()=>onLeaseCompClick?.(c)} style={{borderBottom:'1px solid var(--border-subtle)',cursor:'pointer'}}><td style={{padding:'8px 10px',fontSize:'14px',fontWeight:500}}>{c.address}</td><td style={{padding:'8px 10px',fontSize:'13px',color:'var(--text-muted)'}}>{c.tenant||'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right'}}>{c.rsf?c.rsf.toLocaleString():'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right',color:'var(--accent)',fontWeight:600}}>${c.rate}/SF</td><td style={{padding:'8px 10px',fontSize:'13px'}}>{c.lease_type||'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right'}}>{c.term_months?c.term_months+'mo':'—'}</td></tr>))}</tbody></table></div>}</div><div className="card"><SH title="Sale Comps" count={displaySC.length} />{sr.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)'}}>None</div>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><Th field="address">Address</Th><Th field="building_sf" align="right">SF</Th><Th field="sale_price" align="right">Price</Th><Th field="price_psf" align="right">$/SF</Th><Th field="cap_rate" align="right">Cap</Th><Th field="buyer">Buyer</Th></tr></thead><tbody>{sr.map(c=>(<tr key={c.id} style={{borderBottom:'1px solid var(--border-subtle)'}}><td style={{padding:'8px 10px',fontSize:'14px',fontWeight:500}}>{c.address}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right'}}>{c.building_sf?c.building_sf.toLocaleString():'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right'}}>{c.sale_price?fmt.price(c.sale_price):'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right',color:'var(--accent)',fontWeight:600}}>{c.price_psf?'$'+Math.round(c.price_psf):'—'}</td><td style={{padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'right'}}>{c.cap_rate?parseFloat(c.cap_rate).toFixed(2)+'%':'—'}</td><td style={{padding:'8px 10px',fontSize:'13px'}}>{c.buyer||'—'}</td></tr>))}</tbody></table></div>}</div></div>);})()}

      {activeTab==='buyers'&&<div className="card"><BuyerMatching property={p} accounts={accounts||[]} onAccountClick={onAccountClick} /></div>}

      {activeTab==='tasks'&&(()=>{const rows=sortFilter(linkedTasks,['title','priority','due_date']);return(<div className="card"><SH title="Tasks" count={pendingTasks} onAdd={()=>onAddTask?.(p.id)} addLabel="+ Task" /><FB ph="Filter tasks..." />{rows.length===0?<div style={{fontSize:'14px',color:'var(--text-muted)',padding:'16px 0'}}>None</div>:<div className="table-container" style={{overflowX:'auto'}}><table><thead><tr><Th field="completed">✓</Th><Th field="title">Task</Th><Th field="priority">Priority</Th><Th field="due_date">Due</Th></tr></thead><tbody>{rows.map(t=>{const pc={High:'#ef4444',Medium:'#f59e0b',Low:'#6b7280'}[t.priority]||'#6b7280';const od=!t.completed&&t.due_date&&new Date(t.due_date)<new Date();return(<tr key={t.id} style={{opacity:t.completed?0.6:1}}><td style={{width:'40px',textAlign:'center'}}><div style={{width:'14px',height:'14px',borderRadius:'3px',margin:'0 auto',border:'2px solid',borderColor:t.completed?'var(--accent)':pc,background:t.completed?'var(--accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'10px'}}>{t.completed?'✓':''}</div></td><td style={{fontSize:'14px',fontWeight:500,textDecoration:t.completed?'line-through':'none'}}>{t.title}</td><td><span style={{fontSize:'12px',padding:'1px 6px',borderRadius:'3px',background:pc+'22',color:pc,fontWeight:600}}>{t.priority}</span></td><td style={{fontFamily:'var(--font-mono)',fontSize:'13px',color:od?'var(--red)':'var(--text-muted)'}}>{od?'⚠ ':''}{t.due_date||'—'}</td></tr>);})}</tbody></table></div>}</div>);})()}

      {editing&&<EditPropertyModal property={p} onClose={()=>setEditing(false)} onSave={()=>{setEditing(false);showToast?.('Updated');onRefresh?.();}} />}
    </div>
  );
}
