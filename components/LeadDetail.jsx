'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getCatalystStyle, getScoreRing, CATALYST_TAGS } from '@/lib/catalyst-constants';

function parseCatalysts(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap(c => {
      if (typeof c === 'string') {
        try {
          const p = JSON.parse(c);
          if (Array.isArray(p)) return p.map(x => typeof x === 'object' && x.tag ? x : { tag: String(x) });
          return typeof p === 'object' && p.tag ? [p] : [{ tag: c }];
        } catch { return [{ tag: c }]; }
      }
      return typeof c === 'object' && c !== null && c.tag ? [c] : [{ tag: String(c) }];
    });
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    try {
      const p = JSON.parse(trimmed);
      if (Array.isArray(p)) {
        return p.flatMap(c => {
          if (typeof c === 'string') {
            try {
              const inner = JSON.parse(c);
              if (Array.isArray(inner)) return inner.map(x => typeof x === 'object' && x.tag ? x : { tag: String(x) });
              return typeof inner === 'object' && inner.tag ? [inner] : [{ tag: c }];
            } catch { return [{ tag: c }]; }
          }
          return typeof c === 'object' && c !== null && c.tag ? [c] : [{ tag: String(c) }];
        });
      }
      if (typeof p === 'object' && p !== null && p.tag) return [p];
      if (typeof p === 'string') return [{ tag: p }];
    } catch { return [{ tag: trimmed }]; }
  }
  if (typeof raw === 'object' && raw !== null && raw.tag) return [raw];
  return [];
}

