'use client';
import { useState, useEffect, useRef } from 'react';

const TABS = ['Timeline', 'Buildings', 'APNs', 'Lease Comps', 'Sale Comps', 'Contacts', 'Deals', 'Leads', 'Buyer Matches', 'Files'];

const MOCK_BUYER_MATCHES = [
  { id: 6,  company: 'Pacific Manufacturing Group',  type: 'Corporate / Buyer',    req: '280–320K SF · SGV / Whittier · 30\'+ Clear · Dock-High', match: 94 },
  { id: 8,  company: 'Rexford Industrial Realty',    type: 'Institutional REIT',   req: '100–400K SF · SoCal Industrial · NNN Yield · Core/Core+', match: 87 },
  { id: 2,  company: 'Cabot Industrial Value Fund',  type: 'Institutional REIT',   req: '150–300K SF · IE West / SGV · Value-Add OK · Sub-5.5 Cap', match: 81 },
  { id: 10, company: 'Matrix Logistics Partners',    type: 'Private Equity Buyer', req: '150–250K SF · IE West · Dock-High · 28\'+ Clear', match: 74 },
];

export default function PropertyDetail({ property, onBack, onNavigate, onSelectAccount }) {
  const [activeTab, setActiveTab] = useState('Timeline');
  const [specsOpen, setSpecsOpen] = useState(false);
  const [synthOpen, setSynthOpen] = useState(true);
  const [logPanel, setLogPanel] = useState(null);
  const [logText, setLogText] = useState('');
  const [specs, setSpecs] = useState({
    buildingSF: property?.buildingSF ?? 186400,
    landAcres: property?.acres ?? 8.2,
    yearBuilt: property?.yearBuilt ?? 2001,
    clearHeight: '32',
    eaveHeight: "28'",
    columnSpacing: "52'x55'",
    bayDepth: "55'",
    constructionType: 'Tilt-Up Concrete',
    roofType: 'TPO',
    dockHighDoors: 24,
    gradeDoors: 4,
    truckCourtDepth: '135',
    yardDepth: '',
    trailerSpots: 50,
    parkingSpaces: 120,
    loadingType: 'Rear-Load',
    dockLevelerType: 'Hydraulic',
    doorSize: "9'x10'",
    powerAmps: '2000',
    powerVoltage: '277/480V',
    sprinklers: 'ESFR',
    hvac: 'None (warehouse)',
    lighting: 'LED',
    railServed: 'No',
    evapCooler: 'No',
    officePct: '8',
  });
  const setSpec = (k, v) => setSpecs(s => ({ ...s, [k]: v }));
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
  const { score: bldgScore, grade: bldgGrade } = computeScore(specs);

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
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--blue)' }}>{bldgGrade}</div>
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{bldgScore}</div>
            </div>
            <div style={S.abSep} />
            <button style={S.btnGhost} onClick={() => setLogPanel(logPanel === 'call' ? null : 'call')}>📞 Log Call</button>
            <button style={S.btnGhost} onClick={() => setLogPanel(logPanel === 'email' ? null : 'email')}>✉ Log Email</button>
            <button style={S.btnGhost} onClick={() => setLogPanel(logPanel === 'note' ? null : 'note')}>📝 Add Note</button>
            <button style={S.btnGhost} onClick={() => setLogPanel(logPanel === 'task' ? null : 'task')}>+ Task</button>
            <div style={S.abSep} />
            <button style={S.btnLink} onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(p.address + ' ' + (p.city ?? ''))}`)}>📍 Google Maps</button>
            <button style={S.btnLink} onClick={() => window.open(`https://www.costar.com/search#?q=${encodeURIComponent(p.address + (p.city ? ', ' + p.city : ''))}&t=2`)}>🗂 CoStar</button>
            <button style={S.btnLink} onClick={() => { const apn = p.apn ?? p.apns?.[0]?.apn ?? ''; window.open(`https://assessor.lacounty.gov/commonassessment/assessmentinformation/assessmentdetails.aspx?ain=${apn.replace(/-/g,'')}`); }}>🗺 LA County GIS</button>
            <div style={S.abSep} />
            <button style={S.btnGhost} onClick={() => alert('Edit property — Supabase form coming soon')}>⚙ Edit</button>
            <button style={S.btnGhost} onClick={() => alert('Export Memo — coming soon')}>↓ Export Memo</button>
            <div style={{ marginLeft: 'auto' }} />
            <button style={S.btnGreen} onClick={() => onNavigate?.('deals')}>◈ Convert to Deal</button>
          </div>

          {/* LOG PANEL */}
          {logPanel && (
            <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)', padding: '14px 28px', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>
                  {logPanel === 'call' ? 'Log Call' : logPanel === 'email' ? 'Log Email' : logPanel === 'note' ? 'Add Note' : 'Add Task'}
                </div>
                <textarea value={logText} onChange={e => setLogText(e.target.value)}
                  placeholder={`Notes for ${logPanel}...`}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 7, fontFamily: 'inherit', fontSize: 13, color: 'var(--ink2)', background: 'var(--bg)', outline: 'none', resize: 'vertical', minHeight: 72 }} />
              </div>
              <button style={S.btnGhost} onClick={() => { setLogPanel(null); setLogText(''); }}>Cancel</button>
              <button style={S.btnBlue} onClick={() => { setLogPanel(null); setLogText(''); }}>Save</button>
            </div>
          )}

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
                <button style={S.synthRegen} onClick={() => alert('AI Synthesis regenerated!')}>↻ Regenerate</button>
                <button style={S.synthRegen} onClick={() => { navigator.clipboard?.writeText(document.querySelector('[data-synth]')?.innerText ?? 'Synthesis copied'); alert('Synthesis copied to clipboard'); }}>📋 Copy</button>
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
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{bldgScore}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--blue2)', marginTop: 1 }}>{bldgGrade}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>Building Score — {bldgGrade} · {bldgScore >= 90 ? 'Top-tier distribution asset' : bldgScore >= 75 ? 'Above-average industrial asset' : bldgScore >= 60 ? 'Standard industrial asset' : 'Add specs to generate score'}</div>
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
              {specsOpen && <SpecGrid specs={specs} setSpec={setSpec} />}
            </div>

            {/* TABS */}
            <div style={S.tabsNav}>
              {TABS.map(t => (
                <div key={t} style={{ ...S.tabItem, ...(activeTab === t ? S.tabActive : {}) }} onClick={() => setActiveTab(t)}>
                  {t}
                </div>
              ))}
            </div>

            {/* 2-COL BODY — Timeline tab only */}
            {activeTab === 'Timeline' && (
              <div>
                <div style={S.bodyCols}>
                  {/* LEFT: Timeline */}
                  <div>
                    <div style={S.card}>
                      <div style={S.cardHdr}>
                        <div style={S.cardTitle}><span style={S.liveDot} /> Activity Timeline</div>
                        <span style={S.cardAction} onClick={() => setLogPanel(logPanel === 'note' ? null : 'note')}>+ Log Activity</span>
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
                      <div style={S.tlMore} onClick={() => alert('Showing all 12 activities — Supabase pagination coming soon')}><span style={S.tlMoreText}>View all 12 activities & notes →</span></div>
                    </div>
                  </div>

                  {/* RIGHT: Catalysts + AI Signal */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={S.card}>
                      <div style={S.cardHdr}>
                        <div style={S.cardTitle}>Active Catalysts</div>
                        <span style={S.cardAction} onClick={() => alert('Add catalyst — coming soon')}>+ Add</span>
                      </div>
                      {(p.catalysts ?? MOCK_CATALYSTS).map((c, i) => (
                        <div key={i} style={{ ...S.catRow, borderBottom: i < (p.catalysts ?? MOCK_CATALYSTS).length - 1 ? '1px solid var(--line2)' : 'none' }}>
                          <span style={{ ...S.cat, background: CAT_BG[c.type], borderColor: CAT_BDR[c.type], color: CAT_COLOR[c.type] }}>{c.label}</span>
                          <span style={{ fontSize: 12.5, color: 'var(--ink3)', flex: 1 }}>{c.desc}</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: 'var(--ink4)' }}>{c.date}</span>
                        </div>
                      ))}
                    </div>
                    <div style={S.propSignal}>
                      <div style={S.propSignalHdr}><span style={{ fontSize: 13 }}>✦</span><span style={S.propSignalTitle}>AI Property Signal</span></div>
                      <div style={S.propSignalBody}>
                        <strong style={{ color: 'var(--blue)' }}>Top-quartile SGV Mid-Valley asset.</strong> 32&apos; clear and 1.29 DH ratio rank in the top 15% of tracked SGV properties. At {p.inPlaceRent ?? '$1.28/SF'} NNN, rent is{' '}
                        <span style={{ color: 'var(--green)', fontWeight: 600 }}>12% below market</span> ({p.marketRent ?? '$1.44–1.52'}), creating ~$300K/year NOI upside at renewal.{' '}
                        <span style={{ color: 'var(--green)', fontWeight: 600 }}>Effectively irreplaceable at replacement cost ~$320/SF.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OWNER + TENANT below — full width 2-col */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
                  <div style={S.card}>
                    <div style={S.spHdr}>
                      <span>Owner</span>
                      <span style={S.spHdrA} onClick={() => alert('View owner record — coming soon')}>View Record →</span>
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
            )}

            {activeTab !== 'Timeline' && <PropertyTabContent tab={activeTab} p={p} onSelectAccount={onSelectAccount} />}

          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyTabContent({ tab, p, onSelectAccount }) {
  const tbl = (cols, rows) => (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--line2)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)' }}>
            {cols.map(c => <th key={c} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink4)', whiteSpace: 'nowrap' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--line2)' : 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              {row.map((cell, j) => <td key={j} style={{ padding: '10px 14px', color: j === 0 ? 'var(--ink2)' : 'var(--ink3)', fontFamily: j > 0 ? "'DM Mono',monospace" : 'inherit', fontSize: j > 0 ? 12 : 13 }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (tab === 'Buildings') return tbl(
    ['APN', 'Building SF', 'Year Built', 'Stories', 'Clear Height', 'Dock Doors', 'Grade Doors'],
    [['8558-006-003', '186,400', '2001', '1', "32'", '24 DH', '4 GL'],]
  );
  if (tab === 'APNs') return tbl(
    ['APN Number', 'Owner of Record', 'Land (Acres)', 'Assessed Value', 'Last Transfer', 'Zoning'],
    [
      ['8558-006-003', p.owner ?? 'Leegin Creative Leather', '4.8 ac', '$18.2M', '2009', 'M-2'],
      ['8558-006-004', p.owner ?? 'Leegin Creative Leather', '3.4 ac', '$12.8M', '2009', 'M-2'],
    ]
  );
  if (tab === 'Lease Comps') return tbl(
    ['Address', 'Tenant', 'SF', 'Start', 'Rate/SF/Mo', 'Term', 'Type'],
    [
      ['14500 Nelson Ave, Baldwin Park', 'Pacific Mfg Group', '142,000', 'Jan 2025', '$1.38', '5 yr', 'NNN'],
      ['1300 Arrow Hwy, Irwindale', 'Apex Distribution', '96,000', 'Mar 2025', '$1.44', '3 yr', 'NNN'],
      ['12200 Shoemaker Ave, Norwalk', 'SoCal Logistics', '220,000', 'Nov 2024', '$1.31', '7 yr', 'NNN'],
    ]
  );
  if (tab === 'Sale Comps') return tbl(
    ['Address', 'Buyer', 'SF', 'Sale Date', 'Sale Price', 'Price/SF', 'Cap Rate'],
    [
      ['4900 Workman Mill Rd, Industry', 'Rexford Industrial', '312,000', 'Dec 2024', '$86.2M', '$277', '4.9%'],
      ['1800 Workman Mill Rd, Walnut', 'Blackstone RE', '186,000', 'Oct 2024', '$51.5M', '$277', '5.1%'],
      ['900 S Stimson Ave, Industry', 'Prologis', '420,000', 'Aug 2024', '$109M', '$260', '5.3%'],
    ]
  );
  if (tab === 'Contacts') return tbl(
    ['Name', 'Title', 'Company', 'Phone', 'Email', 'Role'],
    [
      ['Bob Rosenthall', 'VP Real Estate', p.owner ?? 'Leegin Creative Leather', '(626) 555-0142', 'bob.r@leegin.com', 'Decision Maker'],
      ['Sandra Wu', 'CFO', p.owner ?? 'Leegin Creative Leather', '(626) 555-0199', 's.wu@leegin.com', 'Financial Approver'],
    ]
  );
  if (tab === 'Deals') return tbl(
    ['Deal Name', 'Stage', 'Deal Type', 'Value', 'Target Close', 'Probability'],
    [
      [p.address ?? '14022 Nelson Ave · SLB', 'LOI', 'Sale-Leaseback', '$48.2M', 'Jun 2026', '81%'],
    ]
  );
  if (tab === 'Leads') return tbl(
    ['Company', 'Lead Score', 'Grade', 'Source', 'Status', 'Added'],
    [
      [p.tenant ?? 'Leegin Creative Leather', '95', 'A+', 'Broker Intel', 'Active', 'Mar 20, 2026'],
    ]
  );
  if (tab === 'Buyer Matches') return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--line2)', overflow: 'hidden' }}>
      <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)' }}>Buyer Matches</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13.5, fontStyle: 'italic', color: 'var(--ink4)' }}>
          {MOCK_BUYER_MATCHES.length} active buyers · AI-matched to this asset
        </div>
      </div>
      {MOCK_BUYER_MATCHES.map((b, i) => (
        <div key={b.id}
          style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: 16, borderBottom: i < MOCK_BUYER_MATCHES.length - 1 ? '1px solid var(--line2)' : 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}>
          {/* Score ring */}
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2.5px solid var(--blue2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(78,110,150,0.07)' }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{b.match}</span>
          </div>
          {/* Company + requirement */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink2)' }}
              onClick={() => onSelectAccount?.({ id: b.id, name: b.company, type: b.type })}>
              {b.company}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13.5, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 2 }}>{b.req}</div>
          </div>
          {/* Match % */}
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: 'var(--blue)', lineHeight: 1, width: 64, textAlign: 'right', flexShrink: 0 }}>{b.match}%</div>
          {/* Open account link */}
          <span style={{ fontSize: 12.5, color: 'var(--blue2)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(100,128,162,0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => onSelectAccount?.({ id: b.id, name: b.company, type: b.type })}>
            Open Account →
          </span>
        </div>
      ))}
    </div>
  );
  if (tab === 'Files') return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--line2)', overflow: 'hidden' }}>
      {[
        { name: 'Leegin_BOV_Draft_v2.pdf', type: 'PDF', size: '2.4 MB', uploaded: 'Mar 22, 2026', by: 'Briana Corso' },
        { name: 'APN_Map_8558-006.png', type: 'Image', size: '840 KB', uploaded: 'Mar 21, 2026', by: 'System' },
        { name: 'Lease_Abstract_2019.pdf', type: 'PDF', size: '1.1 MB', uploaded: 'Mar 20, 2026', by: 'Briana Corso' },
      ].map((f, i, arr) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--line2)' : 'none', gap: 12, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
          onClick={() => alert(`Download ${f.name} — coming soon`)}>
          <span style={{ fontSize: 18 }}>{f.type === 'PDF' ? '📄' : '🖼'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>{f.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>{f.size} · Uploaded {f.uploaded} by {f.by}</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer' }}>↓ Download</span>
        </div>
      ))}
    </div>
  );
  return null;
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

