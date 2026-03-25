'use client';
import { useState } from 'react';

const STAGES = ['Tracking','Underwriting','LOI','LOI Accepted'];
const STAGE_COLORS = { Tracking:'var(--blue)', Underwriting:'var(--purple)', LOI:'var(--amber)', 'LOI Accepted':'var(--green)' };

export default function CommandCenter({ onNavigate, counts = {}, data = {} }) {
  const [briefType, setBriefType] = useState(null); // 'morning' | 'evening' | null

  const deals = data.deals ?? MOCK_DEALS;
  const tasks = data.tasks ?? MOCK_TASKS;
  const leads = data.leads ?? MOCK_LEADS;
  const news = data.news ?? MOCK_NEWS;
  const catalysts = data.catalysts ?? MOCK_CATALYSTS;

  const stageGroups = STAGES.map(s => ({ stage: s, deals: deals.filter(d => d.stage === s) })).filter(g => g.deals.length > 0);
  const totalPipeline = deals.reduce((s, d) => s + (parseFloat(String(d.value).replace(/[$M,]/g,'')) || 0), 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <div style={S.topbarInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              {getGreeting()}, <em style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)' }}>Briana</em>
            </div>
            <button
              style={{ ...S.briefBtn, ...(briefType === 'morning' ? S.briefBtnMorning : {}) }}
              onClick={() => setBriefType(briefType === 'morning' ? null : 'morning')}
            >☀ Morning Brief</button>
            <button
              style={{ ...S.briefBtn, ...(briefType === 'evening' ? S.briefBtnEvening : {}) }}
              onClick={() => setBriefType(briefType === 'evening' ? null : 'evening')}
            >🌙 Evening Brief</button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={S.searchWrap}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#6E6860" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="#6E6860" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input placeholder="Search everything…" style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink2)', width: '100%' }} />
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 4, padding: '2px 5px' }}>⌘K</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>

          {/* BRIEF PANEL */}
          {briefType && (
            <div style={{ ...S.briefPanel, borderLeftColor: briefType === 'morning' ? 'var(--blue)' : 'var(--purple)', background: briefType === 'morning' ? 'rgba(78,110,150,0.04)' : 'rgba(88,56,160,0.04)', borderColor: briefType === 'morning' ? 'var(--blue-bdr)' : 'var(--purple-bdr)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: briefType === 'morning' ? 'var(--blue)' : 'var(--purple)', display: 'inline-block', animation: 'blink 1.4s infinite' }} />
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: briefType === 'morning' ? 'var(--blue)' : 'var(--purple)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {briefType === 'morning' ? 'Intelligence' : 'Evening Recap'}
                </span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink2)' }}>
                {briefType === 'morning'
                  ? `Pacific Manufacturing LOI counter at $46M received — board this morning to discuss. Teledyne WARN filing in IE West still uncontacted (48hr window). Snak King CapEx permit filed 3/20 — SLB timing looks favorable. 3 tasks due today.`
                  : `Productive day. Called Bob Rosenthall (Leegin) — left voicemail. Submitted Tarhong underwriting model. Matrix Logistics responded to LOI — meeting set for Thursday. Pipeline at $297.5M total, $2.7M weighted commission.`
                }
              </div>
            </div>
          )}

          {/* KPI STRIP */}
          <div style={S.kpiStrip}>
            {[
              { icon: '◈', label: 'Pipeline', val: `$${totalPipeline.toFixed(0)}M`, sub: `${deals.length} deals`, color: 'var(--blue)', cursor: true, page: 'deals' },
              { icon: '⚡', label: 'Active Leads', val: counts.leads ?? 237, sub: '40 A+/A hot', color: 'var(--amber)', cursor: true, page: 'leads' },
              { icon: '🏢', label: 'Properties', val: counts.properties ?? 18, sub: 'Tracked', color: 'var(--blue)', cursor: true, page: 'properties' },
              { icon: '✓', label: 'Tasks Due', val: counts.tasks ?? 26, sub: 'Today + overdue', color: 'var(--rust)', cursor: true, page: 'tasks' },
            ].map((k, i) => (
              <div key={i} style={{ ...S.kpiCard, cursor: k.cursor ? 'pointer' : 'default' }} onClick={() => k.page && onNavigate(k.page)}>
                <div style={{ ...S.kpiIcon, background: `rgba(${k.color === 'var(--rust)' ? '184,55,20' : k.color === 'var(--amber)' ? '140,90,4' : '78,110,150'},0.09)`, color: k.color }}>{k.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: k.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>{k.label}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 1 }}>{k.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* PIPELINE BY STAGE */}
          <div style={S.stageStrip}>
            {stageGroups.map(g => (
              <div key={g.stage} style={S.stageGroup}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: STAGE_COLORS[g.stage], marginBottom: 6 }}>{g.stage}</div>
                {g.deals.map((d, i) => (
                  <div key={i} style={{ ...S.stageDeal, borderLeftColor: STAGE_COLORS[g.stage] }} onClick={() => onNavigate('deals')}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink2)', marginBottom: 2 }}>{d.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--ink3)' }}>{d.value}</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)' }}>{d.prob}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 3-COL BODY */}
          <div style={S.body3col}>
            {/* TODAY'S TASKS */}
            <div style={S.col}>
              <div style={S.colHdr}>
                <span style={S.colTitle}>Today's Actions</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--rust)', background: 'var(--rust-bg)', border: '1px solid var(--rust-bdr)', padding: '2px 7px', borderRadius: 20 }}>{tasks.length}</span>
              </div>
              {tasks.map((t, i) => (
                <div key={i} style={{ ...S.taskRow, borderBottom: i < tasks.length - 1 ? '1px solid var(--line2)' : 'none' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--line)', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.35 }}>{t.text}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 2 }}>{t.meta}</div>
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.overdue ? 'var(--rust)' : 'var(--ink4)', flexShrink: 0, background: t.overdue ? 'var(--rust-bg)' : 'transparent', padding: '2px 5px', borderRadius: 4, border: t.overdue ? '1px solid var(--rust-bdr)' : 'none' }}>{t.due}</span>
                </div>
              ))}
            </div>

            {/* HOT LEADS */}
            <div style={S.col}>
              <div style={S.colHdr}>
                <span style={S.colTitle}>Hot Leads</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' }} onClick={() => onNavigate('leads')}>View all →</span>
              </div>
              {leads.map((l, i) => (
                <div key={i} style={{ ...S.leadRow, borderBottom: i < leads.length - 1 ? '1px solid var(--line2)' : 'none', background: l.warn ? 'rgba(184,55,20,0.03)' : 'transparent' }} onClick={() => onNavigate('leads')}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2.5px solid ${l.scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: l.scoreColor, lineHeight: 1 }}>{l.score}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: l.scoreColor, marginTop: 1 }}>{l.grade}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: l.warn ? 'var(--rust)' : 'var(--ink2)', lineHeight: 1.2 }}>{l.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>{l.addr}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>{l.tags.map((t, ti) => <span key={ti} style={{ ...S.tag, background: t.bg, borderColor: t.bdr, color: t.color }}>{t.label}</span>)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CATALYST ALERTS */}
            <div style={S.col}>
              <div style={S.colHdr}>
                <span style={S.colTitle}>⚡ Catalyst Alerts</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' }} onClick={() => onNavigate('leads')}>View all →</span>
              </div>
              {catalysts.map((c, i) => (
                <div key={i} style={{ ...S.catRow, borderBottom: i < catalysts.length - 1 ? '1px solid var(--line2)' : 'none' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.priority === 'high' ? 'var(--rust)' : 'var(--amber)', flexShrink: 0 }}>{c.priority === 'high' ? '!!' : '!'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink2)' }}>{c.company}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 1 }}>{c.addr}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 500, border: '1px solid', background: c.tagBg, borderColor: c.tagBdr, color: c.tagColor }}>{c.type}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--ink4)', marginTop: 3 }}>{c.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NEWS */}
          <div style={{ ...S.card, marginTop: 16 }}>
            <div style={S.cardHdr}>
              <div style={S.cardTitle}>SoCal Industrial News</div>
              <span style={S.cardAction}>Load Latest →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
              {news.map((n, i) => (
                <div key={i} style={{ padding: '14px 16px', borderRight: i < 3 ? '1px solid var(--line2)' : 'none', cursor: 'pointer' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 6 }}>{n.source}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink2)', lineHeight: 1.4, marginBottom: 6 }}>{n.headline}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12.5, fontStyle: 'italic', color: 'var(--ink4)' }}>{n.date}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const S = {
  topbar: { height: 64, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 5 },
  topbarInner: { maxWidth: 1700, width: '100%', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 13px', width: 280 },
  briefBtn: { padding: '6px 13px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink3)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  briefBtnMorning: { background: 'var(--blue-bg)', borderColor: 'var(--blue-bdr)', color: 'var(--blue)' },
  briefBtnEvening: { background: 'var(--purple-bg)', borderColor: 'var(--purple-bdr)', color: 'var(--purple)' },
  briefPanel: { background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)', borderLeft: '3px solid var(--blue)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 16 },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', padding: '20px 28px 60px' },
  kpiStrip: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 },
  kpiCard: { background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 },
  kpiIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  stageStrip: { background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 20, overflowX: 'auto' },
  stageGroup: { minWidth: 180, flex: 1 },
  stageDeal: { padding: '8px 10px', background: 'var(--bg)', borderRadius: 7, borderLeft: '2.5px solid', marginBottom: 6, cursor: 'pointer' },
  body3col: { display: 'grid', gridTemplateColumns: '340px 1fr 1fr', gap: 16 },
  col: { background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden' },
  colHdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--line)' },
  colTitle: { fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)' },
  taskRow: { display: 'flex', gap: 10, padding: '10px 14px', alignItems: 'flex-start' },
  leadRow: { display: 'flex', gap: 12, padding: '11px 14px', cursor: 'pointer', alignItems: 'flex-start' },
  catRow: { display: 'flex', gap: 10, padding: '10px 14px', alignItems: 'flex-start', cursor: 'pointer' },
  tag: { display: 'inline-flex', padding: '2px 6px', borderRadius: 3, fontSize: 10.5, fontWeight: 500, border: '1px solid' },
  card: { background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--line2)', overflow: 'hidden' },
  cardHdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--line)' },
  cardTitle: { fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)' },
  cardAction: { fontFamily: "'Cormorant Garamond',serif", fontSize: 13.5, fontStyle: 'italic', color: 'var(--blue2)', cursor: 'pointer' },
  shadow: '0 1px 4px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05)',
};

// ── MOCK DATA ─────────────────────────────────────────────────
const MOCK_DEALS = [
  { name: 'Snak King Corp', value: '$62M', prob: 25, stage: 'Tracking' },
  { name: 'Tarhong Properties', value: '$24M', prob: 40, stage: 'Underwriting' },
  { name: 'Pacific Mfg · Workman Mill', value: '$47.5M', prob: 81, stage: 'LOI' },
  { name: 'Matrix Logistics', value: '$22M', prob: 65, stage: 'LOI' },
  { name: 'Rexford · Irwindale', value: '$104M', prob: 88, stage: 'LOI Accepted' },
  { name: 'FedEx Ground · Industry', value: '$48M', prob: 82, stage: 'LOI Accepted' },
];

const MOCK_TASKS = [
  { text: 'Follow up — Bob Rosenthall re: SLB decision', meta: 'Leegin · 14022 Nelson Ave', due: 'Today', overdue: false },
  { text: 'Send Tarhong UW model to buyer group', meta: 'Deal · LOI stage', due: 'Today', overdue: false },
  { text: 'Call Jodie re: Teledyne broker status', meta: 'WARN · Fontana', due: 'Overdue', overdue: true },
  { text: 'Prepare comps for Matrix Logistics meeting', meta: 'Thu Mar 26', due: 'Mar 26', overdue: false },
  { text: 'Review Rexford PSA draft from counsel', meta: 'Irwindale deal', due: 'Mar 27', overdue: false },
];

const MOCK_LEADS = [
  { score: 95, grade: 'A+', scoreColor: 'var(--blue)', name: 'Leegin Creative Leather', addr: '14022 Nelson Ave · Baldwin Park', warn: false, tags: [{ label: "Lease '27", bg: 'var(--amber-bg)', bdr: 'var(--amber-bdr)', color: 'var(--amber)' }, { label: 'SLB', bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', color: 'var(--green)' }] },
  { score: 82, grade: 'A', scoreColor: 'var(--rust)', name: 'Teledyne Technologies', addr: '16830 Chestnut St · Fontana', warn: true, tags: [{ label: '⚠ WARN 3/20', bg: 'var(--rust-bg)', bdr: 'var(--rust-bdr)', color: 'var(--rust)' }] },
  { score: 78, grade: 'A', scoreColor: 'var(--blue2)', name: 'Snak King Corp', addr: '16150 Stephens St · Industry', warn: false, tags: [{ label: 'CapEx', bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', color: 'var(--purple)' }, { label: 'SLB?', bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', color: 'var(--green)' }] },
];

const MOCK_CATALYSTS = [
  { priority: 'high', company: 'Teledyne Technologies', addr: '16830 Chestnut St · IE West', type: 'WARN Notice', date: 'Mar 20', tagBg: 'var(--rust-bg)', tagBdr: 'var(--rust-bdr)', tagColor: 'var(--rust)' },
  { priority: 'high', company: 'Pacific Manufacturing', addr: '4900 Workman Mill · SGV', type: 'LOI Counter', date: 'Mar 22', tagBg: 'var(--amber-bg)', tagBdr: 'var(--amber-bdr)', tagColor: 'var(--amber)' },
  { priority: 'medium', company: 'Leegin Creative Leather', addr: '14022 Nelson Ave · Baldwin Park', type: 'Lease Expiry', date: 'Aug 2027', tagBg: 'var(--amber-bg)', tagBdr: 'var(--amber-bdr)', tagColor: 'var(--amber)' },
];

const MOCK_NEWS = [
  { source: 'CoStar', headline: 'IE West vacancy hits 2.8% — lowest since 2021 as new supply stalls', date: 'Mar 24, 2026' },
  { source: 'CBRE Research', headline: 'SoCal industrial asking rents up 4.2% YoY; sublease space absorbed in Q1', date: 'Mar 23, 2026' },
  { source: 'LA Business Journal', headline: 'Port of LA cargo volume rebounds 12% in February — demand signal for logistics space', date: 'Mar 22, 2026' },
  { source: 'Bisnow', headline: 'Rexford Industrial announces $130M in Q1 dispositions, ahead of annual target', date: 'Mar 21, 2026' },
];
