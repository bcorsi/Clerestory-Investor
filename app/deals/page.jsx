'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import SlideDrawer from '@/components/SlideDrawer';

// ─── STAGE CONFIG ─────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'Tracking',           label: 'Tracking',       color: '#6B7280', bg: 'rgba(107,114,128,0.07)', topBorder: '#9CA3AF' },  // neutral gray
  { key: 'Underwriting',       label: 'Underwriting',   color: '#7C3AED', bg: 'rgba(124,58,237,0.07)', topBorder: '#7C3AED' },  // electric violet
  { key: 'Off-Market Outreach',label: 'Off-Market',     color: '#0891B2', bg: 'rgba(8,145,178,0.07)',  topBorder: '#0891B2' },  // cyan
  { key: 'Marketing',          label: 'Marketing',      color: '#D97706', bg: 'rgba(217,119,6,0.08)',  topBorder: '#D97706' },  // amber/gold
  { key: 'LOI',                label: 'LOI',            color: '#DC2626', bg: 'rgba(220,38,38,0.07)',  topBorder: '#DC2626' },  // red
  { key: 'LOI Accepted',       label: 'LOI Accepted',   color: '#059669', bg: 'rgba(5,150,105,0.08)',  topBorder: '#059669' },  // emerald
  { key: 'PSA Negotiation',    label: 'PSA / Non-Cont', color: '#BE185D', bg: 'rgba(190,24,93,0.07)',  topBorder: '#BE185D' },  // hot pink
  { key: 'Due Diligence',      label: 'Due Diligence',  color: '#1D4ED8', bg: 'rgba(29,78,216,0.07)',  topBorder: '#1D4ED8' },  // deep blue
];

const COMMISSION_STAGES = new Set(['LOI Accepted','PSA Negotiation','Due Diligence','Non-Contingent','Closed Won']);

// ─── PROPERTY TYPES & SUBTYPES ───────────────────────────────────────────────

const PROP_TYPES = ['Industrial', 'Land', 'Office', 'Flex', 'Land/IOS', 'Office/Flex'];

const PROP_SUBTYPES = [
  'Warehouse', 'Distribution', 'Warehouse/Dist.', 'Manufacturing',
  'Light Industrial', 'Business Park', 'IOS', 'Charging Station',
  'Covered Land', 'Food Processing', 'Cold Storage',
];

const SUBTYPE_BY_TYPE = {
  'Industrial':   ['Warehouse','Distribution','Warehouse/Dist.','Manufacturing','Light Industrial','Business Park','Food Processing','Cold Storage'],
  'Land':         ['IOS','Covered Land','Charging Station'],
  'Land/IOS':     ['IOS','Covered Land','Charging Station'],
  'Office':       [],
  'Flex':         ['Light Industrial','Warehouse'],
  'Office/Flex':  ['Light Industrial'],
};

// ─── PROPERTY TYPES & SUBTYPES ───────────────────────────────────────────────
// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtM(n) {
  if (!n && n !== 0) return null;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function daysAgo(d) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d)) / 864e5);
}

// ─── DAYS CHIP ────────────────────────────────────────────────────────────────

function DaysChip({ days }) {
  if (days === null || days === undefined) return null;
  const danger = days >= 30;
  const warn   = days >= 14;
  const style  = danger
    ? { background: 'rgba(184,55,20,0.09)', border: '1px solid rgba(184,55,20,0.28)', color: '#B83714' }
    : warn
    ? { background: 'rgba(140,90,4,0.09)',  border: '1px solid rgba(140,90,4,0.28)',  color: '#8C5A04' }
    : { background: 'rgba(0,0,0,0.04)',     border: '1px solid rgba(0,0,0,0.07)',      color: '#6E6860' };
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 20, letterSpacing: '0.04em', flexShrink: 0, ...style }}>
      {days}d{danger ? ' ⚠' : ''}
    </span>
  );
}

// ─── DEAL CARD ────────────────────────────────────────────────────────────────

