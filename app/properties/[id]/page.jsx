'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STAGES = [
  'Tracking',
  'Underwriting',
  'Off-Market Outreach',
  'Marketing',
  'LOI',
  'LOI Accepted',
  'PSA Negotiation',
  'Due Diligence',
  'Non-Contingent',
  'Closed Won',
  'Closed Lost',
  'Dead',
];

const COMMISSION_STAGES = new Set([
  'LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won',
]);

const BOV_STAGES = new Set([
  'Underwriting','Off-Market Outreach','Marketing','LOI','LOI Accepted',
  'PSA Negotiation','Due Diligence','Non-Contingent','Closed Won',
]);

const TABS = [
  { key: 'timeline',    label: 'Timeline' },
  { key: 'underwriting',label: 'Underwriting' },
  { key: 'bov',         label: 'BOV Dashboard' },
  { key: 'contacts',    label: 'Contacts' },
  { key: 'tasks',       label: 'Tasks' },
  { key: 'files',       label: 'Files' },
];

function fmtM(n) {
  if (!n) return '—';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}
function fmtSF(n) { return n ? Number(n).toLocaleString() + ' SF' : '—'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── STAGE BREADCRUMB ────────────────────────────────────────────────────────

function StageBreadcrumb({ currentStage, onStageChange }) {
  const activeIdx = STAGES.indexOf(currentStage);
  return (
    <div className="cl-stage-track" style={{ overflowX: 'auto', paddingBottom: 4 }}>
      {STAGES.filter(s => !['Closed Lost','Dead'].includes(s)).map((s, i) => {
        const isDone   = i < activeIdx;
        const isActive = s === currentStage;
        return (
          <button
            key={s}
            onClick={() => onStageChange(s)}
            className={`cl-stage-step ${isActive ? 'cl-stage-step--active' : ''} ${isDone ? 'cl-stage-step--done' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flex: 1 }}
          >
            <div className="cl-stage-label" style={{ fontSize: 10 }}>{s}</div>
            {i < STAGES.filter(s => !['Closed Lost','Dead'].includes(s)).length - 1 && (
              <div className="cl-stage-arrow" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── ACTIVITY ITEM ───────────────────────────────────────────────────────────

function ActivityItem({ act }) {
  const TYPE_ICON = { call: '📞', email: '✉️', note: '📝', meeting: '🤝', task: '✅', system: '⚙️' };
  const icon = TYPE_ICON[act.activity_type] || '📌';
  const when = act.created_at
    ? new Date(act.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '12px 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {act.title || act.activity_type}
        </div>
        {act.body && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>
            {act.body}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{when}</div>
      </div>
    </div>
  );
}

// ─── BOV DASHBOARD GENERATOR ─────────────────────────────────────────────────

function BOVGenerator({ deal, property }) {
  const iframeRef = useRef(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiStatus, setAiStatus]     = useState('');  // '' | 'running' | 'done' | 'error'
  const [thesis, setThesis]         = useState('');
  const [strengths, setStrengths]   = useState([
    { text: 'Infill SGV location — no developable land for new supply', tag: 'green' },
    { text: 'SR-60 freeway access', tag: 'green' },
    { text: 'Mark-to-market rent upside at rollover', tag: 'green' },
    { text: 'Long-term owner — no distress or forced sale', tag: 'blue' },
  ]);
  const [risks, setRisks]           = useState([
    { text: 'Partial vacancy — re-tenanting cost', tag: 'red' },
    { text: 'Older vintage — CapEx expectations from buyers', tag: 'amber' },
    { text: 'Negative leverage environment', tag: 'blue' },
  ]);
  const [capBase, setCapBase]       = useState(0.060);
  const [capExp, setCapExp]         = useState(0.055);
  const [capOut, setCapOut]         = useState(0.050);
  const [mktRent, setMktRent]       = useState(1.22);
  const [generated, setGenerated]   = useState(false);

  // Pre-fill from deal/property data
  const sf   = deal?.building_sf   || property?.building_sf   || 0;
  const name = deal?.deal_name     || property?.address        || 'Property';
  const addr = deal?.address       || property?.address        || '';
  const city = deal?.city          || property?.city           || '';
  const owner= property?.owner     || deal?.owner              || '';
  const year = property?.year_built|| deal?.year_built         || '';
  const clear= property?.clear_height || deal?.clear_height   || '';
  const ac   = property?.land_acres|| deal?.land_acres         || '';

  async function runAI() {
    setAiLoading(true);
    setAiStatus('running');

    const prompt = `You are a senior industrial real estate broker at Colliers International preparing a Broker Opinion of Value (BOV) for a seller. Analyze this property and return ONLY valid JSON, no markdown.

PROPERTY:
- Name: ${name}
- Address: ${addr}, ${city}
- SF: ${sf?.toLocaleString() || 'unknown'}
- Year Built: ${year || 'unknown'}
- Clear Height: ${clear || 'unknown'} ft
- Land: ${ac || 'unknown'} AC
- Owner: ${owner || 'unknown'}
- Deal Stage: ${deal?.stage || 'Underwriting'}
- Market Rent: $${mktRent.toFixed(2)}/SF/Mo NNN
- Submarket: SGV East — City of Industry
- Deal Type: ${deal?.deal_type || 'Disposition'}

Return exactly this JSON structure:
{
  "strengths": [{"text": "specific strength relevant to this property", "tag": "green or blue"}, ...5-6 items],
  "risks": [{"text": "specific risk for this property", "tag": "red, amber, or blue"}, ...4-5 items],
  "thesis": "2-3 sentence seller BOV thesis. Be specific about the property, pricing rationale at a ${(capExp*100).toFixed(1)}% cap, and why a buyer would pay it."
}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 900,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const raw  = data.content?.[0]?.text || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (parsed.strengths?.length) setStrengths(parsed.strengths);
      if (parsed.risks?.length)     setRisks(parsed.risks);
      if (parsed.thesis)            setThesis(parsed.thesis);

      setAiStatus('done');
    } catch (e) {
      setAiStatus('error');
      console.error('BOV AI error:', e);
    } finally {
      setAiLoading(false);
    }
  }

  function generateDashboard() {
    // NOI calc
    const MR   = mktRent;
    const SOCC = 0.95;
    const MGMT = 0.04;
    const RTX  = 1.43; const INS = 0.18; const CAME = 0.25; const RM = 0.12;
    const gpr_s   = sf * MR * 12;
    const vac_s   = gpr_s * (1 - SOCC);
    const egr_s   = gpr_s * SOCC;
    const reimb_s = sf * SOCC * (RTX + CAME + INS);
    const egrev_s = egr_s + reimb_s;
    const opex_s  = sf * (RTX + INS + CAME + RM);
    const mgmt_s  = egrev_s * MGMT;
    const noi_s   = egrev_s - opex_s - mgmt_s;

    const vBase = noi_s / capBase;
    const vExp  = noi_s / capExp;
    const vOut  = noi_s / capOut;
    const pBase = Math.round(vBase / sf);
    const pExp  = Math.round(vExp / sf);
    const pOut  = Math.round(vOut / sf);

    function fD(x) { return x >= 1e6 ? '$' + (x / 1e6).toFixed(1) + 'M' : '$' + Math.round(x / 1e3) + 'K'; }
    function fC(x) { return '$' + Math.round(x).toLocaleString('en-US'); }
    function xe(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    const strRows = strengths.filter(s => s.text).map(s => {
      const cls = s.tag === 'green' ? 'background:#e8f5e9;color:#16803c' : 'background:#e8f0fe;color:#2E75B6';
      const lbl = s.tag === 'green' ? 'Strong' : 'Good';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-size:13px;border-bottom:.5px solid #ddd8d0">
        <span style="color:#5a5a5a">${xe(s.text)}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;text-transform:uppercase;${cls}">${lbl}</span>
      </div>`;
    }).join('');

    const riskRows = risks.filter(r => r.text).map(r => {
      const cls = r.tag === 'red' ? 'background:#fce4ec;color:#cc2200' : r.tag === 'amber' ? 'background:#fff8e1;color:#b8860b' : 'background:#e8f0fe;color:#2E75B6';
      const lbl = r.tag === 'red' ? 'High' : r.tag === 'amber' ? 'Medium' : 'Low';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-size:13px;border-bottom:.5px solid #ddd8d0">
        <span style="color:#5a5a5a">${xe(r.text)}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;text-transform:uppercase;${cls}">${lbl}</span>
      </div>`;
    }).join('');

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
    html += '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">';
    html += '<style>';
    html += 'body{font-family:"DM Sans",sans-serif;background:#f6f5f2;color:#1a1a1a;margin:0;padding:24px;line-height:1.6}';
    html += '.wrap{max-width:900px;margin:0 auto}';
    html += '.sec{font-size:11px;font-weight:700;color:#2E75B6;text-transform:uppercase;letter-spacing:.08em;margin:24px 0 10px;padding-bottom:5px;border-bottom:1px solid #ddd8d0}';
    html += '.card{background:#fff;border:1px solid #ddd8d0;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:12px}';
    html += '.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}';
    html += '.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}';
    html += '.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}';
    html += '.kv{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}';
    html += '.kn{font-size:20px;font-weight:700;font-family:"JetBrains Mono",monospace}';
    html += '.ks{font-size:11px;color:#999;font-family:"JetBrains Mono",monospace}';
    html += '.row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:.5px solid #ddd8d0}';
    html += '.row:last-child{border-bottom:none}';
    html += '.lbl{color:#5a5a5a}.v{font-weight:600;font-family:"JetBrains Mono",monospace;font-size:12px}';
    html += '.hl{background:#e8f0fe;margin:0 -12px;padding:7px 12px;border-radius:8px;border-bottom:none}';
    html += '.hl2{background:#e8f5e9;margin:0 -12px;padding:7px 12px;border-radius:8px;border-bottom:none}';
    html += '.pbtn{font-family:inherit;font-size:12px;font-weight:600;padding:6px 14px;border-radius:6px;border:1px solid #ddd8d0;background:#fff;color:#1a1a1a;cursor:pointer}';
    html += 'footer{margin-top:24px;font-size:10px;color:#999;text-align:center;padding-top:12px;border-top:1px solid #ddd8d0}';
    html += '@media print{.pbtn{display:none}}';
    html += '</style></head><body><div class="wrap">';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">';
    html += '<div>';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">';
    html += '<h1 style="font-size:24px;font-weight:700;margin:0">' + xe(name) + '</h1>';
    html += '<span style="font-size:10px;padding:3px 10px;border-radius:20px;font-weight:700;text-transform:uppercase;background:#e8f0fe;color:#2E75B6">Asset Valuation &mdash; BOV</span>';
    html += '</div>';
    html += '<div style="font-size:13px;color:#5a5a5a">' + xe(addr) + (city ? ' &middot; ' + xe(city) : '') + (owner ? ' &middot; Owner: ' + xe(owner) : '') + '</div>';
    html += '</div>';
    html += '<button class="pbtn" onclick="window.print()">Print / PDF</button>';
    html += '</div>';

    // KPI strip
    html += '<div class="g5" style="margin-bottom:16px">';
    html += '<div class="card"><div class="kv">Expected Value</div><div class="kn" style="color:#2E75B6">' + fD(vExp) + '</div><div class="ks">$' + pExp + '/SF</div></div>';
    html += '<div class="card"><div class="kv">Building SF</div><div class="kn">' + (sf ? sf.toLocaleString() : '—') + '</div><div class="ks">' + xe(String(year || '')) + '</div></div>';
    html += '<div class="card"><div class="kv">Land</div><div class="kn">' + xe(String(ac || '—')) + ' AC</div><div class="ks">&nbsp;</div></div>';
    html += '<div class="card"><div class="kv">Clear Height</div><div class="kn">' + xe(String(clear || '—')) + ' ft</div><div class="ks">&nbsp;</div></div>';
    html += '<div class="card"><div class="kv">Market Rent</div><div class="kn" style="color:#b8860b">$' + MR.toFixed(2) + '</div><div class="ks">NNN/SF/Mo</div></div>';
    html += '</div>';

    // Bell curve
    html += '<div class="sec">Pricing Matrix &mdash; Base / Expected / Outlier</div>';
    html += '<div class="card" style="padding:20px">';
    html += '<svg viewBox="0 0 800 100" style="display:block;width:100%;height:100px">';
    html += '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2E75B6" stop-opacity=".2"/><stop offset="100%" stop-color="#2E75B6" stop-opacity=".03"/></linearGradient></defs>';
    html += '<path d="M0,98 Q100,98 200,90 Q300,70 400,10 Q500,70 600,90 Q700,98 800,98 Z" fill="url(#bg)" stroke="#2E75B6" stroke-width="1.5"/>';
    html += '<line x1="215" y1="8" x2="215" y2="98" stroke="#b8860b" stroke-width="1" stroke-dasharray="4,3"/>';
    html += '<line x1="400" y1="8" x2="400" y2="98" stroke="#2E75B6" stroke-width="2"/>';
    html += '<line x1="585" y1="8" x2="585" y2="98" stroke="#16803c" stroke-width="1" stroke-dasharray="4,3"/>';
    html += '</svg>';
    html += '<div style="display:flex;justify-content:space-between;margin-top:12px">';
    html += '<div style="text-align:center;flex:.6"><div style="font-size:17px;font-weight:700;font-family:monospace;color:#b8860b">' + fD(vBase) + '</div><div style="font-size:11px;color:#999">$' + pBase + '/SF</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#999;margin-top:2px">Base &mdash; ' + (capBase * 100).toFixed(1) + '% cap</div></div>';
    html += '<div style="text-align:center;flex:1"><div style="font-size:22px;font-weight:700;font-family:monospace;color:#2E75B6">' + fD(vExp) + '</div><div style="font-size:11px;color:#999">$' + pExp + '/SF</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#999;margin-top:2px">Expected &mdash; ' + (capExp * 100).toFixed(1) + '% cap</div></div>';
    html += '<div style="text-align:center;flex:.6"><div style="font-size:17px;font-weight:700;font-family:monospace;color:#16803c">' + fD(vOut) + '</div><div style="font-size:11px;color:#999">$' + pOut + '/SF</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#999;margin-top:2px">Outlier &mdash; ' + (capOut * 100).toFixed(1) + '% cap</div></div>';
    html += '</div></div>';

    // NOI
    html += '<div class="sec">NOI Build &mdash; Stabilized (95% Occ.)</div>';
    html += '<div class="card">';
    html += '<div class="row"><span class="lbl">Gross Potential Rent (' + (sf || 0).toLocaleString() + ' SF &times; $' + MR.toFixed(2) + ' &times; 12)</span><span class="v">' + fC(gpr_s) + '</span></div>';
    html += '<div class="row"><span class="lbl">Less: Vacancy (5%)</span><span class="v" style="color:#cc2200">(' + fC(vac_s) + ')</span></div>';
    html += '<div class="row"><span class="lbl">NNN Reimbursements</span><span class="v">' + fC(reimb_s) + '</span></div>';
    html += '<div class="row"><span class="lbl">Effective Gross Revenue</span><span class="v">' + fC(egrev_s) + '</span></div>';
    html += '<div class="row"><span class="lbl">Less: Operating Expenses + Mgmt</span><span class="v" style="color:#cc2200">(' + fC(opex_s + mgmt_s) + ')</span></div>';
    html += '<div class="row hl2"><span class="lbl" style="font-weight:700;color:#16803c">Stabilized NOI</span><span class="v" style="font-size:15px;color:#16803c">' + fC(noi_s) + '</span></div>';
    html += '</div>';

    // Returns
    html += '<div class="sec">Return Metrics by Scenario</div>';
    html += '<div class="g3">';
    [
      { label: 'BASE &mdash; ' + (capBase*100).toFixed(1) + '% Cap', val: vBase, psf: pBase, col: '#b8860b' },
      { label: 'EXPECTED &mdash; ' + (capExp*100).toFixed(1) + '% Cap', val: vExp, psf: pExp, col: '#2E75B6' },
      { label: 'OUTLIER &mdash; ' + (capOut*100).toFixed(1) + '% Cap', val: vOut, psf: pOut, col: '#16803c' },
    ].forEach(s => {
      html += '<div class="card" style="border-top:3px solid ' + s.col + '">';
      html += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:' + s.col + ';margin-bottom:10px">' + s.label + '</div>';
      html += '<div class="row"><span class="lbl">Total Value</span><span class="v">' + fC(s.val) + '</span></div>';
      html += '<div class="row"><span class="lbl">Price / SF</span><span class="v">$' + s.psf + '/SF</span></div>';
      html += '<div class="row"><span class="lbl">Est. IRR</span><span class="v" style="color:' + s.col + '">8&ndash;9%</span></div>';
      html += '</div>';
    });
    html += '</div>';

    // Scorecard
    html += '<div class="sec">Risk / Reward Scorecard</div>';
    html += '<div class="g2">';
    html += '<div><div style="font-size:12px;font-weight:700;color:#16803c;margin-bottom:8px">Strengths</div>' + strRows + '</div>';
    html += '<div><div style="font-size:12px;font-weight:700;color:#cc2200;margin-bottom:8px">Risks</div>' + riskRows + '</div>';
    html += '</div>';

    // Thesis
    if (thesis) {
      html += '<div style="display:flex;align-items:flex-start;gap:16px;padding:16px;border-radius:10px;background:#e8f0fe;border:1px solid #2E75B6;margin-top:16px">';
      html += '<div style="font-size:36px;font-weight:700;font-family:monospace;color:#2E75B6;flex-shrink:0">B+</div>';
      html += '<div><div style="font-weight:700;font-size:14px;color:#2E75B6;margin-bottom:4px">Asset Valuation &mdash; BOV</div>';
      html += '<div style="font-size:13px;color:#2E75B6;opacity:.85;line-height:1.5">' + xe(thesis) + '</div></div>';
      html += '</div>';
    }

    html += '<footer>' + xe(name) + ' &mdash; Broker Opinion of Value &middot; ' + xe(deal?.broker || 'Briana Corso, Colliers') + ' &middot; ' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' &middot; Confidential</footer>';
    html += '</div></body></html>';

    if (iframeRef.current) {
      iframeRef.current.srcdoc = html;
      iframeRef.current.style.height = '1800px';
    }
    setGenerated(true);
    window._bovHTML = html;
  }

  function printDash() {
    if (!window._bovHTML) { alert('Generate the dashboard first.'); return; }
    const w = window.open('', '_blank');
    w.document.write(window._bovHTML);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  // ── RENDER BOV TAB ────────────────────────────────────────
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

      {/* LEFT: Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div className="cl-card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
            Pricing Assumptions
          </div>
          {[
            { label: 'Market Rent NNN ($/SF/Mo)', val: mktRent, set: setMktRent, step: 0.01 },
            { label: 'Base Cap Rate', val: capBase, set: setCapBase, step: 0.001 },
            { label: 'Expected Cap Rate', val: capExp, set: setCapExp, step: 0.001 },
            { label: 'Outlier Cap Rate', val: capOut, set: setCapOut, step: 0.001 },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>
                {f.label}
              </label>
              <input
                type="number"
                step={f.step}
                value={f.val}
                onChange={e => f.set(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
            </div>
          ))}
        </div>

        {/* AI Generation */}
        <div className="cl-card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
            AI Narrative
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.5 }}>
            Claude reads the deal data and auto-generates strengths, risks, and thesis. Edit anything before generating.
          </p>
          <button
            onClick={runAI}
            disabled={aiLoading}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
              background: 'var(--blue2)', color: '#fff', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 700, cursor: aiLoading ? 'default' : 'pointer',
              opacity: aiLoading ? 0.7 : 1, marginBottom: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            {aiLoading ? (
              <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Analyzing…</>
            ) : '✦ Generate with AI'}
          </button>

          {aiStatus === 'done' && (
            <div style={{ fontSize: 11, padding: '6px 8px', borderRadius: 6, background: 'var(--green-bg)', color: 'var(--green)', marginBottom: 8 }}>
              ✓ AI complete — review and edit below
            </div>
          )}
          {aiStatus === 'error' && (
            <div style={{ fontSize: 11, padding: '6px 8px', borderRadius: 6, background: 'var(--rust-bg)', color: 'var(--rust)', marginBottom: 8 }}>
              ⚠ AI failed — edit manually
            </div>
          )}

          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>
            Investment Thesis
          </label>
          <textarea
            value={thesis}
            onChange={e => setThesis(e.target.value)}
            placeholder="AI will fill this in, or type your own thesis…"
            rows={4}
            style={{ width: '100%', fontFamily: 'inherit', fontSize: 12, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-primary)', resize: 'vertical' }}
          />
        </div>

        {/* Strengths */}
        <div className="cl-card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Strengths</div>
          {strengths.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={s.text}
                onChange={e => { const n = [...strengths]; n[i] = { ...n[i], text: e.target.value }; setStrengths(n); }}
                style={{ flex: 1, fontFamily: 'inherit', fontSize: 12, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
              <select
                value={s.tag}
                onChange={e => { const n = [...strengths]; n[i] = { ...n[i], tag: e.target.value }; setStrengths(n); }}
                style={{ fontSize: 11, padding: '4px 3px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: 'inherit', width: 64 }}
              >
                <option value="green">Strong</option>
                <option value="blue">Good</option>
              </select>
              <button onClick={() => setStrengths(strengths.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
          <button onClick={() => setStrengths([...strengths, { text: '', tag: 'green' }])}
            style={{ fontSize: 11, color: 'var(--blue2)', background: 'none', border: '1px dashed var(--blue2)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
            + Add
          </button>
        </div>

        {/* Risks */}
        <div className="cl-card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rust)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Risks</div>
          {risks.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={r.text}
                onChange={e => { const n = [...risks]; n[i] = { ...n[i], text: e.target.value }; setRisks(n); }}
                style={{ flex: 1, fontFamily: 'inherit', fontSize: 12, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
              <select
                value={r.tag}
                onChange={e => { const n = [...risks]; n[i] = { ...n[i], tag: e.target.value }; setRisks(n); }}
                style={{ fontSize: 11, padding: '4px 3px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: 'inherit', width: 64 }}
              >
                <option value="red">High</option>
                <option value="amber">Med</option>
                <option value="blue">Low</option>
              </select>
              <button onClick={() => setRisks(risks.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
          <button onClick={() => setRisks([...risks, { text: '', tag: 'amber' }])}
            style={{ fontSize: 11, color: 'var(--blue2)', background: 'none', border: '1px dashed var(--blue2)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
            + Add
          </button>
        </div>

        {/* Actions */}
        <button
          onClick={generateDashboard}
          style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}
        >
          ↻ Generate Dashboard
        </button>
        <button
          onClick={printDash}
          style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Print / Save PDF
        </button>
      </div>

      {/* RIGHT: Preview */}
      <div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {generated ? 'BOV Preview — click Generate to update' : 'Click Generate Dashboard to preview'}
            </span>
            <button onClick={generateDashboard} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--blue2)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>↻ Generate</button>
          </div>
          <iframe
            ref={iframeRef}
            style={{ width: '100%', border: 'none', minHeight: 400, background: '#f6f5f2' }}
            title="BOV Dashboard Preview"
          />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DealDetail() {
  const { id }    = useParams();
  const router    = useRouter();
  const [deal, setDeal]             = useState(null);
  const [property, setProperty]     = useState(null);
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts]     = useState([]);
  const [tasks, setTasks]           = useState([]);
  const [files, setFiles]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('timeline');
  const [editing, setEditing]       = useState(false);
  const [logType, setLogType]       = useState('call');
  const [logNote, setLogNote]       = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => { if (id) loadDeal(); }, [id]);

  async function loadDeal() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: d, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setDeal(d);

      // Load related data in parallel
      const [actsRes, ctctsRes, tasksRes, filesRes] = await Promise.all([
        supabase.from('activities').select('*').eq('deal_id', id).order('created_at', { ascending: false }).limit(30),
        supabase.from('deal_contacts').select('contact_id, contacts(id, first_name, last_name, title, company, phone, email)').eq('deal_id', id).limit(10),
        supabase.from('tasks').select('*').eq('deal_id', id).order('due_date', { ascending: true }).limit(20),
        supabase.from('file_attachments').select('*').eq('deal_id', id).order('created_at', { ascending: false }).limit(20),
      ]);
      setActivities(actsRes.data || []);
      setContacts((ctctsRes.data || []).map(r => r.contacts).filter(Boolean));
      setTasks(tasksRes.data || []);
      setFiles(filesRes.data || []);

      // Load linked property if exists
      if (d?.property_id) {
        const { data: prop } = await supabase.from('properties').select('*').eq('id', d.property_id).single();
        if (prop) setProperty(prop);
      }
    } catch (err) {
      console.error('loadDeal error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStage(newStage) {
    try {
      const supabase = createClient();
      await supabase.from('deals').update({ stage: newStage, updated_at: new Date().toISOString() }).eq('id', id);
      setDeal(d => ({ ...d, stage: newStage }));
      // Log stage change
      await supabase.from('activities').insert({
        deal_id: id,
        activity_type: 'system',
        title: `Stage updated to ${newStage}`,
        created_at: new Date().toISOString(),
      });
      setActivities(prev => [{ activity_type: 'system', title: `Stage updated to ${newStage}`, created_at: new Date().toISOString() }, ...prev]);
    } catch (err) {
      console.error('updateStage error:', err);
    }
  }

  async function logActivity() {
    if (!logNote.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const act = {
        deal_id: id,
        activity_type: logType,
        title: `${logType.charAt(0).toUpperCase() + logType.slice(1)} logged`,
        body: logNote,
        created_at: new Date().toISOString(),
      };
      const { data } = await supabase.from('activities').insert(act).select().single();
      setActivities(prev => [data || act, ...prev]);
      setLogNote('');
    } catch (err) {
      console.error('logActivity error:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-tertiary)' }}>Loading deal…</div>;
  }

  if (!deal) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ color: 'var(--rust)', marginBottom: 12 }}>Deal not found.</div>
        <Link href="/deals" className="cl-btn">← Back to Pipeline</Link>
      </div>
    );
  }

  const showComm = COMMISSION_STAGES.has(deal.stage);
  const showBOV  = BOV_STAGES.has(deal.stage);

  return (
    <div className="cl-page">

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Link href="/deals" style={{ fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>Deal Pipeline</Link>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>›</span>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {deal.deal_name || deal.address || 'Untitled Deal'}
              </h1>
              {deal.deal_type && (
                <span className="cl-badge cl-badge-blue" style={{ fontSize: 10 }}>{deal.deal_type}</span>
              )}
              {deal.priority && (
                <span className={`cl-badge cl-badge-${PRIORITY_COLOR[deal.priority] || 'gray'}`} style={{ fontSize: 10 }}>{deal.priority}</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {deal.address && <span>{deal.address}</span>}
              {deal.city && <span style={{ color: 'var(--text-tertiary)' }}> · {deal.city}</span>}
              {deal.building_sf && <span style={{ color: 'var(--text-tertiary)' }}> · {fmtSF(deal.building_sf)}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setActiveTab('timeline')} className="cl-btn cl-btn--sm">+ Activity</button>
            <button onClick={() => setActiveTab('tasks')} className="cl-btn cl-btn--sm">+ Task</button>
            <button onClick={() => setEditing(true)} className="cl-btn cl-btn--sm cl-btn--primary">Edit Deal</button>
          </div>
        </div>
      </div>

      {/* ── STAGE BREADCRUMB ── */}
      <div className="cl-card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <StageBreadcrumb currentStage={deal.stage} onStageChange={updateStage} />
      </div>

      {/* ── KPI STRIP ── */}
      <div className="cl-kpi-strip" style={{ marginBottom: 16 }}>
        <div className="cl-kpi">
          <div className="cl-kpi-label">Deal Value</div>
          <div className="cl-kpi-value" style={{ color: 'var(--blue2)' }}>{fmtM(deal.deal_value)}</div>
        </div>
        {showComm && (
          <div className="cl-kpi">
            <div className="cl-kpi-label">Commission Est.</div>
            <div className="cl-kpi-value" style={{ color: 'var(--green)' }}>{fmtM(deal.commission_est)}</div>
          </div>
        )}
        <div className="cl-kpi">
          <div className="cl-kpi-label">Probability</div>
          <div className="cl-kpi-value">{deal.probability != null ? `${deal.probability}%` : '—'}</div>
        </div>
        <div className="cl-kpi">
          <div className="cl-kpi-label">Close Date</div>
          <div className="cl-kpi-value" style={{ fontSize: 16 }}>{fmtDate(deal.close_date)}</div>
        </div>
        {deal.building_sf && (
          <div className="cl-kpi">
            <div className="cl-kpi-label">$/SF</div>
            <div className="cl-kpi-value">
              {deal.deal_value && deal.building_sf
                ? `$${Math.round(deal.deal_value / deal.building_sf)}`
                : '—'}
            </div>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div className="cl-tabs" style={{ marginBottom: 16 }}>
        {TABS.filter(t => t.key !== 'bov' || showBOV).map(t => (
          <button
            key={t.key}
            className={`cl-tab ${activeTab === t.key ? 'cl-tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {t.key === 'bov' && (
              <span style={{ marginLeft: 6, fontSize: 9, background: 'var(--blue2)', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>AI</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}

      {/* TIMELINE */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div>
            {/* Log activity */}
            <div className="cl-card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['call','email','note','meeting'].map(t => (
                  <button key={t} onClick={() => setLogType(t)}
                    style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6, border: `1px solid ${logType === t ? 'var(--blue2)' : 'var(--border)'}`, background: logType === t ? 'var(--blue-bg)' : 'transparent', color: logType === t ? 'var(--blue2)' : 'var(--text-secondary)', cursor: 'pointer', textTransform: 'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
              <textarea
                placeholder={`Log a ${logType}…`}
                value={logNote}
                onChange={e => setLogNote(e.target.value)}
                rows={3}
                style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--text-primary)', resize: 'vertical', marginBottom: 8 }}
              />
              <button
                onClick={logActivity}
                disabled={saving || !logNote.trim()}
                className="cl-btn cl-btn--primary cl-btn--sm"
              >
                {saving ? 'Saving…' : 'Log Activity'}
              </button>
            </div>

            {/* Activity feed */}
            <div className="cl-card" style={{ padding: '4px 16px' }}>
              {activities.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No activity yet</div>
              ) : activities.map((a, i) => <ActivityItem key={i} act={a} />)}
            </div>
          </div>

          {/* Deal info sidebar */}
          <div className="cl-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Deal Info</div>
            {[
              { label: 'Stage',       val: deal.stage },
              { label: 'Deal Type',   val: deal.deal_type },
              { label: 'Priority',    val: deal.priority },
              { label: 'Address',     val: deal.address },
              { label: 'City',        val: deal.city },
              { label: 'Building SF', val: fmtSF(deal.building_sf) },
              { label: 'Owner',       val: deal.owner || property?.owner },
              { label: 'Broker',      val: deal.broker },
              { label: 'Created',     val: fmtDate(deal.created_at) },
              { label: 'Updated',     val: fmtDate(deal.updated_at) },
            ].filter(r => r.val).map(r => (
              <div key={r.label} className="cl-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.val}</span>
              </div>
            ))}
            {deal.property_id && (
              <Link href={`/properties/${deal.property_id}`} style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--blue2)', textDecoration: 'none', fontWeight: 600 }}>
                → View Property Record
              </Link>
            )}
            {deal.lead_id && (
              <Link href={`/leads/${deal.lead_id}`} style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--blue2)', textDecoration: 'none', fontWeight: 600 }}>
                → View Original Lead
              </Link>
            )}
          </div>
        </div>
      )}

      {/* UNDERWRITING */}
      {activeTab === 'underwriting' && (
        <div className="cl-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Underwriting model coming soon. Switch to the <strong>BOV Dashboard</strong> tab to generate pricing scenarios.
          </div>
          {!showBOV && (
            <div style={{ padding: '12px 16px', background: 'var(--amber-bg)', border: '1px solid var(--amber)', borderRadius: 8, fontSize: 13, color: 'var(--amber)' }}>
              BOV Dashboard unlocks at <strong>Underwriting</strong> stage and beyond. Current stage: <strong>{deal.stage}</strong>.
            </div>
          )}
        </div>
      )}

      {/* BOV DASHBOARD */}
      {activeTab === 'bov' && showBOV && (
        <BOVGenerator deal={deal} property={property} />
      )}

      {/* CONTACTS */}
      {activeTab === 'contacts' && (
        <div className="cl-card" style={{ padding: 0, overflow: 'hidden' }}>
          {contacts.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13 }}>No contacts linked to this deal yet.</div>
          ) : (
            <table className="cl-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.title || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.company || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.phone || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TASKS */}
      {activeTab === 'tasks' && (
        <div className="cl-card" style={{ padding: 0, overflow: 'hidden' }}>
          {tasks.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13 }}>No tasks for this deal.</div>
          ) : (
            <table className="cl-table">
              <thead>
                <tr><th>Task</th><th>Due Date</th><th>Priority</th><th>Status</th></tr>
              </thead>
              <tbody>
                {tasks.map(t => {
                  const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Done';
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: overdue ? 'var(--rust)' : 'var(--text-secondary)' }}>
                        {fmtDate(t.due_date)}
                        {overdue && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--rust)', fontWeight: 700 }}>OVERDUE</span>}
                      </td>
                      <td><span className={`cl-badge cl-badge-${PRIORITY_COLOR[t.priority] || 'gray'}`}>{t.priority || '—'}</span></td>
                      <td><span className={`cl-badge cl-badge-${t.status === 'Done' ? 'green' : 'gray'}`}>{t.status || 'Open'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* FILES */}
      {activeTab === 'files' && (
        <div className="cl-card" style={{ padding: 0, overflow: 'hidden' }}>
          {files.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13 }}>No files attached. BOV dashboards you save will appear here.</div>
          ) : (
            <table className="cl-table">
              <thead>
                <tr><th>File Name</th><th>Type</th><th>Uploaded</th><th></th></tr>
              </thead>
              <tbody>
                {files.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{f.file_name || 'Untitled'}</td>
                    <td style={{ fontSize: 12 }}><span className="cl-badge cl-badge-blue">{f.file_type || 'file'}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>{fmtDate(f.created_at)}</td>
                    <td>
                      {f.file_url && (
                        <a href={f.file_url} target="_blank" rel="noreferrer" className="cl-table-link" style={{ fontSize: 12 }}>Download</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
}
