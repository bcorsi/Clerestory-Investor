'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';


/* ═══════════════════════════════════════════════════════════
   PropertyDetail — Investor Acquisition Intelligence View
   components/PropertyDetail.jsx
   Clerestory-Investor · clerestory-acq.vercel.app

   Correct column names (from Supabase schema):
   building_sf · land_acres · lot_sf · clear_height · dock_doors
   grade_doors · truck_court_depth · office_pct · power_amps
   power_volts · sprinklers · rail_served · evap_cooler
   parking_spaces · trailer_spots · eave_height · column_spacing
   bay_depth · year_built · zoning · owner · owner_type · tenant
   vacancy_status · lease_expiration · lease_type · in_place_rent
   market_rent · ai_score · building_score · building_grade
   catalyst_tags (ARRAY) · lat · lng · last_transfer_date
   last_sale_price · price_psf · property_name · address · city
   zip · market · submarket · ai_synthesis · ai_synthesis_at
   notes · prop_type · costar_property_id · lv_property_id
   ═══════════════════════════════════════════════════════════ */

// ── HELPERS ───────────────────────────────────────────────
const fmt = (n) => n == null ? '—' : Number(n).toLocaleString();
const fmtSF = (n) => { if (n == null) return '—'; if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`; return fmt(n); };
const fmtCurrency = (n) => { if (n == null) return '—'; if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`; if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`; return `$${fmt(n)}`; };
const fmtRent = (n) => n == null ? '—' : `$${Number(n).toFixed(2)}/SF`;
const fmtAcres = (n) => n == null ? '—' : `${Number(n).toFixed(2)} ac`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
const fmtDateFull = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
const monthsUntil = (d) => d ? Math.round((new Date(d) - new Date()) / (1e3*60*60*24*30.44)) : null;
const holdMonths = (d) => d ? Math.round((new Date() - new Date(d)) / (1e3*60*60*24*30.44)) : null;
const holdYears = (d) => d ? ((new Date() - new Date(d)) / (1e3*60*60*24*365.25)).toFixed(1) : null;
const holdMonths = (d) => d ? Math.round((new Date() - new Date(d)) / (1e3*60*60*24*30.44)) : null;
const holdYears = (d) => d ? ((new Date() - new Date(d)) / (1e3*60*60*24*365.25)).toFixed(1) : null;
const getEquityGap = (d) => {
  if (!d) return null;
  const yr = new Date(d).getFullYear();
  if (yr <= 2010) return { label: 'Pre-2010 basis — 3-5x appreciation', icon: '🔥', color: '#B83714', priority: 'Priority Call' };
  if (yr <= 2015) return { label: 'Pre-2015 basis — 2-3x appreciation', icon: '⭐', color: '#8C5A04', priority: 'Priority Call' };
  if (yr <= 2020) return { label: 'Pre-2020 basis — 1.5-2x appreciation', icon: '✅', color: '#4E6E96', priority: 'Call List' };
  return { label: 'Recent purchase', icon: '—', color: '#6E6860', priority: 'Call List' };
};
const getGrade = (s) => { if (s == null) return '—'; if (s >= 85) return 'A+'; if (s >= 70) return 'A'; if (s >= 55) return 'B+'; if (s >= 40) return 'B'; return 'C'; };
const getScoreColor = (s) => { if (s == null) return V.ink4; if (s >= 70) return V.blue; if (s >= 55) return V.amber; return V.ink4; };
const getOrsLabel = (s) => { if (s == null) return 'N/A'; if (s >= 75) return 'ACT NOW'; if (s >= 50) return 'WARM'; if (s >= 25) return 'WATCH'; return 'COOL'; };

// Color tokens matching mockup exactly
const V = {
  bg: '#F4F1EC', bg2: '#EAE6DF', card: '#FFFFFF',
  ink: '#0F0D09', ink2: '#2C2822', ink3: '#524D46', ink4: '#6E6860',
  blue: '#4E6E96', blue2: '#6480A2', blue3: '#89A8C6',
  blueBg: 'rgba(78,110,150,0.09)', blueBdr: 'rgba(78,110,150,0.30)',
  rust: '#B83714', rustBg: 'rgba(184,55,20,0.08)', rustBdr: 'rgba(184,55,20,0.30)',
  green: '#156636', greenBg: 'rgba(21,102,54,0.08)', greenBdr: 'rgba(21,102,54,0.28)',
  amber: '#8C5A04', amberBg: 'rgba(140,90,4,0.09)', amberBdr: 'rgba(140,90,4,0.28)',
  purple: '#5838A0', purpleBg: 'rgba(88,56,160,0.08)', purpleBdr: 'rgba(88,56,160,0.26)',
  teal: '#1A6B6B',
  line: 'rgba(0,0,0,0.08)', line2: 'rgba(0,0,0,0.055)', line3: 'rgba(0,0,0,0.034)',
  shadow: '0 1px 4px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.10),0 1px 4px rgba(0,0,0,0.06)',
  radius: 10,
};

// Building Score calculation (§01 from scores guide)
function calculateBuildingScore(p) {
  if (!p) return null;
  let total = 0;
  // Clear height (0–25 pts)
  if (p.clear_height) {
    if (p.clear_height >= 36) total += 25;
    else if (p.clear_height >= 32) total += 20;
    else if (p.clear_height >= 28) total += 15;
    else if (p.clear_height >= 24) total += 10;
    else total += 5;
  }
  // DH ratio (0–20 pts)
  const dhRatio = (p.dock_doors && p.building_sf) ? (p.dock_doors / (p.building_sf / 10000)) : 0;
  if (dhRatio >= 1.2) total += 20;
  else if (dhRatio >= 1.0) total += 16;
  else if (dhRatio >= 0.8) total += 12;
  else if (dhRatio >= 0.5) total += 8;
  else if (dhRatio > 0) total += 4;
  // Truck court (0–20 pts)
  if (p.truck_court_depth) {
    if (p.truck_court_depth >= 130) total += 20;
    else if (p.truck_court_depth >= 120) total += 16;
    else if (p.truck_court_depth >= 100) total += 12;
    else if (p.truck_court_depth >= 60) total += 8;
    else total += 4;
  }
  // Office % (0–15 pts) — lower is better for distribution
  if (p.office_pct != null) {
    if (p.office_pct <= 5) total += 15;
    else if (p.office_pct <= 10) total += 12;
    else if (p.office_pct <= 20) total += 8;
    else if (p.office_pct <= 30) total += 5;
    else total += 2;
  }
  // Power (0–10 pts)
  if (p.power_amps) {
    if (p.power_amps >= 2000) total += 10;
    else if (p.power_amps >= 1200) total += 8;
    else if (p.power_amps >= 600) total += 5;
    else total += 3;
  }
  // Vintage (0–10 pts)
  if (p.year_built) {
    const age = new Date().getFullYear() - p.year_built;
    if (age <= 10) total += 10;
    else if (age <= 20) total += 8;
    else if (age <= 30) total += 6;
    else if (age <= 40) total += 4;
    else total += 2;
  }
  return total;
}

function getScoreBreakdown(p) {
  if (!p) return [];
  const dhRatio = (p.dock_doors && p.building_sf) ? (p.dock_doors / (p.building_sf / 10000)) : 0;
  const items = [];
  // Clear height
  let pts = 0;
  if (p.clear_height) {
    if (p.clear_height >= 36) pts = 25; else if (p.clear_height >= 32) pts = 20;
    else if (p.clear_height >= 28) pts = 15; else if (p.clear_height >= 24) pts = 10; else pts = 5;
  }
  items.push({ label: `Clear Height (${p.clear_height || '—'}')`, pts, max: 25, color: pts >= 20 ? V.green : pts >= 15 ? V.amber : V.ink4 });
  // DH ratio
  pts = 0;
  if (dhRatio >= 1.2) pts = 20; else if (dhRatio >= 1.0) pts = 16; else if (dhRatio >= 0.8) pts = 12;
  else if (dhRatio >= 0.5) pts = 8; else if (dhRatio > 0) pts = 4;
  items.push({ label: `DH Ratio (${dhRatio.toFixed(2)})`, pts, max: 20, color: pts >= 16 ? V.green : pts >= 12 ? V.amber : V.ink4 });
  // Truck court
  pts = 0;
  if (p.truck_court_depth) {
    if (p.truck_court_depth >= 130) pts = 20; else if (p.truck_court_depth >= 120) pts = 16;
    else if (p.truck_court_depth >= 100) pts = 12; else if (p.truck_court_depth >= 60) pts = 8; else pts = 4;
  }
  items.push({ label: `Truck Court (${p.truck_court_depth || '—'}')`, pts, max: 20, color: pts >= 16 ? V.green : pts >= 12 ? V.amber : V.ink4 });
  // Office %
  pts = 0;
  if (p.office_pct != null) {
    if (p.office_pct <= 5) pts = 15; else if (p.office_pct <= 10) pts = 12;
    else if (p.office_pct <= 20) pts = 8; else if (p.office_pct <= 30) pts = 5; else pts = 2;
  }
  items.push({ label: `Office % (${p.office_pct ?? '—'}%)`, pts, max: 15, color: pts >= 12 ? V.green : pts >= 8 ? V.amber : V.ink4 });
  // Power
  pts = 0;
  if (p.power_amps) {
    if (p.power_amps >= 2000) pts = 10; else if (p.power_amps >= 1200) pts = 8;
    else if (p.power_amps >= 600) pts = 5; else pts = 3;
  }
  items.push({ label: `Power (${p.power_amps ? `${fmt(p.power_amps)}A` : '—'})`, pts, max: 10, color: pts >= 8 ? V.green : pts >= 5 ? V.amber : V.ink4 });
  // Vintage
  pts = 0;
  if (p.year_built) {
    const age = new Date().getFullYear() - p.year_built;
    if (age <= 10) pts = 10; else if (age <= 20) pts = 8; else if (age <= 30) pts = 6;
    else if (age <= 40) pts = 4; else pts = 2;
  }
  items.push({ label: `Vintage (${p.year_built || '—'})`, pts, max: 10, color: pts >= 8 ? V.green : pts >= 6 ? V.amber : V.ink4 });
  return items;
}

const getTagStyle = (tag) => {
  if (!tag) return { bg: V.blueBg, bdr: V.blueBdr, c: V.blue };
  const t = tag.toLowerCase();
  if (t.includes('warn') || t.includes('nod') || t.includes('vacant') || t.includes('owner') || t.includes('legacy') || t.includes('long hold') || t.includes('age 55') || t.includes('expired')) return { bg: V.rustBg, bdr: V.rustBdr, c: V.rust };
  if (t.includes('lease') || t.includes('partial') || t.includes('below market') || t.includes('value')) return { bg: V.amberBg, bdr: V.amberBdr, c: V.amber };
  if (t.includes('slb') || t.includes('occupied') || t.includes('market')) return { bg: V.greenBg, bdr: V.greenBdr, c: V.green };
  if (t.includes('capex') || t.includes('roof') || t.includes('vintage') || t.includes('low clear') || t.includes('coverage')) return { bg: V.purpleBg, bdr: V.purpleBdr, c: V.purple };
  if (t.includes('institutional') || t.includes('investment') || t.includes('grade')) return { bg: V.blueBg, bdr: V.blueBdr, c: V.blue };
  return { bg: V.blueBg, bdr: V.blueBdr, c: V.blue };
};

const ACT_ICONS = { call: { emoji: '📞', bg: V.blueBg, c: V.blue }, email: { emoji: '✉', bg: V.purpleBg, c: V.purple }, note: { emoji: '📝', bg: V.amberBg, c: V.amber }, meeting: { emoji: '🤝', bg: V.greenBg, c: V.green }, alert: { emoji: '⚠', bg: V.rustBg, c: V.rust }, deal: { emoji: '◈', bg: V.greenBg, c: V.green }, task: { emoji: '✓', bg: V.blueBg, c: V.blue } };
const getActIcon = (type) => ACT_ICONS[type] || ACT_ICONS.note;

const TABS = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'buildings', label: 'Buildings' },
  { key: 'apns', label: 'APNs' },
  { key: 'lease_comps', label: 'Lease Comps' },
  { key: 'sale_comps', label: 'Sale Comps' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'deals', label: 'Deals' },
  { key: 'leads', label: 'Leads' },
  { key: 'files', label: 'Files' },
];

