'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════
   Properties — Physical Asset Database
   app/properties/page.jsx  (Clerestory-Investor · v6)
   ═══════════════════════════════════════════════════════════
   v6 changes (Apr 29):
   - Fetch limit 2000 (was 1000 default, missed 208 properties)
   - Removed Market + Lease Exp columns (both still filterable)
   - SF rounds to K (147K not 147,100)
   - Land to 1 decimal (8.8 not 8.80)
   - Coverage whole number (38% not 38.4%)
   - Data completeness dot on score ring
   - Export CSV wired with all new columns
   - Tighter catalyst column
   ═══════════════════════════════════════════════════════════ */

const fmt = (n) => n == null ? '—' : Number(n).toLocaleString();
const fmtK = (n) => { if (n == null) return '—'; if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`; if (n >= 1000) return `${Math.round(n/1000)}K`; return fmt(n); };
const fmtSF = (n) => { if (n == null) return '—'; if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`; return fmt(n); };
const getGrade = (s) => { if (s == null) return '—'; if (s >= 85) return 'A+'; if (s >= 70) return 'A'; if (s >= 55) return 'B+'; if (s >= 40) return 'B'; return 'C'; };
const getScoreColor = (s) => { if (s == null) return '#6E6860'; if (s >= 70) return '#4E6E96'; if (s >= 55) return '#8C5A04'; return '#6E6860'; };
const monthsUntil = (d) => d ? Math.round((new Date(d) - new Date()) / (1e3*60*60*24*30.44)) : null;
const fmtExpiry = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
const ago = (d) => { if (!d) return ''; const h = Math.round((Date.now() - new Date(d).getTime()) / 36e5); if (h < 1) return 'now'; if (h < 24) return `${h}h`; const days = Math.round(h / 24); return days === 1 ? '1d' : `${days}d`; };

/* ── Data completeness thresholds ── */
const getCompDot = (dc) => {
  if (dc == null || dc === 0) return { show: true, color: '#6E6860', label: 'Unscored — no data' };
  if (dc < 40) return { show: true, color: '#B83714', label: `Sparse data (${dc}%)` };
  if (dc < 60) return { show: true, color: '#8C5A04', label: `Limited data (${dc}%)` };
  if (dc < 80) return { show: true, color: '#6E6860', label: `Partial data (${dc}%)` };
  return { show: false, color: null, label: `High confidence (${dc}%)` };
};

/* ── 30 real catalyst signal tags (from lib/catalyst-constants.js) ── */
/* Everything in catalyst_tags NOT in this set = property tag (building characteristic) */
const SIGNAL_TAGS = new Set([
  'Long Hold','Long Hold (7+ yr)','Absentee Owner','Family Trust','Individual Owner',
  'Succession Signal','No Refi in 5+ Years','SLB Potential',
  'M&A / Corporate Restructuring','Repeat Seller',
  'WARN Filing','WARN Match','Bankruptcy Filing','Distress Signal',
  'Lease Expiry < 12 Mo','Expiring Lease < 24 Mo','Headcount Shrinking',
  'Tenant Renewal Risk','Below Market Rent','Lease-Up Opportunity',
  'Functional Obsolescence','Deferred Capex','Excess Land',
  'Capex Permit Pulled','BESS / Energy Storage','Infrastructure',
  'Sub-5% Vacancy Market','Rising Rents','Institutional Buyer Interest',
  'Competing Listing Nearby','SLB Corridor','Succession Market','Owner Proximity',
  'Legacy Hold','Legacy Hold (20+ yr)','Estate/Trust Owner','Institutional Owner',
  'Owner-User','Private LLC','Pre-COVID Basis','Pre-2010 Basis','Pre-2015 Basis',
  'Prior Listing — Expired/Withdrawn','Prior Listing — Expired',
  'Vacant','Partial Vacancy','Short WALT','Debt Maturity',
  'Market Rent Growth','NOD Filed',
]);

const splitTags = (tags) => {
  const all = tags || [];
  const signals = all.filter(t => SIGNAL_TAGS.has(t));
  const props = all.filter(t => !SIGNAL_TAGS.has(t));
  return { signals, props };
};

const CL = {
  bg:'#F4F1EC',bg2:'#EAE6DF',card:'#FFFFFF',
  ink:'#0F0D09',ink2:'#2C2822',ink3:'#524D46',ink4:'#6E6860',
  blue:'#4E6E96',blue2:'#6480A2',blue3:'#89A8C6',
  blueBg:'rgba(78,110,150,0.09)',blueBdr:'rgba(78,110,150,0.30)',
  rust:'#B83714',rustBg:'rgba(184,55,20,0.08)',rustBdr:'rgba(184,55,20,0.30)',
  green:'#156636',greenBg:'rgba(21,102,54,0.08)',greenBdr:'rgba(21,102,54,0.28)',
  amber:'#8C5A04',amberBg:'rgba(140,90,4,0.09)',amberBdr:'rgba(140,90,4,0.28)',
  purple:'#5838A0',purpleBg:'rgba(88,56,160,0.08)',purpleBdr:'rgba(88,56,160,0.26)',
  line:'rgba(0,0,0,0.08)',line2:'rgba(0,0,0,0.055)',
  shadow:'0 1px 4px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05)',
  shadowMd:'0 4px 16px rgba(0,0,0,0.10),0 1px 4px rgba(0,0,0,0.06)',
  radius:10,
};

const getTagStyle = (tag) => {
  if (!tag) return { bg: CL.blueBg, bdr: CL.blueBdr, c: CL.blue };
  const t = tag.toLowerCase();
  if (t.includes('warn')||t.includes('vacant')||t.includes('owner')||t.includes('legacy')||t.includes('long hold')||t.includes('age 55')||t.includes('expired')) return { bg:CL.rustBg, bdr:CL.rustBdr, c:CL.rust };
  if (t.includes('lease')||t.includes('partial')||t.includes('below market')) return { bg:CL.amberBg, bdr:CL.amberBdr, c:CL.amber };
  if (t.includes('slb')||t.includes('occupied')||t.includes('market')) return { bg:CL.greenBg, bdr:CL.greenBdr, c:CL.green };
  if (t.includes('capex')||t.includes('vintage')||t.includes('low clear')||t.includes('coverage')||t.includes('high clear')||t.includes('dh ratio')||t.includes('truck')) return { bg:CL.purpleBg, bdr:CL.purpleBdr, c:CL.purple };
  return { bg:CL.blueBg, bdr:CL.blueBdr, c:CL.blue };
};

