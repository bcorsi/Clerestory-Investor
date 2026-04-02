'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const STAGES = ['Tracking','Underwriting','Off-Market Outreach','Marketing','LOI','LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won'];
const COMMISSION_STAGES = new Set(['LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won']);

const ACT_ICON  = { call: '📞', email: '✉️', note: '📝', meeting: '🤝', task: '✅', system: '⚙️' };
const ACT_BG    = { call: 'rgba(78,110,150,0.09)', email: 'rgba(88,56,160,0.08)', note: 'rgba(140,90,4,0.09)', meeting: 'rgba(21,102,54,0.08)', task: 'rgba(21,102,54,0.08)', system: 'rgba(0,0,0,0.04)' };
const ACT_COLOR = { call: '#4E6E96', email: '#5838A0', note: '#8C5A04', meeting: '#156636', task: '#156636', system: '#6E6860' };

const STAGE_COLOR = {
  'Tracking': '#9CA3AF', 'Underwriting': '#7C3AED', 'Off-Market Outreach': '#0891B2',
  'Marketing': '#D97706', 'LOI': '#DC2626', 'LOI Accepted': '#059669',
  'PSA Negotiation': '#BE185D', 'Due Diligence': '#1D4ED8', 'Non-Contingent': '#059669', 'Closed Won': '#059669',
};

