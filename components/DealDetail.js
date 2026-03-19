'use client';

import { useState, useEffect, useMemo } from 'react';
import { DEAL_STAGES, STAGE_COLORS, DEAL_TYPES, STRATEGIES, MARKETING_TYPES, OUTREACH_METHODS, OUTREACH_OUTCOMES, DEAL_CONTACT_ROLES, CADENCE_OPTIONS, AI_MODEL_OPUS, AI_MODEL_SONNET, catalystTagClass, fmt } from '../lib/constants';
import { updateRow, insertRow, fetchDealContacts, addDealContact, removeDealContact, fetchBuyerOutreach, insertOutreach, setCadence } from '../lib/db';
import Underwriting from './Underwriting';
import FilesLinks from './FilesLinks';
import AerialThumbnail from './AerialThumbnail';

const NOTE_TYPES = ['Note', 'Intel', 'Call Log', 'Meeting Note', 'Status Update'];
const LOG_TYPES = ['Call', 'Email', 'Meeting'];

export default function DealDetail({
  deal, activities, tasks, properties, contacts, accounts, leaseComps, saleComps,
  notes: allNotes, followUps: allFollowUps,
  onRefresh, showToast, onPropertyClick, onContactClick, onAccountClick, onCatalystClick, onAddTask, onLeaseCompClick, onSaleCompClick
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...deal });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');
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
  // Deal contacts
  const [dealContacts, setDealContacts] = useState([]);
  const [showDcForm, setShowDcForm] = useState(false);
  const [dcContactId, setDcContactId] = useState('');
  const [dcRole, setDcRole] = useState('Participant');
  // Buyer outreach
  const [outreachLog, setOutreachLog] = useState([]);
  const [showOrForm, setShowOrForm] = useState(false);
  const [orAcctId, setOrAcctId] = useState('');
  const [orContactId, setOrContactId] = useState('');
  const [orMethod, setOrMethod] = useState('Email');
  const [orOutcome, setOrOutcome] = useState('');
  const [orNotes, setOrNotes] = useState('');
  // AI synthesis
  const [synth, setSynth] = useState(null);
  const [synthLoading, setSynthLoading] = useState(false);

  useEffect(() => {
    fetchDealContacts(deal.id).then(setDealContacts).catch(() => {});
    fetchBuyerOutreach(deal.id).then(setOutreachLog).catch(() => {});
  }, [deal.id]);

  const set = (field, val) => setForm(f => {
    const u = { ...f, [field]: val };
    if ((field === 'deal_value' || field === 'commission_rate') && u.deal_value && u.commission_rate)
      u.commission_est = (parseFloat(u.deal_value) * parseFloat(u.commission_rate) / 100).toFixed(0);
    return u;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRow('deals', deal.id, {
        deal_name: form.deal_name, stage: form.stage, deal_type: form.deal_type,
        strategy: form.strategy, marketing_type: form.marketing_type,
        address: form.address, submarket: form.submarket, market: form.market,
        buyer: form.buyer, seller: form.seller, tenant_name: form.tenant_name,
        deal_value: form.deal_value ? parseFloat(form.deal_value) : null,
        commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : null,
        commission_est: form.commission_est ? parseFloat(form.commission_est) : null,
        probability: form.probability ? parseInt(form.probability) : null,
        priority: form.priority, close_date: form.close_date || null,
        onedrive_url: form.onedrive_url || null, notes: form.notes,
      });
      onRefresh(); setEditing(false); showToast('Deal updated');
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleStageChange = async (newStage) => {
    if (newStage === deal.stage) return;
    try {
      await updateRow('deals', deal.id, { stage: newStage });
      await insertRow('activities', { activity_type: 'To-Do', subject: `Stage changed: ${deal.stage} → ${newStage}`, notes: 'Auto-logged status update', deal_id: deal.id, activity_date: new Date().toISOString().split('T')[0], completed: true }).catch(() => {});
      onRefresh(); showToast(`Moved to ${newStage}`);
    } catch (err) { console.error(err); }
  };

  const linkedActivities = (activities || []).filter(a => a.deal_id === deal.id);
  const linkedTasks = (tasks || []).filter(t => t.deal_id === deal.id);
  const linkedNotes = (allNotes || []).filter(n => n.deal_id === deal.id);
  const linkedFollowUps = (allFollowUps || []).filter(f => f.deal_id === deal.id);
  const linkedContacts = (contacts || []).filter(c => c.deal_id === deal.id || c.property_id === deal.property_id);
  const linkedAccounts = (accounts || []).filter(a => a.id === deal.buyer_account_id || a.id === deal.seller_account_id);
  const pendingTasks = linkedTasks.filter(t => !t.completed).length;
  const linkedProperty = (properties || []).find(p => p.id === deal.property_id || p.address === deal.address);

  const timeline = [
    ...linkedActivities.map(a => ({ kind: 'activity', id: a.id, date: a.activity_date || a.created_at, icon: a.activity_type === 'Call' ? '📞' : a.activity_type === 'Email' ? '✉️' : '🤝', label: a.activity_type, subject: a.subject, detail: a.notes, outcome: a.outcome })),
    ...linkedNotes.map(n => ({ kind: 'note', id: n.id, date: n.created_at, icon: '📝', label: n.note_type || 'Note', subject: null, detail: n.content, pinned: n.pinned })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const stageColor = STAGE_COLORS[deal.stage] || '#6b7280';
  const fmtAgo = d => { if (!d) return ''; const dt = new Date(d); const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); const x = Math.floor((Date.now() - dt) / 86400000); if (x === 0) return 'Today ' + time; if (x === 1) return 'Yesterday ' + time; if (x < 7) return x + 'd ago ' + time; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + time; };
  const closeAll = () => { setShowNoteForm(false); setShowLogForm(false); setShowFuForm(false); };

  const handleAddNote = async () => {
    if (!noteText.trim()) return; setSavingNote(true);
    try { await insertRow('notes', { content: noteText.trim(), note_type: noteType, deal_id: deal.id }); setNoteText(''); setShowNoteForm(false); onRefresh?.(); showToast?.('Note added'); }
    catch (e) { console.error(e); } finally { setSavingNote(false); }
  };
  const handleLogActivity = async () => {
    if (!logSubject.trim()) return; setSavingLog(true);
    try { await insertRow('activities', { activity_type: logType, subject: logSubject.trim(), notes: logNotes || null, activity_date: new Date().toISOString().split('T')[0], deal_id: deal.id, property_id: deal.property_id || null, contact_id: logContactId || null }); setLogSubject(''); setLogNotes(''); setLogContactId(''); setShowLogForm(false); onRefresh?.(); showToast?.(`${logType} logged`); }
    catch (e) { console.error(e); } finally { setSavingLog(false); }
  };
  const handleAddFu = async () => {
    if (!fuReason.trim() || !fuDate) return; setSavingFu(true);
    try { await insertRow('follow_ups', { reason: fuReason.trim(), due_date: fuDate, deal_id: deal.id }); setFuReason(''); setFuDate(''); setShowFuForm(false); onRefresh?.(); showToast?.('Follow-up set'); }
    catch (e) { console.error(e); } finally { setSavingFu(false); }
  };
  const handleCompleteFu = async fu => {
    try { await updateRow('follow_ups', fu.id, { completed: true, completed_at: new Date().toISOString() }); onRefresh?.(); } catch (e) { console.error(e); }
  };

  // Deal contacts handlers
  const handleAddDc = async () => {
    if (!dcContactId) return;
    try { await addDealContact(deal.id, dcContactId, dcRole); setShowDcForm(false); setDcContactId(''); setDcRole('Participant'); fetchDealContacts(deal.id).then(setDealContacts); showToast?.('Contact linked'); }
    catch (e) { console.error(e); }
  };
  const handleRemoveDc = async (dcId) => {
    try { await removeDealContact(dcId); fetchDealContacts(deal.id).then(setDealContacts); showToast?.('Contact removed'); }
    catch (e) { console.error(e); }
  };

  // Buyer outreach handlers
  const handleAddOutreach = async () => {
    if (!orAcctId && !orContactId) return;
    try {
      await insertOutreach({ deal_id: deal.id, account_id: orAcctId || null, contact_id: orContactId || null, method: orMethod, direction: 'Outbound', outcome: orOutcome || null, notes: orNotes || null, outreach_date: new Date().toISOString().split('T')[0] });
      setShowOrForm(false); setOrAcctId(''); setOrContactId(''); setOrMethod('Email'); setOrOutcome(''); setOrNotes('');
      fetchBuyerOutreach(deal.id).then(setOutreachLog); showToast?.('Outreach logged');
    } catch (e) { console.error(e); }
  };

  // AI Synthesis
  // Load synthesis from record on mount
  useEffect(() => { if (deal.ai_synthesis && !synth) setSynth(deal.ai_synthesis); }, [deal.ai_synthesis]);

  const handleSynthesize = async () => {
    setSynthLoading(true); setSynth(null);
    const parts = [];
    if (deal.notes) parts.push(`[Original Intel] ${deal.notes}`);
    linkedNotes.filter(n => n.note_type !== 'AI Synthesis').forEach(n => parts.push(`[${n.note_type || 'Note'} ${fmtAgo(n.created_at)}] ${n.content}`));
    linkedActivities.forEach(a => parts.push(`[${a.activity_type} ${fmtAgo(a.activity_date)}] ${a.subject}${a.notes ? ': ' + a.notes : ''}${a.outcome ? ' → ' + a.outcome : ''}`));
    const allText = parts.join('\n');
    if (!allText.trim()) { setSynth('No notes or activities to synthesize yet.'); setSynthLoading(false); return; }
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_MODEL_OPUS, max_tokens: 600,
          system: 'You are a CRE brokerage intelligence assistant. Synthesize all notes, intel, and activities into a concise deal status summary. Include: current status, key contacts, outstanding issues, and recommended next steps. Be specific and actionable. No fluff.',
          messages: [{ role: 'user', content: `Deal: ${deal.deal_name}\nStage: ${deal.stage}\nValue: ${deal.deal_value ? fmt.price(deal.deal_value) : 'TBD'}\n\nAll Intel & Timeline:\n${allText}\n\nSynthesize into a brief status report with next steps.` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'Could not generate synthesis.';
      setSynth(text);
      await updateRow('deals', deal.id, { ai_synthesis: text, ai_synthesis_at: new Date().toISOString() });
      onRefresh?.();
    } catch { setSynth('Error connecting to AI. Check API key.'); }
    finally { setSynthLoading(false); }
  };

  // Cadence
  const handleSetCadence = async (cadence) => {
    try { await setCadence('deals', deal.id, cadence.label, cadence.days); onRefresh?.(); showToast?.(`${cadence.label} follow-up set`); }
    catch (e) { console.error(e); }
  };

  const Field = ({ label, value, mono, accent }) => value ? (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: accent ? 'var(--accent)' : 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', fontWeight: accent ? 600 : 400 }}>{value}</div>
    </div>
  ) : null;

  const TABS = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'underwriting', label: 'Underwriting' },
    { id: 'contacts', label: `Contacts (${dealContacts.length})` },
    { id: 'outreach', label: `Outreach (${outreachLog.length})` },
    { id: 'files', label: `Files${(deal.file_links||[]).length ? ` (${(deal.file_links||[]).length})` : ''}` },
    { id: 'tasks', label: `Tasks${pendingTasks ? ` (${pendingTasks})` : ''}` },
  ];

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* HEADER */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{deal.deal_name}</h2>
              <span style={{ padding: '3px 10px', borderRadius: '5px', fontSize: '13px', fontWeight: 600, background: stageColor + '22', color: stageColor }}>{deal.stage}</span>
              {deal.marketing_type && <span className="tag tag-ghost" style={{ fontSize: '12px' }}>{deal.marketing_type}</span>}
              {deal.follow_up_cadence && <span className="tag tag-blue" style={{ fontSize: '11px' }}>🔄 {deal.follow_up_cadence}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{deal.address}{deal.submarket ? ` · ${deal.submarket}` : ''}</span>
              {deal.onedrive_url && <a href={deal.onedrive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>📁 OneDrive ↗</a>}
            </div>
            {/* Catalyst tags from linked property */}
            {linkedProperty?.catalyst_tags?.length > 0 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                {linkedProperty.catalyst_tags.map(tag => <span key={tag} className={`tag ${catalystTagClass(tag)}`} style={{ fontSize: '12px', cursor: 'pointer' }} onClick={() => onCatalystClick?.(tag)}>{tag}</span>)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => document.getElementById('cadence-dd').classList.toggle('show-dd')}>🔄 Cadence</button>
              <div id="cadence-dd" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px', zIndex: 10, display: 'none', minWidth: '140px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                {CADENCE_OPTIONS.map(c => <div key={c.label} onClick={() => { handleSetCadence(c); document.getElementById('cadence-dd').classList.remove('show-dd'); }} style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px', whiteSpace: 'nowrap' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{c.label}</div>)}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {deal.deal_value && <div><div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deal Value</div><div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>{fmt.price(deal.deal_value)}</div></div>}
          {deal.commission_est && <div><div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Commission</div><div style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>{fmt.price(deal.commission_est)}</div></div>}
          {deal.probability != null && <div><div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Probability</div><div style={{ fontSize: '18px', fontWeight: 700 }}>{deal.probability}%</div></div>}
          {deal.close_date && <div><div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Est. Close</div><div style={{ fontSize: '18px', fontWeight: 700 }}>{deal.close_date}</div></div>}
        </div>
      </div>

      {/* STAGES */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Pipeline Stage — click to move</div>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap' }}>
          {DEAL_STAGES.filter(s => s !== 'Dead').map((s, i) => {
            const isActive = s === deal.stage;
            const isPast = DEAL_STAGES.indexOf(s) < DEAL_STAGES.indexOf(deal.stage);
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <div onClick={() => handleStageChange(s)} style={{
                  padding: '4px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                  background: isActive ? STAGE_COLORS[s] : isPast ? STAGE_COLORS[s] + '44' : 'var(--bg-input)',
                  color: isActive ? 'white' : isPast ? STAGE_COLORS[s] : 'var(--text-muted)',
                  border: `1px solid ${isActive ? STAGE_COLORS[s] : 'var(--border)'}`, whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = STAGE_COLORS[s]; e.currentTarget.style.color = STAGE_COLORS[s]; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = isPast ? STAGE_COLORS[s] : 'var(--text-muted)'; } }}
                >{s}</div>
                {i < DEAL_STAGES.filter(x => x !== 'Dead').length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>›</span>}
              </div>
            );
          })}
          <div onClick={() => handleStageChange('Dead')} style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', background: deal.stage === 'Dead' ? '#374151' : 'transparent', color: deal.stage === 'Dead' ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)', marginLeft: '8px' }}>Dead</div>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
        {TABS.map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500, background: 'transparent', color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)', borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent' }}>{t.label}</button>)}
      </div>

      {/* TIMELINE TAB */}
      {activeTab === 'timeline' && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</h3>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px', color: '#8b5cf6', borderColor: '#8b5cf644' }} onClick={handleSynthesize} disabled={synthLoading}>{synthLoading ? '✦ Synthesizing...' : '✦ Synthesize'}</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => { closeAll(); setShowLogForm(!showLogForm); }}>{showLogForm ? 'Cancel' : '+ Log Call/Email'}</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => { closeAll(); setShowNoteForm(!showNoteForm); }}>{showNoteForm ? 'Cancel' : '+ Note'}</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => { closeAll(); setShowFuForm(!showFuForm); }}>{showFuForm ? 'Cancel' : '+ Follow-Up'}</button>
            </div>
          </div>

          {/* AI Synthesis result */}
          {synth && (
            <div style={{ padding: '14px', background: '#8b5cf611', border: '1px solid #8b5cf633', borderRadius: '8px', marginBottom: '14px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase' }}>✦ AI Synthesis (Opus)</span>
                {deal.ai_synthesis_at && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{new Date(deal.ai_synthesis_at).toLocaleString()}</span>}
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
              <select className="select" value={logContactId} onChange={e => setLogContactId(e.target.value)} style={{ marginBottom: '6px', fontSize: '13px' }}>
                <option value="">Link to contact (optional)</option>
                {linkedContacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
              </select>
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

          {timeline.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No activity yet — log a call or add a note</div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              <div style={{ position: 'absolute', left: '7px', top: '4px', bottom: '4px', width: '2px', background: 'var(--border)' }} />
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
      )}

      {/* UNDERWRITING TAB */}
      {activeTab === 'underwriting' && (
        <Underwriting deal={deal} property={linkedProperty} leaseComps={leaseComps} saleComps={saleComps} onRefresh={onRefresh} showToast={showToast} onLeaseCompClick={onLeaseCompClick} onSaleCompClick={onSaleCompClick} />
      )}

      {/* CONTACTS TAB — Deal Contacts with Roles */}
      {activeTab === 'contacts' && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deal Contacts</h3>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => setShowDcForm(!showDcForm)}>{showDcForm ? 'Cancel' : '+ Link Contact'}</button>
          </div>
          {showDcForm && (
            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '6px', marginBottom: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select className="select" style={{ flex: 1, fontSize: '13px' }} value={dcContactId} onChange={e => setDcContactId(e.target.value)}>
                  <option value="">Select contact...</option>
                  {(contacts || []).map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
                </select>
                <select className="select" style={{ width: '160px', fontSize: '13px' }} value={dcRole} onChange={e => setDcRole(e.target.value)}>
                  {DEAL_CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddDc} disabled={!dcContactId}>Link</button>
              </div>
            </div>
          )}
          {dealContacts.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>No contacts linked to this deal yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {dealContacts.map(dc => (
                <div key={dc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => dc.contact && onContactClick?.(dc.contact)}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{dc.contact?.name || 'Unknown'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dc.contact?.company || ''}{dc.contact?.phone ? ` · ${dc.contact.phone}` : ''}</div>
                  </div>
                  <span className="tag tag-blue" style={{ fontSize: '11px' }}>{dc.role}</span>
                  <button onClick={() => handleRemoveDc(dc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', padding: '0 4px' }}>×</button>
                </div>
              ))}
            </div>
          )}
          {/* Also show loosely-linked contacts */}
          {linkedContacts.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Related Contacts</div>
              {linkedContacts.filter(c => !dealContacts.some(dc => dc.contact_id === c.id)).map(c => (
                <div key={c.id} onClick={() => onContactClick?.(c)} style={{ padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', marginBottom: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.contact_type}{c.company ? ` · ${c.company}` : ''}</div>
                </div>
              ))}
            </div>
          )}
          {linkedAccounts.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Linked Accounts</div>
              {linkedAccounts.map(a => (
                <div key={a.id} onClick={() => onAccountClick?.(a)} style={{ padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', marginBottom: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.account_type}{a.city ? ` · ${a.city}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* OUTREACH TAB — Buyer Outreach Log */}
      {activeTab === 'outreach' && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buyer Outreach Log</h3>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => setShowOrForm(!showOrForm)}>{showOrForm ? 'Cancel' : '+ Log Outreach'}</button>
          </div>
          {showOrForm && (
            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '6px', marginBottom: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <select className="select" style={{ fontSize: '13px' }} value={orAcctId} onChange={e => setOrAcctId(e.target.value)}>
                  <option value="">Select buyer account...</option>
                  {(accounts || []).filter(a => ['Institutional Buyer', 'Private Buyer', 'Investor', 'Developer'].includes(a.account_type)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select className="select" style={{ fontSize: '13px' }} value={orContactId} onChange={e => setOrContactId(e.target.value)}>
                  <option value="">Contact (optional)...</option>
                  {(contacts || []).filter(c => !orAcctId || c.account_id === orAcctId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="select" style={{ fontSize: '13px' }} value={orMethod} onChange={e => setOrMethod(e.target.value)}>
                  {OUTREACH_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select className="select" style={{ fontSize: '13px' }} value={orOutcome} onChange={e => setOrOutcome(e.target.value)}>
                  <option value="">Outcome...</option>
                  {OUTREACH_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <textarea className="textarea" rows={2} value={orNotes} onChange={e => setOrNotes(e.target.value)} placeholder="Notes..." style={{ marginBottom: '8px', fontSize: '13px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddOutreach} disabled={!orAcctId && !orContactId}>Log Outreach</button>
              </div>
            </div>
          )}
          {outreachLog.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>No buyer outreach logged yet</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table><thead><tr>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Date</th>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Buyer</th>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Contact</th>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Method</th>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Outcome</th>
                <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Notes</th>
              </tr></thead><tbody>
                {outreachLog.map(o => {
                  const outcomeColor = { 'Interested': '#22c55e', 'Offer Coming': '#3b82f6', 'Passed': '#ef4444', 'No Response': '#6b7280' }[o.outcome] || '#f59e0b';
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{o.outreach_date}</td>
                      <td style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 500 }}>{o.account?.name || '—'}</td>
                      <td style={{ padding: '8px 10px', fontSize: '13px' }}>{o.contact?.name || '—'}</td>
                      <td style={{ padding: '8px 10px', fontSize: '13px' }}>{o.method}</td>
                      <td style={{ padding: '8px 10px' }}>{o.outcome && <span style={{ fontSize: '12px', padding: '2px 7px', borderRadius: '4px', background: outcomeColor + '22', color: outcomeColor, fontWeight: 600 }}>{o.outcome}</span>}</td>
                      <td style={{ padding: '8px 10px', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
          )}
        </div>
      )}

      {/* FILES TAB */}
      {activeTab === 'files' && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <FilesLinks record={deal} table="deals" onRefresh={onRefresh} showToast={showToast} />
        </div>
      )}

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasks {pendingTasks > 0 && <span style={{ color: '#ef4444' }}>({pendingTasks})</span>}</h3>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => onAddTask?.(deal.id)}>+ Task</button>
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
      )}

      {/* EDIT or DETAIL CARDS */}
      {editing ? (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Deal Name</label><input className="input" value={form.deal_name || ''} onChange={e => set('deal_name', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Stage</label><select className="select" value={form.stage} onChange={e => set('stage', e.target.value)}>{DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Deal Type</label><select className="select" value={form.deal_type || ''} onChange={e => set('deal_type', e.target.value)}><option value="">Select</option>{DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Strategy</label><select className="select" value={form.strategy || ''} onChange={e => set('strategy', e.target.value)}><option value="">Select</option>{STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Marketing</label><select className="select" value={form.marketing_type || ''} onChange={e => set('marketing_type', e.target.value)}>{MARKETING_TYPES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            {[['buyer', 'Buyer'], ['seller', 'Seller'], ['tenant_name', 'Tenant'], ['deal_value', 'Deal Value ($)'], ['commission_rate', 'Commission (%)'], ['probability', 'Probability (%)'], ['close_date', 'Close Date'], ['priority', 'Priority']].map(([f, l]) => (
              <div key={f} className="form-group"><label className="form-label">{l}</label><input className="input" type={['deal_value', 'commission_rate', 'probability'].includes(f) ? 'number' : f === 'close_date' ? 'date' : 'text'} value={form[f] || ''} onChange={e => set(f, e.target.value)} /></div>
            ))}
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">OneDrive Link</label><input className="input" placeholder="https://..." value={form.onedrive_url || ''} onChange={e => set('onedrive_url', e.target.value)} /></div>
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}><label className="form-label">Notes</label><textarea className="textarea" rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Deal Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Type" value={deal.deal_type} />
              <Field label="Strategy" value={deal.strategy} />
              <Field label="Marketing" value={deal.marketing_type} />
              <Field label="Buyer" value={deal.buyer} />
              <Field label="Seller" value={deal.seller} />
              <Field label="Tenant" value={deal.tenant_name} />
              <Field label="Commission Rate" value={deal.commission_rate ? deal.commission_rate + '%' : null} />
              <Field label="Priority" value={deal.priority} />
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Linked Property</h3>
            {linkedProperty ? (
              <div onClick={() => onPropertyClick?.(linkedProperty)} style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{linkedProperty.address}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{linkedProperty.submarket} · {linkedProperty.building_sf ? linkedProperty.building_sf.toLocaleString() + ' SF' : ''} · {linkedProperty.owner}</div>
              </div>
            ) : <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No property linked</div>}
          </div>
        </div>
      )}
    </div>
  );
}
