'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ──────────────────────────────────────────────
   INVESTOR MODE — Property Detail
   components/PropertyDetail.jsx
   Matches: property-detail-investor.html mockup
   Layout: hero → action bar (3 score chips) → AI synth → stat row → bldg score →
           tabs → 2-col (timeline LEFT, ORS + catalysts + signal + memo RIGHT) →
           owner + tenant full-width
   ────────────────────────────────────────────── */

const fmt = (n) => n == null ? '—' : Number(n).toLocaleString();
const fmtCurrency = (n) => {
  if (n == null) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${fmt(n)}`;
};
const getGrade = (s) => {
  if (s == null) return '—';
  if (s >= 85) return 'A+'; if (s >= 70) return 'A'; if (s >= 55) return 'B+';
  if (s >= 40) return 'B'; return 'C';
};
const monthsUntil = (d) => d ? Math.round((new Date(d) - new Date()) / (1000*60*60*24*30.44)) : null;
const fmtExpiry = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
const fmtTimestamp = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

// Tag colors
const getTagStyle = (tag) => {
  if (!tag) return { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', text: 'var(--blue)' };
  const t = tag.toLowerCase();
  if (t.includes('warn') || t.includes('nod') || t.includes('owner')) return { bg: 'var(--rust-bg)', bdr: 'var(--rust-bdr)', text: 'var(--rust)' };
  if (t.includes('lease') || t.includes('vacant') || t.includes('value')) return { bg: 'var(--amber-bg)', bdr: 'var(--amber-bdr)', text: 'var(--amber)' };
  if (t.includes('slb') || t.includes('market') || t.includes('land') || t.includes('occupied')) return { bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', text: 'var(--green)' };
  if (t.includes('capex') || t.includes('roof')) return { bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', text: 'var(--purple)' };
  return { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', text: 'var(--blue)' };
};

export default function PropertyDetail() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id;
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Timeline');
  const [specsOpen, setSpecsOpen] = useState(false);
  const [synthOpen, setSynthOpen] = useState(true);
  const [activities, setActivities] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [apns, setApns] = useState([]);
  const [leaseComps, setLeaseComps] = useState([]);
  const [saleComps, setSaleComps] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [files, setFiles] = useState([]);
  const [aiGen, setAiGen] = useState(null);
  const [oppMemo, setOppMemo] = useState(null);
  const [oppMemoText, setOppMemoText] = useState('');
  const [oppMemoEditing, setOppMemoEditing] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState('call');
  const [logNote, setLogNote] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFields, setEditFields] = useState({});

  useEffect(() => { if (propertyId) fetchAll(); }, [propertyId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: prop } = await supabase.from('properties').select('*').eq('id', propertyId).single();
      setP(prop); setEditFields(prop);

      const [acts, bldgs, apnD, lc, sc, ct, dl, fl, aiD, memoD] = await Promise.all([
        supabase.from('activities').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(20),
        supabase.from('property_buildings').select('*').eq('property_id', propertyId),
        supabase.from('property_apns').select('*').eq('property_id', propertyId),
        supabase.from('lease_comps').select('*').eq('property_id', propertyId).order('commencement_date', { ascending: false }),
        supabase.from('sale_comps').select('*').eq('property_id', propertyId).order('sale_date', { ascending: false }),
        supabase.from('deal_contacts').select('*').eq('property_id', propertyId),
        supabase.from('deals').select('*').eq('property_id', propertyId),
        supabase.from('file_attachments').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }),
        supabase.from('ai_generations').select('*').eq('property_id', propertyId).eq('generation_type', 'synthesis').order('created_at', { ascending: false }).limit(1),
        supabase.from('ai_generations').select('*').eq('property_id', propertyId).eq('generation_type', 'opportunity_memo').order('created_at', { ascending: false }).limit(1),
      ]);
      setActivities(acts.data || []);
      setBuildings(bldgs.data || []);
      setApns(apnD.data || []);
      setLeaseComps(lc.data || []);
      setSaleComps(sc.data || []);
      setContacts(ct.data || []);
      setDeals(dl.data || []);
      setFiles(fl.data || []);
      setAiGen(aiD.data?.[0] || null);
      if (memoD.data?.[0]) { setOppMemo(memoD.data[0]); setOppMemoText(memoD.data[0].content || ''); }
    } catch (err) { console.error('Error:', err); }
    finally { setLoading(false); }
  };

  // Leaflet map
  useEffect(() => {
    if (!p || !mapRef.current || mapInst.current) return;
    if (typeof window === 'undefined' || !window.L) return;
    const lat = p.latitude || 34.0887, lng = p.longitude || -117.9712;
    const m = window.L.map(mapRef.current, { zoomControl: false, scrollWheelZoom: false, dragging: false, doubleClickZoom: false, attributionControl: false }).setView([lat, lng], 16);
    window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20 }).addTo(m);
    window.L.marker([lat, lng], { icon: window.L.divIcon({ className: '', html: '<div style="width:14px;height:14px;border-radius:50%;background:#4E6E96;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }) }).addTo(m);
    mapInst.current = m;
    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, [p]);

  // ─── Handlers ──────────────────────────────
  const handleLogActivity = async () => {
    if (!logNote.trim()) return;
    try {
      await supabase.from('activities').insert([{ property_id: propertyId, activity_type: logType, notes: logNote, created_by: 'Briana Corso' }]);
      setLogNote(''); setShowLogModal(false);
      const { data } = await supabase.from('activities').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(20);
      setActivities(data || []);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleConvert = async () => {
    if (!confirm(`Convert "${p.property_name || p.address}" to Acquisition?\nCreates deal at Screening stage.`)) return;
    try {
      const { data } = await supabase.from('deals').insert([{
        property_id: propertyId, deal_name: `${p.property_name || p.address} — Acquisition`,
        stage: 'Screening', deal_type: 'acquisition', estimated_value: p.estimated_value,
      }]).select();
      await supabase.from('activities').insert([{ property_id: propertyId, activity_type: 'deal', notes: `Acquisition created — Screening stage`, created_by: 'Briana Corso' }]);
      router.push(`/deals/${data?.[0]?.id || ''}`);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleSaveEdit = async () => {
    try {
      await supabase.from('properties').update(editFields).eq('id', propertyId);
      setShowEditModal(false); fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleSaveOppMemo = async () => {
    try {
      if (oppMemo?.id) {
        await supabase.from('ai_generations').update({ content: oppMemoText, updated_at: new Date().toISOString() }).eq('id', oppMemo.id);
      } else {
        const { data } = await supabase.from('ai_generations').insert([{ property_id: propertyId, generation_type: 'opportunity_memo', content: oppMemoText }]).select();
        setOppMemo(data?.[0]);
      }
      setOppMemoEditing(false);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleExportMemo = () => {
    const content = aiGen?.content || oppMemoText || 'No memo available';
    const blob = new Blob([`IC MEMO — ${p?.property_name || p?.address}\nGenerated: ${new Date().toLocaleDateString()}\n\n${content}`], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${(p?.property_name || 'property').replace(/\s/g, '_')}_ic_memo.txt`; a.click();
  };

  const openGoogleMaps = () => window.open(`https://www.google.com/maps/search/${encodeURIComponent(`${p?.address || ''} ${p?.city || ''} ${p?.state || ''}`)}`, '_blank');
  const openCoStar = () => window.open('https://product.costar.com/', '_blank');
  const openCountyGIS = () => window.open('https://maps.assessor.lacounty.gov/', '_blank');

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Loading property…</div>;
  if (!p) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Property not found<br/><button onClick={() => router.push('/properties')} style={btnGhost}>← Back</button></div>;

  const score = p.ai_score, grade = getGrade(score);
  const pfs = p.portfolio_fit_score, pfsGrade = getGrade(pfs);
  const ors = p.ors_score;
  const leaseMonths = monthsUntil(p.lease_expiration);
  const occ = (p.occupancy_status || '').toLowerCase().includes('occupied') ? 'Occupied' : (p.occupancy_status || '').toLowerCase().includes('vacant') ? 'Vacant' : (p.occupancy_status || '').toLowerCase().includes('partial') ? 'Partial' : (p.occupancy_status || 'Unknown');
  const tabs = ['Timeline', 'Buildings', 'APNs', 'Lease Comps', 'Sale Comps', 'Contacts', 'Deals', 'Leads', 'Files'];
  const tabCounts = { Timeline: activities.length, Buildings: buildings.length, APNs: apns.length, 'Lease Comps': leaseComps.length, 'Sale Comps': saleComps.length, Contacts: contacts.length, Deals: deals.length };

  // ORS signals — use stored ors_signals JSON if available, otherwise derive from property fields
  const orsSignals = (() => {
    // If the record has stored ORS signal breakdown, use it directly
    if (p.ors_signals && Array.isArray(p.ors_signals)) {
      return p.ors_signals.map(s => ({
        label: s.label || s.signal || '—',
        pts: s.pts || s.points || 0,
        color: (s.pts || 0) >= 20 ? 'var(--rust)' : (s.pts || 0) >= 10 ? 'var(--amber)' : 'var(--ink4)',
      }));
    }
    // Fallback: derive from property fields using §02 breakpoints
    const signals = [];
    if (p.lease_expiration && leaseMonths != null) {
      const pts = leaseMonths < 12 ? 25 : leaseMonths <= 18 ? 20 : leaseMonths <= 24 ? 15 : 5;
      if (pts >= 10) signals.push({ label: `Lease expiry ${leaseMonths} months`, pts, color: pts >= 20 ? 'var(--rust)' : 'var(--amber)' });
    }
    if (p.last_transfer_date) {
      const holdYrs = new Date().getFullYear() - new Date(p.last_transfer_date).getFullYear();
      const pts = holdYrs >= 10 ? 20 : holdYrs >= 7 ? 15 : holdYrs >= 5 ? 10 : holdYrs >= 3 ? 5 : 0;
      if (pts > 0) signals.push({ label: `Hold period ${holdYrs} years`, pts, color: pts >= 15 ? 'var(--amber)' : 'var(--ink4)' });
    }
    if ((p.catalyst_tags || []).some(t => t.toLowerCase().includes('warn'))) {
      signals.push({ label: 'WARN Act match — active', pts: 20, color: 'var(--rust)' });
    }
    if ((p.catalyst_tags || []).some(t => t.toLowerCase().includes('slb'))) {
      signals.push({ label: 'SLB interest confirmed', pts: 15, color: 'var(--amber)' });
    }
    if (p.rent_dislocation || (p.in_place_rent && p.market_rent)) {
      const inPlace = parseFloat(String(p.in_place_rent).replace(/[^0-9.]/g, ''));
      const market = parseFloat(String(p.market_rent).replace(/[^0-9.]/g, ''));
      if (inPlace && market && ((market - inPlace) / inPlace) > 0.15) {
        signals.push({ label: 'Rent dislocation >15%', pts: 15, color: 'var(--amber)' });
      }
    }
    if (p.prior_listing_expired) signals.push({ label: 'Prior listing — expired/withdrawn', pts: 12, color: 'var(--amber)' });
    if (p.owner_age_signal) signals.push({ label: 'Owner age / estate signal', pts: 10, color: 'var(--amber)' });
    if (p.deferred_maintenance) signals.push({ label: 'Deferred maintenance flag', pts: 8, color: 'var(--ink4)' });
    signals.push({ label: 'Contact gap', pts: p.ors_contact || 3, color: 'var(--ink4)' });
    return signals;
  })();

  // Seller Motivation (§04) — HIGH/MODERATE/LOW from seller_motivation_score or ors_score
  const sellerMotivation = p.seller_motivation_score || p.ors_score || null;
  const sellerMotivationLabel = sellerMotivation >= 60 ? 'HIGH' : sellerMotivation >= 30 ? 'MOD' : sellerMotivation != null ? 'LOW' : '—';


  return (
    <>
      {/* ═══ HERO MAP ═══ */}
      <div style={{ height: 300, position: 'relative', overflow: 'hidden', marginLeft: -28, marginRight: -28, marginTop: -18 }}>
        <div ref={mapRef} style={{ width: '100%', height: 300, background: '#1a1e2a' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 400, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(10,8,5,0.82) 0%, rgba(10,8,5,0.15) 55%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, padding: '20px 28px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-0.01em', marginBottom: 8, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {p.property_name || p.address}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <HeroBadge c="green">● {occ}</HeroBadge>
            {p.lease_expiration && <HeroBadge c="amber">Lease Exp. {fmtExpiry(p.lease_expiration)}</HeroBadge>}
            <HeroBadge c="blue">{p.property_type || 'Industrial'} · {fmt(p.total_sf || p.building_sf)} SF</HeroBadge>
            {p.owner_type && <HeroBadge c="blue">{p.owner_type}</HeroBadge>}
          </div>
        </div>
      </div>

      {/* ═══ ACTION BAR — 3 score chips ═══ */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginLeft: -28, marginRight: -28 }}>
        <ScoreChip label="Bldg Score" grade={grade} value={score} color="var(--blue)" borderColor="var(--blue-bdr)" />
        <ScoreChip label="Portfolio Fit" grade={pfsGrade} value={pfs} color="#1A6B6B" borderColor="rgba(26,107,107,.3)" />
        <ScoreChip label="Seller Readiness" grade={sellerMotivationLabel} value={ors} color="var(--rust)" borderColor="var(--rust-bdr)" />
        <Divider />
        <button onClick={() => { setShowLogModal(true); setLogType('call'); }} style={btnGhost}>📞 Log Call</button>
        <button onClick={() => { setShowLogModal(true); setLogType('email'); }} style={btnGhost}>✉ Log Email</button>
        <button onClick={() => { setShowLogModal(true); setLogType('note'); }} style={btnGhost}>📝 Add Note</button>
        <button onClick={() => { setShowLogModal(true); setLogType('task'); }} style={btnGhost}>+ Task</button>
        <Divider />
        <button onClick={openGoogleMaps} style={btnLink}>📍 Google Maps</button>
        <button onClick={openCoStar} style={btnLink}>🗂 CoStar</button>
        <button onClick={openCountyGIS} style={btnLink}>🗺 LA County GIS</button>
        <Divider />
        <button onClick={() => setShowEditModal(true)} style={btnGhost}>⚙ Edit</button>
        <button onClick={handleExportMemo} style={btnGhost}>📄 Export IC Memo</button>
        <div style={{ marginLeft: 'auto' }} />
        <button onClick={handleConvert} style={{ ...btnGhost, background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }}>◈ Convert to Acquisition</button>
      </div>

      {/* ═══ INNER CONTENT ═══ */}
      <div style={{ padding: '18px 0 0' }}>

        {/* ─── AI Acquisition Intelligence ─── */}
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid rgba(88,56,160,0.18)', overflow: 'hidden', marginBottom: 16, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, #8B6FCC, var(--purple))' }} />
          <div onClick={() => setSynthOpen(!synthOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px 11px 20px', borderBottom: '1px solid rgba(88,56,160,0.12)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--purple)' }}>✦</span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--purple)' }}>AI Acquisition Intelligence</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12.5, fontStyle: 'italic', color: 'var(--ink4)' }}>Property Status Report · {p.property_name || p.address}</span>
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic', color: 'var(--purple)', cursor: 'pointer' }}>{synthOpen ? 'Hide ▴' : 'Show ▾'}</span>
          </div>
          {synthOpen && (
            <>
              <div style={{ padding: '18px 22px 20px' }}>
                {aiGen?.content ? (
                  <div style={{ fontSize: 13.5, lineHeight: 1.72, color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>{aiGen.content}</div>
                ) : (
                  <div style={{ fontSize: 13.5, lineHeight: 1.72, color: 'var(--ink4)', fontStyle: 'italic' }}>
                    No AI synthesis generated yet. Click Regenerate to create acquisition intelligence.
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 22px', borderTop: '1px solid rgba(88,56,160,0.10)', background: 'rgba(88,56,160,0.02)' }}>
                <button onClick={() => alert('AI regeneration triggered')} style={synthBtn}>↻ Regenerate</button>
                <button onClick={() => aiGen?.content && navigator.clipboard.writeText(aiGen.content)} style={synthBtn}>📋 Copy</button>
                {aiGen?.created_at && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--ink4)', marginLeft: 'auto' }}>Generated {fmtTimestamp(aiGen.created_at)}</span>}
              </div>
            </>
          )}
        </div>

        {/* ─── Stat Row ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden', marginBottom: 16 }}>
          <StatCell label="Building SF" value={fmt(p.total_sf || p.building_sf)} sub={buildings.length ? `${buildings.length} building${buildings.length > 1 ? 's' : ''}` : null} />
          <StatCell label="Land" value={p.land_area ? `${p.land_area} ac` : '—'} sub={apns.length ? `${apns.length} APNs` : null} />
          <StatCell label="In-Place Rent" value={p.in_place_rent ? `$${p.in_place_rent}/SF` : '—'} sub="NNN / mo" color="blue" sm />
          <StatCell label="Market Rent" value={p.market_rent ? `$${p.market_rent}` : '—'} sub="NNN est." color="green" sm />
          <StatCell label="Lease Expiry" value={fmtExpiry(p.lease_expiration)} sub={leaseMonths != null ? `${leaseMonths} months` : null} color={leaseMonths != null && leaseMonths <= 24 ? 'amber' : undefined} sm />
          <StatCell label="Est. Value" value={fmtCurrency(p.estimated_value)} sub={p.estimated_value && (p.total_sf || p.building_sf) ? `~$${Math.round(p.estimated_value / (p.total_sf || p.building_sf))}/SF` : null} />
          <StatCell label="Year Built" value={p.year_built || '—'} sub={p.zoning || null} last />
        </div>

        {/* ─── Building Score Card ─── */}
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden', marginBottom: 16 }}>
          <div onClick={() => setSpecsOpen(!specsOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', border: '2.5px solid rgba(78,110,150,0.32)', background: 'var(--blue-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{score ?? '—'}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--blue2)', marginTop: 1 }}>{grade}</div>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>Building Score — {grade} · {score >= 90 ? 'Top-tier distribution asset' : score >= 80 ? 'High-quality industrial asset' : score >= 70 ? 'Good functional quality' : 'Standard industrial'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>
                  {[p.clear_height && `${p.clear_height}' clear`, p.dock_doors && `${p.dock_doors} dock-high`, p.truck_court_depth && `${p.truck_court_depth}' truck court`, p.sprinkler_type, p.power_amps && `${fmt(p.power_amps)}A power`].filter(Boolean).join(' · ') || 'No specs available'}
                </div>
              </div>
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' }}>{specsOpen ? 'Hide specs ▴' : 'Show all specs ▾'}</span>
          </div>
          {/* Summary strip */}
          <div style={{ display: 'flex', borderBottom: specsOpen ? '1px solid var(--line)' : 'none' }}>
            {[
              { l: 'Clear Ht', v: p.clear_height ? `${p.clear_height}'` : '—', hi: (p.clear_height||0) >= 30 },
              { l: 'Dock Doors', v: p.dock_doors ? `${p.dock_doors} DH${p.grade_doors ? ` · ${p.grade_doors} GL` : ''}` : '—', hi: (p.dock_doors||0) >= 20 },
              { l: 'Truck Court', v: p.truck_court_depth ? `${p.truck_court_depth}'` : '—', hi: (p.truck_court_depth||0) >= 130 },
              { l: 'Office %', v: p.office_pct != null ? `${p.office_pct}%` : '—' },
              { l: 'Power', v: p.power_amps ? `${fmt(p.power_amps)}A/${p.power_voltage||''}V` : '—' },
              { l: 'Sprinklers', v: p.sprinkler_type || '—' },
              { l: 'DH Ratio', v: p.dh_ratio ? `${p.dh_ratio}/10kSF` : '—', hi: (p.dh_ratio||0) >= 1.0 },
              { l: 'Coverage', v: p.coverage_ratio ? `${p.coverage_ratio}%` : '—' },
            ].map((item, i) => (
              <div key={i} style={{ flex: 1, padding: '9px 12px', borderRight: i < 7 ? '1px solid var(--line2)' : 'none', textAlign: 'center' }}>
                <div style={{ fontSize: 9.5, color: 'var(--ink4)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>{item.l}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: item.hi ? 'var(--blue)' : 'var(--ink2)' }}>{item.v}</div>
              </div>
            ))}
          </div>
          {/* Expanded specs + score breakdown */}
          {specsOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '14px 18px', borderRight: '1px solid var(--line)' }}>
                <div style={secLabel}>Structure</div>
                {[['Building SF', fmt(p.total_sf || p.building_sf)], ['Land Area', p.land_area ? `${p.land_area} ac` : '—'], ['Year Built', p.year_built || '—'], ['Clear Height', p.clear_height ? `${p.clear_height}'` : '—'], ['Eave Height', p.eave_height ? `${p.eave_height}'` : '—'], ['Column Spacing', p.column_spacing || '—'], ['Bay Depth', p.bay_depth ? `${p.bay_depth}'` : '—']].map(([k, v], i) => <SpecRow key={i} k={k} v={v} />)}
                <div style={{ ...secLabel, marginTop: 12 }}>Loading</div>
                {[['Dock-High Doors', p.dock_doors || '—'], ['Grade-Level Doors', p.grade_doors || '—'], ['Truck Court Depth', p.truck_court_depth ? `${p.truck_court_depth}'` : '—'], ['Yard Depth', p.yard_depth ? `${p.yard_depth}'` : '—'], ['Trailer Spots', p.trailer_spots || '—'], ['Parking Spaces', p.parking_spaces || '—']].map(([k, v], i) => <SpecRow key={i} k={k} v={v} />)}
              </div>
              <div style={{ padding: '14px 18px' }}>
                <div style={secLabel}>Systems</div>
                {[['Power', p.power_amps ? `${fmt(p.power_amps)}A / ${p.power_voltage||''}V` : '—'], ['Sprinklers', p.sprinkler_type || '—'], ['Rail Served', p.rail_served ? 'Yes' : 'No'], ['Zoning', p.zoning || '—'], ['Office SF', p.office_sf ? `${fmt(p.office_sf)} (${p.office_pct||''}%)` : '—'], ['Warehouse SF', p.warehouse_sf ? fmt(p.warehouse_sf) : '—']].map(([k, v], i) => <SpecRow key={i} k={k} v={v} />)}
                <div style={{ ...secLabel, marginTop: 12 }}>Calculated</div>
                {[['DH Ratio', p.dh_ratio ? `${p.dh_ratio} / 10,000 SF` : '—'], ['Coverage Ratio', p.coverage_ratio ? `${p.coverage_ratio}%` : '—'], ['Land-to-Building', p.land_to_building ? `${p.land_to_building}×` : '—']].map(([k, v], i) => <SpecRow key={i} k={k} v={v} hi />)}
                <div style={{ ...secLabel, marginTop: 12 }}>Score Breakdown</div>
                {[
                  { l: `Clear Height (${p.clear_height||'—'}')`, v: p.bs_clear_height||0, max: 25 },
                  { l: `DH Ratio (${p.dh_ratio||'—'})`, v: p.bs_dh_ratio||0, max: 20 },
                  { l: `Truck Court (${p.truck_court_depth||'—'}')`, v: p.bs_truck_court||0, max: 20 },
                  { l: `Office % (${p.office_pct||'—'}%)`, v: p.bs_office||0, max: 15 },
                  { l: `Power (${p.power_amps ? fmt(p.power_amps)+'A' : '—'})`, v: p.bs_power||0, max: 10 },
                  { l: `Vintage (${p.year_built||'—'})`, v: p.bs_vintage||0, max: 10 },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink3)', width: 140, flexShrink: 0 }}>{f.l}</span>
                    <div style={{ flex: 1, height: 5, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${f.max > 0 ? f.v/f.max*100 : 0}%`, background: f.v/f.max >= 0.8 ? 'var(--green)' : f.v/f.max >= 0.5 ? 'var(--amber)' : 'var(--rust)' }} />
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--ink3)', width: 40, textAlign: 'right', flexShrink: 0 }}>{f.v}/{f.max}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 7, borderTop: '1px solid var(--line3)' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink4)' }}>Total</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>{score||0}/100</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Tabs ─── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 16 }}>
          {tabs.map(tab => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '10px 15px', fontSize: 13.5, cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--blue)' : 'transparent'}`,
              color: activeTab === tab ? 'var(--blue)' : 'var(--ink4)', fontWeight: activeTab === tab ? 500 : 400,
            }}>
              {tab}
              {tabCounts[tab] > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 20, padding: '1px 6px', marginLeft: 4, color: 'var(--ink4)' }}>{tabCounts[tab]}</span>}
            </div>
          ))}
        </div>

        {/* ─── 2-COL BODY: Timeline LEFT, Scores/Signals RIGHT ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* LEFT — Tab Content */}
          <div>
            {activeTab === 'Timeline' && (
              <Card hdr={<><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--rust)', display: 'inline-block', animation: 'blink 1.4s infinite' }} /> Activity Timeline</>} action="+ Log Activity" onAction={() => setShowLogModal(true)}>
                {activities.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>No activities yet.</div>
                ) : activities.map((a, i) => <ActRow key={a.id || i} a={a} />)}
                {activities.length > 0 && (
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13.5, fontStyle: 'italic', color: 'var(--blue2)' }}>View all {activities.length} activities & notes →</span>
                  </div>
                )}
              </Card>
            )}
            {activeTab === 'Buildings' && <DataTable headers={['Building', 'SF', 'Clear Ht', 'Docks', 'Power', 'Year']} rows={buildings.map(b => [b.building_name||'—', fmt(b.building_sf), b.clear_height?`${b.clear_height}'`:'—', b.dock_doors||'—', b.power_amps?`${fmt(b.power_amps)}A`:'—', b.year_built||'—'])} empty="No buildings." />}
            {activeTab === 'APNs' && <DataTable headers={['APN', 'Acreage', 'Owner', 'Last Transfer', 'Assessed']} rows={apns.map(a => [a.apn||'—', a.acreage?`${a.acreage} ac`:'—', a.owner_of_record||'—', a.last_transfer_date?fmtDate(a.last_transfer_date):'—', a.assessed_value?fmtCurrency(a.assessed_value):'—'])} empty="No APNs." />}
            {activeTab === 'Lease Comps' && <DataTable headers={['Address', 'Tenant', 'SF', 'Rate', 'Type', 'Date']} rows={leaseComps.map(l => [l.address||'—', l.tenant_name||'—', fmt(l.building_sf), l.rate?`$${l.rate}/SF`:'—', l.lease_type||'—', l.commencement_date?fmtDate(l.commencement_date):'—'])} empty="No lease comps." />}
            {activeTab === 'Sale Comps' && <DataTable headers={['Address', 'Buyer', 'SF', 'Price', '$/SF', 'Date', 'Broker']} rows={saleComps.map(s => [s.address||'—', s.buyer||'—', fmt(s.building_sf), fmtCurrency(s.sale_price), s.price_per_sf?`$${s.price_per_sf}`:'—', s.sale_date?fmtDate(s.sale_date):'—', s.broker||'—'])} empty="No sale comps." />}
            {activeTab === 'Contacts' && <DataTable headers={['Name', 'Company', 'Role', 'Phone', 'Email']} rows={contacts.map(c => [c.contact_name||'—', c.company||'—', c.role||'—', c.phone||'—', c.email||'—'])} empty="No contacts." />}
            {activeTab === 'Deals' && <DataTable headers={['Deal', 'Stage', 'Value', 'Type', 'Created']} rows={deals.map(d => [d.deal_name||'—', d.stage||'—', fmtCurrency(d.estimated_value||d.deal_value), d.deal_type||'—', d.created_at?fmtDate(d.created_at):'—'])} empty="No deals." onRow={i => deals[i]?.id && router.push(`/deals/${deals[i].id}`)} />}
            {activeTab === 'Leads' && <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink4)', fontSize: 13, background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)' }}>Leads tab — coming soon</div>}
            {activeTab === 'Files' && <DataTable headers={['Filename', 'Type', 'Size', 'Uploaded']} rows={files.map(f => [f.filename||f.file_name||'—', f.file_type||'—', f.file_size?`${Math.round(f.file_size/1024)} KB`:'—', f.created_at?fmtDate(f.created_at):'—'])} empty="No files." />}
          </div>

          {/* RIGHT — Scores + Signals + Catalysts + Memo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* ORS — Seller Readiness */}
            <Card hdr="Seller Readiness (ORS)" action="Expand tiers →">
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid var(--rust-bdr)', background: 'var(--rust-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: 'var(--rust)', lineHeight: 1 }}>{ors ?? '—'}</div>
                  <div style={{ fontSize: 8, color: 'var(--ink4)', marginTop: 1 }}>/ 100</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--rust)', marginBottom: 3 }}>{ors >= 70 ? 'ACT NOW' : ors >= 50 ? 'MONITOR' : 'LOW'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5 }}>
                    {orsSignals.map(s => s.label).join(' + ')}
                  </div>
                </div>
              </div>
              <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {orsSignals.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink3)', flex: 1 }}>{s.label}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: s.color, fontWeight: 600 }}>+{s.pts}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Portfolio Fit Score — 8 dimensions (§08) */}
            {pfs != null && (
              <Card hdr="Portfolio Fit Score" action={`${pfsGrade} · ${pfs}/100`}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--line)' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2.5px solid rgba(26,107,107,0.32)', background: 'rgba(26,107,107,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#1A6B6B', lineHeight: 1 }}>{pfs}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#1A6B6B', marginTop: 1 }}>{pfsGrade}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1A6B6B', marginBottom: 2 }}>{pfs >= 90 ? 'AUTO-CREATE' : pfs >= 70 ? 'STRONG FIT' : pfs >= 60 ? 'MODERATE FIT' : 'OUTSIDE CRITERIA'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.4 }}>
                      {pfs >= 90 ? 'Auto-creates acquisition record' : pfs >= 60 ? 'Matches fund criteria' : 'Below target thresholds'}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: 'Size / SF range', max: 25, val: p.pfs_size || null },
                    { label: 'Geography / submarket', max: 20, val: p.pfs_geography || null },
                    { label: 'Basis vs maximum', max: 15, val: p.pfs_basis || null },
                    { label: 'Strategy type match', max: 10, val: p.pfs_strategy || null },
                    { label: 'Clear height vs min', max: 10, val: p.pfs_clear_height || null },
                    { label: 'SLB corridor bonus', max: 10, val: p.pfs_slb_corridor || null },
                    { label: 'Power requirements', max: 5, val: p.pfs_power || null },
                    { label: 'Seller activity / ORS', max: 5, val: p.pfs_seller || null },
                  ].map((dim, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink3)', width: 140, flexShrink: 0 }}>{dim.label}</span>
                      <div style={{ flex: 1, height: 4, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                        {dim.val != null && <div style={{ height: '100%', borderRadius: 3, width: `${dim.max > 0 ? dim.val / dim.max * 100 : 0}%`, background: '#1A6B6B' }} />}
                      </div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: dim.val != null ? '#1A6B6B' : 'var(--ink4)', width: 36, textAlign: 'right', flexShrink: 0 }}>
                        {dim.val != null ? `${dim.val}/${dim.max}` : `—/${dim.max}`}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Catalysts */}
            <Card hdr="Active Catalysts" action="+ Add">
              {(p.catalyst_tags || []).length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>No active catalysts.</div>
              ) : (p.catalyst_tags || []).map((tag, i) => {
                const c = getTagStyle(tag);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', borderBottom: i < (p.catalyst_tags||[]).length - 1 ? '1px solid var(--line2)' : 'none', cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: c.bg, border: `1px solid ${c.bdr}`, color: c.text }}>{tag}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink3)', flex: 1 }}>—</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: 'var(--ink4)' }}>auto</span>
                  </div>
                );
              })}
            </Card>

            {/* AI Acquisition Signal */}
            <div style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: 'rgba(78,110,150,0.12)', borderBottom: '1px solid var(--blue-bdr)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 13 }}>✦</span>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)' }}>AI Acquisition Signal</span>
              </div>
              <div style={{ padding: '14px 16px', fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink2)' }}>
                {p.ai_property_signal || <span style={{ fontStyle: 'italic', color: 'var(--ink4)' }}>AI signal not yet generated.</span>}
              </div>
            </div>

            {/* Acquisition Opportunity Memo */}
            <div style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: 'rgba(78,110,150,0.12)', borderBottom: '1px solid var(--blue-bdr)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)' }}>Acquisition Opportunity Memo</span>
                <button onClick={() => oppMemoEditing ? handleSaveOppMemo() : setOppMemoEditing(true)} style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', background: 'none', border: '1px solid var(--blue-bdr)', borderRadius: 6, padding: '3px 10px', fontFamily: "'Instrument Sans', sans-serif" }}>
                  {oppMemoEditing ? '✓ Save' : '✎ Edit'}
                </button>
              </div>
              <div style={{ padding: '14px 16px' }}>
                {oppMemoEditing ? (
                  <textarea value={oppMemoText} onChange={e => setOppMemoText(e.target.value)} placeholder="Write acquisition rationale, thesis, and strategy…"
                    style={{ width: '100%', minHeight: 100, padding: 12, border: '1px solid var(--blue-bdr)', borderRadius: 8, fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink2)', fontFamily: "'Instrument Sans', sans-serif", resize: 'vertical', background: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                ) : (
                  <div style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink2)' }}>
                    {oppMemoText || oppMemo?.content || <span style={{ fontStyle: 'italic', color: 'var(--ink4)' }}>No memo yet. Click Edit to write.</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Owner + Tenant (full-width 2-col below) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          {/* Owner */}
          <Card hdr="Owner" action="View Record →" onAction={() => p.owner_account_id && router.push(`/accounts/${p.owner_account_id}`)}>
            {[['Company', p.owner], ['Primary Contact', p.owner_contact], ['Owner Type', p.owner_type], ['Owner Since', p.last_transfer_date ? new Date(p.last_transfer_date).getFullYear() : '—'], ['Account', p.account_name], ['APN(s)', apns.map(a => a.apn).filter(Boolean).join(' · ')]].map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 16px', borderBottom: i < 5 ? '1px solid var(--line2)' : 'none' }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink4)' }}>{k}</span>
                <span style={{ fontSize: 13, color: k === 'Primary Contact' || k === 'Account' ? 'var(--blue)' : 'var(--ink2)', textAlign: 'right', maxWidth: 180, cursor: k === 'Primary Contact' || k === 'Account' ? 'pointer' : 'default', ...(k === 'APN(s)' || k === 'Owner Since' ? { fontFamily: "'DM Mono', monospace", fontSize: 12 } : {}) }}>{v || '—'}</span>
              </div>
            ))}
          </Card>

          {/* Tenant / Lease */}
          <Card hdr="Tenant">
            <div style={{ padding: '14px 16px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 2 }}>Tenant</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink2)', marginBottom: 2 }}>{p.tenant_name || '—'}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: 'var(--rust)', lineHeight: 1, marginTop: 4, letterSpacing: '-0.02em' }}>{fmtExpiry(p.lease_expiration)}</div>
              {leaseMonths != null && <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic', color: 'var(--rust)', marginTop: 2 }}>{leaseMonths} months remaining</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--line2)' }}>
              <RateCell l="Current Rate" v={p.in_place_rent ? `$${p.in_place_rent}/SF` : '—'} c="rust" />
              <RateCell l="Market Rate" v={p.market_rent ? `$${p.market_rent}` : '—'} c="green" />
              <RateCell l="Type" v={p.lease_type || '—'} c="blue" bt />
              <RateCell l="Spread" v={p.in_place_rent && p.market_rent ? `+${Math.round((parseFloat(String(p.market_rent).replace(/[^0-9.]/g,'')) / parseFloat(String(p.in_place_rent).replace(/[^0-9.]/g,'')) - 1) * 100)}%` : '—'} c="green" bt />
            </div>
          </Card>
        </div>

      </div>

      {/* ═══ LOG ACTIVITY MODAL ═══ */}
      {showLogModal && (
        <Modal onClose={() => setShowLogModal(false)} title={`Log ${logType === 'call' ? 'Call' : logType === 'email' ? 'Email' : logType === 'task' ? 'Task' : 'Note'}`}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {['call', 'email', 'note', 'task'].map(t => (
              <button key={t} onClick={() => setLogType(t)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid', fontFamily: "'Instrument Sans', sans-serif", textTransform: 'capitalize', borderColor: logType === t ? 'var(--blue-bdr)' : 'var(--line)', background: logType === t ? 'var(--blue-bg)' : 'var(--card)', color: logType === t ? 'var(--blue)' : 'var(--ink3)' }}>
                {t === 'call' ? '📞 Call' : t === 'email' ? '✉ Email' : t === 'note' ? '📝 Note' : '+ Task'}
              </button>
            ))}
          </div>
          <textarea value={logNote} onChange={e => setLogNote(e.target.value)} placeholder={`Details about this ${logType}…`}
            style={{ width: '100%', minHeight: 100, padding: 12, borderRadius: 8, border: '1px solid var(--line)', fontSize: 14, lineHeight: 1.6, fontFamily: "'Instrument Sans', sans-serif", resize: 'vertical', color: 'var(--ink2)', outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={() => setShowLogModal(false)} style={btnGhost}>Cancel</button>
            <button onClick={handleLogActivity} style={{ ...btnGhost, background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)' }}>Save Activity</button>
          </div>
        </Modal>
      )}

      {/* ═══ EDIT PROPERTY MODAL ═══ */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)} title="Edit Property" wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {['property_name', 'address', 'city', 'zip', 'submarket', 'market', 'property_type', 'total_sf', 'clear_height', 'year_built', 'estimated_value', 'in_place_rent', 'market_rent', 'lease_type', 'owner', 'owner_type', 'tenant_name', 'zoning'].map(field => (
              <div key={field}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, display: 'block' }}>{field.replace(/_/g, ' ')}</label>
                <input value={editFields[field] ?? ''} onChange={e => setEditFields(prev => ({ ...prev, [field]: e.target.value || null }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 13, color: 'var(--ink2)', fontFamily: "'Instrument Sans', sans-serif", background: 'var(--bg)', outline: 'none' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setShowEditModal(false)} style={btnGhost}>Cancel</button>
            <button onClick={handleSaveEdit} style={{ ...btnGhost, background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)' }}>Save Changes</button>
          </div>
        </Modal>
      )}

      <style jsx global>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.1}}`}</style>
    </>
  );
}

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════

function HeroBadge({ children, c }) {
  const m = { green: { bg: 'rgba(21,102,54,0.30)', bdr: 'rgba(60,180,110,0.45)', text: '#B8F0D0' }, amber: { bg: 'rgba(140,90,4,0.30)', bdr: 'rgba(220,160,50,0.45)', text: '#FFE0A0' }, blue: { bg: 'rgba(78,110,150,0.30)', bdr: 'rgba(137,168,198,0.45)', text: '#C8E0F8' } };
  const s = m[c] || m.blue;
  return <span style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em', border: '1px solid', backdropFilter: 'blur(6px)', background: s.bg, borderColor: s.bdr, color: s.text }}>{children}</span>;
}

function ScoreChip({ label, grade, value, color, borderColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', background: 'var(--card)', border: `1px solid ${borderColor}`, borderRadius: 8, marginRight: 6, flexShrink: 0 }}>
      <div><div style={{ fontSize: 11, color: 'var(--ink3)' }}>{label}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color, marginTop: 1 }}>{grade}</div></div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value ?? '—'}</div>
    </div>
  );
}

function Divider() { return <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 3px' }} />; }

function StatCell({ label, value, sub, color, sm, last }) {
  return (
    <div style={{ padding: '13px 14px', borderRight: last ? 'none' : '1px solid var(--line2)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: sm ? 16 : 22, fontWeight: sm ? 500 : 700, color: color ? `var(--${color})` : 'var(--ink)', lineHeight: 1, letterSpacing: '-0.01em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SpecRow({ k, v, hi }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5.5px 0', borderBottom: '1px solid var(--line3)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink4)' }}>{k}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: hi ? 'var(--blue)' : 'var(--ink2)' }}>{v}</span>
    </div>
  );
}

function RateCell({ l, v, c, bt }) {
  return (
    <div style={{ padding: '10px 16px', borderRight: '1px solid var(--line2)', borderTop: bt ? '1px solid var(--line2)' : 'none' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 4 }}>{l}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600, color: `var(--${c})` }}>{v}</div>
    </div>
  );
}

function Card({ hdr, action, onAction, children }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{hdr}</span>
        {action && <span onClick={onAction} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13.5, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer', fontWeight: 400, letterSpacing: 0, textTransform: 'none', whiteSpace: 'nowrap' }}>{action}</span>}
      </div>
      {children}
    </div>
  );
}

function ActRow({ a }) {
  const type = (a.activity_type || '').toLowerCase();
  const icons = { call: '📞', email: '✉', note: '📝', alert: '⚠', deal: '◈', task: '✓' };
  const colors = { call: 'blue', email: 'purple', note: 'amber', alert: 'rust', deal: 'green', task: 'blue' };
  const bg = colors[type] || 'blue';
  return (
    <div style={{ display: 'flex', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--line2)' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, flexShrink: 0, marginTop: 1, background: `var(--${bg}-bg)`, color: `var(--${bg})` }}>{icons[type] || '•'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.4 }}>{a.notes || '—'}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 2 }}>{a.created_by || 'System'}</div>
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: 'var(--ink4)', flexShrink: 0, paddingTop: 2 }}>{a.created_at ? fmtDate(a.created_at) : '—'}</div>
    </div>
  );
}

function DataTable({ headers, rows, empty, onRow }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{headers.map((h, i) => <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', borderBottom: '1px solid var(--line)', background: 'var(--bg)', fontFamily: "'Instrument Sans', sans-serif" }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={headers.length} style={{ padding: 24, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>{empty}</td></tr> :
          rows.map((row, ri) => (
            <tr key={ri} onClick={() => onRow?.(ri)} style={{ borderBottom: '1px solid var(--line2)', cursor: onRow ? 'pointer' : 'default' }} onMouseEnter={e => { if (onRow) e.currentTarget.style.background = '#F8F6F2'; }} onMouseLeave={e => e.currentTarget.style.background = ''}>
              {row.map((cell, ci) => <td key={ci} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--ink2)', verticalAlign: 'middle' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ onClose, title, wide, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', borderRadius: 12, boxShadow: 'var(--shadow-md)', padding: 24, width: wide ? 560 : 480, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 16, color: 'var(--ink)' }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─── Shared Styles ───────────────────────────
const btnGhost = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontFamily: "'Instrument Sans', sans-serif", fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', whiteSpace: 'nowrap' };
const btnLink = { background: 'none', border: 'none', color: 'var(--blue2)', fontSize: 12.5, padding: '7px 10px', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(100,128,162,0.3)', fontFamily: "'Instrument Sans', sans-serif" };
const btnPrimary = { ...btnGhost, background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)' };
const synthBtn = { fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: 'var(--purple)', cursor: 'pointer', background: 'none', border: '1px solid rgba(88,56,160,0.22)', borderRadius: 6, padding: '4px 11px' };
const secLabel = { fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', paddingBottom: 6, borderBottom: '1px solid var(--line)', marginBottom: 6 };