function DealCard({ deal, stage, onOpen }) {
  const days       = daysAgo(deal.updated_at);
  const showComm   = COMMISSION_STAGES.has(deal.stage);
  const probColor  = (deal.probability >= 70) ? '#156636' : (deal.probability >= 40) ? '#8C5A04' : '#AFA89E';
  const typeLabel  = deal.deal_type || deal.strategy;

  // Deal type tags — steel blue family, neutral
  const TAG_STYLE = {
    'Disposition':       { bg: 'rgba(78,110,150,0.08)',  bdr: 'rgba(78,110,150,0.25)',  color: '#4E6E96' },
    'Investment Sale':   { bg: 'rgba(78,110,150,0.08)',  bdr: 'rgba(78,110,150,0.25)',  color: '#4E6E96' },
    'Owner-User Sale':   { bg: 'rgba(78,110,150,0.08)',  bdr: 'rgba(78,110,150,0.25)',  color: '#4E6E96' },
    'Sale Listing':      { bg: 'rgba(78,110,150,0.08)',  bdr: 'rgba(78,110,150,0.25)',  color: '#4E6E96' },
    'Acquisition':       { bg: 'rgba(88,56,160,0.08)',   bdr: 'rgba(88,56,160,0.22)',   color: '#5838A0' },  // violet — buy side
    'Buyer Rep':         { bg: 'rgba(88,56,160,0.08)',   bdr: 'rgba(88,56,160,0.22)',   color: '#5838A0' },  // violet — buy side
    'SLB Advisory':      { bg: 'rgba(21,102,54,0.08)',   bdr: 'rgba(21,102,54,0.22)',   color: '#156636' },  // green — SLB
    'Sale-Leaseback':    { bg: 'rgba(21,102,54,0.08)',   bdr: 'rgba(21,102,54,0.22)',   color: '#156636' },  // green — SLB
    'Development':       { bg: 'rgba(194,65,12,0.08)',   bdr: 'rgba(194,65,12,0.22)',   color: '#C2410C' },  // orange — dev
    'Lease Rep':         { bg: 'rgba(140,90,4,0.08)',    bdr: 'rgba(140,90,4,0.22)',    color: '#8C5A04' },  // amber — lease
  };
  const ts = TAG_STYLE[typeLabel] || TAG_STYLE['Disposition'];

  return (
    <div
      onClick={() => onOpen(deal)}
      style={{
        background: '#fff',
        borderRadius: 8,
        border: '1px solid rgba(0,0,0,0.07)',
        borderTop: `3px solid ${stage.topBorder}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        padding: '10px 11px',
        marginBottom: 7,
        cursor: 'pointer',
        transition: 'box-shadow .12s, transform .12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Type label + days */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6E6860', fontFamily: 'var(--font-mono)' }}>
          {[deal.underwriting_inputs?.prop_subtype || deal.underwriting_inputs?.prop_type, typeLabel].filter(Boolean).join(' · ') || 'Industrial'}
        </span>
        <DaysChip days={days} />
      </div>

      {/* Deal name */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2822', lineHeight: 1.3, marginBottom: 2 }}>
        {deal.deal_name || deal.address}
      </div>

      {/* Address */}
      {deal.address && deal.deal_name && (
        <div style={{ fontSize: 11, color: '#6E6860', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {deal.address}{deal.submarket ? ` · ${deal.submarket}` : ''}
        </div>
      )}

      {/* Value + prob % */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 19, fontWeight: 700, color: '#0F0D09', lineHeight: 1, letterSpacing: '-0.01em' }}>
          {fmtM(deal.deal_value) || <span style={{ fontSize: 13, color: '#AFA89E', fontFamily: 'inherit' }}>—</span>}
        </div>
        {deal.probability != null && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: probColor, fontWeight: 600 }}>
            {deal.probability}%
          </span>
        )}
      </div>

      {/* Prob bar */}
      {deal.probability != null && (
        <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden', marginBottom: 7 }}>
          <div style={{ height: '100%', width: `${deal.probability}%`, background: probColor, borderRadius: 2 }} />
        </div>
      )}

      {/* Commission chip */}
      {showComm && deal.commission_est && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', background: 'rgba(21,102,54,0.07)', border: '1px solid rgba(21,102,54,0.22)', borderRadius: 5, marginBottom: 7 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#156636', fontFamily: 'var(--font-mono)' }}>Comm. Est.</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#156636' }}>~{fmtM(deal.commission_est)}</span>
        </div>
      )}

      {/* Tags */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
        {typeLabel && (
          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 3, border: `1px solid ${ts.bdr}`, background: ts.bg, color: ts.color }}>
            {typeLabel === 'SLB Advisory' || typeLabel === 'Sale-Leaseback' ? 'SLB' : typeLabel}
          </span>
        )}
        {/* Priority — System 2: square chip + left border, jewel tones */}
        {deal.priority === 'Critical' && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px 2px 5px', borderRadius: 4, borderLeft: '3px solid #7C3AED', background: '#EDE9FE', color: '#6D28D9' }}>Critical</span>
        )}
        {deal.priority === 'High' && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px 2px 5px', borderRadius: 4, borderLeft: '3px solid #DB2777', background: '#FCE7F3', color: '#BE185D' }}>High</span>
        )}
      </div>
    </div>
  );
}

// ─── KANBAN COL ───────────────────────────────────────────────────────────────

function KanbanCol({ stage, deals, onOpen }) {
  const stageDeals = deals.filter(d => d.stage === stage.key);
  const totalVal   = stageDeals.reduce((a, d) => a + (d.deal_value || 0), 0);

  return (
    <div style={{ flex: '0 0 232px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '8px 10px', borderRadius: '7px 7px 0 0', background: stage.bg, marginBottom: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: stage.color }}>
          {stage.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {totalVal > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: stage.color, opacity: 0.75 }}>
              {fmtM(totalVal)}
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: 20, color: stage.color }}>
            {stageDeals.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1 }}>
        {stageDeals.length === 0 ? (
          <div style={{ padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4BFBA', marginBottom: 4 }}>Empty</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, fontStyle: 'italic', color: '#C4BFBA', lineHeight: 1.5 }}>
              No deals in this stage
            </div>
          </div>
        ) : stageDeals.map(deal => (
          <DealCard key={deal.id} deal={deal} stage={stage} onOpen={onOpen} />
        ))}
      </div>

      {/* Add deal */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34, borderRadius: 6, border: '1.5px dashed rgba(0,0,0,0.10)', color: '#AFA89E', fontSize: 11.5, cursor: 'pointer', marginTop: 2, transition: 'all .1s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(78,110,150,0.30)'; e.currentTarget.style.color = '#4E6E96'; e.currentTarget.style.background = 'rgba(78,110,150,0.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'; e.currentTarget.style.color = '#AFA89E'; e.currentTarget.style.background = 'transparent'; }}
      >
        + Add Deal
      </div>
    </div>
  );
}

// ─── NEW DEAL MODAL ───────────────────────────────────────────────────────────

function NewDealModal({ onClose, onCreated }) {
  const router  = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({
    deal_name: '', deal_type: 'Disposition', stage: 'Tracking',
    priority: 'Medium', address: '', submarket: '', market: 'SGV',
    prop_type: 'Industrial', prop_subtype: '',
    deal_value: '', commission_rate: '1.75', notes: '',
  });

  const inp = { width: '100%', fontFamily: 'inherit', fontSize: 13, padding: '7px 10px', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 7, background: '#F4F1EC', color: '#0F0D09', outline: 'none' };
  const lbl = { display: 'block', fontSize: 10, fontWeight: 600, color: '#524D46', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 };

  async function save() {
    if (!form.deal_name.trim()) { alert('Deal name required.'); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const val = form.deal_value ? parseFloat(form.deal_value.replace(/[$,]/g, '')) : null;
      const commEst = val && form.commission_rate ? val * parseFloat(form.commission_rate) / 100 : null;
      const { data, error } = await supabase.from('deals').insert({
        deal_name:       form.deal_name,
        deal_type:       form.deal_type,
        stage:           form.stage,
        priority:        form.priority,
        address:         form.address || null,
        submarket:       form.submarket || null,
        market:          form.market || null,
        deal_value:      val,
        commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : null,
        commission_est:  commEst,
        notes:           form.notes || null,
        created_at:      new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      onCreated(data);
      onClose();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ background: '#EAE6DF', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0F0D09' }}>New Deal</div>
          <button onClick={onClose} style={{ fontSize: 20, color: '#6E6860', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={lbl}>Deal Name *</label>
            <input style={inp} value={form.deal_name} onChange={e => setForm(f => ({ ...f, deal_name: e.target.value }))} placeholder="e.g. Puente Hills Business Park" autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Deal Type</label>
              <select style={inp} value={form.deal_type} onChange={e => setForm(f => ({ ...f, deal_type: e.target.value }))}>
                {['Disposition','Acquisition','SLB Advisory','Sale-Leaseback','Investment Sale','Owner-User Sale','Development','Lease Rep','Buyer Rep','Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Stage</label>
              <select style={inp} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Priority</label>
              <select style={inp} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Market</label>
              <select style={inp} value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))}>
                {['SGV','IE West','SGV East','SGV West','IE','LA County'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Address</label>
            <input style={inp} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Property Type</label>
              <select style={inp} value={form.prop_type} onChange={e => setForm(f => ({ ...f, prop_type: e.target.value, prop_subtype: '' }))}>
                {PROP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Property Subtype</label>
              <select style={inp} value={form.prop_subtype} onChange={e => setForm(f => ({ ...f, prop_subtype: e.target.value }))}>
                <option value="">— select —</option>
                {(SUBTYPE_BY_TYPE[form.prop_type] || PROP_SUBTYPES).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Deal Value ($)</label>
              <input style={inp} value={form.deal_value} onChange={e => setForm(f => ({ ...f, deal_value: e.target.value }))} placeholder="e.g. 10900000" />
            </div>
            <div>
              <label style={lbl}>Commission Rate (%)</label>
              <input style={inp} type="number" step="0.25" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Initial notes…" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
            <button onClick={onClose} style={{ fontFamily: 'inherit', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.10)', background: '#fff', color: '#524D46', cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 7, border: 'none', background: '#4E6E96', color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creating…' : '+ Create Deal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [view, setView]         = useState('kanban');
  const [kpis, setKpis]         = useState(null);
  const [showNew, setShowNew]   = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('deals')
        .select('id,deal_name,stage,deal_type,strategy,priority,deal_value,commission_est,commission_rate,probability,close_date,updated_at,created_at,address,submarket,market,notes,underwriting_inputs')
        .neq('stage', 'Closed Won').neq('stage', 'Closed Lost').neq('stage', 'Dead')
        .order('updated_at', { ascending: false });

      const d = data || [];
      const totalVal = d.reduce((a, x) => a + (x.deal_value || 0), 0);
      // Weighted commission — only deals with both commission_est AND probability
      const wtdComm  = d.reduce((a, x) => {
        if (x.commission_est && x.probability != null) return a + (x.commission_est * x.probability / 100);
        return a;
      }, 0);
      const loiCount     = d.filter(x => ['LOI','LOI Accepted'].includes(x.stage)).length;
      setKpis({ count: d.length, totalVal, wtdComm, loiCount });
      setDeals(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? deals.filter(d => [d.deal_name, d.address, d.submarket, d.market, d.deal_type]
        .filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    : deals;

  return (
    <div style={{ fontFamily: "'Instrument Sans', sans-serif", background: '#F4F1EC', minHeight: '100vh' }}>

      {/* ── PAGE HEADER — title + controls in one row ── */}
      <div style={{ padding: '20px 28px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 300, color: '#0F0D09', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Deal{' '}
            <em style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', color: '#6480A2', fontSize: 32, fontWeight: 400 }}>Pipeline</em>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic', color: '#6E6860', marginTop: 4 }}>
            {loading ? 'Loading…' : `${kpis?.count ?? 0} active deals · ${fmtM(kpis?.totalVal) ?? '—'} total · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Board/List toggle */}
          <div style={{ display: 'flex', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 7, overflow: 'hidden' }}>
            {[{ v: 'kanban', label: '⊞ Board' }, { v: 'list', label: '≡ List' }].map(btn => (
              <button key={btn.v} onClick={() => setView(btn.v)}
                style={{ padding: '6px 12px', fontSize: 12, fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer', border: 'none', background: view === btn.v ? '#4E6E96' : '#fff', color: view === btn.v ? '#fff' : '#6E6860', transition: 'all .1s' }}>
                {btn.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 7, padding: '6px 11px', width: 200 }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#AFA89E" strokeWidth="1.4"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5L13 13"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals…"
              style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13, color: '#2C2822', width: '100%' }} />
          </div>
          {/* New Deal */}
          <button onClick={() => setShowNew(true)}
            style={{ padding: '7px 14px', background: '#4E6E96', color: '#fff', border: 'none', borderRadius: 7, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(78,110,150,0.25)', whiteSpace: 'nowrap' }}>
            + New Deal
          </button>
        </div>
      </div>

      <div style={{ padding: '0 28px 60px' }}>

        {/* ── KPI STRIP ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { icon: '◈', iconBg: 'rgba(78,110,150,0.09)',  iconColor: '#4E6E96', val: kpis?.count ?? '—',          lbl: 'Active Deals' },
            { icon: '$', iconBg: 'rgba(78,110,150,0.09)',  iconColor: '#4E6E96', val: fmtM(kpis?.totalVal) ?? '—', lbl: 'Total Value' },
            { icon: '↗', iconBg: 'rgba(21,102,54,0.08)',   iconColor: '#156636', val: kpis?.wtdComm > 0 ? fmtM(Math.round(kpis.wtdComm)) : '—', lbl: 'Wtd. Commission', green: true },
            { icon: '◉', iconBg: 'rgba(140,90,4,0.09)',    iconColor: '#8C5A04', val: kpis?.loiCount ?? '—',       lbl: 'In LOI / Accepted' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 9, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 34, height: 34, borderRadius: 7, background: k.iconBg, color: k.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                {k.icon}
              </div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: k.green ? '#156636' : k.rust ? '#B83714' : '#0F0D09', lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {loading ? '—' : k.val}
                </div>
                <div style={{ fontSize: 11, color: '#524D46', marginTop: 2 }}>{k.lbl}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── KANBAN ── */}
        {view === 'kanban' && (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {loading ? (
              <div style={{ padding: 40, color: '#6E6860', fontSize: 13, fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic' }}>Loading pipeline…</div>
            ) : STAGES.map(stage => (
              <KanbanCol key={stage.key} stage={stage} deals={filtered} onOpen={deal => router.push(`/deals/${deal.id}`)} />
            ))}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div style={{ overflowX: 'auto', borderRadius: 9, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: 12.5 }}>
              <thead>
                <tr>
                  {['Deal Name','Stage','Value','Commission','Prob.','Address','Bldg SF','Land AC','Coverage','Close Date','Updated'].map(h => (
                    <th key={h} style={{ background: 'rgba(0,0,0,0.025)', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: '#6E6860', textTransform: 'uppercase', padding: '9px 12px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6E6860', fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic' }}>No active deals.</td></tr>
                ) : filtered.map(deal => {
                  const showComm = COMMISSION_STAGES.has(deal.stage);
                  const stg      = STAGES.find(s => s.key === deal.stage);
                  const days     = daysAgo(deal.updated_at);
                  return (
                    <tr key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
                      style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,110,150,0.025)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: '#4E6E96' }}>
                        {deal.deal_name || deal.address || '(untitled)'}
                        {deal.deal_type && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(78,110,150,0.09)', color: '#4E6E96', border: '1px solid rgba(78,110,150,0.2)' }}>{deal.deal_type}</span>}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        {stg && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: stg.bg, color: stg.color }}>{deal.stage}</span>}
                      </td>
                      <td style={{ padding: '9px 12px', fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700 }}>{fmtM(deal.deal_value) || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>
                        {showComm && deal.commission_est
                          ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#156636', background: 'rgba(21,102,54,0.08)', padding: '2px 7px', borderRadius: 20 }}>{fmtM(deal.commission_est)}</span>
                          : <span style={{ color: '#C4BFBA' }}>—</span>}
                      </td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: deal.probability >= 70 ? '#156636' : deal.probability >= 40 ? '#8C5A04' : '#6E6860' }}>
                        {deal.probability != null ? `${deal.probability}%` : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', color: '#6E6860', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.address || '—'}{deal.submarket ? <span style={{ color: '#AFA89E' }}> · {deal.submarket}</span> : ''}
                      </td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6E6860', whiteSpace: 'nowrap' }}>
                        {deal.underwriting_inputs?.building_sf ? Number(deal.underwriting_inputs.building_sf).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6E6860', whiteSpace: 'nowrap' }}>
                        {deal.underwriting_inputs?.land_acres ? `${deal.underwriting_inputs.land_acres} AC` : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6E6860', whiteSpace: 'nowrap' }}>
                        {deal.underwriting_inputs?.building_sf && deal.underwriting_inputs?.land_acres
                          ? `${((deal.underwriting_inputs.building_sf / (deal.underwriting_inputs.land_acres * 43560)) * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6E6860' }}>
                        {deal.close_date ? new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: days >= 14 ? '#8C5A04' : '#AFA89E' }}>
                        {days !== null ? `${days}d ago` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DEAL DRAWER ── */}
      <SlideDrawer
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        fullPageHref={selectedDeal ? `/deals/${selectedDeal.id}` : undefined}
        title={selectedDeal?.deal_name || selectedDeal?.address || ''}
        subtitle={[selectedDeal?.stage, selectedDeal?.deal_value ? (selectedDeal.deal_value >= 1e6 ? `$${(selectedDeal.deal_value/1e6).toFixed(1)}M` : `$${(selectedDeal.deal_value/1e3).toFixed(0)}K`) : null].filter(Boolean).join(' · ')}
        badge={selectedDeal?.priority ? { label: selectedDeal.priority, color: selectedDeal.priority === 'High' || selectedDeal.priority === 'Critical' ? 'rust' : 'gray' } : undefined}
      >
        {selectedDeal && (
          <div style={{ padding: 24, fontFamily: "'Instrument Sans', sans-serif" }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#0F0D09', marginBottom: 4 }}>{selectedDeal.deal_name || selectedDeal.address}</div>
              <div style={{ fontSize: 13, color: '#6E6860' }}>{selectedDeal.address}{selectedDeal.submarket ? ` · ${selectedDeal.submarket}` : ''}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { l: 'Stage',      v: selectedDeal.stage },
                { l: 'Deal Type',  v: selectedDeal.deal_type },
                { l: 'Value',      v: selectedDeal.deal_value ? (selectedDeal.deal_value >= 1e6 ? '$'+(selectedDeal.deal_value/1e6).toFixed(1)+'M' : '$'+(selectedDeal.deal_value/1e3).toFixed(0)+'K') : '—' },
                { l: 'Probability',v: selectedDeal.probability != null ? selectedDeal.probability+'%' : '—' },
                { l: 'Close Date', v: selectedDeal.close_date ? new Date(selectedDeal.close_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—' },
                { l: 'Priority',   v: selectedDeal.priority },
              ].map((r,i) => (
                <div key={i} style={{ background: '#F4F1EC', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#6E6860', marginBottom: 4 }}>{r.l}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F0D09' }}>{r.v || '—'}</div>
                </div>
              ))}
            </div>
            {selectedDeal.notes && (
              <div style={{ background: '#F4F1EC', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#524D46', lineHeight: 1.6 }}>
                {selectedDeal.notes}
              </div>
            )}
            <a href={'/deals/'+selectedDeal.id} style={{ display: 'block', textAlign: 'center', padding: '10px 0', background: '#4E6E96', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'inherit' }}>
              Open Full Deal Detail →
            </a>
          </div>
        )}
      </SlideDrawer>

      {/* ── NEW DEAL MODAL ── */}
      {showNew && (
        <NewDealModal
          onClose={() => setShowNew(false)}
          onCreated={newDeal => {
            setDeals(prev => [newDeal, ...prev]);
            setShowNew(false);
            router.push(`/deals/${newDeal.id}`);
          }}
        />
      )}
    </div>
  );
}
