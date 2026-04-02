'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

// ─── HELPERS ──────────────────────────────────────────────────
function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtMoney(n) { if (!n) return '—'; const m = Number(n); return m >= 1_000_000 ? `$${(m/1_000_000).toFixed(1)}M` : `$${m.toLocaleString()}`; }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

const OUTREACH_STATUS = ['New','OM Sent','Under NDA','Touring','LOI Submitted','Passed'];
const OUTREACH_COLORS = {
  'New':         { bg: 'rgba(0,0,0,0.05)',     color: 'var(--text-secondary)' },
  'OM Sent':     { bg: 'var(--blue-bg)',        color: 'var(--blue)' },
  'Under NDA':   { bg: 'rgba(88,56,160,0.08)', color: 'var(--purple)' },
  'Touring':     { bg: 'var(--amber-bg)',       color: 'var(--amber)' },
  'LOI Submitted': { bg: 'var(--green-bg)',     color: 'var(--green)' },
  'Passed':      { bg: 'var(--rust-bg)',        color: 'var(--rust)' },
};

const MATCH_DIMENSIONS = [
  { key: 'sf',            label: 'SF Range',     max: 20 },
  { key: 'market',        label: 'Market',       max: 20 },
  { key: 'deal_type',     label: 'Deal Type',    max: 15 },
  { key: 'price',         label: 'Price Range',  max: 15 },
  { key: 'cap_rate',      label: 'Cap Rate',     max: 10 },
  { key: 'specs',         label: 'Bldg Specs',   max: 10 },
  { key: 'tenant_credit', label: 'Tenant Credit',max: 5 },
  { key: 'walt',          label: 'Lease Term',   max: 5 },
];

