'use client';
import { useState, useEffect, useRef } from 'react';

const STAGES = ['Tracking','Underwriting','Off-Market Outreach','LOI','LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won'];
const TABS = ['Timeline','Underwriting','Property','Contacts','Comps','Files'];

// ── Quick UW model (runs client-side, no server needed) ─────
function runModel(inputs) {
  const price = parseFloat(inputs.price.replace(/[$,]/g,'')) || 0;
  const rent = parseFloat(inputs.rent.replace(/[$,]/g,'')) || 0;
  const sf = parseFloat(inputs.sf.replace(/,/g,'')) || 0;
  const exitCap = parseFloat(inputs.exitCap) / 100 || 0.0525;
  const ltv = parseFloat(inputs.ltv) / 100 || 0.65;
  const rate = parseFloat(inputs.rate) / 100 || 0.065;
  const bumps = parseFloat(inputs.bumps) / 100 || 0.03;
  const hold = parseInt(inputs.hold) || 5;

  const noi0 = rent * sf * 12;
  const goingInCap = price > 0 ? (noi0 / price * 100).toFixed(2) + '%' : '—';

  // NOI with bumps
  let noiArr = [];
  for (let y = 1; y <= hold; y++) noiArr.push(noi0 * Math.pow(1 + bumps, y - 1));

  // Debt service
  const loan = price * ltv;
  const monthly = loan * (rate / 12) / (1 - Math.pow(1 + rate / 12, -360));
  const ds = monthly * 12;
  const dscr = ds > 0 ? (noiArr[0] / ds).toFixed(2) + '×' : '—';

  // Exit value
  const exitNOI = noi0 * Math.pow(1 + bumps, hold);
  const exitValue = exitCap > 0 ? exitNOI / exitCap : 0;
  const equity = price * (1 - ltv);

  // Unlevered IRR (simplified: NPV = 0)
  const cfUnlev = [-price, ...noiArr.slice(0,-1), noiArr[noiArr.length-1] + exitValue];
  const unlev = approximateIRR(cfUnlev);

  // Levered IRR
  const cfLev = [-(price - loan), ...noiArr.slice(0,-1).map(n => n - ds), noiArr[noiArr.length-1] - ds + exitValue - loan];
  const lev = approximateIRR(cfLev);

  const em = equity > 0 ? ((cfLev.slice(1).reduce((a,b)=>a+b,0) + equity) / equity).toFixed(2) + '×' : '—';

  return {
    goingInCap,
    unlevered: unlev ? (unlev * 100).toFixed(1) + '%' : '—',
    levered: lev ? (lev * 100).toFixed(1) + '%' : '—',
    equityMultiple: em,
    dscr,
    rating: lev > 0.16 ? 'good' : lev > 0.12 ? 'ok' : 'warn',
  };
}

