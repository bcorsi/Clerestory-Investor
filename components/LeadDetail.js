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
  const tierColor = t => ({ 'A+': 'var(--green)', A: 'var(--blue)', B: 'var(--amber)', C: 'var(--ink3)' }[t] || 'var(--ink3)');
  const stageColor = LEAD_STAGE_COLORS[lead.stage] || 'var(--ink3)';
  const fmtAgo = d => { if (!d) return ''; const dt = new Date(d); const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); const x = Math.floor((Date.now() - dt) / 86400000); if (x === 0) return 'Today ' + time; if (x === 1) return 'Yesterday ' + time; if (x < 7) return x + 'd ago ' + time; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + time; };
  const closeAll = () => { setShowNoteForm(false); setShowLogForm(false); setShowFuForm(false); };
  const toggleCatalyst = tag => setForm(f => ({ ...f, catalyst_tags: (f.catalyst_tags || []).includes(tag) ? f.catalyst_tags.filter(t => t !== tag) : [...(f.catalyst_tags || []), tag] }));

  const Field = ({ label, value, mono, accent }) => (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: value ? (accent ? 'var(--accent)' : 'var(--text-primary)') : 'var(--text-muted)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', fontWeight: accent && value ? 600 : 400 }}>{value || '—'}</div>
    </div>
  );


  const probColor = v => v >= 75 ? 'var(--green)' : v >= 50 ? 'var(--amber)' : 'var(--ink3)';

  const handleCreateProperty = async () => {
    try { await convertLeadToProperty(lead); onRefresh(); showToast((lead.address || 'Lead') + ' added to Properties'); }
    catch (e) { console.error(e); showToast?.('Error creating property'); }
  };

  const handleConvertDeal = async () => {
    try { await convertLeadToDeal(lead); onRefresh(); showToast(`${lead.lead_name} converted to Deal`); onConverted?.(); }
    catch (e) { console.error(e); showToast?.('Error converting to deal'); }
  };

  const handleStageChange = async (newStage) => {
    try { await updateRow('leads', lead.id, { stage: newStage }); onRefresh(); showToast?.(`Stage → ${newStage}`); }
    catch (e) { console.error(e); }
  };

  const setShowEdit = (v) => setEditing(v);


  const LEAD_SUBSTEP_MAP = {
    'New': ['Review lead source', 'Verify property data', 'Check for duplicates'],
    'Researching': ['Research ownership records', 'Identify decision maker', 'Pull comps / market data'],
    'Contacted': ['Initial outreach call', 'Send intro email', 'Follow up (2nd touch)'],
    'Engaged': ['Schedule meeting / tour', 'Present market data', 'Discuss motivation / timeline'],
    'Qualified': ['Confirm deal parameters', 'Verify financials', 'Introduce to buyer/tenant pool'],
    'Proposal': ['Prepare proposal / BOV', 'Present proposal', 'Address objections'],
    'Negotiating': ['Draft LOI', 'Negotiate terms', 'Finalize agreement'],
  };

  return (
    <div>
      {/* ═══ LEAD HEADER ═══ */}
      <div className="lead-header" style={{ padding: '24px 36px 16px', background: 'var(--card)', borderBottom: '1px solid var(--line)' }}>
        <div className="lead-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '28px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>{lead.lead_name}</div>
            <div className="badges-row" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(lead.catalyst_tags||[]).map(tag => (
                <span key={tag} className={`badge ${catalystTagClass(tag)}`}>{tag}</span>
              ))}
              {lead.tier && <span className="badge badge-blue">Tier {lead.tier}</span>}
              <span className="badge badge-blue">{lead.stage || 'New'}</span>
            </div>
          </div>
          <div className="action-row" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="btn" onClick={() => setShowEdit(true)}>Edit</button>
            {onAddActivity && <button className="btn" onClick={() => onAddActivity(lead.id)}>+ Activity</button>}
            {onAddTask && <button className="btn" onClick={() => onAddTask(lead.id)}>+ Task</button>}
            <button className="btn btn-blue" onClick={handleCreateProperty}>Create Property</button>
            <button className="btn btn-primary" onClick={handleConvertDeal}>⚡ Convert to Deal</button>
          </div>
        </div>
        {lead.next_action && (
          <div className="next-bar" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg)', borderRadius: '9px' }}>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '14px', fontStyle: 'italic', color: 'var(--ink4)' }}>Next action</span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--amber)' }}>{lead.next_action}</span>
            {lead.next_action_date && <><span style={{ color: 'var(--ink4)', opacity: 0.4 }}>·</span><span style={{ fontFamily: "'DM Mono',monospace", fontSize: '12px', color: 'var(--ink4)' }}>{lead.next_action_date}</span></>}
          </div>
        )}
      </div>

      {/* ═══ PAGE LAYOUT ═══ */}
      <div className="page-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '24px', padding: '28px 36px 48px' }}>
        <div>
          {/* Aerial */}
          {/* Aerial with parcel overlay */}
          {lead.address && (
            <div style={{ marginBottom: '20px' }}>
              <AerialThumbnail address={lead.address} city={lead.city} apns={lead.apns} height={240} />
            </div>
          )}

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

            {showNoteForm && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                <select className="select" value={noteType} onChange={e => setNoteType(e.target.value)} style={{ marginBottom: '8px', maxWidth: '180px' }}>
                  {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <textarea className="textarea" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add note..." rows={3} />
                <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={handleAddNote} disabled={savingNote}>{savingNote ? 'Saving...' : 'Save Note'}</button>
              </div>
            )}

            {showLogForm && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {LOG_TYPES.map(t => <button key={t} className={`btn btn-sm ${logType === t ? 'btn-blue' : ''}`} onClick={() => setLogType(t)}>{t}</button>)}
                </div>
                <input className="input" value={logSubject} onChange={e => setLogSubject(e.target.value)} placeholder="Subject..." style={{ marginBottom: '8px' }} />
                <textarea className="textarea" value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Notes..." rows={2} />
                <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={handleLogAct} disabled={savingLog}>{savingLog ? 'Saving...' : 'Log Activity'}</button>
              </div>
            )}

            {showFuForm && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                <input className="input" value={fuReason} onChange={e => setFuReason(e.target.value)} placeholder="Follow-up reason..." style={{ marginBottom: '8px' }} />
                <input className="input" type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} style={{ marginBottom: '8px', maxWidth: '200px' }} />
                <button className="btn btn-primary" onClick={handleAddFu} disabled={savingFu}>{savingFu ? 'Saving...' : 'Set Follow-Up'}</button>
              </div>
            )}

            {synth && (
              <div style={{ padding: '16px 20px', background: 'var(--purple-bg)', borderBottom: '1px solid rgba(96,64,168,0.2)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--purple)', textTransform: 'uppercase', marginBottom: '6px' }}>✦ AI Synthesis</div>
                <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>{synth}</div>
              </div>
            )}

            {/* WARN Dossier if source is WARN */}
            {(lead.source === 'WARN' || (lead.catalyst_tags||[]).includes('WARN Notice')) && (
              <div className="tl-entry">
                <div className="tl-dot-warn" style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--rust)', boxShadow: '0 0 0 3px var(--bg)', flexShrink: 0, marginTop: '5px' }} />
                <div style={{ flex: 1 }}>
                  <div className="entry-date" style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', color: 'var(--ink4)', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    {lead.warn_effective_date ? new Date(lead.warn_effective_date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}).toUpperCase() : 'WARN NOTICE'}
                  </div>
                  <div className="dossier" style={{ background: 'var(--bg)', borderRadius: '9px', padding: '16px', borderLeft: '3px solid var(--rust)', position: 'relative' }}>
                    <div style={{ position: 'absolute', right: '14px', top: '12px', fontFamily: "'DM Mono',monospace", fontSize: '9px', letterSpacing: '0.3em', color: 'var(--rust)', opacity: 0.4 }}>FILED</div>
                    {[
                      ['Company', lead.warn_company || lead.lead_name],
                      ['Address', lead.address],
                      ['County', lead.warn_county || 'Los Angeles County'],
                      ['Type', lead.warn_type || '—'],
                      ['Employees', lead.warn_employees || '—'],
                      ['Effective', lead.warn_effective_date || '—'],
                      ['Filed', lead.warn_notice_date || lead.created_at?.split('T')[0] || '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink4)', minWidth: '80px' }}>{k}</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: (k === 'Type' || k === 'Effective') ? 'var(--rust)' : 'var(--ink2)' }}>{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
            {timeline.length === 0 && !(lead.source === 'WARN') ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink4)', fontSize: '13px' }}>No activity yet</div>
            ) : timeline.slice(0, 20).map(e => (
              <div key={`${e.kind}-${e.id}`} className="tl-entry">
                <div className="tl-dot" style={e.kind === 'activity' ? { background: 'var(--amber)', boxShadow: '0 0 0 3px rgba(184,122,16,0.08)' } : {}} />
                <div>
                  <div className="entry-date" style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', color: 'var(--ink4)', letterSpacing: '0.06em', marginBottom: '6px' }}>{e.date ? new Date(e.date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}).toUpperCase() : ''}</div>
                  <div className="entry-text" style={{ fontSize: '14px', color: 'var(--ink2)', lineHeight: 1.72 }}>{e.subject && <strong>{e.subject}. </strong>}{e.detail || ''}{e.outcome && <span style={{ color: 'var(--green)' }}> → {e.outcome}</span>}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact & Property Info */}
          <div className="info-card" style={{ marginTop: '20px' }}>
            <div className="info-card-head">Contact & Property Info</div>
            <div className="info-grid">
              <div className="info-cell"><div className="i-label">Decision Maker</div><div className={`i-val ${lead.decision_maker ? '' : ''}`} style={!lead.decision_maker ? { fontStyle: 'italic', color: 'var(--ink4)' } : {}}>{lead.decision_maker || 'Not yet identified'}</div></div>
              <div className="info-cell"><div className="i-label">Owner</div><div className="i-val" style={!lead.owner ? { fontStyle: 'italic', color: 'var(--ink4)' } : {}}>{lead.owner || 'Research needed'}</div></div>
              <div className="info-cell"><div className="i-label">Est. Value</div><div className="i-val">{lead.estimated_value ? fmt.price(lead.estimated_value) : '—'}</div></div>
              <div className="info-cell"><div className="i-label">Priority</div><div className="i-val" style={{ color: lead.priority === 'High' ? 'var(--rust)' : lead.priority === 'Medium' ? 'var(--amber)' : 'var(--ink3)', fontWeight: 600 }}>{lead.priority || '—'}</div></div>
              <div className="info-cell"><div className="i-label">Market</div><div className="i-val">{[lead.market, lead.submarket || lead.city].filter(Boolean).join(' · ') || '—'}</div></div>
              <div className="info-cell"><div className="i-label">Site Size</div><div className="i-val">{lead.building_sf ? Number(lead.building_sf).toLocaleString() + ' SF' : lead.land_acres ? lead.land_acres + ' acres' : '—'}</div></div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="right-col">
          {/* Opportunity Stages */}
          <div className="side-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden', marginBottom: '14px' }}>
            <div className="side-head" style={{ padding: '13px 18px', background: 'var(--bg)', fontSize: '13px', fontWeight: 600, color: 'var(--ink2)', borderBottom: '1px solid var(--line)' }}>Opportunity Stages</div>
            <div style={{ padding: '10px 8px' }}>
              {(LEAD_SUBSTEP_MAP[lead.stage] ? LEAD_STAGES.filter(s => s !== 'Dead') : LEAD_STAGES.filter(s => !['Converted','Dead'].includes(s))).map(stage => {
                const idx = LEAD_STAGES.indexOf(stage);
                const curIdx = LEAD_STAGES.indexOf(lead.stage);
                const isDone = idx < curIdx;
                const isCurrent = idx === curIdx;
                return (
                  <div key={stage} className={`stage-row ${isCurrent ? 'current' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', borderRadius: '7px', cursor: 'pointer' }} onClick={() => handleStageChange(stage)}>
                    <div className={`stage-icon ${isDone ? 'si-done' : isCurrent ? 'si-active' : 'si-pending'}`} style={{
                      width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700,
                      background: isDone ? 'var(--green-bg)' : isCurrent ? 'var(--amber-bg)' : 'var(--bg2)',
                      color: isDone ? 'var(--green)' : isCurrent ? 'var(--amber)' : 'var(--ink4)',
                      border: `1px solid ${isDone ? 'rgba(26,122,72,0.2)' : isCurrent ? 'rgba(184,122,16,0.22)' : 'var(--line)'}`,
                      animation: isCurrent ? 'blink 1.5s infinite' : 'none'
                    }}>{isDone ? '✓' : isCurrent ? '◉' : '○'}</div>
                    <span style={{ fontSize: '13px', color: isCurrent ? 'var(--amber)' : 'var(--ink3)', fontWeight: 500 }}>{stage}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Signal Card */}
          {synth && (
            <div className="signal-card" style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', borderRadius: '10px', overflow: 'hidden', marginBottom: '14px' }}>
              <div className="signal-head" style={{ padding: '12px 18px', background: 'rgba(85,119,160,0.12)', borderBottom: '1px solid var(--blue-bdr)', fontSize: '12px', fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.04em' }}>✦ AI Signal</div>
              <div className="signal-body" style={{ padding: '14px 18px', fontSize: '14px', lineHeight: 1.75, color: 'var(--ink2)' }}>{synth.split('\n')[0]}</div>
            </div>
          )}

          {/* Score */}
          {(lead.score || lead.probability) && (
            <div className="info-card" style={{ marginBottom: '14px' }}>
              <div className="info-card-head">Score</div>
              <div style={{ padding: '14px 16px', display: 'flex', gap: '20px' }}>
                {lead.score != null && <div><div className="i-label">AI Score</div><div style={{ fontFamily: "'Playfair Display',serif", fontSize: '28px', fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{lead.score}</div></div>}
                {lead.probability != null && <div><div className="i-label">Probability</div><div style={{ fontFamily: "'Playfair Display',serif", fontSize: '28px', fontWeight: 700, color: probColor(lead.probability), lineHeight: 1 }}>{lead.probability}%</div></div>}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button className="quick-btn" onClick={handleAutoResearch} disabled={researching} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 16px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '9px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--ink3)', fontFamily: "'Instrument Sans',sans-serif" }}>{researching ? '✦ Researching...' : '✦ Auto-Research'}</button>
            <button className="quick-btn" onClick={handleCreateProperty} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 16px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '9px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--ink3)', fontFamily: "'Instrument Sans',sans-serif" }}>Create property record</button>
            <button className="quick-btn" onClick={handleConvertDeal} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 16px', background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', borderRadius: '9px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--blue)', fontFamily: "'Instrument Sans',sans-serif" }}>⚡ Convert to active deal</button>
          </div>

          {/* Cadence */}
          <div style={{ marginTop: '14px' }}>
            <div className="i-label" style={{ marginBottom: '6px' }}>Follow-Up Cadence</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {CADENCE_OPTIONS.map(c => (
                <button key={c.label} className={`btn btn-sm ${lead.follow_up_cadence === c.label ? 'btn-blue' : ''}`}
                  onClick={async () => { try { await setCadence('leads', lead.id, c.label, c.days); onRefresh?.(); showToast?.(`${c.label} set`); } catch(e) { console.error(e); } }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
