'use client';
import { useState } from 'react';

export default function WarnIntel({ filings = MOCK_FILINGS, onCreateLead }) {
  const [search, setSearch] = useState('');
  const filtered = filings.filter(f =>
    !search || f.company.toLowerCase().includes(search.toLowerCase()) || f.addr.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink2)' }}>WARN Intel</span>
        <div style={S.livePill}><span style={S.liveDot} />LIVE FEED</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={S.searchWrap}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#6E6860" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="#6E6860" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search filings…" style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink2)', width: '100%' }} />
          </div>
          <button style={S.btnGhost}>Export CSV</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* PAGE HEADER */}
        <div style={S.pageHeader}>
          <div style={{ padding: '22px 28px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={S.pageTitle}>WARN <em style={S.pageTitleEm}>Intel</em></div>
              <div style={S.pageSub}>Worker Adjustment & Retraining Notification filings · SGV / IE industrial</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 20, background: 'var(--rust-bg)', border: '1px solid var(--rust-bdr)', fontSize: 12, fontWeight: 600, color: 'var(--rust)' }}>4 New Filings This Week</span>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 6 }}>The edge is in the data.</div>
            </div>
          </div>
        </div>

        {/* AI SIGNAL */}
        <div style={S.signalStrip}>
          <span style={S.sigPulse} />
          <span style={S.sigTag}>Intelligence</span>
          <div style={S.sigSep} />
          <div style={S.sigText}>
            <strong style={{ color: 'var(--rust)' }}>Teledyne at 16830 Chestnut St</strong> is your highest-priority filing — 287 workers, no broker appointed as of 3/21, Cabot REIT owner. IE West vacancy sub-3%. <strong style={{ color: 'var(--rust)' }}>Act within 48 hours</strong> before the listing hits Loopnet.
          </div>
        </div>

        {/* STATS */}
        <div style={S.statsStrip}>
          {[
            { lbl: 'New This Week', val: 4, rust: true },
            { lbl: 'Total Workers', val: '1,842', rust: true },
            { lbl: 'Matched to Properties', val: 6, blue: true },
            { lbl: 'Uncontacted', val: 3 },
            { lbl: 'Converted to Lead', val: 2 },
          ].map((s, i) => (
            <div key={i} style={{ ...S.stat, borderRight: i < 4 ? '1px solid var(--line)' : 'none' }}>
              <div style={S.statLbl}>{s.lbl}</div>
              <div style={{ ...S.statVal, color: s.rust ? 'var(--rust)' : s.blue ? 'var(--blue)' : 'var(--ink)' }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* TWO-COL */}
        <div style={S.twoCol}>
          {/* FEED */}
          <div style={{ borderRight: '1px solid var(--line)', paddingRight: 0 }}>
            <div style={S.feedHead}>
              <span style={S.feedTitle}><span style={S.liveDot} />Recent Filings</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)' }}>{filtered.length} filings</span>
            </div>
            {filtered.map((f, i) => (
              <WarnCard key={f.id ?? i} filing={f} onCreateLead={() => onCreateLead?.(f)} />
            ))}
          </div>

          {/* RIGHT PANEL */}
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={S.rpCard}>
              <div style={S.rpHdr}>Filings by County</div>
              <div style={{ padding: '10px 14px' }}>
                {[['Los Angeles County', 18], ['San Bernardino County', 9], ['Riverside County', 4]].map(([name, ct]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--line2)', borderRadius: 6, marginBottom: 6, cursor: 'pointer' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink2)' }}>{name}</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: 'var(--rust)' }}>{ct}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={S.rpCard}>
              <div style={S.rpHdr}>This Month</div>
              <div style={{ padding: '10px 14px' }}>
                {[['Total Filings', '31'], ['Total Workers', '1,842'], ['Industrial Match Rate', '61%'], ['Avg SF per Filing', '86K']].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid var(--line3)' }}>
                    <span style={{ fontSize: 13, color: 'var(--ink3)' }}>{l}</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={S.rpCard}>
              <div style={S.rpHdr}>Recent Conversions</div>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[{ name: 'Acromill LLC', detail: '42K SF · IE South', path: 'WARN → Lead in 2 days' }, { name: 'Tireco Inc.', detail: '286K SF · IE West', path: 'WARN → Property → Deal' }].map(c => (
                  <div key={c.name}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)' }}>{c.name} <span style={{ fontWeight: 400, color: 'var(--ink4)', fontSize: 12 }}>— {c.detail}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>{c.path}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarnCard({ filing: f, onCreateLead }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ ...S.warnCard, ...(f.isNew ? S.warnCardNew : {}), background: hover ? 'var(--bg)' : (f.isNew ? '#FFF8F5' : 'var(--card)') }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {f.isNew && <span style={{ position: 'absolute', top: 18, right: 20, fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.3em', color: 'var(--rust)', opacity: 0.7, textTransform: 'uppercase' }}>NEW</span>}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink2)', lineHeight: 1.3 }}>{f.company}</div>
          <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 3 }}>{f.addr}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: 'var(--rust)', lineHeight: 1, letterSpacing: '-0.02em' }}>{f.workers.toLocaleString()}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 600, color: 'var(--rust)', letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 2 }}>workers</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12.5, fontWeight: 500, color: 'var(--ink2)' }}>{f.sf}</span>
        <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, border: '1px solid', background: f.closureType === 'Permanent Closure' ? 'var(--rust-bg)' : 'var(--amber-bg)', borderColor: f.closureType === 'Permanent Closure' ? 'var(--rust-bdr)' : 'var(--amber-bdr)', color: f.closureType === 'Permanent Closure' ? 'var(--rust)' : 'var(--amber)' }}>{f.closureType}</span>
        <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, border: '1px solid var(--blue-bdr)', background: 'var(--blue-bg)', color: 'var(--blue)' }}>{f.submarket}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)' }}>Filed {f.filed}</span>
      </div>
      {/* Opportunity match */}
      {f.matches?.length > 0 ? (
        <div style={S.oppMatch}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 8 }}>✦ Opportunity Match — Buyer / Tenant Prospects</div>
          {f.matches.map((m, i) => (
            <div key={i} style={S.omMatch}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink2)' }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 1 }}>{m.sub}</div>
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: 'var(--blue)', flexShrink: 0 }}>{m.pct}%</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', whiteSpace: 'nowrap', marginLeft: 8 }}>Open Lead →</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '10px 12px', background: 'var(--bg2)', border: '1px dashed var(--line)', borderRadius: 7, fontSize: 13, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 10 }}>No matching tenant/buyer prospects in database for this size range.</div>
      )}
      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button style={S.wbRust} onClick={onCreateLead}>⚡ Create Lead</button>
        <button style={S.wbBlue}>📞 Call Owner</button>
        <button style={S.wbBlue}>📝 Note</button>
        <button style={S.wbGray}>Archive</button>
      </div>
    </div>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  livePill: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'var(--rust-bg)', border: '1px solid var(--rust-bdr)', fontSize: 11, fontWeight: 600, color: 'var(--rust)', letterSpacing: '0.04em' },
  liveDot: { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--rust)', animation: 'blink 1.2s ease-in-out infinite', flexShrink: 0 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 13px', width: 280 },
  btnGhost: { display: 'inline-flex', padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  pageHeader: { background: 'var(--card)', borderBottom: '1px solid var(--line)' },
  pageTitle: { fontSize: 30, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em' },
  pageTitleEm: { fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--rust)', fontSize: 38, fontWeight: 400 },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  signalStrip: { background: 'rgba(184,55,20,0.03)', borderLeft: '3px solid var(--rust)', borderBottom: '1px solid var(--rust-bdr)', padding: '14px 28px', display: 'flex', gap: 14, alignItems: 'center' },
  sigPulse: { width: 8, height: 8, borderRadius: '50%', background: 'var(--rust)', flexShrink: 0, animation: 'blink 1.4s ease-in-out infinite', boxShadow: '0 0 6px rgba(184,55,20,0.4)' },
  sigTag: { fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontStyle: 'italic', color: 'var(--rust)', flexShrink: 0 },
  sigSep: { width: 1, height: 26, background: 'var(--rust-bdr)', flexShrink: 0 },
  sigText: { fontSize: 14, lineHeight: 1.68, color: 'var(--ink2)' },
  statsStrip: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: 'var(--card)', borderBottom: '1px solid var(--line)' },
  stat: { padding: '16px 20px' },
  statLbl: { fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 6 },
  statVal: { fontFamily: "'Playfair Display',serif", fontSize: 34, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 280px' },
  feedHead: { padding: '12px 22px', background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 48, zIndex: 2 },
  feedTitle: { fontSize: 13, fontWeight: 700, color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: 8 },
  warnCard: { padding: '18px 22px', background: 'var(--card)', borderBottom: '1px solid var(--line2)', cursor: 'pointer', transition: 'background 0.1s', position: 'relative' },
  warnCardNew: { borderLeft: '3px solid var(--rust)' },
  oppMatch: { marginTop: 10, padding: '12px 14px', background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', borderRadius: 8 },
  omMatch: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--card)', border: '1px solid var(--blue-bdr)', borderRadius: 6, cursor: 'pointer', marginBottom: 5 },
  wbRust: { padding: '7px 13px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: '1px solid var(--rust-bdr)', background: 'var(--rust-bg)', color: 'var(--rust)', cursor: 'pointer', fontFamily: 'inherit' },
  wbBlue: { padding: '7px 13px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: '1px solid var(--blue-bdr)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer', fontFamily: 'inherit' },
  wbGray: { padding: '7px 13px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'inherit' },
  rpCard: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', overflow: 'hidden' },
  rpHdr: { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)' },
};

const MOCK_FILINGS = [
  { id: 1, company: 'Teledyne Technologies Inc.', addr: '16830 Chestnut St · Fontana, CA 92335', workers: 287, sf: '186,000 SF', closureType: 'Permanent Closure', submarket: 'IE West', filed: '3/20/2026', isNew: true, matches: [{ name: 'Pacific Manufacturing Group', sub: 'Seeking 150–200K SF dock-high · IE West', pct: 94 }, { name: 'Matrix Logistics Partners', sub: '170–220K SF requirement · Ontario / Fontana', pct: 87 }] },
  { id: 2, company: 'Consolidated Packaging Solutions LLC', addr: '4521 Jurupa Ave · Ontario, CA 91761', workers: 142, sf: '96,000 SF', closureType: 'Layoffs', submarket: 'Ontario Airport', filed: '3/18/2026', isNew: true, matches: [{ name: 'Tarhong Industry Properties', sub: 'Looking to expand from 96K SF · Ontario Airport preferred', pct: 78 }] },
  { id: 3, company: 'SoCal Aerospace Components Inc.', addr: '1200 Arrow Hwy · Irwindale, CA 91702', workers: 89, sf: '52,000 SF', closureType: 'Plant Closure', submarket: 'SGV · Azusa', filed: '3/15/2026', isNew: false, matches: [] },
];
