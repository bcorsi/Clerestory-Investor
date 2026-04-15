'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

/* ══════════════════════════════════════════════════════════════
   CLERESTORY — PropertyDetail Component
   Used in: SlideDrawer (inline=true) + Full Page (inline=false)
   Matches: mockup-property-detail.html design spec exactly
   ══════════════════════════════════════════════════════════════ */

// ── Color constants (from design system) ──
const BLU='#4E6E96', RST='#B83714', AMB='#8C5A04', GRN='#156636', PUR='#5838A0', TEA='#1A6B6B';
const T1='#1A1A1A', T2='#444', T3='#888', CARD='#FAFAF8', CHDR='#EDE8E0', BDR='rgba(0,0,0,0.08)';

const TABS = [
  { key:'overview',  label:'Overview' },
  { key:'buildings', label:'Buildings' },
  { key:'comps',     label:'Comps' },
  { key:'contacts',  label:'Contacts' },
  { key:'deals',     label:'Deals' },
  { key:'leads',     label:'Leads' },
  { key:'files',     label:'Files' },
];

export default function PropertyDetail({ id, inline = false }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [acts, setActs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leaseComps, setLeaseComps] = useState([]);
  const [saleComps, setSaleComps] = useState([]);
  const [files, setFiles] = useState([]);
  const [warn, setWarn] = useState(null);
  const [synth, setSynth] = useState(null);
  const [synthLoading, setSynthLoading] = useState(false);
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const sb = createClient();
      const { data: prop } = await sb.from('properties').select('*').eq('id', id).single();
      if (!prop) return;
      setP(prop);
      if (prop.ai_synthesis) setSynth(prop.ai_synthesis);

      const [a, c, d, l, f] = await Promise.all([
        sb.from('activities').select('*').eq('property_id', id).order('created_at', { ascending: false }).limit(20),
        sb.from('contacts').select('*').eq('property_id', id).limit(10),
        sb.from('deals').select('*').eq('property_id', id).order('created_at', { ascending: false }).limit(5),
        sb.from('leads').select('*').eq('property_id', id).limit(5),
        sb.from('file_attachments').select('*').eq('property_id', id).order('created_at', { ascending: false }),
      ]);
      setActs(a.data||[]); setContacts(c.data||[]); setDeals(d.data||[]); setLeads(l.data||[]); setFiles(f.data||[]);

      if (prop.market) {
        const [lc, sc] = await Promise.all([
          sb.from('lease_comps').select('*').eq('market', prop.market).order('commencement_date', { ascending: false }).limit(8),
          sb.from('sale_comps').select('*').eq('market', prop.market).order('sale_date', { ascending: false }).limit(8),
        ]);
        setLeaseComps(lc.data||[]); setSaleComps(sc.data||[]);
      }

      const { data: wm } = await sb.from('warn_notices').select('id, company, notice_date, employees').eq('matched_property_id', id).limit(1).maybeSingle();
      if (wm) setWarn(wm);
    } catch (e) { console.error('PropertyDetail error:', e); }
    finally { setLoading(false); }
  }

  // Init square aerial map
  useEffect(() => {
    if (!p || mapInst.current || inline) return;
    if (!p.lat || !p.lng || !mapRef.current) return;
    if (typeof window === 'undefined' || !window.L) return;
    const L = window.L;
    const m = L.map(mapRef.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false }).setView([p.lat, p.lng], 17);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20 }).addTo(m);
    const icon = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;border-radius:50%;background:#B83714;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>', iconSize: [12,12], iconAnchor: [6,6] });
    L.marker([p.lat, p.lng], { icon }).addTo(m);
    mapInst.current = m;
  }, [p, inline]);

  // Generate AI synthesis and save to ai_generations
  async function generateSynth() {
    if (!p) return;
    setSynthLoading(true);
    try {
      const inputCtx = {
        address: p.address, city: p.city, building_sf: p.building_sf,
        clear_height: p.clear_height, dock_doors: p.dock_doors, year_built: p.year_built,
        owner: p.owner, market: p.market, vacancy_status: p.vacancy_status,
        ai_score: p.ai_score, catalyst_tags: p.catalyst_tags,
      };
      // For now, generate a basic synthesis from available data
      const text = `${p.address} — ${p.building_sf ? Number(p.building_sf).toLocaleString() + ' SF' : ''} ${p.prop_type || 'industrial'} in ${p.city || ''} (${p.market || ''}). ${p.clear_height ? p.clear_height + "' clear, " : ''}${p.dock_doors ? p.dock_doors + ' dock doors, ' : ''}${p.year_built ? 'built ' + p.year_built + '.' : ''} Owner: ${p.owner || 'unknown'}. ${p.vacancy_status === 'vacant' ? 'Currently vacant — contact owner regarding repositioning or sale.' : p.vacancy_status === 'active' ? 'Currently occupied.' : ''} ${warn ? 'WARN filing matched — ' + warn.company + ', ' + (warn.employees || '') + ' workers affected. Priority outreach recommended.' : ''}`;
      setSynth(text);

      const sb = createClient();
      // Save to property record
      await sb.from('properties').update({ ai_synthesis: text }).eq('id', id);
      // Save to ai_generations for pattern recognition
      await sb.from('ai_generations').insert({
        generation_type: 'property_signal',
        property_id: id,
        content: text,
        summary: p.address + ' — property intelligence assessment',
        input_context: inputCtx,
        model_used: 'claude-sonnet-4-20250514',
      });
    } catch (e) { console.error(e); setSynth('Synthesis unavailable.'); }
    finally { setSynthLoading(false); }
  }

  if (loading) return <div className="cl-loading"><div className="cl-spinner" />Loading property…</div>;
  if (!p) return <div className="cl-empty"><div className="cl-empty-label">Property not found</div></div>;

  const tags = Array.isArray(p.catalyst_tags) ? p.catalyst_tags : [];
  const isIDS = p.owner === 'IDS Real Estate Group';
  const bScore = p.ai_score;
  const bGrade = p.building_grade || (bScore >= 90 ? 'A+' : bScore >= 80 ? 'A' : bScore >= 70 ? 'B+' : bScore >= 60 ? 'B' : bScore >= 50 ? 'C+' : bScore >= 40 ? 'C' : '—');
  const scoreColor = bScore >= 75 ? RST : bScore >= 50 ? AMB : BLU;
  const coverage = p.building_sf && p.land_acres ? ((p.building_sf / (p.land_acres * 43560)) * 100).toFixed(1) : null;
  const dhRatio = p.dock_doors && p.building_sf ? ((p.dock_doors / (p.building_sf / 10000))).toFixed(2) : null;

  return (
    <div style={{ fontFamily: "'Instrument Sans', sans-serif" }}>

      {/* ── FULL PAGE HEADER (not shown in drawer) ── */}
      {!inline && (
        <div style={{ marginBottom: 0, padding: '16px 20px', background: '#fff', borderBottom: `1px solid ${BDR}` }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#0E1520', marginBottom: 4, letterSpacing: '-0.02em' }}>{p.address}</h1>
          <p style={{ fontSize: 13, color: T3 }}>{[p.city, p.state, p.zip].filter(Boolean).join(', ')}{p.market ? ' · ' + p.market : ''}{p.submarket ? ' · ' + p.submarket : ''}</p>
        </div>
      )}

      {/* ── SQUARE AERIAL + STAT ROW side by side ── */}
      {!inline && (
        <div style={{ display: 'flex', background: CARD, borderBottom: `1px solid ${BDR}` }}>
          {/* Square aerial map */}
          {p.lat && p.lng ? (
            <div ref={mapRef} style={{ width: 220, height: 180, flexShrink: 0, background: '#0d1410' }} />
          ) : (
            <div style={{ width: 220, height: 180, flexShrink: 0, background: '#1A2130', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>No coordinates</span>
            </div>
          )}
          {/* Stat row */}
          <div style={{ display: 'flex', flex: 1 }}>
            <Stat l="Building SF" v={p.building_sf ? Number(p.building_sf).toLocaleString() : '—'} s={p.prop_type || null} />
            <Stat l="Land" v={p.land_acres ? p.land_acres + ' ac' : '—'} s={coverage ? 'Coverage ' + coverage + '%' : null} />
            <Stat l="Clear Height" v={p.clear_height ? p.clear_height + "'" : '—'} s={p.dock_doors ? p.dock_doors + ' DH' + (p.grade_doors ? ' · ' + p.grade_doors + ' GL' : '') : null} />
            <Stat l="Year Built" v={p.year_built || '—'} s={p.zoning || null} />
            <Stat l="Owner" v={p.owner ? (p.owner.length > 20 ? p.owner.slice(0,20) + '…' : p.owner) : '—'} s={isIDS ? 'IDS Portfolio' : p.vacancy_status || null} vc={isIDS ? BLU : undefined} last />
          </div>
        </div>
      )}

      {/* ── INLINE STAT ROW (drawer only) ── */}
      {inline && (
        <div style={{ display: 'flex', background: CARD, borderBottom: `1px solid ${BDR}` }}>
          <Stat l="Building SF" v={p.building_sf ? Number(p.building_sf).toLocaleString() : '—'} />
          <Stat l="Year Built" v={p.year_built || '—'} />
          <Stat l="Clear Ht" v={p.clear_height ? p.clear_height + "'" : '—'} />
          <Stat l="Docks" v={p.dock_doors || '—'} />
          <Stat l="Acres" v={p.land_acres ? Number(p.land_acres).toFixed(2) : '—'} />
          <Stat l="Zoning" v={p.zoning || '—'} last />
        </div>
      )}

      {/* ── SCORE CARD ── */}
      {bScore != null && (
        <div style={{ background: CARD, borderBottom: `1px solid ${BDR}`, padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <ScoreRing score={bScore} color={scoreColor} size={48} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T1, marginBottom: 2 }}>
              Building Score — {bGrade} <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 9, background: 'rgba(78,110,150,0.08)', color: BLU, marginLeft: 3 }}>§01</span>
            </div>
            <div style={{ fontSize: 11, color: T3 }}>
              {[p.clear_height && p.clear_height+"' clear", p.dock_doors && p.dock_doors+' dock-high', p.power, p.sprinklers, p.year_built && 'Built '+p.year_built].filter(Boolean).join(' · ')}
            </div>
          </div>
          {/* Inline spec strip */}
          <div style={{ display: 'flex', flex: 1, marginLeft: 8 }}>
            <SpecIt l="Clear Ht" v={p.clear_height ? p.clear_height+"'" : '—'} />
            <SpecIt l="Dock Doors" v={p.dock_doors ? (p.dock_doors + ' DH' + (p.grade_doors ? ' · ' + p.grade_doors + ' GL' : '')) : '—'} blue={!!p.dock_doors} />
            <SpecIt l="Power" v={p.power || '—'} />
            <SpecIt l="Sprinklers" v={p.sprinklers || '—'} />
            <SpecIt l="DH Ratio" v={dhRatio ? dhRatio + '/10kSF' : '—'} blue={!!dhRatio} />
            <SpecIt l="Coverage" v={coverage ? coverage + '%' : '—'} />
          </div>
        </div>
      )}

      {/* ── CATALYST TAGS ── */}
      {tags.length > 0 && (
        <div style={{ background: CARD, borderBottom: `1px solid ${BDR}`, padding: '10px 20px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T2, marginBottom: 8 }}>Active Catalysts</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tag, i) => {
              const cat = typeof tag === 'object' ? tag.category : 'asset';
              const lbl = typeof tag === 'object' ? tag.tag : tag;
              return <span key={i} className={`cl-catalyst cl-catalyst--${cat || 'asset'}`} style={{ fontSize: 11, padding: '3px 9px' }}>{lbl}</span>;
            })}
          </div>
        </div>
      )}

      {/* ── ACTION BAR ── */}
      <div style={{ background: CHDR, borderBottom: `1px solid ${BDR}`, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
        <ABtn>Log Call</ABtn><ABtn>Log Email</ABtn><ABtn>Add Note</ABtn><ABtn>+ Task</ABtn>
        <div style={{ width: 1, height: 16, background: BDR, margin: '0 4px' }} />
        {p.lat && p.lng && <ABtn onClick={() => window.open(`https://www.google.com/maps/@${p.lat},${p.lng},18z/data=!3m1!1e1`, '_blank')}>Google Maps</ABtn>}
        <ABtn onClick={() => window.open(`https://www.google.com/maps/@${p.lat||34},${p.lng||-117},18z`, '_blank')}>Street View</ABtn>
        <div style={{ width: 1, height: 16, background: BDR, margin: '0 4px' }} />
        <ABtn>Edit</ABtn>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <button style={{ background: BLU, color: '#fff', border: 'none', padding: '6px 13px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>◆ Convert to Deal</button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BDR}`, display: 'flex', padding: '0 20px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 12px', fontSize: 12.5, color: tab === t.key ? BLU : T3,
            cursor: 'pointer', borderBottom: tab === t.key ? `2px solid ${BLU}` : '2px solid transparent',
            fontWeight: tab === t.key ? 500 : 400, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {t.label}
            {t.key === 'contacts' && contacts.length > 0 && <TabCt>{contacts.length}</TabCt>}
            {t.key === 'deals' && deals.length > 0 && <TabCt>{deals.length}</TabCt>}
            {t.key === 'leads' && leads.length > 0 && <TabCt>{leads.length}</TabCt>}
            {t.key === 'comps' && (leaseComps.length + saleComps.length) > 0 && <TabCt>{leaseComps.length + saleComps.length}</TabCt>}
          </div>
        ))}
      </div>

      {/* ════════════ TAB: OVERVIEW ════════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', padding: '16px 20px', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* WARN notice */}
            {warn && (
              <Crd style={{ borderLeft: `3px solid ${RST}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: RST, marginBottom: 8 }}>⚡ Linked WARN Filing</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T1, marginBottom: 4 }}>{warn.company}</div>
                <div style={{ fontSize: 13, color: T3 }}>{warn.employees ? Number(warn.employees).toLocaleString() + ' workers affected' : ''}{warn.notice_date ? ' · Filed ' + fmtD(warn.notice_date) : ''}</div>
                <Link href={'/warn-intel/' + warn.id} style={{ fontSize: 13, color: BLU, textDecoration: 'none', fontWeight: 500, display: 'inline-block', marginTop: 6 }}>View WARN Filing →</Link>
              </Crd>
            )}

            {/* AI SYNTHESIS — purple card */}
            <div style={{ background: CARD, border: `1px solid rgba(88,56,160,0.2)`, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, #8B6FCC, ${PUR})` }} />
              <div style={{ background: `linear-gradient(135deg, rgba(88,56,160,0.07) 0%, rgba(78,110,150,0.05) 100%)`, padding: '8px 12px 8px 16px', borderBottom: '1px solid rgba(88,56,160,0.12)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: PUR }} />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: PUR }}>AI Synthesis</span>
                <span style={{ fontSize: 11, color: T3, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", marginLeft: 4 }}>Property Intelligence · {p.address}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                  <button onClick={generateSynth} style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(88,56,160,0.2)', color: PUR, background: 'none', cursor: 'pointer' }}>{synthLoading ? 'Generating…' : synth ? '↺ Regenerate' : '▶ Generate'}</button>
                </div>
              </div>
              <div style={{ padding: '13px 13px 13px 16px', fontSize: 12.5, lineHeight: 1.7, color: T2, minHeight: 80 }}>
                {synth || <span style={{ color: T3, fontStyle: 'italic' }}>No synthesis yet. Click Generate to create an AI intelligence report for this property.</span>}
              </div>
              {synth && (
                <div style={{ padding: '7px 12px 7px 16px', borderTop: '1px solid rgba(88,56,160,0.1)', background: 'rgba(88,56,160,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: T3, fontFamily: "'DM Mono', monospace" }}>Generated {new Date().toLocaleDateString()}</span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(88,56,160,0.2)', color: PUR, background: 'none', cursor: 'pointer' }}>Copy</button>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {p.notes && (
              <CrdH h="Notes"><p style={{ fontSize: 13, color: T2, lineHeight: 1.65 }}>{p.notes}</p></CrdH>
            )}

            {/* Building Specifications — full 2-col grid */}
            <CrdH h="Building Specifications">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <DR k="Building SF" v={p.building_sf ? Number(p.building_sf).toLocaleString() : '—'} mono />
                <DR k="Land Acres" v={p.land_acres ? Number(p.land_acres).toFixed(2) : '—'} mono />
                <DR k="Year Built" v={p.year_built || '—'} mono />
                <DR k="Clear Height" v={p.clear_height ? p.clear_height + "'" : '—'} mono />
                <DR k="Dock Doors" v={p.dock_doors || '—'} mono />
                <DR k="Grade Doors" v={p.grade_doors || '—'} mono />
                <DR k="Power" v={p.power || '—'} mono />
                <DR k="Sprinklers" v={p.sprinklers || '—'} />
                <DR k="Zoning" v={p.zoning || '—'} mono />
                <DR k="Construction" v={p.construction_type || '—'} />
                <DR k="Parking Ratio" v={p.parking_ratio || '—'} mono />
                <DR k="Column Spacing" v={p.column_spacing || '—'} mono />
                <DR k="Property Type" v={p.prop_type || '—'} />
                <DR k="Building Class" v={p.building_class || '—'} />
              </div>
            </CrdH>

            {/* Ownership & Transaction */}
            <CrdH h="Ownership & Transaction History">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <DR k="Owner" v={p.owner || '—'} />
                <DR k="Owner Type" v={p.owner_type || '—'} />
                <DR k="Last Transfer" v={p.last_transfer_date ? fmtD(p.last_transfer_date) : '—'} />
                <DR k="APN" v={p.apn || '—'} mono />
                <DR k="In-Place Rent" v={p.in_place_rent ? '$' + Number(p.in_place_rent).toFixed(2) + '/SF' : '—'} mono />
                <DR k="Lease Expiration" v={p.lease_expiration ? fmtD(p.lease_expiration) : '—'} />
                <DR k="Tenant" v={p.tenant || '—'} />
                <DR k="Vacancy Status" v={p.vacancy_status || '—'} />
              </div>
            </CrdH>

            {/* Activity Timeline */}
            <CrdH h="Activity Timeline" act="+ Log Activity">
              {acts.length === 0 ? <Empty>No activity logged yet.</Empty>
              : acts.map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 9, padding: '9px 0', borderBottom: `1px solid rgba(0,0,0,0.05)` }}>
                  <TlIcon type={a.activity_type} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: T1 }}>{a.subject || a.activity_type}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T3, marginTop: 2 }}>{fmtD(a.activity_date || a.created_at)}</div>
                  </div>
                </div>
              ))}
            </CrdH>
          </div>

          {/* ── SIDEBAR ── */}
          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Catalysts sidebar */}
            {tags.length > 0 && (
              <CrdH h="Active Catalysts" act="+ Add">
                {tags.map((tag, i) => {
                  const cat = typeof tag === 'object' ? tag.category : 'asset';
                  const lbl = typeof tag === 'object' ? tag.tag : tag;
                  const dt = typeof tag === 'object' ? tag.date : null;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 0', borderBottom: `1px solid ${BDR}` }}>
                      <span className={`cl-catalyst cl-catalyst--${cat || 'asset'}`} style={{ fontSize: 9.5, padding: '2px 6px' }}>{lbl}</span>
                      {dt && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9.5, color: T3, marginLeft: 'auto' }}>{dt}</span>}
                    </div>
                  );
                })}
              </CrdH>
            )}

            {/* Property Details sidebar */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: 6, border: `1px solid ${BDR}` }}>
                <ScoreRing score={bScore} color={scoreColor} size={40} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T1 }}>Building Score: {bScore} / {bGrade}</div>
                  <div style={{ fontSize: 11, color: T3 }}>{[p.clear_height && p.clear_height+"' clear", p.dock_doors && p.dock_doors+' DH', p.power, p.sprinklers].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            )}
          </CrdH>
        </div>
      )}

      {/* ════════════ TAB: COMPS ════════════ */}
      {tab === 'comps' && (
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <CrdH h={'Sale Comps · ' + (p.market || '—')}>
            {saleComps.length === 0 ? <Empty>No sale comps in this market.</Empty>
            : saleComps.map(c => <CompRow key={c.id} addr={c.address || c.property_name} line={[c.sale_price && '$' + (Number(c.sale_price)/1e6).toFixed(1) + 'M', c.price_per_sf && '$' + Math.round(c.price_per_sf) + '/SF', c.cap_rate && Number(c.cap_rate).toFixed(1) + '% cap', c.sale_date && fmtD(c.sale_date)].filter(Boolean).join(' · ')} />)}
          </CrdH>
          <CrdH h={'Lease Comps · ' + (p.market || '—')}>
            {leaseComps.length === 0 ? <Empty>No lease comps in this market.</Empty>
            : leaseComps.map(c => <CompRow key={c.id} addr={c.address || c.property_name} line={[c.effective_rent && '$' + Number(c.effective_rent).toFixed(2) + '/SF', c.lease_type, c.term_months && c.term_months + 'mo', c.commencement_date && fmtD(c.commencement_date)].filter(Boolean).join(' · ')} />)}
          </CrdH>
        </div>
      )}

      {/* ════════════ TAB: CONTACTS ════════════ */}
      {tab === 'contacts' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.length === 0 ? <CrdH h="Contacts"><Empty>No contacts linked.</Empty></CrdH>
          : contacts.map(c => (
            <div key={c.id} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 7, padding: 11, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: BLU, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{(c.name || '?').slice(0,2).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T1 }}>{c.name}</div>
                <div style={{ fontSize: 10.5, color: T3 }}>{c.title}{c.company ? ' · ' + c.company : ''}</div>
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
              <Link key={d.id} href={'/deals/' + d.id} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: 'rgba(78,110,150,0.05)', borderRadius: 6, border: `1px solid rgba(78,110,150,0.15)`, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T1 }}>{d.deal_name || d.company || '—'}</div>
                  <div style={{ fontSize: 11, color: T3, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{d.stage || '—'}{d.deal_value ? ' · $' + (Number(d.deal_value)/1e6).toFixed(1) + 'M' : ''}</div>
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
              <Link key={l.id} href={'/leads/' + l.id} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: 'rgba(184,55,20,0.04)', borderRadius: 6, border: `1px solid rgba(184,55,20,0.15)`, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T1 }}>{l.lead_name || l.company || '—'}</div>
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
                <div style={{ width: 32, height: 32, background: 'rgba(78,110,150,0.08)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: BLU }}>
                  {(f.file_name || '').split('.').pop()?.toUpperCase()?.slice(0,3) || 'FILE'}
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
   SHARED SUB-COMPONENTS — exact mockup patterns
   ══════════════════════════════════════════════════════════════ */

function Stat({ l, v, s, vc, last }) {
  return (
    <div style={{ flex: 1, padding: '11px 13px', borderRight: last ? 'none' : `1px solid ${BDR}` }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T3, marginBottom: 3 }}>{l}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: vc || T1, lineHeight: 1 }}>{v}</div>
      {s && <div style={{ fontSize: 10, color: T3, marginTop: 2 }}>{s}</div>}
    </div>
  );
}