// ─── MAIN EXPORT ──────────────────────────────────────────────
export default function BuyerMatchesTab({ dealId, dealStage }) {
  const [view, setView]           = useState('matches'); // 'matches' | 'outreach'
  const [matches, setMatches]     = useState([]);
  const [outreach, setOutreach]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [running, setRunning]     = useState(false);
  const [expanded, setExpanded]   = useState(null); // expanded buyer id
  const [showAdd, setShowAdd]     = useState(false);
  const [logTarget, setLogTarget] = useState(null); // buyer_id to log against

  useEffect(() => { load(); }, [dealId]);

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Load matches joined with buyer info
      const { data: matchData } = await supabase
        .from('buyer_deal_matches')
        .select(`
          *,
          buyer:buyer_accounts(
            id, company_name, buyer_type, primary_contact,
            contact_title, contact_phone, contact_email,
            target_markets, deal_types, min_sf, max_sf,
            min_price, max_price, min_clear_height,
            min_walt, notes, relationship_score
          )
        `)
        .eq('deal_id', dealId)
        .gte('match_score', 60)
        .order('match_score', { ascending: false });

      setMatches(matchData || []);

      // Load outreach log from buyer_outreach table
      const { data: outData } = await supabase
        .from('buyer_outreach')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      setOutreach(outData || []);
    } catch (e) {
      console.error('BuyerMatchesTab load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function runMatcher() {
    setRunning(true);
    try {
      const supabase = createClient();
      // Call the SQL function
      await supabase.rpc('match_buyers_for_deal', { p_deal_id: dealId });
      await load(); // reload
    } catch (e) {
      console.error('Match error:', e);
      alert('Error running buyer matcher: ' + e.message);
    } finally {
      setRunning(false);
    }
  }

  async function updateStatus(matchId, buyerId, newStatus) {
    try {
      const supabase = createClient();
      await supabase
        .from('buyer_deal_matches')
        .update({ status: newStatus, last_contact: new Date().toISOString() })
        .eq('id', matchId);
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: newStatus } : m));
    } catch (e) { console.error(e); }
  }

  async function logOutreach(buyerId, buyerName, method, outcome, notes) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('buyer_outreach')
        .insert({
          deal_id: dealId,
          buyer_id: buyerId,
          buyer_name: buyerName,
          method,
          outcome,
          notes,
          contacted_by: 'Briana Corso',
          contacted_at: new Date().toISOString(),
        })
        .select().single();
      if (data) setOutreach(prev => [data, ...prev]);
      setLogTarget(null);
    } catch (e) { console.error(e); }
  }

  if (loading) return (
    <div className="cl-loading"><div className="cl-spinner" />Loading buyer matches…</div>
  );

  return (
    <div>
      {/* Sub-nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--card-border)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { key: 'matches',  label: `Buyer Matches${matches.length > 0 ? ` (${matches.length})` : ''}` },
            { key: 'outreach', label: `Outreach Log${outreach.length > 0 ? ` (${outreach.length})` : ''}` },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              style={{ padding: '7px 18px', fontSize: 13, fontFamily: 'var(--font-ui)', fontWeight: view === v.key ? 600 : 400, background: view === v.key ? 'var(--blue)' : 'var(--card-bg)', color: view === v.key ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={runMatcher}
            disabled={running}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--blue)', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', opacity: running ? 0.6 : 1 }}
          >
            {running ? '⟳ Running…' : '⟳ Refresh Matches'}
          </button>
          {view === 'outreach' && (
            <button
              onClick={() => setShowAdd(true)}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--blue)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
            >
              + Log Outreach
            </button>
          )}
        </div>
      </div>

      {/* ══ MATCHES VIEW ══ */}
      {view === 'matches' && (
        <div>
          {matches.length === 0 ? (
            <div className="cl-empty" style={{ padding: 48 }}>
              <div className="cl-empty-label">No buyer matches yet</div>
              <div className="cl-empty-sub" style={{ marginBottom: 16 }}>
                Run the buyer matcher to score your buyer database against this deal's criteria.
              </div>
              <button
                onClick={runMatcher}
                disabled={running}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--blue)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              >
                {running ? '⟳ Running matcher…' : '⟳ Run Buyer Matcher'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {matches.map(m => {
                const b = m.buyer;
                if (!b) return null;
                const isExpanded = expanded === m.id;
                const bd = m.match_breakdown || {};
                const statusStyle = OUTREACH_COLORS[m.status] || OUTREACH_COLORS['New'];
                const scoreColor = m.match_score >= 85 ? 'var(--green)' : m.match_score >= 70 ? 'var(--blue)' : 'var(--amber)';

                return (
                  <div key={m.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>

                    {/* Match header row */}
                    <div
                      onClick={() => setExpanded(isExpanded ? null : m.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      {/* Score ring */}
                      <div style={{ width: 52, height: 52, borderRadius: '50%', border: `2.5px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${scoreColor}15` }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{m.match_score}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: scoreColor, marginTop: 1 }}>MATCH</div>
                      </div>

                      {/* Buyer info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{b.company_name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {b.buyer_type?.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                          {b.primary_contact}{b.contact_title ? ` · ${b.contact_title}` : ''}
                          {b.target_markets?.length ? ` · ${b.target_markets.slice(0,2).join(', ')}` : ''}
                          {b.min_sf && b.max_sf ? ` · ${fmt(b.min_sf)}–${fmt(b.max_sf)} SF` : ''}
                        </div>
                      </div>

                      {/* Status select */}
                      <select
                        value={m.status || 'New'}
                        onChange={e => { e.stopPropagation(); updateStatus(m.id, b.id, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${statusStyle.bg}`, background: statusStyle.bg, color: statusStyle.color, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                      >
                        {OUTREACH_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>

                      {/* Log outreach button */}
                      <button
                        onClick={e => { e.stopPropagation(); setLogTarget({ id: b.id, name: b.company_name }); setView('outreach'); }}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--blue)', fontSize: 12, fontFamily: 'var(--font-ui)', cursor: 'pointer', flexShrink: 0 }}
                      >
                        Log →
                      </button>

                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{isExpanded ? '▴' : '▾'}</span>
                    </div>

                    {/* Expanded: match breakdown + contact details */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.015)' }}>

                        {/* Match dimension bars */}
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--card-border)' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12 }}>Match Breakdown</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                            {MATCH_DIMENSIONS.map(dim => {
                              const pts = bd[dim.key] ?? 0;
                              const pct = Math.round((pts / dim.max) * 100);
                              const barColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--blue)' : 'var(--amber)';
                              return (
                                <div key={dim.key}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{dim.label}</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: barColor, fontWeight: 600 }}>{pts}/{dim.max}</span>
                                  </div>
                                  <div style={{ height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 99 }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Buyer criteria + contact */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '14px 18px', gap: 24 }}>
                          <div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10 }}>Acquisition Criteria</div>
                            {[
                              ['Markets', b.target_markets?.join(', ')],
                              ['Deal Types', b.deal_types?.join(', ')],
                              ['SF Range', b.min_sf && b.max_sf ? `${fmt(b.min_sf)}–${fmt(b.max_sf)} SF` : null],
                              ['Price Range', b.min_price && b.max_price ? `${fmtMoney(b.min_price)}–${fmtMoney(b.max_price)}` : null],
                              ['Cap Rate', b.min_cap_rate && b.max_cap_rate ? `${(b.min_cap_rate * 100).toFixed(2)}–${(b.max_cap_rate * 100).toFixed(2)}%` : null],
                              ['Min Clear Ht', b.min_clear_height ? `${b.min_clear_height}'` : null],
                              ['Min WALT', b.min_walt ? `${b.min_walt} yrs` : null],
                              ['Tenant Credit', b.tenant_credit_pref],
                            ].filter(([,v]) => v).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{k}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'right', maxWidth: 200 }}>{v}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10 }}>Contact</div>
                            {[
                              ['Name', b.primary_contact],
                              ['Title', b.contact_title],
                              ['Phone', b.contact_phone],
                              ['Email', b.contact_email],
                            ].filter(([,v]) => v).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{k}</span>
                                <span style={{ fontSize: 12, color: k === 'Phone' || k === 'Email' ? 'var(--blue)' : 'var(--text-primary)' }}>
                                  {k === 'Phone' ? <a href={`tel:${v}`} style={{ color: 'inherit' }}>{v}</a> : k === 'Email' ? <a href={`mailto:${v}`} style={{ color: 'inherit' }}>{v}</a> : v}
                                </span>
                              </div>
                            ))}
                            {b.notes && (
                              <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--blue-bg)', border: '1px solid rgba(78,110,150,0.18)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, fontStyle: 'italic', fontFamily: 'var(--font-editorial)' }}>
                                {b.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ OUTREACH LOG VIEW ══ */}
      {view === 'outreach' && (
        <div>
          {/* Log outreach form — shown when logTarget is set or showAdd */}
          {(showAdd || logTarget) && (
            <OutreachLogForm
              dealId={dealId}
              prefillBuyer={logTarget}
              buyers={matches.map(m => ({ id: m.buyer?.id, name: m.buyer?.company_name }))}
              onSave={logOutreach}
              onClose={() => { setShowAdd(false); setLogTarget(null); }}
            />
          )}

          {outreach.length === 0 ? (
            <div className="cl-empty" style={{ padding: 48 }}>
              <div className="cl-empty-label">No outreach logged yet</div>
              <div className="cl-empty-sub">Track every call, email, and meeting with buyer prospects here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {outreach.map(o => {
                const statusStyle = OUTREACH_COLORS[o.status] || OUTREACH_COLORS['New'];
                return (
                  <div key={o.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {{'call':'📞','email':'✉️','meeting':'🤝','om':'📄','tour':'🏭'}[o.method] || '·'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{o.buyer_name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 7px', borderRadius: 4, background: statusStyle.bg, color: statusStyle.color, fontWeight: 600 }}>{o.status || 'New'}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{o.method}</span>
                      </div>
                      {o.outcome && <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{o.outcome}</div>}
                      {o.notes && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{o.notes}</div>}
                      <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 12, fontStyle: 'italic', color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {o.contacted_by || 'Briana Corso'} · {fmtDate(o.contacted_at || o.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── OUTREACH LOG FORM ─────────────────────────────────────────
function OutreachLogForm({ dealId, prefillBuyer, buyers, onSave, onClose }) {
  const [buyerId, setBuyerId]   = useState(prefillBuyer?.id || '');
  const [buyerName, setBuyerName] = useState(prefillBuyer?.name || '');
  const [method, setMethod]     = useState('call');
  const [outcome, setOutcome]   = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);

  async function handleSave() {
    if (!buyerName && !buyerId) { alert('Select a buyer'); return; }
    setSaving(true);
    await onSave(buyerId || null, buyerName || 'Unknown', method, outcome, notes);
    setSaving(false);
  }

  return (
    <div style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr, rgba(78,110,150,0.3))', borderRadius: 'var(--radius-md)', padding: 18, marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 12 }}>Log Buyer Outreach</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        {/* Buyer select */}
        <div>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Buyer</label>
          <select
            value={buyerId}
            onChange={e => {
              setBuyerId(e.target.value);
              const b = buyers.find(x => x.id === e.target.value);
              if (b) setBuyerName(b.name);
            }}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
          >
            <option value="">Select buyer…</option>
            {buyers.filter(b => b.id && b.name).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {!buyerId && (
            <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Or type buyer name…" style={{ width: '100%', marginTop: 6, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
          )}
        </div>
        {/* Method */}
        <div>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }}>
            <option value="call">📞 Call</option>
            <option value="email">✉️ Email</option>
            <option value="meeting">🤝 Meeting</option>
            <option value="om">📄 OM Sent</option>
            <option value="tour">🏭 Site Tour</option>
            <option value="loi">📋 LOI Discussion</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Outcome / Response</label>
        <input value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="e.g. Interested, requesting financials · Passed — too small · Sent OM" style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Full notes from the conversation…" rows={3} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Log Outreach'}
        </button>
        <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
