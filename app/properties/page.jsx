'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════
   Properties — Physical Asset Database + Live Features
   app/properties/page.jsx  (Clerestory-Investor)

   Updates in this version:
   ① Bulk action buttons fully wired (Export CSV, Bulk Tag,
     Add to Campaign, Convert to Acquisition)
   ② KPI delta labels show "7d" suffix
   ③ Score rings animate in, A+ scores glow, urgent catalysts pulse
   ═══════════════════════════════════════════════════════════ */

const fmt = (n) => n == null ? '—' : Number(n).toLocaleString();
const fmtSF = (n) => { if (n == null) return '—'; if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`; return fmt(n); };
const getGrade = (s) => { if (s == null) return '—'; if (s >= 85) return 'A+'; if (s >= 70) return 'A'; if (s >= 55) return 'B+'; if (s >= 40) return 'B'; return 'C'; };
const getScoreColor = (s) => { if (s == null) return '#6E6860'; if (s >= 70) return '#4E6E96'; if (s >= 55) return '#8C5A04'; return '#6E6860'; };
const monthsUntil = (d) => d ? Math.round((new Date(d) - new Date()) / (1e3*60*60*24*30.44)) : null;
const fmtExpiry = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
const ago = (d) => { if (!d) return ''; const h = Math.round((Date.now() - new Date(d).getTime()) / 36e5); if (h < 1) return 'now'; if (h < 24) return `${h}h`; const days = Math.round(h / 24); return days === 1 ? '1d' : `${days}d`; };

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
  if (t.includes('warn')||t.includes('owner-user')||t.includes('owner age')||t.includes('owner distress')||t.includes('nod filed')||t.includes('bankruptcy')||t.includes('legacy hold')||t.includes('long hold')) return { bg:CL.rustBg, bdr:CL.rustBdr, c:CL.rust };
  if (t.includes('lease')||t.includes('partial')||t.includes('below market')||t.includes('vacant')||t.includes('lease-up')||t.includes('expired')||t.includes('tenant credit')||t.includes('downsizing')) return { bg:CL.amberBg, bdr:CL.amberBdr, c:CL.amber };
  if (t.includes('slb')||t.includes('market rent growth')||t.includes('expansion')||t.includes('hiring')) return { bg:CL.greenBg, bdr:CL.greenBdr, c:CL.green };
  if (t.includes('institutional')||t.includes('investment grade')||t.includes('private llc')||t.includes('estate')||t.includes('trust')||t.includes('debt')||t.includes('prior listing')||t.includes('no broker')) return { bg:CL.blueBg, bdr:CL.blueBdr, c:CL.blue };
  if (t.includes('capex')||t.includes('vintage')||t.includes('low clear')||t.includes('coverage')||t.includes('multi-parcel')||t.includes('roof')||t.includes('environmental')||t.includes('rezoning')) return { bg:CL.purpleBg, bdr:CL.purpleBdr, c:CL.purple };
  return { bg:CL.blueBg, bdr:CL.blueBdr, c:CL.blue };
};

const getSignalColor = (tag) => {
  const t = (tag||'').toLowerCase();
  if (t.includes('warn')||t.includes('vacant')||t.includes('expired')) return CL.rust;
  if (t.includes('lease')||t.includes('below market')) return CL.amber;
  if (t.includes('slb')) return CL.green;
  return CL.purple;
};

// Urgency check — used for catalyst pulse animation
const isUrgentTag = (tag) => {
  const t = (tag||'').toLowerCase();
  return t.includes('warn') || t.includes('nod') || t.includes('bankruptcy') || t.includes('expired') || t.includes('vacant') || t.includes('owner distress');
};

const ghostBtn = { display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:7, fontFamily:"'Instrument Sans',sans-serif", fontSize:13, fontWeight:500, cursor:'pointer', border:`1px solid ${CL.line}`, background:CL.card, color:CL.ink3, whiteSpace:'nowrap', transition:'all .12s' };
const primaryBtn = { ...ghostBtn, background:CL.blue, color:'#fff', borderColor:CL.blue };
const tdM = { padding:'12px 14px', fontSize:14, color:CL.ink4, verticalAlign:'middle' };
const tdMono = { padding:'12px 14px', fontFamily:"'DM Mono',monospace", fontSize:13, color:CL.ink2, verticalAlign:'middle' };

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortCol, setSortCol] = useState('ai_score');
  const [sortDir, setSortDir] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);

  // Live feature state
  const [signals, setSignals] = useState([]);
  const [deltas, setDeltas] = useState({ props: 0, signals: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState({ minScore:0, minFit:0, minOrs:0, minSF:'', maxSF:'', minHt:0, expiry:'Any', submarket:'Any', ownerType:'Any', holdYears:'Any', catalyst:'Any' });
  const [savedViews, setSavedViews] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);

  // ① Bulk action modals
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [showCampaignPicker, setShowCampaignPicker] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagMode, setBulkTagMode] = useState('add'); // 'add' | 'remove'
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [comparisonAI, setComparisonAI] = useState('');
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // ── FETCH ───────────────────────────────────────────────
  useEffect(() => { fetchProperties(); loadSavedViews(); }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('properties').select('*').order('ai_score', { ascending: false, nullsFirst: false });
      if (error) throw error;
      const list = data || [];
      setProperties(list);

      // Build market intel ticker
      let tickerItems = [];
      try {
        const { data: news } = await supabase.from('news_articles').select('title, source, published_at, url').order('published_at', { ascending: false }).limit(10);
        if (news && news.length > 0) {
          tickerItems = news.map(n => ({ tag: n.source || 'Market Intel', addr: n.title || '—', city: '', time: n.published_at }));
        }
      } catch {}
      const propSigs = list
        .filter(p => (p.catalyst_tags||[]).length > 0 && p.updated_at)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, Math.max(0, 15 - tickerItems.length))
        .map(p => ({ tag: (p.catalyst_tags||[])[0], addr: p.property_name||p.address||'—', city: p.city, time: p.updated_at }));
      setSignals([...tickerItems, ...propSigs]);

      // Deltas — count added/changed in last 7 days
      const cutoff = new Date(Date.now() - 7*864e5).toISOString();
      setDeltas({
        props: list.filter(p => p.created_at > cutoff).length,
        signals: list.filter(p => p.updated_at > cutoff && (p.catalyst_tags||[]).length > 0).length,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Saved views
  const loadSavedViews = () => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('cl_saved_views') : null;
      if (raw) setSavedViews(JSON.parse(raw));
    } catch {}
  };
  const saveView = () => {
    const name = prompt('Name this view:');
    if (!name) return;
    const view = { name, filter: activeFilter, adv: { ...advFilters }, search, sort: sortCol, dir: sortDir };
    const next = [...savedViews, view];
    setSavedViews(next);
    try { localStorage.setItem('cl_saved_views', JSON.stringify(next)); } catch {}
  };
  const loadView = (v) => {
    setActiveFilter(v.filter || 'All');
    if (v.adv) setAdvFilters(v.adv);
    if (v.search) setSearch(v.search);
    if (v.sort) { setSortCol(v.sort); setSortDir(v.dir || 'desc'); }
    setShowSaved(false);
  };
  const deleteView = (i) => {
    const next = savedViews.filter((_, j) => j !== i);
    setSavedViews(next);
    try { localStorage.setItem('cl_saved_views', JSON.stringify(next)); } catch {}
  };

  // ── FILTERING + SORTING ─────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...properties];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => [p.property_name,p.address,p.city,p.submarket,p.owner,p.tenant].some(f => (f||'').toLowerCase().includes(q)));
    }
    switch (activeFilter) {
      case 'SGV': list = list.filter(p => (p.market||p.submarket||'').toLowerCase().includes('sgv')); break;
      case 'IE': list = list.filter(p => (p.market||p.submarket||'').toLowerCase().includes('ie')); break;
      case 'Occupied': list = list.filter(p => (p.vacancy_status||'').toLowerCase().includes('occupied')); break;
      case 'Vacant': list = list.filter(p => (p.vacancy_status||'').toLowerCase().includes('vacant')); break;
      case 'Partial': list = list.filter(p => (p.vacancy_status||'').toLowerCase().includes('partial')); break;
      case 'WARN': list = list.filter(p => (p.catalyst_tags||[]).some(t => t.toLowerCase().includes('warn'))); break;
      case 'Lease Expiry': list = list.filter(p => { const m = monthsUntil(p.lease_expiration); return m != null && m <= 24; }); break;
      case 'SLB': list = list.filter(p => (p.catalyst_tags||[]).some(t => t.toLowerCase().includes('slb'))); break;
      case 'High Fit': list = list.filter(p => (p.fit_score||0) >= 65); break;
      case 'Acq Target': list = list.filter(p => p.is_acq_target === true); break;
    }
    const af = advFilters;
    if (af.minScore > 0) list = list.filter(p => (p.ai_score||0) >= af.minScore);
    if (af.minFit > 0) list = list.filter(p => (p.fit_score||0) >= af.minFit);
    if (af.minOrs > 0) list = list.filter(p => (p.probability||0) >= af.minOrs);
    if (af.minSF) list = list.filter(p => (p.building_sf||0) >= parseInt(af.minSF.replace(/,/g,''))||0);
    if (af.maxSF) list = list.filter(p => (p.building_sf||0) <= parseInt(af.maxSF.replace(/,/g,''))||Infinity);
    if (af.minHt > 0) list = list.filter(p => (p.clear_height||0) >= af.minHt);
    if (af.expiry !== 'Any') {
      const map = { '≤6mo':6, '≤12mo':12, '≤24mo':24, '≤36mo':36, 'Expired':0 };
      const mo = map[af.expiry];
      if (mo === 0) list = list.filter(p => p.lease_expiration && new Date(p.lease_expiration) < new Date());
      else if (mo) list = list.filter(p => { const m = monthsUntil(p.lease_expiration); return m != null && m <= mo; });
    }
    if (af.submarket !== 'Any') list = list.filter(p => (p.submarket||'').toLowerCase().includes(af.submarket.toLowerCase()));
    if (af.ownerType !== 'Any') list = list.filter(p => (p.owner_type||'').toLowerCase().includes(af.ownerType.toLowerCase()));
    if (af.holdYears !== 'Any') {
      const yrs = parseInt(af.holdYears);
      if (yrs) list = list.filter(p => { if (!p.last_transfer_date) return false; return (new Date().getFullYear() - new Date(p.last_transfer_date).getFullYear()) >= yrs; });
    }
    if (af.catalyst !== 'Any') list = list.filter(p => (p.catalyst_tags||[]).some(t => t.toLowerCase().includes(af.catalyst.toLowerCase())));
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
    const acqTargets = filtered.filter(p => p.is_acq_target === true).length;
    return { total: filtered.length, totalSF, occupied, vacantPartial, signals: sigs, acqTargets };
  }, [filtered]);

  const counts = useMemo(() => ({
    all: properties.length,
    sgv: properties.filter(p => (p.market||p.submarket||'').toLowerCase().includes('sgv')).length,
    ie: properties.filter(p => (p.market||p.submarket||'').toLowerCase().includes('ie')).length,
  }), [properties]);

  const submarkets = useMemo(() => [...new Set(properties.map(p => p.submarket).filter(Boolean))].sort(), [properties]);
  const allTags = useMemo(() => {
    const tagCounts = {};
    properties.forEach(p => (p.catalyst_tags||[]).forEach(t => { tagCounts[t] = (tagCounts[t]||0) + 1; }));
    return Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [properties]);

  const handleSort = useCallback((col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }, [sortCol]);

  // Bulk selection
  const toggleSelect = (id) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(p => p.id))); };
  const clearSelection = () => setSelected(new Set());

  // Compare
  const compareProps = useMemo(() => [...selected].slice(0, 3).map(id => properties.find(p => p.id === id)).filter(Boolean), [selected, properties]);

  // ⑤ AI Comparison Summary
  const generateComparison = async () => {
    if (compareProps.length < 2 || comparisonLoading) return;
    setComparisonLoading(true);
    setComparisonAI('');
    try {
      const context = compareProps.map(p => ({
        name: p.property_name || p.address,
        city: p.city, submarket: p.submarket,
        sf: p.building_sf, clear_ht: p.clear_height, year: p.year_built,
        dock_doors: p.dock_doors, truck_court: p.truck_court_depth,
        score: p.ai_score, ors: p.probability,
        owner: p.owner, owner_type: p.owner_type,
        tenant: p.tenant, vacancy: p.vacancy_status,
        lease_exp: p.lease_expiration, in_place_rent: p.in_place_rent, market_rent: p.market_rent,
        tags: (p.catalyst_tags || []).slice(0, 5),
      }));
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are Clerestory, an AI acquisition intelligence system. Compare these ${context.length} industrial properties for an institutional buyer. For each property, summarize its strengths and weaknesses. Then give a clear recommendation on which is the strongest acquisition target and why. Be specific with numbers. Keep it to 4-6 sentences per property plus a 2-3 sentence verdict.\n\nProperties:\n${JSON.stringify(context, null, 2)}`,
          type: 'property_comparison',
        }),
      });
      const data = await res.json();
      setComparisonAI(data.content || data.text || 'Analysis unavailable — check API credits.');
    } catch (e) {
      setComparisonAI('Error generating comparison: ' + e.message);
    } finally {
      setComparisonLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  // ① BULK ACTION HANDLERS
  // ═══════════════════════════════════════════════════════

  // Export CSV
  const handleExportCSV = () => {
    const rows = properties.filter(p => selected.has(p.id));
    if (rows.length === 0) return;
    const headers = ['Property Name','Address','City','Market','Submarket','Building SF','Clear Height','Land Acres','Year Built','Owner','Owner Type','Tenant','Vacancy Status','Lease Expiration','In-Place Rent','Market Rent','Building Score','Fit Score','Fit Grade','Acq Target','Catalyst Tags'];
    const csvRows = [headers.join(',')];
    rows.forEach(p => {
      csvRows.push([
        `"${(p.property_name||'').replace(/"/g,'""')}"`,
        `"${(p.address||'').replace(/"/g,'""')}"`,
        `"${(p.city||'').replace(/"/g,'""')}"`,
        `"${(p.market||'').replace(/"/g,'""')}"`,
        `"${(p.submarket||'').replace(/"/g,'""')}"`,
        p.building_sf||'',
        p.clear_height||'',
        p.land_acres||'',
        p.year_built||'',
        `"${(p.owner||'').replace(/"/g,'""')}"`,
        `"${(p.owner_type||'').replace(/"/g,'""')}"`,
        `"${(p.tenant||'').replace(/"/g,'""')}"`,
        `"${(p.vacancy_status||'').replace(/"/g,'""')}"`,
        p.lease_expiration||'',
        p.in_place_rent||'',
        p.market_rent||'',
        p.ai_score||'',
        p.fit_score||'',
        `"${(p.fit_grade||'').replace(/"/g,'""')}"`,
        p.is_acq_target ? 'Yes' : 'No',
        `"${(p.catalyst_tags||[]).join('; ')}"`,
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clerestory_properties_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export IC Memo (text file with synthesis for selected properties)
  const handleExportMemo = () => {
    const rows = properties.filter(p => selected.has(p.id));
    if (rows.length === 0) return;
    let text = `CLERESTORY — PROPERTY INTELLIGENCE MEMO\nGenerated ${new Date().toLocaleString()}\n${'═'.repeat(60)}\n\n`;
    rows.forEach(p => {
      text += `${'─'.repeat(50)}\n`;
      text += `${p.property_name || p.address || '—'}\n`;
      text += `${[p.city,'CA',p.zip].filter(Boolean).join(', ')}\n`;
      text += `Market: ${p.market || '—'} · ${p.submarket || '—'}\n`;
      text += `SF: ${p.building_sf ? Number(p.building_sf).toLocaleString() : '—'} | Clear Ht: ${p.clear_height ? `${p.clear_height}'` : '—'} | Year: ${p.year_built||'—'}\n`;
      text += `Owner: ${p.owner||'—'} (${p.owner_type||'—'})\n`;
      text += `Tenant: ${p.tenant||'Vacant'} | Status: ${p.vacancy_status||'—'}\n`;
      text += `Score: ${p.ai_score||'—'} | Tags: ${(p.catalyst_tags||[]).join(', ')||'None'}\n\n`;
      if (p.ai_synthesis) { text += `AI SYNTHESIS:\n${p.ai_synthesis}\n\n`; }
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clerestory_memo_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Bulk Tag — add or remove a tag from all selected properties
  const handleBulkTag = async () => {
    if (!bulkTagInput.trim()) return;
    setBulkProcessing(true);
    const tag = bulkTagInput.trim();
    const ids = [...selected];
    try {
      for (const id of ids) {
        const prop = properties.find(p => p.id === id);
        if (!prop) continue;
        const existing = Array.isArray(prop.catalyst_tags) ? [...prop.catalyst_tags] : [];
        let updated;
        if (bulkTagMode === 'add') {
          updated = existing.includes(tag) ? existing : [...existing, tag];
        } else {
          updated = existing.filter(t => t !== tag);
        }
        await supabase.from('properties').update({ catalyst_tags: updated, updated_at: new Date().toISOString() }).eq('id', id);
      }
      setShowBulkTag(false);
      setBulkTagInput('');
      fetchProperties();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setBulkProcessing(false); }
  };

  // Add to Campaign
  const openCampaignPicker = async () => {
    setShowCampaignPicker(true);
    try {
      const { data } = await supabase.from('research_campaigns').select('id, name, market, status').order('created_at', { ascending: false }).limit(20);
      setCampaigns(data || []);
    } catch {}
  };
  const handleAddToCampaign = async (campaignId) => {
    setBulkProcessing(true);
    const ids = [...selected];
    try {
      const targets = ids.map(id => {
        const p = properties.find(pp => pp.id === id);
        return {
          campaign_id: campaignId,
          owner: p?.owner || '—',
          address: p?.address || '—',
          city: p?.city || '',
          apn: '',
          status: 'New',
          property_id: id,
          notes: `Added from bulk action · ${(p?.catalyst_tags||[]).slice(0,2).join(', ')}`,
        };
      });
      const { error } = await supabase.from('campaign_targets').insert(targets);
      if (error) throw error;
      alert(`✓ ${ids.length} properties added to campaign`);
      setShowCampaignPicker(false);
      clearSelection();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setBulkProcessing(false); }
  };

  // Convert to Acquisition (creates deal records)
  const handleConvertToAcq = async () => {
    const ids = [...selected];
    const count = ids.length;
    if (!confirm(`Create ${count} acquisition deal${count > 1 ? 's' : ''} from selected properties?`)) return;
    setBulkProcessing(true);
    let created = 0;
    try {
      for (const id of ids) {
        const p = properties.find(pp => pp.id === id);
        if (!p) continue;
        const { error } = await supabase.from('deals').insert({
          deal_name: p.property_name || p.address || 'New Acquisition',
          address: p.address,
          city: p.city,
          market: p.market,
          stage: 'Screening',
          deal_type: 'Acquisition',
          property_id: id,
          notes: `Converted from property · Score: ${p.ai_score||'—'} · Tags: ${(p.catalyst_tags||[]).join(', ')}`,
        });
        if (!error) created++;
      }
      alert(`✓ ${created} acquisition${created > 1 ? 's' : ''} created`);
      clearSelection();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setBulkProcessing(false); }
  };

  // Add property
  const [newProp, setNewProp] = useState({ property_name:'', address:'', city:'', state:'CA', zip:'' });
  const handleAdd = async () => {
    if (!newProp.property_name && !newProp.address) return;
    try {
      await supabase.from('properties').insert([{ ...newProp, property_name: newProp.property_name || newProp.address }]);
      setShowAddModal(false); setNewProp({ property_name:'', address:'', city:'', state:'CA', zip:'' }); fetchProperties();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const cols = [
    { key: 'property_name', label: 'Property' },
    { key: 'submarket', label: 'Market' },
    { key: 'fit_score', label: 'Fit' },
    { key: 'ai_score', label: 'Bldg' },
    { key: 'probability', label: 'Seller Readiness' },
    { key: 'building_sf', label: 'Property SF' },
    { key: 'clear_height', label: 'Clear Ht' },
    { key: 'land_acres', label: 'Land AC' },
    { key: null, label: 'Coverage' },
    { key: 'year_built', label: 'Yr Built' },
    { key: 'owner', label: 'Owner' },
    { key: 'lease_expiration', label: 'Lease Exp.' },
    { key: null, label: 'Status' },
    { key: null, label: 'Catalysts' },
  ];

  // ── RENDER ──────────────────────────────────────────────
  return (
    <>
      {/* ═══ LIVE SIGNAL TICKER ═══ */}
      {signals.length > 0 && (
        <div style={{ background:'linear-gradient(90deg,#1A2130,#1F2840,#1A2130)', borderRadius:CL.radius, overflow:'hidden', marginBottom:20, height:38, position:'relative', border:'1px solid rgba(100,128,162,0.15)' }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:110, background:'linear-gradient(90deg,#1A2130 70%,transparent)', zIndex:5, display:'flex', alignItems:'center', paddingLeft:14, gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#F08880', animation:'blink 1.4s infinite' }} />
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(240,235,225,0.7)' }}>Market Intel</span>
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
            <button onClick={() => alert('Map view coming in next build — Leaflet satellite map with clustered markers.')} style={{ padding:'7px 14px', fontSize:12, fontWeight:500, cursor:'pointer', border:'none', background:'transparent', color:CL.ink4, fontFamily:"'Instrument Sans',sans-serif" }}>🗺 Map</button>
            <button onClick={() => alert('Cards view coming in next build — grid with aerial thumbnails and score rings.')} style={{ padding:'7px 14px', fontSize:12, fontWeight:500, cursor:'pointer', border:'none', background:'transparent', color:CL.ink4, fontFamily:"'Instrument Sans',sans-serif" }}>◫ Cards</button>
          </div>
          <button style={ghostBtn} onClick={() => setShowFilters(prev => !prev)}>⊕ {showFilters ? 'Hide' : 'Advanced'} Filters</button>
          <button style={ghostBtn} onClick={() => setShowCompare(prev => !prev)}>⊞ Compare{selected.size > 0 ? ` (${Math.min(selected.size, 3)})` : ''}</button>
          <button onClick={() => setShowAddModal(true)} style={primaryBtn}>+ Add Property</button>
        </div>
      </div>

      {/* ═══ KPI STRIP WITH ② "7d" DELTA LABELS ═══ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
        <KPI icon="🏢" bg={CL.blueBg} color={CL.blue} value={kpis.total} label="Total Properties" delta={deltas.props > 0 ? `+${deltas.props}` : null} up />
        <KPI icon="◫" bg={CL.amberBg} color={CL.amber} value={fmtSF(kpis.totalSF)} label="Total SF Tracked" />
        <KPI icon="◈" bg={CL.greenBg} color={CL.green} value={kpis.acqTargets} label="Acq Targets" />
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
            <FilterField label="Min IDS Fit Score">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="range" min="0" max="100" value={advFilters.minFit} onChange={e => setAdvFilters(f => ({ ...f, minFit: Number(e.target.value) }))} style={{ flex:1, accentColor:CL.green }} />
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:CL.green, minWidth:28, textAlign:'right' }}>{advFilters.minFit}</span>
              </div>
            </FilterField>
            <FilterField label="Min Seller Readiness (ORS)">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="range" min="0" max="100" value={advFilters.minOrs} onChange={e => setAdvFilters(f => ({ ...f, minOrs: Number(e.target.value) }))} style={{ flex:1, accentColor:CL.rust }} />
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:CL.rust, minWidth:28, textAlign:'right' }}>{advFilters.minOrs}</span>
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
                {['Any', ...allTags].map(o => <option key={o}>{o}</option>)}
              </select>
            </FilterField>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16, paddingTop:14, borderTop:`1px solid ${CL.line}` }}>
            <button onClick={() => setAdvFilters({ minScore:0, minFit:0, minOrs:0, minSF:'', maxSF:'', minHt:0, expiry:'Any', submarket:'Any', ownerType:'Any', holdYears:'Any', catalyst:'Any' })} style={ghostBtn}>Clear All</button>
            <button onClick={() => setShowFilters(false)} style={primaryBtn}>Apply · {filtered.length} results</button>
          </div>
        </div>
      )}

      {/* ═══ FILTER CHIPS + SAVED VIEWS + SEARCH ═══ */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {[{k:'All',ct:counts.all},{k:'SGV',ct:counts.sgv},{k:'IE',ct:counts.ie}].map(f =>
          <Chip key={f.k} label={f.k} count={f.ct} active={activeFilter===f.k} onClick={() => setActiveFilter(f.k)} />)}
        <Sep />
        {[{k:'Occupied',dot:CL.green},{k:'Vacant',dot:CL.rust},{k:'Partial',dot:CL.amber}].map(f =>
          <Chip key={f.k} label={f.k} dot={f.dot} active={activeFilter===f.k} onClick={() => setActiveFilter(f.k)} />)}
        <Sep />
        {['WARN','Lease Expiry','SLB','High Fit','Acq Target'].map(f =>
          <Chip key={f} label={f==='WARN'?'⚡ WARN':f==='High Fit'?'★ High Fit':f==='Acq Target'?'◈ Acq Target':f} active={activeFilter===f} onClick={() => setActiveFilter(f)} />)}

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

        <div style={{ position:'relative', flex:1, maxWidth:360, marginLeft:'auto' }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:CL.ink4, pointerEvents:'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search properties, owners, tenants…"
            style={{ width:'100%', padding:'8px 14px 8px 36px', border:`1px solid ${CL.line}`, borderRadius:8, fontFamily:"'Instrument Sans',sans-serif", fontSize:14, color:CL.ink, background:CL.card, outline:'none' }} />
        </div>
      </div>

      {/* ═══ TABLE ═══ */}
      <div style={{ background:CL.card, borderRadius:12, boxShadow:CL.shadow, border:`1px solid ${CL.line2}`, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ width:36, padding:'11px 10px', borderBottom:`2px solid ${CL.line}`, background:CL.bg }}>
              <div onClick={toggleAll} style={{ width:18, height:18, border:`2px solid ${selected.size===filtered.length&&filtered.length>0?CL.blue:CL.line}`, borderRadius:4, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', background:selected.size===filtered.length&&filtered.length>0?CL.blue:'transparent' }}>
                {selected.size===filtered.length&&filtered.length>0?'✓':''}
              </div>
            </th>
            {cols.map((col, i) => (
              <th key={i} onClick={() => col.key && handleSort(col.key)} style={{
                padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:600,
                letterSpacing:'.08em', textTransform:'uppercase', whiteSpace:'nowrap',
                color:sortCol===col.key?CL.blue:CL.ink3,
                borderBottom:`2px solid ${CL.line}`, background:CL.bg,
                cursor:col.key?'pointer':'default', userSelect:'none',
              }}>
                {col.label}
                {col.key && <span style={{ opacity:sortCol===col.key?1:0.35, fontSize:10, marginLeft:4 }}>{sortCol===col.key?(sortDir==='desc'?'↓':'↑'):'↕'}</span>}
              </th>
            ))}
            <th style={{ width:28, borderBottom:`2px solid ${CL.line}`, background:CL.bg }} />
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={15} style={{ padding:48, textAlign:'center', color:CL.ink4, fontSize:16 }}>Loading properties…</td></tr> :
             filtered.length === 0 ? <tr><td colSpan={15} style={{ padding:48, textAlign:'center', color:CL.ink4, fontSize:16 }}>No properties match filters.</td></tr> :
             filtered.map((p, idx) => {
              const mo = monthsUntil(p.lease_expiration);
              const isSel = selected.has(p.id);
              const cov = (p.building_sf && p.land_acres) ? ((p.building_sf / (p.land_acres * 43560)) * 100).toFixed(1) : null;
              const grade = getGrade(p.ai_score);
              const isTopTier = grade === 'A+';
              return (
                <tr key={p.id} onClick={() => router.push(`/properties/${p.id}`)}
                  style={{ borderBottom:`1px solid ${CL.line2}`, cursor:'pointer', transition:'background .1s', background:isSel?'rgba(78,110,150,0.05)':'' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background='#F8F6F2'; setHoverIdx(idx); }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background=''; setHoverIdx(null); }}>
                  <td style={{ padding:'12px 10px', verticalAlign:'middle' }}>
                    <div onClick={e => { e.stopPropagation(); toggleSelect(p.id); }}
                      style={{ width:18, height:18, border:`2px solid ${isSel?CL.blue:CL.line}`, borderRadius:4, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', background:isSel?CL.blue:'transparent', transition:'all .12s' }}>
                      {isSel?'✓':''}
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px', verticalAlign:'middle', maxWidth:220 }}>
                    <div style={{ fontWeight:600, color:CL.ink, fontSize:14 }}>{p.property_name||p.address||'—'}</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontSize:13, color:CL.ink4, marginTop:1 }}>{[p.city,'CA',p.zip].filter(Boolean).join(', ')||'—'}</div>
                  </td>
                  <td style={tdM}>{p.market && p.submarket ? `${p.market} · ${p.submarket}` : (p.submarket||p.market||'—')}</td>
                  {/* Fit Score — IDS Portfolio Fit */}
                  <td style={{ padding:'12px 14px', verticalAlign:'middle' }}>
                    {p.fit_score != null ? (() => {
                      const fg = p.fit_grade || '—';
                      const fc = p.fit_score >= 65 ? CL.green : p.fit_score >= 35 ? CL.amber : CL.ink4;
                      const fbg = p.fit_score >= 65 ? CL.greenBg : p.fit_score >= 35 ? CL.amberBg : 'rgba(0,0,0,0.03)';
                      const fbdr = p.fit_score >= 65 ? CL.greenBdr : p.fit_score >= 35 ? CL.amberBdr : CL.line;
                      const isAcq = p.is_acq_target;
                      return (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div className={isAcq ? 'score-ring fit-ring-glow' : 'score-ring'} style={{
                            width:38, height:38, borderRadius:'50%',
                            border:`2.5px solid ${fbdr}`, background:fbg,
                            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                            animation:'scoreIn 0.5s ease both', animationDelay:`${idx * 30}ms`,
                          }}>
                            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:fc, lineHeight:1 }}>{p.fit_score}</span>
                            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:fc, marginTop:1 }}>{fg}</span>
                          </div>
                          {isAcq && <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, fontWeight:700, color:CL.green, background:CL.greenBg, border:`1px solid ${CL.greenBdr}`, borderRadius:3, padding:'1px 4px' }}>ACQ</span>}
                        </div>
                      );
                    })() : <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:CL.ink4 }}>—</span>}
                  </td>
                  {/* ③ Animated Building Score Ring — A+ glow */}
                  <td style={{ padding:'12px 14px', verticalAlign:'middle' }}>
                    <div className={isTopTier ? 'score-ring score-ring-glow' : 'score-ring'} style={{
                      width:38, height:38, borderRadius:'50%',
                      border:`2px solid ${getScoreColor(p.ai_score)}`,
                      background:p.ai_score>=70?CL.blueBg:p.ai_score>=55?CL.amberBg:'rgba(0,0,0,0.03)',
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      animation: 'scoreIn 0.5s ease both',
                      animationDelay: `${idx * 30}ms`,
                    }}>
                      <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:getScoreColor(p.ai_score), lineHeight:1 }}>{p.ai_score??'—'}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:getScoreColor(p.ai_score), marginTop:1 }}>{grade}</span>
                    </div>
                  </td>
                  {/* Seller Readiness (ORS) */}
                  <td style={{ padding:'12px 14px', verticalAlign:'middle' }}>
                    {p.probability != null ? (
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{
                          width:40, height:40, borderRadius:'50%',
                          border:`2.5px solid ${p.probability >= 75 ? CL.rustBdr : p.probability >= 50 ? CL.amberBdr : p.probability >= 25 ? CL.blueBdr : CL.line}`,
                          background: p.probability >= 75 ? CL.rustBg : p.probability >= 50 ? CL.amberBg : p.probability >= 25 ? CL.blueBg : 'rgba(0,0,0,0.03)',
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                          animation: 'scoreIn 0.5s ease both',
                          animationDelay: `${idx * 30 + 80}ms`,
                        }}>
                          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color: p.probability >= 75 ? CL.rust : p.probability >= 50 ? CL.amber : p.probability >= 25 ? CL.blue : CL.ink4, lineHeight:1 }}>{p.probability}</span>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column' }}>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700, color: p.probability >= 75 ? CL.rust : p.probability >= 50 ? CL.amber : CL.ink4, lineHeight:1 }}>
                            {p.probability >= 75 ? 'ACT NOW' : p.probability >= 50 ? 'WARM' : p.probability >= 25 ? 'WATCH' : 'COOL'}
                          </span>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:CL.ink4, marginTop:2 }}>ORS</span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:CL.ink4 }}>—</span>
                    )}
                  </td>
                  <td style={tdMono}>{fmt(p.building_sf)}</td>
                  <td style={tdMono}>{p.clear_height ? `${p.clear_height}'` : '—'}</td>
                  <td style={tdMono}>{p.land_acres ? Number(p.land_acres).toFixed(2) : '—'}</td>
                  <td style={tdMono}>{cov ? `${cov}%` : '—'}</td>
                  <td style={tdMono}>{p.year_built || '—'}</td>
                  <td style={{ ...tdM, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.owner||'—'}</td>
                  <td style={{ ...tdMono, color:mo!=null&&mo<=12?CL.rust:mo!=null&&mo<=24?CL.amber:CL.ink2 }}>{fmtExpiry(p.lease_expiration)}</td>
                  <td style={{ padding:'12px 14px', verticalAlign:'middle' }}><StatusTag status={p.vacancy_status} /></td>
                  {/* ③ Catalyst tags — urgent ones pulse */}
                  <td style={{ padding:'12px 14px', verticalAlign:'middle' }}>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
                      {(p.catalyst_tags||[]).slice(0,2).map((tag, i) => {
                        const s = getTagStyle(tag);
                        const urgent = isUrgentTag(tag);
                        return <span key={i} className={urgent ? 'catalyst-pulse' : ''} style={{ display:'inline-flex', padding:'3px 8px', borderRadius:5, fontSize:11, fontWeight:600, background:s.bg, border:`1px solid ${s.bdr}`, color:s.c }}>{tag}</span>;
                      })}
                      {(p.catalyst_tags||[]).length > 2 && <span style={{ fontSize:11, color:CL.ink4, fontFamily:"'DM Mono',monospace" }}>+{(p.catalyst_tags||[]).length-2}</span>}
                      {p.ai_synthesis && <AISparkle text={p.ai_synthesis} />}
                    </div>
                  </td>
                  <td style={{ padding:'12px 8px', color:CL.ink4, fontSize:14, opacity:0.5, verticalAlign:'middle' }}>›</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && filtered.length > 0 && <div style={{ padding:'14px 0', fontSize:14, color:CL.ink4 }}>Showing {filtered.length} of {properties.length} properties</div>}

      {/* ═══ ① BULK ACTION BAR — all buttons wired ═══ */}
      {selected.size > 0 && (
        <div style={{ position:'fixed', bottom:0, left:242, right:0, background:'linear-gradient(90deg,#1A2130,#1F2840)', padding:'12px 24px', display:'flex', alignItems:'center', gap:12, zIndex:50, boxShadow:'0 -4px 20px rgba(0,0,0,0.15)', borderTop:'2px solid rgba(100,128,162,0.25)' }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#fff', marginRight:4 }}>{selected.size}</span>
          <span style={{ fontSize:13, color:'rgba(245,240,232,0.7)', marginRight:12 }}>selected</span>
          <BulkBtn onClick={handleExportMemo}>📄 Export IC Memo</BulkBtn>
          <BulkBtn onClick={handleExportCSV}>📊 Export CSV</BulkBtn>
          <BulkBtn onClick={() => setShowBulkTag(true)}>🏷 Bulk Tag</BulkBtn>
          <BulkBtn onClick={openCampaignPicker}>📬 Add to Campaign</BulkBtn>
          <BulkBtn green onClick={handleConvertToAcq}>◈ Convert to Acq</BulkBtn>
          <span onClick={clearSelection} style={{ marginLeft:'auto', color:'rgba(245,240,232,0.5)', cursor:'pointer', fontSize:18, padding:'4px 8px' }}>✕</span>
        </div>
      )}

      {/* ═══ COMPARE DRAWER ═══ */}
      {showCompare && (
        <div style={{ position:'fixed', right:0, top:0, bottom:0, width:480, background:CL.card, boxShadow:'-8px 0 30px rgba(0,0,0,0.12)', zIndex:200, borderLeft:`1px solid ${CL.line2}`, display:'flex', flexDirection:'column', animation:'slideIn .3s ease' }}>
          <div style={{ padding:'18px 24px', borderBottom:`1px solid ${CL.line}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:14, fontWeight:600 }}>⊞ Property Comparison <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:CL.ink4, marginLeft:4 }}>{Math.min(selected.size, 3)} of 3 max</span></span>
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
                { label:'Building SF', fn:p=>fmt(p.building_sf), best:'max', key:'building_sf' },
                { label:'Clear Height', fn:p=>p.clear_height?`${p.clear_height}'`:'—', best:'max', key:'clear_height' },
                { label:'Year Built', fn:p=>p.year_built||'—', best:'max', key:'year_built' },
                { label:'Dock Doors', fn:p=>p.dock_doors||'—', best:'max', key:'dock_doors' },
                { label:'Truck Court', fn:p=>p.truck_court_depth?`${p.truck_court_depth}'`:'—', best:'max', key:'truck_court_depth' },
                { label:'Building Score', fn:p=>p.ai_score!=null?`${p.ai_score} ${getGrade(p.ai_score)}`:'—', best:'max', key:'ai_score' },
                { label:'IDS Fit Score', fn:p=>p.fit_score!=null?`${p.fit_score} ${p.fit_grade||''} ${p.is_acq_target?'◈ ACQ':''}`:'—', best:'max', key:'fit_score' },
                { label:'Land AC', fn:p=>p.land_acres?Number(p.land_acres).toFixed(2):'—', best:'max', key:'land_acres' },
                { label:'Coverage', fn:p=>(p.building_sf&&p.land_acres)?`${((p.building_sf/(p.land_acres*43560))*100).toFixed(1)}%`:'—' },
                { label:'In-Place Rent', fn:p=>p.in_place_rent?`$${Number(p.in_place_rent).toFixed(2)}/SF`:'—' },
                { label:'Market Rent', fn:p=>p.market_rent?`$${Number(p.market_rent).toFixed(2)}/SF`:'—' },
                { label:'Lease Expiry', fn:p=>fmtExpiry(p.lease_expiration) },
                { label:'Owner Type', fn:p=>p.owner_type||'—' },
                { label:'Catalysts', fn:p=>(p.catalyst_tags||[]).slice(0,3).join(', ')||'—' },
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
              {/* ⑤ AI Comparison Summary */}
              <div style={{ borderTop:`2px solid ${CL.line}`, padding:'16px 20px' }}>
                {comparisonAI ? (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <span style={{ fontSize:13, color:CL.purple }}>✦</span>
                      <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:CL.purple }}>AI Acquisition Comparison</span>
                      <button onClick={generateComparison} disabled={comparisonLoading} style={{ marginLeft:'auto', fontSize:11, color:CL.purple, background:'none', border:`1px solid ${CL.purpleBdr}`, borderRadius:5, padding:'3px 9px', cursor:'pointer', fontFamily:"'Instrument Sans',sans-serif" }}>↻ Regenerate</button>
                    </div>
                    <div style={{ fontSize:13, lineHeight:1.72, color:CL.ink2, whiteSpace:'pre-wrap' }}>{comparisonAI}</div>
                  </div>
                ) : (
                  <button onClick={generateComparison} disabled={comparisonLoading || compareProps.length < 2}
                    style={{ width:'100%', padding:'14px', borderRadius:8, border:`1px solid ${CL.purpleBdr}`, background:CL.purpleBg, color:CL.purple, fontSize:13, fontWeight:600, cursor: compareProps.length < 2 ? 'default' : 'pointer', opacity: compareProps.length < 2 ? 0.4 : 1, fontFamily:"'Instrument Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    {comparisonLoading ? '⟳ Analyzing properties…' : '✦ Generate AI Comparison Summary'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ① BULK TAG MODAL ═══ */}
      {showBulkTag && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setShowBulkTag(false)}>
          <div style={{ background:'#fff', borderRadius:14, boxShadow:CL.shadowMd, padding:28, width:440, maxWidth:'90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize:20, fontWeight:500, marginBottom:4 }}>🏷 Bulk Tag — {selected.size} Properties</h2>
            <p style={{ fontSize:13, color:CL.ink4, marginBottom:20 }}>Add or remove a catalyst tag from all selected properties.</p>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <button onClick={() => setBulkTagMode('add')} style={{ ...ghostBtn, ...(bulkTagMode==='add' ? { background:CL.blue, color:'#fff', borderColor:CL.blue } : {}) }}>+ Add Tag</button>
              <button onClick={() => setBulkTagMode('remove')} style={{ ...ghostBtn, ...(bulkTagMode==='remove' ? { background:CL.rust, color:'#fff', borderColor:CL.rust } : {}) }}>− Remove Tag</button>
            </div>
            <input value={bulkTagInput} onChange={e => setBulkTagInput(e.target.value)} placeholder="Type tag name or select below…"
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:`1px solid ${CL.line}`, fontFamily:"'Instrument Sans',sans-serif", fontSize:15, color:CL.ink2, background:CL.bg, outline:'none', marginBottom:12 }} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20, maxHeight:120, overflowY:'auto' }}>
              {allTags.slice(0, 20).map(tag => {
                const s = getTagStyle(tag);
                return <span key={tag} onClick={() => setBulkTagInput(tag)} style={{ display:'inline-flex', padding:'4px 10px', borderRadius:5, fontSize:12, fontWeight:500, background: bulkTagInput === tag ? s.c : s.bg, border:`1px solid ${s.bdr}`, color: bulkTagInput === tag ? '#fff' : s.c, cursor:'pointer', transition:'all .12s' }}>{tag}</span>;
              })}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setShowBulkTag(false)} style={ghostBtn}>Cancel</button>
              <button onClick={handleBulkTag} disabled={bulkProcessing || !bulkTagInput.trim()} style={{ ...primaryBtn, opacity: bulkProcessing || !bulkTagInput.trim() ? 0.5 : 1 }}>
                {bulkProcessing ? '⟳ Processing…' : `${bulkTagMode === 'add' ? 'Add' : 'Remove'} "${bulkTagInput}" → ${selected.size} properties`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ① CAMPAIGN PICKER MODAL ═══ */}
      {showCampaignPicker && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setShowCampaignPicker(false)}>
          <div style={{ background:'#fff', borderRadius:14, boxShadow:CL.shadowMd, padding:28, width:480, maxWidth:'90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize:20, fontWeight:500, marginBottom:4 }}>📬 Add to Research Campaign</h2>
            <p style={{ fontSize:13, color:CL.ink4, marginBottom:20 }}>Select a campaign to add {selected.size} properties as targets.</p>
            {campaigns.length === 0 ? (
              <div style={{ padding:24, textAlign:'center', color:CL.ink4, fontSize:14 }}>No campaigns found. Create one in Research first.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
                {campaigns.map(c => (
                  <div key={c.id} onClick={() => handleAddToCampaign(c.id)}
                    style={{ padding:'14px 18px', borderRadius:10, border:`1px solid ${CL.line2}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all .12s', background:CL.card }}
                    onMouseEnter={e => e.currentTarget.style.background = CL.bg}
                    onMouseLeave={e => e.currentTarget.style.background = CL.card}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:CL.ink2 }}>{c.name}</div>
                      <div style={{ fontSize:12, color:CL.ink4, marginTop:2 }}>{c.market || '—'} · {c.status || 'Active'}</div>
                    </div>
                    <span style={{ fontSize:12, color:CL.blue }}>Add →</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
              <button onClick={() => setShowCampaignPicker(false)} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PROPERTY MODAL */}
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

      {/* ═══ CSS ANIMATIONS — ② ③ ═══ */}
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.1}}
        @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes scoreIn{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 4px rgba(78,110,150,0.15)}50%{box-shadow:0 0 14px rgba(78,110,150,0.50),0 0 28px rgba(78,110,150,0.20)}}
        @keyframes fitGlow{0%,100%{box-shadow:0 0 4px rgba(21,102,54,0.15)}50%{box-shadow:0 0 14px rgba(21,102,54,0.50),0 0 28px rgba(21,102,54,0.20)}}
        @keyframes catalystPulse{0%,100%{opacity:1}50%{opacity:0.6}}
        .score-ring-glow{animation:scoreIn 0.5s ease both, glowPulse 2.4s ease-in-out infinite 0.6s !important;}
        .fit-ring-glow{animation:scoreIn 0.5s ease both, fitGlow 2.4s ease-in-out infinite 0.6s !important;}
        .catalyst-pulse{animation:catalystPulse 1.8s ease-in-out infinite;}
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
          {/* ② Delta badge now includes "7d" suffix */}
          {delta && (
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:600, padding:'1px 5px', borderRadius:3, color:up?CL.green:CL.rust, background:up?CL.greenBg:CL.rustBg }}>
              {delta} <span style={{ opacity:0.6, fontWeight:400 }}>7d</span>
            </span>
          )}
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
  return <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:5, fontSize:12, fontWeight:600, background:bg, border:`1px solid ${bdr}`, color:c }}>{label}</span>;
}

function AISparkle({ text }) {
  const [show, setShow] = useState(false);
  const preview = text.length > 300 ? text.slice(0, 300) + '…' : text;
  return (
    <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={e => e.stopPropagation()}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:20, height:20, borderRadius:'50%', background:CL.purpleBg, color:CL.purple, fontSize:10, cursor:'pointer', flexShrink:0, transition:'all .15s', position:'relative' }}>
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
