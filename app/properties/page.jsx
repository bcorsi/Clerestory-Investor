'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ──────────────────────────────────────────────
   Properties — Physical Asset Database
   app/properties/page.jsx
   This is the RECORDS page, NOT Acquisition Targets.
   Columns: Property, Market, Type, Score, SF, Clear Ht,
            Owner, Tenant, Lease Exp, Status, Catalysts
   ────────────────────────────────────────────── */

const fmt = (n) => n == null ? '—' : Number(n).toLocaleString();
const fmtSF = (n) => { if (n == null) return '—'; if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`; return fmt(n); };
const fmtCurrency = (n) => { if (n == null) return '—'; if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`; if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`; return `$${fmt(n)}`; };
const getGrade = (s) => { if (s == null) return '—'; if (s >= 85) return 'A+'; if (s >= 70) return 'A'; if (s >= 55) return 'B+'; if (s >= 40) return 'B'; return 'C'; };
const getScoreColor = (s) => { if (s == null) return '#6E6860'; if (s >= 70) return '#4E6E96'; if (s >= 55) return '#8C5A04'; return '#6E6860'; };
const monthsUntil = (d) => d ? Math.round((new Date(d) - new Date()) / (1e3*60*60*24*30.44)) : null;
const fmtExpiry = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
const getTagStyle = (tag) => {
  if (!tag) return { bg: 'rgba(78,110,150,0.09)', bdr: 'rgba(78,110,150,0.30)', c: '#4E6E96' };
  const t = tag.toLowerCase();
  if (t.includes('warn') || t.includes('nod') || t.includes('vacant')) return { bg: 'rgba(184,55,20,0.08)', bdr: 'rgba(184,55,20,0.30)', c: '#B83714' };
  if (t.includes('lease') || t.includes('partial') || t.includes('value')) return { bg: 'rgba(140,90,4,0.09)', bdr: 'rgba(140,90,4,0.28)', c: '#8C5A04' };
  if (t.includes('slb') || t.includes('occupied') || t.includes('market')) return { bg: 'rgba(21,102,54,0.08)', bdr: 'rgba(21,102,54,0.28)', c: '#156636' };
  if (t.includes('capex') || t.includes('roof')) return { bg: 'rgba(88,56,160,0.08)', bdr: 'rgba(88,56,160,0.26)', c: '#5838A0' };
  return { bg: 'rgba(78,110,150,0.09)', bdr: 'rgba(78,110,150,0.30)', c: '#4E6E96' };
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

  useEffect(() => { fetchProperties(); }, []);
  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('properties').select('*').order('ai_score', { ascending: false, nullsFirst: false });
      if (error) throw error;
      setProperties(data || []);
    } catch (err) { console.error('Fetch error:', err); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let list = [...properties];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => [p.property_name, p.address, p.city, p.submarket, p.owner, p.tenant].some(f => (f||'').toLowerCase().includes(q)));
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
      case 'CapEx': list = list.filter(p => (p.catalyst_tags||[]).some(t => t.toLowerCase().includes('capex'))); break;
    }
    list.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (va == null) va = sortDir === 'desc' ? -Infinity : Infinity;
      if (vb == null) vb = sortDir === 'desc' ? -Infinity : Infinity;
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb||'').toLowerCase(); }
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    return list;
  }, [properties, search, activeFilter, sortCol, sortDir]);

  const kpis = useMemo(() => {
    const totalSF = filtered.reduce((s, p) => s + (p.building_sf||0), 0);
    const occupied = filtered.filter(p => (p.vacancy_status||'').toLowerCase().includes('occupied')).length;
    const vacantPartial = filtered.filter(p => { const s = (p.vacancy_status||'').toLowerCase(); return s.includes('vacant') || s.includes('partial'); }).length;
    const signals = filtered.filter(p => (p.catalyst_tags||[]).length > 0).length;
    return { total: filtered.length, totalSF, occupied, vacantPartial, signals };
  }, [filtered]);

  const counts = useMemo(() => ({
    all: properties.length,
    sgv: properties.filter(p => (p.market||p.submarket||'').toLowerCase().includes('sgv')).length,
    ie: properties.filter(p => (p.market||p.submarket||'').toLowerCase().includes('ie')).length,
  }), [properties]);

  const handleSort = useCallback((col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }, [sortCol]);

  const [newProp, setNewProp] = useState({ property_name: '', address: '', city: '', state: 'CA', zip: '' });
  const handleAdd = async () => {
    if (!newProp.property_name && !newProp.address) return;
    try {
      await supabase.from('properties').insert([{ ...newProp, property_name: newProp.property_name || newProp.address }]);
      setShowAddModal(false); setNewProp({ property_name: '', address: '', city: '', state: 'CA', zip: '' }); fetchProperties();
    } catch (err) { alert('Error: ' + err.message); }
  };
  const handleImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text(); const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const row = {}; headers.forEach((h, idx) => { row[h] = vals[idx] || null; });
        if (row.property_name || row.address) rows.push(row);
      }
      if (rows.length) { await supabase.from('properties').insert(rows); alert(`Imported ${rows.length}`); fetchProperties(); }
    } catch (err) { alert('Import error: ' + err.message); }
    e.target.value = '';
  };

  const cols = [
    { key: 'property_name', label: 'Property' },
    { key: 'submarket', label: 'Market / Submarket' },
    { key: 'prop_type', label: 'Type' },
    { key: 'ai_score', label: 'Score' },
    { key: 'building_sf', label: 'Property SF' },
    { key: 'clear_height', label: 'Clear Ht' },
    { key: 'land_acres', label: 'Land AC' },
    { key: null, label: 'Coverage' },
    { key: 'year_built', label: 'Yr Built' },
    { key: 'owner', label: 'Owner' },
    { key: 'tenant', label: 'Tenant' },
    { key: 'lease_expiration', label: 'Lease Exp.' },
    { key: null, label: 'Status' },
    { key: null, label: 'Catalysts' },
  ];

  return (
    <>
      {/* HEADER */}
      <div style={{ padding: '28px 0 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 32, fontWeight: 300, color: '#0F0D09', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>Properties</h1>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontStyle: 'italic', color: '#6E6860', marginTop: 6 }}>
            {loading ? 'Loading…' : `${kpis.total} properties tracked · ${fmtSF(kpis.totalSF)} SF · SGV / IE Industrial`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={ghostBtn}>⊕ Filter</button>
          <label style={{ ...ghostBtn, cursor: 'pointer' }}>↑ Import CSV<input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} /></label>
          <button onClick={() => setShowAddModal(true)} style={primaryBtn}>+ Add Property</button>
        </div>
      </div>

      {/* KPI STRIP — broker base: Total, SF, Occupied, Vacant/Partial, Catalysts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <KPI icon="🏢" bg="rgba(78,110,150,0.09)" color="#4E6E96" value={kpis.total} label="Total Properties" />
        <KPI icon="◫" bg="rgba(140,90,4,0.09)" color="#8C5A04" value={fmtSF(kpis.totalSF)} label="Total SF Tracked" />
        <KPI icon="◉" bg="rgba(21,102,54,0.08)" color="#156636" value={kpis.occupied} label="Occupied" />
        <KPI icon="◎" bg="rgba(184,55,20,0.08)" color="#B83714" value={kpis.vacantPartial} label="Vacant / Partial" />
        <KPI icon="⚡" bg="rgba(88,56,160,0.08)" color="#5838A0" value={kpis.signals} label="Active Catalysts" />
      </div>

      {/* FILTER CHIPS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ k:'All', ct:counts.all }, { k:'SGV', ct:counts.sgv }, { k:'IE', ct:counts.ie }].map(f =>
          <Chip key={f.k} label={f.k} count={f.ct} active={activeFilter===f.k} onClick={() => setActiveFilter(f.k)} />)}
        <Sep />
        {[{ k:'Occupied', dot:'#156636' }, { k:'Vacant', dot:'#B83714' }, { k:'Partial', dot:'#8C5A04' }].map(f =>
          <Chip key={f.k} label={f.k} dot={f.dot} active={activeFilter===f.k} onClick={() => setActiveFilter(f.k)} />)}
        <Sep />
        {['WARN', 'Lease Expiry', 'SLB', 'CapEx'].map(f =>
          <Chip key={f} label={f==='WARN'?'⚡ WARN':f} active={activeFilter===f} onClick={() => setActiveFilter(f)} />)}
        <button onClick={() => handleSort(sortCol)} style={{ ...ghostBtn, fontSize: 13, padding: '6px 14px', marginLeft: 'auto' }}>↑↓ Sort: Score</button>
      </div>

      {/* TABLE */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.055)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {cols.map((col, i) => (
              <th key={i} onClick={() => col.key && handleSort(col.key)} style={{
                padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                color: sortCol === col.key ? '#4E6E96' : '#524D46',
                borderBottom: '2px solid rgba(0,0,0,0.08)', background: '#F4F1EC',
                cursor: col.key ? 'pointer' : 'default', userSelect: 'none',
                fontFamily: "'Instrument Sans', sans-serif",
              }}>
                {col.label}
                {col.key && <span style={{ opacity: sortCol===col.key?1:0.35, fontSize:10, marginLeft:4 }}>{sortCol===col.key?(sortDir==='desc'?'↓':'↑'):'↕'}</span>}
              </th>
            ))}
            <th style={{ padding: '12px 8px', borderBottom: '2px solid rgba(0,0,0,0.08)', background: '#F4F1EC', width: 28 }} />
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={15} style={{ padding:48, textAlign:'center', color:'#6E6860', fontSize:16 }}>Loading properties…</td></tr> :
             filtered.length === 0 ? <tr><td colSpan={15} style={{ padding:48, textAlign:'center', color:'#6E6860', fontSize:16 }}>No properties found.</td></tr> :
             filtered.map(p => {
              const mo = monthsUntil(p.lease_expiration);
              return (
                <tr key={p.id} onClick={() => router.push(`/properties/${p.id}`)}
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.055)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#F8F6F2'}
                  onMouseLeave={e => e.currentTarget.style.background=''}>
                  <td style={{ padding:'14px 16px', verticalAlign:'middle' }}>
                    <div style={{ fontWeight:600, color:'#0F0D09', fontSize:15 }}>{p.property_name||p.address||'—'}</div>
                    <div style={{ fontFamily:"'Cormorant Garamond', serif", fontStyle:'italic', fontSize:14, color:'#6E6860', marginTop:2 }}>{[p.city, p.state, p.zip].filter(Boolean).join(', ')||'—'}</div>
                  </td>
                  <td style={tdM}>{p.market && p.submarket ? `${p.market} · ${p.submarket}` : (p.submarket||p.market||'—')}</td>
                  <td style={tdM}>{p.prop_type||'—'}</td>
                  <td style={{ padding:'14px 16px', verticalAlign:'middle' }}>
                    <span style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700, color:getScoreColor(p.ai_score) }}>{p.ai_score??'—'}</span>
                    <span style={{ fontFamily:"'DM Mono', monospace", fontSize:12, fontWeight:500, color:'#6E6860', marginLeft:5 }}>{getGrade(p.ai_score)}</span>
                  </td>
                  <td style={tdMono}>{fmt(p.building_sf)}</td>
                  <td style={tdMono}>{p.clear_height ? `${p.clear_height}'` : '—'}</td>
                  <td style={tdMono}>{p.land_acres ? `${Number(p.land_acres).toFixed(2)}` : '—'}</td>
                  <td style={tdMono}>{p.building_sf && p.land_acres ? `${((p.building_sf / (p.land_acres * 43560)) * 100).toFixed(1)}%` : '—'}</td>
                  <td style={tdMono}>{p.year_built || '—'}</td>
                  <td style={{ ...tdM, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.owner||'—'}</td>
                  <td style={{ ...tdM, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.tenant||'—'}</td>
                  <td style={{ ...tdMono, color: mo!=null&&mo<=12?'#B83714':mo!=null&&mo<=24?'#8C5A04':'#2C2822' }}>{fmtExpiry(p.lease_expiration)}</td>
                  <td style={{ padding:'14px 16px', verticalAlign:'middle' }}><StatusTag status={p.vacancy_status} /></td>
                  <td style={{ padding:'14px 16px', verticalAlign:'middle' }}>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {(p.catalyst_tags||[]).slice(0,3).map((tag, i) => { const s = getTagStyle(tag); return <span key={i} style={{ display:'inline-flex', padding:'3px 8px', borderRadius:5, fontSize:12, fontWeight:600, background:s.bg, border:`1px solid ${s.bdr}`, color:s.c }}>{tag}</span>; })}
                      {(p.catalyst_tags||[]).length > 3 && <span style={{ fontSize:12, color:'#6E6860', fontFamily:"'DM Mono', monospace" }}>+{(p.catalyst_tags||[]).length-3}</span>}
                    </div>
                  </td>
                  <td style={{ padding:'14px 8px', color:'#6E6860', fontSize:14, opacity:0.5, verticalAlign:'middle' }}>›</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && filtered.length > 0 && <div style={{ padding:'14px 0', fontSize:14, color:'#6E6860' }}>Showing {filtered.length} of {properties.length} properties</div>}

      {/* ADD MODAL */}
      {showAddModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setShowAddModal(false)}>
          <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 4px 16px rgba(0,0,0,0.10)', padding:28, width:500, maxWidth:'90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize:22, fontWeight:500, marginBottom:20, color:'#0F0D09' }}>Add Property</h2>
            {['property_name','address','city','zip'].map(field => (
              <div key={field} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'#524D46', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6, display:'block' }}>{field.replace('_',' ')}</label>
                <input value={newProp[field]||''} onChange={e => setNewProp(prev => ({ ...prev, [field]: e.target.value }))}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid rgba(0,0,0,0.08)', fontFamily:"'Instrument Sans', sans-serif", fontSize:15, color:'#2C2822', background:'#F4F1EC', outline:'none' }} />
              </div>
            ))}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={() => setShowAddModal(false)} style={ghostBtn}>Cancel</button>
              <button onClick={handleAdd} style={primaryBtn}>Add Property</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function KPI({ icon, bg, color, value, label }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)', border:'1px solid rgba(0,0,0,0.055)', padding:'18px 22px', display:'flex', alignItems:'center', gap:16 }}>
      <div style={{ width:44, height:44, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, background:bg, color }}>{icon}</div>
      <div>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:30, fontWeight:700, color:'#0F0D09', lineHeight:1, letterSpacing:'-0.02em' }}>{value}</div>
        <div style={{ fontSize:13, color:'#524D46', marginTop:4, letterSpacing:'0.03em' }}>{label}</div>
      </div>
    </div>
  );
}
function Chip({ label, count, dot, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:22,
      fontFamily:"'Instrument Sans', sans-serif", fontSize:13, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap',
      border:`1px solid ${active?'rgba(78,110,150,0.30)':'rgba(0,0,0,0.08)'}`,
      background:active?'rgba(78,110,150,0.09)':'#fff', color:active?'#4E6E96':'#524D46',
    }}>
      {dot && <span style={{ width:7, height:7, borderRadius:'50%', background:dot }} />}
      {label}
      {count != null && <span style={{ fontFamily:"'DM Mono', monospace", fontSize:11, marginLeft:2 }}>{count}</span>}
    </button>
  );
}
function Sep() { return <div style={{ width:1, height:24, background:'rgba(0,0,0,0.08)', margin:'0 4px' }} />; }
function StatusTag({ status }) {
  const s = (status||'').toLowerCase(); let label = status||'—', bg, bdr, c;
  if (s.includes('occupied')||s==='leased') { label='Occupied'; bg='rgba(21,102,54,0.08)'; bdr='rgba(21,102,54,0.28)'; c='#156636'; }
  else if (s.includes('vacant')||s==='available') { label='Vacant'; bg='rgba(184,55,20,0.08)'; bdr='rgba(184,55,20,0.30)'; c='#B83714'; }
  else if (s.includes('partial')) { label='Partial'; bg='rgba(140,90,4,0.09)'; bdr='rgba(140,90,4,0.28)'; c='#8C5A04'; }
  else { bg='rgba(0,0,0,0.04)'; bdr='rgba(0,0,0,0.08)'; c='#6E6860'; }
  return <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:5, fontSize:12, fontWeight:600, background:bg, border:`1px solid ${bdr}`, color:c }}>{label}</span>;
}

const ghostBtn = { display:'inline-flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:8, fontFamily:"'Instrument Sans', sans-serif", fontSize:14, fontWeight:500, cursor:'pointer', border:'1px solid rgba(0,0,0,0.08)', background:'#fff', color:'#524D46', whiteSpace:'nowrap' };
const primaryBtn = { ...ghostBtn, background:'#4E6E96', color:'#fff', borderColor:'#4E6E96' };
const tdM = { padding:'14px 16px', fontSize:14, color:'#6E6860', verticalAlign:'middle' };
const tdMono = { padding:'14px 16px', fontFamily:"'DM Mono', monospace", fontSize:14, color:'#2C2822', verticalAlign:'middle' };