function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtShort(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

const WARN_STAGES = ['WARN notice filed', 'Closure confirmed permanent', 'Identify decision maker', 'Contact property owner', 'Qualify relocation needs', 'Convert to active deal'];
const STD_STAGES  = ['New', 'Researching', 'Decision Maker Identified', 'Contacted', 'Converted'];

const ICON_BG    = { call: 'var(--blue-bg)', note: 'var(--amber-bg)', alert: 'var(--rust-bg)', email: 'rgba(88,56,160,0.1)', task: 'var(--green-bg)' };
const ICON_COLOR = { call: 'var(--blue)', note: 'var(--amber)', alert: 'var(--rust)', email: 'var(--purple)', task: 'var(--green)' };
const ICON_EMOJI = { call: '📞', note: '📝', alert: '⚠', email: '✉', task: '✓' };

const TABS = ['Timeline', 'APNs', 'Lease Comps', 'Contacts', 'Properties', 'Files'];

// ── BUILDING SCORE — correct formula per scores doc ──────────────────────
function calcBuildingScore(l) {
  const ch  = parseFloat(l.clear_height)   || 0;
  const dd  = parseInt(l.dock_doors)        || 0;
  const bsf = parseInt(l.building_sf)       || 0;
  const tc  = parseFloat(l.truck_court)     || 0;
  const offPct = l.office_pct != null ? parseFloat(l.office_pct) : (l.office_sf && bsf ? (parseFloat(l.office_sf) / bsf) * 100 : null);
  const amps = parseFloat(l.power_amps)     || 0;
  const yr   = parseInt(l.year_built)       || 0;
  const now  = new Date().getFullYear();
  const age  = yr > 0 ? now - yr : null;

  // Clear Height (max 25)
  const chScore = ch >= 40 ? 25 : ch >= 36 ? 20 : ch >= 32 ? 15 : ch >= 28 ? 10 : ch >= 24 ? 5 : ch > 0 ? 2 : 0;

  // DH Ratio = dock_doors / building_sf * 10000 (max 20)
  const dhRatio = bsf > 0 && dd > 0 ? (dd / bsf) * 10000 : 0;
  const dhScore = dhRatio >= 1.2 ? 20 : dhRatio >= 1.0 ? 16 : dhRatio >= 0.8 ? 12 : dhRatio >= 0.6 ? 8 : dhRatio > 0 ? 4 : 0;

  // Truck Court Depth (max 20)
  const tcScore = tc >= 185 ? 20 : tc >= 135 ? 16 : tc >= 120 ? 12 : tc >= 100 ? 8 : tc > 0 ? 4 : 0;

  // Office % (max 15) — lower is better
  const offScore = offPct === null ? 0 : offPct <= 5 ? 15 : offPct <= 10 ? 12 : offPct <= 15 ? 9 : offPct <= 25 ? 6 : 3;

  // Power Amps (max 10)
  const ampScore = amps >= 2000 ? 10 : amps >= 1200 ? 8 : amps >= 800 ? 6 : amps >= 400 ? 4 : amps > 0 ? 2 : 0;

  // Vintage (max 10)
  const vinScore = age === null ? 0 : age <= 5 ? 10 : age <= 10 ? 8 : age <= 20 ? 6 : age <= 30 ? 4 : 2;

  const total = chScore + dhScore + tcScore + offScore + ampScore + vinScore;
  const grade = total >= 85 ? 'A+' : total >= 70 ? 'A' : total >= 55 ? 'B+' : total >= 40 ? 'B' : 'C';

  return {
    total,
    grade,
    breakdown: [
      { label: 'Clear Height', score: chScore, max: 25 },
      { label: 'DH Ratio',     score: dhScore, max: 20 },
      { label: 'Truck Court',  score: tcScore, max: 20 },
      { label: 'Office %',     score: offScore, max: 15 },
      { label: 'Power',        score: ampScore, max: 10 },
      { label: 'Vintage',      score: vinScore, max: 10 },
    ],
  };
}

export default function LeadDetail({ lead, onClose, onRefresh, fullPage = false }) {
  const router = useRouter();
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  const [activities,    setActivities]   = useState([]);
  const [contacts,      setContacts]     = useState([]);
  const [apns,          setApns]         = useState([]);
  const [synth,         setSynth]        = useState(lead?.ai_synthesis || '');
  const [synthTs,       setSynthTs]      = useState(lead?.ai_synthesis_at || null);
  const [synthOpen,     setSynthOpen]    = useState(true);
  const [synthLoading,  setSynthLoading] = useState(false);
  const [specsOpen,     setSpecsOpen]    = useState(false);
  const [activeTab,     setActiveTab]    = useState('Timeline');
  const [logPanel,      setLogPanel]     = useState(null);
  const [logText,       setLogText]      = useState('');
  const [logContact,    setLogContact]   = useState('');
  const [editing,       setEditing]      = useState(false);
  const [editingSpecs,  setEditingSpecs] = useState(false);
  const [saving,        setSaving]       = useState(false);
  const [showTagPicker, setShowTagPicker]= useState(false);
  const [cadence,       setCadence]      = useState(lead?.follow_up_cadence || lead?.cadence || '');
  const [nextFollowUp,  setNextFollowUp] = useState(lead?.follow_up_date || '');
  const [newApn,        setNewApn]       = useState('');
  const [addingApn,     setAddingApn]    = useState(false);
  const [oneDriveUrl,   setOneDriveUrl]  = useState(lead?.onedrive_url || '');
  const [savingDrive,   setSavingDrive]  = useState(false);

  const [form, setForm] = useState({
    lead_name: lead?.lead_name || '', company: lead?.company || '', address: lead?.address || '',
    city: lead?.city || '', market: lead?.market || '', building_sf: lead?.building_sf || '',
    land_acres: lead?.land_acres || '', clear_height: lead?.clear_height || '',
    dock_doors: lead?.dock_doors || '', grade_doors: lead?.grade_doors || '',
    year_built: lead?.year_built || '', zoning: lead?.zoning || '', power_amps: lead?.power_amps || '',
    parking_spaces: lead?.parking_spaces || '', stage: lead?.stage || 'New',
    priority: lead?.priority || 'Medium', owner_type: lead?.owner_type || '',
    source: lead?.source || '', score: lead?.score || '', notes: lead?.notes || '',
    decision_maker: lead?.decision_maker || '', phone: lead?.phone || '', email: lead?.email || '',
    lat: lead?.lat || '', lng: lead?.lng || '',
  });

  const [specsForm, setSpecsForm] = useState({
    building_sf: lead?.building_sf || '', land_acres: lead?.land_acres || '',
    lot_sf: lead?.lot_sf || '', year_built: lead?.year_built || '',
    clear_height: lead?.clear_height || '', eave_height: lead?.eave_height || '',
    column_spacing: lead?.column_spacing || '', bay_depth: lead?.bay_depth || '',
    skylight_pct: lead?.skylight_pct || '',
    dock_doors: lead?.dock_doors || '', grade_doors: lead?.grade_doors || '',
    truck_court: lead?.truck_court || '', yard_depth: lead?.yard_depth || '',
    trailer_spots: lead?.trailer_spots || '', parking_spaces: lead?.parking_spaces || '',
    power_amps: lead?.power_amps || '', sprinklers: lead?.sprinklers || '',
    rail_served: lead?.rail_served || '', evap_cooler: lead?.evap_cooler || '',
    zoning: lead?.zoning || '', office_pct: lead?.office_pct || '',
    prop_type: lead?.prop_type || '',
  });

  const l = lead || {};
  const catalysts = parseCatalysts(l.catalyst_tags);
  const score = l.score || 0;
  const { grade } = getScoreRing(score);
  const isWarn = catalysts.some(c => (c?.tag || '').toLowerCase().includes('warn'));
  const isOverdue = nextFollowUp && new Date(nextFollowUp) < new Date();
  const stages = isWarn ? WARN_STAGES : STD_STAGES;

  const stageIdx = isWarn ? (() => {
    const s = (l.stage || '').toLowerCase();
    if (s.includes('convert') || s.includes('active deal')) return 5;
    if (s.includes('qualify')) return 4;
    if (s.includes('contact')) return 3;
    if (s.includes('decision') || s.includes('dm')) return 2;
    if (s.includes('permanent') || s.includes('confirm')) return 1;
    return 0;
  })() : Math.max(0, STD_STAGES.indexOf(l.stage || 'New'));

  const estValue = l.est_value
    ? ('$' + (Number(l.est_value) / 1_000_000).toFixed(1) + 'M')
    : l.building_sf
      ? '$' + (Math.round(Number(l.building_sf) * 260 / 100000) / 10).toFixed(1) + 'M est.'
      : '—';

  const bldgScore = calcBuildingScore(l);

  // Calculated display fields
  const bsf = parseInt(l.building_sf) || 0;
  const lsf = parseInt(l.lot_sf) || (l.land_acres ? Math.round(parseFloat(l.land_acres) * 43560) : 0);
  const offPct = l.office_pct != null ? parseFloat(l.office_pct) : null;
  const offSF = offPct && bsf ? Math.round(bsf * offPct / 100) : null;
  const whSF = offSF && bsf ? bsf - offSF : null;
  const coverageRatio = bsf && lsf ? ((bsf / lsf) * 100).toFixed(1) + '%' : '—';
  const landToBldg = bsf && lsf ? (lsf / bsf).toFixed(2) + ':1' : '—';
  const dhRatio = parseInt(l.dock_doors) && bsf ? ((parseInt(l.dock_doors) / bsf) * 10000).toFixed(2) : '—';

  useEffect(() => { if (l.id) { loadActivities(); loadContacts(); loadApns(); } }, [l.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || mapInst.current || !mapRef.current) return;
    import('leaflet').then(Lmod => {
      const L = Lmod.default || Lmod;
      if (mapInst.current) return;
      const lat = parseFloat(l.lat) || 34.0522;
      const lng = parseFloat(l.lng) || -117.9310;
      const map = L.map(mapRef.current, { center: [lat, lng], zoom: 17, zoomControl: false, scrollWheelZoom: false, dragging: false, doubleClickZoom: false, attributionControl: false });
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20 }).addTo(map);
      const icon = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;border-radius:50%;background:#B83714;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
      L.marker([lat, lng], { icon }).addTo(map);
      mapInst.current = map;
    }).catch(e => console.error('Leaflet:', e));
    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, [l.lat, l.lng]);

  async function loadActivities() { try { const sb = createClient(); const { data } = await sb.from('activities').select('*').eq('lead_id', l.id).order('created_at', { ascending: false }).limit(30); setActivities(data || []); } catch {} }
  async function loadContacts()   { try { const sb = createClient(); const { data } = await sb.from('contacts').select('*').eq('lead_id', l.id); setContacts(data || []); } catch {} }
  async function loadApns()       { try { const sb = createClient(); const { data } = await sb.from('property_apns').select('*').eq('lead_id', l.id); setApns(data || []); } catch {} }

  async function addApn() {
    if (!newApn.trim()) return;
    setAddingApn(true);
    try { const sb = createClient(); await sb.from('property_apns').insert({ lead_id: l.id, apn: newApn.trim() }); setNewApn(''); loadApns(); }
    catch (e) { alert('Error: ' + e.message); } finally { setAddingApn(false); }
  }

  async function removeApn(apnId) {
    if (!confirm('Remove this APN?')) return;
    try { const sb = createClient(); await sb.from('property_apns').delete().eq('id', apnId); loadApns(); }
    catch (e) { alert('Error: ' + e.message); }
  }

  async function saveOneDrive() {
    setSavingDrive(true);
    try { const sb = createClient(); await sb.from('leads').update({ onedrive_url: oneDriveUrl || null }).eq('id', l.id); onRefresh?.(); }
    catch (e) { alert('Error: ' + e.message); } finally { setSavingDrive(false); }
  }

  // ── AI SYNTHESIS — includes cadence recommendation ────────────────────
  async function runSynthesis() {
    setSynthLoading(true);
    try {
      const acts = activities.slice(0, 5).map(a => `${a.type}: ${a.notes || ''}`).join(' | ');
      const catalystList = catalysts.map(c => c?.tag || c).join(', ') || 'None';

      // Determine high-priority signals for cadence logic
      const hasHighSignal = catalysts.some(c => {
        const tag = (c?.tag || '').toLowerCase();
        return tag.includes('warn') || tag.includes('distress') || tag.includes('nod') || tag.includes('tax delinq') || tag.includes('lease exp < 12') || tag.includes('slb');
      });
      const hasMedSignal = catalysts.some(c => {
        const tag = (c?.tag || '').toLowerCase();
        return tag.includes('lease exp 12') || tag.includes('vacancy') || tag.includes('m&a') || tag.includes('relocation') || tag.includes('absentee');
      });

      const prompt = `You are a senior CRE broker analyzing an industrial real estate lead in SGV/IE Southern California for Briana Corso at Colliers International.

LEAD: ${l.lead_name || l.company} | ${l.address || '—'}, ${l.city || ''}
Market: ${l.market || '—'} | SF: ${l.building_sf ? Number(l.building_sf).toLocaleString() + ' SF' : '—'} | Clear: ${l.clear_height ? l.clear_height + "'" : '—'} | Docks: ${l.dock_doors || '—'} | Built: ${l.year_built || '—'}
Owner: ${l.owner_type || '—'} | Stage: ${l.stage || 'New'} | Lead Score: ${score}/100 (Grade ${grade})
Catalysts: ${catalystList}
Notes: ${l.notes || 'None'} | Decision Maker: ${l.decision_maker || 'Not identified'}
Recent Activity: ${acts || 'None logged'}

Write a concise intelligence synthesis with these EXACT sections:

**Current Situation**
– [2-3 bullets on what's happening with this lead right now]

**Key Contacts**
– [1-2 bullets on who to reach and what's known]

**Recommended Next Steps**
1. Today: [specific action]
2. 48 hrs: [specific action]
3. Week 1: [specific action]

**Recommended Follow-Up Cadence**
[One of: Daily / Weekly / Biweekly / Monthly / Quarterly] — [1 sentence explaining why based on signal strength and urgency]

**Bottom Line**
[One bold sentence with the critical insight — reference specific data points]

Be direct. Reference actual data. 200 words max.`;

      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1000,
  messages: [{ role: 'user', content: prompt }],
}) });
const data = await res.json();
const text = data.content?.[0]?.text || 'Synthesis unavailable.';
      setSynth(text); setSynthTs(new Date().toISOString());
      const sb = createClient();
      await sb.from('leads').update({ ai_synthesis: text, ai_synthesis_at: new Date().toISOString() }).eq('id', l.id);
      onRefresh?.();
    } catch { setSynth('Unable to generate synthesis — check AI API connection.'); }
    finally { setSynthLoading(false); }
  }

  async function logActivity(type) {
    if (!logText.trim()) { alert('Add notes first.'); return; }
    setSaving(true);
    try {
      const sb = createClient();
      await sb.from('activities').insert({ lead_id: l.id, type, notes: logText, contact_name: logContact || null, created_at: new Date().toISOString() });
      setLogPanel(null); setLogText(''); setLogContact('');
      loadActivities(); onRefresh?.();
    } catch (e) { alert('Error: ' + e.message); } finally { setSaving(false); }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const sb = createClient();
      const { error } = await sb.from('leads').update({
        lead_name: form.lead_name, company: form.company, address: form.address, city: form.city,
        market: form.market,
        building_sf: form.building_sf ? parseInt(String(form.building_sf).replace(/,/g, '')) : null,
        land_acres: form.land_acres ? parseFloat(form.land_acres) : null,
        clear_height: form.clear_height ? parseFloat(form.clear_height) : null,
        dock_doors: form.dock_doors ? parseInt(form.dock_doors) : null,
        grade_doors: form.grade_doors ? parseInt(form.grade_doors) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        zoning: form.zoning || null, power_amps: form.power_amps || null,
        parking_spaces: form.parking_spaces ? parseInt(form.parking_spaces) : null,
        stage: form.stage, priority: form.priority, owner_type: form.owner_type || null,
        source: form.source || null, score: form.score ? Number(form.score) : null,
        notes: form.notes || null, decision_maker: form.decision_maker || null,
        phone: form.phone || null, email: form.email || null,
        lat: form.lat ? parseFloat(form.lat) : null, lng: form.lng ? parseFloat(form.lng) : null,
        updated_at: new Date().toISOString(),
      }).eq('id', l.id);
      if (error) throw error;
      setEditing(false); onRefresh?.();
    } catch (e) { alert('Error: ' + e.message); } finally { setSaving(false); }
  }

  async function saveSpecs() {
    setSaving(true);
    try {
      const sb = createClient();
      const patch = {};
      const numFields = ['building_sf','lot_sf','year_built','dock_doors','grade_doors','parking_spaces','trailer_spots','power_amps'];
      const floatFields = ['land_acres','clear_height','eave_height','truck_court','yard_depth','skylight_pct','office_pct'];
      const strFields = ['zoning','sprinklers','rail_served','evap_cooler','prop_type','column_spacing','bay_depth'];
      numFields.forEach(k => { if (specsForm[k] !== undefined) patch[k] = specsForm[k] ? parseInt(String(specsForm[k]).replace(/,/g,'')) : null; });
      floatFields.forEach(k => { if (specsForm[k] !== undefined) patch[k] = specsForm[k] ? parseFloat(specsForm[k]) : null; });
      strFields.forEach(k => { if (specsForm[k] !== undefined) patch[k] = specsForm[k] || null; });
      patch.updated_at = new Date().toISOString();
      const { error } = await sb.from('leads').update(patch).eq('id', l.id);
      if (error) throw error;
      setEditingSpecs(false); onRefresh?.();
    } catch (e) { alert('Error: ' + e.message); } finally { setSaving(false); }
  }

  async function setCadenceAndTask(val) {
    setCadence(val); if (!val) return;
    const days = { Daily: 1, Weekly: 7, Biweekly: 14, Monthly: 30, Quarterly: 90 }[val] || 7;
    const next = new Date(); next.setDate(next.getDate() + days);
    const dateStr = next.toISOString().split('T')[0];
    setNextFollowUp(dateStr);
    try {
      const sb = createClient();
      await sb.from('leads').update({ follow_up_cadence: val, follow_up_date: dateStr }).eq('id', l.id);
      await sb.from('tasks').insert({ title: `Follow up — ${l.lead_name || l.company}`, lead_id: l.id, due_date: dateStr, priority: l.priority || 'Medium', notes: `${val} cadence`, status: 'Pending' });
      onRefresh?.();
    } catch {}
  }

  async function updateStage(newStage) {
    try {
      const sb = createClient();
      await sb.from('leads').update({ stage: newStage, updated_at: new Date().toISOString() }).eq('id', l.id);
      onRefresh?.();
    } catch (e) { alert('Error: ' + e.message); }
  }

  async function addTag(tagName) {
    const current = parseCatalysts(l.catalyst_tags);
    if (current.some(c => (c?.tag || c) === tagName)) { setShowTagPicker(false); return; }
    const meta = CATALYST_TAGS.find(t => t.tag === tagName);
    const updated = [...current, { tag: tagName, category: meta?.category || 'asset', priority: meta?.priority || 'MED' }];
    try { const sb = createClient(); await sb.from('leads').update({ catalyst_tags: JSON.stringify(updated) }).eq('id', l.id); setShowTagPicker(false); onRefresh?.(); } catch (e) { alert(e.message); }
  }

  async function removeTag(tagName) {
    const updated = parseCatalysts(l.catalyst_tags).filter(c => (c?.tag || c) !== tagName);
    try { const sb = createClient(); await sb.from('leads').update({ catalyst_tags: JSON.stringify(updated) }).eq('id', l.id); onRefresh?.(); } catch {}
  }

  async function convertToDeal() {
    if (!confirm(`Convert "${l.lead_name || l.company}" to active deal?`)) return;
    try {
      const sb = createClient();
      const { data: deal, error } = await sb.from('deals').insert({ deal_name: l.lead_name || l.company, address: l.address, market: l.market, stage: 'Tracking', lead_id: l.id, notes: l.notes }).select('id').single();
      if (error) throw error;
      await sb.from('leads').update({ stage: 'Converted', converted_deal_id: deal.id }).eq('id', l.id);
      onRefresh?.(); router.push(`/deals/${deal.id}`);
    } catch (e) { alert('Error: ' + e.message); }
  }

  async function addProperty() {
    if (!l.address) { alert('No address to create property from.'); return; }
    try {
      const sb = createClient();
      const { error } = await sb.from('properties').insert({
        address: l.address, city: l.city, market: l.market,
        building_sf: l.building_sf, land_acres: l.land_acres, clear_height: l.clear_height,
        dock_doors: l.dock_doors, year_built: l.year_built, zoning: l.zoning,
        owner: l.company || l.lead_name, owner_type: l.owner_type,
        prop_type: l.prop_type || 'Warehouse', notes: l.notes, lat: l.lat, lng: l.lng,
      });
      if (error) throw error;
      alert('Property created!'); onRefresh?.();
    } catch (e) { alert('Error: ' + e.message); }
  }

  // Shared styles
  const iS = { width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.025)', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' };
  const lS = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-tertiary)', marginBottom: 4, display: 'block', fontFamily: 'var(--font-mono)' };
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' };
  const card = { background: 'var(--card-bg)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' };

  const spRow = (k, v, vStyle = {}) => (
    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{k}</span>
      <span style={{ fontSize: 13.5, color: 'var(--text-primary)', textAlign: 'right', maxWidth: 170, ...vStyle }}>{v || '—'}</span>
    </div>
  );

  return (
    <div style={{ fontFamily: 'var(--font-ui)', background: 'var(--bg)' }}>

      {/* TOPBAR — full page only */}
      {fullPage && (
        <div style={{ height: 48, background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 8, position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-tertiary)' }}>
            <span style={{ cursor: 'pointer', color: 'var(--blue)' }} onClick={() => router.push('/leads')}>Lead Gen</span>
            <span style={{ opacity: .4, margin: '0 4px' }}>›</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.lead_name || l.company}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
            <button style={btn} onClick={() => setEditing(e => !e)}>⚙ Edit</button>
            <button style={btn} onClick={() => setLogPanel(p => p === 'note' ? null : 'note')}>+ Activity</button>
            <button style={btn} onClick={() => setLogPanel(p => p === 'task' ? null : 'task')}>+ Task</button>
            <a href={`https://maps.google.com/?q=${encodeURIComponent((l.address || '') + ' ' + (l.city || ''))}`} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: 'none' }}>📍 Maps</a>
            <a href={`https://www.costar.com/search#?q=${encodeURIComponent((l.address || '') + (l.city ? ', ' + l.city : ''))}&t=2`} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: 'none' }}>🗂 CoStar</a>
            <button style={{ ...btn, background: 'rgba(140,90,4,0.08)', borderColor: 'rgba(140,90,4,0.22)', color: 'var(--amber)', fontWeight: 600 }} onClick={() => router.push(`/owner-search?q=${encodeURIComponent(l.company || l.lead_name || '')}`)}>⚡ Owner Search</button>
            <button style={{ ...btn, background: 'var(--green)', borderColor: 'var(--green)', color: '#fff', fontWeight: 600 }} onClick={convertToDeal}>◈ Convert to Deal</button>
          </div>
        </div>
      )}

      {/* HERO — satellite map */}
      <div style={{ height: fullPage ? 280 : 220, position: 'relative', overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,8,5,0.82) 0%,rgba(10,8,5,0.15) 55%,transparent 100%)', pointerEvents: 'none', zIndex: 400 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, padding: '16px 22px' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: fullPage ? 26 : 22, fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 6, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {l.lead_name || l.company}{l.address ? ` — ${l.address}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {isWarn && <span style={H.rust}>⚠ WARN{l.workers ? ` · ${l.workers} Workers` : ''}</span>}
            {l.market && <span style={H.blue}>{l.market}</span>}
            {l.building_sf && <span style={H.amber}>{Number(l.building_sf).toLocaleString()} SF</span>}
            {l.owner_type && <span style={H.amber}>{l.owner_type}</span>}
            {score > 0 && <span style={H.blue}>Score {score} · {grade}</span>}
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--card-border)', padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {score > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', background: 'var(--card-bg)', border: '1px solid rgba(184,55,20,0.25)', borderRadius: 8, marginRight: 4, flexShrink: 0 }}>
              <div><div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Lead Score</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--rust)' }}>{grade}</div></div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: 'var(--rust)', lineHeight: 1 }}>{score}</div>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--card-border)' }} />
          </>
        )}
        <button style={btn} onClick={() => setLogPanel(p => p === 'call' ? null : 'call')}>📞 Log Call</button>
        <button style={btn} onClick={() => setLogPanel(p => p === 'email' ? null : 'email')}>✉ Log Email</button>
        <button style={btn} onClick={() => setLogPanel(p => p === 'note' ? null : 'note')}>📝 Add Note</button>
        <button style={btn} onClick={() => setLogPanel(p => p === 'task' ? null : 'task')}>+ Task</button>
        <div style={{ width: 1, height: 20, background: 'var(--card-border)' }} />
        <a href={`https://maps.google.com/?q=${encodeURIComponent((l.address || '') + ' ' + (l.city || ''))}`} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: 'none', border: 'none', color: 'var(--blue)', padding: '7px 8px', textDecoration: 'none' }}>📍 Maps</a>
        <a href={`https://www.costar.com/search#?q=${encodeURIComponent((l.address || '') + (l.city ? ', ' + l.city : ''))}&t=2`} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: 'none', border: 'none', color: 'var(--blue)', padding: '7px 8px', textDecoration: 'none' }}>🗂 CoStar</a>
        <a href={`https://www.loopnet.com/search/commercial-real-estate/${encodeURIComponent((l.city || 'los-angeles') + '-ca')}/for-sale/`} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: 'none', border: 'none', color: 'var(--blue)', padding: '7px 8px', textDecoration: 'none' }}>🔍 LoopNet</a>
        {apns[0]?.apn && <a href={`https://portal.assessor.lacounty.gov/parceldetail/${String(apns[0].apn).replace(/-/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: 'none', border: 'none', color: 'var(--blue)', padding: '7px 8px', textDecoration: 'none' }}>🗺 LA GIS</a>}
        <div style={{ marginLeft: 'auto' }} />
        <button style={{ ...btn, background: 'var(--green)', borderColor: 'var(--green)', color: '#fff', fontWeight: 600 }} onClick={convertToDeal}>◈ Convert to Deal</button>
      </div>

      {/* LOG PANEL */}
      {logPanel && (
        <div style={{ background: '#F8F6F2', borderBottom: '1px solid var(--card-border)', padding: '14px 22px', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...lS, marginBottom: 6 }}>{logPanel === 'call' ? '📞 Log Call' : logPanel === 'email' ? '✉ Log Email' : logPanel === 'note' ? '📝 Add Note' : '✓ Add Task'}</div>
            <input value={logContact} onChange={e => setLogContact(e.target.value)} placeholder="Contact name (optional)" style={{ ...iS, marginBottom: 8 }} />
            <textarea value={logText} onChange={e => setLogText(e.target.value)} placeholder={`Notes for this ${logPanel}…`} style={{ ...iS, resize: 'vertical', minHeight: 68 }} />
          </div>
          <button style={btn} onClick={() => { setLogPanel(null); setLogText(''); setLogContact(''); }}>Cancel</button>
          <button style={{ ...btn, background: 'var(--blue)', borderColor: 'var(--blue)', color: '#fff' }} onClick={() => logActivity(logPanel)} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      )}

      {/* EDIT FORM */}
      {editing && (
        <div style={{ background: '#F8F6F2', borderBottom: '1px solid var(--card-border)', padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Edit Lead</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btn} onClick={() => setEditing(false)}>Cancel</button>
              <button style={{ ...btn, background: 'var(--blue)', borderColor: 'var(--blue)', color: '#fff' }} onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : '✓ Save'}</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['lead_name','Lead Name'],['company','Company'],['address','Address'],['city','City'],['market','Market'],['decision_maker','Decision Maker'],['phone','Phone'],['email','Email'],['lat','Latitude'],['lng','Longitude']].map(([k, label]) => (
              <div key={k}><label style={lS}>{label}</label><input style={iS} value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>
            ))}
            <div><label style={lS}>Stage</label><select style={iS} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>{STD_STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label style={lS}>Owner Type</label><select style={iS} value={form.owner_type} onChange={e => setForm(f => ({ ...f, owner_type: e.target.value }))}><option value="">Select…</option>{['Owner-User','Private LLC','Family Trust','Corp','Individual','REIT','Institutional'].map(o => <option key={o}>{o}</option>)}</select></div>
            <div><label style={lS}>Priority</label><select style={iS} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>{['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label style={lS}>Score</label><input type="number" style={iS} value={form.score || ''} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} min={1} max={100} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={lS}>Notes</label><textarea style={{ ...iS, minHeight: 80, resize: 'vertical' }} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ padding: '16px 22px 0' }}>

        {/* AI SYNTHESIS */}
        <div style={{ ...card, border: '1px solid rgba(88,56,160,0.18)', borderLeft: '3px solid var(--purple)', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px 11px 20px', borderBottom: '1px solid rgba(88,56,160,0.12)', cursor: 'pointer' }} onClick={() => setSynthOpen(o => !o)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--purple)' }}>✦</span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>AI Synthesis</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--text-tertiary)' }}>Lead Intelligence · {l.lead_name || l.company}</span>
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--purple)' }}>{synthOpen ? 'Hide ▴' : 'Show ▾'}</span>
          </div>
          {synthOpen && (
            <div style={{ padding: '14px 20px 16px' }}>
              {synthLoading
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--purple)', fontSize: 13.5 }}><div className="cl-spinner" style={{ width: 16, height: 16, borderColor: 'rgba(88,56,160,0.15)', borderTopColor: 'var(--purple)' }} />Generating intelligence synthesis…</div>
                : synth
                  ? <div style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{synth}</div>
                  : <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No synthesis yet — click Generate to create an AI intelligence report for this lead.</div>
              }
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderTop: '1px solid rgba(88,56,160,0.10)', background: 'rgba(88,56,160,0.02)' }}>
            <button onClick={runSynthesis} disabled={synthLoading} style={{ fontSize: 12, color: 'var(--purple)', cursor: 'pointer', background: 'none', border: '1px solid rgba(88,56,160,0.22)', borderRadius: 6, padding: '4px 11px', fontFamily: 'var(--font-ui)' }}>{synth ? '↻ Regenerate' : '✦ Generate'}</button>
            {synth && <button onClick={() => navigator.clipboard?.writeText(synth)} style={{ fontSize: 12, color: 'var(--purple)', cursor: 'pointer', background: 'none', border: '1px solid rgba(88,56,160,0.22)', borderRadius: 6, padding: '4px 11px', fontFamily: 'var(--font-ui)' }}>📋 Copy</button>}
            {synthTs && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>Generated {fmtDate(synthTs)}</span>}
          </div>
        </div>

        {/* STAT ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', background: 'var(--card-bg)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 14 }}>
          {[
            { lbl: 'Building SF',  val: l.building_sf ? Number(l.building_sf).toLocaleString() : null, sub: l.prop_type || 'Industrial' },
            { lbl: 'WARN Workers', val: isWarn ? (l.workers || '?') : null, sub: isWarn ? 'Filed ' + fmtShort(l.created_at) : '—', rust: isWarn },
            { lbl: 'Market Rent',  val: l.market_rent ? '$' + l.market_rent + '/SF' : null, sub: 'NNN est.', blue: true },
            { lbl: 'Est. Value',   val: estValue, sub: l.building_sf ? '~$260/SF' : null },
            { lbl: 'Owner',        val: l.company || l.lead_name || null, sub: l.owner_type || null, sm: true },
            { lbl: 'Lead Score',   val: score > 0 ? score : null, sub: `Grade ${grade}`, rust: true },
          ].map((c, i) => (
            <div key={c.lbl} style={{ padding: '13px 14px', borderRight: i < 5 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>{c.lbl}</div>
              <div style={{ fontFamily: c.sm ? 'var(--font-ui)' : "'Playfair Display',serif", fontWeight: c.sm ? 400 : 700, fontSize: c.sm ? 14 : 22, color: c.rust ? 'var(--rust)' : c.blue ? 'var(--blue)' : 'var(--text-primary)', lineHeight: 1 }}>{c.val || '—'}</div>
              {c.sub && <div style={{ fontSize: 11, color: c.rust ? 'var(--rust)' : c.blue ? 'var(--blue)' : 'var(--text-tertiary)', marginTop: 3 }}>{c.sub}</div>}
            </div>
          ))}
        </div>

        {/* BUILDING SCORE CARD */}
        <div style={{ ...card, marginBottom: 14 }}>
          {/* Header — always clickable */}
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: specsOpen ? '1px solid var(--card-border)' : 'none', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setSpecsOpen(o => !o)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2.5px solid rgba(78,110,150,0.32)', background: 'var(--blue-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{bldgScore.total || '—'}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--blue)', marginTop: 1 }}>{bldgScore.grade}</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Building Score{l.clear_height ? ` — ${l.clear_height}' clear` : ''}{l.dock_doors ? ` · ${l.dock_doors} DH` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
                  {bldgScore.breakdown.filter(b => b.score > 0).map(b => `${b.label} ${b.score}/${b.max}`).join(' · ') || 'Add building specs to score'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {specsOpen && (
                <button onClick={e => { e.stopPropagation(); setEditingSpecs(s => !s); }} style={{ ...btn, fontSize: 12, padding: '5px 10px' }}>
                  {editingSpecs ? '✕ Cancel' : '✏ Edit Specs'}
                </button>
              )}
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue)' }}>
                {specsOpen ? 'Hide specs ▴' : 'Show all specs ▾'}
              </span>
            </div>
          </div>

          {/* Summary strip — always visible */}
          <div style={{ display: 'flex', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            {[
              ['Clear Ht',   l.clear_height ? `${l.clear_height}'` : '—'],
              ['Dock Doors', l.dock_doors ? `${l.dock_doors}${l.grade_doors ? ` / ${l.grade_doors}GL` : ''}` : '—'],
              ['Year Built', l.year_built || '—'],
              ['Land (AC)',  l.land_acres || '—'],
              ['Power',      l.power_amps ? `${l.power_amps}A` : '—'],
              ['Zoning',     l.zoning || '—'],
              ['Parking',    l.parking_spaces || '—'],
              ['Prop Type',  l.prop_type || 'Industrial'],
            ].map((s, i) => (
              <div key={s[0]} style={{ flex: 1, padding: '9px 12px', borderRight: i < 7 ? '1px solid rgba(0,0,0,0.05)' : 'none', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3, fontFamily: 'var(--font-mono)' }}>{s[0]}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: s[1] === '—' ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{s[1]}</div>
              </div>
            ))}
          </div>

          {/* EXPANDED SPECS */}
          {specsOpen && (
            <div style={{ borderTop: '1px solid var(--card-border)', padding: '16px 18px' }}>
              {editingSpecs ? (
                <>
                  {/* STRUCTURE */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>Structure</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                    {[['building_sf','Building SF'],['land_acres','Land (AC)'],['lot_sf','Lot SF'],['year_built','Year Built'],['clear_height',"Clear Ht (ft)"],['eave_height',"Eave Ht (ft)"],['column_spacing','Column Spacing'],['bay_depth','Bay Depth'],['skylight_pct','Skylight %']].map(([k,label]) => (
                      <div key={k}><label style={lS}>{label}</label><input style={iS} value={specsForm[k] || ''} onChange={e => setSpecsForm(f => ({ ...f, [k]: e.target.value }))} placeholder="—" /></div>
                    ))}
                  </div>
                  {/* LOADING */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>Loading</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                    {[['dock_doors','Dock Doors'],['grade_doors','Grade Doors'],['truck_court','Truck Court (ft)'],['yard_depth','Yard Depth (ft)'],['trailer_spots','Trailer Spots'],['parking_spaces','Parking']].map(([k,label]) => (
                      <div key={k}><label style={lS}>{label}</label><input style={iS} value={specsForm[k] || ''} onChange={e => setSpecsForm(f => ({ ...f, [k]: e.target.value }))} placeholder="—" /></div>
                    ))}
                  </div>
                  {/* SYSTEMS */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>Systems</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                    <div><label style={lS}>Power (A)</label><input style={iS} value={specsForm.power_amps || ''} onChange={e => setSpecsForm(f => ({ ...f, power_amps: e.target.value }))} placeholder="—" /></div>
                    <div><label style={lS}>Sprinklers</label>
                      <select style={iS} value={specsForm.sprinklers || ''} onChange={e => setSpecsForm(f => ({ ...f, sprinklers: e.target.value }))}>
                        <option value="">Unknown</option><option>ESFR</option><option>Wet Pipe</option><option>Dry Pipe</option><option>None</option>
                      </select>
                    </div>
                    <div><label style={lS}>Rail Served</label>
                      <select style={iS} value={specsForm.rail_served || ''} onChange={e => setSpecsForm(f => ({ ...f, rail_served: e.target.value }))}>
                        <option value="">Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                    <div><label style={lS}>Evap Cooler</label>
                      <select style={iS} value={specsForm.evap_cooler || ''} onChange={e => setSpecsForm(f => ({ ...f, evap_cooler: e.target.value }))}>
                        <option value="">Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                    <div><label style={lS}>Zoning</label><input style={iS} value={specsForm.zoning || ''} onChange={e => setSpecsForm(f => ({ ...f, zoning: e.target.value }))} placeholder="—" /></div>
                    <div><label style={lS}>Office %</label><input style={iS} value={specsForm.office_pct || ''} onChange={e => setSpecsForm(f => ({ ...f, office_pct: e.target.value }))} placeholder="e.g. 5" /></div>
                    <div><label style={lS}>Prop Type</label>
                      <select style={iS} value={specsForm.prop_type || ''} onChange={e => setSpecsForm(f => ({ ...f, prop_type: e.target.value }))}>
                        <option value="">Select…</option>
                        {['Warehouse / Distribution','Manufacturing','Flex / R&D','Food Processing','Cold Storage','Truck Terminal','IOS','Other'].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button style={btn} onClick={() => setEditingSpecs(false)}>Cancel</button>
                    <button style={{ ...btn, background: 'var(--blue)', borderColor: 'var(--blue)', color: '#fff' }} onClick={saveSpecs} disabled={saving}>{saving ? 'Saving…' : '✓ Save Specs'}</button>
                  </div>
                </>
              ) : (
                <div>
                  {/* VIEW MODE — grouped */}
                  {[
                    { group: 'Structure', rows: [
                      ['Building SF', l.building_sf ? Number(l.building_sf).toLocaleString() + ' SF' : null],
                      ['Land', l.land_acres ? l.land_acres + ' AC' : null],
                      ['Lot SF', l.lot_sf ? Number(l.lot_sf).toLocaleString() + ' SF' : null],
                      ['Year Built', l.year_built],
                      ['Clear Height', l.clear_height ? `${l.clear_height}'` : null],
                      ['Eave Height', l.eave_height ? `${l.eave_height}'` : null],
                      ['Column Spacing', l.column_spacing],
                      ['Bay Depth', l.bay_depth],
                      ['Skylight %', l.skylight_pct ? `${l.skylight_pct}%` : null],
                    ]},
                    { group: 'Loading', rows: [
                      ['Dock Doors', l.dock_doors],
                      ['Grade Doors', l.grade_doors],
                      ['Truck Court', l.truck_court ? `${l.truck_court}'` : null],
                      ['Yard Depth', l.yard_depth ? `${l.yard_depth}'` : null],
                      ['Trailer Spots', l.trailer_spots],
                      ['Parking', l.parking_spaces],
                    ]},
                    { group: 'Systems', rows: [
                      ['Power', l.power_amps ? `${l.power_amps}A` : null],
                      ['Sprinklers', l.sprinklers],
                      ['Rail Served', l.rail_served],
                      ['Evap Cooler', l.evap_cooler],
                      ['Zoning', l.zoning],
                      ['Office %', l.office_pct ? `${l.office_pct}%` : null],
                    ]},
                    { group: 'Calculated', rows: [
                      ['DH Ratio', dhRatio !== '—' ? dhRatio + ' per 10K SF' : null],
                      ['Coverage Ratio', coverageRatio !== '—' ? coverageRatio : null],
                      ['Land-to-Bldg', landToBldg !== '—' ? landToBldg : null],
                      ['Office SF', offSF ? offSF.toLocaleString() + ' SF' : null],
                      ['Warehouse SF', whSF ? whSF.toLocaleString() + ' SF' : null],
                    ]},
                  ].map(({ group, rows }) => (
                    <div key={group} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--card-border)' }}>{group}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                        {rows.map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 4px', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>{k}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: v ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{v || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* SCORE BREAKDOWN BARS */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--card-border)' }}>Score Breakdown</div>
                    {bldgScore.breakdown.map(b => (
                      <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 90, fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{b.label}</div>
                        <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(b.score / b.max) * 100}%`, background: b.score / b.max >= 0.8 ? 'var(--green)' : b.score / b.max >= 0.5 ? 'var(--blue)' : 'var(--amber)', borderRadius: 3, transition: 'width 600ms ease' }} />
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', width: 40, textAlign: 'right', flexShrink: 0 }}>{b.score}/{b.max}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', marginBottom: 14 }}>
          {TABS.map(t => (
            <div key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 14px', fontSize: 13.5, color: activeTab === t ? 'var(--blue)' : 'var(--text-tertiary)', cursor: 'pointer', borderBottom: `2px solid ${activeTab === t ? 'var(--blue)' : 'transparent'}`, marginBottom: -1, whiteSpace: 'nowrap', fontWeight: activeTab === t ? 500 : 400 }}>
              {t}
              {t === 'Timeline' && activities.length > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'rgba(0,0,0,0.06)', borderRadius: 20, padding: '1px 6px', marginLeft: 4, color: 'var(--text-tertiary)' }}>{activities.length}</span>}
              {t === 'APNs' && apns.length > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'rgba(0,0,0,0.06)', borderRadius: 20, padding: '1px 6px', marginLeft: 4, color: 'var(--text-tertiary)' }}>{apns.length}</span>}
            </div>
          ))}
        </div>

        {/* 2-COL BODY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 285px', gap: 14 }}>

          {/* LEFT: Tab content */}
          <div>
            {/* TIMELINE */}
            {activeTab === 'Timeline' && (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--card-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)' }}>
                    <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--rust)' }} /> Activity Timeline
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['call','email','note','task'].map(type => (
                      <button key={type} onClick={() => setLogPanel(p => p === type ? null : type)} style={{ padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--card-border)', background: logPanel === type ? 'rgba(78,110,150,0.08)' : 'var(--card-bg)', borderColor: logPanel === type ? 'rgba(78,110,150,0.3)' : 'var(--card-border)', color: logPanel === type ? 'var(--blue)' : 'var(--text-tertiary)', fontFamily: 'var(--font-ui)' }}>
                        {type === 'call' ? '📞 Log Call' : type === 'email' ? '✉ Log Email' : type === 'note' ? '📝 Note' : '+ Follow-Up'}
                      </button>
                    ))}
                  </div>
                </div>
                {activities.length === 0
                  ? <div style={{ padding: '36px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: 15 }}>No activity yet — log a call, email, or note above</div>
                  : activities.map((a, i) => (
                    <div key={a.id || i} style={{ display: 'flex', gap: 12, padding: '11px 16px', borderBottom: i < activities.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, flexShrink: 0, marginTop: 1, background: ICON_BG[a.type] || ICON_BG.note, color: ICON_COLOR[a.type] || ICON_COLOR.note }}>{ICON_EMOJI[a.type] || '📝'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          <strong>{a.contact_name ? `${a.type === 'call' ? 'Called' : a.type === 'email' ? 'Emailed' : 'Note re:'} ${a.contact_name}` : a.type?.charAt(0).toUpperCase() + a.type?.slice(1)}</strong>
                          {a.notes && <span style={{ fontWeight: 400 }}> — {a.notes}</span>}
                        </div>
                        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'var(--text-tertiary)', marginTop: 2 }}>Briana Corso · {fmtDate(a.created_at)}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', flexShrink: 0, paddingTop: 2 }}>{fmtShort(a.created_at)}</div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* APNs */}
            {activeTab === 'APNs' && (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Parcel Numbers (APNs)</span>
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', gap: 8 }}>
                  <input value={newApn} onChange={e => setNewApn(e.target.value)} onKeyDown={e => e.key === 'Enter' && addApn()} placeholder="e.g. 8116-004-016" style={{ ...iS, flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                  <button style={{ ...btn, background: 'var(--blue)', borderColor: 'var(--blue)', color: '#fff' }} onClick={addApn} disabled={addingApn || !newApn.trim()}>{addingApn ? '…' : '+ Add APN'}</button>
                </div>
                {apns.length === 0
                  ? <div style={{ padding: '32px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: 15 }}>No APNs linked yet</div>
                  : apns.map((apn, i) => (
                    <div key={apn.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < apns.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{apn.apn}</span>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <a href={`https://portal.assessor.lacounty.gov/parceldetail/${String(apn.apn).replace(/-/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none' }}>LA County GIS →</a>
                        <button onClick={() => removeApn(apn.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1, padding: 0, opacity: 0.5 }}>×</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* CONTACTS */}
            {activeTab === 'Contacts' && (
              <div style={card}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--card-border)', fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Contacts</div>
                {contacts.length === 0 && l.decision_maker
                  ? <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: 15, fontWeight: 500 }}>{l.decision_maker}</div><div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>Decision Maker</div></div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {l.phone && <a href={`tel:${l.phone}`} style={{ fontSize: 14, color: 'var(--blue)', textDecoration: 'none' }}>📞 {l.phone}</a>}
                      {l.email && <a href={`mailto:${l.email}`} style={{ fontSize: 14, color: 'var(--blue)', textDecoration: 'none' }}>✉ {l.email}</a>}
                    </div>
                  </div>
                  : contacts.length === 0
                    ? <div style={{ padding: '32px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: 15 }}>No contacts linked yet</div>
                    : contacts.map((c, i) => (
                      <div key={c.id || i} style={{ padding: '12px 16px', borderBottom: i < contacts.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontSize: 15, fontWeight: 500 }}>{c.name || c.full_name}</div><div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{c.title}{c.company ? ` · ${c.company}` : ''}</div></div>
                        {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize: 14, color: 'var(--blue)', textDecoration: 'none' }}>📞 {c.phone}</a>}
                      </div>
                    ))
                }
              </div>
            )}

            {/* FILES */}
            {activeTab === 'Files' && (
              <div style={card}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--card-border)', fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Files & Documents</div>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--card-border)' }}>
                  <label style={{ ...lS, marginBottom: 6 }}>OneDrive / SharePoint Folder</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={oneDriveUrl} onChange={e => setOneDriveUrl(e.target.value)} placeholder="https://..." style={{ ...iS, flex: 1, fontSize: 13 }} />
                    <button style={{ ...btn, background: 'var(--blue)', borderColor: 'var(--blue)', color: '#fff' }} onClick={saveOneDrive} disabled={savingDrive}>{savingDrive ? '…' : 'Save'}</button>
                    {oneDriveUrl && <a href={oneDriveUrl} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: 'var(--green-bg)', borderColor: 'rgba(24,112,66,0.2)', color: 'var(--green)', textDecoration: 'none' }}>Open →</a>}
                  </div>
                </div>
                <div style={{ padding: '32px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: 15 }}>Native file upload coming soon</div>
              </div>
            )}

            {(activeTab === 'Lease Comps' || activeTab === 'Properties') && (
              <div style={{ ...card, padding: '40px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: 15 }}>{activeTab} coming soon</div>
              </div>
            )}
          </div>

          {/* RIGHT COL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* AI Displacement Signal */}
            <div style={{ background: 'var(--rust-bg)', border: '1px solid rgba(184,55,20,0.2)', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--rust)' }} />
              <div style={{ padding: '10px 14px 10px 18px', borderBottom: '1px solid rgba(184,55,20,0.15)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--rust)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--rust)', fontFamily: 'var(--font-mono)' }}>AI Displacement Signal</span>
              </div>
              <div style={{ padding: '12px 14px 12px 18px', fontSize: 13, lineHeight: 1.70, color: 'var(--text-primary)' }}>
                {isWarn ? 'Permanent closure signals immediate displacement. Industrial vacancy tight.' : `${catalysts.length} active catalyst signal${catalysts.length !== 1 ? 's' : ''} detected.`}
                {' '}<span style={{ color: 'var(--blue)', fontWeight: 600 }}>Act within 48 hours</span> before competing brokers identify this site.
              </div>
            </div>

            {/* Active Catalysts */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Active Catalysts</span>
                <button onClick={() => setShowTagPicker(p => !p)} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
              </div>
              {showTagPicker && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--card-border)', maxHeight: 200, overflowY: 'auto' }}>
                  {/* Group by category */}
                  {['owner','occupier','asset','market'].map(cat => {
                    const catTags = CATALYST_TAGS.filter(t => t.category === cat && !catalysts.some(c => (c?.tag || c) === t.tag));
                    if (!catTags.length) return null;
                    return (
                      <div key={cat} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                          {cat === 'owner' ? 'Owner Signal' : cat === 'occupier' ? 'Occupier Signal' : cat === 'asset' ? 'Asset Signal' : 'Market Signal'}
                        </div>
                        {catTags.map(t => {
                          const cs = getCatalystStyle(t.tag);
                          return <button key={t.tag} onClick={() => addTag(t.tag)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', marginBottom: 2, background: 'none', border: `1px solid ${cs.bdr}`, borderRadius: 4, cursor: 'pointer', fontSize: 11.5, color: cs.color, fontFamily: 'var(--font-ui)' }}>{t.tag} <span style={{ opacity: 0.5, fontSize: 10 }}>+{t.boost}pts</span></button>;
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
              {catalysts.length === 0
                ? <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No catalysts tagged yet</div>
                : catalysts.map((c, i) => {
                  const tagName = c?.tag || c;
                  if (!tagName || typeof tagName !== 'string' || tagName.startsWith('{')) return null;
                  const cs = getCatalystStyle(tagName);
                  const meta = CATALYST_TAGS.find(t => t.tag === tagName);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', borderBottom: i < catalysts.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                      <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: `1px solid ${cs.bdr}`, background: cs.bg, color: cs.color, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{tagName}</span>
                      {meta && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>+{meta.boost}pts · {meta.priority}</span>}
                      <button onClick={() => removeTag(tagName)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 14, lineHeight: 1, padding: 0, opacity: 0.5 }}>×</button>
                    </div>
                  );
                })
              }
            </div>

            {/* Opportunity Stages — INTERACTIVE */}
            <div style={card}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--card-border)', fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Opportunity Stages</div>
              <div style={{ padding: '6px 0 10px' }}>
                {stages.map((stage, i) => {
                  const isDone = i < stageIdx;
                  const isActive = i === stageIdx;
                  return (
                    <div
                      key={stage}
                      onClick={() => updateStage(stage)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', cursor: 'pointer', transition: 'background 100ms ease', background: isActive ? 'rgba(168,112,16,0.04)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = isActive ? 'rgba(168,112,16,0.08)' : 'rgba(78,110,150,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(168,112,16,0.04)' : 'transparent'}
                      title={`Set stage to "${stage}"`}
                    >
                      <div style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
                        {isActive && (
                          <div style={{
                            position: 'absolute', inset: -3, borderRadius: '50%',
                            border: '1.5px solid rgba(168,112,16,0.4)',
                            animation: 'cl-pulse 1.8s ease-in-out infinite',
                          }} />
                        )}
                        <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: isDone ? 'var(--green-bg)' : isActive ? 'var(--amber-bg)' : 'rgba(0,0,0,0.04)', border: `1.5px solid ${isDone ? 'rgba(24,112,66,0.35)' : isActive ? 'rgba(168,112,16,0.45)' : 'rgba(0,0,0,0.1)'}`, color: isDone ? 'var(--green)' : isActive ? 'var(--amber)' : 'var(--text-tertiary)' }}>
                          {isDone ? '✓' : isActive ? '●' : '○'}
                        </div>
                      </div>
                      <span style={{ fontSize: 13, color: isActive ? 'var(--amber)' : isDone ? 'var(--text-tertiary)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400 }}>{stage}</span>
                      {isActive && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--amber)', opacity: 0.7, letterSpacing: '0.08em' }}>CURRENT</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Owner */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Owner</span>
                <button onClick={addProperty} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Property →</button>
              </div>
              {spRow('Company', l.company || l.lead_name)}
              {spRow('Type', l.owner_type)}
              {spRow('Contact', l.decision_maker || 'Not identified', { color: 'var(--blue)' })}
              {l.phone && spRow('Phone', l.phone, { color: 'var(--blue)' })}
              {l.email && spRow('Email', l.email, { color: 'var(--blue)' })}
            </div>

            {/* Lead Details */}
            <div style={card}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--card-border)', fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Lead Details</div>
              {spRow('Stage', l.stage || 'New', { color: 'var(--blue)', fontWeight: 500 })}
              {spRow('Source', l.source)}
              {spRow('Market', l.market)}
              {spRow('Priority', l.priority)}
              {l.zoning && spRow('Zoning', l.zoning, { fontFamily: 'var(--font-mono)', fontSize: 12 })}
              {apns[0] && spRow('APN', apns[0].apn, { fontFamily: 'var(--font-mono)', fontSize: 12 })}
            </div>

            {/* Cadence */}
            <div style={{ ...card, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>Follow-up Cadence</div>
              <select value={cadence} onChange={e => setCadenceAndTask(e.target.value)} style={{ ...iS, fontSize: 13 }}>
                <option value="">Set cadence…</option>
                {['Daily','Weekly','Biweekly','Monthly','Quarterly'].map(c => <option key={c}>{c}</option>)}
              </select>
              {nextFollowUp && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Next follow-up</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: isOverdue ? 'var(--rust)' : 'var(--text-primary)' }}>{isOverdue && '⚠ '}{fmtDate(nextFollowUp)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14, paddingBottom: 60 }}>
          <div style={card}>
            <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--card-border)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Current Tenant</div>
            {spRow('Tenant', l.lead_name || l.company)}
            {spRow('Departure', l.effective_date ? fmtDate(l.effective_date) + ' (est.)' : '—', { color: 'var(--rust)' })}
            {spRow('WARN Filed', isWarn ? fmtDate(l.created_at) : '—')}
            {spRow('Workers', l.workers ? `${l.workers} permanent` : '—', { color: 'var(--rust)' })}
          </div>
          <div style={card}>
            <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--card-border)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Opportunity Context</div>
            {spRow('Est. Re-lease Rate', l.market_rent ? '$' + l.market_rent + '/SF' : '—', { color: 'var(--blue)', fontFamily: 'var(--font-mono)', fontSize: 12 })}
            {spRow('Comp Range', l.comp_range || '—', { fontFamily: 'var(--font-mono)', fontSize: 12 })}
            {spRow('Broker Appointed', l.broker_appointed || 'Not yet — window open', { color: !l.broker_appointed ? 'var(--rust)' : 'var(--text-primary)' })}
            <div style={{ padding: '14px 16px' }}>
              <button style={{ width: '100%', ...btn, background: 'var(--green)', borderColor: 'var(--green)', color: '#fff', fontWeight: 600, justifyContent: 'center' }} onClick={convertToDeal}>◈ Convert to Active Deal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const H = {
  rust:  { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(184,55,20,0.30)', borderColor: 'rgba(220,100,70,0.45)', color: '#FFCBB8' },
  blue:  { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(78,110,150,0.30)', borderColor: 'rgba(137,168,198,0.45)', color: '#C8E0F8' },
  amber: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(140,90,4,0.30)', borderColor: 'rgba(220,160,50,0.45)', color: '#FFE0A0' },
  green: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(21,102,54,0.30)', borderColor: 'rgba(60,180,110,0.45)', color: '#B8F0D0' },
};
