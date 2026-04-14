'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getCatalystStyle, getScoreRing, CATALYST_TAGS } from '@/lib/catalyst-constants';

function parseCatalysts(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(c => typeof c === 'string' ? { tag: c } : c);
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p.map(c => typeof c === 'string' ? { tag: c } : c);
      return [typeof p === 'string' ? { tag: p } : p];
    } catch { return [{ tag: raw }]; }
  }
  if (typeof raw === 'object') return [raw];
  return [];
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function fmtShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

const WARN_STAGES = ['WARN notice filed','Closure confirmed permanent','Identify decision maker','Contact property owner','Qualify relocation needs','Convert to active deal'];
const STD_STAGES  = ['New','Researching','Decision Maker Identified','Contacted','Converted'];
const ICON_BG     = { call:'var(--blue-bg)', note:'var(--amber-bg)', alert:'var(--rust-bg)', email:'rgba(88,56,160,0.1)', task:'var(--green-bg)' };
const ICON_COLOR  = { call:'var(--blue)', note:'var(--amber)', alert:'var(--rust)', email:'var(--purple)', task:'var(--green)' };
const TABS = ['Timeline','Outreach Log','APNs','Lease Comps','Contacts','Properties','Files'];
const OUTREACH_METHODS  = ['Call','Email','Text','In-Person','Letter','LinkedIn'];
const OUTREACH_OUTCOMES = ['Left Voicemail','Spoke — Interested','Spoke — Not Interested','Spoke — Follow Up','No Answer','Bounced','Meeting Scheduled','Offer Made'];

