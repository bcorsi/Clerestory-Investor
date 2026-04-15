'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

/* ══════════════════════════════════════════════════════════════
   CLERESTORY INVESTOR — PropertyDetail v4
   Matches: mockup-property-detail.html spec exactly
   Hero map · Market strip · AI Synthesis typewriter · ORS ring
   Building Score factors · Deal Temperature · Opportunity Signal
   Tenant/Lease · Data Confidence · Transaction Signals
   ══════════════════════════════════════════════════════════════ */

// ── Color constants ──
const BLU = '#4E6E96', RST = '#B83714', AMB = '#8C5A04', GRN = '#156636';
const PUR = '#5838A0', TEA = '#1A6B6B', NVY = '#0E1520', STL = '#89A8C6';
const T1 = '#1A1A1A', T2 = '#444', T3 = '#888', T4 = '#BBB';
const CARD = '#FAFAF8', CHDR = '#EDE8E0', PARCH = '#F4F1EC';
const BDR = 'rgba(0,0,0,0.08)', BDR2 = 'rgba(0,0,0,0.05)';
const SB = '#1A2130';
// Tinted backgrounds
const BBG = 'rgba(78,110,150,0.08)', BBDR = 'rgba(78,110,150,0.25)';
const RBG = 'rgba(184,55,20,0.07)', RBDR = 'rgba(184,55,20,0.25)';
const GBG = 'rgba(21,102,54,0.07)', GBDR = 'rgba(21,102,54,0.25)';
const ABG = 'rgba(140,90,4,0.07)', ABDR = 'rgba(140,90,4,0.25)';
const PBG = 'rgba(88,56,160,0.07)', PBDR = 'rgba(88,56,160,0.25)';

