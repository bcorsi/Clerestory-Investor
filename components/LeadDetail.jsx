'use client';
import { useState, useEffect, useRef } from 'react';

const TABS = ['Timeline', 'APNs', 'Lease Comps', 'Contacts', 'Properties', 'Files'];

const MOCK_LEAD = {
  company: 'Leegin Creative Leather Products',
  address: '14022 Nelson Ave E',
  city: 'Baldwin Park',
  market: 'SGV · Mid Valley',
  lat: 34.0887, lng: -117.9712,
  buildingSF: 186400,
  score: 95,
  grade: 'A+',
  ownerType: 'Owner-User',
  leaseExpiry: 'Aug 2027',
  ownerName: 'Leegin Creative Leather Inc.',
  ownerContact: 'Bob Rosenthall',
  ownerSince: '2009',
  catalystCount: 3,
  source: 'Broker intel',
  lastContact: 'Never',
};

const MOCK_ACTIVITIES = [
  { type: 'alert', text: '<strong>WARN Filing Detected</strong> — 287 workers affected, permanent closure. Source: CA EDD.', meta: 'System · Auto-generated catalyst', date: 'Mar 20' },
  { type: 'note', text: '<strong>Research Note:</strong> CoStar confirms no broker listed. Owner-user per assessor records.', meta: 'Briana Corso', date: 'Mar 21' },
  { type: 'call', text: '<strong>Called Jodie (Colliers IE)</strong> — Left voicemail re: displacement signal. Waiting for callback.', meta: 'Briana Corso', date: 'Mar 22' },
  { type: 'email', text: '<strong>Lead created from Broker Intel</strong> — Score computed at 95/A+.', meta: 'System · Lead Gen module', date: 'Mar 20' },
];

const MOCK_CATALYSTS = [
  { type: 'lease', label: 'Lease Exp Aug \'27', desc: '17 months remaining', date: '8/27' },
  { type: 'broker', label: 'Broker Intel', desc: 'Owner exploring SLB', date: 'Mar 21' },
  { type: 'warn', label: 'Displacement Signal', desc: 'Owner-user relocation risk', date: 'est.' },
];

const ICON_BG = { call: 'var(--blue-bg)', note: 'var(--amber-bg)', alert: 'var(--rust-bg)', email: 'var(--purple-bg)' };
const ICON_COLOR = { call: 'var(--blue)', note: 'var(--amber)', alert: 'var(--rust)', email: 'var(--purple)' };
const ICON_EMOJI = { call: '📞', note: '📝', alert: '⚠', email: '✉' };
const CAT_BG = { lease: 'var(--amber-bg)', broker: 'var(--blue-bg)', warn: 'var(--rust-bg)' };
const CAT_BDR = { lease: 'var(--amber-bdr)', broker: 'var(--blue-bdr)', warn: 'var(--rust-bdr)' };
const CAT_COLOR = { lease: 'var(--amber)', broker: 'var(--blue)', warn: 'var(--rust)' };