function approximateIRR(cashflows) {
  let lo = -0.5, hi = 5.0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const npv = cashflows.reduce((s, c, t) => s + c / Math.pow(1 + mid, t), 0);
    if (Math.abs(npv) < 0.01) return mid;
    if (npv > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Build sensitivity grid
function buildSensGrid(baseInputs, exitCaps, rentGrowths) {
  return exitCaps.map(cap => ({
    cap,
    cells: rentGrowths.map(rg => {
      const res = runModel({ ...baseInputs, exitCap: String(cap), bumps: String(rg) });
      return { val: res.levered, rating: res.rating };
    }),
  }));
}

export default function DealDetail({ deal, onBack }) {
  const [activeTab, setActiveTab] = useState('Timeline');
  const [uwView, setUWView] = useState('quick'); // 'quick' | 'dashboard'
  const [synthOpen, setSynthOpen] = useState(false);
  const [logPanel, setLogPanel] = useState(null);
  const [logText, setLogText] = useState('');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const d = deal ?? MOCK_DEAL;

  const [inputs, setInputs] = useState({
    price: d.price ?? '$47,500,000',
    sf: d.sf ?? '312,000',
    rent: d.inPlaceRent ?? '$0.82',
    marketRent: d.marketRent ?? '$0.98',
    exitCap: '5.25',
    ltv: '65',
    rate: '6.50',
    bumps: '3.0',
    hold: '5',
  });
  const [results, setResults] = useState(() => runModel({
    price: '$47,500,000', sf: '312,000', rent: '$0.82',
    marketRent: '$0.98', exitCap: '5.25', ltv: '65', rate: '6.50', bumps: '3.0', hold: '5',
  }));
  const [running, setRunning] = useState(false);

  const EXIT_CAPS = [4.50, 4.75, 5.00, 5.25, 5.50, 5.75];
  const RENT_GROWTHS = [2.0, 2.5, 3.0, 3.5, 4.0];
  const sensGrid = buildSensGrid(inputs, EXIT_CAPS, RENT_GROWTHS);

  function handleRun() {
    setRunning(true);
    setTimeout(() => { setResults(runModel(inputs)); setRunning(false); }, 350);
  }

  // Leaflet map
  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return;
    import('leaflet').then(L => {
      L = L.default;
      const map = L.map(mapRef.current, {
        center: [d.lat ?? 34.0058, d.lng ?? -117.9775],
        zoom: 16, zoomControl: false, scrollWheelZoom: false,
        dragging: false, doubleClickZoom: false, attributionControl: false,
      });
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20 }).addTo(map);
      const icon = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;border-radius:50%;background:#6480A2;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>', iconSize: [14,14], iconAnchor: [7,7] });
      L.marker([d.lat ?? 34.0058, d.lng ?? -117.9775], { icon }).addTo(map);
      mapInstanceRef.current = map;
    });
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  const activeStageIdx = STAGES.indexOf(d.stage ?? 'LOI');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <div style={S.topbarInner}>
          <div style={S.bc}>
            <span style={{ cursor: 'pointer', color: 'var(--ink4)' }} onClick={onBack}>Deal Pipeline</span>
            <span style={{ opacity: .4, margin: '0 4px' }}>›</span>
            <span style={{ color: 'var(--ink2)', fontWeight: 500 }}>{d.name}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button style={S.btnGhost} onClick={() => alert('Edit deal — Supabase form coming soon')}>⚙ Edit</button>
            <button style={S.btnGhost} onClick={() => setLogPanel(logPanel === 'note' ? null : 'note')}>+ Activity</button>
            <button style={S.btnGhost} onClick={() => window.print()}>↓ Export BOV</button>
            <button style={S.btnBlue} onClick={() => alert('Advance Stage — moves deal to next stage in pipeline')}>Advance Stage →</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* HERO */}
          <div style={S.hero}>
            <div ref={mapRef} style={{ width: '100%', height: 260 }} />
            <div style={S.heroOverlay} />
            <div style={S.heroContent}>
              <div style={S.heroTitle}>{d.name}</div>
              <div style={S.heroBadges}>
                <span style={S.hbAmber}>{d.stage ?? 'LOI'} Stage</span>
                <span style={S.hbGreen}>{d.probability ?? 81}% Close Probability</span>
                <span style={S.hbBlue}>{d.dealType ?? 'SLB'} · {d.price ?? '$47.5M'}</span>
                <span style={S.hbBlue}>{d.sf ?? '312K'} SF · {d.market ?? 'SGV'}</span>
              </div>
            </div>
          </div>

          {/* ACTION BAR */}
          <div style={S.actionBar}>
            <button style={S.btnGhost} onClick={() => setLogPanel(logPanel === 'call' ? null : 'call')}>📞 Log Call</button>
            <button style={S.btnGhost} onClick={() => setLogPanel(logPanel === 'email' ? null : 'email')}>✉ Log Email</button>
            <button style={S.btnGhost} onClick={() => setLogPanel(logPanel === 'note' ? null : 'note')}>📝 Add Note</button>
            <div style={S.abSep} />
            <button style={S.btnLink} onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent((d.address ?? '4900 Workman Mill Rd') + ' City of Industry CA')}`)}>📍 Google Maps</button>
            <button style={S.btnLink} onClick={() => window.open('https://www.costar.com/search/industrial')}>🗂 CoStar</button>
            <button style={S.btnLink} onClick={() => window.open('https://assessor.lacounty.gov/')}>🗺 LA County GIS</button>
            <div style={S.abSep} />
            <button style={S.btnGhost} onClick={() => window.print()}>↓ Export Memo</button>
            <button style={S.btnGhost} onClick={() => alert('Run Comps — pulls sale/lease comps for this submarket')}>📊 Run Comps</button>
            <div style={{ marginLeft: 'auto' }} />
            <button style={S.btnGreen} onClick={() => alert('Advance to PSA — moves deal to PSA Negotiation stage')}>Advance to PSA →</button>
          </div>

          {/* LOG PANEL */}
          {logPanel && (
            <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)', padding: '14px 28px', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>
                  {logPanel === 'call' ? 'Log Call' : logPanel === 'email' ? 'Log Email' : 'Add Note'}
                </div>
                <textarea value={logText} onChange={e => setLogText(e.target.value)}
                  placeholder={`Notes for ${logPanel}...`}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 7, fontFamily: 'inherit', fontSize: 13, color: 'var(--ink2)', background: 'var(--bg)', outline: 'none', resize: 'vertical', minHeight: 72 }} />
              </div>
              <button style={S.btnGhost} onClick={() => { setLogPanel(null); setLogText(''); }}>Cancel</button>
              <button style={S.btnBlue} onClick={() => { setLogPanel(null); setLogText(''); }}>Save</button>
            </div>
          )}

          {/* STAGE BREADCRUMB */}
          <div style={S.stageTrackWrap}>
            <div style={{ display: 'flex', overflowX: 'auto' }}>
              {STAGES.map((stage, i) => (
                <div key={stage} style={{
                  ...S.stageCrumb,
                  ...(i === activeStageIdx ? S.stageCrumbActive : {}),
                  ...(i < activeStageIdx ? S.stageCrumbDone : {}),
                }}>
                  {stage}
                </div>
              ))}
            </div>
          </div>

          <div style={S.inner}>
            {/* DEAL KPIs */}
            <div style={S.dealKpis}>
              {[
                { lbl: 'Deal Value', val: d.price ?? '$47.5M', sub: 'SLB structure' },
                { lbl: 'Commission Est.', val: d.commission ?? '$570K', sub: '1.2% both sides', green: true },
                { lbl: 'Close Probability', val: (d.probability ?? 81) + '%', sub: 'Updated Mar 22', blue: true },
                { lbl: 'Deal Type', val: d.dealType ?? 'Sale-Leaseback', sub: 'Owner-user seller', sm: true },
                { lbl: 'Target Close', val: d.closeDate ?? 'Jun 2026', sub: '~90 days out', amber: true },
              ].map((k, i) => (
                <div key={i} style={{ ...S.dk, borderRight: i < 4 ? '1px solid var(--line2)' : 'none' }}>
                  <div style={S.dkLbl}>{k.lbl}</div>
                  <div style={{ ...S.dkVal, color: k.green ? 'var(--green)' : k.blue ? 'var(--blue)' : k.amber ? 'var(--amber)' : 'var(--ink)', fontSize: k.sm ? 18 : 26, fontWeight: k.sm ? 400 : 700 }}>{k.val}</div>
                  <div style={S.dkSub}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* TABS */}
            <div style={S.tabsNav}>
              {TABS.map(t => (
                <div key={t} style={{ ...S.tabItem, ...(activeTab === t ? S.tabActive : {}) }} onClick={() => setActiveTab(t)}>{t}</div>
              ))}
            </div>

            {/* ── TIMELINE TAB ── */}
            {activeTab === 'Timeline' && (
              <div style={S.bodyCols}>
                <div style={S.card}>
                  <div style={S.cardHdr}><div style={S.cardTitle}><span style={S.liveDot} />Activity Timeline</div><span style={S.cardAction} onClick={() => setLogPanel(logPanel === 'note' ? null : 'note')}>+ Log Activity</span></div>
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
                  <div style={S.tlMore}><span style={S.tlMoreText}>View all 14 activities →</span></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Probability */}
                  <div style={{ ...S.card, border: '1px solid var(--green-bdr)' }}>
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 8 }}>Close Probability</div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 52, fontWeight: 700, color: 'var(--green)', lineHeight: 1, letterSpacing: '-0.03em' }}>{d.probability ?? 81}%</div>
                      <div style={{ height: 5, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden', margin: '10px 0' }}>
                        <div style={{ height: '100%', width: `${d.probability ?? 81}%`, borderRadius: 3, background: 'linear-gradient(90deg,var(--blue2),var(--green))' }} />
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.55 }}>LOI submitted, counter received. Owner motivated, asset unencumbered.</div>
                    </div>
                  </div>
                  {/* Deal details */}
                  <div style={S.card}>
                    <div style={S.spHdr}><span>Deal Details</span><span style={S.spHdrA} onClick={() => alert('Edit deal details — form coming soon')}>Edit</span></div>
                    {[
                      ['Deal Type', d.dealType ?? 'Sale-Leaseback'],
                      ['Stage', d.stage ?? 'LOI'],
                      ['Tenant', d.tenant ?? 'Pacific Manufacturing'],
                      ['Lease Term', '12-year initial'],
                      ['Rent Bumps', '3% annual'],
                      ['Owner', d.owner ?? 'RJ Neu Properties'],
                    ].map(([k,v]) => (
                      <div key={k} style={{ ...S.spRow, borderBottom: '1px solid var(--line2)' }}>
                        <span style={S.spKey}>{k}</span>
                        <span style={{ fontSize: 13, color: k === 'Stage' ? 'var(--blue)' : 'var(--ink2)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {/* Memo */}
                  <div style={S.memoCard}>
                    <div style={S.memoHdr}>Opportunity Memo</div>
                    <div style={S.memoBody}>Owner-user exploring liquidity via <strong style={{ color: 'var(--blue)' }}>sale-leaseback</strong> — Pacific Mfg leases back at market. <strong style={{ color: 'var(--blue)' }}>Unencumbered asset</strong>, off-market preference creates exclusive window.</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── UNDERWRITING TAB ── */}
            {activeTab === 'Underwriting' && (
              <div>
                {/* Toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {['quick','dashboard'].map(v => (
                    <button key={v} style={{ ...S.uwToggle, ...(uwView === v ? S.uwToggleActive : {}) }} onClick={() => setUWView(v)}>
                      {v === 'quick' ? 'Quick Underwrite' : 'Returns Dashboard'}
                    </button>
                  ))}
                </div>

                {/* ── QUICK UNDERWRITE ── */}
                {uwView === 'quick' && (
                  <div style={{ ...S.card, borderLeft: '3px solid var(--blue2)', marginBottom: 16 }}>
                    <div style={{ padding: '12px 18px 12px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>Quick Underwrite — {inputs.hold}-Year Hold Model</div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--ink4)' }}>Values auto-populated · adjust and run</div>
                    </div>
                    {/* Input grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '16px 22px' }}>
                      {[
                        { key: 'price', lbl: 'Asking Price', note: '~$152/SF on 312K SF' },
                        { key: 'rent', lbl: 'In-Place Rent (NNN/SF/mo)', note: 'From property record' },
                        { key: 'marketRent', lbl: 'Market Rent (NNN/SF/mo)', note: 'SGV comp range' },
                        { key: 'bumps', lbl: 'Annual Rent Bumps', note: '%' },
                        { key: 'exitCap', lbl: 'Exit Cap Rate', note: '%' },
                        { key: 'ltv', lbl: 'LTV', note: '%' },
                        { key: 'rate', lbl: 'Interest Rate', note: '%' },
                        { key: 'hold', lbl: 'Hold Period (years)', note: '' },
                        { key: 'sf', lbl: 'Building SF', note: 'From property record' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'block', marginBottom: 5 }}>{f.lbl}</label>
                          <input
                            value={inputs[f.key]}
                            onChange={e => setInputs(prev => ({ ...prev, [f.key]: e.target.value }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1px solid var(--line)', borderRadius: 7, fontFamily: 'inherit', fontSize: 14, color: 'var(--ink2)', background: 'var(--bg)', outline: 'none' }}
                          />
                          {f.note && <div style={{ fontSize: 12, color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', marginTop: 3 }}>{f.note}</div>}
                        </div>
                      ))}
                    </div>
                    {/* Results */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: 'var(--bg2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
                      {[
                        { lbl: 'Going-In Cap', val: results.goingInCap, color: 'var(--blue)' },
                        { lbl: 'Unlevered IRR', val: results.unlevered, color: 'var(--green)' },
                        { lbl: 'Levered IRR', val: results.levered, color: 'var(--green)' },
                        { lbl: 'Equity Multiple', val: results.equityMultiple, color: 'var(--green)' },
                        { lbl: 'DSCR Yr 1', val: results.dscr, color: 'var(--blue)' },
                      ].map((m, i) => (
                        <div key={i} style={{ padding: '14px 16px', borderRight: i < 4 ? '1px solid var(--line)' : 'none' }}>
                          <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', display: 'block', marginBottom: 6 }}>{m.lbl}</label>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, lineHeight: 1, color: m.color, opacity: running ? 0.3 : 1, transition: 'opacity 0.35s' }}>{m.val}</div>
                        </div>
                      ))}
                    </div>
                    {/* Actions */}
                    <div style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button style={S.uwRun} onClick={handleRun}>{running ? '⟳ Running…' : '▶ Run / Update'}</button>
                      <button style={S.uwExcel} onClick={() => alert('Generates full multi-sheet Excel model via sgv-ie-finance skill')}>↓ Export Full Excel Model</button>
                      <button style={{ ...S.btnGhost, marginLeft: 'auto', fontSize: 12 }} onClick={() => setUWView('dashboard')}>View Returns Dashboard →</button>
                    </div>
                  </div>
                )}

                {/* ── RETURNS DASHBOARD ── */}
                {uwView === 'dashboard' && (
                  <div>
                    <div style={{ ...S.card, marginBottom: 16 }}>
                      <div style={{ ...S.cardHdr }}>
                        <div style={S.cardTitle}>Returns Summary — {inputs.hold}-Year Hold</div>
                        <button style={S.uwExcel}>↓ Export Excel</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
                        {[
                          { lbl: 'Unlevered IRR', val: results.unlevered, sub: 'Exceeds 10% hurdle', color: 'var(--green)' },
                          { lbl: 'Levered IRR', val: results.levered, sub: `${inputs.ltv}% LTV · ${inputs.rate}% rate`, color: 'var(--green)' },
                          { lbl: 'Equity Multiple', val: results.equityMultiple, sub: 'On invested equity', color: 'var(--blue)' },
                          { lbl: 'DSCR Year 1', val: results.dscr, sub: 'Min 1.20× required', color: 'var(--blue)' },
                        ].map((m, i) => (
                          <div key={i} style={{ padding: '18px 20px', borderRight: i < 3 ? '1px solid var(--line2)' : 'none', textAlign: 'center' }}>
                            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 8 }}>{m.lbl}</div>
                            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 34, fontWeight: 700, color: m.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{m.val}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 5 }}>{m.sub}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sensitivity grid */}
                    <div style={S.card}>
                      <div style={S.cardHdr}><div style={S.cardTitle}>IRR Sensitivity — Exit Cap Rate vs. Rent Growth (Levered IRR)</div></div>
                      <div style={{ padding: '16px 18px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={S.sensHdr}>Exit Cap \ Rent Growth</th>
                              {RENT_GROWTHS.map(rg => <th key={rg} style={S.sensHdr}>{rg.toFixed(1)}%</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {sensGrid.map(row => (
                              <tr key={row.cap}>
                                <td style={{ ...S.sensTd, fontWeight: 600, color: 'var(--ink3)', background: 'var(--bg2)' }}>{row.cap.toFixed(2)}%</td>
                                {row.cells.map((cell, ci) => {
                                  const isBase = row.cap === 5.25 && RENT_GROWTHS[ci] === 3.0;
                                  const bg = isBase ? 'rgba(78,110,150,0.14)' : cell.rating === 'good' ? 'rgba(21,102,54,0.08)' : cell.rating === 'ok' ? 'rgba(78,110,150,0.07)' : 'rgba(140,90,4,0.07)';
                                  const color = isBase ? 'var(--blue)' : cell.rating === 'good' ? 'var(--green)' : cell.rating === 'ok' ? 'var(--blue)' : 'var(--amber)';
                                  return <td key={ci} style={{ ...S.sensTd, background: bg, color, fontWeight: isBase ? 700 : 500 }}>{cell.val}</td>;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--ink4)', fontFamily: 'inherit' }}>
                          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(21,102,54,0.12)', borderRadius: 2, marginRight: 4 }} />≥ 16% IRR</span>
                          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(78,110,150,0.10)', borderRadius: 2, marginRight: 4 }} />12–16%</span>
                          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(140,90,4,0.09)', borderRadius: 2, marginRight: 4 }} />&lt; 12%</span>
                          <span style={{ marginLeft: 'auto', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic' }}>Base case highlighted in blue</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab !== 'Timeline' && activeTab !== 'Underwriting' && (
              <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--line2)', padding: '48px 32px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: 'var(--ink2)', marginBottom: 8 }}>{activeTab}</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontStyle: 'italic', color: 'var(--ink4)', marginBottom: 20 }}>This tab connects to live Supabase data — coming soon</div>
                <button style={{ ...S.btnGhost, margin: '0 auto' }} onClick={() => setActiveTab('Timeline')}>← Back to Timeline</button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: 0, position: 'sticky', top: 0, zIndex: 5 },
  topbarInner: { maxWidth: 1700, width: '100%', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10 },
  bc: { fontSize: 13, color: 'var(--ink4)', display: 'flex', alignItems: 'center', gap: 4 },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', paddingBottom: 60 },
  hero: { height: 260, position: 'relative', overflow: 'hidden' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,8,5,0.82) 0%,rgba(10,8,5,0.1) 50%,transparent 100%)', pointerEvents: 'none', zIndex: 400 },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, padding: '20px 28px' },
  heroTitle: { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: 7 },
  heroBadges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  hbAmber: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(140,90,4,0.30)', borderColor: 'rgba(220,160,50,0.45)', color: '#FFE0A0' },
  hbGreen: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(21,102,54,0.30)', borderColor: 'rgba(60,180,110,0.45)', color: '#B8F0D0' },
  hbBlue: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid', backdropFilter: 'blur(6px)', background: 'rgba(78,110,150,0.30)', borderColor: 'rgba(137,168,198,0.45)', color: '#C8E0F8' },
  actionBar: { background: 'var(--bg2)', borderBottom: '1px solid var(--line)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  abSep: { width: 1, height: 22, background: 'var(--line)', margin: '0 3px' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  btnBlue: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontFamily: 'inherit' },
  btnGreen: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--green)', background: 'var(--green)', color: '#fff', fontFamily: 'inherit' },
  btnLink: { background: 'none', border: 'none', color: 'var(--blue2)', fontSize: 12.5, padding: '7px 10px', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(100,128,162,0.3)', fontFamily: 'inherit' },
  stageTrackWrap: { background: 'var(--card)', borderBottom: '1px solid var(--line)', padding: '0 28px' },
  stageCrumb: { padding: '10px 14px', fontSize: 12.5, fontWeight: 400, color: 'var(--ink4)', cursor: 'pointer', borderBottom: '2px solid transparent', whiteSpace: 'nowrap', position: 'relative' },
  stageCrumbActive: { color: 'var(--blue)', borderBottomColor: 'var(--blue2)', fontWeight: 600 },
  stageCrumbDone: { color: 'var(--ink3)' },
  inner: { padding: '18px 28px 0' },
  dealKpis: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden', marginBottom: 16 },
  dk: { padding: '16px 18px' },
  dkLbl: { fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 6 },
  dkVal: { fontFamily: "'Playfair Display',serif", lineHeight: 1, letterSpacing: '-0.02em' },
  dkSub: { fontSize: 11.5, color: 'var(--ink4)', marginTop: 3 },
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
  spHdr: { padding: '10px 16px', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  spHdrA: { fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer', fontWeight: 400, letterSpacing: 0, textTransform: 'none' },
  spRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px' },
  spKey: { fontSize: 12.5, color: 'var(--ink4)' },
  memoCard: { background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  memoHdr: { padding: '10px 16px', background: 'rgba(78,110,150,0.12)', borderBottom: '1px solid var(--blue-bdr)', fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)' },
  memoBody: { padding: '13px 16px', fontSize: 13.5, lineHeight: 1.72, color: 'var(--ink2)' },
  uwToggle: { padding: '8px 18px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' },
  uwToggleActive: { background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)' },
  uwRun: { padding: '9px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  uwExcel: { padding: '9px 16px', background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-bdr)', borderRadius: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  sensHdr: { padding: '7px 10px', background: 'var(--bg2)', border: '1px solid var(--line)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink3)', textAlign: 'center' },
  sensTd: { padding: '7px 10px', border: '1px solid var(--line2)', textAlign: 'center' },
};

const ICON_BG = { call: 'var(--blue-bg)', note: 'var(--amber-bg)', uw: 'var(--purple-bg)', deal: 'var(--green-bg)', email: 'var(--purple-bg)' };
const ICON_COLOR = { call: 'var(--blue)', note: 'var(--amber)', uw: 'var(--purple)', deal: 'var(--green)', email: 'var(--purple)' };
const ICON_EMOJI = { call: '📞', note: '📝', uw: '📊', deal: '◈', email: '✉' };

const MOCK_DEAL = {
  name: 'Pacific Manufacturing · 4900 Workman Mill Rd',
  lat: 34.0058, lng: -117.9775,
  price: '$47.5M', sf: '312,000',
  commission: '$570K', probability: 81,
  dealType: 'Sale-Leaseback', stage: 'LOI',
  market: 'SGV', closeDate: 'Jun 2026',
  tenant: 'Pacific Manufacturing', owner: 'RJ Neu Properties',
  inPlaceRent: '$0.82', marketRent: '$0.98',
};

const MOCK_ACTIVITIES = [
  { type: 'call', text: '<strong>Called James Okura (EVP Ops)</strong> — LOI counter at $46M vs our $47.5M ask. Recommend accepting to push to PSA.', meta: 'Briana Corso · 18 min call', date: 'Mar 22' },
  { type: 'uw', text: '<strong>LOI Submitted</strong> — $47.5M · 12-year leaseback · 3% annual bumps. Sent to owner counsel.', meta: 'Briana Corso', date: 'Mar 18' },
  { type: 'uw', text: '<strong>Underwriting completed</strong> — Going-in cap 4.87%, unlevered IRR 12.4%, levered IRR 18.6%, equity multiple 2.1×.', meta: 'Briana Corso · Excel model v3', date: 'Mar 14' },
  { type: 'call', text: '<strong>Called RJ Neu (owner)</strong> — Confirmed unencumbered asset, off-market preference, SLB structure receptive.', meta: 'Briana Corso · 22 min', date: 'Mar 10' },
];