const getSignalColor = (tag) => {
  const t = (tag||'').toLowerCase();
  if (t.includes('warn')||t.includes('vacant')||t.includes('expired')) return CL.rust;
  if (t.includes('lease')||t.includes('below market')) return CL.amber;
  if (t.includes('slb')) return CL.green;
  return CL.purple;
};

const ghostBtn = { display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:7, fontFamily:"'Instrument Sans',sans-serif", fontSize:13, fontWeight:500, cursor:'pointer', border:`1px solid ${CL.line}`, background:CL.card, color:CL.ink3, whiteSpace:'nowrap', transition:'all .12s' };
const primaryBtn = { ...ghostBtn, background:CL.blue, color:'#fff', borderColor:CL.blue };
const tdM = { padding:'10px 12px', fontSize:14, color:CL.ink4, verticalAlign:'middle' };
const tdMono = { padding:'10px 12px', fontFamily:"'DM Mono',monospace", fontSize:13, color:CL.ink2, verticalAlign:'middle', whiteSpace:'nowrap' };

/* ── Market chip matching ── */
const MARKET_MATCH = {
  SGV: p => (p.market||p.submarket||'').toLowerCase().includes('sgv'),
  IE: p => (p.market||p.submarket||'').toLowerCase().includes('ie'),
  OC: p => { const c = (p.city||'').toLowerCase(); const s = (p.submarket||'').toLowerCase(); return s.includes('oc')||s.includes('orange')||['anaheim','fullerton','irvine','santa ana','orange','costa mesa','huntington beach','garden grove','tustin','brea','buena park','lake forest','laguna'].some(x=>c.includes(x)); },
  SD: p => { const c = (p.city||'').toLowerCase(); const s = (p.submarket||'').toLowerCase(); return s.includes('sd')||s.includes('san diego')||['carlsbad','oceanside','otay mesa','chula vista','san diego','escondido','san marcos'].some(x=>c.includes(x)); },
  SFV: p => { const c = (p.city||'').toLowerCase(); const s = (p.submarket||'').toLowerCase(); return s.includes('sfv')||s.includes('san fernando')||['sun valley','burbank','chatsworth','sylmar','pacoima','van nuys','north hollywood','arleta'].some(x=>c.includes(x)); },
};

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortCol, setSortCol] = useState('ai_score');
  const [sortDir, setSortDir] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);

  const [signals, setSignals] = useState([]);
  const [deltas, setDeltas] = useState({ props: 0, signals: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState({ minScore:0, minSF:'', maxSF:'', minHt:0, expiry:'Any', submarket:'Any', ownerType:'Any', holdYears:'Any', catalyst:'Any' });
  const [savedViews, setSavedViews] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);

  // ── FETCH ───────────────────────────────────────────────
  useEffect(() => { fetchProperties(); loadSavedViews(); }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      /* Pull ALL properties — default Supabase limit is 1000, we have 1200+ */
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('ai_score', { ascending: false, nullsFirst: false })
        .limit(5000);
      if (error) throw error;
      const list = data || [];
      setProperties(list);

      const sigs = list
        .filter(p => (p.catalyst_tags||[]).length > 0 && p.updated_at)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 15)
        .map(p => ({ tag: (p.catalyst_tags||[])[0], addr: p.property_name||p.address||'—', city: p.city, time: p.updated_at }));
      setSignals(sigs);

      const cutoff = new Date(Date.now() - 7*864e5).toISOString();
      setDeltas({
        props: list.filter(p => p.created_at > cutoff).length,
        signals: list.filter(p => p.updated_at > cutoff && (p.catalyst_tags||[]).length > 0).length,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Saved views
  const loadSavedViews = () => { try { const raw = typeof window !== 'undefined' ? localStorage.getItem('cl_saved_views') : null; if (raw) setSavedViews(JSON.parse(raw)); } catch {} };
  const saveView = () => { const name = prompt('Name this view:'); if (!name) return; const view = { name, filter: activeFilter, adv: { ...advFilters }, search, sort: sortCol, dir: sortDir }; const next = [...savedViews, view]; setSavedViews(next); try { localStorage.setItem('cl_saved_views', JSON.stringify(next)); } catch {} };
  const loadView = (v) => { setActiveFilter(v.filter || 'All'); if (v.adv) setAdvFilters(v.adv); if (v.search) setSearch(v.search); if (v.sort) { setSortCol(v.sort); setSortDir(v.dir || 'desc'); } setShowSaved(false); };
  const deleteView = (i) => { const next = savedViews.filter((_, j) => j !== i); setSavedViews(next); try { localStorage.setItem('cl_saved_views', JSON.stringify(next)); } catch {} };

  // ── FILTERING + SORTING ─────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...properties];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => [p.property_name,p.address,p.city,p.submarket,p.owner,p.tenant].some(f => (f||'').toLowerCase().includes(q)));
    }
    // Quick filter chips — markets use MARKET_MATCH, rest unchanged
    if (activeFilter !== 'All') {
      if (MARKET_MATCH[activeFilter]) list = list.filter(MARKET_MATCH[activeFilter]);
      else switch (activeFilter) {
        case 'Occupied': list = list.filter(p => (p.vacancy_status||'').toLowerCase().includes('occupied')); break;
        case 'Vacant': list = list.filter(p => (p.vacancy_status||'').toLowerCase().includes('vacant')); break;
        case 'Partial': list = list.filter(p => (p.vacancy_status||'').toLowerCase().includes('partial')); break;
        case 'WARN': list = list.filter(p => (p.catalyst_tags||[]).some(t => t.toLowerCase().includes('warn'))); break;
        case 'Lease Expiry': list = list.filter(p => { const m = monthsUntil(p.lease_expiration); return m != null && m <= 24; }); break;
        case 'SLB': list = list.filter(p => (p.catalyst_tags||[]).some(t => t.toLowerCase().includes('slb'))); break;
        case 'Acq Target': list = list.filter(p => p.is_acq_target); break;
      }
    }
    // Advanced filters
    const af = advFilters;
    if (af.minScore > 0) list = list.filter(p => (p.ai_score||0) >= af.minScore);
    if (af.minSF) list = list.filter(p => (p.building_sf||0) >= (parseInt(af.minSF.replace(/,/g,''))||0));
    if (af.maxSF) list = list.filter(p => (p.building_sf||0) <= (parseInt(af.maxSF.replace(/,/g,''))||Infinity));
    if (af.minHt > 0) list = list.filter(p => (p.clear_height||0) >= af.minHt);
    if (af.expiry !== 'Any') {
      const map = { '≤6mo':6, '≤12mo':12, '≤24mo':24, '≤36mo':36, 'Expired':0 };
      const mo = map[af.expiry];
      if (mo === 0) list = list.filter(p => p.lease_expiration && new Date(p.lease_expiration) < new Date());
      else if (mo) list = list.filter(p => { const m = monthsUntil(p.lease_expiration); return m != null && m <= mo; });
    }
    if (af.submarket !== 'Any') list = list.filter(p => (p.submarket||'').toLowerCase().includes(af.submarket.toLowerCase()));
    if (af.ownerType !== 'Any') list = list.filter(p => (p.owner_type||'').toLowerCase().includes(af.ownerType.toLowerCase()));
    if (af.holdYears !== 'Any') { const yrs = parseInt(af.holdYears); if (yrs) list = list.filter(p => { if (!p.last_transfer_date) return false; return (new Date().getFullYear() - new Date(p.last_transfer_date).getFullYear()) >= yrs; }); }
    if (af.catalyst !== 'Any') list = list.filter(p => (p.catalyst_tags||[]).some(t => t.toLowerCase().includes(af.catalyst.toLowerCase())));
    // Sort
    list.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (va == null) va = sortDir === 'desc' ? -Infinity : Infinity;
      if (vb == null) vb = sortDir === 'desc' ? -Infinity : Infinity;
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb||'').toLowerCase(); }
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    return list;
  }, [properties, search, activeFilter, sortCol, sortDir, advFilters]);

  const kpis = useMemo(() => {
    const totalSF = filtered.reduce((s, p) => s + (p.building_sf||0), 0);
    const occupied = filtered.filter(p => (p.vacancy_status||'').toLowerCase().includes('occupied')).length;
    const vacantPartial = filtered.filter(p => { const s = (p.vacancy_status||'').toLowerCase(); return s.includes('vacant') || s.includes('partial'); }).length;
    const sigs = filtered.filter(p => (p.catalyst_tags||[]).length > 0).length;
    const acqTargets = filtered.filter(p => p.is_acq_target).length;
    return { total: filtered.length, totalSF, occupied, vacantPartial, signals: sigs, acqTargets };
  }, [filtered]);

  const counts = useMemo(() => {
    const c = { all: properties.length };
    Object.keys(MARKET_MATCH).forEach(k => { c[k] = properties.filter(MARKET_MATCH[k]).length; });
    return c;
  }, [properties]);

  const submarkets = useMemo(() => [...new Set(properties.map(p => p.submarket).filter(Boolean))].sort(), [properties]);

  const handleSort = useCallback((col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }, [sortCol]);

  const toggleSelect = (id) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(p => p.id))); };
  const clearSelection = () => setSelected(new Set());

  const toggleCompareItem = (id) => { setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev); };
  const compareProps = useMemo(() => compareIds.map(id => properties.find(p => p.id === id)).filter(Boolean), [compareIds, properties]);

  // ── EXPORT CSV ──────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const rows = filtered.filter(p => selected.size === 0 || selected.has(p.id));
    if (rows.length === 0) return;

    const headers = [
      'Address','City','Submarket','Market','Building SF','Clear Height','Land Acres',
      'Coverage %','Vintage','Owner','Owner Type','Tenant','Vacancy Status',
      'Building Score','Grade','Data Completeness %','Fit Score','Fit Grade','Acq Target',
      'Power Amps','Office %','Building Status','Lease Expiration',
      'Last Sale Price','Price PSF','Last Transfer Date','Property Tags','Catalyst Signals'
    ];

    const csvRows = rows.map(p => {
      const cov = (p.building_sf && p.land_acres) ? Math.round((p.building_sf / (p.land_acres * 43560)) * 100) : '';
      const { signals, props: ptags } = splitTags(p.catalyst_tags);
      return [
        p.address||'', p.city||'', p.submarket||'', p.market||'',
        p.building_sf||'', p.clear_height||'', p.land_acres||'',
        cov, p.year_built||'', p.owner||'', p.owner_type||'',
        p.tenant||'', p.vacancy_status||'',
        p.ai_score||'', p.building_grade||'', p.data_completeness||'',
        p.fit_score||'', p.fit_grade||'', p.is_acq_target?'Yes':'No',
        p.power_amps||'', p.office_pct||'', p.building_status||'',
        p.lease_expiration||'',
        p.last_sale_price||'', p.price_psf||'', p.last_transfer_date||'',
        ptags.join('; '), signals.join('; ')
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clerestory_properties_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filtered, selected]);

  // Add property
  const [newProp, setNewProp] = useState({ property_name:'', address:'', city:'', state:'CA', zip:'' });
  const handleAdd = async () => {
    if (!newProp.property_name && !newProp.address) return;
    try {
      await supabase.from('properties').insert([{ ...newProp, property_name: newProp.property_name || newProp.address }]);
      setShowAddModal(false); setNewProp({ property_name:'', address:'', city:'', state:'CA', zip:'' }); fetchProperties();
    } catch (err) { alert('Error: ' + err.message); }
  };

  /* ── Table columns (Market + Lease Exp REMOVED — filter-only now) ── */
  const cols = [
    { key: 'property_name', label: 'Property', w: null },
    { key: 'ai_score', label: 'Score', w: 68 },
    { key: 'building_sf', label: 'Property SF', w: 95 },
    { key: 'clear_height', label: 'Clr Ht', w: 65 },
    { key: 'land_acres', label: 'Land', w: 60 },
    { key: null, label: 'Cov', w: 55 },
    { key: 'year_built', label: 'Vintage', w: 60 },
    { key: 'owner', label: 'Owner', w: null },
    { key: null, label: 'Prop Tags', w: null },
    { key: null, label: 'Catalysts', w: null },
  ];

  // ── RENDER ──────────────────────────────────────────────
  return (
    <>
      {/* ═══ LIVE SIGNAL TICKER ═══ */}
      {signals.length > 0 && (
        <div style={{ background:'linear-gradient(90deg,#1A2130,#1F2840,#1A2130)', borderRadius:CL.radius, overflow:'hidden', marginBottom:20, height:38, position:'relative', border:'1px solid rgba(100,128,162,0.15)' }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:110, background:'linear-gradient(90deg,#1A2130 70%,transparent)', zIndex:5, display:'flex', alignItems:'center', paddingLeft:14, gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#F08880', animation:'blink 1.4s infinite' }} />
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(240,235,225,0.7)' }}>Live Signals</span>
          </div>
          <div style={{ display:'flex', gap:32, animation:'tickerScroll 40s linear infinite', paddingLeft:120, alignItems:'center', height:'100%' }}>
            {[...signals, ...signals].map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap', flexShrink:0 }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:getSignalColor(s.tag), flexShrink:0 }} />
                <span style={{ fontSize:12.5, color:'rgba(245,240,232,0.85)' }}>{s.tag} — <span style={{ fontWeight:500, color:'rgba(137,168,198,0.95)' }}>{s.addr}{s.city ? `, ${s.city}` : ''}</span></span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(200,215,235,0.38)' }}>{ago(s.time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div style={{ padding:'28px 0 20px', display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontFamily:"'Instrument Sans',sans-serif", fontSize:32, fontWeight:300, color:CL.ink, letterSpacing:'-0.02em', lineHeight:1, margin:0 }}>Properties</h1>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontStyle:'italic', color:CL.ink4, marginTop:6 }}>
            {loading ? 'Loading…' : `${kpis.total} properties tracked · ${fmtSF(kpis.totalSF)} SF · SGV / IE Industrial`}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ display:'flex', background:CL.bg2, border:`1px solid ${CL.line}`, borderRadius:7, overflow:'hidden' }}>
            <button style={{ padding:'7px 14px', fontSize:12, fontWeight:500, cursor:'pointer', border:'none', background:CL.card, color:CL.blue, fontFamily:"'Instrument Sans',sans-serif", boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>☰ Table</button>
            <button onClick={() => alert('Map view — next build')} style={{ padding:'7px 14px', fontSize:12, fontWeight:500, cursor:'pointer', border:'none', background:'transparent', color:CL.ink4, fontFamily:"'Instrument Sans',sans-serif" }}>🗺 Map</button>
            <button onClick={() => alert('Cards view — next build')} style={{ padding:'7px 14px', fontSize:12, fontWeight:500, cursor:'pointer', border:'none', background:'transparent', color:CL.ink4, fontFamily:"'Instrument Sans',sans-serif" }}>◫ Cards</button>
          </div>
          <button style={ghostBtn} onClick={() => setShowFilters(prev => !prev)}>⊕ {showFilters ? 'Hide' : 'Advanced'} Filters</button>
          <button style={ghostBtn} onClick={() => setShowCompare(prev => !prev)}>⊞ Compare{compareIds.length > 0 ? ` (${compareIds.length})` : ''}</button>
          <button onClick={() => setShowAddModal(true)} style={primaryBtn}>+ Add Property</button>
        </div>
      </div>

      {/* ═══ KPI STRIP ═══ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
        <KPI icon="🏢" bg={CL.blueBg} color={CL.blue} value={kpis.total} label="Total Properties" delta={deltas.props > 0 ? `+${deltas.props}` : null} up />
        <KPI icon="◫" bg={CL.amberBg} color={CL.amber} value={fmtSF(kpis.totalSF)} label="Total SF Tracked" />
        <KPI icon="◉" bg={CL.greenBg} color={CL.green} value={kpis.occupied} label="Occupied" />
        <KPI icon="◎" bg={CL.rustBg} color={CL.rust} value={kpis.vacantPartial} label="Vacant / Partial" />
        <KPI icon="⚡" bg={CL.purpleBg} color={CL.purple} value={kpis.signals} label="Active Catalysts" delta={deltas.signals > 0 ? `+${deltas.signals}` : null} up />
      </div>

      {/* ═══ ADVANCED FILTER PANEL ═══ */}
      {showFilters && (
        <div style={{ background:CL.card, borderRadius:CL.radius, boxShadow:CL.shadowMd, border:`1px solid ${CL.line2}`, padding:20, marginBottom:16, animation:'slideDown .25s ease' }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:CL.ink3, marginBottom:14 }}>⊕ Advanced Filters</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            <FilterField label="Min Building Score">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="range" min="0" max="100" value={advFilters.minScore} onChange={e => setAdvFilters(f => ({ ...f, minScore: Number(e.target.value) }))} style={{ flex:1, accentColor:CL.blue }} />
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:CL.blue, minWidth:28, textAlign:'right' }}>{advFilters.minScore}</span>
              </div>
            </FilterField>
            <FilterField label="Property SF Range">
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <input placeholder="Min" value={advFilters.minSF} onChange={e => setAdvFilters(f => ({ ...f, minSF:e.target.value }))} style={fpInput} />
                <span style={{ color:CL.ink4, fontSize:11 }}>to</span>
                <input placeholder="Max" value={advFilters.maxSF} onChange={e => setAdvFilters(f => ({ ...f, maxSF:e.target.value }))} style={fpInput} />
              </div>
            </FilterField>
            <FilterField label="Min Clear Height">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="range" min="0" max="40" value={advFilters.minHt} onChange={e => setAdvFilters(f => ({ ...f, minHt: Number(e.target.value) }))} style={{ flex:1, accentColor:CL.blue }} />
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:CL.blue, minWidth:28, textAlign:'right' }}>{advFilters.minHt}'</span>
              </div>
            </FilterField>
            <FilterField label="Lease Expiry">
              <select value={advFilters.expiry} onChange={e => setAdvFilters(f => ({ ...f, expiry:e.target.value }))} style={fpSelect}>
                {['Any','≤6mo','≤12mo','≤24mo','≤36mo','Expired'].map(o => <option key={o}>{o}</option>)}
              </select>
            </FilterField>
            <FilterField label="Submarket">
              <select value={advFilters.submarket} onChange={e => setAdvFilters(f => ({ ...f, submarket:e.target.value }))} style={fpSelect}>
                <option>Any</option>
                {submarkets.map(s => <option key={s}>{s}</option>)}
              </select>
            </FilterField>
            <FilterField label="Owner Type">
              <select value={advFilters.ownerType} onChange={e => setAdvFilters(f => ({ ...f, ownerType:e.target.value }))} style={fpSelect}>
                {['Any','Owner-User','Private','Institutional','Trust'].map(o => <option key={o}>{o}</option>)}
              </select>
            </FilterField>
            <FilterField label="Hold Period">
              <select value={advFilters.holdYears} onChange={e => setAdvFilters(f => ({ ...f, holdYears:e.target.value }))} style={fpSelect}>
                {['Any','10','15','20','25'].map(o => <option key={o} value={o}>{o === 'Any' ? 'Any' : `≥ ${o} years`}</option>)}
              </select>
            </FilterField>
            <FilterField label="Catalyst Tag">
              <select value={advFilters.catalyst} onChange={e => setAdvFilters(f => ({ ...f, catalyst:e.target.value }))} style={fpSelect}>
                {['Any','WARN','Vacant','Owner-User','Below Market','SLB','Long Hold','Legacy','Lease'].map(o => <option key={o}>{o}</option>)}
              </select>
            </FilterField>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16, paddingTop:14, borderTop:`1px solid ${CL.line}` }}>
            <button onClick={() => setAdvFilters({ minScore:0, minSF:'', maxSF:'', minHt:0, expiry:'Any', submarket:'Any', ownerType:'Any', holdYears:'Any', catalyst:'Any' })} style={ghostBtn}>Clear All</button>
            <button onClick={() => setShowFilters(false)} style={primaryBtn}>Apply · {filtered.length} results</button>
          </div>
        </div>
      )}

      {/* ═══ FILTER CHIPS + SAVED VIEWS + SEARCH ═══ */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <Chip label="All" count={counts.all} active={activeFilter==='All'} onClick={() => setActiveFilter('All')} />
        {Object.keys(MARKET_MATCH).map(k => counts[k] > 0 && <Chip key={k} label={k} count={counts[k]} active={activeFilter===k} onClick={() => setActiveFilter(k)} />)}
        <Sep />
        {[{k:'Occupied',dot:CL.green},{k:'Vacant',dot:CL.rust},{k:'Partial',dot:CL.amber}].map(f =>
          <Chip key={f.k} label={f.k} dot={f.dot} active={activeFilter===f.k} onClick={() => setActiveFilter(f.k)} />)}
        <Sep />
        {['WARN','Lease Expiry','SLB','Acq Target'].map(f =>
          <Chip key={f} label={f==='WARN'?'⚡ WARN':f==='Acq Target'?'◈ Acq Target':f} active={activeFilter===f} onClick={() => setActiveFilter(f)} />)}

        {/* Saved Views */}
        <div style={{ position:'relative', marginLeft:8 }}>
          <button onClick={() => setShowSaved(prev => !prev)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer', border:`1px solid ${CL.purpleBdr}`, background:CL.purpleBg, color:CL.purple, fontFamily:"'Instrument Sans',sans-serif" }}>☆ Saved Views ▾</button>
          {showSaved && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, width:260, background:CL.card, borderRadius:10, boxShadow:CL.shadowMd, border:`1px solid ${CL.line2}`, zIndex:50, overflow:'hidden' }}>
              {savedViews.length === 0 && <div style={{ padding:'14px 14px', fontSize:13, color:CL.ink4 }}>No saved views yet</div>}
              {savedViews.map((v, i) => (
                <div key={i} onClick={() => loadView(v)} style={{ padding:'10px 14px', fontSize:13, color:CL.ink2, cursor:'pointer', borderBottom:`1px solid ${CL.line2}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontWeight:500 }}>{v.name}</span>
                  <span onClick={e => { e.stopPropagation(); deleteView(i); }} style={{ fontSize:14, color:CL.ink4, cursor:'pointer', padding:'0 4px' }}>✕</span>
                </div>
              ))}
              <div onClick={saveView} style={{ padding:'10px 14px', fontSize:12, color:CL.purple, cursor:'pointer', borderTop:`1px solid ${CL.line}`, display:'flex', alignItems:'center', gap:6, background:'rgba(88,56,160,0.03)' }}>+ Save current view…</div>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ position:'relative', flex:1, maxWidth:360, marginLeft:'auto' }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:CL.ink4, pointerEvents:'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search properties, owners, tenants…"
            style={{ width:'100%', padding:'8px 14px 8px 36px', border:`1px solid ${CL.line}`, borderRadius:8, fontFamily:"'Instrument Sans',sans-serif", fontSize:14, color:CL.ink, background:CL.card, outline:'none' }} />
        </div>
      </div>

      {/* ═══ TABLE ═══ */}
      <div style={{ background:CL.card, borderRadius:12, boxShadow:CL.shadow, border:`1px solid ${CL.line2}`, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
          <colgroup>
            <col style={{ width:36 }} />
            {cols.map((c,i) => <col key={i} style={c.w ? { width: c.w } : {}} />)}
            <col style={{ width:24 }} />
          </colgroup>
          <thead><tr>
            <th style={{ padding:'11px 8px', borderBottom:`2px solid ${CL.line}`, background:CL.bg }}>
              <div onClick={toggleAll} style={{ width:18, height:18, border:`2px solid ${selected.size===filtered.length&&filtered.length>0?CL.blue:CL.line}`, borderRadius:4, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', background:selected.size===filtered.length&&filtered.length>0?CL.blue:'transparent' }}>
                {selected.size===filtered.length&&filtered.length>0?'✓':''}
              </div>
            </th>
            {cols.map((col, i) => (
              <th key={i} onClick={() => col.key && handleSort(col.key)} style={{
                padding:'11px 12px', textAlign:'left', fontSize:11, fontWeight:600,
                letterSpacing:'.08em', textTransform:'uppercase', whiteSpace:'nowrap',
                color:sortCol===col.key?CL.blue:CL.ink3,
                borderBottom:`2px solid ${CL.line}`, background:CL.bg,
                cursor:col.key?'pointer':'default', userSelect:'none',
              }}>
                {col.label}
                {col.key && <span style={{ opacity:sortCol===col.key?1:0.35, fontSize:10, marginLeft:4 }}>{sortCol===col.key?(sortDir==='desc'?'↓':'↑'):'↕'}</span>}
              </th>
            ))}
            <th style={{ width:24, borderBottom:`2px solid ${CL.line}`, background:CL.bg }} />
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={cols.length+2} style={{ padding:48, textAlign:'center', color:CL.ink4, fontSize:16 }}>Loading properties…</td></tr> :
             filtered.length === 0 ? <tr><td colSpan={cols.length+2} style={{ padding:48, textAlign:'center', color:CL.ink4, fontSize:16 }}>No properties match filters.</td></tr> :
             filtered.map((p, idx) => {
              const isSel = selected.has(p.id);
              const cov = (p.building_sf && p.land_acres) ? Math.round((p.building_sf / (p.land_acres * 43560)) * 100) : null;
              const comp = getCompDot(p.data_completeness);
              return (
                <tr key={p.id} onClick={() => router.push(`/properties/${p.id}`)}
                  style={{ borderBottom:`1px solid ${CL.line2}`, cursor:'pointer', transition:'background .1s', background:isSel?'rgba(78,110,150,0.05)':'' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background='#F8F6F2'; setHoverIdx(idx); }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background=''; setHoverIdx(null); }}>
                  {/* Checkbox */}
                  <td style={{ padding:'10px 8px', verticalAlign:'middle' }}>
                    <div onClick={e => { e.stopPropagation(); toggleSelect(p.id); }}
                      style={{ width:18, height:18, border:`2px solid ${isSel?CL.blue:CL.line}`, borderRadius:4, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', background:isSel?CL.blue:'transparent', transition:'all .12s' }}>
                      {isSel?'✓':''}
                    </div>
                  </td>
                  {/* Property — city + submarket shown under the name */}
                  <td style={{ padding:'10px 12px', verticalAlign:'middle' }}>
                    <div style={{ fontWeight:600, color:CL.ink, fontSize:14, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.property_name||p.address||'—'}</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontSize:12.5, color:CL.ink4, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{[p.submarket, p.city].filter(Boolean).join(' · ')||'—'}</div>
                  </td>
                  {/* Score ring + data completeness dot */}
                  <td style={{ padding:'10px 8px', verticalAlign:'middle' }}>
                    <div style={{ position:'relative', width:40, height:40 }}>
                      <div title={comp.label} style={{ width:40, height:40, borderRadius:'50%', border:`2.5px solid ${getScoreColor(p.ai_score)}`, background:p.ai_score>=70?CL.blueBg:p.ai_score>=55?CL.amberBg:'rgba(0,0,0,0.03)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:getScoreColor(p.ai_score), lineHeight:1 }}>{p.ai_score??'—'}</span>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:getScoreColor(p.ai_score), marginTop:1 }}>{getGrade(p.ai_score)}</span>
                      </div>
                      {comp.show && <span title={comp.label} style={{ position:'absolute', top:-1, right:-1, width:8, height:8, borderRadius:'50%', background:comp.color, border:'1.5px solid #fff' }} />}
                    </div>
                  </td>
                  {/* SF — rounded to K */}
                  <td style={tdMono}>{fmtK(p.building_sf)}</td>
                  {/* Clear Ht */}
                  <td style={tdMono}>{p.clear_height ? `${p.clear_height}'` : '—'}</td>
                  {/* Land — 1 decimal */}
                  <td style={tdMono}>{p.land_acres ? Number(p.land_acres).toFixed(1) : '—'}</td>
                  {/* Coverage — whole number */}
                  <td style={tdMono}>{cov ? `${cov}%` : '—'}</td>
                  {/* Year Built */}
                  <td style={tdMono}>{p.year_built || '—'}</td>
                  {/* Owner */}
                  <td style={{ ...tdM, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.owner||'—'}</td>
                  {/* Property Tags (building characteristics — NOT signal catalysts) */}
                  <td style={{ padding:'10px 8px', verticalAlign:'middle' }}>
                    {(() => {
                      const { props: ptags } = splitTags(p.catalyst_tags);
                      if (ptags.length === 0) return <span style={{ fontSize:12, color:CL.ink4 }}>—</span>;
                      return (
                        <div style={{ display:'flex', gap:3, flexWrap:'wrap', alignItems:'center' }}>
                          {ptags.slice(0,2).map((tag, i) => <span key={i} style={{ display:'inline-flex', padding:'2px 6px', borderRadius:4, fontSize:10.5, fontWeight:600, background:CL.purpleBg, border:`1px solid ${CL.purpleBdr}`, color:CL.purple, whiteSpace:'nowrap', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis' }}>{tag}</span>)}
                          {ptags.length > 2 && <span style={{ fontSize:10, color:CL.ink4, fontFamily:"'DM Mono',monospace" }}>+{ptags.length-2}</span>}
                        </div>
                      );
                    })()}
                  </td>
                  {/* Catalysts (signal tags ONLY — the 30 you act on) */}
                  <td style={{ padding:'10px 8px', verticalAlign:'middle' }}>
                    {(() => {
                      const { signals: stags } = splitTags(p.catalyst_tags);
                      if (stags.length === 0 && !p.ai_synthesis) return <span style={{ fontSize:12, color:CL.ink4 }}>—</span>;
                      return (
                        <div style={{ display:'flex', gap:3, flexWrap:'wrap', alignItems:'center' }}>
                          {stags.slice(0,2).map((tag, i) => { const s = getTagStyle(tag); return <span key={i} style={{ display:'inline-flex', padding:'2px 6px', borderRadius:4, fontSize:10.5, fontWeight:600, background:s.bg, border:`1px solid ${s.bdr}`, color:s.c, whiteSpace:'nowrap', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis' }}>{tag}</span>; })}
                          {stags.length > 2 && <span style={{ fontSize:10, color:CL.ink4, fontFamily:"'DM Mono',monospace" }}>+{stags.length-2}</span>}
                          {p.ai_synthesis && <AISparkle text={p.ai_synthesis} />}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding:'10px 4px', color:CL.ink4, fontSize:14, opacity:0.4, verticalAlign:'middle' }}>›</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && filtered.length > 0 && <div style={{ padding:'14px 0', fontSize:14, color:CL.ink4 }}>Showing {filtered.length} of {properties.length} properties</div>}

      {/* ═══ BULK ACTION BAR ═══ */}
      {selected.size > 0 && (
        <div style={{ position:'fixed', bottom:0, left:242, right:0, background:'linear-gradient(90deg,#1A2130,#1F2840)', padding:'12px 24px', display:'flex', alignItems:'center', gap:12, zIndex:50, boxShadow:'0 -4px 20px rgba(0,0,0,0.15)', borderTop:'2px solid rgba(100,128,162,0.25)' }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#fff', marginRight:4 }}>{selected.size}</span>
          <span style={{ fontSize:13, color:'rgba(245,240,232,0.7)', marginRight:12 }}>selected</span>
          <BulkBtn>📄 Export IC Memo</BulkBtn>
          <BulkBtn onClick={exportCSV}>📊 Export CSV</BulkBtn>
          <BulkBtn>🏷 Bulk Tag</BulkBtn>
          <BulkBtn>📬 Add to Campaign</BulkBtn>
          <BulkBtn green>◈ Convert to Acq</BulkBtn>
          <span onClick={clearSelection} style={{ marginLeft:'auto', color:'rgba(245,240,232,0.5)', cursor:'pointer', fontSize:18, padding:'4px 8px' }}>✕</span>
        </div>
      )}

      {/* ═══ COMPARE DRAWER ═══ */}
      {showCompare && (
        <div style={{ position:'fixed', right:0, top:0, bottom:0, width:480, background:CL.card, boxShadow:'-8px 0 30px rgba(0,0,0,0.12)', zIndex:200, borderLeft:`1px solid ${CL.line2}`, display:'flex', flexDirection:'column', animation:'slideIn .3s ease' }}>
          <div style={{ padding:'18px 24px', borderBottom:`1px solid ${CL.line}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:14, fontWeight:600 }}>⊞ Property Comparison <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:CL.ink4, marginLeft:4 }}>{compareIds.length} of 3 max</span></span>
            <span onClick={() => setShowCompare(false)} style={{ color:CL.ink4, cursor:'pointer', fontSize:18 }}>✕</span>
          </div>
          {compareProps.length === 0 ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, color:CL.ink4 }}>
              <div style={{ fontSize:14 }}>Select properties to compare</div>
              <div style={{ fontSize:12 }}>Click checkboxes in the table, then click Compare</div>
            </div>
          ) : (
            <div style={{ flex:1, overflowY:'auto' }}>
              <div style={{ display:'grid', gridTemplateColumns:`140px repeat(${compareProps.length},1fr)`, borderBottom:`1px solid ${CL.line2}`, background:CL.bg }}>
                <div style={{ padding:'9px 14px' }} />
                {compareProps.map(p => <div key={p.id} style={{ padding:'9px 14px', fontWeight:600, fontSize:12, color:CL.blue }}>{p.property_name||p.address||'—'}</div>)}
              </div>
              {[
                { label:'Building SF', fn:p=>fmtK(p.building_sf), best:'max', key:'building_sf' },
                { label:'Clear Height', fn:p=>p.clear_height?`${p.clear_height}'`:'—', best:'max', key:'clear_height' },
                { label:'Year Built', fn:p=>p.year_built||'—', best:'max', key:'year_built' },
                { label:'Building Score', fn:p=>p.ai_score!=null?`${p.ai_score} ${getGrade(p.ai_score)}`:'—', best:'max', key:'ai_score' },
                { label:'Data Confidence', fn:p=>p.data_completeness!=null?`${p.data_completeness}%`:'—', best:'max', key:'data_completeness' },
                { label:'Land AC', fn:p=>p.land_acres?Number(p.land_acres).toFixed(1):'—', best:'max', key:'land_acres' },
                { label:'Coverage', fn:p=>(p.building_sf&&p.land_acres)?`${Math.round((p.building_sf/(p.land_acres*43560))*100)}%`:'—' },
                { label:'Dock Doors', fn:p=>p.dock_doors||'—', best:'max', key:'dock_doors' },
                { label:'Power Amps', fn:p=>p.power_amps?fmt(p.power_amps):'—', best:'max', key:'power_amps' },
                { label:'In-Place Rent', fn:p=>p.in_place_rent?`$${Number(p.in_place_rent).toFixed(2)}/SF`:'—' },
                { label:'Market Rent', fn:p=>p.market_rent?`$${Number(p.market_rent).toFixed(2)}/SF`:'—' },
                { label:'Lease Expiry', fn:p=>fmtExpiry(p.lease_expiration) },
                { label:'Owner Type', fn:p=>p.owner_type||'—' },
                { label:'Catalysts', fn:p=>{ const { signals } = splitTags(p.catalyst_tags); return signals.slice(0,3).join(', ')||'—'; } },
              ].map((row, ri) => {
                const bestVal = row.key && row.best === 'max' ? Math.max(...compareProps.map(p => p[row.key]||0)) : null;
                return (
                  <div key={ri} style={{ display:'grid', gridTemplateColumns:`140px repeat(${compareProps.length},1fr)`, borderBottom:`1px solid ${CL.line2}` }}>
                    <div style={{ padding:'9px 14px', fontSize:12, color:CL.ink4, background:'rgba(0,0,0,0.015)' }}>{row.label}</div>
                    {compareProps.map(p => {
                      const isWinner = row.key && bestVal != null && (p[row.key]||0) === bestVal && compareProps.filter(pp => (pp[row.key]||0)===bestVal).length === 1;
                      return <div key={p.id} style={{ padding:'9px 14px', fontFamily:"'DM Mono',monospace", fontSize:12, color:isWinner?CL.blue:CL.ink2, fontWeight:isWinner?600:400, background:isWinner?'rgba(21,102,54,0.04)':'' }}>{row.fn(p)}</div>;
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setShowAddModal(false)}>
          <div style={{ background:'#fff', borderRadius:14, boxShadow:CL.shadowMd, padding:28, width:500, maxWidth:'90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize:22, fontWeight:500, marginBottom:20 }}>Add Property</h2>
            {['property_name','address','city','zip'].map(field => (
              <div key={field} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, color:CL.ink3, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6, display:'block' }}>{field.replace('_',' ')}</label>
                <input value={newProp[field]||''} onChange={e => setNewProp(prev => ({ ...prev, [field]:e.target.value }))}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:`1px solid ${CL.line}`, fontFamily:"'Instrument Sans',sans-serif", fontSize:15, color:CL.ink2, background:CL.bg, outline:'none' }} />
              </div>
            ))}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={() => setShowAddModal(false)} style={ghostBtn}>Cancel</button>
              <button onClick={handleAdd} style={primaryBtn}>Add Property</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.1}}
        @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function KPI({ icon, bg, color, value, label, delta, up }) {
  return (
    <div style={{ background:CL.card, borderRadius:12, boxShadow:CL.shadow, border:`1px solid ${CL.line2}`, padding:'18px 22px', display:'flex', alignItems:'center', gap:16, transition:'transform .15s', cursor:'default' }}>
      <div style={{ width:44, height:44, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, background:bg, color }}>{icon}</div>
      <div>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:700, color:CL.ink, lineHeight:1, letterSpacing:'-0.02em' }}>{value}</span>
          {delta && <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:600, padding:'1px 5px', borderRadius:3, color:up?CL.green:CL.rust, background:up?CL.greenBg:CL.rustBg }}>{delta}</span>}
        </div>
        <div style={{ fontSize:13, color:CL.ink3, marginTop:4 }}>{label}</div>
      </div>
    </div>
  );
}

function Chip({ label, count, dot, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:22,
      fontFamily:"'Instrument Sans',sans-serif", fontSize:13, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap',
      border:`1px solid ${active?CL.blueBdr:CL.line}`,
      background:active?CL.blueBg:CL.card, color:active?CL.blue:CL.ink3,
    }}>
      {dot && <span style={{ width:7, height:7, borderRadius:'50%', background:dot }} />}
      {label}
      {count != null && <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, marginLeft:2 }}>{count}</span>}
    </button>
  );
}

function Sep() { return <div style={{ width:1, height:24, background:CL.line, margin:'0 4px' }} />; }

function StatusTag({ status }) {
  const s = (status||'').toLowerCase(); let label = status||'—', bg, bdr, c;
  if (s.includes('occupied')||s==='leased') { label='Occupied'; bg=CL.greenBg; bdr=CL.greenBdr; c=CL.green; }
  else if (s.includes('vacant')||s==='available') { label='Vacant'; bg=CL.rustBg; bdr=CL.rustBdr; c=CL.rust; }
  else if (s.includes('partial')) { label='Partial'; bg=CL.amberBg; bdr=CL.amberBdr; c=CL.amber; }
  else if (s==='active'||s==='listed') { label='Listed'; bg=CL.blueBg; bdr=CL.blueBdr; c=CL.blue; }
  else { bg='rgba(0,0,0,0.04)'; bdr=CL.line; c=CL.ink4; }
  return <span style={{ display:'inline-flex', padding:'3px 8px', borderRadius:5, fontSize:11, fontWeight:600, background:bg, border:`1px solid ${bdr}`, color:c }}>{label}</span>;
}

function AISparkle({ text }) {
  const [show, setShow] = useState(false);
  const preview = text.length > 300 ? text.slice(0, 300) + '…' : text;
  return (
    <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={e => e.stopPropagation()}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:'50%', background:CL.purpleBg, color:CL.purple, fontSize:9, cursor:'pointer', flexShrink:0, transition:'all .15s', position:'relative' }}>
      ✦
      {show && (
        <div style={{ position:'absolute', bottom:'calc(100% + 8px)', right:0, width:320, background:'#1A2130', color:'rgba(245,240,232,0.9)', padding:'12px 14px', borderRadius:8, fontSize:12, lineHeight:1.6, pointerEvents:'none', zIndex:60, boxShadow:'0 4px 16px rgba(0,0,0,0.3)' }}>
          {preview}
          <div style={{ marginTop:6, fontSize:10, color:'rgba(137,168,198,0.5)', fontStyle:'italic' }}>Click property for full synthesis →</div>
          <div style={{ position:'absolute', top:'100%', right:16, width:0, height:0, borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderTop:'5px solid #1A2130' }} />
        </div>
      )}
    </span>
  );
}

function BulkBtn({ children, green, onClick }) {
  return (
    <button onClick={onClick} style={{ padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer', border:`1px solid ${green?'rgba(60,180,110,0.35)':'rgba(255,255,255,0.15)'}`, background:green?'rgba(21,102,54,0.30)':'rgba(255,255,255,0.08)', color:green?'#B8F0D0':'rgba(245,240,232,0.9)', fontFamily:"'Instrument Sans',sans-serif", whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5 }}>
      {children}
    </button>
  );
}

function FilterField({ label, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:CL.ink4, marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}

const fpInput = { padding:'7px 10px', border:`1px solid ${CL.line}`, borderRadius:6, fontFamily:"'DM Mono',monospace", fontSize:12, width:'100%', color:CL.ink2, background:CL.bg, outline:'none' };
const fpSelect = { padding:'7px 10px', border:`1px solid ${CL.line}`, borderRadius:6, fontFamily:"'Instrument Sans',sans-serif", fontSize:12, width:'100%', color:CL.ink2, background:CL.bg, outline:'none', cursor:'pointer' };
