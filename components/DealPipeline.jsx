'use client';
import { useState } from 'react';

const STAGES = [
  { key: 'tracking', label: 'Tracking', color: 'var(--blue)', colorAlpha: 'rgba(78,110,150,0.12)' },
  { key: 'underwriting', label: 'Underwriting', color: 'var(--purple)', colorAlpha: 'rgba(88,56,160,0.10)' },
  { key: 'loi', label: 'LOI', color: 'var(--amber)', colorAlpha: 'rgba(140,90,4,0.10)' },
  { key: 'loi_accepted', label: 'LOI Accepted', color: 'var(--green)', colorAlpha: 'rgba(21,102,54,0.10)' },
  { key: 'psa', label: 'PSA / Non-Contingent', color: 'var(--green)', colorAlpha: 'rgba(21,102,54,0.14)' },
  { key: 'due_diligence', label: 'Due Diligence', color: 'var(--rust)', colorAlpha: 'rgba(184,55,20,0.08)' },
];

const CAT_STYLES = {
  slb: { bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', color: 'var(--green)', label: 'SLB' },
  sale: { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', color: 'var(--blue)', label: 'Inv. Sale' },
  lease: { bg: 'var(--amber-bg)', bdr: 'var(--amber-bdr)', color: 'var(--amber)', label: 'Lease Rep' },
  portfolio: { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', color: 'var(--blue)', label: 'Portfolio' },
  rep: { bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', color: 'var(--purple)', label: 'Buyer Rep' },
};

export default function DealPipeline({ deals = MOCK_DEALS, onSelectDeal }) {
  const totalValue = deals.reduce((s, d) => s + d.valueMM, 0);
  const inLOI = deals.filter(d => ['loi', 'loi_accepted'].includes(d.stage)).length;
  const actionNeeded = deals.filter(d => d.action).length;
  const wtdComm = deals.reduce((s, d) => s + d.valueMM * (d.prob / 100) * 0.012, 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink4)' }}><span style={{ color: 'var(--ink2)', fontWeight: 500 }}>Deal Pipeline</span></span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={S.btnGhost} onClick={() => alert('Table View — coming soon')}>Table View</button>
          <button style={S.btnBlue} onClick={() => alert('New Deal — Supabase form coming soon')}>+ New Deal</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>Deal <em style={S.pageTitleEm}>Pipeline</em></div>
              <div style={S.pageSub}>{deals.length} active deals · ${totalValue.toFixed(1)}M total value · ${wtdComm.toFixed(1)}M weighted commission</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={S.btnGhost} onClick={() => alert('Filter — coming soon')}>Filter</button>
              <button style={S.btnGhost} onClick={() => alert('Sort — coming soon')}>Sort</button>
            </div>
          </div>

          {/* KPI STRIP */}
          <div style={S.kpiStrip}>
            {[
              { icon: '◈', label: 'Active Deals', val: deals.length, color: 'blue' },
              { icon: '$', label: 'Total Value', val: `$${totalValue.toFixed(1)}M`, color: 'blue' },
              { icon: '↗', label: 'Wtd. Commission', val: `$${wtdComm.toFixed(1)}M`, color: 'green' },
              { icon: '◉', label: 'In LOI / Accepted', val: inLOI, color: 'amber' },
              { icon: '⏱', label: 'Action Needed', val: actionNeeded, color: 'rust' },
            ].map((k, i) => (
              <div key={i} style={S.kpiCard}>
                <div style={{ ...S.kpiIcon, background: `var(--${k.color}-bg)`, color: `var(--${k.color})` }}>{k.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: k.color === 'green' ? 'var(--green)' : k.color === 'rust' ? 'var(--rust)' : 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* KANBAN */}
          <div style={S.kanban}>
            {STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.key);
              const stageTotal = stageDeals.reduce((s, d) => s + d.valueMM, 0);
              return (
                <div key={stage.key} style={S.col}>
                  <div style={{ ...S.colHdr, background: stage.colorAlpha }}>
                    <span style={{ ...S.colTitle, color: stage.color }}>{stage.label}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, background: 'rgba(255,255,255,0.25)', padding: '2px 7px', borderRadius: 20, color: stage.color }}>{stageDeals.length}</span>
                    {stageTotal > 0 && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: stage.color, opacity: 0.7 }}>${stageTotal.toFixed(0)}M</span>}
                  </div>
                  {stageDeals.map((d, i) => (
                    <DealCard key={d.id ?? i} deal={d} stageColor={stage.color} onClick={() => onSelectDeal?.(d)} />
                  ))}
                  <div style={S.colAdd}>+ Add Deal</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal: d, stageColor, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ ...S.dealCard, borderLeftColor: stageColor, boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.08)', transform: hover ? 'translateY(-1px)' : 'none' }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)', marginBottom: 3, paddingLeft: 6 }}>{d.name}</div>
      <div style={{ fontSize: 12, color: 'var(--ink4)', paddingLeft: 6, marginBottom: 8 }}>{d.addr}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 6 }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>${d.valueMM}M</div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)' }}>{d.prob}% close</div>
      </div>
      {d.cats?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingLeft: 6, marginTop: 6 }}>
          {d.cats.map(c => {
            const cs = CAT_STYLES[c] ?? CAT_STYLES.sale;
            return <span key={c} style={{ display: 'inline-flex', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 500, border: '1px solid', background: cs.bg, borderColor: cs.bdr, color: cs.color }}>{cs.label}</span>;
          })}
        </div>
      )}
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: d.action ? 'var(--rust)' : 'var(--ink4)', paddingLeft: 6, marginTop: 5 }}>{d.note}</div>
    </div>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', padding: '0 28px 60px' },
  pageHeader: { padding: '22px 0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em' },
  pageTitleEm: { fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)', fontSize: 36, fontWeight: 400 },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  btnGhost: { display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  btnBlue: { display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontFamily: 'inherit' },
  kpiStrip: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 18 },
  kpiCard: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  kpiIcon: { width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  kanban: { display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 },
  col: { flex: '0 0 260px', display: 'flex', flexDirection: 'column' },
  colHdr: { padding: '10px 12px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 6 },
  colTitle: { fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', flex: 1 },
  dealCard: { background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line2)', borderLeft: '3px solid', padding: 14, marginBottom: 8, cursor: 'pointer', transition: 'box-shadow 0.12s, transform 0.12s', position: 'relative' },
  colAdd: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 7, border: '1px dashed var(--line)', color: 'var(--ink4)', fontSize: 12, cursor: 'pointer' },
};

const MOCK_DEALS = [
  { id: 1, name: 'Snak King Corp', addr: '16150 Stephens St · Industry', valueMM: 62, prob: 25, stage: 'tracking', cats: ['slb'], note: 'Added Mar 18 · No contact yet', action: false },
  { id: 2, name: 'Acromill LLC', addr: '18421 Railroad St · IE South', valueMM: 9.8, prob: 20, stage: 'tracking', cats: ['sale'], note: 'Added Mar 15', action: false },
  { id: 3, name: 'Tarhong Industry Properties', addr: '780 Nogales St · Industry', valueMM: 24, prob: 40, stage: 'underwriting', cats: ['slb', 'rep'], note: 'UW started Mar 20', action: false },
  { id: 4, name: 'Pacific Mfg · Workman Mill', addr: '4900 Workman Mill Rd · Industry', valueMM: 47.5, prob: 81, stage: 'loi', cats: ['slb'], note: 'LOI sent Mar 10 · Countered', action: true },
  { id: 5, name: 'Matrix Logistics · Fontana', addr: '1205 S 7th Ave · Hacienda Hts', valueMM: 22, prob: 65, stage: 'loi', cats: ['lease'], note: 'LOI sent Mar 18', action: false },
  { id: 6, name: 'Valley Cold Storage Inc.', addr: 'Ontario Airport submarket', valueMM: 19, prob: 55, stage: 'loi', cats: ['sale'], note: 'LOI sent Mar 22', action: false },
  { id: 7, name: 'Rexford Industrial — Irwindale', addr: '4800 Azusa Canyon Rd', valueMM: 104, prob: 88, stage: 'loi_accepted', cats: ['portfolio'], note: 'LOI accepted Mar 5 · PSA drafting', action: false },
  { id: 8, name: 'FedEx Ground — Industry', addr: '14022 Nelson Ave area', valueMM: 48, prob: 82, stage: 'loi_accepted', cats: ['lease'], note: 'LOI accepted Feb 28', action: false },
];