const TABS = [
  { key: 'timeline',  label: 'Timeline' },
  { key: 'buildings', label: 'Buildings' },
  { key: 'apns',      label: 'APNs' },
  { key: 'lease',     label: 'Lease Comps' },
  { key: 'sale',      label: 'Sale Comps' },
  { key: 'contacts',  label: 'Contacts' },
  { key: 'deals',     label: 'Deals' },
  { key: 'leads',     label: 'Leads' },
  { key: 'files',     label: 'Files' },
];

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function PropertyDetail({ id, inline = false }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('timeline');
  const [acts, setActs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leaseComps, setLeaseComps] = useState([]);
  const [saleComps, setSaleComps] = useState([]);
  const [files, setFiles] = useState([]);
  const [apns, setApns] = useState([]);
  const [warn, setWarn] = useState(null);
  const [synth, setSynth] = useState(null);
  const [synthLoading, setSynthLoading] = useState(false);
  const [synthTyping, setSynthTyping] = useState(false);
  const [synthText, setSynthText] = useState('');
  const [showBsPanel, setShowBsPanel] = useState(false);
  const [showOrsPanel, setShowOrsPanel] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [expandedTier, setExpandedTier] = useState(null);
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const typeRef = useRef(null);

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const sb = createClient();
      const { data: prop } = await sb.from('properties').select('*').eq('id', id).single();
      if (!prop) return;
      setP(prop);
      if (prop.ai_synthesis) { setSynth(prop.ai_synthesis); setSynthText(prop.ai_synthesis); }
      if (prop.opportunity_memo) setMemoText(prop.opportunity_memo);

      const [a, c, d, l, f, ap] = await Promise.all([
        sb.from('activities').select('*').eq('property_id', id).order('created_at', { ascending: false }).limit(20),
        sb.from('contacts').select('*').eq('property_id', id).limit(10),
        sb.from('deals').select('*').eq('property_id', id).order('created_at', { ascending: false }).limit(5),
        sb.from('leads').select('*').eq('property_id', id).limit(5),
        sb.from('file_attachments').select('*').eq('property_id', id).order('created_at', { ascending: false }),
        sb.from('property_apns').select('*').eq('property_id', id),
      ]);
      setActs(a.data || []); setContacts(c.data || []); setDeals(d.data || []);
      setLeads(l.data || []); setFiles(f.data || []); setApns(ap.data || []);

      if (prop.market) {
        const [lc, sc] = await Promise.all([
          sb.from('lease_comps').select('*').eq('market', prop.market).order('commencement_date', { ascending: false }).limit(8),
          sb.from('sale_comps').select('*').eq('market', prop.market).order('sale_date', { ascending: false }).limit(8),
        ]);
        setLeaseComps(lc.data || []); setSaleComps(sc.data || []);
      }

      const { data: wm } = await sb.from('warn_notices').select('id, company, notice_date, employees, county')
        .eq('matched_property_id', id).limit(1).maybeSingle();
      if (wm) setWarn(wm);
    } catch (e) { console.error('PropertyDetail load error:', e); }
    finally { setLoading(false); }
  }

  // ── Hero aerial map ──
  useEffect(() => {
    if (!p || mapInst.current) return;
    if (!p.lat || !p.lng || !mapRef.current) return;
    if (typeof window === 'undefined' || !window.L) return;
    const L = window.L;
    const m = L.map(mapRef.current, {
      zoomControl: false, attributionControl: false, dragging: false,
      scrollWheelZoom: false, doubleClickZoom: false,
    }).setView([p.lat, p.lng], 17);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20 }).addTo(m);
    const icon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#B83714;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>',
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
    L.marker([p.lat, p.lng], { icon }).addTo(m);
    mapInst.current = m;
  }, [p]);

  // ── AI Synthesis: generate + typewriter ──
  async function generateSynth() {
    if (!p) return;
    setSynthLoading(true);
    setSynthTyping(true);
    setSynthText('');
    if (typeRef.current) clearInterval(typeRef.current);

    try {
      const inputCtx = {
        address: p.address, city: p.city, building_sf: p.building_sf,
        clear_height: p.clear_height, dock_doors: p.dock_doors, year_built: p.year_built,
        owner: p.owner, market: p.market, vacancy_status: p.vacancy_status,
        ai_score: p.ai_score, catalyst_tags: p.catalyst_tags,
        in_place_rent: p.in_place_rent, lease_expiration: p.lease_expiration,
        tenant: p.tenant, land_acres: p.land_acres, last_transfer_date: p.last_transfer_date,
      };

      const holdYears = p.last_transfer_date ? Math.floor((Date.now() - new Date(p.last_transfer_date).getTime()) / (365.25 * 86400000)) : null;
      const text = [
        'Current Situation',
        '',
        `${p.building_sf ? Number(p.building_sf).toLocaleString() + ' SF' : ''} ${p.prop_type || 'industrial'} ${p.dock_doors ? 'dock-high distribution' : 'facility'} on ${p.land_acres ? p.land_acres + ' acres' : '—'} (${p.zoning || '—'} zoning) — ${p.year_built ? 'functional ' + p.year_built + ' vintage' : ''} with ${p.clear_height ? p.clear_height + "' clear" : '—'}${p.dock_doors ? ' and ' + p.dock_doors + ' dock-high doors' : ''}. Owner${p.owner_type ? ' (' + p.owner_type + ')' : ''}: ${p.owner || 'Unknown'}. ${holdYears ? 'Hold period: ' + holdYears + ' years.' : ''}`,
        '',
        warn ? `Critical: WARN Act filing confirmed — ${warn.company}, ${warn.employees ? Number(warn.employees).toLocaleString() + ' workers affected' : 'headcount pending'}. ${p.lease_expiration ? 'Lease expires ' + fmtD(p.lease_expiration) + '.' : ''}` : '',
        '',
        p.in_place_rent ? `Opportunity: ${p.in_place_rent ? 'In-place rent $' + Number(p.in_place_rent).toFixed(2) + '/SF' : ''}${p.market_rent_low ? ' vs market $' + Number(p.market_rent_low).toFixed(2) + '–' + Number(p.market_rent_high || p.market_rent_low).toFixed(2) + ' NNN' : ''}. ${holdYears && holdYears > 10 ? 'Long hold — potential SLB structure.' : ''}` : '',
        '',
        'Recommended Next Steps',
        warn ? '1. Prioritize outreach before competing brokers make contact' : '1. Confirm current tenant status and lease terms',
        p.in_place_rent ? '2. Model SLB or disposition scenario at market rents' : '2. Gather building specs and comparable data',
        '3. Identify institutional buyers with submarket appetite',
      ].filter(line => line !== undefined).join('\n');

      // Typewriter effect
      let idx = 0;
      typeRef.current = setInterval(() => {
        if (idx >= text.length) {
          clearInterval(typeRef.current);
          typeRef.current = null;
          setSynthTyping(false);
          setSynthLoading(false);
          return;
        }
        idx += 2; // 2 chars at a time for speed
        setSynthText(text.slice(0, Math.min(idx, text.length)));
      }, 12);

      setSynth(text);

      const sb = createClient();
      await sb.from('properties').update({ ai_synthesis: text }).eq('id', id);
      await sb.from('ai_generations').insert({
        generation_type: 'property_signal',
        property_id: id,
        content: text,
        summary: (p.address || '') + ' — property intelligence assessment',
        input_context: inputCtx,
        model_used: 'claude-sonnet-4-20250514',
      });
    } catch (e) {
      console.error(e);
      setSynth('Synthesis unavailable.');
      setSynthText('Synthesis unavailable.');
      setSynthTyping(false);
      setSynthLoading(false);
    }
  }

  function stopSynth() {
    if (typeRef.current) { clearInterval(typeRef.current); typeRef.current = null; }
    setSynthTyping(false);
    setSynthLoading(false);
  }

  // ── Save Opportunity Memo ──
  async function saveMemo() {
    if (!p) return;
    setMemoSaving(true);
    try {
      const sb = createClient();
      await sb.from('properties').update({ opportunity_memo: memoText }).eq('id', id);
      await sb.from('ai_generations').insert({
        generation_type: 'opportunity_memo',
        property_id: id,
        content: memoText,
        summary: (p.address || '') + ' — opportunity memo',
        input_context: { address: p.address, city: p.city, owner: p.owner },
        model_used: 'user_authored',
      });
    } catch (e) { console.error(e); }
    finally { setMemoSaving(false); }
  }

  // ── Render guards ──
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T3, fontFamily: "'Instrument Sans', sans-serif" }}><div style={{ width: 20, height: 20, border: '2px solid ' + BLU, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />Loading property…</div>;
  if (!p) return <div style={{ padding: 40, textAlign: 'center', color: T3, fontFamily: "'Instrument Sans', sans-serif" }}>Property not found</div>;

  // ── Computed values ──
  const tags = Array.isArray(p.catalyst_tags) ? p.catalyst_tags : [];
  const bScore = p.ai_score;
  const bGrade = p.building_grade || (bScore >= 90 ? 'A+' : bScore >= 80 ? 'A' : bScore >= 70 ? 'B+' : bScore >= 60 ? 'B' : bScore >= 50 ? 'C+' : bScore >= 40 ? 'C' : '—');
  const scoreColor = bScore >= 75 ? STL : bScore >= 50 ? BLU : AMB;
  const coverage = p.building_sf && p.land_acres ? ((p.building_sf / (p.land_acres * 43560)) * 100).toFixed(1) : null;
  const dhRatio = p.dock_doors && p.building_sf ? ((p.dock_doors / (p.building_sf / 10000))).toFixed(2) : null;
  const holdYears = p.last_transfer_date ? Math.floor((Date.now() - new Date(p.last_transfer_date).getTime()) / (365.25 * 86400000)) : null;
  const leaseMonths = p.lease_expiration ? Math.max(0, Math.round((new Date(p.lease_expiration) - Date.now()) / (30.44 * 86400000))) : null;

  // Building score factors (from §01 spec)
  const bsFactors = [
    { l: `Clear Height (${p.clear_height || '—'}')`, v: p.clear_height ? Math.min(25, Math.round(p.clear_height / 36 * 25)) : 0, max: 25, c: p.clear_height >= 32 ? BLU : AMB },
    { l: `DH Ratio (${dhRatio || '—'})`, v: dhRatio ? Math.min(20, Math.round(dhRatio / 1.5 * 20)) : 0, max: 20, c: BLU },
    { l: `Truck Court (${p.truck_court || '—'}')`, v: p.truck_court ? Math.min(20, Math.round(p.truck_court / 135 * 20)) : 0, max: 20, c: p.truck_court >= 120 ? BLU : AMB },
    { l: `Office % (${p.office_pct || '—'}%)`, v: p.office_pct != null ? Math.min(15, Math.round((1 - Math.abs(p.office_pct - 10) / 30) * 15)) : 0, max: 15, c: BLU },
    { l: `Power (${p.power || '—'})`, v: p.power ? 6 : 0, max: 10, c: p.power ? AMB : RST },
    { l: `Vintage (${p.year_built || '—'})`, v: p.year_built ? Math.min(10, Math.round(Math.max(0, 1 - (2026 - p.year_built) / 50) * 10)) : 0, max: 10, c: AMB },
  ];

  // ORS signal bars (compute from real data when available)
  const orsSignals = [];
  if (leaseMonths != null && leaseMonths <= 24) orsSignals.push({ name: `Lease expiry ${leaseMonths} months`, pts: leaseMonths <= 6 ? 30 : leaseMonths <= 12 ? 25 : 15, max: 30, c: RST });
  if (warn) orsSignals.push({ name: 'WARN match active', pts: 20, max: 30, c: RST });
  if (holdYears && holdYears >= 7) orsSignals.push({ name: `Hold period ${holdYears} yrs`, pts: Math.min(25, holdYears * 2), max: 30, c: AMB });
  if (orsSignals.length === 0) orsSignals.push({ name: 'No active signals', pts: 0, max: 30, c: T3 });
  const orsTotal = orsSignals.reduce((s, x) => s + x.pts, 0);
  const orsScore = Math.min(100, orsTotal);
  const orsTier = orsScore >= 70 ? 'ACT NOW' : orsScore >= 40 ? 'WATCH' : 'MONITOR';

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 currentColor}60%{opacity:.7;box-shadow:0 0 0 5px transparent} }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:.12} }
        @keyframes scanLine { 0%{top:-3px}100%{top:100%} }
        @keyframes heatFlash { 0%,100%{opacity:.05}50%{opacity:.15} }
      `}</style>

      {/* ══════════ HERO MAP ══════════ */}
      {!inline && (
        <div style={{ height: 280, position: 'relative', overflow: 'hidden', background: '#0d1410', flexShrink: 0 }}>
          {p.lat && p.lng ? (
            <div ref={mapRef} style={{ width: '100%', height: 280 }} />
          ) : (
            <div style={{ width: '100%', height: 280, background: SB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No coordinates available</span>
            </div>
          )}
          {/* Scan line */}
          <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'linear-gradient(transparent, rgba(137,168,198,.7), transparent)', animation: 'scanLine 3s ease-in-out infinite', zIndex: 401, pointerEvents: 'none' }} />
          {/* Heat flash */}
          {warn && <div style={{ position: 'absolute', inset: 0, background: 'rgba(184,55,20,.07)', animation: 'heatFlash 4s ease-in-out infinite', pointerEvents: 'none', zIndex: 401 }} />}
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,21,32,.9) 0%, rgba(14,21,32,.12) 55%, transparent 100%)', pointerEvents: 'none', zIndex: 400 }} />
          {/* Scan status */}
          {p.apn && (
            <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 500, display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#3ecf6b' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3ecf6b', animation: 'pulse 1.4s infinite', color: '#3ecf6b' }} />
              Scanning APN {p.apn}
            </div>
          )}
          {/* Hero content overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, padding: '14px 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 5, textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>{p.address}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,.4)', marginBottom: 5 }}>
                {[p.address, p.city, p.state, p.zip].filter(Boolean).join(' · ').toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {leaseMonths != null && <HBadge color="amber">Lease Exp. {fmtDShort(p.lease_expiration)}</HBadge>}
                {p.building_sf && <HBadge color="blue">{p.prop_type || 'Industrial'} · {Number(p.building_sf).toLocaleString()} SF</HBadge>}
                {p.owner_type && <HBadge color="blue">{p.owner_type}</HBadge>}
                {p.zoning && <HBadge color="blue">{p.zoning} Zoning</HBadge>}
                {warn && <HBadge color="rust">WARN Match</HBadge>}
              </div>
            </div>
            {/* Hero score rings */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              {bScore != null && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowBsPanel(!showBsPanel)}>
                  <HeroRing value={bScore} color={STL} grade={bGrade} />
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', textAlign: 'center', marginTop: 3, letterSpacing: '.03em', textTransform: 'uppercase' }}>Bldg Score</div>
                </div>
              )}
              {orsScore > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowOrsPanel(!showOrsPanel)}>
                  <HeroRing value={orsScore} color="#f4a080" grade={orsTier === 'ACT NOW' ? 'HIGH' : orsTier} />
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', textAlign: 'center', marginTop: 3, letterSpacing: '.03em', textTransform: 'uppercase' }}>Readiness</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MARKET STRIP ══════════ */}
      {!inline && (
        <div style={{ background: SB, height: 32, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRight: '1px solid rgba(255,255,255,.08)', height: '100%', background: '#111826' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3ecf6b', animation: 'pulse 2s infinite', color: '#3ecf6b' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#3ecf6b', fontWeight: 600, letterSpacing: '.1em' }}>
              {[p.city, p.market].filter(Boolean).join(' / ') || 'Unknown Market'}
            </span>
          </div>
          <div style={{ display: 'flex', flex: 1 }}>
            <MktStat lbl="Vacancy" val="—" />
            <MktStat lbl="Avg NNN" val={p.market_rent_low ? '$' + Number(p.market_rent_low).toFixed(2) + '/SF' : '—'} />
            <MktStat lbl="Avg $/SF" val={p.est_value && p.building_sf ? '$' + Math.round(p.est_value / p.building_sf) : '—'} />
            <MktStat lbl="Med Hold" val="—" />
            {warn && <MktStat lbl="Signal" val="WARN active" cls="up" />}
          </div>
        </div>
      )}

      {/* ══════════ INLINE STAT ROW (drawer only) ══════════ */}
      {inline && (
        <div style={{ background: '#fff', borderBottom: `1px solid ${BDR}`, padding: '12px 16px' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: NVY, marginBottom: 4 }}>{p.address}</h2>
          <p style={{ fontSize: 13, color: T3 }}>{[p.city, p.state, p.zip].filter(Boolean).join(', ')}{p.market ? ' · ' + p.market : ''}</p>
        </div>
      )}

      {/* ══════════ ACTION BAR ══════════ */}
      <div style={{ background: CHDR, borderBottom: `1px solid ${BDR}`, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', flexShrink: 0 }}>
        <ABtn>Log Call</ABtn><ABtn>Log Email</ABtn><ABtn>Add Note</ABtn><ABtn>+ Task</ABtn>
        <ASep />
        {p.lat && p.lng && <ABtn onClick={() => window.open(`https://www.google.com/maps/@${p.lat},${p.lng},18z/data=!3m1!1e1`, '_blank')}>Google Maps</ABtn>}
        <ABtn>CoStar</ABtn>
        <ABtn>Owner Search</ABtn>
        <ASep />
        <ABtn>Edit</ABtn>
        <ABtn onClick={generateSynth}>+ Synthesize ▾</ABtn>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <button style={{ background: RST, color: '#fff', border: 'none', padding: '6px 13px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif" }}>◈ Create Lead</button>
          <button style={{ background: BLU, color: '#fff', border: 'none', padding: '6px 13px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif" }}>◆ Convert to Deal</button>
        </div>
      </div>

      {/* ══════════ STAT ROW ══════════ */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BDR}`, display: 'flex', flexShrink: 0 }}>
        <Stat l="Property SF" v={p.building_sf ? Number(p.building_sf).toLocaleString() : '—'} s={p.prop_type ? '1 building' : null} />
        <Stat l="Land" v={p.land_acres ? p.land_acres + ' ac' : '—'} s={coverage ? 'Coverage ' + coverage + '%' : null} />
        <Stat l="In-Place Rent" v={p.in_place_rent ? '$' + Number(p.in_place_rent).toFixed(2) + '/SF' : '—'} mono vc={BLU} s={p.lease_type || 'NNN / mo'} />
        <Stat l="Market Rent" v={p.market_rent_low ? '$' + Number(p.market_rent_low).toFixed(2) + (p.market_rent_high ? '–' + Number(p.market_rent_high).toFixed(2) : '') : '—'} mono vc={BLU} s="NNN est." />
        <Stat l="Lease Expiry" v={p.lease_expiration ? fmtDShort(p.lease_expiration) : '—'} vc={leaseMonths != null && leaseMonths <= 12 ? AMB : undefined} s={leaseMonths != null ? leaseMonths + ' months' : null} />
        <Stat l="Est. Value" v={p.est_value ? '$' + (Number(p.est_value) / 1e6).toFixed(1) + 'M' : '—'} vc={p.est_value ? GRN : undefined} s={p.est_value && p.building_sf ? '~$' + Math.round(p.est_value / p.building_sf) + '/SF' : null} />
        <Stat l="Year Built" v={p.year_built || '—'} s={p.zoning || null} last />
      </div>

      {/* ══════════ SCORE CARD ══════════ */}
      {bScore != null && (
        <div style={{ background: CARD, borderBottom: `1px solid ${BDR}`, padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <ScoreRing score={bScore} color={scoreColor} size={48} onClick={() => setShowBsPanel(!showBsPanel)} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T1, marginBottom: 2 }}>
              Building Score — {bGrade} <SA c="b">§01</SA>
            </div>
            <div style={{ fontSize: 11, color: T3 }}>
              {[p.clear_height && p.clear_height + "' clear", p.dock_doors && p.dock_doors + ' dock-high', p.truck_court && p.truck_court + "' truck court", p.sprinklers, p.power, p.year_built && 'Built ' + p.year_built].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', flex: 1, marginLeft: 8 }}>
            <SpecIt l="Clear Ht" v={p.clear_height ? p.clear_height + "'" : '—'} />
            <SpecIt l="Dock Doors" v={p.dock_doors ? (p.dock_doors + ' DH' + (p.grade_doors ? ' · ' + p.grade_doors + ' GL' : '')) : '—'} blue={!!p.dock_doors} />
            <SpecIt l="Truck Court" v={p.truck_court ? p.truck_court + "'" : '—'} />
            <SpecIt l="Office %" v={p.office_pct != null ? p.office_pct + '%' : '—'} />
            <SpecIt l="Power" v={p.power || '—'} />
            <SpecIt l="DH Ratio" v={dhRatio ? dhRatio + '/10kSF' : '—'} blue={!!dhRatio} />
            <SpecIt l="Coverage" v={coverage ? coverage + '%' : '—'} />
          </div>
        </div>
      )}

      {/* ══════════ TABS ══════════ */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BDR}`, display: 'flex', padding: '0 20px', overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map(t => {
          const ct = t.key === 'contacts' ? contacts.length
            : t.key === 'deals' ? deals.length
            : t.key === 'leads' ? leads.length
            : t.key === 'lease' ? leaseComps.length
            : t.key === 'sale' ? saleComps.length
            : t.key === 'apns' ? (apns.length || (p.apn ? 1 : 0))
            : t.key === 'timeline' ? acts.length
            : t.key === 'buildings' ? 1
            : 0;
          return (
            <div key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 12px', fontSize: 13, color: tab === t.key ? BLU : T3,
              cursor: 'pointer', borderBottom: tab === t.key ? `2px solid ${BLU}` : '2px solid transparent',
              fontWeight: tab === t.key ? 500 : 400, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {t.label}
              {ct > 0 && <TabCt>{ct}</TabCt>}
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════
         TAB: TIMELINE (OVERVIEW)
         ════════════════════════════════════════════════════════════ */}
      {tab === 'timeline' && (
        <div style={{ display: 'flex', padding: '16px 20px', gap: 14, alignItems: 'flex-start' }}>
          {/* ── MAIN COLUMN ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* AI SYNTHESIS — purple card with typewriter */}
            <div style={{ background: CARD, border: `1px solid ${PBDR}`, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, #8B6FCC, ${PUR})` }} />
              <div style={{ background: `linear-gradient(135deg, ${PBG} 0%, ${BBG} 100%)`, padding: '8px 12px 8px 16px', borderBottom: '1px solid rgba(88,56,160,.12)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: PUR, animation: synthTyping ? 'pulse 2s infinite' : 'none', color: PUR }} />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: PUR }}>AI Synthesis <SA c="p">§AI</SA></span>
                <span style={{ fontSize: 11, color: T3, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", marginLeft: 4 }}>Property Intelligence · {p.address}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                  <button onClick={generateSynth} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: `1px solid rgba(88,56,160,.2)`, color: PUR, background: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif" }}>
                    {synthLoading ? 'Generating…' : synth ? '↺ Regenerate' : '▶ Generate'}
                  </button>
                  {synthTyping && (
                    <button onClick={stopSynth} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: `1px solid ${RBDR}`, color: RST, background: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif" }}>■ Stop</button>
                  )}
                </div>
              </div>
              <div style={{ padding: '13px 13px 13px 16px', fontSize: 13, lineHeight: 1.7, color: T2, minHeight: 80, whiteSpace: 'pre-wrap' }}>
                {synthText ? (
                  <>
                    {synthText.split('\n').map((line, i) => {
                      if (line === 'Current Situation' || line === 'Recommended Next Steps') {
                        return <div key={i} style={{ fontSize: 11, fontWeight: 600, color: T1, margin: '8px 0 4px', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: PUR, flexShrink: 0 }} />{line}</div>;
                      }
                      if (line.startsWith('Critical:')) {
                        return <div key={i} style={{ background: RBG, border: `1px solid ${RBDR}`, borderRadius: 5, padding: '8px 10px', fontSize: 12, color: RST, margin: '10px 0', lineHeight: 1.5 }}>{line}</div>;
                      }
                      return line ? <div key={i} style={{ fontSize: 13 }}>{line}</div> : <br key={i} />;
                    })}
                    {synthTyping && <span style={{ display: 'inline-block', width: 2, height: 13, background: PUR, marginLeft: 1, verticalAlign: 'text-bottom', animation: 'blink .9s infinite' }}>|</span>}
                  </>
                ) : (
                  <span style={{ color: T3, fontStyle: 'italic' }}>No synthesis yet. Click Generate to create an AI intelligence report for this property.</span>
                )}
              </div>
              {synth && !synthTyping && (
                <div style={{ padding: '7px 12px 7px 16px', borderTop: '1px solid rgba(88,56,160,.1)', background: 'rgba(88,56,160,.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: T3, fontFamily: "'DM Mono', monospace" }}>Generated {new Date().toLocaleDateString()}</span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: `1px solid rgba(88,56,160,.2)`, color: PUR, background: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif" }}>Create Lead →</button>
                    <button onClick={() => navigator.clipboard?.writeText(synth)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: `1px solid rgba(88,56,160,.2)`, color: PUR, background: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif" }}>Copy</button>
                  </div>
                </div>
              )}
            </div>

            {/* BS FACTOR PANEL — expandable */}
            {showBsPanel && bScore != null && (
              <CrdH h={<>Building Score Breakdown <SA c="b">§01</SA></>} act={<span onClick={() => setShowBsPanel(false)}>✕ Close</span>}
                right={<><span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: BLU }}>{bScore}</span><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: BLU, marginLeft: 4 }}>{bGrade}</span></>}>
                {bsFactors.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: T3, width: 130, flexShrink: 0 }}>{f.l}</span>
                    <div style={{ flex: 1, height: 4, background: 'rgba(0,0,0,.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: f.c, width: f.max > 0 ? Math.round(f.v / f.max * 100) + '%' : '0%', transition: 'width 1.2s ease' }} />
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T3, width: 32, textAlign: 'right' }}>{f.v}/{f.max}</span>
                  </div>
                ))}
              </CrdH>
            )}

            {/* ORS TIER PANEL — expandable */}
            {showOrsPanel && (
              <CrdH h={<>Owner Readiness — Signal Breakdown <SA c="r">§02</SA></>} act={<span onClick={() => setShowOrsPanel(false)}>✕ Close</span>}>
                {[
                  { n: 'Tier 1 — Lease & Hold', pts: orsSignals.filter(s => s.name.includes('Lease') || s.name.includes('Hold')).reduce((a, s) => a + s.pts, 0), max: 55, c: RST, items: orsSignals.filter(s => s.name.includes('Lease') || s.name.includes('Hold')) },
                  { n: 'Tier 2 — WARN & Contact', pts: orsSignals.filter(s => s.name.includes('WARN')).reduce((a, s) => a + s.pts, 0), max: 35, c: AMB, items: orsSignals.filter(s => s.name.includes('WARN')) },
                ].map((tier, i) => (
                  <div key={i} style={{ borderBottom: `1px solid ${BDR}` }}>
                    <div onClick={() => setExpandedTier(expandedTier === i ? null : i)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', cursor: 'pointer' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tier.c, flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 12, fontWeight: 700, color: '#fff' }}>{tier.pts}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T1 }}>{tier.n}</div>
                        <div style={{ height: 2, background: 'rgba(0,0,0,.06)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: tier.c, width: tier.max > 0 ? Math.round(tier.pts / tier.max * 100) + '%' : '0%' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 14, color: T3, transition: 'transform .2s', transform: expandedTier === i ? 'rotate(90deg)' : 'none' }}>›</span>
                    </div>
                    {expandedTier === i && (
                      <div style={{ padding: '0 12px 10px 52px' }}>
                        {tier.items.map((it, j) => (
                          <div key={j} style={{ fontSize: 12, color: T2, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: tier.c, display: 'inline-block', flexShrink: 0 }} />
                            {it.name} (+{it.pts})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CrdH>
            )}

            {/* TENANT / LEASE + OPPORTUNITY SIGNAL — 2-col grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Tenant / Lease */}
              <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: CHDR, padding: '8px 13px', borderBottom: `1px solid ${BDR}` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T2 }}>Tenant / Lease</span>
                </div>
                <div style={{ padding: '11px 13px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T1, marginBottom: 2 }}>{p.tenant || p.owner || '—'}</div>
                  <div style={{ fontSize: 11, color: T3, marginBottom: 8 }}>{p.owner_type || '—'} · {p.prop_type || 'Industrial'}</div>
                  {p.lease_expiration && (
                    <>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: RST, lineHeight: 1, marginTop: 3 }}>{fmtDShort(p.lease_expiration)}</div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, fontStyle: 'italic', color: RST, marginTop: 1 }}>
                        {leaseMonths != null ? leaseMonths + ' months remaining' : ''}
                      </div>
                    </>
                  )}
                </div>
                {(p.in_place_rent || p.market_rent_low) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${BDR}` }}>
                    <div style={{ padding: '9px 12px', borderRight: `1px solid ${BDR}` }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T3, marginBottom: 3 }}>In-Place Rent</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: RST }}>{p.in_place_rent ? '$' + Number(p.in_place_rent).toFixed(2) + '/SF NNN' : '—'}</div>
                    </div>
                    <div style={{ padding: '9px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T3, marginBottom: 3 }}>Market Rent</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: GRN }}>{p.market_rent_low ? '$' + Number(p.market_rent_low).toFixed(2) + (p.market_rent_high ? '–' + Number(p.market_rent_high).toFixed(2) : '') + ' NNN' : '—'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Opportunity Signal */}
              <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: CHDR, padding: '8px 13px', borderBottom: `1px solid ${BDR}` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T2 }}>Opportunity Signal</span>
                </div>
                <div style={{ padding: '11px 13px' }}>
                  {warn && (
                    <div style={{ background: RBG, border: `1px solid ${RBDR}`, borderRadius: 5, padding: 9, marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: RST, marginBottom: 4 }}>WARN Act Match — High Urgency</div>
                      <div style={{ fontSize: 12, color: T2, lineHeight: 1.5 }}>{warn.company} filed notice — {warn.employees ? Number(warn.employees).toLocaleString() + ' workers affected' : 'headcount pending'}. Priority outreach recommended.</div>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: T2, lineHeight: 1.55 }}>
                    {p.in_place_rent && p.market_rent_low && (
                      <>Basis dislocation: in-place ${Number(p.in_place_rent).toFixed(2)} vs market ${Number(p.market_rent_low).toFixed(2)}–{Number(p.market_rent_high || p.market_rent_low).toFixed(2)} NNN. </>
                    )}
                    {holdYears && holdYears > 10 && (
                      <>Long hold — {p.owner} acquired {new Date(p.last_transfer_date).getFullYear()} ({holdYears} years). <strong style={{ color: GRN }}>SLB structure likely.</strong></>
                    )}
                    {!warn && !p.in_place_rent && <span style={{ color: T3, fontStyle: 'italic' }}>Insufficient data to compute opportunity signals.</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* WARN Notice (if present) */}
            {warn && (
              <Crd style={{ borderLeft: `3px solid ${RST}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: RST, marginBottom: 8 }}>⚡ Linked WARN Filing</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T1, marginBottom: 4 }}>{warn.company}</div>
                <div style={{ fontSize: 13, color: T3 }}>{warn.employees ? Number(warn.employees).toLocaleString() + ' workers affected' : ''}{warn.notice_date ? ' · Filed ' + fmtD(warn.notice_date) : ''}</div>
                <Link href={'/warn-intel/' + warn.id} style={{ fontSize: 13, color: BLU, textDecoration: 'none', fontWeight: 500, display: 'inline-block', marginTop: 6 }}>View WARN Filing →</Link>
              </Crd>
            )}

            {/* Notes */}
            {p.notes && (
              <CrdH h="Notes"><p style={{ fontSize: 14, color: T2, lineHeight: 1.65 }}>{p.notes}</p></CrdH>
            )}

            {/* BUILDING SPECIFICATIONS — full 2-col grid */}
            <CrdH h="Building Specifications">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <DR k="Property SF" v={p.building_sf ? Number(p.building_sf).toLocaleString() : '—'} mono />
                <DR k="Land Acres" v={p.land_acres ? Number(p.land_acres).toFixed(2) : '—'} mono />
                <DR k="Year Built" v={p.year_built || '—'} mono />
                <DR k="Clear Height" v={p.clear_height ? p.clear_height + "'" : '—'} mono />
                <DR k="Dock Doors" v={p.dock_doors || '—'} mono />
                <DR k="Grade Doors" v={p.grade_doors || '—'} mono />
                <DR k="Truck Court" v={p.truck_court ? p.truck_court + "'" : '—'} mono />
                <DR k="Office %" v={p.office_pct != null ? p.office_pct + '%' : '—'} mono />
                <DR k="Power" v={p.power || '—'} />
                <DR k="Sprinklers" v={p.sprinklers || '—'} />
                <DR k="Zoning" v={p.zoning || '—'} mono />
                <DR k="Construction" v={p.construction_type || '—'} />
                <DR k="Parking Ratio" v={p.parking_ratio || '—'} mono />
                <DR k="Column Spacing" v={p.column_spacing || '—'} mono />
                <DR k="Property Type" v={p.prop_type || '—'} />
                <DR k="Building Class" v={p.building_class || '—'} />
              </div>
            </CrdH>

            {/* OWNERSHIP & TRANSACTION */}
            <CrdH h="Ownership & Transaction History">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <DR k="Owner" v={p.owner || '—'} />
                <DR k="Owner Type" v={p.owner_type || '—'} />
                <DR k="Last Transfer" v={p.last_transfer_date ? fmtD(p.last_transfer_date) : '—'} mono />
                <DR k="APN" v={p.apn || '—'} mono />
                <DR k="In-Place Rent" v={p.in_place_rent ? '$' + Number(p.in_place_rent).toFixed(2) + '/SF' : '—'} mono />
                <DR k="Lease Expiration" v={p.lease_expiration ? fmtD(p.lease_expiration) : '—'} mono />
                <DR k="Tenant" v={p.tenant || '—'} />
                <DR k="Vacancy Status" v={p.vacancy_status || '—'} />
              </div>
            </CrdH>

            {/* ACTIVITY TIMELINE */}
            <CrdH h="Activity Timeline" act="+ Log activity">
              {acts.length === 0 ? <Empty>No activity logged yet.</Empty>
              : acts.map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 9, padding: '9px 0', borderBottom: `1px solid ${BDR2}` }}>
                  <TlIcon type={a.activity_type} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T1 }}>{a.subject || a.activity_type}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T3, marginTop: 2 }}>{fmtD(a.activity_date || a.created_at)}</div>
                  </div>
                </div>
              ))}
            </CrdH>
          </div>

          {/* ── SIDEBAR ── */}
          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* ORS RING + SIGNAL BARS */}
            <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: CHDR, padding: '8px 13px', borderBottom: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T2 }}>Owner Readiness <SA c="r">§02</SA></span>
              </div>
              <div style={{ padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <OrsRing score={orsScore} onClick={() => setShowOrsPanel(!showOrsPanel)} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: orsScore >= 70 ? RST : orsScore >= 40 ? AMB : T3, marginBottom: 2 }}>{orsTier}</div>
                    <div style={{ fontSize: 11, color: T3, lineHeight: 1.4 }}>
                      {orsSignals.filter(s => s.pts > 0).map(s => s.name).join(' · ') || 'Insufficient data'}
                    </div>
                  </div>
                </div>
                {orsSignals.filter(s => s.pts > 0).map((sig, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: T2 }}>{sig.name}</span>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500, color: sig.c }}>+{sig.pts}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(0,0,0,.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: sig.c, width: sig.max > 0 ? Math.round(sig.pts / sig.max * 100) + '%' : '0%', transition: 'width 1.2s ease' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 9, paddingTop: 7, borderTop: `1px solid ${BDR}`, fontSize: 11, color: T3 }}>Tap ring to expand tier breakdown</div>
              </div>
            </div>

            {/* TRANSACTION SIGNALS — P(Transact) + Motivation */}
            <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: CHDR, padding: '8px 13px', borderBottom: `1px solid ${BDR}` }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T2 }}>Transaction Signals</span>
              </div>
              <div style={{ padding: '11px 13px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: 9, background: BBG, borderRadius: 6, border: `1px solid ${BBDR}` }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: T3, marginBottom: 3 }}>P(Transact) <SA c="b">§03</SA></div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 21, fontWeight: 500, color: BLU }}>—</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: 9, background: RBG, borderRadius: 6, border: `1px solid ${RBDR}` }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: T3, marginBottom: 3 }}>Motivation <SA c="r">§04</SA></div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: RST }}>{warn ? 'HIGH' : holdYears > 10 ? 'MED' : '—'}</div>
                  </div>
                </div>
                {warn && <SigRow label="WARN Act filing" pts="+10" c={RST} />}
                {leaseMonths != null && leaseMonths <= 12 && <SigRow label={`Lease expiry <12 months`} pts="+10" c={RST} />}
                {holdYears && holdYears > 10 && <SigRow label={`Long hold period ${holdYears} yr`} pts="+6" c={AMB} />}
                {p.owner_type && <SigRow label={`${p.owner_type}`} pts="+5" c={AMB} last />}
              </div>
            </div>

            {/* ACTIVE CATALYSTS */}
            {tags.length > 0 && (
              <CrdH h={<>Active Catalysts <SA c="b">§06</SA></>} act="+ Add">
                {tags.map((tag, i) => {
                  const cat = typeof tag === 'object' ? tag.category : 'asset';
                  const lbl = typeof tag === 'object' ? tag.tag : tag;
                  const dt = typeof tag === 'object' ? tag.date : null;
                  const catColor = cat === 'owner' ? RST : cat === 'occupancy' ? AMB : cat === 'financial' ? BLU : cat === 'market' ? TEA : BLU;
                  const catBg = cat === 'owner' ? RBG : cat === 'occupancy' ? ABG : cat === 'financial' ? BBG : cat === 'market' ? 'rgba(26,107,107,.1)' : BBG;
                  const catBdr2 = cat === 'owner' ? RBDR : cat === 'occupancy' ? ABDR : cat === 'financial' ? BBDR : cat === 'market' ? 'rgba(26,107,107,.2)' : BBDR;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 0', borderBottom: i < tags.length - 1 ? `1px solid ${BDR}` : 'none' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap', background: catBg, color: catColor, border: `1px solid ${catBdr2}` }}>{lbl}</span>
                      {dt && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T3, marginLeft: 'auto' }}>{dt}</span>}
                    </div>
                  );
                })}
              </CrdH>
            )}

            {/* OPPORTUNITY MEMO — editable */}
            <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: CHDR, padding: '8px 13px', borderBottom: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T2 }}>Opportunity Memo</span>
                <span onClick={saveMemo} style={{ fontSize: 11, color: BLU, cursor: 'pointer', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
                  {memoSaving ? 'Saving…' : 'Save'}
                </span>
              </div>
              <div style={{ padding: '8px 13px' }}>
                <textarea
                  value={memoText}
                  onChange={e => setMemoText(e.target.value)}
                  placeholder="Add notes on the opportunity thesis, strategy, key contacts, or next steps…"
                  style={{
                    width: '100%', minHeight: 80, border: 'none', background: 'transparent', resize: 'vertical',
                    fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, color: T2, lineHeight: 1.55,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* PROPERTY DETAILS sidebar */}
            <CrdH h="Property Details" act="Edit">
              <DR k="Owner" v={p.owner || '—'} />
              <DR k="Owner Type" v={p.owner_type || '—'} />
              <DR k="Last Transfer" v={p.last_transfer_date ? fmtD(p.last_transfer_date) : '—'} mono />
              <DR k="Submarket" v={[p.market, p.submarket].filter(Boolean).join(' · ') || '—'} />
              <DR k="Zoning" v={p.zoning || '—'} />
              <DR k="% Leased" v={p.vacancy_status || '—'} />
            </CrdH>
          </div>
        </div>
      )}

      {/* ════════════ TAB: BUILDINGS ════════════ */}
      {tab === 'buildings' && (
        <div style={{ padding: '16px 20px' }}>
          <CrdH h={'Building — ' + p.address}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
              <StatBox l="Building SF" v={p.building_sf ? Number(p.building_sf).toLocaleString() : '—'} />
              <StatBox l="Land AC" v={p.land_acres || '—'} />
              <StatBox l="Year Built" v={p.year_built || '—'} />
              <StatBox l="Coverage" v={coverage ? coverage + '%' : '—'} />
            </div>
            {bScore != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'rgba(0,0,0,.02)', borderRadius: 6, border: `1px solid ${BDR}` }}>
                <ScoreRing score={bScore} color={scoreColor} size={40} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T1 }}>Building Score: {bScore} / {bGrade}</div>
                  <div style={{ fontSize: 11, color: T3 }}>{[p.clear_height && p.clear_height + "' clear", p.dock_doors && p.dock_doors + ' DH', p.truck_court && p.truck_court + "' TC", p.power, p.sprinklers].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            )}
          </CrdH>
        </div>
      )}

      {/* ════════════ TAB: APNs ════════════ */}
      {tab === 'apns' && (
        <div style={{ padding: '16px 20px' }}>
          <CrdH h="Parcel Numbers">
            {apns.length === 0 && p.apn ? (
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: T1 }}>{p.apn}</div>
                <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>Primary APN</div>
              </div>
            ) : apns.length === 0 ? (
              <Empty>No APNs linked.</Empty>
            ) : apns.map(a => (
              <div key={a.id} style={{ padding: '8px 0', borderBottom: `1px solid ${BDR2}` }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: T1 }}>{a.apn}</div>
                {a.land_acres && <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>{a.land_acres} ac</div>}
              </div>
            ))}
          </CrdH>
        </div>
      )}

      {/* ════════════ TAB: LEASE COMPS ════════════ */}
      {tab === 'lease' && (
        <div style={{ padding: '16px 20px' }}>
          <CrdH h={'Lease Comps · ' + (p.market || '—')}>
            {leaseComps.length === 0 ? <Empty>No lease comps in this market.</Empty>
            : leaseComps.map(c => (
              <CompRow key={c.id} addr={c.address || c.property_name}
                line={[c.building_sf && Number(c.building_sf).toLocaleString() + ' SF', c.lease_type, c.term_months && c.term_months + 'mo', c.commencement_date && fmtD(c.commencement_date)].filter(Boolean).join(' · ')}
                value={c.effective_rent ? '$' + Number(c.effective_rent).toFixed(2) + '/SF' : null}
              />
            ))}
          </CrdH>
        </div>
      )}

      {/* ════════════ TAB: SALE COMPS ════════════ */}
      {tab === 'sale' && (
        <div style={{ padding: '16px 20px' }}>
          <CrdH h={'Sale Comps · ' + (p.market || '—')}>
            {saleComps.length === 0 ? <Empty>No sale comps in this market.</Empty>
            : saleComps.map(c => (
              <CompRow key={c.id} addr={c.address || c.property_name}
                line={[c.building_sf && Number(c.building_sf).toLocaleString() + ' SF', c.sale_date && fmtD(c.sale_date)].filter(Boolean).join(' · ')}
                value={c.price_per_sf ? '$' + Math.round(c.price_per_sf) + '/SF' : c.sale_price ? '$' + (Number(c.sale_price) / 1e6).toFixed(1) + 'M' : null}
              />
            ))}
          </CrdH>
        </div>
      )}

      {/* ════════════ TAB: CONTACTS ════════════ */}
      {tab === 'contacts' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.length === 0 ? <CrdH h="Contacts"><Empty>No contacts linked.</Empty></CrdH>
          : contacts.map(c => (
            <div key={c.id} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 7, padding: 11, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: BLU, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{(c.name || '?').slice(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T1 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: T3 }}>{c.title}{c.company ? ' · ' + c.company : ''}</div>
              </div>
              {c.phone && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: BLU }}>{c.phone}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ════════════ TAB: DEALS ════════════ */}
      {tab === 'deals' && (
        <div style={{ padding: '16px 20px' }}>
          <CrdH h="Linked Deals" act="+ Create Deal">
            {deals.length === 0 ? <Empty>No deals linked.</Empty>
            : deals.map(d => (
              <Link key={d.id} href={'/deals/' + d.id} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: BBG, borderRadius: 6, border: `1px solid rgba(78,110,150,.15)`, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T1 }}>{d.deal_name || d.company || '—'}</div>
                  <div style={{ fontSize: 11, color: T3, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{d.stage || '—'}{d.deal_value ? ' · $' + (Number(d.deal_value) / 1e6).toFixed(1) + 'M' : ''}</div>
                </div>
                <span style={{ fontSize: 11, color: BLU, fontWeight: 500 }}>Open →</span>
              </Link>
            ))}
          </CrdH>
        </div>
      )}

      {/* ════════════ TAB: LEADS ════════════ */}
      {tab === 'leads' && (
        <div style={{ padding: '16px 20px' }}>
          <CrdH h="Linked Leads" act="+ Create Lead">
            {leads.length === 0 ? <Empty>No leads linked.</Empty>
            : leads.map(l => (
              <Link key={l.id} href={'/leads/' + l.id} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: RBG, borderRadius: 6, border: `1px solid rgba(184,55,20,.15)`, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T1 }}>{l.lead_name || l.company || '—'}</div>
                  <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>{l.stage || '—'}{l.score ? ' · ORS ' + l.score : ''}</div>
                </div>
                {l.score && <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: RST }}>{l.score}</div>}
              </Link>
            ))}
          </CrdH>
        </div>
      )}

      {/* ════════════ TAB: FILES ════════════ */}
      {tab === 'files' && (
        <div style={{ padding: '16px 20px' }}>
          <CrdH h="Attachments" act="+ Upload">
            {files.length === 0 ? <Empty>No files attached.</Empty>
            : files.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 9, background: 'rgba(0,0,0,0.02)', borderRadius: 5, border: `1px solid ${BDR}`, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, background: BBG, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: BLU }}>
                  {(f.file_name || '').split('.').pop()?.toUpperCase()?.slice(0, 3) || 'FILE'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: T1 }}>{f.file_name || f.name || 'File'}</div>
                  <div style={{ fontSize: 10, color: T3 }}>{fmtD(f.created_at)}</div>
                </div>
                <span style={{ fontSize: 11, color: BLU, cursor: 'pointer' }}>Download</span>
              </div>
            ))}
          </CrdH>
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════ */

