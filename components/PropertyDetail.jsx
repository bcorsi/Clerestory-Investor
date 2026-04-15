'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ──────────────────────────────────────────────
   INVESTOR MODE — Property Detail
   clerestory-acq.vercel.app/properties/[id]
   ────────────────────────────────────────────── */

// ─── Helpers ─────────────────────────────────
const fmt = (n) => n == null ? '—' : Number(n).toLocaleString();
const fmtCurrency = (n) => {
  if (n == null) return '—';
  if (n >= 1000000000) return `$${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${fmt(n)}`;
};
const getGrade = (s) => {
  if (s == null) return '—';
  if (s >= 90) return 'A+'; if (s >= 80) return 'A'; if (s >= 70) return 'B+';
  if (s >= 60) return 'B'; if (s >= 50) return 'C+'; return 'C';
};
const getScoreColor = (s) => {
  if (s == null) return 'var(--ink4)';
  if (s >= 80) return 'var(--blue)'; if (s >= 60) return 'var(--amber)'; return 'var(--ink3)';
};
const monthsUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Math.round((d - new Date()) / (1000 * 60 * 60 * 24 * 30.44));
};
const fmtExpiry = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtTimestamp = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

// Catalyst tag categories
const TAG_CATEGORY_MAP = {
  'WARN': 'owner_signal', 'Owner Death': 'owner_signal', 'Estate / Probate': 'owner_signal',
  'NOD Filed': 'owner_signal', 'Tax Delinquent': 'owner_signal', 'Code Violation': 'owner_signal',
  'Prior Listing': 'owner_signal', 'Long Hold': 'owner_signal', 'Absentee Owner': 'owner_signal',
  'Lease Expiry': 'occupancy_lease', 'Lease': 'occupancy_lease', 'Vacancy': 'occupancy_lease',
  'Sublease': 'occupancy_lease',
  'Broker Intel': 'financial_broker', 'Hiring Signal': 'financial_broker', 'Comp Divergence': 'financial_broker',
  'Price Reduction': 'financial_broker', 'Off-Market': 'financial_broker',
  'SLB': 'market_slb', 'Market Signal': 'market_slb', 'Covered Land': 'market_slb',
  'BESS Proximity': 'market_slb', 'High Fit': 'market_slb',
  'CapEx': 'capex', 'Deferred Maintenance': 'capex', 'Roof Age': 'capex', 'Seismic': 'capex',
};
const CATALYST_COLORS = {
  owner_signal: 'rust', occupancy_lease: 'amber', financial_broker: 'blue',
  market_slb: 'green', capex: 'purple',
};
const getTagColor = (tag) => {
  if (!tag) return 'blue';
  for (const [key, cat] of Object.entries(TAG_CATEGORY_MAP)) {
    if (tag.startsWith(key) || tag.toLowerCase().includes(key.toLowerCase()))
      return CATALYST_COLORS[cat] || 'blue';
  }
  if (/lease|vacant|occupan/i.test(tag)) return 'amber';
  if (/warn|nod|owner/i.test(tag)) return 'rust';
  if (/slb|market|land/i.test(tag)) return 'green';
  if (/capex|roof|seismic/i.test(tag)) return 'purple';
  return 'blue';
};
const colorStyles = {
  rust: { bg: 'var(--rust-bg)', bdr: 'var(--rust-bdr)', text: 'var(--rust)' },
  amber: { bg: 'var(--amber-bg)', bdr: 'var(--amber-bdr)', text: 'var(--amber)' },
  blue: { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', text: 'var(--blue)' },
  green: { bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', text: 'var(--green)' },
  purple: { bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', text: 'var(--purple)' },
};

// ─── ORS tier labels ─────────────────────────
const ORS_TIERS = [
  { label: 'Ownership', key: 'ors_ownership', max: 25 },
  { label: 'Lease / Occupancy', key: 'ors_lease', max: 25 },
  { label: 'Financial Signals', key: 'ors_financial', max: 25 },
  { label: 'Contact / Engagement', key: 'ors_contact', max: 25 },
];

// Building Score factors
const BSCORE_FACTORS = [
  { label: 'Clear Height', key: 'bs_clear_height', max: 25 },
  { label: 'DH Ratio', key: 'bs_dh_ratio', max: 20 },
  { label: 'Truck Court', key: 'bs_truck_court', max: 20 },
  { label: 'Office %', key: 'bs_office', max: 15 },
  { label: 'Power', key: 'bs_power', max: 10 },
  { label: 'Vintage', key: 'bs_vintage', max: 10 },
];

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function PropertyDetail() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id;
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // ─── State ─────────────────────────────────
  const [property, setProperty] = useState(null);
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
  const [aiGeneration, setAiGeneration] = useState(null);
  const [oppMemo, setOppMemo] = useState(null);
  const [oppMemoEditing, setOppMemoEditing] = useState(false);
  const [oppMemoText, setOppMemoText] = useState('');

  // Activity logging
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [activityType, setActivityType] = useState('call');
  const [activityNote, setActivityNote] = useState('');

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFields, setEditFields] = useState({});

  // ─── Fetch Data ────────────────────────────
  useEffect(() => {
    if (!propertyId) return;
    fetchAll();
  }, [propertyId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Property
      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();
      if (propErr) throw propErr;
      setProperty(prop);
      setEditFields(prop);

      // Activities
      const { data: acts } = await supabase
        .from('activities')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(20);
      setActivities(acts || []);

      // Buildings
      const { data: bldgs } = await supabase
        .from('property_buildings')
        .select('*')
        .eq('property_id', propertyId);
      setBuildings(bldgs || []);

      // APNs
      const { data: apnData } = await supabase
        .from('property_apns')
        .select('*')
        .eq('property_id', propertyId);
      setApns(apnData || []);

      // Lease Comps
      const { data: lc } = await supabase
        .from('lease_comps')
        .select('*')
        .eq('property_id', propertyId)
        .order('commencement_date', { ascending: false });
      setLeaseComps(lc || []);

      // Sale Comps
      const { data: sc } = await supabase
        .from('sale_comps')
        .select('*')
        .eq('property_id', propertyId)
        .order('sale_date', { ascending: false });
      setSaleComps(sc || []);

      // Contacts
      const { data: ct } = await supabase
        .from('deal_contacts')
        .select('*')
        .eq('property_id', propertyId);
      setContacts(ct || []);

      // Deals
      const { data: dl } = await supabase
        .from('deals')
        .select('*')
        .eq('property_id', propertyId);
      setDeals(dl || []);

      // Files
      const { data: fl } = await supabase
        .from('file_attachments')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      setFiles(fl || []);

      // AI Generation (synthesis)
      const { data: aiData } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('property_id', propertyId)
        .eq('generation_type', 'synthesis')
        .order('created_at', { ascending: false })
        .limit(1);
      setAiGeneration(aiData?.[0] || null);

      // Opportunity Memo
      const { data: memoData } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('property_id', propertyId)
        .eq('generation_type', 'opportunity_memo')
        .order('created_at', { ascending: false })
        .limit(1);
      if (memoData?.[0]) {
        setOppMemo(memoData[0]);
        setOppMemoText(memoData[0].content || '');
      }

    } catch (err) {
      console.error('Error fetching property:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Leaflet Map ───────────────────────────
  useEffect(() => {
    if (!property || !mapRef.current || mapInstanceRef.current) return;
    const lat = property.latitude || 34.0887;
    const lng = property.longitude || -117.9712;
    if (typeof window !== 'undefined' && window.L) {
      const map = window.L.map(mapRef.current, {
        zoomControl: false, scrollWheelZoom: false, dragging: false,
        doubleClickZoom: false, attributionControl: false,
      }).setView([lat, lng], 16);
      window.L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20 }
      ).addTo(map);
      const icon = window.L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#4E6E96;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      window.L.marker([lat, lng], { icon }).addTo(map);
      mapInstanceRef.current = map;
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [property]);

  // ─── Activity Logging ──────────────────────
  const handleLogActivity = async (type) => {
    if (!activityNote.trim()) return;
    try {
      const { error } = await supabase.from('activities').insert([{
        property_id: propertyId,
        activity_type: type || activityType,
        notes: activityNote,
        created_by: 'Briana Corso',
        created_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      setActivityNote('');
      setShowLogActivity(false);
      // Refresh activities
      const { data: acts } = await supabase
        .from('activities')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(20);
      setActivities(acts || []);
    } catch (err) {
      console.error('Error logging activity:', err);
      alert('Error: ' + err.message);
    }
  };

  // ─── Convert to Acquisition ────────────────
  const handleConvertToAcquisition = async () => {
    if (!property) return;
    const confirmed = confirm(`Convert "${property.property_name || property.address}" to an Acquisition?\nThis will create a new deal in Screening stage.`);
    if (!confirmed) return;
    try {
      const { data, error } = await supabase.from('deals').insert([{
        property_id: propertyId,
        deal_name: `${property.property_name || property.address} — Acquisition`,
        stage: 'Screening',
        deal_type: 'acquisition',
        estimated_value: property.estimated_value,
        created_at: new Date().toISOString(),
      }]).select();
      if (error) throw error;
      // Log activity
      await supabase.from('activities').insert([{
        property_id: propertyId,
        activity_type: 'deal',
        notes: `Acquisition created — ${property.property_name || property.address} · Screening stage`,
        created_by: 'Briana Corso',
      }]);
      alert('Acquisition created successfully');
      router.push(`/deals/${data?.[0]?.id || ''}`);
    } catch (err) {
      console.error('Error creating acquisition:', err);
      alert('Error: ' + err.message);
    }
  };

  // ─── Edit Property ─────────────────────────
  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('properties')
        .update(editFields)
        .eq('id', propertyId);
      if (error) throw error;
      setShowEditModal(false);
      fetchAll();
    } catch (err) {
      console.error('Error saving:', err);
      alert('Error: ' + err.message);
    }
  };

  // ─── Export Memo (download text) ───────────
  const handleExportMemo = () => {
    const content = aiGeneration?.content || oppMemo?.content || 'No memo available';
    const blob = new Blob([
      `PROPERTY MEMO — ${property?.property_name || property?.address}\n`,
      `Generated: ${new Date().toLocaleDateString()}\n\n`,
      content,
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(property?.property_name || 'property').replace(/\s/g, '_')}_memo.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Regenerate AI Synthesis ───────────────
  const handleRegenSynthesis = async () => {
    alert('AI Synthesis regeneration triggered. This would call the Claude API to regenerate acquisition intelligence for this property.');
  };

  // ─── Save Opportunity Memo ─────────────────
  const handleSaveOppMemo = async () => {
    try {
      if (oppMemo?.id) {
        // Update existing
        const { error } = await supabase.from('ai_generations')
          .update({ content: oppMemoText, updated_at: new Date().toISOString() })
          .eq('id', oppMemo.id);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase.from('ai_generations').insert([{
          property_id: propertyId,
          generation_type: 'opportunity_memo',
          content: oppMemoText,
          created_at: new Date().toISOString(),
        }]).select();
        if (error) throw error;
        setOppMemo(data?.[0]);
      }
      setOppMemoEditing(false);
    } catch (err) {
      console.error('Error saving memo:', err);
      alert('Error: ' + err.message);
    }
  };

  // ─── Add to Campaign ───────────────────────
  const handleAddToCampaign = async () => {
    alert('Opens campaign selection modal. Select or create a research campaign to add this property.');
  };

  // ─── External Links ────────────────────────
  const openGoogleMaps = () => {
    const addr = encodeURIComponent(
      `${property?.address || ''} ${property?.city || ''} ${property?.state || ''} ${property?.zip || ''}`
    );
    window.open(`https://www.google.com/maps/search/${addr}`, '_blank');
  };
  const openCoStar = () => {
    window.open('https://product.costar.com/', '_blank');
  };
  const openCountyGIS = () => {
    window.open('https://maps.assessor.lacounty.gov/', '_blank');
  };

  // ─── Loading / Error ───────────────────────
  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>
        <div style={{ fontSize: 16, marginBottom: 8 }}>Loading property…</div>
      </div>
    );
  }
  if (!property) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>
        <div style={{ fontSize: 16, marginBottom: 12 }}>Property not found</div>
        <button onClick={() => router.push('/properties')} style={btnGhostStyle}>← Back to Properties</button>
      </div>
    );
  }

  // ─── Computed Values ───────────────────────
  const p = property;
  const leaseMonths = monthsUntil(p.lease_expiration);
  const score = p.ai_score;
  const grade = getGrade(score);
  const pfs = p.portfolio_fit_score || null;
  const pfsGrade = getGrade(pfs);
  const ors = p.ors_score || null;
  const orsGrade = getGrade(ors);
  const occupancyLabel = (p.occupancy_status || '').toLowerCase().includes('occupied') ? 'Occupied'
    : (p.occupancy_status || '').toLowerCase().includes('vacant') ? 'Vacant'
    : (p.occupancy_status || '').toLowerCase().includes('partial') ? 'Partial'
    : (p.occupancy_status || 'Unknown');

  // Tab counts
  const tabCounts = {
    Timeline: activities.length, Buildings: buildings.length, APNs: apns.length,
    'Lease Comps': leaseComps.length, 'Sale Comps': saleComps.length,
    Contacts: contacts.length, Deals: deals.length, Files: files.length,
  };
  const tabs = ['Timeline', 'Buildings', 'APNs', 'Lease Comps', 'Sale Comps', 'Contacts', 'Deals', 'Files'];

  // ─── Render ────────────────────────────────
  return (
    <>
      {/* Leaflet CSS + JS (loaded once) */}
      {typeof window !== 'undefined' && !document.querySelector('link[href*="leaflet"]') && (
        <>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
          <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" />
        </>
      )}

      {/* ═══ HERO MAP ═══ */}
      <div style={{ height: 300, position: 'relative', overflow: 'hidden', marginLeft: -28, marginRight: -28, marginTop: -18 }}>
        <div ref={mapRef} id="property-map" style={{ width: '100%', height: 300, background: '#1a1e2a' }} />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 400, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(10,8,5,0.82) 0%, rgba(10,8,5,0.15) 55%, transparent 100%)',
        }} />
        {/* Hero content */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, padding: '20px 28px',
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#fff',
            lineHeight: 1, letterSpacing: '-0.01em', marginBottom: 8,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>{p.property_name || p.address}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <HeroBadge color="green">● {occupancyLabel}</HeroBadge>
            {p.lease_expiration && <HeroBadge color="amber">Lease Exp. {fmtExpiry(p.lease_expiration)}</HeroBadge>}
            <HeroBadge color="blue">
              {p.property_type || 'Industrial'} · {fmt(p.total_sf || p.building_sf)} SF
            </HeroBadge>
            {p.owner_type && <HeroBadge color="blue">{p.owner_type}</HeroBadge>}
          </div>
        </div>
      </div>

      {/* ═══ ACTION BAR ═══ */}
      <div style={{
        background: 'var(--bg2)', borderBottom: '1px solid var(--line)',
        padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        marginLeft: -28, marginRight: -28,
      }}>
        {/* Building Score chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px',
          background: 'var(--card)', border: '1px solid var(--blue-bdr)', borderRadius: 8,
          marginRight: 4, flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Bldg Score</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--blue2)', marginTop: 1 }}>{grade}</div>
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700,
            color: 'var(--blue)', lineHeight: 1, letterSpacing: '-0.02em',
          }}>{score ?? '—'}</div>
        </div>

        {/* Portfolio Fit Score chip — INVESTOR ONLY */}
        {pfs != null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px',
            background: 'var(--card)', border: '1px solid var(--green-bdr)', borderRadius: 8,
            marginRight: 4, flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Portfolio Fit</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--green)', marginTop: 1 }}>{pfsGrade}</div>
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700,
              color: 'var(--green)', lineHeight: 1, letterSpacing: '-0.02em',
            }}>{pfs}</div>
          </div>
        )}

        <Divider />
        <button onClick={() => { setShowLogActivity(true); setActivityType('call'); }} style={btnGhostStyle}>📞 Log Call</button>
        <button onClick={() => { setShowLogActivity(true); setActivityType('email'); }} style={btnGhostStyle}>✉ Log Email</button>
        <button onClick={() => { setShowLogActivity(true); setActivityType('note'); }} style={btnGhostStyle}>📝 Add Note</button>
        <button onClick={() => { setShowLogActivity(true); setActivityType('task'); }} style={btnGhostStyle}>+ Task</button>
        <Divider />
        <button onClick={openGoogleMaps} style={btnLinkStyle}>📍 Google Maps</button>
        <button onClick={openCoStar} style={btnLinkStyle}>🗂 CoStar</button>
        <button onClick={openCountyGIS} style={btnLinkStyle}>🗺 LA County GIS</button>
        <Divider />
        <button onClick={() => setShowEditModal(true)} style={btnGhostStyle}>⚙ Edit</button>
        <button onClick={handleExportMemo} style={btnGhostStyle}>↓ Export Memo</button>
        <button onClick={handleAddToCampaign} style={btnGhostStyle}>⊕ Campaign</button>
        <div style={{ marginLeft: 'auto' }} />
        <button onClick={handleConvertToAcquisition} style={{
          ...btnGhostStyle, background: 'var(--green)', color: '#fff', borderColor: 'var(--green)',
        }}>◈ Convert to Acquisition</button>
      </div>

      {/* ═══ INNER CONTENT ═══ */}
      <div style={{ padding: '18px 0 0' }}>

        {/* ─── AI Synthesis (Acquisition Intelligence) ─── */}
        <div style={{
          background: 'var(--card)', borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)', border: '1px solid rgba(88,56,160,0.18)',
          overflow: 'hidden', marginBottom: 16, position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
            background: 'linear-gradient(180deg, #8B6FCC, var(--purple))',
          }} />
          <div
            onClick={() => setSynthOpen(!synthOpen)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 16px 11px 20px', borderBottom: '1px solid rgba(88,56,160,0.12)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--purple)' }}>✦</span>
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase',
                color: 'var(--purple)',
              }}>AI Acquisition Intelligence</span>
              <span style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 12.5, fontStyle: 'italic',
                color: 'var(--ink4)',
              }}>Property Analysis · {p.property_name || p.address}</span>
            </div>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic',
              color: 'var(--purple)', cursor: 'pointer',
            }}>{synthOpen ? 'Hide ▴' : 'Show ▾'}</span>
          </div>
          {synthOpen && (
            <>
              <div style={{ padding: '18px 22px 20px' }}>
                {aiGeneration?.content ? (
                  <div style={{ fontSize: 13.5, lineHeight: 1.72, color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>
                    {aiGeneration.content}
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, lineHeight: 1.72, color: 'var(--ink4)', fontStyle: 'italic' }}>
                    No AI synthesis generated yet. Click Regenerate to create acquisition intelligence for this property.
                  </div>
                )}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 22px', borderTop: '1px solid rgba(88,56,160,0.10)',
                background: 'rgba(88,56,160,0.02)',
              }}>
                <button onClick={handleRegenSynthesis} style={{
                  fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: 'var(--purple)',
                  cursor: 'pointer', background: 'none', border: '1px solid rgba(88,56,160,0.22)',
                  borderRadius: 6, padding: '4px 11px',
                }}>↻ Regenerate</button>
                <button onClick={() => {
                  if (aiGeneration?.content) navigator.clipboard.writeText(aiGeneration.content);
                }} style={{
                  fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: 'var(--purple)',
                  cursor: 'pointer', background: 'none', border: '1px solid rgba(88,56,160,0.22)',
                  borderRadius: 6, padding: '4px 11px',
                }}>📋 Copy</button>
                {aiGeneration?.created_at && (
                  <span style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--ink4)', marginLeft: 'auto',
                  }}>Generated {fmtTimestamp(aiGeneration.created_at)}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ─── Stat Row ─── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0,
          background: 'var(--card)', borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)', border: '1px solid var(--line2)',
          overflow: 'hidden', marginBottom: 16,
        }}>
          <StatCell label="Property SF" value={fmt(p.total_sf || p.building_sf)} sub={buildings.length ? `${buildings.length} building${buildings.length > 1 ? 's' : ''}` : null} />
          <StatCell label="Land" value={p.land_area ? `${p.land_area} ac` : '—'} sub={apns.length ? `${apns.length} APNs` : null} />
          <StatCell label="In-Place Rent" value={p.in_place_rent ? `$${p.in_place_rent}/SF` : '—'} sub="NNN / mo" color="blue" sm />
          <StatCell label="Market Rent" value={p.market_rent ? `$${p.market_rent}` : '—'} sub="NNN est." color="green" sm />
          <StatCell label="Lease Expiry" value={fmtExpiry(p.lease_expiration)} sub={leaseMonths != null ? `${leaseMonths} months` : null} color={leaseMonths != null && leaseMonths <= 24 ? 'amber' : undefined} sm />
          <StatCell label="Est. Value" value={fmtCurrency(p.estimated_value)} sub={p.estimated_value && (p.total_sf || p.building_sf) ? `~$${Math.round(p.estimated_value / (p.total_sf || p.building_sf))}/SF` : null} />
          <StatCell label="Year Built" value={p.year_built || '—'} sub={p.zoning || null} last />
        </div>

        {/* ─── Building Score Card (collapsible) ─── */}
        <div style={{
          background: 'var(--card)', borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)', border: '1px solid var(--line2)',
          overflow: 'hidden', marginBottom: 16,
        }}>
          <div onClick={() => setSpecsOpen(!specsOpen)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 18px', borderBottom: '1px solid var(--line)', cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ScoreRing value={score} grade={grade} color="blue" size={50} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>
                  Building Score — {grade} · {score >= 90 ? 'Top-tier' : score >= 80 ? 'High-quality' : score >= 70 ? 'Solid' : 'Standard'} {p.property_type || 'industrial'} asset
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>
                  {[
                    p.clear_height ? `${p.clear_height}' clear` : null,
                    p.dock_doors ? `${p.dock_doors} dock-high` : null,
                    p.truck_court_depth ? `${p.truck_court_depth}' truck court` : null,
                    p.sprinkler_type,
                    p.power_amps ? `${fmt(p.power_amps)}A power` : null,
                  ].filter(Boolean).join(' · ') || 'No building specs available'}
                </div>
              </div>
            </div>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic',
              color: 'var(--blue2)', cursor: 'pointer',
            }}>{specsOpen ? 'Hide specs ▴' : 'Show all specs ▾'}</span>
          </div>
          {/* Summary strip — always visible */}
          <div style={{ display: 'flex', gap: 0, borderBottom: specsOpen ? '1px solid var(--line)' : 'none' }}>
            {[
              { label: 'Clear Ht', value: p.clear_height ? `${p.clear_height}'` : '—', hi: (p.clear_height || 0) >= 30 },
              { label: 'Dock Doors', value: p.dock_doors ? `${p.dock_doors} DH${p.grade_doors ? ` · ${p.grade_doors} GL` : ''}` : '—', hi: (p.dock_doors || 0) >= 20 },
              { label: 'Truck Court', value: p.truck_court_depth ? `${p.truck_court_depth}'` : '—', hi: (p.truck_court_depth || 0) >= 130 },
              { label: 'Office %', value: p.office_pct != null ? `${p.office_pct}%` : '—' },
              { label: 'Power', value: p.power_amps ? `${fmt(p.power_amps)}A/${p.power_voltage || ''}V` : '—' },
              { label: 'Sprinklers', value: p.sprinkler_type || '—' },
              { label: 'DH Ratio', value: p.dh_ratio ? `${p.dh_ratio}/10kSF` : '—', hi: (p.dh_ratio || 0) >= 1.0 },
              { label: 'Coverage', value: p.coverage_ratio ? `${p.coverage_ratio}%` : '—' },
            ].map((item, i) => (
              <div key={i} style={{
                flex: 1, padding: '9px 12px', borderRight: i < 7 ? '1px solid var(--line2)' : 'none',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 9.5, color: 'var(--ink4)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>
                  {item.label}
                </div>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 12.5,
                  color: item.hi ? 'var(--blue)' : 'var(--ink2)',
                }}>{item.value}</div>
              </div>
            ))}
          </div>
          {/* Expanded specs + score breakdown */}
          {specsOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '14px 18px', borderRight: '1px solid var(--line)' }}>
                <div style={specSecLblStyle}>Structure</div>
                {[
                  ['Building SF', fmt(p.total_sf || p.building_sf)],
                  ['Land Area', p.land_area ? `${p.land_area} ac` : '—'],
                  ['Year Built', p.year_built || '—'],
                  ['Clear Height', p.clear_height ? `${p.clear_height}'` : '—'],
                  ['Column Spacing', p.column_spacing || '—'],
                ].map(([k, v], i) => <SpecRow key={i} label={k} value={v} />)}
                <div style={{ ...specSecLblStyle, marginTop: 12 }}>Loading</div>
                {[
                  ['Dock-High Doors', p.dock_doors || '—'],
                  ['Grade-Level Doors', p.grade_doors || '—'],
                  ['Truck Court Depth', p.truck_court_depth ? `${p.truck_court_depth}'` : '—'],
                  ['Trailer Spots', p.trailer_spots || '—'],
                  ['Parking Spaces', p.parking_spaces || '—'],
                ].map(([k, v], i) => <SpecRow key={i} label={k} value={v} />)}
              </div>
              <div style={{ padding: '14px 18px' }}>
                <div style={specSecLblStyle}>Systems</div>
                {[
                  ['Power', p.power_amps ? `${fmt(p.power_amps)}A / ${p.power_voltage || ''}V` : '—'],
                  ['Sprinklers', p.sprinkler_type || '—'],
                  ['Rail Served', p.rail_served ? 'Yes' : 'No'],
                  ['Zoning', p.zoning || '—'],
                  ['Office SF', p.office_sf ? `${fmt(p.office_sf)} (${p.office_pct || '—'}%)` : '—'],
                ].map(([k, v], i) => <SpecRow key={i} label={k} value={v} />)}
                <div style={{ ...specSecLblStyle, marginTop: 12 }}>Score Breakdown</div>
                {BSCORE_FACTORS.map(f => {
                  const val = p[f.key] || 0;
                  const pct = f.max > 0 ? (val / f.max * 100) : 0;
                  return (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink3)', width: 140, flexShrink: 0 }}>{f.label}</span>
                      <div style={{ flex: 1, height: 5, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, width: `${pct}%`,
                          background: pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--rust)',
                        }} />
                      </div>
                      <span style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--ink3)',
                        width: 40, textAlign: 'right', flexShrink: 0,
                      }}>{val}/{f.max}</span>
                    </div>
                  );
                })}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginTop: 8,
                  paddingTop: 7, borderTop: '1px solid var(--line3)',
                }}>
                  <span style={{ fontSize: 11, color: 'var(--ink4)' }}>Total</span>
                  <span style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--blue)', fontWeight: 600,
                  }}>{score || 0}/100</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── ORS Ring + Signal Bars (Investor: seller readiness) ─── */}
        {ors != null && (
          <div style={{
            background: 'var(--card)', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)', border: '1px solid var(--line2)',
            overflow: 'hidden', marginBottom: 16,
          }}>
            <div style={{
              padding: '12px 18px', borderBottom: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <ScoreRing value={ors} grade={orsGrade} color="amber" size={50} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>
                    Owner Readiness Score — {orsGrade} · Seller {ors >= 80 ? 'highly motivated' : ors >= 60 ? 'receptive' : ors >= 40 ? 'open' : 'unlikely'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>
                    9 weighted signals across 4 tiers
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 18px' }}>
              {ORS_TIERS.map(tier => {
                const val = p[tier.key] || 0;
                const pct = tier.max > 0 ? (val / tier.max * 100) : 0;
                return (
                  <div key={tier.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink3)', width: 160, flexShrink: 0 }}>{tier.label}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, width: `${pct}%`,
                        background: pct >= 70 ? 'var(--rust)' : pct >= 40 ? 'var(--amber)' : 'var(--blue)',
                      }} />
                    </div>
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--ink3)',
                      width: 50, textAlign: 'right', flexShrink: 0,
                    }}>{val}/{tier.max}</span>
                  </div>
                );
              })}
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: 8,
                paddingTop: 7, borderTop: '1px solid var(--line3)',
              }}>
                <span style={{ fontSize: 11, color: 'var(--ink4)' }}>Total ORS</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--amber)', fontWeight: 600,
                }}>{ors}/100</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Opportunity Memo (blue bg, editable, saves to ai_generations) ─── */}
        <div style={{
          background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)',
          borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 16,
        }}>
          <div style={{
            padding: '10px 16px', background: 'rgba(78,110,150,0.12)',
            borderBottom: '1px solid var(--blue-bdr)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase',
              color: 'var(--blue)',
            }}>Opportunity Memo</span>
            <button
              onClick={() => oppMemoEditing ? handleSaveOppMemo() : setOppMemoEditing(true)}
              style={{
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 12,
                color: 'var(--blue)', cursor: 'pointer', background: 'none',
                border: '1px solid var(--blue-bdr)', borderRadius: 6, padding: '3px 10px',
              }}
            >{oppMemoEditing ? '✓ Save' : '✎ Edit'}</button>
          </div>
          <div style={{ padding: '14px 16px' }}>
            {oppMemoEditing ? (
              <textarea
                value={oppMemoText}
                onChange={e => setOppMemoText(e.target.value)}
                placeholder="Write your acquisition rationale here. Why is this property a fit? What's the thesis? What makes this compelling?"
                style={{
                  width: '100%', minHeight: 120, padding: 12, border: '1px solid var(--blue-bdr)',
                  borderRadius: 8, fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink2)',
                  fontFamily: "'Instrument Sans', sans-serif", resize: 'vertical',
                  background: 'rgba(255,255,255,0.7)', outline: 'none',
                }}
              />
            ) : (
              <div style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink2)' }}>
                {oppMemoText || oppMemo?.content || (
                  <span style={{ fontStyle: 'italic', color: 'var(--ink4)' }}>
                    No opportunity memo yet. Click Edit to write your acquisition rationale.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── AI Property Signal ─── */}
        <div style={{
          background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)',
          borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 14,
        }}>
          <div style={{
            padding: '10px 16px', background: 'rgba(78,110,150,0.12)',
            borderBottom: '1px solid var(--blue-bdr)',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{ fontSize: 13 }}>✦</span>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase',
              color: 'var(--blue)',
            }}>AI Property Signal</span>
          </div>
          <div style={{ padding: '14px 16px', fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink2)' }}>
            {p.ai_property_signal || (
              <span style={{ fontStyle: 'italic', color: 'var(--ink4)' }}>
                AI property signal not yet generated. Signals are generated based on building specs, market position, and comparable analysis.
              </span>
            )}
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 16 }}>
          {tabs.map(tab => (
            <div key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 15px', fontSize: 13.5, cursor: 'pointer',
                borderBottom: `2px solid ${activeTab === tab ? 'var(--blue)' : 'transparent'}`,
                marginBottom: -1, whiteSpace: 'nowrap', transition: 'all 0.12s',
                color: activeTab === tab ? 'var(--blue)' : 'var(--ink4)',
                fontWeight: activeTab === tab ? 500 : 400,
              }}
            >
              {tab}
              {tabCounts[tab] > 0 && (
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                  background: 'var(--bg2)', border: '1px solid var(--line)',
                  borderRadius: 20, padding: '1px 6px', marginLeft: 4, color: 'var(--ink4)',
                }}>{tabCounts[tab]}</span>
              )}
            </div>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* TIMELINE TAB */}
          {activeTab === 'Timeline' && (
            <div style={{
              background: 'var(--card)', borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 16px', borderBottom: '1px solid var(--line)',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase',
                  color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', background: 'var(--rust)',
                    animation: 'blink 1.4s infinite', display: 'inline-block',
                  }} />
                  Activity Timeline
                </div>
                <span onClick={() => setShowLogActivity(true)} style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 13.5, fontStyle: 'italic',
                  color: 'var(--blue2)', cursor: 'pointer',
                }}>+ Log Activity</span>
              </div>
              {activities.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>
                  No activities logged yet. Click "+ Log Activity" to add your first entry.
                </div>
              ) : activities.map((act, i) => (
                <ActivityRow key={act.id || i} activity={act} />
              ))}
            </div>
          )}

          {/* BUILDINGS TAB */}
          {activeTab === 'Buildings' && (
            <DataTable
              title="Buildings"
              headers={['Building Name', 'SF', 'Clear Ht', 'Dock Doors', 'Power', 'Year Built']}
              rows={buildings.map(b => [
                b.building_name || '—', fmt(b.building_sf), b.clear_height ? `${b.clear_height}'` : '—',
                b.dock_doors || '—', b.power_amps ? `${fmt(b.power_amps)}A` : '—', b.year_built || '—',
              ])}
              emptyMsg="No buildings linked to this property."
            />
          )}

          {/* APNs TAB */}
          {activeTab === 'APNs' && (
            <DataTable
              title="Parcels (APNs)"
              headers={['APN', 'Acreage', 'Owner of Record', 'Last Transfer', 'Assessed Value']}
              rows={apns.map(a => [
                a.apn || '—', a.acreage ? `${a.acreage} ac` : '—', a.owner_of_record || '—',
                a.last_transfer_date ? fmtDate(a.last_transfer_date) : '—',
                a.assessed_value ? fmtCurrency(a.assessed_value) : '—',
              ])}
              emptyMsg="No APNs linked to this property."
            />
          )}

          {/* LEASE COMPS TAB */}
          {activeTab === 'Lease Comps' && (
            <DataTable
              title="Lease Comps"
              headers={['Address', 'Tenant', 'SF', 'Rate', 'Type', 'Date']}
              rows={leaseComps.map(lc => [
                lc.address || '—', lc.tenant_name || '—', fmt(lc.building_sf),
                lc.rate ? `$${lc.rate}/SF` : '—', lc.lease_type || '—',
                lc.commencement_date ? fmtDate(lc.commencement_date) : '—',
              ])}
              emptyMsg="No lease comps for this property."
            />
          )}

          {/* SALE COMPS TAB */}
          {activeTab === 'Sale Comps' && (
            <DataTable
              title="Sale Comps"
              headers={['Address', 'Buyer', 'SF', 'Price', '$/SF', 'Sale Date', 'Broker']}
              rows={saleComps.map(sc => [
                sc.address || '—', sc.buyer || '—', fmt(sc.building_sf),
                fmtCurrency(sc.sale_price), sc.price_per_sf ? `$${sc.price_per_sf}` : '—',
                sc.sale_date ? fmtDate(sc.sale_date) : '—', sc.broker || '—',
              ])}
              emptyMsg="No sale comps for this property."
            />
          )}

          {/* CONTACTS TAB */}
          {activeTab === 'Contacts' && (
            <DataTable
              title="Contacts"
              headers={['Name', 'Company', 'Role', 'Phone', 'Email']}
              rows={contacts.map(c => [
                c.contact_name || '—', c.company || '—', c.role || '—',
                c.phone || '—', c.email || '—',
              ])}
              emptyMsg="No contacts linked to this property."
            />
          )}

          {/* DEALS TAB */}
          {activeTab === 'Deals' && (
            <DataTable
              title="Acquisitions"
              headers={['Deal Name', 'Stage', 'Value', 'Type', 'Created']}
              rows={deals.map(d => [
                d.deal_name || '—', d.stage || '—', fmtCurrency(d.estimated_value || d.deal_value),
                d.deal_type || '—', d.created_at ? fmtDate(d.created_at) : '—',
              ])}
              emptyMsg="No acquisitions linked to this property."
              onRowClick={(i) => deals[i]?.id && router.push(`/deals/${deals[i].id}`)}
            />
          )}

          {/* FILES TAB */}
          {activeTab === 'Files' && (
            <DataTable
              title="Files"
              headers={['Filename', 'Type', 'Size', 'Uploaded']}
              rows={files.map(f => [
                f.filename || f.file_name || '—', f.file_type || '—',
                f.file_size ? `${Math.round(f.file_size / 1024)} KB` : '—',
                f.created_at ? fmtDate(f.created_at) : '—',
              ])}
              emptyMsg="No files attached to this property."
            />
          )}
        </div>

        {/* ─── Owner + Tenant cards (below tabs) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          {/* OWNER */}
          <div style={{
            background: 'var(--card)', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--line)',
              fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase',
              color: 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              Owner
              <span onClick={() => p.owner_account_id && router.push(`/accounts/${p.owner_account_id}`)} style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic',
                color: 'var(--blue2)', cursor: 'pointer', fontWeight: 400, letterSpacing: 0, textTransform: 'none',
              }}>View Record →</span>
            </div>
            {[
              ['Company', p.owner || '—'],
              ['Primary Contact', p.owner_contact || '—'],
              ['Owner Type', p.owner_type || '—'],
              ['Owner Since', p.last_transfer_date ? new Date(p.last_transfer_date).getFullYear() : '—'],
              ['APN(s)', apns.map(a => a.apn).filter(Boolean).join(' · ') || '—'],
            ].map(([k, v], i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '8px 16px', borderBottom: i < 4 ? '1px solid var(--line2)' : 'none',
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink4)' }}>{k}</span>
                <span style={{
                  fontSize: 13, color: 'var(--ink2)', textAlign: 'right', maxWidth: 180,
                  ...(k === 'Primary Contact' ? { color: 'var(--blue)', cursor: 'pointer' } : {}),
                }}>{v}</span>
              </div>
            ))}
          </div>

          {/* TENANT / LEASE */}
          <div style={{
            background: 'var(--card)', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--line)',
              fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase',
              color: 'var(--ink3)',
            }}>Tenant</div>
            <div style={{ padding: '14px 16px 10px' }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--ink4)', marginBottom: 2,
              }}>Tenant</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink2)', marginBottom: 2 }}>
                {p.tenant_name || '—'}
              </div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700,
                color: 'var(--rust)', lineHeight: 1, marginTop: 4, letterSpacing: '-0.02em',
              }}>{fmtExpiry(p.lease_expiration)}</div>
              {leaseMonths != null && (
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic',
                  color: 'var(--rust)', marginTop: 2,
                }}>{leaseMonths} months remaining</div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--line2)' }}>
              <RateCell label="Current Rate" value={p.in_place_rent ? `$${p.in_place_rent}/SF` : '—'} color="rust" />
              <RateCell label="Market Rate" value={p.market_rent ? `$${p.market_rent}` : '—'} color="green" />
              <RateCell label="Type" value={p.lease_type || '—'} color="blue" bottom />
              <RateCell label="Spread" value={
                p.in_place_rent && p.market_rent
                  ? `+${Math.round((parseFloat(String(p.market_rent).replace(/[^0-9.]/g, '')) / parseFloat(String(p.in_place_rent).replace(/[^0-9.]/g, '')) - 1) * 100)}%`
                  : '—'
              } color="green" bottom />
            </div>
          </div>
        </div>

        {/* ─── Active Catalysts + AI Property Signal (2-col) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
          {/* Catalysts */}
          <div style={{
            background: 'var(--card)', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--line)',
              fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase',
              color: 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              Active Catalysts
              <span style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic',
                color: 'var(--blue2)', cursor: 'pointer', fontWeight: 400, letterSpacing: 0, textTransform: 'none',
              }}>+ Add</span>
            </div>
            {(p.catalyst_tags || []).length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>
                No active catalyst tags.
              </div>
            ) : (p.catalyst_tags || []).map((tag, i) => {
              const color = getTagColor(tag);
              const c = colorStyles[color] || colorStyles.blue;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px',
                  borderBottom: i < (p.catalyst_tags || []).length - 1 ? '1px solid var(--line2)' : 'none',
                  cursor: 'pointer',
                }}>
                  <span style={{
                    display: 'inline-flex', padding: '3px 8px', borderRadius: 4,
                    fontSize: 11, fontWeight: 500,
                    background: c.bg, border: `1px solid ${c.bdr}`, color: c.text,
                  }}>{tag}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink3)', flex: 1 }}>—</span>
                  <span style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: 'var(--ink4)',
                  }}>auto</span>
                </div>
              );
            })}
          </div>

          {/* Broker Intel card */}
          <div style={{
            background: 'var(--card)', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--line)',
              fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase',
              color: 'var(--ink3)',
            }}>Broker Intel</div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{
                display: 'inline-flex', padding: '4px 12px', borderRadius: 6, marginBottom: 12,
                fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
                background: p.broker_on_file ? 'var(--amber-bg)' : 'var(--green-bg)',
                border: `1px solid ${p.broker_on_file ? 'var(--amber-bdr)' : 'var(--green-bdr)'}`,
                color: p.broker_on_file ? 'var(--amber)' : 'var(--green)',
              }}>
                {p.broker_on_file ? '⚠ Broker on file — approach carefully' : '✓ Go direct to owner'}
              </div>
              {[
                ['Active Listing', p.active_listing || 'No'],
                ['Last Sale Broker', p.last_sale_broker || '—'],
                ['Last Lease Rep', p.last_lease_rep || '—'],
                ['Recommendation', p.broker_on_file ? 'Broker on file' : 'Go direct'],
              ].map(([k, v], i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                  borderBottom: i < 3 ? '1px solid var(--line3)' : 'none',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--ink4)' }}>{k}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ═══ LOG ACTIVITY MODAL ═══ */}
      {showLogActivity && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowLogActivity(false)}>
          <div style={{
            background: 'var(--card)', borderRadius: 12, boxShadow: 'var(--shadow-md)',
            padding: 24, width: 480, maxWidth: '90vw',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 16, color: 'var(--ink)' }}>
              Log {activityType === 'call' ? 'Call' : activityType === 'email' ? 'Email' : activityType === 'task' ? 'Task' : 'Note'}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {['call', 'email', 'note', 'task'].map(t => (
                <button key={t} onClick={() => setActivityType(t)} style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid',
                  borderColor: activityType === t ? 'var(--blue-bdr)' : 'var(--line)',
                  background: activityType === t ? 'var(--blue-bg)' : 'var(--card)',
                  color: activityType === t ? 'var(--blue)' : 'var(--ink3)',
                  fontFamily: "'Instrument Sans', sans-serif", textTransform: 'capitalize',
                }}>{t === 'call' ? '📞 Call' : t === 'email' ? '✉ Email' : t === 'note' ? '📝 Note' : '+ Task'}</button>
              ))}
            </div>
            <textarea
              value={activityNote}
              onChange={e => setActivityNote(e.target.value)}
              placeholder={`What happened? Add details about the ${activityType}...`}
              style={{
                width: '100%', minHeight: 100, padding: 12, borderRadius: 8,
                border: '1px solid var(--line)', fontSize: 14, lineHeight: 1.6,
                fontFamily: "'Instrument Sans', sans-serif", resize: 'vertical',
                color: 'var(--ink2)', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowLogActivity(false)} style={btnGhostStyle}>Cancel</button>
              <button onClick={() => handleLogActivity(activityType)} style={{
                ...btnGhostStyle, background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)',
              }}>Save Activity</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT PROPERTY MODAL ═══ */}
      {showEditModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            background: 'var(--card)', borderRadius: 12, boxShadow: 'var(--shadow-md)',
            padding: 24, width: 560, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 16, color: 'var(--ink)' }}>Edit Property</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                'property_name', 'address', 'city', 'zip', 'submarket', 'market',
                'property_type', 'total_sf', 'clear_height', 'year_built',
                'estimated_value', 'in_place_rent', 'market_rent', 'lease_type',
                'owner', 'owner_type', 'tenant_name', 'zoning',
              ].map(field => (
                <div key={field}>
                  <label style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', marginBottom: 3, display: 'block',
                  }}>{field.replace(/_/g, ' ')}</label>
                  <input
                    value={editFields[field] ?? ''}
                    onChange={e => setEditFields(prev => ({ ...prev, [field]: e.target.value || null }))}
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 6,
                      border: '1px solid var(--line)', fontSize: 13, color: 'var(--ink2)',
                      fontFamily: "'Instrument Sans', sans-serif", background: 'var(--bg)', outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowEditModal(false)} style={btnGhostStyle}>Cancel</button>
              <button onClick={handleSaveEdit} style={{
                ...btnGhostStyle, background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)',
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.1; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════

function HeroBadge({ children, color }) {
  const colors = {
    green: { bg: 'rgba(21,102,54,0.30)', bdr: 'rgba(60,180,110,0.45)', text: '#B8F0D0' },
    amber: { bg: 'rgba(140,90,4,0.30)', bdr: 'rgba(220,160,50,0.45)', text: '#FFE0A0' },
    blue: { bg: 'rgba(78,110,150,0.30)', bdr: 'rgba(137,168,198,0.45)', text: '#C8E0F8' },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      letterSpacing: '0.02em', border: '1px solid',
      backdropFilter: 'blur(6px)',
      background: c.bg, borderColor: c.bdr, color: c.text,
    }}>{children}</span>
  );
}

