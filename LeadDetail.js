'use client';

import { useState, useEffect, useMemo } from 'react';
import AerialThumbnail from './AerialThumbnail';
import { LEAD_STAGES, LEAD_STAGE_COLORS, LEAD_SUBSTEPS, LEAD_TIERS, PRIORITIES, PROP_TYPES, VACANCY_STATUS, LEASE_TYPES, OWNER_TYPES, MARKETS, SUBMARKETS, catalystTagClass, CATALYST_TAGS, CADENCE_OPTIONS, AI_MODEL_OPUS, AI_MODEL_SONNET, fmt } from '../lib/constants';
import { updateRow, convertLeadToDeal, convertLeadToProperty, insertRow, calculateProbability, setCadence, autoResearch } from '../lib/db';

const NOTE_TYPES = ['Note', 'Intel', 'Call Log', 'Meeting Note', 'Status Update'];
const LOG_TYPES = ['Call', 'Email', 'Meeting'];

async function getAINextStep(lead) {
  const prompt = `You are a CRE broker assistant. Give the single most important next action for this lead RIGHT NOW. Max 15 words.\n\nLead: ${lead.lead_name}\nStage: ${lead.stage}\nTier: ${lead.tier || 'N/A'} | Score: ${lead.score || 'N/A'}\nDM: ${lead.decision_maker || 'Unknown'}\nPhone: ${lead.phone || 'None'}\nCatalysts: ${(lead.catalyst_tags || []).join(', ') || 'None'}\nIntel: ${(lead.notes || '').slice(0, 400)}\n\nReply with ONLY the action.`;
  try {
    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, max_tokens: 80, messages: [{ role: 'user', content: prompt }] }) });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || 'Review lead and identify next contact';
  } catch { return 'Review lead and identify next contact'; }
}

