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

  const stageColor = STAGE_COLORS[deal.stage] || 'var(--ink3)';
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
    { id: 'files', label: 'Files' },
    { id: 'tasks', label: `Tasks (${linkedTasks.filter(t=>!t.completed).length})` },
  ];

  return (
    <div>
      {/* ═══ DEAL HEADER ═══ */}
      <div style={{ padding: '24px 36px 16px', background: 'var(--card)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '28px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>{deal.deal_name}</div>
            <div style={{ fontSize: '14px', color: 'var(--ink3)', marginBottom: '10px' }}>{deal.address || ''}{deal.submarket ? ' · ' + deal.submarket : ''}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {deal.deal_type && <span className="badge badge-blue">{deal.deal_type}</span>}
              <span className="badge" style={{ background: (STAGE_COLORS[deal.stage]||'var(--ink3)') + '14', borderColor: (STAGE_COLORS[deal.stage]||'var(--ink3)') + '44', color: STAGE_COLORS[deal.stage]||'var(--ink3)' }}>{deal.stage}</span>
              {deal.priority && <span className={`badge ${deal.priority === 'High' ? 'badge-warn' : deal.priority === 'Medium' ? 'badge-amber' : 'badge-gray'}`}>{deal.priority}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="btn" onClick={() => setEditing(true)}>Edit Deal</button>
            {onAddActivity && <button className="btn" onClick={() => onAddActivity(null, deal.id)}>+ Activity</button>}
            {onAddTask && <button className="btn" onClick={() => onAddTask(deal.id)}>+ Task</button>}
          </div>
        </div>

        {/* Stage pipeline */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexWrap: 'wrap', padding: '10px 0' }}>
          {DEAL_STAGES.filter(s => s !== 'Dead').map(stage => (
            <div key={stage} onClick={() => handleStageChange(stage)}
              style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 500,
                background: deal.stage === stage ? (STAGE_COLORS[stage]||'var(--ink3)') + '22' : 'transparent',
                color: deal.stage === stage ? STAGE_COLORS[stage]||'var(--ink3)' : 'var(--ink4)',
                border: `1px solid ${deal.stage === stage ? (STAGE_COLORS[stage]||'var(--ink3)') + '44' : 'var(--line)'}`,
                transition: 'all 0.12s'
              }}>{stage}</div>
          ))}
          <div onClick={() => handleStageChange('Dead')} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 500, background: deal.stage === 'Dead' ? 'var(--ink3)' : 'transparent', color: deal.stage === 'Dead' ? 'white' : 'var(--ink4)', border: '1px solid var(--line)', marginLeft: '8px' }}>Dead</div>
        </div>
      </div>

      {/* Aerial */}
      {deal.address && (
        <div style={{ padding: '0 36px 14px', background: 'var(--card)' }}>
          <AerialThumbnail address={deal.address} city={deal.submarket} apns={linkedProperty?.apns} height={180} />
        </div>
      )}

      {/* ═══ METRICS BAR ═══ */}
      <div className="metrics-bar" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="metric-cell">
          <div className="metric-label">Deal Value</div>
          <div className="metric-val accent">{deal.deal_value ? fmt.price(deal.deal_value) : '—'}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">Commission</div>
          <div className="metric-val" style={{ color: 'var(--green)' }}>{deal.commission_est ? fmt.price(deal.commission_est) : '—'}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">Probability</div>
          <div className="metric-val">{deal.probability != null ? deal.probability + '%' : '—'}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">Close Date</div>
          <div className="metric-val" style={{ fontSize: '28px' }}>{deal.close_date || '—'}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">$/SF</div>
          <div className="metric-val">{deal.deal_value && deal.building_sf ? '$' + Math.round(deal.deal_value / deal.building_sf) : '—'}</div>
        </div>
      </div>

      {/* ═══ SUB NAV ═══ */}
      <div className="sub-nav">
        {TABS.map(t => (
          <div key={t.id} className={`sub-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ padding: '28px 36px 48px' }}>
        {activeTab === 'timeline' && (
          <div className="timeline-card">
            <div className="tl-head">
              <span className="tl-title">Timeline</span>
              <div className="tl-btns" style={{ display: 'flex', gap: '6px' }}>
                <button className="tl-btn accent" onClick={handleSynthesize} disabled={synthLoading}>{synthLoading ? '✦ Synthesizing...' : '✦ Synthesize'}</button>
                <button className="tl-btn" onClick={() => setShowLogForm(!showLogForm)}>{showLogForm ? 'Cancel' : '+ Log'}</button>
                <button className="tl-btn" onClick={() => setShowNoteForm(!showNoteForm)}>{showNoteForm ? 'Cancel' : '+ Note'}</button>
                <button className="tl-btn" onClick={() => setShowFuForm(!showFuForm)}>{showFuForm ? 'Cancel' : '+ Follow-Up'}</button>
              </div>
            </div>

            {showNoteForm && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                <textarea className="textarea" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add note..." rows={3} />
                <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={handleAddNote} disabled={savingNote}>{savingNote ? 'Saving...' : 'Save Note'}</button>
              </div>
            )}

            {showLogForm && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
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

            {/* Entries */}
            {timeline.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink4)', fontSize: '13px' }}>No activity yet</div>
            ) : timeline.slice(0, 30).map(e => (
              <div key={`${e.kind}-${e.id}`} className="tl-entry">
                <div className="tl-dot" style={e.kind === 'activity' ? { background: 'var(--amber)', boxShadow: '0 0 0 3px rgba(184,122,16,0.08)' } : {}} />
                <div>
                  <div className="entry-date" style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', color: 'var(--ink4)', letterSpacing: '0.06em', marginBottom: '6px' }}>{e.date ? new Date(e.date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}).toUpperCase() : ''}</div>
                  <div className="entry-text" style={{ fontSize: '14px', color: 'var(--ink2)', lineHeight: 1.72 }}>{e.subject && <strong>{e.subject}. </strong>}{e.detail || ''}{e.outcome && <span style={{ color: 'var(--green)' }}> → {e.outcome}</span>}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'underwriting' && (
          <Underwriting deal={deal} property={linkedProperty} leaseComps={linkedLC} saleComps={linkedSC} />
        )}

        {activeTab === 'contacts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink3)' }}>Deal Contacts</h3>
              <button className="btn btn-sm" onClick={() => setShowAddContact(!showAddContact)}>{showAddContact ? 'Cancel' : '+ Add Contact'}</button>
            </div>
            {showAddContact && (
              <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--line)', marginBottom: '14px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact</label>
                    <select className="select" value={addContactId} onChange={e => setAddContactId(e.target.value)}>
                      <option value="">Select contact...</option>
                      {(contacts||[]).map(c => <option key={c.id} value={c.id}>{c.name} — {c.company || c.contact_type}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="select" value={addContactRole} onChange={e => setAddContactRole(e.target.value)}>
                      {DEAL_CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAddDealContact}>Add to Deal</button>
              </div>
            )}
            {dealContacts.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--ink4)', padding: '16px 0' }}>No contacts linked to this deal</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Company</th><th>Role</th><th>Phone</th><th>Email</th><th></th></tr></thead>
                  <tbody>
                    {dealContacts.map(dc => {
                      const c = (contacts||[]).find(x => x.id === dc.contact_id);
                      return c ? (
                        <tr key={dc.id} onClick={() => onContactClick?.(c)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontWeight: 500 }}>{c.name}</td>
                          <td>{c.company || '—'}</td>
                          <td><span className="badge badge-blue">{dc.role}</span></td>
                          <td style={{ fontFamily: "'DM Mono',monospace" }}>{c.phone || '—'}</td>
                          <td style={{ fontSize: '12px' }}>{c.email || '—'}</td>
                          <td><button className="btn btn-sm" onClick={e => { e.stopPropagation(); handleRemoveDealContact(dc.id); }}>×</button></td>
                        </tr>
                      ) : null;
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'outreach' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink3)' }}>Outreach Log</h3>
              <button className="btn btn-sm" onClick={() => setShowAddOutreach(!showAddOutreach)}>{showAddOutreach ? 'Cancel' : '+ Log Outreach'}</button>
            </div>
            {showAddOutreach && (
              <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--line)', marginBottom: '14px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Method</label>
                    <select className="select" value={outreachMethod} onChange={e => setOutreachMethod(e.target.value)}>
                      {OUTREACH_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Outcome</label>
                    <select className="select" value={outreachOutcome} onChange={e => setOutreachOutcome(e.target.value)}>
                      {OUTREACH_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="textarea" value={outreachNotes} onChange={e => setOutreachNotes(e.target.value)} rows={2} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAddOutreach}>Log Outreach</button>
              </div>
            )}
            {outreachLog.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--ink4)', padding: '16px 0' }}>No outreach logged yet</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Date</th><th>Method</th><th>Outcome</th><th>Notes</th></tr></thead>
                  <tbody>
                    {outreachLog.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: "'DM Mono',monospace" }}>{o.outreach_date || o.created_at?.split('T')[0]}</td>
                        <td><span className="badge badge-blue">{o.method}</span></td>
                        <td><span className={`badge ${o.outcome === 'Connected' || o.outcome === 'Meeting Set' ? 'badge-green' : 'badge-gray'}`}>{o.outcome}</span></td>
                        <td style={{ fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && <FilesLinks record={deal} table="deals" onRefresh={onRefresh} showToast={showToast} />}

        {activeTab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink3)' }}>Tasks</h3>
              {onAddTask && <button className="btn btn-sm" onClick={() => onAddTask(deal.id)}>+ Task</button>}
            </div>
            {linkedTasks.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--ink4)', padding: '16px 0' }}>No tasks</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Task</th><th>Priority</th><th>Due</th><th>Status</th></tr></thead>
                  <tbody>
                    {linkedTasks.map(t => {
                      const pc = { High: 'var(--rust)', Medium: 'var(--amber)', Low: 'var(--ink3)' }[t.priority] || 'var(--ink3)';
                      const od = !t.completed && t.due_date && new Date(t.due_date) < new Date();
                      return (
                        <tr key={t.id} style={{ opacity: t.completed ? 0.6 : 1 }}>
                          <td style={{ fontWeight: 500, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</td>
                          <td><span className="badge" style={{ background: pc + '14', borderColor: pc + '44', color: pc }}>{t.priority}</span></td>
                          <td style={{ fontFamily: "'DM Mono',monospace", color: od ? 'var(--rust)' : 'var(--ink4)' }}>{od ? 'OVERDUE · ' : ''}{t.due_date || '—'}</td>
                          <td>{t.completed ? <span className="badge badge-green">Done</span> : <span className="badge badge-amber">Pending</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Deal</h2>
              <button className="modal-close" onClick={() => setEditing(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Deal Name</label><input className="input" value={editForm.deal_name || ''} onChange={e => setEditForm({...editForm, deal_name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Deal Type</label><select className="select" value={editForm.deal_type || ''} onChange={e => setEditForm({...editForm, deal_type: e.target.value})}><option value="">—</option>{DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Deal Value</label><input className="input" type="number" value={editForm.deal_value || ''} onChange={e => setEditForm({...editForm, deal_value: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Commission Est.</label><input className="input" type="number" value={editForm.commission_est || ''} onChange={e => setEditForm({...editForm, commission_est: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Probability %</label><input className="input" type="number" value={editForm.probability || ''} onChange={e => setEditForm({...editForm, probability: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Close Date</label><input className="input" type="date" value={editForm.close_date || ''} onChange={e => setEditForm({...editForm, close_date: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Strategy</label><select className="select" value={editForm.strategy || ''} onChange={e => setEditForm({...editForm, strategy: e.target.value})}><option value="">—</option>{STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Building SF</label><input className="input" type="number" value={editForm.building_sf || ''} onChange={e => setEditForm({...editForm, building_sf: e.target.value})} /></div>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}><label className="form-label">Notes</label><textarea className="textarea" value={editForm.notes || ''} onChange={e => setEditForm({...editForm, notes: e.target.value})} rows={3} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