function Stat({ l, v, s, vc, mono, last }) {
  return (
    <div style={{ flex: 1, padding: '11px 13px', borderRight: last ? 'none' : `1px solid ${BDR}` }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T3, marginBottom: 3 }}>{l}</div>
      <div style={{
        fontFamily: mono ? "'DM Mono', monospace" : "'Playfair Display', serif",
        fontSize: mono ? 16 : 24,
        fontWeight: 700, color: vc || T1, lineHeight: 1,
      }}>{v}</div>
      {s && <div style={{ fontSize: 10, color: T3, marginTop: 2 }}>{s}</div>}
    </div>
  );
}

function SpecIt({ l, v, blue }) {
  return (
    <div style={{ flex: 1, padding: '0 10px', borderLeft: `1px solid ${BDR}`, textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: T3, marginBottom: 2 }}>{l}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: blue ? BLU : T1 }}>{v}</div>
    </div>
  );
}

function ScoreRing({ score, color, size = 48, onClick }) {
  if (score == null) return null;
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C+' : 'C';
  return (
    <div onClick={onClick} style={{ width: size, height: size, position: 'relative', cursor: onClick ? 'pointer' : 'default', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: size * 0.33, fontWeight: 500, color: NVY, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.17, fontWeight: 600, color }}>{grade}</span>
      </div>
    </div>
  );
}