function SpecIt({ l, v, blue }) {
  return (
    <div style={{ flex: 1, padding: '0 10px', borderLeft: `1px solid ${BDR}`, textAlign: 'center' }}>
      <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: T3, marginBottom: 2 }}>{l}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: blue ? BLU : T1 }}>{v}</div>
    </div>
  );
}

function ScoreRing({ score, color, size = 48 }) {
  if (score == null) return null;
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C+' : 'C';
  return (
    <div style={{ width: size, height: size, position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: size * 0.33, fontWeight: 500, color: '#0E1520', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.17, fontWeight: 600, color }}>{grade}</span>
      </div>
    </div>
  );
}

function Crd({ children, style }) {
  return <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden', padding: '14px 16px', ...style }}>{children}</div>;
}

function CrdH({ h, act, children }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>
      {h && <div style={{ background: CHDR, padding: '8px 13px', borderBottom: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T2 }}>{h}</span>
        {act && <span style={{ fontSize: 11, color: BLU, cursor: 'pointer', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{act}</span>}
      </div>}
      <div style={{ padding: '11px 13px' }}>{children}</div>
    </div>
  );
}

function DR({ k, v, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: `1px solid ${BDR}`, fontSize: 12.5 }}>
      <span style={{ color: T3 }}>{k}</span>
      <span style={{ color: T1, fontWeight: 500, textAlign: 'right', fontFamily: mono ? "'DM Mono', monospace" : undefined, fontSize: mono ? 11 : undefined }}>{v}</span>
    </div>
  );
}