export default function LeadDetail({ lead, leadId, onBack, onNavigate, onConvertToDeal, onCreateProperty, deals, contacts, leaseComps, saleComps, onRefresh, toast }) {
  const [activeTab, setActiveTab] = useState('Timeline');
  const [synthOpen, setSynthOpen] = useState(true);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [logPanel, setLogPanel] = useState(null);
  const [logText, setLogText] = useState('');
  const [fetchedLead, setFetchedLead] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (leadId && !lead) {
      setFetchLoading(true);
      import('@/lib/supabase').then(({ createClient }) => {
        const supabase = createClient();
        supabase.from('leads').select('*').eq('id', leadId).single()
          .then(({ data, error }) => {
            if (!error && data) setFetchedLead(data);
            setFetchLoading(false);
          });
      });
    }
  }, [leadId]);

  const l = lead ?? fetchedLead ?? MOCK_LEAD;

  if (fetchLoading) return <div className="cl-loading"><div className="cl-spinner" />Loading lead…</div>;

  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return;
    import('leaflet').then(L => {
      L = L.default;
      const map = L.map(mapRef.current, {
        center: [l.lat ?? 34.0887, l.lng ?? -117.9712],
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
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#B83714;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([l.lat ?? 34.0887, l.lng ?? -117.9712], { icon }).addTo(map);
      mapInstanceRef.current = map;
    });
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  function toggleLog(type) {
    setLogPanel(prev => prev === type ? null : type);
    setLogText('');
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* TOPBAR */}
      <div style={S.topbar}>
        <div style={S.topbarInner}>
          <div style={S.bc}>
            <span style={{ cursor: 'pointer', color: 'var(--ink4)' }} onClick={onBack}>Lead Gen</span>
            <span style={{ opacity: .4, margin: '0 4px' }}>›</span>
            <span style={{ color: 'var(--ink2)', fontWeight: 500 }}>{l.company}</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>

          {/* HERO — satellite map */}
          <div style={S.hero}>
            <div ref={mapRef} style={{ width: '100%', height: 280 }} />
            <div style={S.heroOverlay} />
            <div style={S.heroContent}>
              <div style={S.heroTitle}>{l.company}</div>
              <div style={S.heroBadges}>
                <span style={S.hbRust}>⚠ Displacement Signal</span>
                <span style={S.hbBlue}>{l.market}</span>
                <span style={S.hbAmber}>{(l.buildingSF ?? 186400).toLocaleString()} SF · {l.ownerType}</span>
                <span style={S.hbGreen}>Score {l.score} · {l.grade}</span>
              </div>
            </div>
          </div>

          {/* ACTION BAR */}
          <div style={S.actionBar}>
            <div style={S.scoreChip}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Lead Score</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--rust)' }}>{l.grade}</div>
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: 'var(--rust)', lineHeight: 1 }}>{l.score}</div>
            </div>
            <div style={S.abSep} />
            <button style={S.btnGhost} onClick={() => toggleLog('call')}>📞 Log Call</button>
            <button style={S.btnGhost} onClick={() => toggleLog('email')}>✉ Log Email</button>
            <button style={S.btnGhost} onClick={() => toggleLog('note')}>📝 Add Note</button>
            <button style={S.btnGhost} onClick={() => toggleLog('task')}>+ Task</button>
            <div style={S.abSep} />
            <button style={S.btnLink} onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(l.address + ' ' + l.city)}`)}>📍 Google Maps</button>
            <button style={S.btnLink} onClick={() => window.open(`https://www.costar.com/search#?q=${encodeURIComponent(l.address + (l.city ? ', ' + l.city : ''))}&t=2`)}>🗂 CoStar</button>
            <button style={S.btnLink} onClick={() => { const apn = l.apn ?? l.apns?.[0]; if (apn) { const cleanAPN = String(apn).replace(/-/g,''); window.open(`https://portal.assessor.lacounty.gov/parceldetail/${cleanAPN}`, '_blank'); } else { const addr = encodeURIComponent(`${l.address}, ${l.city}, CA`); window.open(`https://portal.assessor.lacounty.gov/commonassessment/assessmentsearch?SearchType=address&Address=${addr}`, '_blank'); } }}>🗺 LA County GIS</button>
            <div style={S.abSep} />
            <button style={S.btnGhost} onClick={() => {}}>⚙ Edit</button>
            <button style={S.btnGhost} onClick={() => {}}>↓ Export Memo</button>
            <button style={S.btnGhost} onClick={() => onNavigate?.('owner-search')}>🔍 Run Owner Search</button>
            <button style={S.btnGhost} onClick={() => onCreateProperty?.(l)}>+ Create Property</button>
            <div style={{ marginLeft: 'auto' }} />
            <button style={S.btnGreen} onClick={() => onConvertToDeal?.(l)}>◈ Convert to Deal</button>
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
                  <span style={S.synthMeta}>Lead Intelligence Report · {l.company}</span>
                </div>
                <span style={S.synthToggle}>{synthOpen ? 'Hide ▴' : 'Show ▾'}</span>
              </div>
              {synthOpen && (
                <div style={S.synthBody}>
                  <SynthSection title="Current Situation" items={[
                    `Owner-user occupying ${(l.buildingSF ?? 186400).toLocaleString()} SF in ${l.market} — Lease expiry ${l.leaseExpiry ?? 'Aug 2027'}`,
                    'Broker intel suggests owner exploring sale-leaseback or relocation',
                    `${l.market} vacancy sub-3% — demand for quality dock-high product is extremely tight`,
                    'No broker appointed yet — exclusive outreach window exists',
                  ]} />
                  <SynthSection title="Key Contacts / Owner" items={[
                    `${l.ownerName ?? 'Leegin Creative Leather Inc.'} — owner-user since ${l.ownerSince ?? '2009'}`,
                    `Primary contact: ${l.ownerContact ?? 'Bob Rosenthall'} — decision maker for RE matters`,
                  ]} />
                  <SynthSection title="Recommended Next Steps" steps={[
                    `<strong>Today:</strong> Reach out directly to ${l.ownerContact ?? 'Bob Rosenthall'} — introduce sale-leaseback concept`,
                    '<strong>48 hrs:</strong> Pull ownership comps, prepare BOV with SLB pricing',
                    `<strong>Week 1:</strong> Present SLB structure — target ${l.leaseExpiry ?? 'Aug 2027'} lease-back term`,
                  ]} />
                  <div style={S.synthCritical}><strong style={{ color: 'var(--rust)' }}>Act before lease expiry:</strong> Owner-users approaching lease expiry represent highest-conversion leads — first broker in wins the listing.</div>
                </div>
              )}
              <div style={S.synthFooter}>
                <button style={S.synthRegen} onClick={() => {}}>↻ Regenerate</button>
                <button style={S.synthRegen} onClick={() => { navigator.clipboard?.writeText(`AI Synthesis: ${l.company} — Owner-user ${l.buildingSF?.toLocaleString() ?? '186,400'} SF, lease expiry ${l.leaseExpiry ?? 'Aug 2027'}, broker intel confirmed.`); {}; }}>📋 Copy</button>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)', marginLeft: 'auto' }}>Generated Mar 24, 2026 · 11:02 AM</span>
              </div>
            </div>

            {/* AI DISPLACEMENT SIGNAL */}
            <div style={S.dispSignal}>
              <div style={S.dispHdr}>
                <span style={S.dispPulse} />
                <span style={S.dispHdrLabel}>AI Displacement Signal</span>
              </div>
              <div style={S.dispBody}>
                Owner-user with {(l.buildingSF ?? 186400).toLocaleString()} SF in {l.market} approaching lease inflection. Broker intel confirms owner exploring exit options. <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Act within 30 days</span> before competing brokers identify this opportunity.
              </div>
            </div>

            {/* STAT ROW */}
            <div style={{ ...S.statRow, gridTemplateColumns: 'repeat(6,1fr)' }}>
              {[
                { lbl: 'Building SF', val: (l.buildingSF ?? 186400).toLocaleString(), sub: 'Dock-high' },
                { lbl: 'Market', val: l.market ?? 'SGV · Mid Valley', sub: 'Industrial', sm: true },
                { lbl: 'Lead Score', val: l.score ?? 95, sub: `Grade ${l.grade ?? 'A+'}`, rust: true },
                { lbl: 'Catalyst Count', val: l.catalystCount ?? 3, sub: 'Active signals', blue: true },
                { lbl: 'Owner Type', val: l.ownerType ?? 'Owner-User', sub: `Since ${l.ownerSince ?? '2009'}`, sm: true },
                { lbl: 'Last Contact', val: l.lastContact ?? 'Never', sub: 'No activity yet', sm: true },
              ].map((c, i) => (
                <div key={i} style={{ ...S.statCell, borderRight: i < 5 ? '1px solid var(--line2)' : 'none' }}>
                  <div style={S.statLbl}>{c.lbl}</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: c.rust ? 'var(--rust)' : c.blue ? 'var(--blue)' : 'var(--ink)', lineHeight: 1, fontSize: c.sm ? 16 : 22 }}>{c.val}</div>
                  <div style={S.statSub}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* SCORE CARD */}
            <div style={S.scoreCard}>
              <div style={S.scoreCardHdr} onClick={() => setSpecsOpen(o => !o)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={S.scRing}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, color: 'var(--rust)', lineHeight: 1 }}>{l.score ?? 95}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--rust)', marginTop: 1 }}>{l.grade ?? 'A+'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>Lead Score — {l.grade ?? 'A+'} · High displacement probability</div>
                    <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>Owner-user · {l.leaseExpiry ?? 'Aug 2027'} expiry · 186K SF · Broker intel</div>
                  </div>
                </div>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' }}>
                  {specsOpen ? 'Hide specs ▴' : 'Show all specs ▾'}
                </span>
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
                {[
                  { lbl: 'Bldg SF', val: '186,400', hi: true },
                  { lbl: 'Owner Type', val: 'Owner-User' },
                  { lbl: 'Lease Exp', val: 'Aug 2027', hi: true },
                  { lbl: 'Source', val: l.source ?? 'Broker Intel' },
                  { lbl: 'Catalysts', val: String(l.catalystCount ?? 3), hi: true },
                  { lbl: 'Market', val: 'SGV Mid Val' },
                  { lbl: 'Last Contact', val: l.lastContact ?? 'Never' },
                  { lbl: 'Owner Since', val: l.ownerSince ?? '2009' },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, padding: '9px 12px', borderRight: i < 7 ? '1px solid var(--line2)' : 'none', textAlign: 'center' }}>
                    <div style={{ fontSize: 9.5, color: 'var(--ink4)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>{s.lbl}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12.5, color: s.hi ? 'var(--rust)' : 'var(--ink2)' }}>{s.val}</div>
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

            {/* TIMELINE TAB BODY */}
            {activeTab === 'Timeline' && (
              <>
                <div style={S.bodyCols}>
                  {/* LEFT: Activity Timeline */}
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
                    <div style={S.tlMore} onClick={() => {}}><span style={S.tlMoreText}>View all 8 activities & notes →</span></div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* AI Displacement Signal sidebar */}
                    <div style={S.dispSide}>
                      <div style={S.dsSideHdr}><span style={S.dsSidePulse} /> AI Displacement Signal</div>
                      <div style={S.dsSideBody}>
                        Owner-user approaching lease inflection with confirmed broker interest. SGV industrial vacancy tight. <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Act within 30 days</span> before other brokers identify this site.
                      </div>
                    </div>

                    {/* Catalysts */}
                    <div style={S.card}>
                      <div style={S.spHdr}>Active Catalysts <span style={S.spHdrA} onClick={() => {}}>+ Add</span></div>
                      {MOCK_CATALYSTS.map((c, i) => (
                        <div key={i} style={{ ...S.catRow, borderBottom: i < MOCK_CATALYSTS.length - 1 ? '1px solid var(--line2)' : 'none' }}>
                          <span style={{ ...S.cat, background: CAT_BG[c.type], borderColor: CAT_BDR[c.type], color: CAT_COLOR[c.type] }}>{c.label}</span>
                          <span style={{ fontSize: 12.5, color: 'var(--ink3)', flex: 1 }}>{c.desc}</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: 'var(--ink4)' }}>{c.date}</span>
                        </div>
                      ))}
                    </div>

                    {/* Buyer Matches */}
                    <div style={S.card}>
                      <div style={S.spHdr}>✦ Buyer / Tenant Prospects</div>
                      {[
                        { name: 'Pacific Manufacturing Group', sub: 'Seeking 150–200K SF · IE West', pct: 94 },
                        { name: 'Matrix Logistics Partners', sub: '170–220K SF req · Ontario/Fontana', pct: 87 },
                      ].map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid var(--line2)', cursor: 'pointer', background: 'var(--blue-bg)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--blue-bg)'}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink2)' }}>{m.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 1 }}>{m.sub}</div>
                          </div>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: 'var(--blue)' }}>{m.pct}%</div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', cursor: 'pointer' }} onClick={() => {}}>Open →</span>
                        </div>
                      ))}
                    </div>

                    {/* Owner */}
                    <div style={S.card}>
                      <div style={S.spHdr}>Owner <span style={S.spHdrA} onClick={() => {}}>View Record →</span></div>
                      {[
                        ['Company', l.ownerName ?? 'Leegin Creative Leather Inc.'],
                        ['Type', l.ownerType ?? 'Owner-User'],
                        ['Contact', l.ownerContact ?? 'Bob Rosenthall'],
                        ['Owner Since', l.ownerSince ?? '2009'],
                      ].map(([k, v]) => (
                        <div key={k} style={S.spRow}>
                          <span style={S.spKey}>{k}</span>
                          <span style={{ fontSize: 13, color: k === 'Contact' ? 'var(--blue)' : 'var(--ink2)', cursor: k === 'Contact' ? 'pointer' : 'default' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FULL WIDTH: Owner + Contact cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
                  <div style={S.card}>
                    <div style={S.spHdr}><span>Owner Record</span><span style={S.spHdrA}>Edit →</span></div>
                    {[
                      ['Company', l.ownerName ?? 'Leegin Creative Leather Inc.'],
                      ['Contact', l.ownerContact ?? 'Bob Rosenthall'],
                      ['Owner Type', l.ownerType ?? 'Owner-User'],
                      ['Owner Since', l.ownerSince ?? '2009'],
                      ['Last Contact', l.lastContact ?? 'Never'],
                      ['Source', l.source ?? 'Broker Intel'],
                    ].map(([k, v]) => (
                      <div key={k} style={S.spRow}>
                        <span style={S.spKey}>{k}</span>
                        <span style={{ fontSize: 13, color: k === 'Contact' ? 'var(--blue)' : 'var(--ink2)', cursor: k === 'Contact' ? 'pointer' : 'default' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={S.card}>
                    <div style={S.spHdr}><span>Lead Details</span></div>
                    {[
                      ['Stage', 'New Lead'],
                      ['Source', l.source ?? 'Broker Intel'],
                      ['Market', l.market ?? 'SGV · Mid Valley'],
                      ['Building SF', (l.buildingSF ?? 186400).toLocaleString()],
                      ['Lease Expiry', l.leaseExpiry ?? 'Aug 2027'],
                      ['Owner Type', l.ownerType ?? 'Owner-User'],
                    ].map(([k, v]) => (
                      <div key={k} style={S.spRow}>
                        <span style={S.spKey}>{k}</span>
                        <span style={{ fontSize: 13, color: k === 'Stage' ? 'var(--blue)' : 'var(--ink2)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab !== 'Timeline' && <LeadTabContent tab={activeTab} l={l} onNavigate={onNavigate} />}

          </div>
        </div>
      </div>
    </div>
  );
}

function LeadTabContent({ tab, l, onNavigate }) {
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

  if (tab === 'APNs') return tbl(
    ['APN Number', 'Owner of Record', 'Land (Acres)', 'Assessed Value', 'Last Transfer', 'Zoning'],
    [
      ['8558-006-003', l.ownerName ?? 'Leegin Creative Leather', '4.8 ac', '$18.2M', '2009', 'M-2'],
      ['8558-006-004', l.ownerName ?? 'Leegin Creative Leather', '3.4 ac', '$12.8M', '2009', 'M-2'],
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
  if (tab === 'Contacts') return tbl(
    ['Name', 'Title', 'Company', 'Phone', 'Email'],
    [
      ['Bob Rosenthall', 'VP Real Estate', l.ownerName ?? 'Leegin Creative Leather', '(626) 555-0142', 'bob.r@leegin.com'],
      ['Sandra Wu', 'CFO', l.ownerName ?? 'Leegin Creative Leather', '(626) 555-0199', 's.wu@leegin.com'],
    ]
  );
  if (tab === 'Properties') return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--line2)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>{l.address ?? '14022 Nelson Ave E'}, {l.city ?? 'Baldwin Park'}</div>
        <button style={{ fontSize: 12, color: 'var(--blue)', background: 'none', border: '1px solid var(--blue-bdr)', borderRadius: 6, padding: '5px 11px', cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => {}}>View Property →</button>
      </div>
      {[
        ['Building SF', (l.buildingSF ?? 186400).toLocaleString()],
        ['Market', l.market ?? 'SGV · Mid Valley'],
        ['Owner Type', l.ownerType ?? 'Owner-User'],
        ['Year Built', '2001'],
        ['Clear Height', "32'"],
        ['Dock-High Doors', '24 DH · 4 GL'],
        ['APN', '8558-006-003'],
        ['Zoning', 'M-2'],
      ].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 18px', borderBottom: '1px solid var(--line2)' }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink4)' }}>{k}</span>
          <span style={{ fontSize: 13, color: 'var(--ink2)', fontFamily: "'DM Mono',monospace" }}>{v}</span>
        </div>
      ))}
    </div>
  );
  if (tab === 'Files') return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--line2)', overflow: 'hidden' }}>
      {[
        { name: `${l.company ?? 'Lead'}_Research_Brief.pdf`, type: 'PDF', size: '1.8 MB', uploaded: 'Mar 22, 2026' },
        { name: 'Owner_Contact_Notes.docx', type: 'Doc', size: '320 KB', uploaded: 'Mar 21, 2026' },
      ].map((f, i, arr) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--line2)' : 'none', gap: 12, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
          onClick={() => {}}>
          <span style={{ fontSize: 18 }}>📄</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>{f.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>{f.size} · {f.uploaded}</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--blue)' }}>↓ Download</span>
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

// ── STYLES ────────────────────────────────────────────────────
const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: 0, position: 'sticky', top: 0, zIndex: 5, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' },
  topbarInner: { maxWidth: 1700, width: '100%', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10 },
  bc: { fontSize: 13, color: 'var(--ink4)', display: 'flex', alignItems: 'center', gap: 4 },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', paddingBottom: 60 },
  hero: { height: 280, position: 'relative', overflow: 'hidden' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,8,5,0.82) 0%,rgba(10,8,5,0.15) 55%,transparent 100%)', pointerEvents: 'none', zIndex: 400 },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, padding: '20px 28px' },
  heroTitle: { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-0.01em', marginBottom: 8, textShadow: '0 2px 8px rgba(0,0,0,0.5)' },
  heroBadges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  hbRust: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(184,55,20,0.30)', borderColor: 'rgba(220,100,70,0.45)', color: '#FFCBB8' },
  hbBlue: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(78,110,150,0.30)', borderColor: 'rgba(137,168,198,0.45)', color: '#C8E0F8' },
  hbAmber: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(140,90,4,0.30)', borderColor: 'rgba(220,160,50,0.45)', color: '#FFE0A0' },
  hbGreen: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(21,102,54,0.30)', borderColor: 'rgba(60,180,110,0.45)', color: '#B8F0D0' },
  actionBar: { background: 'var(--bg2)', borderBottom: '1px solid var(--line)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  scoreChip: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', background: 'var(--card)', border: '1px solid var(--rust-bdr)', borderRadius: 8, marginRight: 6, flexShrink: 0 },
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
  dispSignal: { background: 'var(--rust-bg)', border: '1px solid var(--rust-bdr)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 16, position: 'relative', borderLeft: '3px solid var(--rust)' },
  dispHdr: { padding: '10px 16px 10px 20px', borderBottom: '1px solid var(--rust-bdr)', display: 'flex', alignItems: 'center', gap: 7 },
  dispPulse: { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--rust)', flexShrink: 0 },
  dispHdrLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--rust)' },
  dispBody: { padding: '13px 16px 13px 20px', fontSize: 13.5, lineHeight: 1.72, color: 'var(--ink2)' },
  statRow: { display: 'grid', background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden', marginBottom: 16 },
  statCell: { padding: '13px 14px' },
  statLbl: { fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 5 },
  statSub: { fontSize: 11, color: 'var(--ink4)', marginTop: 2 },
  scoreCard: { background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden', marginBottom: 16 },
  scoreCardHdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', borderBottom: '1px solid var(--line)', cursor: 'pointer' },
  scRing: { width: 50, height: 50, borderRadius: '50%', border: '2.5px solid rgba(184,55,20,0.32)', background: 'var(--rust-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tabsNav: { display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 16 },
  tabItem: { padding: '10px 15px', fontSize: 13.5, color: 'var(--ink4)', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' },
  tabActive: { color: 'var(--blue)', borderBottomColor: 'var(--blue)', fontWeight: 500 },
  bodyCols: { display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16 },
  card: { background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden' },
  cardHdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--line)' },
  cardTitle: { fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 6 },
  cardAction: { fontFamily: "'Cormorant Garamond',serif", fontSize: 13.5, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' },
  liveDot: { display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--rust)' },
  actRow: { display: 'flex', gap: 12, padding: '11px 16px' },
  actIcon: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, flexShrink: 0, marginTop: 1 },
  actText: { fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.4 },
  actMeta: { fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 2 },
  actDate: { fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: 'var(--ink4)', flexShrink: 0, paddingTop: 2 },
  tlMore: { padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg)', borderTop: '1px solid var(--line)' },
  tlMoreText: { fontFamily: "'Cormorant Garamond',serif", fontSize: 13.5, fontStyle: 'italic', color: 'var(--blue2)' },
  dispSide: { background: 'var(--rust-bg)', border: '1px solid var(--rust-bdr)', borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative', borderLeft: '3px solid var(--rust)' },
  dsSideHdr: { padding: '10px 14px 10px 18px', borderBottom: '1px solid var(--rust-bdr)', fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--rust)', display: 'flex', alignItems: 'center', gap: 7 },
  dsSidePulse: { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--rust)', flexShrink: 0 },
  dsSideBody: { padding: '13px 14px 13px 18px', fontSize: 13, lineHeight: 1.70, color: 'var(--ink2)' },
  catRow: { display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', cursor: 'pointer' },
  cat: { display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', flexShrink: 0 },
  spHdr: { padding: '10px 16px', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  spHdrA: { fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer', fontWeight: 400, letterSpacing: 0, textTransform: 'none' },
  spRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 16px', borderBottom: '1px solid var(--line2)' },
  spKey: { fontSize: 12.5, color: 'var(--ink4)' },
};
