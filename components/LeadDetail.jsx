'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const TABS = ['Timeline', 'Building Specs', 'Contacts', 'APNs', 'Comps', 'Files'];

function parseCatalysts(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function getCatalystStyle(tag) {
  const t = (tag?.tag || tag || '').toLowerCase();
  if (t.includes('warn') || t.includes('distress') || t.includes('nod') || t.includes('bankruptcy'))
    return { bg: 'var(--rust-bg)', bdr: 'var(--rust-bdr)', color: 'var(--rust)', category: 'owner' };
  if (t.includes('lease') || t.includes('expir') || t.includes('capex') || t.includes('vacancy'))
    return { bg: 'rgba(140,90,4,0.1)', bdr: 'rgba(140,90,4,0.25)', color: 'var(--amber)', category: 'occupier' };
  if (t.includes('slb') || t.includes('sale-lease') || t.includes('owner-user') || t.includes('long hold') || t.includes('absentee'))
    return { bg: 'rgba(78,110,150,0.1)', bdr: 'rgba(78,110,150,0.25)', color: 'var(--blue)', category: 'owner' };
  if (t.includes('m&a') || t.includes('acquisition') || t.includes('infrastructure') || t.includes('bess') || t.includes('restructur'))
    return { bg: 'rgba(88,56,160,0.1)', bdr: 'rgba(88,56,160,0.25)', color: 'var(--purple)', category: 'market' };
  if (t.includes('hiring') || t.includes('expansion') || t.includes('relocation'))
    return { bg: 'rgba(140,90,4,0.1)', bdr: 'rgba(140,90,4,0.25)', color: 'var(--amber)', category: 'occupier' };
  return { bg: 'rgba(78,110,150,0.08)', bdr: 'rgba(78,110,150,0.2)', color: 'var(--blue)', category: 'owner' };
}

const ICON_BG   = { call: 'var(--blue-bg)', note: 'rgba(140,90,4,0.1)', alert: 'var(--rust-bg)', email: 'rgba(88,56,160,0.1)', task: 'rgba(24,112,66,0.1)' };
const ICON_COLOR = { call: 'var(--blue)', note: 'var(--amber)', alert: 'var(--rust)', email: 'var(--purple)', task: 'var(--green)' };
const ICON_EMOJI = { call: '📞', note: '📝', alert: '⚠', email: '✉', task: '✓' };

export default function LeadDetail({ lead, onClose, onRefresh, fullPage = false }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Timeline');
  const [synthOpen, setSynthOpen] = useState(true);
  const [synth, setSynth] = useState('');
  const [synthLoading, setSynthLoading] = useState(false);
  const [synthTimestamp, setSynthTimestamp] = useState(null);
  const [logPanel, setLogPanel] = useState(null);
  const [logText, setLogText] = useState(null);
  const [logContact, setLogContact] = useState('');
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [apns, setApns] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cadence, setCadence] = useState(lead?.cadence || '');
  const [followUpDate, setFollowUpDate] = useState(lead?.follow_up_date || '');
  const [editForm, setEditForm] = useState({
    lead_name: lead?.lead_name || '',
    company: lead?.company || '',
    address: lead?.address || '',
    city: lead?.city || '',
    market: lead?.market || '',
    building_sf: lead?.building_sf || '',
    clear_height_ft: lead?.clear_height_ft || '',
    dock_doors: lead?.dock_doors || '',
    grade_doors: lead?.grade_doors || '',
    year_built: lead?.year_built || '',
    zoning: lead?.zoning || '',
    power_amps: lead?.power_amps || '',
    land_acres: lead?.land_acres || '',
    parking_spaces: lead?.parking_spaces || '',
    stage: lead?.stage || 'New',
    priority: lead?.priority || 'Medium',
    owner_type: lead?.owner_type || '',
    source: lead?.source || '',
    score: lead?.score || '',
    notes: lead?.notes || '',
    decision_maker: lead?.decision_maker || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
  });
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const l = lead || {};
  const catalysts = parseCatalysts(l.catalyst_tags);
  const score = l.score || 0;
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : 'C';

  // Load data on mount
  useEffect(() => {
    if (l.id) {
      loadActivities();
      loadContacts();
      loadApns();
      loadSynth();
    }
  }, [l.id]);

  // Init Leaflet map
  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return;
    if (!mapRef.current) return;

    import('leaflet').then(Lmod => {
      const L = Lmod.default || Lmod;
      if (mapInstanceRef.current) return;

      const lat = l.lat ?? 34.0887;
      const lng = l.lng ?? -117.9712;

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
        attributionControl: false,
      });

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20 }
      ).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#B83714;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker([lat, lng], { icon }).addTo(map);
      mapInstanceRef.current = map;
    }).catch(err => console.error('Leaflet error:', err));

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  async function loadActivities() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', l.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setActivities(data || []);
    } catch(e) { console.error(e); }
  }

  async function loadContacts() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('lead_id', l.id);
      setContacts(data || []);
    } catch(e) { console.error(e); }
  }

  async function loadApns() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('property_apns')
        .select('*')
        .eq('lead_id', l.id);
      setApns(data || []);
    } catch(e) { console.error(e); }
  }

  async function loadSynth() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('leads')
        .select('ai_synthesis, ai_synthesis_at')
        .eq('id', l.id)
        .single();
      if (data?.ai_synthesis) {
        setSynth(data.ai_synthesis);
        setSynthTimestamp(data.ai_synthesis_at);
      }
    } catch(e) { console.error(e); }
  }

  async function runSynthesis() {
    setSynthLoading(true);
    try {
      const prompt = `You are a senior CRE broker analyzing a lead for industrial real estate in Southern California.

LEAD DATA:
Company: ${l.lead_name || l.company}
Address: ${l.address || 'Unknown'}, ${l.city || ''}
Market: ${l.market || 'Unknown'}
Building SF: ${l.building_sf ? Number(l.building_sf).toLocaleString() + ' SF' : 'Unknown'}
Owner Type: ${l.owner_type || 'Unknown'}
Stage: ${l.stage || 'New'}
Score: ${score}/100 (${grade})
Catalyst Tags: ${catalysts.map(c => c?.tag || c).join(', ') || 'None'}
Notes: ${l.notes || 'None'}
Decision Maker: ${l.decision_maker || 'Unknown'}
Source: ${l.source || 'Unknown'}
Recent Activities: ${activities.slice(0,5).map(a => `${a.type}: ${a.notes}`).join(' | ') || 'None'}

Write a concise intelligence synthesis with these sections:
1. CURRENT SITUATION (2-3 bullet points about this lead's status and opportunity)
2. KEY CONTACTS / OWNER (1-2 bullets about who to reach)
3. RECOMMENDED NEXT STEPS (3 numbered action items with timing - Today, 48hrs, Week 1)
4. CRITICAL INSIGHT (1 sentence urgency or key insight)

Be specific, actionable, and direct. Reference actual data points from above.`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode: 'synthesis' }),
      });
      const data = await res.json();
      const text = data.result || data.content || '';

      setSynth(text);
      setSynthTimestamp(new Date().toISOString());

      // Persist to Supabase
      const supabase = createClient();
      await supabase.from('leads').update({
        ai_synthesis: text,
        ai_synthesis_at: new Date().toISOString(),
      }).eq('id', l.id);

    } catch(e) {
      console.error('Synthesis error:', e);
      setSynth('Unable to generate synthesis. Check your AI API connection.');
    } finally {
      setSynthLoading(false);
    }
  }

  async function logActivity(type) {
    if (!logText?.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('activities').insert({
        lead_id: l.id,
        type,
        notes: logText,
        contact_name: logContact || null,
        created_at: new Date().toISOString(),
      });
      setLogPanel(null);
      setLogText('');
      setLogContact('');
      loadActivities();
      onRefresh?.();
    } catch(e) { alert('Error saving activity: ' + e.message); }
    finally { setSaving(false); }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('leads').update({
        ...editForm,
        building_sf: editForm.building_sf ? parseInt(String(editForm.building_sf).replace(/,/g,'')) : null,
        score: editForm.score ? Number(editForm.score) : null,
        updated_at: new Date().toISOString(),
      }).eq('id', l.id);
      if (error) throw error;
      setEditing(false);
      onRefresh?.();
    } catch(e) { alert('Error saving: ' + e.message); }
    finally { setSaving(false); }
  }

  async function setCadenceAndFollowUp(val) {
    setCadence(val);
    if (!val) return;
    const intervals = { 'Daily': 1, 'Weekly': 7, 'Biweekly': 14, 'Monthly': 30, 'Quarterly': 90 };
    const days = intervals[val] || 7;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    const dateStr = nextDate.toISOString().split('T')[0];
    setFollowUpDate(dateStr);

    try {
      const supabase = createClient();
      await supabase.from('leads').update({
        cadence: val,
        follow_up_date: dateStr,
      }).eq('id', l.id);

      // Auto-create follow-up task
      await supabase.from('tasks').insert({
        title: `Follow up — ${l.lead_name || l.company}`,
        lead_id: l.id,
        due_date: dateStr,
        priority: l.priority || 'Medium',
        notes: `${val} cadence follow-up`,
        status: 'Pending',
      });
      onRefresh?.();
    } catch(e) { console.error(e); }
  }

  async function convertToDeal() {
    try {
      const supabase = createClient();
      const { data: deal, error } = await supabase.from('deals').insert({
        deal_name: l.lead_name || l.company,
        address: l.address,
        city: l.city,
        market: l.market,
        building_sf: l.building_sf,
        stage: 'Tracking',
        lead_id: l.id,
        notes: l.notes,
      }).select('id').single();
      if (error) throw error;

      await supabase.from('leads').update({ stage: 'Converted', converted_deal_id: deal.id }).eq('id', l.id);
      onRefresh?.();
      router.push(`/deals/${deal.id}`);
    } catch(e) { alert('Error converting to deal: ' + e.message); }
  }

  const inputStyle = { width: '100%', padding: '7px 11px', borderRadius: 7, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.025)', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' };
  const labelStyle = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 4, display: 'block' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: fullPage ? '100vh' : 'auto', fontFamily: 'var(--font-ui)' }}>

      {/* HERO — satellite map */}
      <div style={{ height: 260, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div ref={mapRef} style={{ width: '100%', height: 260 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,8,5,0.85) 0%,rgba(10,8,5,0.15) 55%,transparent 100%)', pointerEvents: 'none', zIndex: 400 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, padding: '16px 20px' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 7, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {l.lead_name || l.company || 'Lead Detail'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {l._warn && <span style={S.hbRust}>⚠ WARN Filing</span>}
            {l.market && <span style={S.hbBlue}>{l.market}</span>}
            {l.building_sf && <span style={S.hbAmber}>{Number(l.building_sf).toLocaleString()} SF</span>}
            {l.owner_type && <span style={S.hbBlue}>{l.owner_type}</span>}
            {score > 0 && <span style={S.hbGreen}>Score {score} · {grade}</span>}
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--card-border)', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        {/* Score chip */}
        {score > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: 'var(--card-bg)', border: '1px solid var(--rust-bdr)', borderRadius: 7, marginRight: 4, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Score</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--rust)' }}>{grade}</div>
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: 'var(--rust)', lineHeight: 1 }}>{score}</div>
          </div>
        )}
        <div style={S.abSep} />
        <button style={S.btnAct} onClick={() => setLogPanel(logPanel === 'call' ? null : 'call')}>📞 Log Call</button>
        <button style={S.btnAct} onClick={() => setLogPanel(logPanel === 'email' ? null : 'email')}>✉ Log Email</button>
        <button style={S.btnAct} onClick={() => setLogPanel(logPanel === 'note' ? null : 'note')}>📝 Add Note</button>
        <button style={S.btnAct} onClick={() => setLogPanel(logPanel === 'task' ? null : 'task')}>+ Task</button>
        <div style={S.abSep} />
        <a href={`https://maps.google.com/?q=${encodeURIComponent((l.address || '') + ' ' + (l.city || ''))}`} target="_blank" rel="noopener noreferrer" style={S.btnLink}>📍 Maps</a>
        <a href={`https://www.costar.com/search#?q=${encodeURIComponent((l.address || '') + (l.city ? ', ' + l.city : ''))}&t=2`} target="_blank" rel="noopener noreferrer" style={S.btnLink}>🗂 CoStar</a>
        <a href={`https://www.loopnet.com/search/commercial-real-estate/${encodeURIComponent((l.city || 'los-angeles') + '-ca')}/for-sale/`} target="_blank" rel="noopener noreferrer" style={S.btnLink}>🔍 LoopNet</a>
        {(l.apn || apns[0]?.apn) && (
          <a href={`https://portal.assessor.lacounty.gov/parceldetail/${String(l.apn || apns[0]?.apn).replace(/-/g,'')}`} target="_blank" rel="noopener noreferrer" style={S.btnLink}>🗺 LA GIS</a>
        )}
        <div style={S.abSep} />
        <button style={S.btnAct} onClick={() => setEditing(!editing)}>✏️ Edit</button>
        <div style={{ marginLeft: 'auto' }} />
        <button
          style={{ ...S.btnAct, background: 'var(--green)', color: '#fff', border: '1px solid var(--green)', fontWeight: 600 }}
          onClick={convertToDeal}
        >
          ◈ Convert to Deal
        </button>
      </div>

      {/* LOG PANEL */}
      {logPanel && (
        <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'flex-end', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>
              {logPanel === 'call' ? 'Log Call' : logPanel === 'email' ? 'Log Email' : logPanel === 'note' ? 'Add Note' : 'Add Task'}
            </div>
            <input
              value={logContact}
              onChange={e => setLogContact(e.target.value)}
              placeholder="Contact name (optional)"
              style={{ ...inputStyle, marginBottom: 8, fontSize: 12 }}
            />
            <textarea
              value={logText || ''}
              onChange={e => setLogText(e.target.value)}
              placeholder={`Notes for this ${logPanel}…`}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
            />
          </div>
          <button style={S.btnAct} onClick={() => { setLogPanel(null); setLogText(''); }}>Cancel</button>
          <button
            style={{ ...S.btnAct, background: 'var(--blue)', color: '#fff', border: '1px solid var(--blue)' }}
            onClick={() => logActivity(logPanel)}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {/* SCROLLABLE BODY */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* EDIT FORM */}
        {editing && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Edit Lead</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={S.btnAct} onClick={() => setEditing(false)}>Cancel</button>
                <button style={{ ...S.btnAct, background: 'var(--blue)', color: '#fff', border: '1px solid var(--blue)' }} onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : '✓ Save'}</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['lead_name', 'Lead Name'],
                ['company', 'Company'],
                ['address', 'Address'],
                ['city', 'City'],
                ['market', 'Market'],
                ['building_sf', 'Building SF'],
                ['clear_height_ft', 'Clear Height (ft)'],
                ['dock_doors', 'Dock Doors'],
                ['year_built', 'Year Built'],
                ['zoning', 'Zoning'],
                ['decision_maker', 'Decision Maker'],
                ['phone', 'Phone'],
                ['email', 'Email'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input style={inputStyle} value={editForm[key] || ''} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {/* AI SYNTHESIS */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid rgba(88,56,160,0.2)', borderLeft: '3px solid var(--purple)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 10px 18px', borderBottom: '1px solid rgba(88,56,160,0.1)', cursor: 'pointer' }} onClick={() => setSynthOpen(o => !o)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--purple)', fontSize: 13 }}>✦</span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--purple)' }}>AI Synthesis</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
                Lead Intelligence · {l.lead_name || l.company}
              </span>
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--purple)', cursor: 'pointer' }}>
              {synthOpen ? 'Hide ▴' : 'Show ▾'}
            </span>
          </div>

          {synthOpen && (
            <div style={{ padding: '14px 18px' }}>
              {synthLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--purple)', fontSize: 13 }}>
                  <div className="cl-spinner" style={{ width: 16, height: 16, borderColor: 'rgba(88,56,160,0.2)', borderTopColor: 'var(--purple)' }} />
                  Generating synthesis…
                </div>
              ) : synth ? (
                <div style={{ fontSize: 13.5, lineHeight: 1.72, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{synth}</div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  No synthesis yet. Click "Generate" to create an AI intelligence report for this lead.
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderTop: '1px solid rgba(88,56,160,0.08)', background: 'rgba(88,56,160,0.02)' }}>
            <button
              onClick={runSynthesis}
              disabled={synthLoading}
              style={{ fontSize: 12, color: 'var(--purple)', cursor: 'pointer', background: 'none', border: '1px solid rgba(88,56,160,0.22)', borderRadius: 6, padding: '4px 11px', fontFamily: 'var(--font-ui)' }}
            >
              {synth ? '↻ Regenerate' : '✦ Generate'}
            </button>
            {synth && (
              <button onClick={() => navigator.clipboard?.writeText(synth)} style={{ fontSize: 12, color: 'var(--purple)', cursor: 'pointer', background: 'none', border: '1px solid rgba(88,56,160,0.22)', borderRadius: 6, padding: '4px 11px', fontFamily: 'var(--font-ui)' }}>
                📋 Copy
              </button>
            )}
            {synthTimestamp && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                Generated {new Date(synthTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* AI DISPLACEMENT SIGNAL */}
        {(l._warn || catalysts.length > 0) && (
          <div style={{ background: 'var(--rust-bg)', border: '1px solid var(--rust-bdr)', borderLeft: '3px solid var(--rust)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '9px 14px 9px 18px', borderBottom: '1px solid var(--rust-bdr)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--rust)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--rust)' }}>AI Displacement Signal</span>
            </div>
            <div style={{ padding: '12px 14px 12px 18px', fontSize: 13.5, lineHeight: 1.72, color: 'var(--text-primary)' }}>
              {l._warn
                ? `WARN filing detected — ${l.lead_name || l.company} with ${l.building_sf ? Number(l.building_sf).toLocaleString() + ' SF' : 'unknown SF'} in ${l.market || l.city || 'unknown market'}. Owner-user displacement likely within 60 days of effective date. `
                : `Owner-user with ${l.building_sf ? Number(l.building_sf).toLocaleString() + ' SF' : 'unknown SF'} in ${l.market || l.city || 'unknown market'} showing ${catalysts.length} active signal${catalysts.length !== 1 ? 's' : ''}. `
              }
              <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Act before competing brokers identify this opportunity.</span>
            </div>
          </div>
        )}

        {/* STAT ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)', overflow: 'hidden', marginBottom: 14 }}>
          {[
            { lbl: 'Building SF', val: l.building_sf ? Number(l.building_sf).toLocaleString() : '—', sub: l.owner_type || 'Industrial' },
            { lbl: 'Market', val: l.market || '—', sub: l.city || '' },
            { lbl: 'Lead Score', val: score > 0 ? score : '—', sub: `Grade ${grade}`, rust: score > 0 },
            { lbl: 'Catalyst Count', val: catalysts.length || '—', sub: 'Active signals', blue: catalysts.length > 0 },
          ].map((c, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRight: i < 3 ? '1px solid var(--card-border)' : 'none' }}>
              <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>{c.lbl}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 20, color: c.rust ? 'var(--rust)' : c.blue ? 'var(--blue)' : 'var(--text-primary)', lineHeight: 1 }}>{c.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* CADENCE + FOLLOW UP */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Follow-up Cadence</div>
            <select
              value={cadence}
              onChange={e => setCadenceAndFollowUp(e.target.value)}
              style={{ ...inputStyle, fontSize: 13, width: 'auto', minWidth: 160 }}
            >
              <option value="">Set cadence…</option>
              {['Daily', 'Weekly', 'Biweekly', 'Monthly', 'Quarterly'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {followUpDate && (
            <div style={{ textAlign: 'right' }}>
              <div style={labelStyle}>Next Follow-up</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: new Date(followUpDate) < new Date() ? 'var(--rust)' : 'var(--text-primary)', fontWeight: 600 }}>
                {new Date(followUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {new Date(followUpDate) < new Date() && ' ⚠ Overdue'}
              </div>
            </div>
          )}
        </div>

        {/* CATALYST TAGS */}
        {catalysts.length > 0 && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Active Catalysts</div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {catalysts.map((c, i) => {
                const cs = getCatalystStyle(c);
                const label = c?.tag || c;
                return (
                  <span key={i} style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 5, fontSize: 11.5, fontWeight: 500, border: `1px solid ${cs.bdr}`, background: cs.bg, color: cs.color, cursor: 'pointer' }}>
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* NOTES */}
        {l.notes && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Research Notes</div>
            </div>
            <div style={{ padding: '12px 16px', fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{l.notes}</div>
          </div>
        )}

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', marginBottom: 14 }}>
          {TABS.map(t => (
            <button key={t}
              onClick={() => setActiveTab(t)}
              style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t ? 'var(--blue)' : 'transparent'}`, marginBottom: -1, color: activeTab === t ? 'var(--blue)' : 'var(--text-tertiary)', fontWeight: activeTab === t ? 500 : 400, fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}
            >{t}</button>
          ))}
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'Timeline' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14 }}>
            {/* Activity feed */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--rust)' }} />
                  Activity Timeline
                </div>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue)', cursor: 'pointer' }} onClick={() => setLogPanel('note')}>+ Log Activity</span>
              </div>
              {activities.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: 14 }}>
                  No activity yet — log a call, email, or note above
                </div>
              ) : activities.map((a, i) => (
                <div key={a.id || i} style={{ display: 'flex', gap: 12, padding: '11px 16px', borderBottom: i < activities.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, marginTop: 1, background: ICON_BG[a.type] || ICON_BG.note, color: ICON_COLOR[a.type] || ICON_COLOR.note }}>
                    {ICON_EMOJI[a.type] || '📝'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      <strong>{a.contact_name ? `${a.type === 'call' ? 'Called' : a.type === 'email' ? 'Emailed' : 'Note re:'} ${a.contact_name}` : a.type?.charAt(0).toUpperCase() + a.type?.slice(1)}</strong>
                      {a.notes && ` — ${a.notes}`}
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      Briana Corso · {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', flexShrink: 0, paddingTop: 2 }}>
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>

            {/* Right col: owner + contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--card-border)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Owner</div>
                {[
                  ['Company', l.company || l.lead_name],
                  ['Owner Type', l.owner_type || '—'],
                  ['Contact', l.decision_maker || '—'],
                  ['Phone', l.phone || '—'],
                  ['Email', l.email || '—'],
                  ['Source', l.source || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{k}</span>
                    <span style={{ fontSize: 12.5, color: ['Phone','Email'].includes(k) ? 'var(--blue)' : 'var(--text-primary)', textAlign: 'right', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Pipeline */}
              <div style={{ background: 'rgba(24,112,66,0.04)', border: '1px solid rgba(24,112,66,0.15)', borderLeft: '3px solid var(--green)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--green)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Pipeline</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Ready to move into active deal tracking?</div>
                <button
                  onClick={convertToDeal}
                  style={{ width: '100%', padding: '9px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Convert to Deal →
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Building Specs' && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--card-border)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Building Specifications</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {[
                ['Building SF', l.building_sf ? Number(l.building_sf).toLocaleString() + ' SF' : '—'],
                ['Land Acres', l.land_acres ? l.land_acres + ' AC' : '—'],
                ['Clear Height', l.clear_height_ft ? l.clear_height_ft + "'" : '—'],
                ['Dock Doors', l.dock_doors || '—'],
                ['Grade Doors', l.grade_doors || '—'],
                ['Year Built', l.year_built || '—'],
                ['Zoning', l.zoning || '—'],
                ['Power', l.power_amps ? l.power_amps + 'A' : '—'],
                ['Parking Spaces', l.parking_spaces || '—'],
                ['Owner Type', l.owner_type || '—'],
                ['Market', l.market || '—'],
                ['Source', l.source || '—'],
              ].map(([k, v], i) => (
                <div key={k} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', borderRight: i % 2 === 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>{k}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Contacts' && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--card-border)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Contacts</div>
            {contacts.length === 0 && l.decision_maker ? (
              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{l.decision_maker}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Decision Maker</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {l.phone && <a href={`tel:${l.phone}`} style={{ fontSize: 12, color: 'var(--blue)' }}>📞 {l.phone}</a>}
                  {l.email && <a href={`mailto:${l.email}`} style={{ fontSize: 12, color: 'var(--blue)' }}>✉ {l.email}</a>}
                </div>
              </div>
            ) : contacts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--text-tertiary)' }}>No contacts linked yet</div>
            ) : contacts.map((c, i) => (
              <div key={c.id || i} style={{ padding: '12px 16px', borderBottom: i < contacts.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{c.name || c.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{c.title} {c.company ? `· ${c.company}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none' }}>📞 {c.phone}</a>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'APNs' && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--card-border)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>APNs</div>
            {apns.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--text-tertiary)' }}>No APNs linked yet</div>
            ) : apns.map((apn, i) => (
              <div key={apn.id || i} style={{ padding: '10px 16px', borderBottom: i < apns.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)' }}>{apn.apn}</span>
                <a href={`https://portal.assessor.lacounty.gov/parceldetail/${String(apn.apn).replace(/-/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--blue)' }}>View →</a>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Comps' && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: 14 }}>Comp analysis will load here</div>
          </div>
        )}

        {activeTab === 'Files' && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: 14 }}>No files attached yet</div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const S = {
  hbRust: { padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(184,55,20,0.30)', borderColor: 'rgba(220,100,70,0.45)', color: '#FFCBB8' },
  hbBlue: { padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(78,110,150,0.30)', borderColor: 'rgba(137,168,198,0.45)', color: '#C8E0F8' },
  hbAmber: { padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(140,90,4,0.30)', borderColor: 'rgba(220,160,50,0.45)', color: '#FFE0A0' },
  hbGreen: { padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(21,102,54,0.30)', borderColor: 'rgba(60,180,110,0.45)', color: '#B8F0D0' },
  abSep: { width: 1, height: 20, background: 'rgba(0,0,0,0.1)', margin: '0 2px' },
  btnAct: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-ui)' },
  btnLink: { background: 'none', border: 'none', color: 'var(--blue)', fontSize: 12, padding: '6px 8px', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(78,110,150,0.3)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' },
};