function HeroRing({ value, color, grade }) {
  const size = 56, r = 22, circ = 2 * Math.PI * r;
  const filled = (value / 100) * circ;
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="4" />
        <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 500, color: '#fff', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 8, fontWeight: 600, color, marginTop: 1 }}>{grade}</div>
      </div>
    </div>
  );
}

function OrsRing({ score, onClick }) {
  const size = 62, r = 25, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <div onClick={onClick} style={{ width: size, height: size, position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={31} cy={31} r={r} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth="5" />
        <circle cx={31} cy={31} r={r} fill="none" stroke={RST} strokeWidth="5" strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, fontWeight: 700, color: RST, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 8, color: T3, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 1 }}>/ 100</div>
      </div>
    </div>
  );
}

function HBadge({ children, color }) {
  const colors = {
    amber: { bg: 'rgba(140,90,4,.45)', fg: '#f2c94c', bdr: 'rgba(140,90,4,.5)' },
    blue: { bg: 'rgba(78,110,150,.45)', fg: STL, bdr: 'rgba(78,110,150,.5)' },
    rust: { bg: 'rgba(184,55,20,.45)', fg: '#f4a080', bdr: 'rgba(184,55,20,.5)' },
    green: { bg: 'rgba(21,102,54,.45)', fg: '#6fcf97', bdr: 'rgba(21,102,54,.5)' },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 4, backdropFilter: 'blur(4px)', background: c.bg, color: c.fg, border: `1px solid ${c.bdr}` }}>
      {children}
    </span>
  );
}