export default function LeadDetail({ lead, onClose, onRefresh, fullPage = false, onTagFilter }) {
  const router = useRouter();
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  const [activities,       setActivities]      = useState([]);
  const [contacts,         setContacts]        = useState([]);
  const [apns,             setApns]            = useState([]);
  const [outreachLog,      setOutreachLog]     = useState([]);
  const [synth,            setSynth]           = useState(lead?.ai_synthesis || '');
  const [synthTs,          setSynthTs]         = useState(lead?.ai_synthesis_at || null);
  const [synthOpen,        setSynthOpen]       = useState(true);
  const [synthLoading,     setSynthLoading]    = useState(false);
  const [specsOpen,        setSpecsOpen]       = useState(false);
  const [activeTab,        setActiveTab]       = useState('Timeline');
  const [logPanel,         setLogPanel]        = useState(null);
  const [logText,          setLogText]         = useState('');
  const [logContact,       setLogContact]      = useState('');
  const [editing,          setEditing]         = useState(false);
  const [saving,           setSaving]          = useState(false);
  const [showTagPicker,    setShowTagPicker]   = useState(false);
  const [cadence,          setCadence]         = useState(lead?.follow_up_cadence || lead?.cadence || '');
  const [nextFollowUp,     setNextFollowUp]    = useState(lead?.follow_up_date || '');
  const [showOutreachForm, setShowOutreachForm]= useState(false);
  const [outreachForm,     setOutreachForm]    = useState({ method:'Call', outcome:'', contact_name:'', notes:'', outreach_date: new Date().toISOString().split('T')[0] });
  const [savingOutreach,   setSavingOutreach]  = useState(false);

  const [form, setForm] = useState({
    lead_name:lead?.lead_name||'', company:lead?.company||'', address:lead?.address||'',
    city:lead?.city||'', market:lead?.market||'', building_sf:lead?.building_sf||'',
    land_acres:lead?.land_acres||'', clear_height:lead?.clear_height||'',
    dock_doors:lead?.dock_doors||'', grade_doors:lead?.grade_doors||'',
    year_built:lead?.year_built||'', zoning:lead?.zoning||'', power_amps:lead?.power_amps||'',
    parking_spaces:lead?.parking_spaces||'', stage:lead?.stage||'New',
    priority:lead?.priority||'Medium', owner_type:lead?.owner_type||'',
    source:lead?.source||'', score:lead?.score||'', notes:lead?.notes||'',
    decision_maker:lead?.decision_maker||'', phone:lead?.phone||'', email:lead?.email||'',
    lat:lead?.lat||'', lng:lead?.lng||'',
  });

  const l = lead || {};
  const catalysts = parseCatalysts(l.catalyst_tags);
  const score = l.score || 0;
  const { grade } = getScoreRing(score);
  const isWarn = catalysts.some(c => (c?.tag||'').toLowerCase().includes('warn'));
  const isOverdue = nextFollowUp && new Date(nextFollowUp) < new Date();
  const stages = isWarn ? WARN_STAGES : STD_STAGES;
  const stageIdx = isWarn ? (() => {
    const s = (l.stage||'').toLowerCase();
    if (s.includes('convert')||s.includes('active deal')) return 5;
    if (s.includes('qualify')) return 4;
    if (s.includes('contact')) return 3;
    if (s.includes('decision')||s.includes('dm')) return 2;
    if (s.includes('permanent')||s.includes('confirm')) return 1;
    return 0;
  })() : Math.max(0, STD_STAGES.indexOf(l.stage||'New'));

  useEffect(() => { if (l.id) { loadActivities(); loadContacts(); loadApns(); loadOutreachLog(); } }, [l.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || mapInst.current || !mapRef.current) return;
    import('leaflet').then(Lmod => {
      const L = Lmod.default || Lmod;
      if (mapInst.current) return;
      const lat = parseFloat(l.lat) || 34.0522;
      const lng = parseFloat(l.lng) || -117.9310;
      const map = L.map(mapRef.current, { center:[lat,lng], zoom:16, zoomControl:false, scrollWheelZoom:false, dragging:false, doubleClickZoom:false, attributionControl:false });
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:20 }).addTo(map);
      const icon = L.divIcon({ className:'', html:'<div style="width:14px;height:14px;border-radius:50%;background:#B83714;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>', iconSize:[14,14], iconAnchor:[7,7] });
      L.marker([lat,lng], { icon }).addTo(map);
      mapInst.current = map;
    }).catch(e => console.error('Leaflet:', e));
    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, [l.lat, l.lng]);

  async function loadActivities() {
    try { const sb = createClient(); const { data } = await sb.from('activities').select('*').eq('lead_id', l.id).order('created_at', { ascending:false }).limit(30); setActivities(data||[]); } catch {}
  }
  async function loadContacts() {
    try { const sb = createClient(); const { data } = await sb.from('contacts').select('*').eq('lead_id', l.id); setContacts(data||[]); } catch {}
  }
  async function loadApns() {
    try { const sb = createClient(); const { data } = await sb.from('property_apns').select('*').eq('lead_id', l.id); setApns(data||[]); } catch {}
  }
  async function loadOutreachLog() {
    try { const sb = createClient(); const { data } = await sb.from('buyer_outreach').select('*').eq('lead_id', l.id).order('outreach_date', { ascending:false }).limit(50); setOutreachLog(data||[]); } catch {}
  }

  async function runSynthesis() {
    setSynthLoading(true);
    try {
      const acts = activities.slice(0,5).map(a => `${a.activity_type||a.subject}: ${a.notes||''}`).join(' | ');
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Senior CRE broker analyzing industrial real estate lead in SGV/IE Southern California.

LEAD: ${l.lead_name||l.company} | ${l.address||'—'}, ${l.city||''}
Market: ${l.market||'—'} | SF: ${l.building_sf ? Number(l.building_sf).toLocaleString()+' SF' : '—'} | Clear: ${l.clear_height ? l.clear_height+"'" : '—'} | Docks: ${l.dock_doors||'—'} | Built: ${l.year_built||'—'}
Owner: ${l.owner_type||'—'} | Stage: ${l.stage||'New'} | Score: ${score}/100 (${grade})
Catalysts: ${catalysts.map(c=>c?.tag||c).join(', ')||'None'}
Notes: ${l.notes||'None'} | DM: ${l.decision_maker||'Not identified'}
Activity: ${acts||'None'}

Write synthesis with these exact sections:
Current Situation (2-3 bullets starting with –)
Key Contacts (1-2 bullets starting with –)
Recommended Next Steps (3 numbered: 1. Today: ... 2. 48 hrs: ... 3. Week 1: ...)
Critical insight sentence at end (bold key phrase)

Be specific, reference actual data, 180 words max.`
          }]
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'Synthesis unavailable.';
      setSynth(text);
      setSynthTs(new Date().toISOString());
      const sb = createClient();
      await sb.from('leads').update({ ai_synthesis: text, ai_synthesis_at: new Date().toISOString() }).eq('id', l.id);
      onRefresh?.();
    } catch(e) {
      setSynth('Unable to generate synthesis — check AI API connection.');
    } finally {
      setSynthLoading(false);
    }
  }

  async function logActivity(type) {
    if (!logText.trim()) { alert('Add notes first.'); return; }
    setSaving(true);
    try {
      const sb = createClient();
      await sb.from('activities').insert({ lead_id:l.id, activity_type:type, subject:type==='call'?'Phone Call':type==='email'?'Email':type==='task'?'Task':'Note', notes:logText, activity_date:new Date().toISOString().split('T')[0], completed:false });
      setLogPanel(null); setLogText(''); setLogContact('');
      loadActivities(); onRefresh?.();
    } catch(e) { alert('Error: '+e.message); }
    finally { setSaving(false); }
  }

  async function saveOutreach() {
    if (!outreachForm.outcome) { alert('Select an outcome first.'); return; }
    setSavingOutreach(true);
    try {
      const sb = createClient();
      await sb.from('buyer_outreach').insert({ lead_id:l.id, direction:'outbound', method:outreachForm.method, outcome:outreachForm.outcome, contact_name:outreachForm.contact_name||null, notes:outreachForm.notes||null, outreach_date:outreachForm.outreach_date });
      setShowOutreachForm(false);
      setOutreachForm({ method:'Call', outcome:'', contact_name:'', notes:'', outreach_date: new Date().toISOString().split('T')[0] });
      loadOutreachLog(); onRefresh?.();
    } catch(e) { alert('Error: '+e.message); }
    finally { setSavingOutreach(false); }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const sb = createClient();
      const { error } = await sb.from('leads').update({
        lead_name:form.lead_name, company:form.company, address:form.address, city:form.city, market:form.market,
        building_sf:form.building_sf?parseInt(String(form.building_sf).replace(/,/g,'')):null,
        land_acres:form.land_acres?parseFloat(form.land_acres):null,
        clear_height:form.clear_height?parseFloat(form.clear_height):null,
        dock_doors:form.dock_doors?parseInt(form.dock_doors):null,
        grade_doors:form.grade_doors?parseInt(form.grade_doors):null,
        year_built:form.year_built?parseInt(form.year_built):null,
        zoning:form.zoning||null, power_amps:form.power_amps||null,
        parking_spaces:form.parking_spaces?parseInt(form.parking_spaces):null,
        stage:form.stage, priority:form.priority, owner_type:form.owner_type||null,
        source:form.source||null, score:form.score?Number(form.score):null,
        notes:form.notes||null, decision_maker:form.decision_maker||null,
        phone:form.phone||null, email:form.email||null,
        lat:form.lat?parseFloat(form.lat):null, lng:form.lng?parseFloat(form.lng):null,
        updated_at:new Date().toISOString(),
      }).eq('id', l.id);
      if (error) throw error;
      setEditing(false); onRefresh?.();
    } catch(e) { alert('Error: '+e.message); }
    finally { setSaving(false); }
  }

  async function updateStage(newStage) {
    try {
      const sb = createClient();
      await sb.from('leads').update({ stage: newStage, updated_at: new Date().toISOString() }).eq('id', l.id);
      onRefresh?.();
    } catch(e) { alert('Error: '+e.message); }
  }

  async function setCadenceAndTask(val) {
    setCadence(val); if (!val) return;
    const days = { Daily:1, Weekly:7, Biweekly:14, Monthly:30, Quarterly:90 }[val]||7;
    const next = new Date(); next.setDate(next.getDate()+days);
    const dateStr = next.toISOString().split('T')[0];
    setNextFollowUp(dateStr);
    try {
      const sb = createClient();
      await sb.from('leads').update({ follow_up_cadence:val, follow_up_date:dateStr }).eq('id', l.id);
      await sb.from('tasks').insert({ title:`Follow up — ${l.lead_name||l.company}`, lead_id:l.id, due_date:dateStr, priority:l.priority||'Medium', notes:`${val} cadence`, status:'Pending' });
      onRefresh?.();
    } catch {}
  }

  async function addTag(tagName) {
    const current = parseCatalysts(l.catalyst_tags);
    if (current.some(c=>(c?.tag||c)===tagName)) { setShowTagPicker(false); return; }
    const meta = CATALYST_TAGS.find(t=>t.tag===tagName);
    const updated = [...current, { tag:tagName, category:meta?.category||'asset', priority:meta?.priority||'MED' }];
    try { const sb = createClient(); await sb.from('leads').update({ catalyst_tags:JSON.stringify(updated) }).eq('id', l.id); setShowTagPicker(false); onRefresh?.(); } catch(e) { alert(e.message); }
  }

  async function removeTag(tagName) {
    const updated = parseCatalysts(l.catalyst_tags).filter(c=>(c?.tag||c)!==tagName);
    try { const sb = createClient(); await sb.from('leads').update({ catalyst_tags:JSON.stringify(updated) }).eq('id', l.id); onRefresh?.(); } catch {}
  }

  async function convertToDeal() {
    if (!confirm(`Convert "${l.lead_name||l.company}" to active deal?`)) return;
    try {
      const sb = createClient();
      const { data:deal, error } = await sb.from('deals').insert({ deal_name:l.lead_name||l.company, address:l.address, market:l.market, stage:'Tracking', lead_id:l.id, notes:l.notes }).select('id').single();
      if (error) throw error;
      await sb.from('leads').update({ stage:'Converted', converted_deal_id:deal.id }).eq('id', l.id);
      onRefresh?.(); router.push(`/deals/${deal.id}`);
    } catch(e) { alert('Error: '+e.message); }
  }

  async function createProperty() {
    if (!l.address) { alert('This lead needs an address before creating a property.'); return; }
    if (!confirm(`Create a property record for ${l.address}?`)) return;
    try {
      const sb = createClient();
      const { data:prop, error } = await sb.from('properties').insert({
        address:l.address, city:l.city, market:l.market,
        building_sf:l.building_sf, land_acres:l.land_acres, clear_height:l.clear_height,
        dock_doors:l.dock_doors, year_built:l.year_built, zoning:l.zoning,
        owner:l.company||l.lead_name, owner_type:l.owner_type,
        prop_type:l.prop_type||'Warehouse', notes:l.notes, lat:l.lat, lng:l.lng,
      }).select('id').single();
      if (error) throw error;
      onRefresh?.();
      router.push(`/properties/${prop.id}`);
    } catch(e) { alert('Error creating property: '+e.message); }
  }

  const iS = { width:'100%', padding:'8px 12px', borderRadius:7, border:'1px solid var(--card-border)', background:'rgba(0,0,0,0.025)', fontFamily:'var(--font-ui)', fontSize:14, color:'var(--text-primary)', outline:'none' };
  const lS = { fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-tertiary)', marginBottom:5, display:'block' };
  const btn = { display:'inline-flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:7, fontFamily:'var(--font-ui)', fontSize:12.5, fontWeight:500, cursor:'pointer', border:'1px solid var(--card-border)', background:'var(--card-bg)', color:'var(--text-secondary)', whiteSpace:'nowrap' };
  const card = { background:'var(--card-bg)', borderRadius:10, boxShadow:'0 1px 4px rgba(0,0,0,0.08)', border:'1px solid rgba(0,0,0,0.06)', overflow:'hidden' };
  const spRow = (k, v, vStyle={}) => (
    <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 16px', borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
      <span style={{ fontSize:12.5, color:'var(--text-tertiary)' }}>{k}</span>
      <span style={{ fontSize:13, color:'var(--text-primary)', textAlign:'right', maxWidth:160, ...vStyle }}>{v||'—'}</span>
    </div>
  );
  const methodColor = { Call:'var(--blue)', Email:'var(--purple)', Text:'var(--green)', 'In-Person':'var(--rust)', Letter:'var(--amber)', LinkedIn:'var(--blue)' };

  return (
    <div style={{ fontFamily:'var(--font-ui)', background:'var(--bg)' }}>

      {/* TOPBAR */}
      <div style={{ height:48, background:'var(--card-bg)', borderBottom:'1px solid var(--card-border)', display:'flex', alignItems:'center', padding:'0 28px', gap:8, position:'sticky', top:0, zIndex:10, boxShadow:'0 1px 0 rgba(0,0,0,0.05)', overflowX:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:13, color:'var(--text-tertiary)', flexShrink:0 }}>
          <span style={{ cursor:'pointer', color:'var(--blue)' }} onClick={()=>router.push('/leads')}>Lead Gen</span>
          <span style={{ opacity:.4, margin:'0 4px' }}>›</span>
          <span style={{ color:'var(--text-primary)', fontWeight:500 }}>{l.lead_name||l.company}</span>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:7, flexShrink:0 }}>
          <button style={btn} onClick={()=>setEditing(e=>!e)}>Edit</button>
          <button style={btn} onClick={()=>setLogPanel(p=>p==='note'?null:'note')}>+ Activity</button>
          <button style={btn} onClick={()=>setLogPanel(p=>p==='task'?null:'task')}>+ Task</button>
          <a href={`https://maps.google.com/?q=${encodeURIComponent((l.address||'')+' '+(l.city||''))}`} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration:'none' }}>Google Maps</a>
          <a href={`https://www.costar.com/search#?q=${encodeURIComponent((l.address||'')+(l.city?', '+l.city:''))}&t=2`} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration:'none' }}>CoStar</a>
          <button style={{ ...btn, background:'rgba(78,110,150,0.10)', borderColor:'rgba(78,110,150,0.30)', color:'var(--blue)', fontWeight:600 }} onClick={createProperty}>Create Property</button>
          <button style={{ ...btn, background:'var(--green)', borderColor:'var(--green)', color:'#fff', fontWeight:600 }} onClick={convertToDeal}>Convert to Deal</button>
        </div>
      </div>

      {/* HERO */}
      <div style={{ height:280, position:'relative', overflow:'hidden' }}>
        <div ref={mapRef} style={{ width:'100%', height:280 }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(10,8,5,0.82) 0%,rgba(10,8,5,0.15) 55%,transparent 100%)', pointerEvents:'none', zIndex:400 }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:500, padding:'20px 28px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:'#fff', lineHeight:1, marginBottom:7, textShadow:'0 2px 8px rgba(0,0,0,0.5)' }}>
            {l.lead_name||l.company}{l.address ? ` — ${l.address}` : ''}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {isWarn && <span style={H.rust}>WARN{l.workers ? ` · ${l.workers} Workers` : ''}</span>}
            {l.market && <span style={H.blue}>{l.market}</span>}
            {l.building_sf && <span style={H.amber}>{Number(l.building_sf).toLocaleString()} SF{l.owner_type ? ` · ${l.owner_type}` : ''}</span>}
            {score > 0 && <span style={H.blue}>Score {score} · {grade}</span>}
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div style={{ background:'var(--bg)', borderBottom:'1px solid var(--card-border)', padding:'10px 28px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        {score > 0 && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 14px', background:'var(--card-bg)', border:'1px solid var(--rust-bdr)', borderRadius:8, marginRight:6, flexShrink:0 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>Lead Score</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--rust)' }}>{grade}</div>
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:'var(--rust)', lineHeight:1 }}>{score}</div>
            </div>
            <div style={{ width:1, height:22, background:'var(--card-border)', margin:'0 3px' }} />
          </>
        )}
        <button style={btn} onClick={()=>setLogPanel(p=>p==='call'?null:'call')}>Log Call</button>
        <button style={btn} onClick={()=>setLogPanel(p=>p==='email'?null:'email')}>Log Email</button>
        <button style={btn} onClick={()=>setLogPanel(p=>p==='note'?null:'note')}>Add Note</button>
        <button style={btn} onClick={()=>setLogPanel(p=>p==='task'?null:'task')}>+ Task</button>
        <div style={{ marginLeft:'auto' }} />
        <button style={{ ...btn, background:'rgba(78,110,150,0.10)', borderColor:'rgba(78,110,150,0.30)', color:'var(--blue)', fontWeight:600 }} onClick={createProperty}>Create Property</button>
        <button style={{ ...btn, background:'var(--green)', borderColor:'var(--green)', color:'#fff', fontWeight:600 }} onClick={convertToDeal}>Convert to Deal</button>
      </div>

      {/* LOG PANEL */}
      {logPanel && (
        <div style={{ background:'#F8F6F2', borderBottom:'1px solid var(--card-border)', padding:'14px 28px', display:'flex', gap:12, alignItems:'flex-end' }}>
          <div style={{ flex:1 }}>
            <div style={{ ...lS, marginBottom:6 }}>{logPanel==='call'?'Log Call':logPanel==='email'?'Log Email':logPanel==='note'?'Add Note':'Add Task'}</div>
            <input value={logContact} onChange={e=>setLogContact(e.target.value)} placeholder="Contact name (optional)" style={{ ...iS, marginBottom:8, fontSize:13 }} />
            <textarea value={logText} onChange={e=>setLogText(e.target.value)} placeholder={`Notes for this ${logPanel}...`} style={{ ...iS, resize:'vertical', minHeight:72 }} />
          </div>
          <button style={btn} onClick={()=>{setLogPanel(null);setLogText('');setLogContact('');}}>Cancel</button>
          <button style={{ ...btn, background:'var(--blue)', borderColor:'var(--blue)', color:'#fff' }} onClick={()=>logActivity(logPanel)} disabled={saving}>{saving?'Saving...':'Save'}</button>
        </div>
      )}

      {/* EDIT FORM */}
      {editing && (
        <div style={{ background:'#F8F6F2', borderBottom:'1px solid var(--card-border)', padding:'20px 28px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <span style={{ fontSize:14, fontWeight:600 }}>Edit Lead</span>
            <div style={{ display:'flex', gap:8 }}>
              <button style={btn} onClick={()=>setEditing(false)}>Cancel</button>
              <button style={{ ...btn, background:'var(--blue)', borderColor:'var(--blue)', color:'#fff' }} onClick={saveEdit} disabled={saving}>{saving?'Saving...':'Save'}</button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[['lead_name','Lead Name'],['company','Company'],['address','Address'],['city','City'],['market','Market'],['building_sf','Building SF'],['land_acres','Land (AC)'],['clear_height','Clear Ht (ft)'],['dock_doors','Dock Doors'],['grade_doors','Grade Doors'],['year_built','Year Built'],['zoning','Zoning'],['power_amps','Power (A)'],['parking_spaces','Parking'],['decision_maker','Decision Maker'],['phone','Phone'],['email','Email'],['lat','Latitude'],['lng','Longitude']].map(([k,label])=>(
              <div key={k}><label style={lS}>{label}</label><input style={iS} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} /></div>
            ))}
            <div><label style={lS}>Stage</label><select style={iS} value={form.stage} onChange={e=>setForm(f=>({...f,stage:e.target.value}))}>{STD_STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label style={lS}>Owner Type</label><select style={iS} value={form.owner_type} onChange={e=>setForm(f=>({...f,owner_type:e.target.value}))}><option value="">Select...</option>{['Owner-User','Private LLC','Family Trust','Corp','Individual','REIT','Institutional'].map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label style={lS}>Priority</label><select style={iS} value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>{['Critical','High','Medium','Low'].map(p=><option key={p}>{p}</option>)}</select></div>
            <div><label style={lS}>Score</label><input type="number" style={iS} value={form.score||''} onChange={e=>setForm(f=>({...f,score:e.target.value}))} min={1} max={100} /></div>
            <div style={{ gridColumn:'1/-1' }}><label style={lS}>Notes</label><textarea style={{ ...iS, minHeight:80, resize:'vertical' }} value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          </div>
        </div>
      )}

      {/* INNER CONTENT */}
      <div style={{ padding:'18px 28px 0' }}>

        {/* AI SYNTHESIS */}
        <div style={{ ...card, border:'1px solid rgba(88,56,160,0.18)', borderLeft:'3px solid var(--purple)', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px 11px 20px', borderBottom:'1px solid rgba(88,56,160,0.12)', cursor:'pointer' }} onClick={()=>setSynthOpen(o=>!o)}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, color:'var(--purple)' }}>✦</span>
              <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--purple)' }}>AI Synthesis</span>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:12.5, fontStyle:'italic', color:'var(--text-tertiary)' }}>Lead Intelligence Report · {l.lead_name||l.company}</span>
            </div>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, fontStyle:'italic', color:'var(--purple)' }}>{synthOpen ? 'Hide ▴' : 'Show ▾'}</span>
          </div>
          {synthOpen && (
            <div style={{ padding:'16px 22px 18px' }}>
              {synthLoading
                ? <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--purple)', fontSize:13.5 }}><div className="cl-spinner" style={{ width:16, height:16, borderColor:'rgba(88,56,160,0.15)', borderTopColor:'var(--purple)' }} />Generating intelligence synthesis...</div>
                : synth
                  ? <div style={{ fontSize:13.5, lineHeight:1.75, color:'var(--text-primary)', whiteSpace:'pre-wrap' }}>{synth}</div>
                  : <div style={{ fontSize:13.5, color:'var(--text-tertiary)', fontStyle:'italic' }}>No synthesis yet — click Generate to create an AI intelligence report for this lead.</div>
              }
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 22px', borderTop:'1px solid rgba(88,56,160,0.10)', background:'rgba(88,56,160,0.02)' }}>
            <button onClick={runSynthesis} disabled={synthLoading} style={{ fontSize:12, color:'var(--purple)', cursor:'pointer', background:'none', border:'1px solid rgba(88,56,160,0.22)', borderRadius:6, padding:'4px 11px', fontFamily:'var(--font-ui)' }}>{synth ? '↻ Regenerate' : '✦ Generate'}</button>
            {synth && <button onClick={()=>navigator.clipboard?.writeText(synth)} style={{ fontSize:12, color:'var(--purple)', cursor:'pointer', background:'none', border:'1px solid rgba(88,56,160,0.22)', borderRadius:6, padding:'4px 11px', fontFamily:'var(--font-ui)' }}>Copy</button>}
            {synthTs && <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-tertiary)', marginLeft:'auto' }}>Generated {fmtDate(synthTs)}</span>}
          </div>
        </div>

        {/* STAT ROW */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', background:'var(--card-bg)', borderRadius:10, boxShadow:'0 1px 4px rgba(0,0,0,0.08)', border:'1px solid rgba(0,0,0,0.06)', overflow:'hidden', marginBottom:16 }}>
          {[
            { lbl:'Property SF', val:l.building_sf ? Number(l.building_sf).toLocaleString() : null, sub:l.owner_type||'Industrial' },
            { lbl:'WARN Workers', val:isWarn ? (l.workers||'?') : null, sub:isWarn ? 'Filed '+fmtShort(l.created_at) : '—', rust:isWarn },
            { lbl:'Market Rent', val:l.market_rent ? '$'+l.market_rent+'/SF' : null, sub:'NNN est.', blue:true },
            { lbl:'Est. Value', val:l.est_value ? '$'+(l.est_value/1e6).toFixed(1)+'M' : l.building_sf ? '$'+(Math.round(Number(l.building_sf)*260/1e5)/10).toFixed(1)+'M est.' : null, sub:l.building_sf ? '~$260/SF market' : null },
            { lbl:'Owner', val:l.company||l.lead_name||null, sub:l.owner_type||null, sm:true },
            { lbl:'Lead Score', val:score > 0 ? score : null, sub:`Grade ${grade}`, rust:true },
          ].map((c,i) => (
            <div key={c.lbl} style={{ padding:'13px 14px', borderRight:i<5 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:5, fontFamily:'var(--font-mono)' }}>{c.lbl}</div>
              <div style={{ fontFamily:c.sm ? "'Instrument Sans',sans-serif" : "'Playfair Display',serif", fontWeight:c.sm?400:700, fontSize:c.sm?14:22, color:c.rust?'var(--rust)':c.blue?'var(--blue)':'var(--text-primary)', lineHeight:1 }}>{c.val||'—'}</div>
              {c.sub && <div style={{ fontSize:11, color:c.rust?'var(--rust)':c.blue?'var(--blue)':'var(--text-tertiary)', marginTop:2, fontWeight:c.rust?500:400 }}>{c.sub}</div>}
            </div>
          ))}
        </div>

        {/* BUILDING SCORE CARD */}
        <div style={{ ...card, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid var(--card-border)', cursor:'pointer' }} onClick={()=>setSpecsOpen(o=>!o)}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:50, height:50, borderRadius:'50%', border:'2.5px solid rgba(78,110,150,0.32)', background:'var(--blue-bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'var(--blue)', lineHeight:1 }}>{Math.min(100,(l.clear_height?20:0)+(l.dock_doors?15:0)+(l.year_built&&l.year_built>2000?15:l.year_built>1990?10:5))}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--blue)', marginTop:1 }}>pts</div>
              </div>
              <div>
                <div style={{ fontSize:13.5, fontWeight:500, color:'var(--text-primary)' }}>Building Score{l.clear_height ? ` — ${l.clear_height}' clear` : ''}{l.dock_doors ? ` · ${l.dock_doors} dock-high` : ''}</div>
                <div style={{ fontSize:12, color:'var(--text-tertiary)', marginTop:2 }}>
                  {[l.clear_height&&`${l.clear_height}' clear`, l.dock_doors&&`${l.dock_doors} DH`, l.power_amps&&`${l.power_amps}A`, l.sprinklers].filter(Boolean).join(' · ') || 'Add building specs to score — click Edit above'}
                </div>
              </div>
            </div>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, fontStyle:'italic', color:'var(--blue)' }}>{specsOpen ? 'Hide specs ▴' : 'Show all specs ▾'}</span>
          </div>
          <div style={{ display:'flex' }}>
            {[
              ['Clear Ht', l.clear_height ? `${l.clear_height}'` : '—'],
              ['Dock Doors', l.dock_doors ? `${l.dock_doors} DH${l.grade_doors ? ` · ${l.grade_doors} GL` : ''}` : '—'],
              ['Year Built', l.year_built || '—'],
              ['Land (AC)', l.land_acres || '—'],
              ['Power', l.power_amps ? `${l.power_amps}A` : '—'],
              ['Zoning', l.zoning || '—'],
              ['Parking', l.parking_spaces || '—'],
              ['Prop Type', l.prop_type || 'Industrial'],
            ].map((s,i) => (
              <div key={s[0]} style={{ flex:1, padding:'9px 12px', borderRight:i<7?'1px solid rgba(0,0,0,0.05)':'none', borderTop:'1px solid rgba(0,0,0,0.05)', textAlign:'center' }}>
                <div style={{ fontSize:9.5, color:'var(--text-tertiary)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:3 }}>{s[0]}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:12.5, color:s[1]==='—'?'var(--text-tertiary)':'var(--text-primary)' }}>{s[1]}</div>
              </div>
            ))}
          </div>
          {specsOpen && (
            <div style={{ padding:'14px 18px', borderTop:'1px solid var(--card-border)', background:'rgba(0,0,0,0.01)' }}>
              <div style={{ fontSize:12, color:'var(--text-tertiary)', fontStyle:'italic' }}>To edit building specs, click the Edit button in the top bar above.</div>
            </div>
          )}
        </div>

        {/* TABS */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--card-border)', marginBottom:16 }}>
          {TABS.map(t => (
            <div key={t} onClick={()=>setActiveTab(t)} style={{ padding:'10px 15px', fontSize:13.5, color:activeTab===t?'var(--blue)':'var(--text-tertiary)', cursor:'pointer', borderBottom:`2px solid ${activeTab===t?'var(--blue)':'transparent'}`, marginBottom:-1, whiteSpace:'nowrap', fontWeight:activeTab===t?500:400 }}>
              {t}
              {t==='Timeline' && activities.length>0 && <span style={{ fontFamily:'var(--font-mono)', fontSize:10, background:'rgba(0,0,0,0.06)', borderRadius:20, padding:'1px 6px', marginLeft:4 }}>{activities.length}</span>}
              {t==='Outreach Log' && outreachLog.length>0 && <span style={{ fontFamily:'var(--font-mono)', fontSize:10, background:'rgba(0,0,0,0.06)', borderRadius:20, padding:'1px 6px', marginLeft:4 }}>{outreachLog.length}</span>}
            </div>
          ))}
        </div>

        {/* 2-COL BODY */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 290px', gap:16 }}>
          <div>

            {/* TIMELINE */}
            {activeTab==='Timeline' && (
              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid var(--card-border)' }}>
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)', display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:'var(--rust)' }} /> Activity Timeline
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {['call','email','note','task'].map(type => (
                      <button key={type} onClick={()=>setLogPanel(p=>p===type?null:type)} style={{ padding:'5px 11px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid var(--card-border)', background:logPanel===type?'rgba(78,110,150,0.08)':'var(--card-bg)', borderColor:logPanel===type?'var(--blue-bdr)':'var(--card-border)', color:logPanel===type?'var(--blue)':'var(--text-tertiary)', fontFamily:'var(--font-ui)' }}>
                        {type==='call'?'Log Call':type==='email'?'Log Email':type==='note'?'Note':'+ Follow-Up'}
                      </button>
                    ))}
                  </div>
                </div>
                {activities.length===0
                  ? <div style={{ padding:'36px', textAlign:'center', fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', color:'var(--text-tertiary)', fontSize:15 }}>No activity yet — log a call, email, or note above</div>
                  : activities.map((a,i) => (
                    <div key={a.id||i} style={{ display:'flex', gap:12, padding:'11px 16px', borderBottom:i<activities.length-1?'1px solid rgba(0,0,0,0.04)':'none' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11.5, flexShrink:0, marginTop:1, background:ICON_BG[a.activity_type]||ICON_BG.note, color:ICON_COLOR[a.activity_type]||ICON_COLOR.note }}>
                        {a.activity_type==='call'?'C':a.activity_type==='email'?'E':a.activity_type==='task'?'T':'N'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13.5, color:'var(--text-primary)', lineHeight:1.4 }}>
                          <strong>{a.subject || (a.activity_type?.charAt(0).toUpperCase()+a.activity_type?.slice(1))}</strong>
                          {a.notes && <span style={{ fontWeight:400 }}> — {a.notes}</span>}
                        </div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:12, fontStyle:'italic', color:'var(--text-tertiary)', marginTop:2 }}>Briana Corso · {fmtDate(a.activity_date||a.created_at)}</div>
                      </div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--text-tertiary)', flexShrink:0, paddingTop:2 }}>{fmtShort(a.created_at)}</div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* OUTREACH LOG */}
            {activeTab==='Outreach Log' && (
              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid var(--card-border)' }}>
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)' }}>Owner Outreach Log</div>
                  <button onClick={()=>setShowOutreachForm(p=>!p)} style={{ ...btn, fontSize:12, padding:'5px 11px', background:showOutreachForm?'rgba(78,110,150,0.08)':'var(--card-bg)', borderColor:showOutreachForm?'var(--blue-bdr)':'var(--card-border)', color:showOutreachForm?'var(--blue)':'var(--text-secondary)' }}>
                    {showOutreachForm ? 'Cancel' : '+ Log Outreach'}
                  </button>
                </div>
                {showOutreachForm && (
                  <div style={{ padding:'16px', borderBottom:'1px solid var(--card-border)', background:'rgba(78,110,150,0.03)' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                      <div><label style={lS}>Method</label><select style={iS} value={outreachForm.method} onChange={e=>setOutreachForm(f=>({...f,method:e.target.value}))}>{OUTREACH_METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
                      <div><label style={lS}>Outcome *</label><select style={{ ...iS, borderColor:outreachForm.outcome?'var(--card-border)':'var(--amber)' }} value={outreachForm.outcome} onChange={e=>setOutreachForm(f=>({...f,outcome:e.target.value}))}><option value="">Select outcome...</option>{OUTREACH_OUTCOMES.map(o=><option key={o}>{o}</option>)}</select></div>
                      <div><label style={lS}>Date</label><input type="date" style={iS} value={outreachForm.outreach_date} onChange={e=>setOutreachForm(f=>({...f,outreach_date:e.target.value}))} /></div>
                    </div>
                    <div style={{ marginBottom:10 }}><label style={lS}>Contact Name</label><input style={iS} value={outreachForm.contact_name} onChange={e=>setOutreachForm(f=>({...f,contact_name:e.target.value}))} placeholder="Who did you reach?" /></div>
                    <div style={{ marginBottom:12 }}><label style={lS}>Notes</label><textarea style={{ ...iS, minHeight:68, resize:'vertical' }} value={outreachForm.notes} onChange={e=>setOutreachForm(f=>({...f,notes:e.target.value}))} placeholder="What was discussed?" /></div>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                      <button style={btn} onClick={()=>setShowOutreachForm(false)}>Cancel</button>
                      <button style={{ ...btn, background:'var(--blue)', borderColor:'var(--blue)', color:'#fff' }} onClick={saveOutreach} disabled={savingOutreach}>{savingOutreach?'Saving...':'Save Outreach'}</button>
                    </div>
                  </div>
                )}
                {outreachLog.length===0
                  ? <div style={{ padding:'36px', textAlign:'center', fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', color:'var(--text-tertiary)', fontSize:15 }}>No outreach logged yet — click "+ Log Outreach" above</div>
                  : outreachLog.map((entry,i) => (
                    <div key={entry.id||i} style={{ display:'flex', gap:12, padding:'12px 16px', borderBottom:i<outreachLog.length-1?'1px solid rgba(0,0,0,0.04)':'none' }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:`${methodColor[entry.method]||'var(--blue)'}18`, border:`1px solid ${methodColor[entry.method]||'var(--blue)'}40`, fontSize:12, color:methodColor[entry.method]||'var(--blue)', fontWeight:600 }}>
                        {(entry.method||'?')[0]}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{entry.method}</span>
                          {entry.outcome && (
                            <span style={{ fontSize:11, padding:'1px 7px', borderRadius:4, background:entry.outcome.includes('Interested')&&!entry.outcome.includes('Not')?'var(--green-bg)':entry.outcome.includes('Not Interested')?'var(--rust-bg)':'rgba(0,0,0,0.06)', color:entry.outcome.includes('Interested')&&!entry.outcome.includes('Not')?'var(--green)':entry.outcome.includes('Not Interested')?'var(--rust)':'var(--text-tertiary)', border:'1px solid rgba(0,0,0,0.08)' }}>
                              {entry.outcome}
                            </span>
                          )}
                          {entry.contact_name && <span style={{ fontSize:12, color:'var(--text-tertiary)' }}>· {entry.contact_name}</span>}
                        </div>
                        {entry.notes && <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.45 }}>{entry.notes}</div>}
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:12, fontStyle:'italic', color:'var(--text-tertiary)', marginTop:3 }}>{fmtDate(entry.outreach_date||entry.created_at)}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab==='APNs' && (
              <div style={card}>
                <div style={{ padding:'11px 16px', borderBottom:'1px solid var(--card-border)', fontSize:11, fontWeight:500, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)' }}>APNs</div>
                {apns.length===0
                  ? <div style={{ padding:'32px', textAlign:'center', fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', color:'var(--text-tertiary)', fontSize:15 }}>No APNs linked</div>
                  : apns.map((apn,i) => (
                    <div key={apn.id||i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 16px', borderBottom:i<apns.length-1?'1px solid rgba(0,0,0,0.04)':'none' }}>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:14 }}>{apn.apn}</span>
                      <a href={`https://portal.assessor.lacounty.gov/parceldetail/${String(apn.apn).replace(/-/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:'var(--blue)' }}>LA County GIS →</a>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab==='Contacts' && (
              <div style={card}>
                <div style={{ padding:'11px 16px', borderBottom:'1px solid var(--card-border)', fontSize:11, fontWeight:500, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)' }}>Contacts</div>
                {contacts.length===0 && l.decision_maker
                  ? <div style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div><div style={{ fontSize:15, fontWeight:500 }}>{l.decision_maker}</div><div style={{ fontSize:13, color:'var(--text-tertiary)', marginTop:2 }}>Decision Maker</div></div>
                      <div style={{ display:'flex', gap:10 }}>
                        {l.phone && <a href={`tel:${l.phone}`} style={{ fontSize:14, color:'var(--blue)', textDecoration:'none' }}>{l.phone}</a>}
                        {l.email && <a href={`mailto:${l.email}`} style={{ fontSize:14, color:'var(--blue)', textDecoration:'none' }}>{l.email}</a>}
                      </div>
                    </div>
                  : contacts.length===0
                    ? <div style={{ padding:'32px', textAlign:'center', fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', color:'var(--text-tertiary)', fontSize:15 }}>No contacts linked yet</div>
                    : contacts.map((c,i) => (
                      <div key={c.id||i} style={{ padding:'12px 16px', borderBottom:i<contacts.length-1?'1px solid rgba(0,0,0,0.04)':'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div><div style={{ fontSize:15, fontWeight:500 }}>{c.name||c.full_name}</div><div style={{ fontSize:13, color:'var(--text-tertiary)', marginTop:2 }}>{c.title}{c.company ? ` · ${c.company}` : ''}</div></div>
                        {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize:14, color:'var(--blue)', textDecoration:'none' }}>{c.phone}</a>}
                      </div>
                    ))
                }
              </div>
            )}

            {(activeTab==='Lease Comps'||activeTab==='Properties'||activeTab==='Files') && (
              <div style={{ ...card, padding:'40px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', color:'var(--text-tertiary)', fontSize:15 }}>{activeTab==='Files' ? 'No files attached yet' : activeTab+' coming soon'}</div>
              </div>
            )}
          </div>

          {/* RIGHT COL */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* Displacement Signal */}
            <div style={{ background:'var(--rust-bg)', border:'1px solid var(--rust-bdr)', borderRadius:10, overflow:'hidden', position:'relative' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:'var(--rust)' }} />
              <div style={{ padding:'10px 14px 10px 18px', borderBottom:'1px solid var(--rust-bdr)', display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'var(--rust)' }} />
                <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--rust)' }}>AI Displacement Signal</span>
              </div>
              <div style={{ padding:'13px 14px 13px 18px', fontSize:13, lineHeight:1.70, color:'var(--text-primary)' }}>
                {isWarn ? 'Permanent closure signals immediate displacement. Industrial vacancy tight.' : `${catalysts.length} active catalyst signal${catalysts.length!==1?'s':''} detected.`}
                {' '}<span style={{ color:'var(--blue)', fontWeight:600 }}>Act within 48 hours</span> before competing brokers identify this site.
              </div>
            </div>

            {/* Active Catalysts */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid var(--card-border)' }}>
                <span style={{ fontSize:11, fontWeight:500, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)' }}>Active Catalysts</span>
                <button onClick={()=>setShowTagPicker(p=>!p)} style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, fontStyle:'italic', color:'var(--blue)', background:'none', border:'none', cursor:'pointer' }}>+ Add</button>
              </div>
              {showTagPicker && (
                <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--card-border)', maxHeight:180, overflowY:'auto' }}>
                  {CATALYST_TAGS.filter(t=>!catalysts.some(c=>(c?.tag||c)===t.tag)).map(t => {
                    const cs = getCatalystStyle(t.tag);
                    return <button key={t.tag} onClick={()=>addTag(t.tag)} style={{ display:'block', width:'100%', textAlign:'left', padding:'5px 8px', marginBottom:2, background:'none', border:`1px solid ${cs.bdr}`, borderRadius:4, cursor:'pointer', fontSize:11.5, color:cs.color, fontFamily:'var(--font-ui)' }}>{t.tag}</button>;
                  })}
                </div>
              )}
              {catalysts.length===0
                ? <div style={{ padding:'12px 16px', fontSize:13, color:'var(--text-tertiary)', fontStyle:'italic' }}>No catalysts tagged yet</div>
                : catalysts.map((c,i) => {
                  const tagName = c?.tag||c;
                  const cs = getCatalystStyle(tagName);
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 16px', borderBottom:i<catalysts.length-1?'1px solid rgba(0,0,0,0.04)':'none' }}>
                      <span
                        onClick={()=>{ if(onTagFilter){ onTagFilter(tagName); } else { router.push(`/leads?tag=${encodeURIComponent(tagName)}`); } }}
                        title={`Filter Lead Gen list by "${tagName}"`}
                        style={{ display:'inline-flex', padding:'2px 7px', borderRadius:4, fontSize:11, fontWeight:500, border:`1px solid ${cs.bdr}`, background:cs.bg, color:cs.color, flexShrink:0, cursor:'pointer', userSelect:'none' }}
                      >{tagName}</span>
                      <span style={{ fontSize:12.5, color:'var(--text-tertiary)', flex:1 }}>{c.priority||''}</span>
                      <button onClick={e=>{e.stopPropagation();removeTag(tagName);}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', fontSize:14, lineHeight:1, padding:0, opacity:0.6 }}>×</button>
                    </div>
                  );
                })
              }
            </div>

            {/* Opportunity Stages — interactive */}
            <div style={card}>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--card-border)', fontSize:11, fontWeight:500, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)' }}>Opportunity Stages</div>
              <div style={{ padding:'8px 0 10px' }}>
                {stages.map((stage,i) => {
                  const isDone = i < stageIdx;
                  const isActive = i === stageIdx;
                  return (
                    <div
                      key={stage}
                      onClick={()=>updateStage(stage)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 16px', borderRadius:7, margin:'2px 8px', cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.03)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      <div style={{ width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, background:isDone?'var(--green-bg)':isActive?'var(--amber-bg)':'rgba(0,0,0,0.04)', border:`1px solid ${isDone?'var(--green-bdr)':isActive?'var(--amber-bdr)':'rgba(0,0,0,0.1)'}`, color:isDone?'var(--green)':isActive?'var(--amber)':'var(--text-tertiary)' }}>
                        {isDone ? '✓' : isActive ? '◉' : '○'}
                      </div>
                      <span style={{ fontSize:13.5, color:isActive?'var(--amber)':isDone?'var(--text-tertiary)':'var(--text-secondary)', fontWeight:isActive?600:400 }}>{stage}</span>
                      {isActive && <span style={{ marginLeft:'auto', fontSize:10, fontFamily:'var(--font-mono)', color:'var(--amber)', opacity:0.7 }}>CURRENT</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Owner */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid var(--card-border)' }}>
                <span style={{ fontSize:11, fontWeight:500, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)' }}>Owner</span>
                <button onClick={createProperty} style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, fontStyle:'italic', color:'var(--blue)', background:'none', border:'none', cursor:'pointer' }}>Create Property →</button>
              </div>
              {spRow('Company', l.company||l.lead_name)}
              {spRow('Type', l.owner_type)}
              {spRow('Contact', l.decision_maker||'Not identified', { color:'var(--blue)' })}
              {l.phone && spRow('Phone', l.phone, { color:'var(--blue)' })}
              {l.email && spRow('Email', l.email, { color:'var(--blue)' })}
            </div>

            {/* Lead Details */}
            <div style={card}>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--card-border)', fontSize:11, fontWeight:500, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)' }}>Lead Details</div>
              {spRow('Stage', l.stage||'New', { color:'var(--blue)', fontWeight:500 })}
              {spRow('Source', l.source)}
              {spRow('Market', l.market)}
              {spRow('Priority', l.priority)}
              {l.zoning && spRow('Zoning', l.zoning, { fontFamily:'var(--font-mono)', fontSize:12 })}
              {apns[0] && spRow('APN', apns[0].apn, { fontFamily:'var(--font-mono)', fontSize:12 })}
            </div>

            {/* Readiness Score */}
            {l.readiness_score > 0 && (
              <div style={card}>
                <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--card-border)', fontSize:11, fontWeight:500, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  Owner Readiness Score
                  {l.institutional_flag && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, background:'rgba(0,0,0,0.06)', color:'var(--text-tertiary)', fontWeight:500 }}>Institutional</span>}
                </div>
                <div style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:52, height:52, borderRadius:'50%', border:`3px solid ${l.readiness_score>=80?'var(--rust)':l.readiness_score>=60?'var(--amber)':l.readiness_score>=40?'var(--blue)':'var(--card-border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:l.readiness_score>=80?'var(--rust)':l.readiness_score>=60?'var(--amber)':l.readiness_score>=40?'var(--blue)':'var(--text-tertiary)' }}>{l.readiness_score}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:l.readiness_score>=80?'var(--rust)':l.readiness_score>=60?'var(--amber)':l.readiness_score>=40?'var(--blue)':'var(--text-tertiary)' }}>
                      {l.readiness_score>=80?'Act Now':l.readiness_score>=60?'Warm':l.readiness_score>=40?'Watch':'Monitor'}
                    </div>
                  </div>
                  {(l.owner_lives_nearby||l.owner_age_55_plus) && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:10 }}>
                      {l.owner_lives_nearby && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:'rgba(26,107,107,0.08)', border:'1px solid rgba(26,107,107,0.28)', color:'#1A6B6B', fontWeight:500 }}>Owner Lives Nearby</span>}
                      {l.owner_age_55_plus && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:'rgba(26,107,107,0.08)', border:'1px solid rgba(26,107,107,0.28)', color:'#1A6B6B', fontWeight:500 }}>Age 55+</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cadence */}
            <div style={{ ...card, padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:10 }}>Follow-up Cadence</div>
              <select value={cadence} onChange={e=>setCadenceAndTask(e.target.value)} style={{ ...iS, fontSize:13.5 }}>
                <option value="">Set cadence...</option>
                {['Daily','Weekly','Biweekly','Monthly','Quarterly'].map(c=><option key={c}>{c}</option>)}
              </select>
              {nextFollowUp && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
                  <span style={{ fontSize:13, color:'var(--text-tertiary)' }}>Next follow-up</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600, color:isOverdue?'var(--rust)':'var(--text-primary)' }}>
                    {isOverdue && '⚠ '}{fmtDate(nextFollowUp)}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* BOTTOM */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:14, paddingBottom:60 }}>
          <div style={card}>
            <div style={{ padding:'10px 16px', background:'rgba(0,0,0,0.02)', borderBottom:'1px solid var(--card-border)', fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-tertiary)' }}>Current Tenant</div>
            {spRow('Tenant', l.lead_name||l.company)}
            {spRow('Departure', l.effective_date ? fmtDate(l.effective_date)+' (est.)' : '—', { color:'var(--rust)' })}
            {spRow('WARN Filed', isWarn ? fmtDate(l.created_at) : '—')}
            {spRow('Workers', l.workers ? `${l.workers} permanent` : '—', { color:'var(--rust)' })}
          </div>
          <div style={card}>
            <div style={{ padding:'10px 16px', background:'rgba(0,0,0,0.02)', borderBottom:'1px solid var(--card-border)', fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-tertiary)' }}>Opportunity Context</div>
            {spRow('Est. Re-lease Rate', l.market_rent ? '$'+l.market_rent+'/SF' : '—', { color:'var(--blue)', fontFamily:'var(--font-mono)', fontSize:12 })}
            {spRow('Comp Range', l.comp_range||'—', { fontFamily:'var(--font-mono)', fontSize:12 })}
            {spRow('Broker Appointed', l.broker_appointed||'Not yet — window open', { color:!l.broker_appointed?'var(--rust)':'var(--text-primary)' })}
            <div style={{ padding:'14px 16px' }}>
              <button style={{ width:'100%', ...btn, background:'var(--green)', borderColor:'var(--green)', color:'#fff', fontWeight:600, justifyContent:'center' }} onClick={convertToDeal}>Convert to Active Deal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const H = {
  rust:  { padding:'4px 10px', borderRadius:4, fontSize:11, fontWeight:500, border:'1px solid', backdropFilter:'blur(6px)', background:'rgba(184,55,20,0.30)', borderColor:'rgba(220,100,70,0.45)', color:'#FFCBB8' },
  blue:  { padding:'4px 10px', borderRadius:4, fontSize:11, fontWeight:500, border:'1px solid', backdropFilter:'blur(6px)', background:'rgba(78,110,150,0.30)', borderColor:'rgba(137,168,198,0.45)', color:'#C8E0F8' },
  amber: { padding:'4px 10px', borderRadius:4, fontSize:11, fontWeight:500, border:'1px solid', backdropFilter:'blur(6px)', background:'rgba(140,90,4,0.30)', borderColor:'rgba(220,160,50,0.45)', color:'#FFE0A0' },
  green: { padding:'4px 10px', borderRadius:4, fontSize:11, fontWeight:500, border:'1px solid', backdropFilter:'blur(6px)', background:'rgba(21,102,54,0.30)', borderColor:'rgba(60,180,110,0.45)', color:'#B8F0D0' },
};