function ScoreRing({ value, grade, color, size = 50 }) {
  const colorMap = {
    blue: { border: 'rgba(78,110,150,0.32)', bg: 'var(--blue-bg)', text: 'var(--blue)', sub: 'var(--blue2)' },
    green: { border: 'rgba(21,102,54,0.32)', bg: 'var(--green-bg)', text: 'var(--green)', sub: 'var(--green)' },
    amber: { border: 'rgba(140,90,4,0.32)', bg: 'var(--amber-bg)', text: 'var(--amber)', sub: 'var(--amber)' },
    rust: { border: 'rgba(184,55,20,0.32)', bg: 'var(--rust-bg)', text: 'var(--rust)', sub: 'var(--rust)' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2.5px solid ${c.border}`, background: c.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: Math.round(size * 0.42),
        fontWeight: 700, color: c.text, lineHeight: 1,
      }}>{value ?? '—'}</div>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: Math.round(size * 0.2),
        color: c.sub, marginTop: 1,
      }}>{grade}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 3px' }} />;
}

function StatCell({ label, value, sub, color, sm, last }) {
  const textColor = color ? `var(--${color})` : 'var(--ink)';
  return (
    <div style={{
      padding: '13px 14px', borderRight: last ? 'none' : '1px solid var(--line2)',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase',
        color: 'var(--ink4)', marginBottom: 5,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: sm ? 16 : 22, fontWeight: sm ? 500 : 700,
        color: textColor, lineHeight: 1, letterSpacing: '-0.01em',
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SpecRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '5.5px 0',
      borderBottom: '1px solid var(--line3)',
    }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink4)' }}>{label}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: 'var(--ink2)' }}>{value}</span>
    </div>
  );
}

function RateCell({ label, value, color, bottom }) {
  return (
    <div style={{
      padding: '10px 16px',
      borderRight: '1px solid var(--line2)',
      borderTop: bottom ? '1px solid var(--line2)' : 'none',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--ink4)', marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600,
        color: `var(--${color})`,
      }}>{value}</div>
    </div>
  );
}

function ActivityRow({ activity }) {
  const a = activity;
  const type = (a.activity_type || '').toLowerCase();
  const iconMap = { call: '📞', email: '✉', note: '📝', alert: '⚠', deal: '◈', task: '✓' };
  const colorMap = { call: 'blue', email: 'purple', note: 'amber', alert: 'rust', deal: 'green', task: 'blue' };
  const bg = colorMap[type] || 'blue';
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--line2)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11.5, flexShrink: 0, marginTop: 1,
        background: `var(--${bg}-bg)`, color: `var(--${bg})`,
      }}>{iconMap[type] || '•'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.4 }}>{a.notes || '—'}</div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 12, fontStyle: 'italic',
          color: 'var(--ink4)', marginTop: 2,
        }}>{a.created_by || 'System'}</div>
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: 'var(--ink4)',
        flexShrink: 0, paddingTop: 2,
      }}>{a.created_at ? fmtDate(a.created_at) : '—'}</div>
    </div>
  );
}

function DataTable({ title, headers, rows, emptyMsg, onRowClick }) {
  return (
    <div style={{
      background: 'var(--card)', borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600,
                letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)',
                borderBottom: '1px solid var(--line)', background: 'var(--bg)',
                fontFamily: "'Instrument Sans', sans-serif",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{
              padding: 24, textAlign: 'center', color: 'var(--ink4)', fontSize: 13,
            }}>{emptyMsg}</td></tr>
          ) : rows.map((row, ri) => (
            <tr key={ri}
              onClick={() => onRowClick?.(ri)}
              style={{
                borderBottom: '1px solid var(--line2)', cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = '#F8F6F2'; }}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '10px 14px', fontSize: 13, color: 'var(--ink2)', verticalAlign: 'middle',
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Shared Styles ───────────────────────────
const btnGhostStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '7px 13px', borderRadius: 7,
  fontFamily: "'Instrument Sans', sans-serif", fontSize: 12.5, fontWeight: 500,
  cursor: 'pointer', border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--ink3)',
  whiteSpace: 'nowrap', transition: 'all 0.12s',
};
const btnLinkStyle = {
  background: 'none', border: 'none', color: 'var(--blue2)',
  fontSize: 12.5, padding: '7px 10px', cursor: 'pointer',
  textDecoration: 'underline', textDecorationColor: 'rgba(100,128,162,0.3)',
  fontFamily: "'Instrument Sans', sans-serif",
};
const specSecLblStyle = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
  color: 'var(--ink4)', paddingBottom: 6, borderBottom: '1px solid var(--line)', marginBottom: 6,
};
