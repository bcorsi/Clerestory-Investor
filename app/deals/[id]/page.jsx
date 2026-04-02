'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// ─── HELPERS ──────────────────────────────────────────────────
function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtMoney(n) { if (!n) return '—'; const m = Number(n); return m >= 1_000_000 ? `$${(m/1_000_000).toFixed(2)}M` : `$${m.toLocaleString()}`; }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtDateShort(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
function daysAgo(d) { if (!d) return null; return Math.floor((Date.now() - new Date(d)) / 86400000); }

const STAGE_ORDER = [
  'Tracking','Underwriting','Off-Market Outreach','Marketing',
  'LOI','LOI Accepted','PSA Negotiation','Due Diligence',
  'Non-Contingent','Closed Won','Closed Lost','Dead',
];

const STAGE_COLORS = {
  'Tracking': 'var(--text-tertiary)',
  'Underwriting': 'var(--blue)',
  'Off-Market Outreach': 'var(--blue)',
  'Marketing': 'var(--amber)',
  'LOI': 'var(--amber)',
  'LOI Accepted': 'var(--green)',
  'PSA Negotiation': 'var(--green)',
  'Due Diligence': 'var(--green)',
  'Non-Contingent': 'var(--green)',
  'Closed Won': 'var(--green)',
  'Closed Lost': 'var(--rust)',
  'Dead': 'var(--rust)',
};

const PRIORITY_COLORS = {
  'High':   { bg: 'rgba(184,55,20,0.08)', color: 'var(--rust)',  border: 'rgba(184,55,20,0.25)' },
  'Medium': { bg: 'rgba(168,112,16,0.08)', color: 'var(--amber)', border: 'rgba(168,112,16,0.25)' },
  'Low':    { bg: 'rgba(0,0,0,0.04)',     color: 'var(--text-secondary)', border: 'rgba(0,0,0,0.1)' },
};

const ACT_ICONS = { call:'📞', email:'✉️', note:'📝', meeting:'🤝', task:'✓', stage:'◈', underwriting:'📊', default:'·' };

// ─── TICKER DATA ───────────────────────────────────────────────
const TICKER_ITEMS = [
  'SGV Cap Rates 5.1–5.4% · Q1 2026',
  'IE West Vacancy 3.2% · tightening',
  'WARN Intel: 4 active notices in SGV',
  'Rexford Q1 2026: 8 SGV acquisitions',
  'Construction costs +4.2% YoY · Inland Empire',
  '10-yr Treasury 4.62% · impact on cap rate spreads',
];

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function DealDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [deal, setDeal]           = useState(null);
  const [property, setProperty]   = useState(null);
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [synthOpen, setSynthOpen] = useState(true);
  const [logType, setLogType]     = useState('call');
  const [logText, setLogText]     = useState('');
  const [logSaving, setLogSaving] = useState(false);
  const [catalysts, setCatalysts] = useState([]);
  const probFillRef = useRef(null);

  useEffect(() => { if (id) loadDeal(); }, [id]);

  // Animate probability bar after load
  useEffect(() => {
    if (deal && probFillRef.current) {
      setTimeout(() => {
        if (probFillRef.current) {
          probFillRef.current.style.width = `${deal.close_probability || 0}%`;
        }
      }, 400);
    }
  }, [deal]);

  async function loadDeal() {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: d, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setDeal(d);

      // Load activities
      const { data: acts } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', id)
        .order('created_at', { ascending: false })
        .limit(25);
      setActivities(acts || []);

      // Load property if linked
      if (d?.property_id) {
        const { data: prop } = await supabase
          .from('properties')
          .select('id, address, city, state, building_sf, clear_height, year_built, land_acres, dock_doors, lease_expiration, in_place_rent, tenant, zoning, dock_high_doors, grade_level_doors, truck_court, sprinklers, power')
          .eq('id', d.property_id)
          .single();
        setProperty(prop || null);
      }

      // Load deal contacts
      const { data: dc } = await supabase
        .from('deal_contacts')
        .select('contact_id, role, contacts(id, first_name, last_name, title, company, phone, email)')
        .eq('deal_id', id)
        .limit(10);
      setContacts(dc || []);

      // Parse catalysts from deal or activities
      const rawCatalysts = d?.catalyst_tags
        ? (typeof d.catalyst_tags === 'string' ? JSON.parse(d.catalyst_tags) : d.catalyst_tags)
        : [];
      setCatalysts(Array.isArray(rawCatalysts) ? rawCatalysts : []);

    } catch (e) {
      console.error('Deal load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function logActivity() {
    if (!logText.trim()) return;
    setLogSaving(true);
    try {
      const supabase = createClient();
      const { data: newAct, error } = await supabase
        .from('activities')
        .insert({
          deal_id: id,
          activity_type: logType,
          subject: logText,
          body: logText,
          created_by: 'Briana Corso',
        })
        .select()
        .single();
      if (error) throw error;
      setActivities(prev => [newAct, ...prev]);
      setLogText('');
    } catch (e) {
      console.error(e);
    } finally {
      setLogSaving(false);
    }
  }

  async function advanceStage() {
    if (!deal) return;
    const idx = STAGE_ORDER.indexOf(deal.stage);
    if (idx < 0 || idx >= STAGE_ORDER.length - 3) return; // don't advance past Non-Contingent
    const nextStage = STAGE_ORDER[idx + 1];
    try {
      const supabase = createClient();
      await supabase.from('deals').update({ stage: nextStage }).eq('id', id);
      setDeal(prev => ({ ...prev, stage: nextStage }));
    } catch (e) { console.error(e); }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
      <div className="cl-spinner" style={{ marginRight: 10 }} /> Loading deal…
    </div>
  );

  if (!deal) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)' }}>
      Deal not found. <button onClick={() => router.push('/deals')} style={{ color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Back to pipeline</button>
    </div>
  );

  const stageIdx    = STAGE_ORDER.indexOf(deal.stage);
  const stageColor  = STAGE_COLORS[deal.stage] || 'var(--text-secondary)';
  const priorityStyle = PRIORITY_COLORS[deal.priority] || PRIORITY_COLORS['Medium'];
  const closeProb   = deal.close_probability || 0;
  const probColor   = closeProb >= 70 ? 'var(--green)' : closeProb >= 40 ? 'var(--amber)' : 'var(--rust)';
  const nextStage   = stageIdx >= 0 && stageIdx < STAGE_ORDER.length - 3 ? STAGE_ORDER[stageIdx + 1] : null;
  const commissionStages = ['LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won'];
  const showCommission = commissionStages.includes(deal.stage);
  const dealTitle = deal.name || (property ? `${deal.deal_type || 'Deal'} · ${property.address}` : `Deal #${id}`);

  // Build ticker items with deal-specific data mixed in
  const tickerItems = [
    deal.close_probability != null ? `Close Probability ${deal.close_probability}% · ${deal.stage}` : null,
    deal.asking_price ? `Deal Value ${fmtMoney(deal.asking_price)} · ${deal.deal_type || ''}` : null,
    property?.lease_expiration ? `Lease Exp. ${fmtDateShort(property.lease_expiration)}` : null,
    ...TICKER_ITEMS,
  ].filter(Boolean);

  const TABS = [
    { key: 'timeline',  label: 'Timeline',       count: activities.length },
    { key: 'uw',        label: 'Underwriting',    count: null },
    { key: 'property',  label: 'Property',        count: property ? 1 : 0 },
    { key: 'contacts',  label: 'Contacts',        count: contacts.length },
    { key: 'buyers',    label: 'Buyer Outreach',  count: null },
    { key: 'files',     label: 'Files',           count: null },
  ];

  return (
    <div style={{ fontFamily: 'var(--font-ui)', background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── LIVE SIGNAL TICKER ── */}
      <div style={{
        background: '#0A1018', height: 36, display: 'flex', alignItems: 'center',
        overflow: 'hidden', borderBottom: '1px solid rgba(100,128,162,0.15)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        {/* Label */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: '#89A8C6',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          padding: '0 16px', flexShrink: 0, height: '100%',
          display: 'flex', alignItems: 'center', gap: 8,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(100,128,162,0.07)',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#4CAF80', boxShadow: '0 0 7px #4CAF80',
            animation: 'cl-pulse 1.8s ease-in-out infinite', flexShrink: 0,
          }} />
          Live Signals
        </div>
        {/* Scrolling ticker */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', whiteSpace: 'nowrap',
            animation: 'cl-ticker 40s linear infinite',
          }}>
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'rgba(180,200,225,0.48)', padding: '0 28px',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                lineHeight: '36px',
              }}>
                {item}
              </span>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes cl-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes cl-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(.65); } }
          @keyframes cl-pbar { from { width: 0; } to { width: ${closeProb}%; } }
          @keyframes cl-fade-up { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          @keyframes cl-row-in { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }
        `}</style>
      </div>

      {/* ── HERO MAP AREA (satellite bg placeholder — real map via Leaflet if needed) ── */}
      <div style={{
        height: 280, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #0D1828 0%, #1A2A3A 60%, #0F1C28 100%)',
      }}>
        {/* Subtle grid texture for depth */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(100,128,162,0.08) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(4,2,1,0.94) 0%, rgba(4,2,1,0.20) 55%, transparent 100%)',
        }} />
        {/* Hero content */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 32px 22px', zIndex: 5 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-0.01em', marginBottom: 12, textShadow: '0 2px 14px rgba(0,0,0,0.8)' }}>
            {dealTitle}
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {/* Stage badge */}
            <HeroBadge color="amber">{deal.stage}</HeroBadge>
            {/* Probability */}
            {closeProb > 0 && <HeroBadge color="green">{closeProb}% Close Probability</HeroBadge>}
            {/* Deal type + value */}
            {deal.deal_type && deal.asking_price && (
              <HeroBadge color="blue">{deal.deal_type} · {fmtMoney(deal.asking_price)}</HeroBadge>
            )}
            {/* Size */}
            {property?.building_sf && (
              <HeroBadge color="blue">{fmt(property.building_sf)} SF · {deal.market || property.city || ''}</HeroBadge>
            )}
            {/* Priority */}
            {deal.priority && <HeroBadge color={deal.priority === 'High' ? 'rust' : deal.priority === 'Medium' ? 'amber' : 'gray'}>{deal.priority} Priority</HeroBadge>}
          </div>
        </div>
        {/* Back button */}
        <button
          onClick={() => router.push('/deals')}
          style={{
            position: 'absolute', top: 16, right: 22, zIndex: 10,
            padding: '7px 16px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(10px)',
            color: 'rgba(255,255,255,0.75)', fontSize: 12,
            fontFamily: 'var(--font-ui)', cursor: 'pointer',
          }}
        >
          ← Pipeline
        </button>
      </div>

      {/* ── ACTION BAR ── */}
      <div style={{
        background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '13px 32px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <ActionBtn variant="synth">✦ Synthesize</ActionBtn>
        <ActionBtn>📊 Run Comps</ActionBtn>
        <ActionBtn>↓ Export Memo</ActionBtn>
        <ActionBtn>↓ Export BOV</ActionBtn>
        <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.12)', margin: '0 4px' }} />
        <LinkBtn href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property?.address || deal.name || '')}`}>📍 Google Maps</LinkBtn>
        <LinkBtn href={`https://www.costar.com/`}>🏢 CoStar</LinkBtn>
        <LinkBtn href={`https://www.loopnet.com/`}>🔍 LoopNet</LinkBtn>
        {property?.city?.toLowerCase().includes('angeles') || property?.city ? (
          <LinkBtn href="https://portal.assessor.lacounty.gov/">🗺 LA County GIS</LinkBtn>
        ) : null}
        <div style={{ marginLeft: 'auto' }} />
        {nextStage && (
          <button
            onClick={advanceStage}
            style={{
              padding: '8px 20px', borderRadius: 7, border: 'none',
              background: 'linear-gradient(135deg, #2A5C2A, var(--green))',
              color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 2px 10px rgba(24,112,66,0.30)',
            }}
          >
            Advance to {nextStage} →
          </button>
        )}
      </div>

      {/* ── PIPELINE STAGE TRACK ── */}
      <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', padding: '0 32px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {STAGE_ORDER.filter(s => !['Closed Lost','Dead'].includes(s)).map((stage, i) => {
            const isDone   = stageIdx > i;
            const isActive = stageIdx === i;
            return (
              <div key={stage} style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  padding: '13px 22px 13px 26px',
                  fontSize: isActive ? 13 : 12.5, fontWeight: isActive ? 700 : 500,
                  color: isDone ? 'var(--green)' : isActive ? 'var(--blue)' : 'var(--text-tertiary)',
                  background: isActive ? 'rgba(78,110,150,0.09)' : 'transparent',
                  borderBottom: isActive ? '3px solid var(--blue)' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                  whiteSpace: 'nowrap', cursor: 'default',
                  ...(i === 0 ? { paddingLeft: 16 } : {}),
                }}>
                  {isDone && <span style={{ fontSize: 11, color: 'var(--green)' }}>✓</span>}
                  {isActive && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--blue)', flexShrink: 0,
                      animation: 'cl-pulse 1.5s ease-in-out infinite',
                    }} />
                  )}
                  {stage}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── INNER CONTENT ── */}
      <div style={{ padding: '22px 32px 0', animation: 'cl-fade-up 0.35s ease both' }}>

        {/* KPI STRIP */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          background: 'var(--card-bg)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)',
          overflow: 'hidden', marginBottom: 20,
        }}>
          <KpiCell label="Deal Value" sub={deal.deal_type || ''}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {fmtMoney(deal.asking_price)}
            </span>
          </KpiCell>
          {showCommission && (
            <KpiCell label="Commission Est." sub={deal.commission_pct ? `${deal.commission_pct}% both sides` : ''}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--green)', letterSpacing: '-0.02em' }}>
                {deal.commission_est ? fmtMoney(deal.commission_est) : '—'}
              </span>
            </KpiCell>
          )}
          {!showCommission && (
            <KpiCell label="Commission Est." sub="Available at LOI Accepted">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-tertiary)' }}>—</span>
            </KpiCell>
          )}
          {/* PROBABILITY — with animated bar */}
          <KpiCell label="Close Probability" sub={`Updated ${fmtDateShort(deal.updated_at)}`} style={{ position: 'relative', overflow: 'hidden' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--blue)', letterSpacing: '-0.02em' }}>
              {closeProb}%
            </span>
            {/* Animated bottom bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.05)' }}>
              <div
                ref={probFillRef}
                style={{
                  height: '100%', width: 0,
                  background: `linear-gradient(90deg, var(--blue3), ${probColor})`,
                  borderRadius: 0,
                  transition: 'width 1.7s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            </div>
          </KpiCell>
          <KpiCell label="Deal Type" sub={deal.seller || ''}>
            <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-secondary)', paddingTop: 4, display: 'block' }}>
              {deal.deal_type || '—'}
            </span>
          </KpiCell>
          <KpiCell label="Target Close" sub={deal.target_close_date ? `~${Math.max(0, Math.round((new Date(deal.target_close_date) - Date.now()) / 86400000))} days out` : ''}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--amber)', letterSpacing: '-0.02em' }}>
              {fmtDateShort(deal.target_close_date)}
            </span>
          </KpiCell>
        </div>

        {/* AI SYNTHESIS */}
        <div style={{
          background: 'var(--card-bg)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--card-shadow)', border: '1px solid rgba(88,56,160,0.18)',
          overflow: 'hidden', marginBottom: 20, position: 'relative',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, #8B6FCC, var(--purple))' }} />
          <div
            onClick={() => setSynthOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px 12px 22px', borderBottom: synthOpen ? '1px solid rgba(88,56,160,0.12)' : 'none',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: 'var(--purple)' }}>✦</span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--purple)' }}>AI Synthesis</span>
              <span style={{ fontFamily: 'var(--font-editorial)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
                Deal Status Report · {dealTitle}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-editorial)', fontSize: 13, fontStyle: 'italic', color: 'var(--purple)' }}>
              {synthOpen ? 'Hide ▴' : 'Show ▾'}
            </span>
          </div>
          {synthOpen && (
            <div>
              <div style={{ padding: '18px 24px 20px' }}>
                <SynthSection title="Current Deal Status">
                  <SynthItem>{deal.ai_synthesis_status || `${deal.deal_type || 'Deal'} — ${deal.stage} stage. ${deal.close_probability != null ? `${deal.close_probability}% close probability.` : ''} ${deal.notes || ''}`}</SynthItem>
                </SynthSection>
                {deal.ai_synthesis_contacts && (
                  <SynthSection title="Key Contacts / Decision Makers">
                    <SynthItem>{deal.ai_synthesis_contacts}</SynthItem>
                  </SynthSection>
                )}
                {deal.ai_next_steps && (
                  <SynthSection title="Recommended Next Steps">
                    {String(deal.ai_next_steps).split('\n').filter(Boolean).map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.72, color: 'var(--text-primary)', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--purple)', fontWeight: 600, flexShrink: 0, minWidth: 20, paddingTop: 2 }}>{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </SynthSection>
                )}
                {deal.ai_critical_note && (
                  <div style={{ marginTop: 14, padding: '11px 15px', background: 'rgba(184,55,20,0.05)', border: '1px solid rgba(184,55,20,0.18)', borderRadius: 7, fontSize: 13.5, lineHeight: 1.65 }}>
                    <strong style={{ color: 'var(--rust)' }}>Critical: </strong>{deal.ai_critical_note}
                  </div>
                )}
                {/* Fallback if no AI fields populated */}
                {!deal.ai_synthesis_status && !deal.ai_next_steps && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontFamily: 'var(--font-editorial)', fontSize: 14, fontStyle: 'italic' }}>
                    Click Synthesize to generate an AI deal analysis
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderTop: '1px solid rgba(88,56,160,0.10)', background: 'rgba(88,56,160,0.02)' }}>
                <button className="cl-btn cl-btn-ghost cl-btn-sm" style={{ color: 'var(--purple)', borderColor: 'rgba(88,56,160,0.22)', fontSize: 12 }}>↺ Regenerate</button>
                <button className="cl-btn cl-btn-ghost cl-btn-sm" style={{ color: 'var(--purple)', borderColor: 'rgba(88,56,160,0.22)', fontSize: 12 }}>⎘ Copy</button>
                {deal.ai_generated_at && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                    Generated {fmtDate(deal.ai_generated_at)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', marginBottom: 20 }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '11px 16px', fontSize: 13.5,
                color: activeTab === tab.key ? 'var(--blue)' : 'var(--text-secondary)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab.key ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom: -1, fontFamily: 'var(--font-ui)',
                fontWeight: activeTab === tab.key ? 500 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span style={{
                  marginLeft: 5, fontFamily: 'var(--font-mono)', fontSize: 10,
                  background: 'rgba(0,0,0,0.05)', border: '1px solid var(--card-border)',
                  borderRadius: 20, padding: '1px 7px', color: 'var(--text-tertiary)',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ TIMELINE TAB ══ */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 18 }}>
            {/* LEFT: Timeline */}
            <div>
              <div className="cl-card" style={{ overflow: 'hidden', marginBottom: 0 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--card-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--rust)', animation: 'cl-pulse 1.4s infinite', flexShrink: 0 }} />
                    Activity Timeline
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)' }}>{activities.length} entries</span>
                </div>

                {/* Inline Log Bar */}
                <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--card-border)', background: 'var(--bg)', display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {['call','email','note','meeting'].map(t => (
                      <button
                        key={t}
                        onClick={() => setLogType(t)}
                        style={{
                          padding: '5px 12px', borderRadius: 6, fontSize: 12,
                          fontFamily: 'var(--font-ui)',
                          background: logType === t ? 'var(--blue)' : 'var(--card-bg)',
                          color: logType === t ? '#fff' : 'var(--text-secondary)',
                          border: logType === t ? '1px solid var(--blue)' : '1px solid var(--card-border)',
                          cursor: 'pointer',
                        }}
                      >
                        {ACT_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  <input
                    value={logText}
                    onChange={e => setLogText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && logActivity()}
                    placeholder={`Log a ${logType}...`}
                    style={{
                      flex: 1, padding: '7px 12px', borderRadius: 6, fontSize: 13,
                      border: '1px solid var(--card-border)', background: 'var(--card-bg)',
                      fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', outline: 'none',
                      minWidth: 160,
                    }}
                  />
                  <button
                    onClick={logActivity}
                    disabled={logSaving || !logText.trim()}
                    style={{
                      padding: '7px 16px', borderRadius: 6, fontSize: 12.5, fontWeight: 500,
                      background: 'var(--blue)', color: '#fff', border: 'none',
                      fontFamily: 'var(--font-ui)', cursor: 'pointer', opacity: logSaving ? 0.6 : 1,
                    }}
                  >
                    {logSaving ? '…' : 'Log'}
                  </button>
                </div>

                {/* Activity rows */}
                {activities.length === 0 ? (
                  <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-editorial)', fontSize: 14, fontStyle: 'italic' }}>
                    No activity yet — log a call or note to start the timeline
                  </div>
                ) : activities.map(act => (
                  <div key={act.id} style={{
                    display: 'flex', gap: 13, padding: '12px 18px',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0,
                      background: act.activity_type === 'call' ? 'var(--blue-bg)' : act.activity_type === 'note' ? 'var(--amber-bg)' : act.activity_type === 'email' ? 'var(--purple-bg)' : 'var(--green-bg)',
                    }}>
                      {ACT_ICONS[act.activity_type] || ACT_ICONS.default}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                        {act.subject || act.body || act.activity_type}
                      </div>
                      {act.body && act.body !== act.subject && (
                        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{act.body}</div>
                      )}
                      <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 12, fontStyle: 'italic', color: 'var(--text-tertiary)', marginTop: 3 }}>
                        {act.created_by || 'Briana Corso'}{act.duration_minutes ? ` · ${act.duration_minutes} min` : ''}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', flexShrink: 0, paddingTop: 3 }}>
                      {fmtDateShort(act.created_at)}
                    </div>
                  </div>
                ))}

                {activities.length >= 5 && (
                  <div style={{ padding: '11px 18px', background: 'var(--bg)', borderTop: '1px solid var(--card-border)', textAlign: 'center', cursor: 'pointer' }}>
                    <span style={{ fontFamily: 'var(--font-editorial)', fontSize: 13.5, fontStyle: 'italic', color: 'var(--blue)' }}>
                      View all {activities.length} activities →
                    </span>
                  </div>
                )}
              </div>

              {/* DEAL DETAILS — horizontal strip */}
              <div className="cl-card" style={{ overflow: 'hidden', marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--card-border)', background: 'var(--bg)' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Deal Details</span>
                  <span style={{ fontFamily: 'var(--font-editorial)', fontSize: 13, fontStyle: 'italic', color: 'var(--blue)', cursor: 'pointer' }}>Edit</span>
                </div>
                {/* Row 1 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {[
                    { lbl: 'Deal Type',   val: deal.deal_type || '—' },
                    { lbl: 'Stage',       val: deal.stage || '—',       color: stageColor },
                    { lbl: 'Priority',    val: deal.priority || '—',    color: deal.priority === 'High' ? 'var(--rust)' : 'inherit', bold: deal.priority === 'High' },
                    { lbl: 'Seller',      val: deal.seller || '—',      link: true },
                    { lbl: 'Tenant',      val: deal.tenant || '—' },
                    { lbl: 'Market',      val: [deal.market, deal.submarket].filter(Boolean).join(' · ') || '—' },
                    { lbl: 'Close Date',  val: fmtDateShort(deal.target_close_date), color: 'var(--amber)' },
                  ].map(c => (
                    <div key={c.lbl} style={{ padding: '13px 16px', borderRight: '1px solid var(--card-border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 5 }}>{c.lbl}</div>
                      <div style={{ fontSize: 13.5, color: c.color || 'var(--text-primary)', fontWeight: c.bold ? 600 : 400, textDecoration: c.link ? 'underline' : 'none', textDecorationColor: 'rgba(78,110,150,0.3)', cursor: c.link ? 'pointer' : 'default' }}>{c.val}</div>
                    </div>
                  ))}
                </div>
                {/* Row 2 — building specs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid var(--card-border)' }}>
                  {[
                    { lbl: 'Building SF', val: property ? `${fmt(property.building_sf)} SF` : '—', mono: true },
                    { lbl: 'Clear Height', val: property?.clear_height ? `${property.clear_height} ft` : deal.clear_height ? `${deal.clear_height} ft` : '—', mono: true },
                    { lbl: 'Year Built',  val: property?.year_built || deal.year_built || '—', mono: true },
                    { lbl: 'Lease Term',  val: deal.lease_term || '—', mono: true },
                    { lbl: 'Rent Bumps',  val: deal.rent_bumps || '—', mono: true },
                    { lbl: 'Commission',  val: showCommission && deal.commission_est ? fmtMoney(deal.commission_est) : '—', color: 'var(--green)' },
                    { lbl: '$/SF',        val: deal.asking_price && property?.building_sf ? `$${Math.round(deal.asking_price / property.building_sf)}/SF` : '—', mono: true },
                  ].map(c => (
                    <div key={c.lbl} style={{ padding: '13px 16px', borderRight: '1px solid var(--card-border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 5 }}>{c.lbl}</div>
                      <div style={{ fontFamily: c.mono ? 'var(--font-mono)' : 'var(--font-ui)', fontSize: c.mono ? 13 : 13.5, color: c.color || 'var(--text-primary)' }}>{c.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* CLOSE PROBABILITY */}
              <div className="cl-card" style={{ border: '1px solid rgba(24,112,66,0.28)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 8 }}>Close Probability</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 700, color: probColor, lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {closeProb}%
                  </div>
                  <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', margin: '12px 0 10px' }}>
                    <div
                      ref={probFillRef}
                      style={{
                        height: '100%', width: 0, borderRadius: 3,
                        background: `linear-gradient(90deg, var(--blue3), ${probColor})`,
                        transition: 'width 1.7s cubic-bezier(0.4,0,0.2,1)',
                      }}
                    />
                  </div>
                  {deal.prob_note && <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.58 }}>{deal.prob_note}</p>}
                </div>
              </div>

              {/* DAYS IN STAGE */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(78,110,150,0.08), rgba(78,110,150,0.03))',
                border: '1px solid rgba(78,110,150,0.25)', borderRadius: 'var(--radius-md)',
                padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 700, color: 'var(--blue)', lineHeight: 1, letterSpacing: '-0.03em', flexShrink: 0 }}>
                  {deal.stage_entered_at ? daysAgo(deal.stage_entered_at) ?? '—' : '—'}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 4 }}>Days in Stage</div>
                  <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {deal.stage} · {fmtDateShort(deal.stage_entered_at || deal.updated_at)}
                  </div>
                </div>
              </div>

              {/* AI NEXT STEP */}
              <div style={{ background: 'rgba(88,56,160,0.04)', border: '1px solid rgba(88,56,160,0.18)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(88,56,160,0.12)' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12 }}>✦</span> AI Next Step
                  </div>
                  <button className="cl-btn cl-btn-ghost cl-btn-sm" style={{ fontSize: 11, color: 'var(--purple)', borderColor: 'rgba(88,56,160,0.22)' }}>Refresh</button>
                </div>
                <div style={{ padding: '13px 14px', fontFamily: 'var(--font-editorial)', fontSize: 14.5, fontStyle: 'italic', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                  {deal.ai_next_step || 'Click Synthesize for an AI recommendation'}
                </div>
              </div>

              {/* OPPORTUNITY MEMO */}
              {deal.opportunity_memo && (
                <div style={{ background: 'var(--blue-bg)', border: '1px solid rgba(78,110,150,0.28)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: 'rgba(78,110,150,0.12)', borderBottom: '1px solid rgba(78,110,150,0.28)', fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)' }}>
                    Opportunity Memo
                  </div>
                  <div style={{ padding: '13px 16px', fontSize: 13.5, lineHeight: 1.75, color: 'var(--text-primary)' }}>
                    {deal.opportunity_memo}
                  </div>
                </div>
              )}

              {/* ACTIVE CATALYSTS */}
              {catalysts.length > 0 && (
                <div className="cl-card" style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--card-border)', background: 'var(--bg)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Active Catalysts</span>
                    <span style={{ fontFamily: 'var(--font-editorial)', fontSize: 13, fontStyle: 'italic', color: 'var(--blue)', cursor: 'pointer' }}>+ Add</span>
                  </div>
                  {catalysts.map((cat, i) => {
                    const label = typeof cat === 'object' ? (cat.tag || cat.label || cat.name) : cat;
                    const desc  = typeof cat === 'object' ? (cat.description || cat.desc || '') : '';
                    const date  = typeof cat === 'object' ? cat.date : '';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderBottom: i < catalysts.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                        <span className="cl-catalyst cl-catalyst--owner" style={{ fontSize: 10.5, flexShrink: 0 }}>{label}</span>
                        {desc && <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', flex: 1 }}>{desc}</span>}
                        {date && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>{date}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ UNDERWRITING TAB ══ */}
        {activeTab === 'uw' && (
          <div style={{ padding: '4px 0' }}>
            <div className="cl-card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>UNDERWRITING</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Underwriting model for this deal will appear here. Export from Excel or link a model version.</p>
            </div>
          </div>
        )}

        {/* ══ PROPERTY TAB ══ */}
        {activeTab === 'property' && (
          <div>
            {!property ? (
              <div className="cl-empty"><div className="cl-empty-label">No property linked</div><div className="cl-empty-sub">Link a property from the Properties database to this deal</div></div>
            ) : (
              <div className="cl-card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Linked Property</span>
                  <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => router.push(`/properties/${property.id}`)}>Open Full Record →</button>
                </div>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{property.address}</div>
                  <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-tertiary)', marginBottom: 12 }}>
                    {[property.city, property.state].filter(Boolean).join(', ')} · {property.zoning || ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--card-border)', borderRadius: 7, overflow: 'hidden', marginBottom: 7 }}>
                    {[
                      { lbl: 'Building SF', val: fmt(property.building_sf) },
                      { lbl: 'Clear Ht',    val: property.clear_height ? `${property.clear_height}'` : '—' },
                      { lbl: 'Dock Doors',  val: property.dock_high_doors ? `${property.dock_high_doors} DH` : (property.dock_doors ? `${property.dock_doors}` : '—') },
                      { lbl: 'Year Built',  val: property.year_built || '—' },
                      { lbl: 'Land AC',     val: property.land_acres ? `${property.land_acres} ac` : '—' },
                      { lbl: 'Power',       val: property.power || '—' },
                      { lbl: 'Sprinklers',  val: property.sprinklers || '—' },
                      { lbl: 'Truck Court', val: property.truck_court ? `${property.truck_court}'` : '—' },
                    ].map((c, i) => (
                      <div key={c.lbl} style={{ padding: '9px 10px', borderRight: (i + 1) % 4 !== 0 ? '1px solid var(--card-border)' : 'none', borderTop: i >= 4 ? '1px solid var(--card-border)' : 'none', textAlign: 'center' }}>
                        <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 3 }}>{c.lbl}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-primary)' }}>{c.val}</div>
                      </div>
                    ))}
                  </div>
                  {property.lease_expiration && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <span className="cl-badge cl-badge-blue" style={{ fontSize: 10.5, padding: '4px 9px' }}>Lease Exp. {fmtDateShort(property.lease_expiration)}</span>
                      {property.in_place_rent && <span className="cl-badge cl-badge-amber" style={{ fontSize: 10.5, padding: '4px 9px' }}>In-Place: ${Number(property.in_place_rent).toFixed(2)}/SF NNN</span>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ CONTACTS TAB ══ */}
        {activeTab === 'contacts' && (
          <div>
            {contacts.length === 0 ? (
              <div className="cl-empty"><div className="cl-empty-label">No contacts linked</div><div className="cl-empty-sub">Add contacts associated with this deal</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {contacts.map((dc, i) => {
                  const c = dc.contacts || dc;
                  return (
                    <div key={i} className="cl-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--blue-bg)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        {(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.title}{c.company ? ` · ${c.company}` : ''}</div>
                      </div>
                      {dc.role && <span className="cl-badge cl-badge-blue" style={{ fontSize: 10 }}>{dc.role}</span>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {c.phone && <a href={`tel:${c.phone}`} className="cl-btn cl-btn-ghost cl-btn-sm">📞</a>}
                        {c.email && <a href={`mailto:${c.email}`} className="cl-btn cl-btn-ghost cl-btn-sm">✉️</a>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ BUYER OUTREACH TAB ══ */}
        {activeTab === 'buyers' && (
          <div className="cl-empty"><div className="cl-empty-label">Buyer outreach</div><div className="cl-empty-sub">Add buyer matches and track outreach status</div></div>
        )}

        {/* ══ FILES TAB ══ */}
        {activeTab === 'files' && (
          <div className="cl-empty"><div className="cl-empty-label">No files attached</div><div className="cl-empty-sub">Upload BOVs, LOI drafts, underwriting models, and inspection reports</div></div>
        )}

      </div>{/* /inner */}
    </div>
  );
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────
function HeroBadge({ color = 'blue', children }) {
  const styles = {
    amber: { bg: 'rgba(140,90,4,0.40)', border: 'rgba(220,160,50,0.55)', color: '#FFE0A0' },
    green: { bg: 'rgba(21,102,54,0.38)', border: 'rgba(60,180,110,0.52)', color: '#B8F0D0' },
    blue:  { bg: 'rgba(78,110,150,0.38)', border: 'rgba(137,168,198,0.54)', color: '#C8E0F8' },
    rust:  { bg: 'rgba(184,55,20,0.38)', border: 'rgba(220,100,60,0.52)', color: '#FFD0B8' },
    gray:  { bg: 'rgba(0,0,0,0.25)', border: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' },
  };
  const s = styles[color] || styles.blue;
  return (
    <span style={{
      padding: '5px 12px', borderRadius: 5, fontSize: 11.5, fontWeight: 500,
      letterSpacing: '0.02em', border: `1px solid ${s.border}`,
      background: s.bg, color: s.color, backdropFilter: 'blur(8px)',
    }}>
      {children}
    </span>
  );
}

function ActionBtn({ children, variant, onClick }) {
  const base = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap', transition: 'all 0.12s' };
  const styles = {
    synth: { ...base, background: 'rgba(88,56,160,0.10)', borderColor: 'rgba(88,56,160,0.30)', color: 'var(--purple)' },
    default: { ...base, background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' },
  };
  return <button style={styles[variant] || styles.default} onClick={onClick}>{children}</button>;
}

function LinkBtn({ children, href }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 12.5, padding: '6px 10px', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(78,110,150,0.3)', fontFamily: 'var(--font-ui)' }}>
      {children}
    </a>
  );
}

function KpiCell({ label, sub, children, style = {} }) {
  return (
    <div style={{ padding: '17px 20px', borderRight: '1px solid var(--card-border)', position: 'relative', overflow: 'hidden', ...style }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 7 }}>{label}</div>
      {children}
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SynthSection({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)', flexShrink: 0 }} />
        {title}
      </div>
      {children}
    </div>
  );
}

function SynthItem({ children }) {
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.72, color: 'var(--text-primary)', display: 'flex', gap: 8, marginBottom: 3 }}>
      <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>–</span>
      <span>{children}</span>
    </div>
  );
}