// ── SPEC DROPDOWN OPTIONS ────────────────────────────────────
const CLEAR_HEIGHT_OPTS = ["12'","14'","16'","18'","20'","22'","24'","26'","28'","30'","32'","36'","40'","42'+"];
const COLUMN_SPACING_OPTS = ["30'x30'","40'x40'","50'x50'","52'x55'","50'x52'","52'x48'","60'x60'",'Other'];
const CONSTRUCTION_OPTS = ['Tilt-Up Concrete','Masonry/CMU','Steel Frame','Wood Frame','Other'];
const ROOF_TYPE_OPTS = ['TPO','EPDM','Built-Up','Metal','Other'];
const TRUCK_COURT_OPTS = ["60'","80'","90'","100'","120'","130'","135'","150'","185'","200'+"];
const LOADING_TYPE_OPTS = ['Rear-Load','Side-Load','Cross-Dock','Drive-In','Other'];
const DOCK_LEVELER_OPTS = ['Hydraulic','Mechanical','Air Bag','Edge of Dock','None'];
const DOOR_SIZE_OPTS = ["8'x8'","8'x10'","9'x10'","10'x10'","10'x12'","12'x14'"];
const POWER_AMPS_OPTS = ['200A','400A','600A','800A','1200A','1600A','2000A','2500A','3000A','4000A+'];
const POWER_VOLTAGE_OPTS = ['120/240V','208/120V','240/120V','277/480V','480V 3-Phase'];
const SPRINKLERS_OPTS = ['ESFR','CMSA','Wet Pipe','Dry Pipe','None'];
const HVAC_OPTS = ['None (warehouse)','Evap Cooler','Rooftop Package','Split System','Central Air','Full HVAC'];
const LIGHTING_OPTS = ['LED','Fluorescent','Metal Halide','Sodium'];
const YES_NO_OPTS = ['Yes','No'];