function MktStat({ lbl, val, cls }) {
  const valColor = cls === 'up' ? '#6fcf97' : cls === 'dn' ? '#f4a080' : 'rgba(255,255,255,.7)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', borderRight: '1px solid rgba(255,255,255,.05)' }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,.32)', letterSpacing: '.05em', textTransform: 'uppercase' }}>{lbl}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: valColor, fontWeight: 500 }}>{val}</span>
    </div>
  );
}

function SA({ children, c }) {
  const map = { b: { bg: BBG, fg: BLU }, r: { bg: RBG, fg: RST }, g: { bg: GBG, fg: GRN }, p: { bg: PBG, fg: PUR } };
  const s = map[c] || map.b;
  return <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 9, verticalAlign: 'middle', marginLeft: 3, background: s.bg, color: s.fg }}>{children}</span>;
}

function SigRow({ label, pts, c, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: last ? 'none' : `1px solid ${BDR}`, fontSize: 12 }}>
      <span style={{ color: T2 }}>{label}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: c }}>{pts}</span>
    </div>
  );
}

function Crd({ children, style }) {
  return <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden', padding: '14px 16px', ...style }}>{children}</div>;
}

function CrdH({ h, act, right, children }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>
      {h && (
        <div style={{ background: CHDR, padding: '8px 13px', borderBottom: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T2 }}>{h}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {right}
            {act && <span style={{ fontSize: 11, color: BLU, cursor: 'pointer', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{act}</span>}
          </div>
        </div>
      )}
      <div style={{ padding: '11px 13px' }}>{children}</div>
    </div>
  );
}

function DR({ k, v, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: `1px solid ${BDR}`, fontSize: 13 }}>
      <span style={{ color: T3 }}>{k}</span>
      <span style={{ color: T1, fontWeight: 500, textAlign: 'right', fontFamily: mono ? "'DM Mono', monospace" : undefined, fontSize: mono ? 11 : undefined }}>{v}</span>
    </div>
  );
}