// ── MAIN COMPONENT ────────────────────────────────────────
export default function PropertyDetail({ id, inline = false }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leaseComps, setLeaseComps] = useState([]);
  const [saleComps, setSaleComps] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [apns, setApns] = useState([]);
  const [warnNotice, setWarnNotice] = useState(null);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [synthOpen, setSynthOpen] = useState(true);
  const [synthLoading, setSynthLoading] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const mapRef = useRef(null);
  const mapInitRef = useRef(false);

  // ── FETCH ALL DATA ──────────────────────────────────────
  useEffect(() => { if (id) loadAll(id); }, [id]);

  async function loadAll(propId) {
    setLoading(true);
    try {
      const { data: prop, error } = await supabase.from('properties').select('*').eq('id', propId).single();
      if (error) throw error;
      setProperty(prop);
      setMemoText(prop.notes || '');

      // Parallel fetches
      const [actRes, ctRes, dlRes, ldRes, bldRes, apnRes, warnRes] = await Promise.all([
        supabase.from('activities').select('*').eq('property_id', propId).order('created_at', { ascending: false }).limit(20),
        supabase.from('contacts').select('id, first_name, last_name, title, company, phone, email').eq('property_id', propId).limit(10),
        supabase.from('deals').select('id, deal_name, stage, deal_type, deal_value, commission_est, created_at').eq('property_id', propId).order('created_at', { ascending: false }).limit(5),
        supabase.from('leads').select('id, lead_name, company, stage, ai_score, catalyst_tags').eq('property_id', propId).limit(5),
        supabase.from('property_buildings').select('*').eq('property_id', propId).order('created_at', { ascending: true }),
        supabase.from('property_apns').select('*').eq('property_id', propId),
        supabase.from('warn_notices').select('id, company, notice_date, effective_date, employees').eq('matched_property_id', propId).limit(1).maybeSingle(),
      ]);
      setActivities(actRes.data || []);
      setContacts(ctRes.data || []);
      setDeals(dlRes.data || []);
      setLeads(ldRes.data || []);
      setBuildings(bldRes.data || []);
      setApns(apnRes.data || []);
      if (warnRes.data) setWarnNotice(warnRes.data);

      // Comps by submarket
      if (prop?.submarket) {
        const [lcRes, scRes] = await Promise.all([
          supabase.from('lease_comps').select('*').eq('submarket', prop.submarket).order('created_at', { ascending: false }).limit(8),
          supabase.from('sale_comps').select('*').eq('submarket', prop.submarket).order('created_at', { ascending: false }).limit(5),
        ]);
        setLeaseComps(lcRes.data || []);
        setSaleComps(scRes.data || []);
      }
    } catch (e) {
      console.error('PropertyDetail load error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ── MAP INIT ────────────────────────────────────────────
  useEffect(() => {
    if (!property?.lat || !property?.lng || mapInitRef.current) return;
    if (typeof window === 'undefined') return;
    import('leaflet').then((L) => {
      if (mapInitRef.current) return;
      mapInitRef.current = true;
      const map = L.map(mapRef.current, { zoomControl: false, scrollWheelZoom: false, dragging: false, doubleClickZoom: false, attributionControl: false }).setView([property.lat, property.lng], 17);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20 }).addTo(map);
      const icon = L.divIcon({ className: '', html: `<div style="width:14px;height:14px;border-radius:50%;background:${V.blue};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
      L.marker([property.lat, property.lng], { icon }).addTo(map);
    });
  }, [property]);

  // ── AI SYNTHESIS ────────────────────────────────────────
  const generateSynthesis = useCallback(async () => {
    if (!property || synthLoading) return;
    setSynthLoading(true);
    try {
      const context = {
        address: property.address, city: property.city, submarket: property.submarket,
        building_sf: property.building_sf, clear_height: property.clear_height,
        dock_doors: property.dock_doors, truck_court_depth: property.truck_court_depth,
        year_built: property.year_built, owner: property.owner, owner_type: property.owner_type,
        tenant: property.tenant, vacancy_status: property.vacancy_status,
        lease_expiration: property.lease_expiration, in_place_rent: property.in_place_rent,
        market_rent: property.market_rent, lease_type: property.lease_type,
        last_transfer_date: property.last_transfer_date, catalyst_tags: property.catalyst_tags,
        building_score: calcScore, activities: activities.slice(0, 5).map(a => ({ type: a.activity_type, subject: a.subject, body: a.body, date: a.created_at })),
      };
      const signalStr = (() => {
  const sigs = [];
  const ls = property.last_transfer_date ? new Date(property.last_transfer_date) : null;
  if (ls) {
    const hm = Math.round((new Date() - ls) / (1e3*60*60*24*30.44));
    const sy = ls.getFullYear();
    if (hm >= 240) sigs.push('LEGACY hold ' + hm + 'mo');
    else if (hm >= 120) sigs.push('Long hold ' + hm + 'mo');
    else if (hm >= 84) sigs.push('Mature hold ' + hm + 'mo');
    else if (hm >= 24) sigs.push('Prime hold ' + hm + 'mo');
    if (sy <= 2010) sigs.push('Pre-2010 buy');
    else if (sy <= 2015) sigs.push('Pre-2015 buy');
    else if (sy <= 2019) sigs.push('Pre-COVID buy');
  }
  const v = (property.vacancy_status || '').toLowerCase();
  if (v === 'vacant' || v === 'available') sigs.push('VACANT');
  else if (v.includes('partial')) sigs.push('Partial vacant');
  if (property.owner_type) sigs.push(property.owner_type);
  return sigs.join(' · ');
})();
const prompt = `You are Clerestory, an AI acquisition intelligence system for institutional industrial real estate investors in Southern California.

Write a deal intelligence brief for this property. Follow this pattern precisely:
- Lead with the COMPANY — who they are, what they do, revenue if known, employee count
- Then OWNER SIGNAL — founder age/succession, PE backing, out-of-state HQ, estate/trust, hold period
- Then PROPERTY SIGNAL — hold period, basis dislocation, vacancy, lease vintage, rent spread
- Then COMP EVIDENCE — cite specific nearby sales with $/SF and buyer name
- End with CLEAR VERDICT — one sentence action recommendation

DO NOT write generic analysis. DO NOT hedge with "may" or "might". Be specific. Use numbers. 4-5 sentences max.

PROPERTY: ${property.address}, ${property.city}
Owner: ${property.owner} (${property.owner_type || 'Unknown'})
${property.last_transfer_date ? 'Acquired: ' + new Date(property.last_transfer_date).getFullYear() : ''}
Building: ${property.building_sf ? Number(property.building_sf).toLocaleString() + ' SF' : '—'} · ${property.clear_height ? property.clear_height + "' clear" : '—'} · ${property.year_built || '—'}
Tenant: ${property.tenant || 'Vacant'} · ${property.vacancy_status || '—'}
${property.in_place_rent ? 'Rent: $' + Number(property.in_place_rent).toFixed(2) + '/SF' : ''}
${property.market_rent ? 'Market: $' + Number(property.market_rent).toFixed(2) + '/SF' : ''}
${signalStr ? 'Signals: ' + signalStr : ''}
Tags: ${(property.catalyst_tags || []).join(', ') || 'None'}`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'property_synthesis' }),
      });
      const data = await res.json();
      const content = data.content || data.text || '';

      // Save to properties
      await supabase.from('properties').update({ ai_synthesis: content, ai_synthesis_at: new Date().toISOString() }).eq('id', property.id);

      // Save to ai_generations
      await supabase.from('ai_generations').insert({
        generation_type: 'property_synthesis',
        property_id: property.id,
        content,
        input_context: context,
        model_used: 'claude-sonnet-4-20250514',
      });

      setProperty(prev => ({ ...prev, ai_synthesis: content, ai_synthesis_at: new Date().toISOString() }));
    } catch (e) {
      console.error('Synthesis error:', e);
    } finally {
      setSynthLoading(false);
    }
  }, [property, synthLoading, activities]);

  // ── SAVE MEMO ───────────────────────────────────────────
  const saveMemo = useCallback(async () => {
    if (!property) return;
    setMemoSaving(true);
    try {
      await supabase.from('properties').update({ notes: memoText }).eq('id', property.id);
      // Also log to ai_generations
      await supabase.from('ai_generations').insert({
        generation_type: 'opportunity_memo',
        property_id: property.id,
        content: memoText,
        input_context: { source: 'manual_edit', address: property.address },
      });
    } catch (e) { console.error('Memo save error:', e); }
    finally { setMemoSaving(false); }
  }, [property, memoText]);

  // ── LOADING / ERROR ─────────────────────────────────────
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: V.ink4, fontSize: 16 }}>Loading property…</div>;
  if (!property) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: V.ink4, fontSize: 16 }}>Property not found</div>;

  // ── COMPUTED VALUES ─────────────────────────────────────
  const tags = Array.isArray(property.catalyst_tags) ? property.catalyst_tags : [];
  const calcScore = property.building_score || calculateBuildingScore(property);
  const calcGrade = property.building_grade || getGrade(calcScore);
  const scoreBreakdown = getScoreBreakdown(property);
  const scoreTotal = scoreBreakdown.reduce((s, i) => s + i.pts, 0);
  const dhRatio = (property.dock_doors && property.building_sf) ? (property.dock_doors / (property.building_sf / 10000)).toFixed(2) : null;
  const coverage = (property.building_sf && property.land_acres) ? ((property.building_sf / (property.land_acres * 43560)) * 100).toFixed(1) : null;
  const mo = monthsUntil(property.lease_expiration);
  const estValue = property.last_sale_price || (property.building_sf && property.price_psf ? property.building_sf * property.price_psf : null);

  const tabCounts = {
    timeline: activities.length,
    buildings: buildings.length || 1,
    apns: apns.length,
    lease_comps: leaseComps.length,
    sale_comps: saleComps.length,
    contacts: contacts.length,
    deals: deals.length,
    leads: leads.length,
  };

  // ── RENDER ──────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Instrument Sans', sans-serif", color: V.ink, minWidth: 0 }}>

      {/* ═══ HERO SATELLITE MAP ═══ */}
      <div style={{ height: 300, position: 'relative', overflow: 'hidden', background: '#1A2130' }}>
        {property.lat && property.lng ? (
          <div ref={mapRef} style={{ width: '100%', height: 300 }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: V.ink4, fontSize: 14 }}>No coordinates — add lat/lng to enable satellite view</div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,8,5,0.82) 0%, rgba(10,8,5,0.15) 55%, transparent 100%)', pointerEvents: 'none', zIndex: 400 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, padding: '20px 28px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-0.01em', marginBottom: 8, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {property.property_name || property.address || '—'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {property.vacancy_status && <HeroBadge color="green">{property.vacancy_status.includes('ccupied') ? '● ' : ''}{property.vacancy_status}</HeroBadge>}
            {property.lease_expiration && <HeroBadge color="amber">Lease Exp. {fmtDate(property.lease_expiration)}</HeroBadge>}
            {property.prop_type && property.building_sf && <HeroBadge color="blue">{property.prop_type} · {fmtSF(property.building_sf)} SF</HeroBadge>}
            {property.owner_type && <HeroBadge color="blue">{property.owner_type}</HeroBadge>}
             {property.building_status && property.building_status !== 'Existing' && <HeroBadge color="amber">{property.building_status}</HeroBadge>}
          </div>
        </div>
      </div>

      {/* ═══ ACTION BAR ═══ */}
      <div style={{ background: V.bg2, borderBottom: `1px solid ${V.line}`, padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Building Score chip */}
        <ScoreChip label="Bldg Score" score={calcScore} grade={calcGrade} color={V.blue} borderColor={V.blueBdr} />
        {/* Portfolio Fit chip — placeholder */}
        <ScoreChip label="Portfolio Fit" score={property.ai_score} grade={getGrade(property.ai_score)} color={V.teal} borderColor="rgba(26,107,107,0.30)" />
        {/* ORS chip */}
        {property.ai_score != null && (
          <ScoreChip label="Seller Readiness" score={property.probability || '—'} grade={getOrsLabel(property.probability)} color={V.rust} borderColor={V.rustBdr} />
        )}
        <Divider />
        <Btn ghost onClick={() => {}}><span>📞</span> Log Call</Btn>
        <Btn ghost onClick={() => {}}><span>✉</span> Log Email</Btn>
        <Btn ghost onClick={() => {}}><span>📝</span> Add Note</Btn>
        <Btn ghost onClick={() => {}}><span>+</span> Task</Btn>
        <Divider />
        {/* External links */}
        {property.lat && property.lng && <BtnLink onClick={() => window.open(`https://www.google.com/maps/@${property.lat},${property.lng},17z`, '_blank')}>📍 Google Maps</BtnLink>}
        {property.costar_property_id && <BtnLink onClick={() => window.open(`https://gateway.costar.com/property/${property.costar_property_id}`, '_blank')}>🗂 CoStar</BtnLink>}
        <BtnLink onClick={() => window.open(`https://maps.assessor.lacounty.gov/`, '_blank')}>🗺 LA County GIS</BtnLink>
        <Divider />
        <Btn ghost>⚙ Edit</Btn>
        <Btn ghost>📄 Export IC Memo</Btn>
        <div style={{ marginLeft: 'auto' }} />
        <Btn green>◈ Convert to Acquisition</Btn>
      </div>

      {/* ═══ INNER CONTENT ═══ */}
      <div style={{ padding: '18px 28px 0' }}>

        {/* ═══ AI SYNTHESIS ═══ */}
        <div style={{ background: V.card, borderRadius: V.radius, boxShadow: V.shadow, border: '1px solid rgba(88,56,160,0.18)', overflow: 'hidden', marginBottom: 16, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, #8B6FCC, ${V.purple})` }} />
          <div onClick={() => setSynthOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px 11px 20px', borderBottom: synthOpen ? '1px solid rgba(88,56,160,0.12)' : 'none', cursor: 'pointer' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: V.purple }}>✦</span>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: V.purple }}>AI Acquisition Intelligence</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12.5, fontStyle: 'italic', color: V.ink4 }}>Property Status Report · {property.address || '—'}</span>
              </div>
              {generateSignalString(property) && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: V.ink4, marginTop: 4, paddingLeft: 21 }}>{generateSignalString(property)}</div>}
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic', color: V.purple, cursor: 'pointer' }}>{synthOpen ? 'Hide ▴' : 'Show ▾'}</span>
          </div>
          {synthOpen && (
            <>
              <div style={{ padding: '18px 22px 20px' }}>
                {property.ai_synthesis ? (
                  <div style={{ fontSize: 13.5, lineHeight: 1.72, color: V.ink2, whiteSpace: 'pre-wrap' }}>{property.ai_synthesis}</div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 14, color: V.ink4, marginBottom: 10 }}>No synthesis generated yet</div>
                    <button onClick={generateSynthesis} disabled={synthLoading} style={{ ...btnStyle, background: V.purple, color: '#fff', borderColor: V.purple, opacity: synthLoading ? 0.6 : 1 }}>
                      {synthLoading ? '⟳ Generating…' : '✦ Generate AI Synthesis'}
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 22px', borderTop: '1px solid rgba(88,56,160,0.10)', background: 'rgba(88,56,160,0.02)' }}>
                <button onClick={generateSynthesis} disabled={synthLoading} style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: V.purple, cursor: 'pointer', background: 'none', border: '1px solid rgba(88,56,160,0.22)', borderRadius: 6, padding: '4px 11px' }}>↻ Regenerate</button>
                <button onClick={() => navigator.clipboard.writeText(property.ai_synthesis || '')} style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: V.purple, cursor: 'pointer', background: 'none', border: '1px solid rgba(88,56,160,0.22)', borderRadius: 6, padding: '4px 11px' }}>📋 Copy</button>
                {property.ai_synthesis_at && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: V.ink4, marginLeft: 'auto' }}>Generated {fmtDateFull(property.ai_synthesis_at)}</span>}
              </div>
            </>
          )}
        </div>

        {/* ═══ STAT ROW ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, background: V.card, borderRadius: V.radius, boxShadow: V.shadow, border: `1px solid ${V.line2}`, overflow: 'hidden', marginBottom: 16 }}>
          <StatCell label="Property SF" value={fmtSF(property.building_sf)} sub={buildings.length ? `${buildings.length} building${buildings.length > 1 ? 's' : ''}` : '1 building'} />
          <StatCell label="Land" value={fmtAcres(property.land_acres)} sub={apns.length ? `${apns.length} APNs` : '—'} />
          <StatCell label="In-Place Rent" value={fmtRent(property.in_place_rent)} sub={property.lease_type ? `${property.lease_type} / mo` : '—'} color={V.blue} sm />
          <StatCell label="Market Rent" value={property.market_rent ? fmtRent(property.market_rent) : '—'} sub="NNN est." color={V.green} sm />
          <StatCell label="Lease Expiry" value={fmtDate(property.lease_expiration)} sub={mo != null ? `${mo} months` : '—'} color={mo != null && mo <= 24 ? V.amber : undefined} sm />
          <StatCell label="Est. Value" value={estValue ? fmtCurrency(estValue) : '—'} sub={property.price_psf ? `~$${fmt(Math.round(property.price_psf))}/SF` : '—'} />
          <StatCell label="Year Built" value={property.year_built || '—'} sub={property.zoning || '—'} last />
        </div>

        {/* ═══ BUILDING SCORE CARD ═══ */}
        <div style={{ background: V.card, borderRadius: V.radius, boxShadow: V.shadow, border: `1px solid ${V.line2}`, overflow: 'hidden', marginBottom: 16 }}>
          {/* Header with ring */}
          <div onClick={() => setSpecsOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', borderBottom: `1px solid ${V.line}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', border: `2.5px solid ${V.blueBdr}`, background: V.blueBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, fontWeight: 700, color: V.blue, lineHeight: 1 }}>{calcScore ?? '—'}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: V.blue2, marginTop: 1 }}>{calcGrade}</div>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: V.ink2 }}>Building Score — {calcGrade} · {calcScore >= 85 ? 'Top-tier' : calcScore >= 70 ? 'Strong' : calcScore >= 55 ? 'Average' : 'Below avg'} {property.prop_type || 'industrial'} asset</div>
                <div style={{ fontSize: 12, color: V.ink4, marginTop: 2 }}>
                  {[
                    property.clear_height ? `${property.clear_height}' clear` : null,
                    property.dock_doors ? `${property.dock_doors} dock-high` : null,
                    property.truck_court_depth ? `${property.truck_court_depth}' truck court` : null,
                    property.sprinklers || null,
                    property.power_amps ? `${fmt(property.power_amps)}A power` : null,
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic', color: V.blue2, cursor: 'pointer' }}>{specsOpen ? 'Hide specs ▴' : 'Show all specs ▾'}</span>
          </div>
          {/* Spec summary strip — always visible */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${V.line}` }}>
            {[
              { lbl: 'Clear Ht', val: property.clear_height ? `${property.clear_height}'` : '—', hi: property.clear_height >= 28 },
              { lbl: 'Dock Doors', val: property.dock_doors ? `${property.dock_doors} DH${property.grade_doors ? ` · ${property.grade_doors} GL` : ''}` : '—', hi: property.dock_doors >= 10 },
              { lbl: 'Truck Court', val: property.truck_court_depth ? `${property.truck_court_depth}'` : '—', hi: property.truck_court_depth >= 120 },
              { lbl: 'Office %', val: property.office_pct != null ? `${property.office_pct}%` : '—' },
              { lbl: 'Power', val: property.power_amps ? `${fmt(property.power_amps)}A${property.power_volts ? `/${property.power_volts}V` : ''}` : '—' },
              { lbl: 'Sprinklers', val: property.sprinklers || '—' },
              { lbl: 'DH Ratio', val: dhRatio ? `${dhRatio}/10kSF` : '—', hi: dhRatio >= 1.0 },
              { lbl: 'Coverage', val: coverage ? `${coverage}%` : '—' },
            ].map((item, i) => (
              <div key={i} style={{ flex: 1, padding: '9px 12px', borderRight: i < 7 ? `1px solid ${V.line2}` : 'none', textAlign: 'center' }}>
                <div style={{ fontSize: 9.5, color: V.ink4, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>{item.lbl}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: item.hi ? V.blue : V.ink2 }}>{item.val}</div>
              </div>
            ))}
          </div>
          {/* Expanded spec grid + score breakdown */}
          {specsOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '14px 18px', borderRight: `1px solid ${V.line}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: V.ink4, paddingBottom: 6, borderBottom: `1px solid ${V.line}`, marginBottom: 6 }}>Structure</div>
                {[
                  ['Building SF', fmt(property.building_sf)],
                  ['Land Area', property.land_acres ? `${fmtAcres(property.land_acres)} / ${fmt(property.lot_sf || Math.round(property.land_acres * 43560))} SF` : '—'],
                  ['Year Built', property.year_built || '—'],
                  ['Clear Height', property.clear_height ? `${property.clear_height}'` : '—', property.clear_height >= 28],
                  ['Eave Height', property.eave_height ? `${property.eave_height}'` : '—'],
                  ['Column Spacing', property.column_spacing || '—'],
                  ['Bay Depth', property.bay_depth ? `${property.bay_depth}'` : '—'],
                ].map(([k, v, hi], i) => <SpecRow key={i} label={k} value={v} hi={hi} />)}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: V.ink4, paddingBottom: 6, borderBottom: `1px solid ${V.line}`, marginBottom: 6, marginTop: 12 }}>Loading</div>
                {[
                  ['Dock-High Doors', property.dock_doors || '—'],
                  ['Grade-Level Doors', property.grade_doors || '—'],
                  ['Truck Court', property.truck_court_depth ? `${property.truck_court_depth}'` : '—'],
                  ['Trailer Spots', property.trailer_spots || '—'],
                  ['Parking Spaces', property.parking_spaces || '—'],
                ].map(([k, v], i) => <SpecRow key={i} label={k} value={v} />)}
              </div>
              <div style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: V.ink4, paddingBottom: 6, borderBottom: `1px solid ${V.line}`, marginBottom: 6 }}>Systems</div>
                {[
                  ['Power', property.power_amps ? `${fmt(property.power_amps)}A / ${property.power_volts || '—'}V / 3Ø` : '—', property.power_amps >= 1200],
                  ['Sprinklers', property.sprinklers || '—'],
                  ['Rail Served', property.rail_served ? 'Yes' : 'No'],
                  ['Evap Cooler', property.evap_cooler ? 'Yes' : 'No'],
                  ['Zoning', property.zoning || '—'],
                  ['Office SF', property.office_pct != null && property.building_sf ? `${fmt(Math.round(property.building_sf * property.office_pct / 100))} (${property.office_pct}%)` : '—'],
                  ['Warehouse SF', property.office_pct != null && property.building_sf ? fmt(Math.round(property.building_sf * (1 - property.office_pct / 100))) : '—'],
                ].map(([k, v, hi], i) => <SpecRow key={i} label={k} value={v} hi={hi} />)}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: V.ink4, paddingBottom: 6, borderBottom: `1px solid ${V.line}`, marginBottom: 6, marginTop: 12 }}>Calculated</div>
                {[
                  ['DH Ratio', dhRatio ? `${dhRatio} / 10,000 SF` : '—', dhRatio >= 1.0],
                  ['Coverage Ratio', coverage ? `${coverage}%` : '—'],
                  ['Land-to-Building', property.land_acres && property.building_sf ? `${((property.land_acres * 43560) / property.building_sf).toFixed(2)}×` : '—'],
                ].map(([k, v, hi], i) => <SpecRow key={i} label={k} value={v} hi={hi} />)}
                {/* Score breakdown */}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: V.ink4, paddingBottom: 6, borderBottom: `1px solid ${V.line}`, marginBottom: 10, marginTop: 12 }}>Score Breakdown</div>
                {scoreBreakdown.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: V.ink3, width: 140, flexShrink: 0 }}>{item.label}</span>
                    <div style={{ flex: 1, height: 5, background: V.bg2, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(item.pts / item.max) * 100}%`, background: item.color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: V.ink3, width: 40, textAlign: 'right', flexShrink: 0 }}>{item.pts}/{item.max}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 7, borderTop: `1px solid ${V.line3}` }}>
                  <span style={{ fontSize: 11, color: V.ink4 }}>Total</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: V.blue, fontWeight: 600 }}>{scoreTotal}/100</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ TABS ═══ */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${V.line}`, marginBottom: 16 }}>
          {TABS.map(tab => (
            <div key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '10px 15px', fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s', marginBottom: -1,
              color: activeTab === tab.key ? V.blue : V.ink4,
              borderBottom: `2px solid ${activeTab === tab.key ? V.blue : 'transparent'}`,
              fontWeight: activeTab === tab.key ? 500 : 400,
            }}>
              {tab.label}
              {tabCounts[tab.key] > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, background: V.bg2, border: `1px solid ${V.line}`, borderRadius: 20, padding: '1px 6px', marginLeft: 4, color: V.ink4 }}>{tabCounts[tab.key]}</span>}
            </div>
          ))}
        </div>

        {/* ═══ TAB CONTENT — 2-col body ═══ */}
        {activeTab === 'timeline' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
            {/* LEFT — Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: V.card, borderRadius: V.radius, boxShadow: V.shadow, border: `1px solid ${V.line2}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: `1px solid ${V.line}` }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: V.ink3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: V.rust, animation: 'blink 1.4s infinite' }} /> Activity Timeline
                  </div>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13.5, fontStyle: 'italic', color: V.blue2, cursor: 'pointer' }}>+ Log Activity</span>
                </div>
                {activities.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: V.ink4, fontSize: 14 }}>No activity yet — log a call or note to start the timeline</div>
                ) : activities.slice(0, 6).map(act => {
                  const icon = getActIcon(act.activity_type);
                  return (
                    <div key={act.id} style={{ display: 'flex', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${V.line2}` }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, flexShrink: 0, marginTop: 1, background: icon.bg, color: icon.c }}>{icon.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, color: V.ink2, lineHeight: 1.4 }}><strong style={{ fontWeight: 500 }}>{act.subject || act.activity_type}</strong>{act.body ? ` — ${act.body}` : ''}</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, fontStyle: 'italic', color: V.ink4, marginTop: 2 }}>Briana Corso{act.duration_minutes ? ` · ${act.duration_minutes} min` : ''}</div>
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: V.ink4, flexShrink: 0, paddingTop: 2 }}>{fmtDateShort(act.created_at)}</div>
                    </div>
                  );
                })}
                {activities.length > 6 && (
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: V.bg, borderTop: `1px solid ${V.line}` }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13.5, fontStyle: 'italic', color: V.blue2 }}>View all {activities.length} activities & notes →</span>
                  </div>
                )}
              </div>

              {/* Owner + Tenant below timeline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* OWNER CARD — hold period + equity gap */}
<Card>
  <CardHeader title="Owner Profile" action="View Record →" />
  <CardRow label="Company" value={property.owner || '—'} />
  <CardRow label="Owner Type" value={property.owner_type || '—'} />
  <CardRow label="Acquired" value={property.last_transfer_date ? new Date(property.last_transfer_date).getFullYear().toString() : '—'} mono />
  <CardRow label="Hold Period" value={(() => {
    const hm = holdMonths(property.last_transfer_date);
    const hy = holdYears(property.last_transfer_date);
    if (hm == null) return '—';
    return `${hm} months (${hy} yrs)`;
  })()} mono />
  {property.last_sale_price && <CardRow label="Basis" value={`$${Number(property.last_sale_price).toLocaleString()}${property.price_psf ? ` ($${Number(property.price_psf).toFixed(0)}/SF)` : ''}`} mono />}
  {(() => {
   const eq = (() => {
  const d = property.last_transfer_date;
  if (!d) return null;
  const yr = new Date(d).getFullYear();
  if (yr <= 2010) return { label: 'Pre-2010 basis — 3-5x appreciation', icon: '🔥', color: '#B83714', priority: 'Priority Call' };
  if (yr <= 2015) return { label: 'Pre-2015 basis — 2-3x appreciation', icon: '⭐', color: '#8C5A04', priority: 'Priority Call' };
  if (yr <= 2020) return { label: 'Pre-2020 basis — 1.5-2x appreciation', icon: '✅', color: '#4E6E96', priority: 'Call List' };
  return { label: 'Recent purchase', icon: '—', color: '#6E6860', priority: 'Call List' };
})();
    if (!eq) return null;
    return (
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${V.line2}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{eq.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: eq.color }}>{eq.label}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: V.ink4, marginTop: 2 }}>
              {eq.priority} · {holdYears(property.last_transfer_date)} yr hold
            </div>
          </div>
        </div>
      </div>
    );
  })()}
  {property.owner_account_id && <CardRow label="Account" value="View Account →" link />}