// ── SCORE CALCULATOR ─────────────────────────────────────────
function computeScore(specs) {
  const bsf = parseFloat(specs.buildingSF) || 0;
  const dh = parseFloat(specs.dockHighDoors) || 0;
  const yr = parseInt(specs.yearBuilt) || 0;
  const ch = parseInt(specs.clearHeight) || 0;
  const tc = parseInt(specs.truckCourtDepth) || 0;
  const amps = parseInt(specs.powerAmps) || 0;
  const officePct = parseFloat(specs.officePct) || 0;
  const dhRatio = bsf > 0 ? (dh / bsf) * 10000 : 0;
  const chPts = ch >= 36 ? 25 : ch >= 32 ? 22 : ch >= 28 ? 18 : ch >= 24 ? 12 : ch >= 20 ? 6 : 0;
  const dhPts = dhRatio >= 1.0 ? 20 : dhRatio >= 0.8 ? 16 : dhRatio >= 0.6 ? 11 : dhRatio >= 0.4 ? 6 : 0;
  const tcPts = tc >= 185 ? 15 : tc >= 130 ? 12 : tc >= 100 ? 8 : tc >= 70 ? 4 : 0;
  const pwrPts = amps >= 3000 ? 15 : amps >= 2000 ? 12 : amps >= 1200 ? 8 : amps >= 800 ? 5 : 0;
  const vintPts = yr >= 2015 ? 10 : yr >= 2005 ? 8 : yr >= 1995 ? 5 : yr >= 1980 ? 3 : yr >= 1960 ? 1 : 0;
  const sprPts = { 'ESFR': 10, 'CMSA': 8, 'Wet Pipe': 5, 'Dry Pipe': 2, 'None': 0 }[specs.sprinklers] ?? 0;
  const offPts = officePct <= 5 ? 5 : officePct <= 10 ? 4 : officePct <= 15 ? 3 : officePct <= 25 ? 1 : 0;
  const breakdown = [
    { label: `Clear Height (${ch || '—'}')`, pts: chPts, max: 25 },
    { label: `DH Ratio (${dhRatio.toFixed(2)}/10k SF)`, pts: dhPts, max: 20 },
    { label: `Truck Court (${tc || '—'}')`, pts: tcPts, max: 15 },
    { label: `Power (${amps || '—'}A)`, pts: pwrPts, max: 15 },
    { label: `Vintage (${yr || '—'})`, pts: vintPts, max: 10 },
    { label: `Sprinklers (${specs.sprinklers || '—'})`, pts: sprPts, max: 10 },
    { label: `Office % (${officePct || '—'}%)`, pts: offPts, max: 5 },
  ];
  const total = breakdown.reduce((s, r) => s + r.pts, 0);
  const grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B+' : total >= 60 ? 'B' : total >= 50 ? 'C+' : 'C';
  return { score: total, grade, breakdown };
}