function CompRow({ addr, line, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${BDR2}` }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T1 }}>{addr || '—'}</div>
        <div style={{ fontSize: 10, color: T3, marginTop: 1 }}>{line}</div>
      </div>
      {value && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: T1, flexShrink: 0 }}>{value}</span>}
    </div>
  );
}

function TlIcon({ type }) {
  const styles = {
    call: { bg: BBG, color: BLU, icon: '☏' },
    email: { bg: PBG, color: PUR, icon: '✉' },
    note: { bg: ABG, color: AMB, icon: '✎' },
    stage_change: { bg: GBG, color: GRN, icon: '↑' },
    meeting: { bg: GBG, color: GRN, icon: '◆' },
    warn: { bg: RBG, color: RST, icon: '⚠' },
  };
  const s = styles[type] || styles.note;
  return <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, background: s.bg, color: s.color }}>{s.icon}</div>;
}

function ABtn({ children, onClick }) {
  return <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', fontSize: 12, color: T2, border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif", whiteSpace: 'nowrap' }}>{children}</button>;
}

function ASep() {
  return <div style={{ width: 1, height: 16, background: BDR, margin: '0 4px' }} />;
}

function TabCt({ children }) {
  return <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, background: 'rgba(0,0,0,0.06)', borderRadius: 7, padding: '1px 4px', marginLeft: 3 }}>{children}</span>;
}

function StatBox({ l, v }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 6, padding: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.06em', color: T3, marginBottom: 2 }}>{l}</div>
      <div style={{ fontSize: 18, fontWeight: 500 }}>{v}</div>
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 20, textAlign: 'center', color: T3, fontSize: 14 }}>{children}</div>;
}

function fmtD(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