function CompRow({ addr, line }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid rgba(0,0,0,0.04)` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: T1 }}>{addr || '—'}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T3, marginTop: 2 }}>{line}</div>
    </div>
  );
}

function TlIcon({ type }) {
  const styles = {
    call:         { bg: 'rgba(78,110,150,0.08)', color: BLU, icon: '☏' },
    email:        { bg: 'rgba(88,56,160,0.08)', color: PUR, icon: '✉' },
    note:         { bg: 'rgba(140,90,4,0.08)', color: AMB, icon: '✎' },
    stage_change: { bg: 'rgba(21,102,54,0.08)', color: GRN, icon: '↑' },
    meeting:      { bg: 'rgba(21,102,54,0.08)', color: GRN, icon: '◆' },
  };
  const s = styles[type] || styles.note;
  return <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, background: s.bg, color: s.color }}>{s.icon}</div>;
}

function ABtn({ children, onClick }) {
  return <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', fontSize: 12, color: T2, border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif", whiteSpace: 'nowrap' }}>{children}</button>;
}

function TabCt({ children }) {
  return <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, background: 'rgba(0,0,0,0.06)', borderRadius: 7, padding: '1px 4px', marginLeft: 3 }}>{children}</span>;
}

function StatBox({ l, v }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 6, padding: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: T3, marginBottom: 2 }}>{l}</div>
      <div style={{ fontSize: 18, fontWeight: 500 }}>{v}</div>
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 20, textAlign: 'center', color: T3, fontSize: 13 }}>{children}</div>;
}

function fmtD(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