export default function LeadDetail({
  lead, activities, tasks, properties, contacts, accounts,
  notes: allNotes, followUps: allFollowUps,
  onRefresh, showToast, onPropertyClick, onContactClick, onAccountClick, onCatalystClick,
  onAddActivity, onAddTask, onConverted
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...lead });
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertingProp, setConvertingProp] = useState(false);
  const [substeps, setSubsteps] = useState(lead.substeps || {});
  const [aiStep, setAiStep] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
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
  const [synth, setSynth] = useState(null);
  const [synthLoading, setSynthLoading] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [autoTagLoading, setAutoTagLoading] = useState(false);
  const [researching, setResearching] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const availSubs = form.market ? (SUBMARKETS[form.market] || []) : [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRow('leads', lead.id, {
        lead_name: form.lead_name, stage: form.stage, address: form.address, city: form.city, zip: form.zip,
        market: form.market, submarket: form.submarket, owner: form.owner, owner_type: form.owner_type,
        company: form.company, decision_maker: form.decision_maker, phone: form.phone, email: form.email,
        tier: form.tier, score: form.score ? parseInt(form.score) : null,
        priority: form.priority, next_action: form.next_action, next_action_date: form.next_action_date || null,
        est_value: form.est_value ? parseFloat(form.est_value) : null,
        building_sf: form.building_sf ? parseInt(form.building_sf) : null,
        prop_type: form.prop_type || null, record_type: form.record_type || null,
        land_acres: form.land_acres ? parseFloat(form.land_acres) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        clear_height: form.clear_height ? parseInt(form.clear_height) : null,
        dock_doors: form.dock_doors !== '' && form.dock_doors != null ? parseInt(form.dock_doors) : null,
        grade_doors: form.grade_doors !== '' && form.grade_doors != null ? parseInt(form.grade_doors) : null,
        vacancy_status: form.vacancy_status || null, lease_type: form.lease_type || null,
        lease_expiration: form.lease_expiration || null,
        in_place_rent: form.in_place_rent ? parseFloat(form.in_place_rent) : null,
        catalyst_tags: form.catalyst_tags || [], notes: form.notes,
        onedrive_url: form.onedrive_url || null,
      });
      onRefresh(); setEditing(false); showToast('Lead updated');
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleConvert = async () => {
    if (!confirm(`Convert "${lead.lead_name}" to a Deal? This will also create Account + Contact from owner info.`)) return;
    setConverting(true);
    try { await convertLeadToDeal(lead); onRefresh(); showToast(`${lead.lead_name} converted to Deal`); onConverted?.(); }
    catch (err) { console.error(err); } finally { setConverting(false); }
  };

  const handleConvertToProperty = async () => {
    if (!confirm('Create a Property from this lead? All property details carry over.')) return;
    setConvertingProp(true);
    try { await convertLeadToProperty(lead); onRefresh(); showToast((lead.address || 'Lead') + ' added to Properties'); }
    catch (err) { console.error(err); } finally { setConvertingProp(false); }
  };

  // Linked records
  const linkedActivities = (activities || []).filter(a => a.lead_id === lead.id);
  const linkedTasks = (tasks || []).filter(t => t.lead_id === lead.id);
  const linkedNotes = (allNotes || []).filter(n => n.lead_id === lead.id);
  const linkedFollowUps = (allFollowUps || []).filter(f => f.lead_id === lead.id);
  const linkedContacts = (contacts || []).filter(c => c.property_id === lead.property_id || c.company === lead.owner || c.company === lead.company).filter(c => c.id);
  const pendingTasks = linkedTasks.filter(t => !t.completed).length;
  const linkedProperty = (properties || []).find(p => p.address === lead.address || p.id === lead.property_id);
  const subs = LEAD_SUBSTEPS[lead.stage] || [];
  const subsDone = subs.filter(s => substeps[s]?.done).length;

  const timeline = [
    ...linkedActivities.map(a => ({ kind: 'activity', id: a.id, date: a.activity_date || a.created_at, icon: a.activity_type === 'Call' ? '📞' : a.activity_type === 'Email' ? '✉️' : '🤝', label: a.activity_type, subject: a.subject, detail: a.notes, outcome: a.outcome })),
    ...linkedNotes.map(n => ({ kind: 'note', id: n.id, date: n.created_at, icon: '📝', label: n.note_type || 'Note', subject: null, detail: n.content, pinned: n.pinned })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleAI = async () => {
    setAiLoading(true);
    try {
      const step = await getAINextStep(lead); setAiStep(step);
      const tmrw = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      await insertRow('tasks', { title: step, description: `AI next step for ${lead.lead_name}`, due_date: tmrw, priority: lead.priority || 'Medium', lead_id: lead.id, property_id: lead.property_id || null });
      await updateRow('leads', lead.id, { next_action: step, next_action_date: tmrw });
      onRefresh(); showToast('Task created');
    } catch (err) { console.error(err); } finally { setAiLoading(false); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return; setSavingNote(true);
    try { await insertRow('notes', { content: noteText.trim(), note_type: noteType, lead_id: lead.id }); setNoteText(''); setShowNoteForm(false); onRefresh?.(); showToast?.('Note added'); }
    catch (e) { console.error(e); } finally { setSavingNote(false); }
  };
  const handleLogActivity = async () => {
    if (!logSubject.trim()) return; setSavingLog(true);
    try { await insertRow('activities', { activity_type: logType, subject: logSubject.trim(), notes: logNotes || null, activity_date: new Date().toISOString().split('T')[0], lead_id: lead.id, property_id: lead.property_id || null, contact_id: logContactId || null }); setLogSubject(''); setLogNotes(''); setLogContactId(''); setShowLogForm(false); onRefresh?.(); showToast?.(`${logType} logged`); }
    catch (e) { console.error(e); } finally { setSavingLog(false); }
  };
  const handleAddFu = async () => {
    if (!fuReason.trim() || !fuDate) return; setSavingFu(true);
    try { await insertRow('follow_ups', { reason: fuReason.trim(), due_date: fuDate, lead_id: lead.id }); setFuReason(''); setFuDate(''); setShowFuForm(false); onRefresh?.(); showToast?.('Follow-up set'); }
    catch (e) { console.error(e); } finally { setSavingFu(false); }
  };
  const handleCompleteFu = async fu => {
    try { await updateRow('follow_ups', fu.id, { completed: true, completed_at: new Date().toISOString() }); onRefresh?.(); } catch (e) { console.error(e); }
  };

  // Load synthesis from record on mount
  useEffect(() => { if (lead.ai_synthesis && !synth) setSynth(lead.ai_synthesis); }, [lead.ai_synthesis]);

  const handleSynthesize = async () => {
    setSynthLoading(true); setSynth(null);
    const parts = [];
    if (lead.notes) parts.push(`[Original Intel] ${lead.notes}`);
    (allNotes || []).filter(n => n.lead_id === lead.id && n.note_type !== 'AI Synthesis').forEach(n => parts.push(`[${n.note_type || 'Note'} ${fmtAgo(n.created_at)}] ${n.content}`));
    linkedActivities.forEach(a => parts.push(`[${a.activity_type} ${fmtAgo(a.activity_date)}] ${a.subject}${a.notes ? ': ' + a.notes : ''}${a.outcome ? ' → ' + a.outcome : ''}`));
    const allText = parts.join('\n');
    if (!allText.trim()) { setSynth('No notes or activities to synthesize yet.'); setSynthLoading(false); return; }
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_MODEL_OPUS, max_tokens: 600,
          system: 'You are a CRE brokerage intelligence assistant. Synthesize all notes, intel, and activities into a concise lead status summary. Include: current status, owner/contact info, catalyst signals, outstanding issues, and the single most important next step. Be specific and actionable.',
          messages: [{ role: 'user', content: `Lead: ${lead.lead_name}\nStage: ${lead.stage}\nTier: ${lead.tier || 'N/A'} | Score: ${lead.score || 'N/A'}\nOwner: ${lead.owner || 'Unknown'}\nAddress: ${lead.address || 'N/A'}\nCatalysts: ${(lead.catalyst_tags || []).join(', ') || 'None'}\n\nAll Intel & Timeline:\n${allText}\n\nSynthesize into a brief status report with the single most important next step.` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'Could not generate synthesis.';
      setSynth(text);
      await updateRow('leads', lead.id, { ai_synthesis: text, ai_synthesis_at: new Date().toISOString() });
      onRefresh?.();
    } catch { setSynth('Error connecting to AI.'); }
    finally { setSynthLoading(false); }
  };

  // Catalyst tag management
  const addTag = async (tag) => { const current = lead.catalyst_tags || []; if (current.includes(tag)) return; const updated = [...current, tag]; try { const scores = calculateProbability({ ...lead, catalyst_tags: updated }); await updateRow('leads', lead.id, { catalyst_tags: updated, score: scores.rawScore }); onRefresh?.(); showToast?.(`Added: ${tag} (score: ${scores.rawScore})`); } catch (e) { console.error(e); } };
  const removeTag = async (tag) => { const updated = (lead.catalyst_tags || []).filter(t => t !== tag); try { const scores = calculateProbability({ ...lead, catalyst_tags: updated }); await updateRow('leads', lead.id, { catalyst_tags: updated, score: scores.rawScore }); onRefresh?.(); showToast?.(`Removed: ${tag}`); } catch (e) { console.error(e); } };
  const handleAutoTag = async () => {
    setAutoTagLoading(true);
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: AI_MODEL_SONNET, max_tokens: 200, system: `You are a CRE catalyst tag analyst. Given lead data and notes, suggest relevant catalyst tags from this exact list: ${CATALYST_TAGS.join(', ')}. Return ONLY a JSON array of tag strings.`, messages: [{ role: 'user', content: `Lead: ${lead.lead_name}\nOwner: ${lead.owner || 'Unknown'} (${lead.owner_type || 'Unknown'})\nCompany: ${lead.company || 'N/A'}\nAddress: ${lead.address || 'N/A'}\nTier: ${lead.tier || 'N/A'}\nNotes: ${(lead.notes || '').slice(0, 500)}\n\nExisting tags: ${(lead.catalyst_tags || []).join(', ') || 'None'}\n\nSuggest additional catalyst tags. Return JSON array only.` }] }) });
      const data = await res.json(); const text = data.content?.[0]?.text || '[]'; const clean = text.replace(/```json|```/g, '').trim(); const suggested = JSON.parse(clean);
      const newTags = suggested.filter(t => CATALYST_TAGS.includes(t) && !(lead.catalyst_tags || []).includes(t));
      if (newTags.length === 0) { showToast?.('No new tags suggested'); } else { const updated = [...(lead.catalyst_tags || []), ...newTags]; await updateRow('leads', lead.id, { catalyst_tags: updated }); onRefresh?.(); showToast?.(`Added ${newTags.length} tags: ${newTags.join(', ')}`); }
    } catch (e) { console.error(e); showToast?.('Error auto-suggesting tags'); } finally { setAutoTagLoading(false); }
  };

  const handleAutoResearch = async () => {
    setResearching(true);
    showToast?.('✦ Researching... this may take 15-30 seconds');
    try {
      const result = await autoResearch('lead', lead);
      if (!result) { showToast?.('No results found'); setResearching(false); return; }
      const updates = {};
      if (result.building_sf && !lead.building_sf) updates.building_sf = result.building_sf;
      if (result.year_built && !lead.year_built) updates.year_built = result.year_built;
      if (result.clear_height && !lead.clear_height) updates.clear_height = result.clear_height;
      if (result.dock_doors && !lead.dock_doors) updates.dock_doors = result.dock_doors;
      if (result.land_acres && !lead.land_acres) updates.land_acres = result.land_acres;
      if (result.prop_type && !lead.prop_type) updates.prop_type = result.prop_type;
      if (result.owner && !lead.owner) updates.owner = result.owner;
      if (result.owner_type && !lead.owner_type) updates.owner_type = result.owner_type;
      if (result.tenant && !lead.tenant) updates.tenant = result.tenant;
      if (result.vacancy_status && !lead.vacancy_status) updates.vacancy_status = result.vacancy_status;
      // Save research as a note
      const summary = [result.news_summary, result.ma_activity, result.bankruptcy_info].filter(Boolean).join('\n\n');
      if (summary) {
        await insertRow('notes', { content: `✦ Auto-Research Results:\n${summary}${result.sources?.length ? '\n\nSources: ' + result.sources.join(', ') : ''}`, note_type: 'Research', lead_id: lead.id });
      }
      // Add suggested catalyst tags
      if (result.suggested_catalyst_tags?.length) {
        const current = lead.catalyst_tags || [];
        const newTags = result.suggested_catalyst_tags.filter(t => !current.includes(t));
        if (newTags.length) updates.catalyst_tags = [...current, ...newTags];
      }
      if (Object.keys(updates).length > 0) {
        await updateRow('leads', lead.id, updates);
        showToast?.(`Auto-filled ${Object.keys(updates).length} fields`);
      } else { showToast?.('Research complete — no new data to fill'); }
      onRefresh?.();
    } catch (e) { console.error(e); showToast?.('Research error'); }
    finally { setResearching(false); }
  };

  const mapsUrl = lead.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address + ', ' + (lead.submarket || '') + ', CA')}` : null;
  const tierColor = t => ({ 'A+': '#22c55e', A: '#3b82f6', B: '#f59e0b', C: '#6b7280' }[t] || '#6b7280');
  const stageColor = LEAD_STAGE_COLORS[lead.stage] || '#6b7280';
  const fmtAgo = d => { if (!d) return ''; const dt = new Date(d); const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); const x = Math.floor((Date.now() - dt) / 86400000); if (x === 0) return 'Today ' + time; if (x === 1) return 'Yesterday ' + time; if (x < 7) return x + 'd ago ' + time; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + time; };
  const closeAll = () => { setShowNoteForm(false); setShowLogForm(false); setShowFuForm(false); };
  const toggleCatalyst = tag => setForm(f => ({ ...f, catalyst_tags: (f.catalyst_tags || []).includes(tag) ? f.catalyst_tags.filter(t => t !== tag) : [...(f.catalyst_tags || []), tag] }));

  const Field = ({ label, value, mono, accent }) => (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: value ? (accent ? 'var(--accent)' : 'var(--text-primary)') : 'var(--text-muted)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', fontWeight: accent && value ? 600 : 400 }}>{value || '—'}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* HEADER */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{lead.lead_name}</h2>
              {lead.tier && <span style={{ fontSize: '13px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: tierColor(lead.tier) + '22', color: tierColor(lead.tier) }}>{lead.tier}</span>}
              <span style={{ padding: '3px 10px', borderRadius: '5px', fontSize: '13px', fontWeight: 600, background: stageColor + '22', color: stageColor }}>{lead.stage}</span>
              {lead.score != null && <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>Score: {lead.score}</span>}
              {lead.follow_up_cadence && <span className="tag tag-blue" style={{ fontSize: '11px' }}>🔄 {lead.follow_up_cadence}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{[lead.address, lead.city, lead.submarket].filter(Boolean).join(' · ')}</span>
              {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>📍 Maps ↗</a>}
              {lead.onedrive_url && <a href={lead.onedrive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>📁 OneDrive ↗</a>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
            <div style={{position:'relative'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>{const dd=document.getElementById('lead-cadence-dd');dd.style.display=dd.style.display==='block'?'none':'block';}}>🔄 Cadence</button>
              <div id="lead-cadence-dd" style={{position:'absolute',right:0,top:'100%',marginTop:'4px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'8px',padding:'4px',zIndex:10,display:'none',minWidth:'140px',boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
                {CADENCE_OPTIONS.map(c=><div key={c.label} onClick={async()=>{try{await setCadence('leads',lead.id,c.label,c.days);onRefresh?.();showToast?.(`${c.label} follow-up set`);}catch(e){console.error(e);}document.getElementById('lead-cadence-dd').style.display='none';}} style={{padding:'6px 12px',fontSize:'13px',cursor:'pointer',borderRadius:'4px',whiteSpace:'nowrap'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-input)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{c.label}</div>)}
              </div>
            </div>
            {lead.stage !== 'Converted' && <button className="btn btn-primary btn-sm" onClick={handleConvert} disabled={converting}>{converting ? '...' : '⚡ Convert to Deal'}</button>}
            {!linkedProperty && <button className="btn btn-ghost btn-sm" onClick={handleConvertToProperty} disabled={convertingProp}>{convertingProp ? '...' : 'Create Property'}</button>}
            <button className="btn btn-ghost btn-sm" style={{ color: '#8b5cf6', borderColor: '#8b5cf644' }} onClick={handleAutoResearch} disabled={researching}>{researching ? '✦ Researching...' : '✦ Research'}</button>
          </div>
        </div>
        {/* CATALYST TAGS — clickable + add/remove + auto-suggest */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
            {(lead.catalyst_tags || []).map(tag => <span key={tag} className={`tag ${catalystTagClass(tag)}`} style={{ fontSize: '12px', cursor: 'pointer' }} onClick={() => onCatalystClick?.(tag)}>{tag}<span onClick={e => { e.stopPropagation(); removeTag(tag); }} style={{ marginLeft: '4px', cursor: 'pointer', opacity: 0.6, fontSize: '11px' }}>×</span></span>)}
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => setShowTagPicker(!showTagPicker)}>{showTagPicker ? 'Done' : '+ Tag'}</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '2px 8px', color: '#8b5cf6', borderColor: '#8b5cf644' }} onClick={handleAutoTag} disabled={autoTagLoading}>{autoTagLoading ? '✦ Analyzing...' : '✦ Auto-Tag'}</button>
          </div>
          {showTagPicker && (<div style={{ marginTop: '8px', padding: '10px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>{CATALYST_TAGS.filter(t => !(lead.catalyst_tags || []).includes(t)).map(t => <button key={t} onClick={() => addTag(t)} className={`tag ${catalystTagClass(t)}`} style={{ fontSize: '11px', cursor: 'pointer', opacity: 0.7, border: '1px dashed var(--border)' }}>{t}</button>)}</div>)}
        </div>
        {lead.next_action && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Next:</span>
            <span style={{ fontSize: '14px', color: 'var(--amber)', fontWeight: 500 }}>{lead.next_action}</span>
            {lead.next_action_date && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>· {lead.next_action_date}</span>}
          </div>
        )}
      </div>

      {/* TIMELINE */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px', color: '#8b5cf6', borderColor: '#8b5cf644' }} onClick={handleSynthesize} disabled={synthLoading}>{synthLoading ? '✦ Synthesizing...' : '✦ Synthesize'}</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => { closeAll(); setShowLogForm(!showLogForm); }}>{showLogForm ? 'Cancel' : '+ Log Call/Email'}</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => { closeAll(); setShowNoteForm(!showNoteForm); }}>{showNoteForm ? 'Cancel' : '+ Note'}</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => { closeAll(); setShowFuForm(!showFuForm); }}>{showFuForm ? 'Cancel' : '+ Follow-Up'}</button>
          </div>
        </div>

        {synth && (
          <div style={{ padding: '14px', background: '#8b5cf611', border: '1px solid #8b5cf633', borderRadius: '8px', marginBottom: '14px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase' }}>✦ AI Synthesis (Opus)</span>
              {lead.ai_synthesis_at && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{new Date(lead.ai_synthesis_at).toLocaleString()}</span>}
            </div>
            {synth}
          </div>
        )}

        {showLogForm && (
          <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '6px', marginBottom: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {LOG_TYPES.map(t => <button key={t} onClick={() => setLogType(t)} style={{ padding: '3px 10px', borderRadius: '4px', border: '1px solid', fontSize: '12px', cursor: 'pointer', borderColor: logType === t ? 'var(--accent)' : 'var(--border)', background: logType === t ? 'var(--accent-soft)' : 'transparent', color: logType === t ? 'var(--accent)' : 'var(--text-muted)' }}>{t === 'Call' ? '📞 Call' : t === 'Email' ? '✉️ Email' : '🤝 Meeting'}</button>)}
            </div>
            <input className="input" placeholder="Subject..." value={logSubject} onChange={e => setLogSubject(e.target.value)} style={{ marginBottom: '6px', fontSize: '14px' }} />
            {linkedContacts.length > 0 && <select className="select" value={logContactId} onChange={e => setLogContactId(e.target.value)} style={{ marginBottom: '6px', fontSize: '13px' }}><option value="">Link to contact (optional)</option>{linkedContacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}</select>}
            <textarea className="textarea" rows={2} value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Notes..." style={{ marginBottom: '8px', fontSize: '13px' }} />
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLogForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleLogActivity} disabled={savingLog || !logSubject.trim()}>{savingLog ? '...' : `Log ${logType}`}</button>
            </div>
          </div>
        )}

        {showNoteForm && (
          <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '6px', marginBottom: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {NOTE_TYPES.map(t => <button key={t} onClick={() => setNoteType(t)} style={{ padding: '3px 10px', borderRadius: '4px', border: '1px solid', fontSize: '12px', cursor: 'pointer', borderColor: noteType === t ? 'var(--accent)' : 'var(--border)', background: noteType === t ? 'var(--accent-soft)' : 'transparent', color: noteType === t ? 'var(--accent)' : 'var(--text-muted)' }}>{t}</button>)}
            </div>
            <textarea className="textarea" rows={3} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." style={{ marginBottom: '8px', fontSize: '14px' }} />
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNoteForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={savingNote || !noteText.trim()}>{savingNote ? '...' : 'Save'}</button>
            </div>
          </div>
        )}

        {showFuForm && (
          <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '6px', marginBottom: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input" style={{ flex: 1, fontSize: '14px' }} placeholder="Follow-up reason..." value={fuReason} onChange={e => setFuReason(e.target.value)} />
              <input className="input" type="date" style={{ width: '160px', fontSize: '14px' }} value={fuDate} onChange={e => setFuDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowFuForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleAddFu} disabled={savingFu || !fuReason.trim() || !fuDate}>{savingFu ? '...' : 'Set Follow-Up'}</button>
            </div>
          </div>
        )}

        {linkedFollowUps.filter(f => !f.completed).length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            {linkedFollowUps.filter(f => !f.completed).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map(fu => {
              const od = new Date(fu.due_date) < new Date(new Date().toDateString());
              return (<div key={fu.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: od ? 'var(--red-soft)' : 'var(--amber-soft)', border: `1px solid ${od ? 'var(--red)' : 'var(--amber)'}33` }}>
                <span>{od ? '⚠' : '🔔'}</span>
                <div style={{ flex: 1 }}><span style={{ fontSize: '14px', fontWeight: 500, color: od ? 'var(--red)' : 'var(--amber)' }}>{fu.reason}</span><span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'var(--font-mono)' }}>{od ? 'OVERDUE · ' : ''}{fu.due_date}</span></div>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }} onClick={() => handleCompleteFu(fu)}>✓</button>
              </div>);
            })}
          </div>
        )}

        {timeline.length === 0 && !lead.notes ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No activity yet</div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            <div style={{ position: 'absolute', left: '7px', top: '4px', bottom: '4px', width: '2px', background: 'var(--border)' }} />
            {lead.notes && linkedNotes.length === 0 && (
              <div style={{ position: 'relative', paddingBottom: '14px' }}>
                <div style={{ position: 'absolute', left: '-24px', top: '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>📝</div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Intel / Notes</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{lead.notes}</div>
                </div>
              </div>
            )}
            {timeline.map(item => (
              <div key={item.id} style={{ position: 'relative', paddingBottom: '14px' }}>
                <div style={{ position: 'absolute', left: '-24px', top: '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>{item.icon}</div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: item.detail ? '4px' : 0, flexWrap: 'wrap' }}>
                    <span className={`tag ${item.kind === 'note' ? 'tag-purple' : 'tag-blue'}`} style={{ fontSize: '11px' }}>{item.label}</span>
                    {item.subject && <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.subject}</span>}
                    {item.outcome && <span className="tag tag-ghost" style={{ fontSize: '11px' }}>{item.outcome}</span>}
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{fmtAgo(item.date)}</span>
                  </div>
                  {item.detail && <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT or DETAIL CARDS */}
      {editing ? (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Lead Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Lead Name</label><input className="input" value={form.lead_name || ''} onChange={e => set('lead_name', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Stage</label><select className="select" value={form.stage} onChange={e => set('stage', e.target.value)}>{LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Priority</label><select className="select" value={form.priority || ''} onChange={e => set('priority', e.target.value)}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Decision Maker</label><input className="input" value={form.decision_maker || ''} onChange={e => set('decision_maker', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Company</label><input className="input" value={form.company || ''} onChange={e => set('company', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Owner</label><input className="input" value={form.owner || ''} onChange={e => set('owner', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Owner Type</label><select className="select" value={form.owner_type || ''} onChange={e => set('owner_type', e.target.value)}><option value="">Select</option>{OWNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="input" value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Score</label><input className="input" type="number" value={form.score || ''} onChange={e => set('score', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Tier</label><select className="select" value={form.tier || ''} onChange={e => set('tier', e.target.value)}><option value="">Select</option>{LEAD_TIERS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Est. Value ($)</label><input className="input" type="number" value={form.est_value || ''} onChange={e => set('est_value', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Next Action</label><input className="input" value={form.next_action || ''} onChange={e => set('next_action', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Next Action Date</label><input className="input" type="date" value={form.next_action_date || ''} onChange={e => set('next_action_date', e.target.value)} /></div>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '16px', marginBottom: '10px' }}>Property Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group"><label className="form-label">Address</label><input className="input" value={form.address || ''} onChange={e => set('address', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">City</label><input className="input" value={form.city || ''} onChange={e => set('city', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">ZIP</label><input className="input" value={form.zip || ''} onChange={e => set('zip', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Market</label><select className="select" value={form.market || ''} onChange={e => { set('market', e.target.value); set('submarket', ''); }}><option value="">Select</option>{MARKETS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Submarket</label><select className="select" value={form.submarket || ''} onChange={e => set('submarket', e.target.value)}><option value="">Select</option>{availSubs.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Prop Type</label><select className="select" value={form.prop_type || ''} onChange={e => set('prop_type', e.target.value)}><option value="">Select</option>{PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Building SF</label><input className="input" type="number" value={form.building_sf || ''} onChange={e => set('building_sf', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Land (acres)</label><input className="input" type="number" step="0.01" value={form.land_acres || ''} onChange={e => set('land_acres', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Year Built</label><input className="input" type="number" value={form.year_built || ''} onChange={e => set('year_built', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Clear Height</label><input className="input" type="number" value={form.clear_height || ''} onChange={e => set('clear_height', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Dock Doors</label><input className="input" type="number" value={form.dock_doors ?? ''} onChange={e => set('dock_doors', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Grade Doors</label><input className="input" type="number" value={form.grade_doors ?? ''} onChange={e => set('grade_doors', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Vacancy</label><select className="select" value={form.vacancy_status || ''} onChange={e => set('vacancy_status', e.target.value)}><option value="">Select</option>{VACANCY_STATUS.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Lease Type</label><select className="select" value={form.lease_type || ''} onChange={e => set('lease_type', e.target.value)}><option value="">Select</option>{LEASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Lease Exp.</label><input className="input" type="date" value={form.lease_expiration || ''} onChange={e => set('lease_expiration', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">In-Place Rent</label><input className="input" type="number" step="0.01" value={form.in_place_rent || ''} onChange={e => set('in_place_rent', e.target.value)} /></div>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '16px', marginBottom: '10px' }}>Catalysts</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {CATALYST_TAGS.map(tag => <button key={tag} type="button" className={`tag ${(form.catalyst_tags || []).includes(tag) ? 'tag-amber' : 'tag-ghost'}`} style={{ cursor: 'pointer', border: 'none', fontSize: '12px' }} onClick={() => toggleCatalyst(tag)}>{tag}</button>)}
          </div>

          <div className="form-group"><label className="form-label">OneDrive Link</label><input className="input" placeholder="https://..." value={form.onedrive_url || ''} onChange={e => set('onedrive_url', e.target.value)} /></div>
          <div className="form-group" style={{ marginTop: '8px' }}><label className="form-label">Notes / Intel</label><textarea className="textarea" rows={4} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Contact Info</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Decision Maker" value={lead.decision_maker} />
                <Field label="Company" value={lead.company} />
                <Field label="Owner" value={lead.owner} />
                <Field label="Owner Type" value={lead.owner_type} />
                <Field label="Phone" value={lead.phone} mono />
                <Field label="Email" value={lead.email} />
                <Field label="Est. Value" value={lead.est_value ? fmt.price(lead.est_value) : null} mono accent />
                <Field label="Priority" value={lead.priority} />
              </div>
              {lead.phone && <a href={`tel:${lead.phone}`} style={{ display: 'block', textAlign: 'center', marginTop: '12px', padding: '8px', borderRadius: '6px', background: 'var(--accent-soft)', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: '14px', border: '1px solid var(--accent)' }}>📞 Call {lead.decision_maker || 'Contact'}</a>}
            </div>
            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Property Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Address" value={lead.address} />
                <Field label="City" value={lead.city} />
                <Field label="Market" value={lead.market} />
                <Field label="Submarket" value={lead.submarket} />
                <Field label="Property Type" value={lead.prop_type} />
                <Field label="Building SF" value={lead.building_sf ? Number(lead.building_sf).toLocaleString() + ' SF' : null} mono accent />
                <Field label="Land" value={lead.land_acres ? lead.land_acres + ' acres' : null} mono />
                <Field label="Year Built" value={lead.year_built} mono />
                <Field label="Clear Height" value={lead.clear_height ? lead.clear_height + "'" : null} mono />
                <Field label="Dock Doors" value={lead.dock_doors != null && lead.dock_doors !== '' ? String(lead.dock_doors) : null} mono />
                <Field label="Grade Doors" value={lead.grade_doors != null && lead.grade_doors !== '' ? String(lead.grade_doors) : null} mono />
                <Field label="Vacancy" value={lead.vacancy_status} />
                <Field label="Lease Type" value={lead.lease_type} />
                <Field label="In-Place Rent" value={lead.in_place_rent ? '$' + Number(lead.in_place_rent).toFixed(2) + '/SF/Mo' : null} mono accent />
                <Field label="Lease Exp." value={lead.lease_expiration ? fmt.date(lead.lease_expiration) : null} mono />
              </div>
              {!lead.building_sf && !lead.prop_type && !lead.land_acres && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>No property details yet — click Edit to add</div>}
            </div>
          </div>

          {/* OWNER OUTREACH LOG + AI */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Owner Outreach — {lead.stage} ({subsDone}/{subs.length})</h3>
              {subs.length > 0 ? (<>
                <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}><div style={{ width: `${subs.length > 0 ? Math.round(subsDone / subs.length * 100) : 0}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} /></div>
                {subs.map(step => {
                  const entry = substeps[step];
                  const logged = entry && entry.done;
                  return (
                    <div key={step} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div onClick={() => {
                        if (logged) { const updated = { ...substeps }; delete updated[step]; setSubsteps(updated); updateRow('leads', lead.id, { substeps: updated }).catch(console.error); }
                        else { const updated = { ...substeps, [step]: { done: true, at: new Date().toISOString() } }; setSubsteps(updated); updateRow('leads', lead.id, { substeps: updated }).catch(console.error); }
                      }} style={{ width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0, border: '2px solid', borderColor: logged ? 'var(--accent)' : 'var(--border)', background: logged ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', cursor: 'pointer' }}>{logged ? '✓' : ''}</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '13px', color: logged ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: logged ? 400 : 500 }}>{step}</span>
                        {logged && entry.at && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'var(--font-mono)' }}>{new Date(entry.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(entry.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
                      </div>
                    </div>
                  );
                })}
              </>) : <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No outreach steps for this stage</div>}
            </div>
            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>AI Next Step</h3>
              <button className="btn btn-ghost" onClick={handleAI} disabled={aiLoading} style={{ width: '100%', marginBottom: '12px', color: 'var(--amber)', borderColor: 'var(--amber)' }}>{aiLoading ? 'Thinking...' : '✦ Get AI Recommendation'}</button>
              {aiStep && <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', borderLeft: '3px solid var(--amber)' }}><div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--amber)' }}>{aiStep}</div></div>}
            </div>
          </div>

          {/* AERIAL MAP */}
          {lead.address && <AerialThumbnail address={lead.address} city={lead.city} />}

          {linkedProperty && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Linked Property</h3>
              <div onClick={() => onPropertyClick?.(linkedProperty)} style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{linkedProperty.address}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{linkedProperty.submarket} · {linkedProperty.building_sf ? linkedProperty.building_sf.toLocaleString() + ' SF' : ''}</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TASKS */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasks {pendingTasks > 0 && <span style={{ color: '#ef4444' }}>({pendingTasks})</span>}</h3>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => onAddTask?.(lead.id)}>+ Task</button>
        </div>
        {linkedTasks.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No tasks</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {linkedTasks.sort((a, b) => a.completed - b.completed).map(t => {
              const pc = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }[t.priority] || '#6b7280';
              const od = !t.completed && t.due_date && new Date(t.due_date) < new Date();
              return (<div key={t.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '6px', borderLeft: `3px solid ${t.completed ? 'var(--border)' : pc}`, opacity: t.completed ? 0.6 : 1 }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, marginTop: '2px', border: '2px solid', borderColor: t.completed ? 'var(--accent)' : pc, background: t.completed ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>{t.completed ? '✓' : ''}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: '14px', fontWeight: 500, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>{t.due_date && <div style={{ fontSize: '12px', color: od ? 'var(--red)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{od ? '⚠ ' : ''}{t.due_date}</div>}</div>
                <span style={{ fontSize: '12px', padding: '1px 5px', borderRadius: '3px', background: pc + '22', color: pc }}>{t.priority}</span>
              </div>);
            })}
          </div>
        )}
      </div>
    </div>
  );
}