function fmtM(n)    { if (!n) return '—'; return n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : `$${(n/1e3).toFixed(0)}K`; }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtShort(d){ if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

export default function DealDetailInline({ id, onClose }) {
  const [deal, setDeal]           = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [logType, setLogType]     = useState('call');
  const [logNote, setLogNote]     = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: d }, { data: acts }] = await Promise.all([
        supabase.from('deals').select('*').eq('id', id).single(),
        supabase.from('activities').select('*').eq('deal_id', id).order('activity_date', { ascending: false }).limit(20),
      ]);
      setDeal(d);
      setActivities(acts || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function updateStage(newStage) {
    const supabase = createClient();
    await supabase.from('deals').update({ stage: newStage, updated_at: new Date().toISOString() }).eq('id', id);
    setDeal(d => ({ ...d, stage: newStage }));
    await supabase.from('activities').insert({ deal_id: id, activity_type: 'system', subject: `Stage → ${newStage}`, activity_date: new Date().toISOString().split('T')[0] });
    setActivities(prev => [{ activity_type: 'system', subject: `Stage → ${newStage}`, activity_date: new Date().toISOString().split('T')[0] }, ...prev]);
  }

  async function logActivity() {
    if (!logNote.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const act = { deal_id: id, activity_type: logType, subject: `${logType.charAt(0).toUpperCase()+logType.slice(1)} logged`, notes: logNote, activity_date: new Date().toISOString().split('T')[0] };
      const { data } = await supabase.from('activities').insert(act).select().single();
      setActivities(prev => [data || act, ...prev]);
      setLogNote('');
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#6E6860', fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontStyle: 'italic' }}>
      Loading deal…
    </div>
  );

  if (!deal) return (
    <div style={{ padding: 40, color: '#B83714', fontSize: 13 }}>Deal not found.</div>
  );

  const showComm = COMMISSION_STAGES.has(deal.stage);
  const stageIdx = STAGES.indexOf(deal.stage);
  const uw       = deal.underwriting_inputs || {};
  const stageColor = STAGE_COLOR[deal.stage] || '#6E6860';

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Instrument Sans', sans-serif", height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── STAGE TRACK ── */}
      <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '0 20px', overflowX: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex' }}>
          {STAGES.filter(s => !['Closed Lost','Dead'].includes(s)).map((s, i) => {
            const isDone   = STAGES.indexOf(s) < stageIdx;
            const isActive = s === deal.stage;
            return (
              <button key={s} onClick={() => updateStage(s)}
                style={{ padding: '8px 11px', fontSize: 11.5, fontWeight: isActive ? 600 : 400, color: isActive ? stageColor : isDone ? '#524D46' : '#AFA89E', cursor: 'pointer', background: 'none', border: 'none', borderBottom: isActive ? `2px solid ${stageColor}` : '2px solid transparent', whiteSpace: 'nowrap', marginBottom: -1, transition: 'all .1s', fontFamily: 'inherit', position: 'relative' }}>
                {s}
                {i < 9 && <span style={{ position: 'absolute', right: -2, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.15)', fontSize: 12, pointerEvents: 'none' }}>›</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
        {[
          { lbl: 'Deal Value',      val: fmtM(deal.deal_value),    color: '#0F0D09' },
          { lbl: 'Commission',      val: showComm ? fmtM(deal.commission_est) : '—', color: showComm ? '#156636' : '#AFA89E' },
          { lbl: 'Probability',     val: deal.probability != null ? `${deal.probability}%` : '—', color: deal.probability >= 70 ? '#156636' : deal.probability >= 40 ? '#8C5A04' : '#0F0D09' },
          { lbl: 'Close Date',      val: deal.close_date ? new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—', color: '#8C5A04' },
        ].map((k, i) => (
          <div key={i} style={{ padding: '12px 16px', borderRight: i < 3 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#6E6860', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>{k.lbl}</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: k.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0, background: '#fff' }}>
        {['timeline','details','uw'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: '9px 14px', fontSize: 13, color: activeTab === t ? '#4E6E96' : '#6E6860', background: 'none', border: 'none', borderBottom: activeTab === t ? '2px solid #4E6E96' : '2px solid transparent', marginBottom: -1, fontWeight: activeTab === t ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', textTransform: 'capitalize', transition: 'all .1s' }}>
            {t === 'uw' ? 'Underwriting' : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'timeline' && activities.length > 0 && (
              <span style={{ marginLeft: 5, fontFamily: 'var(--font-mono)', fontSize: 9, background: '#EDE8E0', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 20, padding: '1px 5px', color: '#6E6860' }}>{activities.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#F4F1EC' }}>

        {/* TIMELINE */}
        {activeTab === 'timeline' && (
          <div style={{ padding: 16 }}>
            {/* Log form */}
            <div style={{ background: '#fff', borderRadius: 9, border: '1px solid rgba(0,0,0,0.07)', marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                {['call','email','note','meeting'].map(t => (
                  <button key={t} onClick={() => setLogType(t)}
                    style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 5, border: `1px solid ${logType===t?'rgba(78,110,150,0.30)':'rgba(0,0,0,0.08)'}`, background: logType===t?'rgba(78,110,150,0.09)':'transparent', color: logType===t?'#4E6E96':'#6E6860', cursor: 'pointer', textTransform: 'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
              <div style={{ padding: '10px 14px' }}>
                <textarea placeholder={`Log a ${logType}…`} value={logNote} onChange={e => setLogNote(e.target.value)} rows={2}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, padding: '7px 10px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 7, background: '#F4F1EC', color: '#0F0D09', resize: 'none', outline: 'none', marginBottom: 8 }} />
                <button onClick={logActivity} disabled={saving || !logNote.trim()}
                  style={{ padding: '6px 14px', background: '#4E6E96', color: '#fff', border: 'none', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer', opacity: !logNote.trim() || saving ? 0.5 : 1 }}>
                  {saving ? 'Saving…' : 'Log'}
                </button>
              </div>
            </div>

            {/* Activity feed */}
            <div style={{ background: '#fff', borderRadius: 9, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              {activities.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: '#AFA89E' }}>No activity yet</div>
              ) : activities.map((a, i) => {
                const type = a.activity_type || 'note';
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: ACT_BG[type]||ACT_BG.note, color: ACT_COLOR[type]||ACT_COLOR.note, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, marginTop: 1 }}>
                      {ACT_ICON[type]||'📌'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#2C2822', lineHeight: 1.4 }}>
                        <strong style={{ fontWeight: 500 }}>{a.subject}</strong>
                        {a.notes && <span style={{ color: '#524D46' }}> — {a.notes}</span>}
                      </div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 11.5, fontStyle: 'italic', color: '#6E6860', marginTop: 1 }}>
                        {a.activity_date ? fmtShort(a.activity_date) : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DETAILS */}
        {activeTab === 'details' && (
          <div style={{ padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 9, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#524D46' }}>Deal Info</div>
              {[
                { k: 'Deal Name',   v: deal.deal_name },
                { k: 'Deal Type',   v: deal.deal_type },
                { k: 'Strategy',    v: deal.strategy },
                { k: 'Stage',       v: deal.stage,    color: stageColor },
                { k: 'Priority',    v: deal.priority },
                { k: 'Address',     v: deal.address },
                { k: 'Submarket',   v: deal.submarket },
                { k: 'Market',      v: deal.market },
                { k: 'Seller',      v: deal.seller },
                { k: 'Tenant',      v: deal.tenant_name },
                { k: 'Prop Type',   v: uw.prop_type },
                { k: 'Prop Subtype',v: uw.prop_subtype },
                { k: 'Building SF', v: uw.building_sf ? Number(uw.building_sf).toLocaleString() + ' SF' : null },
                { k: 'Close Date',  v: fmtDate(deal.close_date) },
                { k: 'Created',     v: fmtDate(deal.created_at) },
              ].filter(r => r.v && r.v !== '—').map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <span style={{ fontSize: 12, color: '#6E6860', flexShrink: 0 }}>{r.k}</span>
                  <span style={{ fontSize: 12.5, color: r.color || '#2C2822', fontWeight: 500, textAlign: 'right', maxWidth: 200 }}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* Notes / AI synthesis */}
            {(deal.notes || deal.ai_synthesis) && (
              <div style={{ background: deal.ai_synthesis ? 'rgba(78,110,150,0.07)' : '#fff', border: `1px solid ${deal.ai_synthesis ? 'rgba(78,110,150,0.25)' : 'rgba(0,0,0,0.07)'}`, borderRadius: 9, overflow: 'hidden' }}>
                <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: deal.ai_synthesis ? '#4E6E96' : '#524D46' }}>
                  {deal.ai_synthesis ? 'AI Synthesis' : 'Notes'}
                </div>
                <div style={{ padding: '12px 14px', fontSize: 13, lineHeight: 1.65, color: '#2C2822' }}>
                  {deal.ai_synthesis || deal.notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* UNDERWRITING */}
        {activeTab === 'uw' && (
          <div style={{ padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 9, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#524D46' }}>Underwriting Inputs</div>
              {Object.entries(uw).filter(([k,v]) => v != null).map(([k, v], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <span style={{ fontSize: 12, color: '#6E6860', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#2C2822' }}>{String(v)}</span>
                </div>
              ))}
              {Object.keys(uw).length === 0 && (
                <div style={{ padding: '20px 14px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: '#AFA89E' }}>
                  No underwriting data yet.
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <a href={`/deals/${id}`} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: '#4E6E96', textDecoration: 'none' }}>
                Open full page for BOV Dashboard →
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