// ── SPEC GRID COMPONENT ───────────────────────────────────────
function SpecGrid({ specs, setSpec }) {
  const bsf = parseFloat(specs.buildingSF) || 0;
  const landAcres = parseFloat(specs.landAcres) || 0;
  const lotSF = Math.round(landAcres * 43560);
  const dh = parseFloat(specs.dockHighDoors) || 0;
  const dhRatio = bsf > 0 ? (dh / bsf) * 10000 : 0;
  const coveragePct = bsf > 0 && lotSF > 0 ? (bsf / lotSF) * 100 : 0;
  const landToBldg = bsf > 0 && lotSF > 0 ? lotSF / bsf : 0;
  const officePct = parseFloat(specs.officePct) || 0;
  const officeSF = bsf > 0 && officePct > 0 ? Math.round(bsf * officePct / 100) : null;
  const warehouseSF = officeSF != null ? bsf - officeSF : null;
  const { score: total, breakdown } = computeScore(specs);

  const inStyle = { fontSize: 12.5, color: 'var(--ink2)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 5, padding: '3px 8px', fontFamily: 'inherit', width: 120, textAlign: 'right', outline: 'none' };
  const selStyle = { ...inStyle, cursor: 'pointer', width: 130, textAlign: 'left' };

  const Row = ({ label, value, onChange, type = 'text', opts }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--line2)', gap: 8 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{label}</span>
      {type === 'select' ? (
        <select value={value ?? ''} onChange={e => onChange(e.target.value)} style={selStyle}>
          <option value="">—</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'readonly' ? (
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>{value}</span>
      ) : (
        <input value={value ?? ''} onChange={e => onChange(e.target.value)} type={type === 'number' ? 'number' : 'text'} style={inStyle} />
      )}
    </div>
  );

  const Sec = ({ title, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink4)', paddingBottom: 5, marginBottom: 5, borderBottom: '2px solid var(--line)' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ borderTop: '2px solid var(--line)', background: 'var(--bg)', padding: '22px 22px 26px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
        {/* LEFT */}
        <div>
          <Sec title="Structure">
            <Row label="Building SF" value={specs.buildingSF} onChange={v => setSpec('buildingSF', v)} type="number" />
            <Row label="Land Area (ac)" value={specs.landAcres} onChange={v => setSpec('landAcres', v)} type="number" />
            <Row label="Year Built" value={specs.yearBuilt} onChange={v => setSpec('yearBuilt', v)} type="number" />
            <Row label="Clear Height" value={specs.clearHeight} onChange={v => setSpec('clearHeight', v)} type="select" opts={CLEAR_HEIGHT_OPTS} />
            <Row label="Eave Height" value={specs.eaveHeight} onChange={v => setSpec('eaveHeight', v)} />
            <Row label="Column Spacing" value={specs.columnSpacing} onChange={v => setSpec('columnSpacing', v)} type="select" opts={COLUMN_SPACING_OPTS} />
            <Row label="Bay Depth" value={specs.bayDepth} onChange={v => setSpec('bayDepth', v)} />
            <Row label="Construction Type" value={specs.constructionType} onChange={v => setSpec('constructionType', v)} type="select" opts={CONSTRUCTION_OPTS} />
            <Row label="Roof Type" value={specs.roofType} onChange={v => setSpec('roofType', v)} type="select" opts={ROOF_TYPE_OPTS} />
          </Sec>
          <Sec title="Loading">
            <Row label="Dock-High Doors" value={specs.dockHighDoors} onChange={v => setSpec('dockHighDoors', v)} type="number" />
            <Row label="Grade-Level Doors" value={specs.gradeDoors} onChange={v => setSpec('gradeDoors', v)} type="number" />
            <Row label="Truck Court Depth" value={specs.truckCourtDepth} onChange={v => setSpec('truckCourtDepth', v)} type="select" opts={TRUCK_COURT_OPTS} />
            <Row label="Yard Depth" value={specs.yardDepth} onChange={v => setSpec('yardDepth', v)} />
            <Row label="Trailer Spots" value={specs.trailerSpots} onChange={v => setSpec('trailerSpots', v)} type="number" />
            <Row label="Parking Spaces" value={specs.parkingSpaces} onChange={v => setSpec('parkingSpaces', v)} type="number" />
            <Row label="Loading Type" value={specs.loadingType} onChange={v => setSpec('loadingType', v)} type="select" opts={LOADING_TYPE_OPTS} />
            <Row label="Dock Leveler Type" value={specs.dockLevelerType} onChange={v => setSpec('dockLevelerType', v)} type="select" opts={DOCK_LEVELER_OPTS} />
            <Row label="Door Size" value={specs.doorSize} onChange={v => setSpec('doorSize', v)} type="select" opts={DOOR_SIZE_OPTS} />
          </Sec>
        </div>
        {/* RIGHT */}
        <div>
          <Sec title="Systems">
            <Row label="Power Amps" value={specs.powerAmps} onChange={v => setSpec('powerAmps', v)} type="select" opts={POWER_AMPS_OPTS} />
            <Row label="Power Voltage" value={specs.powerVoltage} onChange={v => setSpec('powerVoltage', v)} type="select" opts={POWER_VOLTAGE_OPTS} />
            <Row label="Sprinklers" value={specs.sprinklers} onChange={v => setSpec('sprinklers', v)} type="select" opts={SPRINKLERS_OPTS} />
            <Row label="HVAC" value={specs.hvac} onChange={v => setSpec('hvac', v)} type="select" opts={HVAC_OPTS} />
            <Row label="Lighting" value={specs.lighting} onChange={v => setSpec('lighting', v)} type="select" opts={LIGHTING_OPTS} />
            <Row label="Rail Served" value={specs.railServed} onChange={v => setSpec('railServed', v)} type="select" opts={YES_NO_OPTS} />
            <Row label="Evap Cooler" value={specs.evapCooler} onChange={v => setSpec('evapCooler', v)} type="select" opts={YES_NO_OPTS} />
          </Sec>
          <Sec title="Calculated (auto)">
            <Row label="DH Ratio (per 10k SF)" value={bsf > 0 ? dhRatio.toFixed(2) : '—'} type="readonly" />
            <Row label="Coverage Ratio %" value={coveragePct > 0 ? `${coveragePct.toFixed(1)}%` : '—'} type="readonly" />
            <Row label="Land-to-Building" value={landToBldg > 0 ? `${landToBldg.toFixed(2)}x` : '—'} type="readonly" />
            <Row label="Office SF" value={officeSF != null ? officeSF.toLocaleString() : '—'} type="readonly" />
            <Row label="Warehouse SF" value={warehouseSF != null ? warehouseSF.toLocaleString() : '—'} type="readonly" />
          </Sec>
          <Sec title={`Score Breakdown — ${total}/100`}>
            {breakdown.map((b, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{b.label}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: b.pts > 0 ? 'var(--blue)' : 'var(--ink4)' }}>{b.pts}/{b.max}</span>
                </div>
                <div style={{ height: 5, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${b.max > 0 ? (b.pts / b.max) * 100 : 0}%`, background: b.pts >= b.max * 0.8 ? 'var(--green)' : b.pts > 0 ? 'var(--blue)' : 'transparent', borderRadius: 3 }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink2)' }}>Total</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>{total} / 100</span>
            </div>
          </Sec>
        </div>
      </div>
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
  btnBlue: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', whiteSpace: 'nowrap', fontFamily: 'inherit' },
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
