'use client';
import { useState, useEffect, useRef } from 'react';

const TABS = ['Timeline', 'Buildings', 'APNs', 'Lease Comps', 'Sale Comps', 'Contacts', 'Deals', 'Leads', 'Files'];

export default function PropertyDetail({ property, onBack }) {
  const [activeTab, setActiveTab] = useState('Timeline');
  const [specsOpen, setSpecsOpen] = useState(false);
  const [synthOpen, setSynthOpen] = useState(true);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Init Leaflet map on mount
  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return;
    import('leaflet').then(L => {
      L = L.default;
      const map = L.map(mapRef.current, {
        center: [property?.lat ?? 34.0887, property?.lng ?? -117.9712],
        zoom: 16,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
        attributionControl: false,
      });
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20 }
      ).addTo(map);
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#4E6E96;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([property?.lat ?? 34.0887, property?.lng ?? -117.9712], { icon }).addTo(map);
      mapInstanceRef.current = map;
    });
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const p = property ?? MOCK_PROPERTY;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* TOPBAR — slim breadcrumb only */}
      <div style={S.topbar}>
        <div style={S.topbarInner}>
          <div style={S.bc}>
            <span style={{ cursor: 'pointer', color: 'var(--ink4)' }} onClick={onBack}>Properties</span>
            <span style={{ opacity: .4, margin: '0 4px' }}>›</span>
            <span style={{ color: 'var(--ink2)', fontWeight: 500 }}>{p.address}</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>

          {/* HERO — satellite map */}
          <div style={S.hero}>
            <div ref={mapRef} style={{ width: '100%', height: 300 }} />
            <div style={S.heroOverlay} />
            <div style={S.heroContent}>
              <div style={S.heroTitle}>{p.address}</div>
              <div style={S.heroBadges}>
                <span style={S.hbGreen}>● {p.occupancy ?? 'Occupied'}</span>
                {p.leaseExpiry && <span style={S.hbAmber}>Lease Exp. {p.leaseExpiry}</span>}
                <span style={S.hbBlue}>{p.propType} · {p.buildingSF?.toLocaleString()} SF</span>
                {p.ownerType && <span style={S.hbBlue}>{p.ownerType}</span>}
              </div>
            </div>
          </div>

          {/* ACTION BAR */}
          <div style={S.actionBar}>
            {/* Score chip */}
            <div style={S.scoreChip}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Bldg Score</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--blue)' }}>A+</div>
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>92</div>
            </div>
            <div style={S.abSep} />
            <button style={S.btnGhost}>📞 Log Call</button>
            <button style={S.btnGhost}>✉ Log Email</button>
            <button style={S.btnGhost}>📝 Add Note</button>
            <button style={S.btnGhost}>+ Task</button>
            <div style={S.abSep} />
            <button style={S.btnLink} onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(p.address)}`)}>📍 Google Maps</button>
            <button style={S.btnLink}>🗂 CoStar</button>
            <button style={S.btnLink}>🗺 LA County GIS</button>
            <div style={S.abSep} />
            <button style={S.btnGhost}>⚙ Edit</button>
            <button style={S.btnGhost}>↓ Export Memo</button>
            <div style={{ marginLeft: 'auto' }} />
            <button style={S.btnGreen}>◈ Convert to Deal</button>
          </div>

          <div style={S.inner}>

            {/* AI SYNTHESIS */}
            <div style={S.synthCard}>
              <div style={S.synthHdr} onClick={() => setSynthOpen(o => !o)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--purple)' }}>✦</span>
                  <span style={S.synthTitle}>AI Synthesis</span>
                  <span style={S.synthMeta}>Property Status Report · {p.address}</span>
                </div>
                <span style={S.synthToggle}>{synthOpen ? 'Hide ▴' : 'Show ▾'}</span>
              </div>
              {synthOpen && (
                <div style={S.synthBody}>
                  <SynthSection title="Current Situation" items={p.synthesis?.situation ?? MOCK_SYNTH.situation} />
                  <SynthSection title="Key Contacts / Owner" items={p.synthesis?.contacts ?? MOCK_SYNTH.contacts} />
                  <SynthSection title="Outstanding Issues" items={p.synthesis?.issues ?? MOCK_SYNTH.issues} />
                  <SynthSection title="Recommended Next Steps" steps={p.synthesis?.steps ?? MOCK_SYNTH.steps} />
                  <div style={S.synthCritical}><strong style={{ color: 'var(--rust)' }}>Critical Timeline:</strong> {p.synthesis?.critical ?? MOCK_SYNTH.critical}</div>
                </div>
              )}
              <div style={S.synthFooter}>
                <button style={S.synthRegen}>↻ Regenerate</button>
                <button style={S.synthRegen}>📋 Copy</button>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)', marginLeft: 'auto' }}>Generated Mar 24, 2026 · 9:14 AM</span>
              </div>
            </div>

            {/* STAT ROW */}
            <div style={S.statRow}>
              {[
                { lbl: 'Building SF', val: p.buildingSF?.toLocaleString() ?? '186,400', sub: '1 building' },
                { lbl: 'Land', val: `${p.acres ?? '8.2'} ac`, sub: `${p.apnCount ?? 2} APNs` },
                { lbl: 'In-Place Rent', val: p.inPlaceRent ?? '$1.28/SF', sub: 'NNN / mo', blue: true },
                { lbl: 'Market Rent', val: p.marketRent ?? '$1.44–1.52', sub: 'NNN est.', green: true },
                { lbl: 'Lease Expiry', val: p.leaseExpiry ?? 'Aug 2027', sub: '17 months', amber: true },
                { lbl: 'Est. Value', val: p.estValue ?? '$48.2M', sub: '~$258/SF' },
                { lbl: 'Year Built', val: p.yearBuilt ?? '2001', sub: `${p.zoning ?? 'M-2'} Zoning` },
              ].map((c, i) => (
                <div key={i} style={{ ...S.statCell, borderRight: i < 6 ? '1px solid var(--line2)' : 'none' }}>
                  <div style={S.statLbl}>{c.lbl}</div>
                  <div style={{ ...S.statVal, color: c.blue ? 'var(--blue)' : c.green ? 'var(--green)' : c.amber ? 'var(--amber)' : 'var(--ink)', fontSize: c.lbl === 'Building SF' || c.lbl === 'Est. Value' ? 22 : 16 }}>{c.val}</div>
                  <div style={S.statSub}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* BUILDING SCORE CARD */}
            <div style={S.scoreCard}>
              <div style={S.scoreCardHdr} onClick={() => setSpecsOpen(o => !o)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={S.scRing}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>92</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--blue2)', marginTop: 1 }}>A+</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>Building Score — A+ · Top-tier distribution asset</div>
                    <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>32' clear · 24 dock-high · 135' truck court · ESFR · 2,000A</div>
                  </div>
                </div>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' }}>
                  {specsOpen ? 'Hide specs ▴' : 'Show all specs ▾'}
                </span>
              </div>
              {/* Summary strip */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
                {[
                  { lbl: 'Clear Ht', val: "32'", hi: true },
                  { lbl: 'Dock Doors', val: '24 DH · 4 GL', hi: true },
                  { lbl: 'Truck Court', val: "135'", hi: true },
                  { lbl: 'Office %', val: '8%' },
                  { lbl: 'Power', val: '2,000A/277V' },
                  { lbl: 'Sprinklers', val: 'ESFR' },
                  { lbl: 'DH Ratio', val: '1.29/10kSF', hi: true },
                  { lbl: 'Coverage', val: '52.2%' },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, padding: '9px 12px', borderRight: i < 7 ? '1px solid var(--line2)' : 'none', textAlign: 'center' }}>
                    <div style={{ fontSize: 9.5, color: 'var(--ink4)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>{s.lbl}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12.5, color: s.hi ? 'var(--blue)' : 'var(--ink2)' }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* TABS */}
            <div style={S.tabsNav}>
              {TABS.map(t => (
                <div key={t} style={{ ...S.tabItem, ...(activeTab === t ? S.tabActive : {}) }} onClick={() => setActiveTab(t)}>
                  {t}
                </div>
              ))}
            </div>

            {/* 2-COL BODY */}
            <div style={S.bodyCols}>
              {/* LEFT: Timeline */}
              <div>
                <div style={S.card}>
                  <div style={S.cardHdr}>
                    <div style={S.cardTitle}><span style={S.liveDot} /> Activity Timeline</div>
                    <span style={S.cardAction}>+ Log Activity</span>
                  </div>
                  {MOCK_ACTIVITIES.map((a, i) => (
                    <div key={i} style={{ ...S.actRow, borderBottom: i < MOCK_ACTIVITIES.length - 1 ? '1px solid var(--line2)' : 'none' }}>
                      <div style={{ ...S.actIcon, background: ICON_BG[a.type], color: ICON_COLOR[a.type] }}>{ICON_EMOJI[a.type]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={S.actText} dangerouslySetInnerHTML={{ __html: a.text }} />
                        <div style={S.actMeta}>{a.meta}</div>
                      </div>
                      <div style={S.actDate}>{a.date}</div>
                    </div>
                  ))}
                  <div style={S.tlMore}><span style={S.tlMoreText}>View all 12 activities & notes →</span></div>
                </div>
              </div>

              {/* RIGHT: Catalysts + AI Signal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Catalysts */}
                <div style={S.card}>
                  <div style={S.cardHdr}>
                    <div style={S.cardTitle}>Active Catalysts</div>
                    <span style={S.cardAction}>+ Add</span>
                  </div>
                  {(p.catalysts ?? MOCK_CATALYSTS).map((c, i) => (
                    <div key={i} style={{ ...S.catRow, borderBottom: i < (p.catalysts ?? MOCK_CATALYSTS).length - 1 ? '1px solid var(--line2)' : 'none' }}>
                      <span style={{ ...S.cat, background: CAT_BG[c.type], borderColor: CAT_BDR[c.type], color: CAT_COLOR[c.type] }}>{c.label}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--ink3)', flex: 1 }}>{c.desc}</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: 'var(--ink4)' }}>{c.date}</span>
                    </div>
                  ))}
                </div>

                {/* AI Property Signal */}
                <div style={S.propSignal}>
                  <div style={S.propSignalHdr}><span style={{ fontSize: 13 }}>✦</span><span style={S.propSignalTitle}>AI Property Signal</span></div>
                  <div style={S.propSignalBody}>
                    <strong style={{ color: 'var(--blue)' }}>Top-quartile SGV Mid-Valley asset.</strong> 32' clear and 1.29 DH ratio rank in the top 15% of tracked SGV properties — submarket avg is 28' clear, 0.82 DH ratio. At {p.inPlaceRent ?? '$1.28/SF'} NNN, rent is{' '}
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>12% below market</span> ({p.marketRent ?? '$1.44–1.52'}), creating ~$300K/year NOI upside at renewal. No comparable 180K+ SF dock-high available within 5 miles —{' '}
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>effectively irreplaceable at replacement cost ~$320/SF.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* OWNER + TENANT below timeline — full width 2-col */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
              <div style={S.card}>
                <div style={S.spHdr}>
                  <span>Owner</span>
                  <span style={S.spHdrA}>View Record →</span>
                </div>
                {[
                  ['Company', p.owner ?? 'Leegin Creative Leather'],
                  ['Contact', p.ownerContact ?? 'Bob Rosenthall'],
                  ['Owner Type', p.ownerType ?? 'Owner-User'],
                  ['Owner Since', p.ownerSince ?? '2009'],
                ].map(([k, v]) => (
                  <div key={k} style={S.spRow}>
                    <span style={S.spKey}>{k}</span>
                    <span style={{ fontSize: 13, color: k === 'Contact' ? 'var(--blue)' : 'var(--ink2)', cursor: k === 'Contact' ? 'pointer' : 'default' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={S.spHdr}><span>Tenant</span></div>
                <div style={{ padding: '14px 16px 10px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 2 }}>Tenant</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink2)', marginBottom: 2 }}>{p.tenant ?? 'Leegin Creative Leather'}</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: 'var(--rust)', lineHeight: 1 }}>{p.leaseExpiry ?? 'Aug 2027'}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--rust)', marginTop: 2 }}>17 months remaining</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--line2)' }}>
                  {[
                    { lbl: 'Current Rate', val: p.inPlaceRent ?? '$1.28/SF', color: 'var(--rust)' },
                    { lbl: 'Market Rate', val: p.marketRent ?? '$1.44–1.52', color: 'var(--green)' },
                    { lbl: 'Type', val: p.leaseType ?? 'NNN', color: 'var(--blue)' },
                    { lbl: 'Spread', val: '+12–18%', color: 'var(--green)' },
                  ].map((r, i) => (
                    <div key={i} style={{ padding: '10px 16px', borderRight: i % 2 === 0 ? '1px solid var(--line2)' : 'none', borderTop: i >= 2 ? '1px solid var(--line2)' : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 4 }}>{r.lbl}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 600, color: r.color }}>{r.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function SynthSection({ title, items, steps }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink2)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)', flexShrink: 0 }} />
        {title}
      </div>
      {items && items.map((item, i) => (
        <div key={i} style={{ fontSize: 13.5, lineHeight: 1.72, color: 'var(--ink2)', display: 'flex', gap: 8, marginBottom: 3 }}>
          <span style={{ color: 'var(--ink4)', flexShrink: 0 }}>–</span>{item}
        </div>
      ))}
      {steps && steps.map((step, i) => (
        <div key={i} style={{ fontSize: 13.5, lineHeight: 1.72, color: 'var(--ink2)', display: 'flex', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--purple)', fontWeight: 600, flexShrink: 0, minWidth: 20, paddingTop: 2 }}>{i + 1}.</span>
          <div dangerouslySetInnerHTML={{ __html: step }} />
        </div>
      ))}
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: 0, position: 'sticky', top: 0, zIndex: 5, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' },
  topbarInner: { maxWidth: 1700, width: '100%', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10 },
  bc: { fontSize: 13, color: 'var(--ink4)', display: 'flex', alignItems: 'center', gap: 4 },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', paddingBottom: 60 },
  hero: { height: 300, position: 'relative', overflow: 'hidden' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,8,5,0.82) 0%,rgba(10,8,5,0.15) 55%,transparent 100%)', pointerEvents: 'none', zIndex: 400 },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, padding: '20px 28px' },
  heroTitle: { fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-0.01em', marginBottom: 8, textShadow: '0 2px 8px rgba(0,0,0,0.5)' },
  heroBadges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  hbGreen: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(21,102,54,0.30)', borderColor: 'rgba(60,180,110,0.45)', color: '#B8F0D0' },
  hbAmber: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(140,90,4,0.30)', borderColor: 'rgba(220,160,50,0.45)', color: '#FFE0A0' },
  hbBlue: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(78,110,150,0.30)', borderColor: 'rgba(137,168,198,0.45)', color: '#C8E0F8' },
  actionBar: { background: 'var(--bg2)', borderBottom: '1px solid var(--line)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  scoreChip: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', background: 'var(--card)', border: '1px solid var(--blue-bdr)', borderRadius: 8, marginRight: 6, flexShrink: 0 },
  abSep: { width: 1, height: 22, background: 'var(--line)', margin: '0 3px' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  btnGreen: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--green)', background: 'var(--green)', color: '#fff', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  btnLink: { background: 'none', border: 'none', color: 'var(--blue2)', fontSize: 12.5, padding: '7px 10px', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(100,128,162,0.3)', fontFamily: 'inherit' },
  inner: { padding: '18px 28px 0' },
  synthCard: { background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid rgba(88,56,160,0.18)', overflow: 'hidden', marginBottom: 16, position: 'relative', borderLeft: '3px solid var(--purple)' },
  synthHdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px 11px 20px', borderBottom: '1px solid rgba(88,56,160,0.12)', cursor: 'pointer' },
  synthTitle: { fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--purple)' },
  synthMeta: { fontFamily: "'Cormorant Garamond',serif", fontSize: 12.5, fontStyle: 'italic', color: 'var(--ink4)' },
  synthToggle: { fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--purple)', cursor: 'pointer', whiteSpace: 'nowrap' },
  synthBody: { padding: '18px 22px 20px 22px' },
  synthCritical: { marginTop: 14, padding: '10px 14px', background: 'rgba(184,55,20,0.05)', border: '1px solid rgba(184,55,20,0.18)', borderRadius: 7, fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink2)' },
  synthFooter: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 22px', borderTop: '1px solid rgba(88,56,160,0.10)', background: 'rgba(88,56,160,0.02)' },
  synthRegen: { fontSize: 12, color: 'var(--purple)', cursor: 'pointer', background: 'none', border: '1px solid rgba(88,56,160,0.22)', borderRadius: 6, padding: '4px 11px', fontFamily: 'inherit' },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden', marginBottom: 16 },
  statCell: { padding: '13px 14px' },
  statLbl: { fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 5 },
  statVal: { fontFamily: "'Playfair Display',serif", fontWeight: 700, color: 'var(--ink)', lineHeight: 1 },
  statSub: { fontSize: 11, color: 'var(--ink4)', marginTop: 2 },
  scoreCard: { background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden', marginBottom: 16 },
  scoreCardHdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', borderBottom: '1px solid var(--line)', cursor: 'pointer' },
  scRing: { width: 50, height: 50, borderRadius: '50%', border: '2.5px solid rgba(78,110,150,0.32)', background: 'var(--blue-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tabsNav: { display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 16 },
  tabItem: { padding: '10px 15px', fontSize: 13.5, color: 'var(--ink4)', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' },
  tabActive: { color: 'var(--blue)', borderBottomColor: 'var(--blue)', fontWeight: 500 },
  bodyCols: { display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16 },
  card: { background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden' },
  cardHdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--line)' },
  cardTitle: { fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 6 },
  cardAction: { fontFamily: "'Cormorant Garamond',serif", fontSize: 13.5, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' },
  liveDot: { display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--rust)', animation: 'blink 1.4s infinite' },
  actRow: { display: 'flex', gap: 12, padding: '11px 16px' },
  actIcon: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, flexShrink: 0, marginTop: 1 },
  actText: { fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.4 },
  actMeta: { fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 2 },
  actDate: { fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: 'var(--ink4)', flexShrink: 0, paddingTop: 2 },
  tlMore: { padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg)', borderTop: '1px solid var(--line)' },
  tlMoreText: { fontFamily: "'Cormorant Garamond',serif", fontSize: 13.5, fontStyle: 'italic', color: 'var(--blue2)' },
  catRow: { display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', cursor: 'pointer' },
  cat: { display: 'inline-flex', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', flexShrink: 0 },
  propSignal: { background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  propSignalHdr: { padding: '10px 16px', background: 'rgba(78,110,150,0.12)', borderBottom: '1px solid var(--blue-bdr)', display: 'flex', alignItems: 'center', gap: 7 },
  propSignalTitle: { fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)' },
  propSignalBody: { padding: '14px 16px', fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink2)' },
  spHdr: { padding: '10px 16px', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  spHdrA: { fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer', fontWeight: 400, letterSpacing: 0, textTransform: 'none' },
  spRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 16px', borderBottom: '1px solid var(--line2)' },
  spKey: { fontSize: 12.5, color: 'var(--ink4)' },
};

const ICON_BG = { call: 'var(--blue-bg)', note: 'var(--amber-bg)', alert: 'var(--rust-bg)', email: 'var(--purple-bg)', deal: 'var(--green-bg)' };
const ICON_COLOR = { call: 'var(--blue)', note: 'var(--amber)', alert: 'var(--rust)', email: 'var(--purple)', deal: 'var(--green)' };
const ICON_EMOJI = { call: '📞', note: '📝', alert: '⚠', email: '✉', deal: '◈' };

const CAT_BG = { lease: 'var(--amber-bg)', broker: 'var(--blue-bg)', slb: 'var(--green-bg)', warn: 'var(--rust-bg)' };
const CAT_BDR = { lease: 'var(--amber-bdr)', broker: 'var(--blue-bdr)', slb: 'var(--green-bdr)', warn: 'var(--rust-bdr)' };
const CAT_COLOR = { lease: 'var(--amber)', broker: 'var(--blue)', slb: 'var(--green)', warn: 'var(--rust)' };

// ── MOCK DATA (replace with Supabase queries) ─────────────────
const MOCK_PROPERTY = {
  address: '14022 Nelson Ave E', lat: 34.0887, lng: -117.9712,
  buildingSF: 186400, acres: 8.2, apnCount: 2,
  inPlaceRent: '$1.28/SF', marketRent: '$1.44–1.52', leaseExpiry: 'Aug 2027',
  estValue: '$48.2M', yearBuilt: 2001, zoning: 'M-2',
  propType: 'Distribution', ownerType: 'Owner-User',
  owner: 'Leegin Creative Leather', ownerContact: 'Bob Rosenthall', ownerSince: '2009',
  tenant: 'Leegin Creative Leather', leaseType: 'NNN', occupancy: 'Occupied',
};

const MOCK_SYNTH = {
  situation: [
    '186,400 SF dock-high distribution (M-2) — strong functional specs, 32\' clear, 135\' truck court',
    'Owner-user: Leegin Creative Leather — 12 new hires in 90 days (expansion signal)',
    'Lease expires Aug 2027 — 17 months remaining, renewal window opens Q3 2026',
    'SLB structure discussed with RJ Neu — owner receptive, wants long-term stay',
  ],
  contacts: [
    'Leegin Creative Leather (owner-user, private)',
    'Bob Rosenthall — primary decision maker, board meeting April before RE decisions',
  ],
  issues: [
    'No confirmed renewal vs. SLB decision — board-level, expected April',
    'Market rent spread: in-place $1.28 vs. market $1.44–1.52 NNN — meaningful upside for buyer',
  ],
  steps: [
    '<strong>Immediate:</strong> Follow up with Bob post board meeting — April target',
    '<strong>Week 1:</strong> Send SLB investor demand summary with comparable sales ($240–275/SF)',
    '<strong>Week 2:</strong> Identify 2–3 backup institutional buyers if LOI falls',
  ],
  critical: 'With 17 months remaining, SLB execution needs to begin within 60 days. If owner renews instead, pivot to buyer-rep for replacement tenant.',
};

const MOCK_ACTIVITIES = [
  { type: 'call', text: '<strong>Called Bob Rosenthall</strong> — Left voicemail re: renewal timeline. Board meeting in April before any decisions.', meta: 'Briana Corso · Follow-up set 3/28', date: 'Mar 22' },
  { type: 'alert', text: '<strong>Catalyst Alert — Lease Expiry</strong> triggered: 17 months to expiration. Renewal window opens Q3 2026.', meta: 'System · Auto-generated', date: 'Mar 20' },
  { type: 'note', text: '<strong>Intelligence Note:</strong> LinkedIn shows 12 new hires in 90 days — ops + logistics roles. Possible expansion signal.', meta: 'Briana Corso', date: 'Mar 18' },
  { type: 'call', text: '<strong>Called RJ Neu</strong> — SLB structure discussed. Owner receptive, wants long-term stay. 12-year initial term.', meta: 'Briana Corso · 22 min', date: 'Mar 14' },
];

const MOCK_CATALYSTS = [
  { type: 'lease', label: "Lease '27", desc: 'Expiry Aug 2027 · 17 months', date: 'auto' },
  { type: 'broker', label: 'Hiring Signal', desc: '+12 hires in 90 days', date: 'Mar 18' },
  { type: 'slb', label: 'SLB', desc: 'Owner receptive per call', date: 'Mar 14' },
];