</Card>
                {/* TENANT / LEASE CARD */}
                <Card>
                  <CardHeader title="Tenant" />
                  <div style={{ padding: '14px 16px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: V.ink4, marginBottom: 2 }}>Tenant</div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: V.ink2, marginBottom: 2 }}>{property.tenant || 'Vacant'}</div>
                    {property.lease_expiration && (
                      <>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: V.rust, lineHeight: 1, marginTop: 4, letterSpacing: '-0.02em' }}>{fmtDate(property.lease_expiration)}</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic', color: V.rust, marginTop: 2 }}>{mo != null ? `${mo} months remaining` : ''}</div>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${V.line2}` }}>
                    <RateCell label="Current Rate" value={fmtRent(property.in_place_rent)} color={V.rust} />
                    <RateCell label="Market Rate" value={property.market_rent ? fmtRent(property.market_rent) : '—'} color={V.green} />
                    <RateCell label="Type" value={property.lease_type || '—'} color={V.blue} bottom />
                    <RateCell label="Spread" value={property.in_place_rent && property.market_rent ? `+${(((property.market_rent - property.in_place_rent) / property.in_place_rent) * 100).toFixed(0)}%` : '—'} color={V.green} bottom />
                  </div>
                </Card>
              </div>
            </div>

            {/* RIGHT — Sidebar cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* ORS — Seller Readiness */}
              <Card>
                <CardHeader title="Seller Readiness (ORS)" action="Expand tiers →" />
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', border: `3px solid ${V.rustBdr}`, background: V.rustBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: V.rust, lineHeight: 1 }}>{property.probability ?? '—'}</div>
                    <div style={{ fontSize: 8, color: V.ink4, marginTop: 1 }}>/ 100</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: V.rust, marginBottom: 3 }}>{getOrsLabel(property.probability)}</div>
                    <div style={{ fontSize: 12, color: V.ink3, lineHeight: 1.5 }}>
                      {[
                        mo != null && mo <= 24 ? `Lease expiry ${mo}mo` : null,
                        property.last_transfer_date ? `Hold ${new Date().getFullYear() - new Date(property.last_transfer_date).getFullYear()} years` : null,
                        tags.includes('SLB Corridor') ? 'SLB corridor' : null,
                      ].filter(Boolean).join(' + ') || 'No strong signals detected'}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {mo != null && mo <= 24 && <SignalBar label={`Lease expiry ${mo} months`} pts={mo <= 12 ? 25 : 15} color={V.rust} />}
                  {property.last_transfer_date && (() => { const yr = new Date().getFullYear() - new Date(property.last_transfer_date).getFullYear(); return yr >= 10 ? <SignalBar label={`Hold period ${yr} years`} pts={yr >= 20 ? 25 : 15} color={V.amber} /> : null; })()}
                  {tags.includes('Owner-User') && <SignalBar label="Owner-user occupant" pts={10} color={V.amber} />}
                  {warnNotice && <SignalBar label="WARN filing linked" pts={20} color={V.rust} />}
                </div>
              </Card>

              {/* Catalysts */}
              <Card>
                <CardHeader title="Active Catalysts" action="+ Add" />
                {tags.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: V.ink4 }}>No catalysts assigned</div>
                ) : tags.map((tag, i) => {
                  const s = getTagStyle(tag);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', borderBottom: `1px solid ${V.line2}`, cursor: 'pointer' }}>
                      <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: s.bg, border: `1px solid ${s.bdr}`, color: s.c }}>{tag}</span>
                    </div>
                  );
                })}
              </Card>

              {/* AI Acquisition Signal */}
              <div style={{ background: V.blueBg, border: `1px solid ${V.blueBdr}`, borderRadius: V.radius, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: 'rgba(78,110,150,0.12)', borderBottom: `1px solid ${V.blueBdr}`, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 13 }}>✦</span>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: V.blue }}>AI Acquisition Signal</span>
                </div>
                <div style={{ padding: '14px 16px', fontSize: 13.5, lineHeight: 1.75, color: V.ink2 }}>
                  {property.building_sf && property.clear_height ? (
                    <>
                      <strong style={{ color: V.blue, fontWeight: 600 }}>{calcScore >= 85 ? 'Top-quartile' : calcScore >= 70 ? 'Strong' : 'Average'} {property.submarket || 'SGV'} asset.</strong>
                      {` ${property.clear_height}' clear${dhRatio ? ` and ${dhRatio} DH ratio` : ''}.`}
                      {property.in_place_rent && property.market_rent && property.in_place_rent < property.market_rent ? (
                        <> At {fmtRent(property.in_place_rent)} {property.lease_type || 'NNN'}, rent is <span style={{ color: V.green, fontWeight: 600 }}>{(((property.market_rent - property.in_place_rent) / property.market_rent) * 100).toFixed(0)}% below market</span>.</>
                      ) : null}
                    </>
                  ) : (
                    'Insufficient building spec data to generate signal. Add clear height, dock doors, and power to enable.'
                  )}
                </div>
              </div>

              {/* Opportunity Memo */}
              <div style={{ background: V.blueBg, border: `1px solid ${V.blueBdr}`, borderRadius: V.radius, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: 'rgba(78,110,150,0.12)', borderBottom: `1px solid ${V.blueBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: V.blue }}>Acquisition Opportunity Memo</span>
                  <button onClick={saveMemo} disabled={memoSaving} style={{ fontSize: 11, color: V.blue, background: 'none', border: `1px solid ${V.blueBdr}`, borderRadius: 5, padding: '2px 8px', cursor: 'pointer' }}>{memoSaving ? 'Saving…' : 'Save'}</button>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <textarea
                    value={memoText}
                    onChange={e => setMemoText(e.target.value)}
                    placeholder="Write your acquisition thesis, key observations, and strategy notes here…"
                    style={{ width: '100%', minHeight: 100, border: 'none', background: 'transparent', fontFamily: "'Instrument Sans', sans-serif", fontSize: 13.5, lineHeight: 1.75, color: V.ink2, resize: 'vertical', outline: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Non-timeline tabs render full width */
          <div style={{ minHeight: 200 }}>
            {activeTab === 'buildings' && <BuildingsTab buildings={buildings} property={property} />}
            {activeTab === 'apns' && <ApnsTab apns={apns} />}
            {activeTab === 'lease_comps' && <CompsTab comps={leaseComps} type="lease" />}
            {activeTab === 'sale_comps' && <CompsTab comps={saleComps} type="sale" />}
            {activeTab === 'contacts' && <ContactsTab contacts={contacts} />}
            {activeTab === 'deals' && <DealsTab deals={deals} />}
            {activeTab === 'leads' && <LeadsTab leads={leads} />}
            {activeTab === 'files' && <FilesTab propertyId={id} />}
          </div>
        )}

      </div>{/* /inner */}

      {/* Blink animation for live dot */}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.1}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function HeroBadge({ color, children }) {
  const colors = {
    green: { bg: 'rgba(21,102,54,0.30)', bdr: 'rgba(60,180,110,0.45)', c: '#B8F0D0' },
    amber: { bg: 'rgba(140,90,4,0.30)', bdr: 'rgba(220,160,50,0.45)', c: '#FFE0A0' },
    blue:  { bg: 'rgba(78,110,150,0.30)', bdr: 'rgba(137,168,198,0.45)', c: '#C8E0F8' },
  };
  const s = colors[color] || colors.blue;
  return <span style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em', border: `1px solid ${s.bdr}`, backdropFilter: 'blur(6px)', background: s.bg, color: s.c }}>{children}</span>;
}

function ScoreChip({ label, score, grade, color, borderColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', background: V.card, border: `1px solid ${borderColor}`, borderRadius: 8, marginRight: 6, flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: 11, color: V.ink3 }}>{label}</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color, marginTop: 1 }}>{grade}</div>
      </div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{score ?? '—'}</div>
    </div>
  );
}

function StatCell({ label, value, sub, color, sm, last }) {
  return (
    <div style={{ padding: '13px 14px', borderRight: last ? 'none' : `1px solid ${V.line2}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: V.ink4, marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: sm ? 16 : 22, fontWeight: sm ? 500 : 700, color: color || V.ink, lineHeight: 1, letterSpacing: '-0.01em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: V.ink4, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Card({ children }) {
  return <div style={{ background: V.card, borderRadius: V.radius, boxShadow: V.shadow, border: `1px solid ${V.line2}`, overflow: 'hidden' }}>{children}</div>;
}
function CardHeader({ title, action }) {
  return (
    <div style={{ padding: '10px 16px', borderBottom: `1px solid ${V.line}`, fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: V.ink3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {title}
      {action && <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic', color: V.blue2, cursor: 'pointer', fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>{action}</span>}
    </div>
  );
}
function CardRow({ label, value, mono, link }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 16px', borderBottom: `1px solid ${V.line2}` }}>
      <span style={{ fontSize: 12.5, color: V.ink4 }}>{label}</span>
      <span style={{ fontSize: 13, color: link ? V.blue : V.ink2, textAlign: 'right', maxWidth: 180, fontFamily: mono ? "'DM Mono', monospace" : 'inherit', fontSize: mono ? 12 : 13, cursor: link ? 'pointer' : 'default' }}>{value}</span>
    </div>
  );
}
function RateCell({ label, value, color, bottom }) {
  return (
    <div style={{ padding: '10px 16px', borderRight: `1px solid ${V.line2}`, borderTop: bottom ? `1px solid ${V.line2}` : 'none' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: V.ink4, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}
function SignalBar({ label, pts, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: V.ink3, flex: 1 }}>{label}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color, fontWeight: 600 }}>+{pts}</span>
    </div>
  );
}
function SpecRow({ label, value, hi }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5.5px 0', borderBottom: `1px solid ${V.line3}` }}>
      <span style={{ fontSize: 12.5, color: V.ink4 }}>{label}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: hi ? V.blue : V.ink2 }}>{value}</span>
    </div>
  );
}
function Divider() { return <div style={{ width: 1, height: 22, background: V.line, margin: '0 3px' }} />; }

const btnStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontFamily: "'Instrument Sans', sans-serif", fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid', transition: 'all 0.12s', whiteSpace: 'nowrap' };
function Btn({ ghost, green, children, onClick }) {
  const s = green ? { ...btnStyle, background: V.green, color: '#fff', borderColor: V.green }
    : ghost ? { ...btnStyle, background: V.card, color: V.ink3, borderColor: V.line }
    : { ...btnStyle, background: V.blue, color: '#fff', borderColor: V.blue };
  return <button onClick={onClick} style={s}>{children}</button>;
}
function BtnLink({ children, onClick }) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', color: V.blue2, fontSize: 12.5, padding: '7px 10px', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(100,128,162,0.3)', fontFamily: "'Instrument Sans', sans-serif" }}>{children}</button>;
}

// ═══════════════════════════════════════════════════════════
// TAB PANELS
// ═══════════════════════════════════════════════════════════

function BuildingsTab({ buildings, property }) {
  if (buildings.length === 0) {
    return (
      <Card>
        <CardHeader title="Buildings" />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            {[
              ['Building SF', fmt(property.building_sf)],
              ['Clear Height', property.clear_height ? `${property.clear_height}'` : '—'],
              ['Dock-High Doors', property.dock_doors || '—'],
              ['Grade-Level Doors', property.grade_doors || '—'],
              ['Year Built', property.year_built || '—'],
              ['Sprinklers', property.sprinklers || '—'],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${V.line3}` }}>
                <span style={{ fontSize: 13, color: V.ink4 }}>{k}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: V.ink2 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }
  return (
    <div style={{ background: V.card, borderRadius: V.radius, boxShadow: V.shadow, border: `1px solid ${V.line2}`, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          {['Building', 'SF', 'Clear Ht', 'Docks', 'Year Built'].map(h => (
            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: V.ink4, borderBottom: `2px solid ${V.line}`, background: V.bg }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {buildings.map(b => (
            <tr key={b.id} style={{ borderBottom: `1px solid ${V.line2}` }}>
              <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 500 }}>{b.building_name || 'Building'}</td>
              <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{fmt(b.building_sf)}</td>
              <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{b.clear_height ? `${b.clear_height}'` : '—'}</td>
              <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{b.dock_doors || '—'}</td>
              <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{b.year_built || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApnsTab({ apns }) {
  if (apns.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: V.ink4, fontSize: 14 }}>No APNs linked — add parcels to this property</div>;
  return (
    <div style={{ background: V.card, borderRadius: V.radius, boxShadow: V.shadow, border: `1px solid ${V.line2}`, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          {['APN', 'Acres', 'Lot SF', 'County'].map(h => (
            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: V.ink4, borderBottom: `2px solid ${V.line}`, background: V.bg }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {apns.map(a => (
            <tr key={a.id} style={{ borderBottom: `1px solid ${V.line2}` }}>
              <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13, color: V.blue }}>{a.apn}</td>
              <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{a.acres ? Number(a.acres).toFixed(2) : '—'}</td>
              <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{a.lot_sf ? fmt(a.lot_sf) : '—'}</td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: V.ink4 }}>{a.county || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompsTab({ comps, type }) {
  if (comps.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: V.ink4, fontSize: 14 }}>No {type} comps in this submarket</div>;
  const isLease = type === 'lease';
  return (
    <div style={{ background: V.card, borderRadius: V.radius, boxShadow: V.shadow, border: `1px solid ${V.line2}`, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          {(isLease ? ['Address', 'Tenant', 'SF', 'Rate', 'Type', 'Date'] : ['Address', 'SF', '$/SF', 'Price', 'Cap Rate', 'Date']).map(h => (
            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: V.ink4, borderBottom: `2px solid ${V.line}`, background: V.bg }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {comps.map(c => (
            <tr key={c.id} style={{ borderBottom: `1px solid ${V.line2}` }}>
              <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{c.address || '—'}</td>
              {isLease ? (
                <>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: V.ink4 }}>{c.tenant || '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{c.rsf ? fmt(c.rsf) : (c.building_sf ? fmt(c.building_sf) : '—')}</td>
                  <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13, color: V.blue }}>{c.rate ? `$${Number(c.rate).toFixed(2)}` : '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>{c.lease_type || 'NNN'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: V.ink4 }}>{c.start_date ? fmtDate(c.start_date) : (c.created_at ? fmtDate(c.created_at) : '—')}</td>
                </>
              ) : (
                <>
                  <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{c.building_sf ? fmt(c.building_sf) : '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13, color: V.blue }}>{c.price_psf ? `$${Number(c.price_psf).toFixed(0)}` : '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{c.sale_price ? fmtCurrency(c.sale_price) : '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{c.cap_rate ? `${Number(c.cap_rate).toFixed(2)}%` : '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: V.ink4 }}>{c.sale_date ? fmtDate(c.sale_date) : (c.created_at ? fmtDate(c.created_at) : '—')}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContactsTab({ contacts }) {
  if (contacts.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: V.ink4, fontSize: 14 }}>No contacts linked to this property</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {contacts.map(c => (
        <Card key={c.id}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: V.blueBg, color: V.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              {(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
              <div style={{ fontSize: 13, color: V.ink4 }}>{c.title}{c.company ? ` · ${c.company}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {c.phone && <a href={`tel:${c.phone}`} style={{ ...btnStyle, padding: '5px 10px', fontSize: 12, background: V.card, color: V.ink3, borderColor: V.line, textDecoration: 'none' }}>📞</a>}
              {c.email && <a href={`mailto:${c.email}`} style={{ ...btnStyle, padding: '5px 10px', fontSize: 12, background: V.card, color: V.ink3, borderColor: V.line, textDecoration: 'none' }}>✉</a>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function DealsTab({ deals }) {
  if (deals.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: V.ink4, fontSize: 14 }}>No deals linked — convert to acquisition to create one</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {deals.map(d => (
        <Card key={d.id}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{d.deal_name || '—'}</span>
            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 500, background: V.blueBg, border: `1px solid ${V.blueBdr}`, color: V.blue }}>{d.stage || '—'}</span>
            {d.deal_value && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: V.ink3 }}>{fmtCurrency(d.deal_value)}</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function LeadsTab({ leads }) {
  if (leads.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: V.ink4, fontSize: 14 }}>No leads linked to this property</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {leads.map(l => (
        <Card key={l.id}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{l.lead_name || l.company || 'Unnamed Lead'}</span>
            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 500, background: V.amberBg, border: `1px solid ${V.amberBdr}`, color: V.amber }}>{l.stage || '—'}</span>
            {l.ai_score != null && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: V.ink4 }}>Score: {l.ai_score}</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function FilesTab({ propertyId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('file_attachments').select('id, file_name, file_url, file_type, created_at').eq('property_id', propertyId).order('created_at', { ascending: false });
        setFiles(data || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, [propertyId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: V.ink4 }}>Loading files…</div>;
  if (files.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: V.ink4, fontSize: 14 }}>No files — upload BOVs, flyers, inspection reports, leases</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {files.map(f => (
        <Card key={f.id}>
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>📄</span>
            <span style={{ fontSize: 14, flex: 1 }}>{f.file_name}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: V.ink4 }}>{fmtDateShort(f.created_at)}</span>
            {f.file_url && <a href={f.file_url} target="_blank" rel="noopener noreferrer" style={{ ...btnStyle, padding: '4px 10px', fontSize: 12, background: V.card, color: V.blue, borderColor: V.blueBdr, textDecoration: 'none' }}>Open</a>}
          </div>
        </Card>
      ))}
    </div>
  );
}
