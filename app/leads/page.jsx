'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import SlideDrawer from '@/components/SlideDrawer';
import LeadDetail from '@/components/LeadDetail';

const SCORE_COLOR = (score) =>
  score >= 85 ? 'var(--rust)' : score >= 70 ? 'var(--blue)' : score >= 55 ? 'var(--amber)' : 'var(--text-tertiary)';

const MARKET_FILTERS = ['SGV', 'IE West', 'IE East', 'Long Beach', 'OC'];
const CATALYST_FILTERS = ['⚠ WARN', 'Lease Expiry', 'NOD Filed', 'CapEx Signal', 'SLB Potential', 'Owner-User'];
const SIZE_FILTERS = ['50K+ SF', '100K+ SF', '200K+ SF'];

function getCatalystColor(tag) {
  const t = (tag?.tag || tag || '').toLowerCase();
  if (t.includes('warn') || t.includes('distress') || t.includes('nod') || t.includes('bankruptcy')) return { bg: 'var(--rust-bg)', bdr: 'var(--rust-bdr)', color: 'var(--rust)' };
  if (t.includes('lease') || t.includes('expir') || t.includes('capex') || t.includes('vacancy')) return { bg: 'rgba(140,90,4,0.1)', bdr: 'rgba(140,90,4,0.25)', color: 'var(--amber)' };
  if (t.includes('slb') || t.includes('sale-lease') || t.includes('owner-user') || t.includes('long hold')) return { bg: 'rgba(78,110,150,0.1)', bdr: 'rgba(78,110,150,0.25)', color: 'var(--blue)' };
  if (t.includes('m&a') || t.includes('acquisition') || t.includes('infrastructure') || t.includes('bess')) return { bg: 'rgba(88,56,160,0.1)', bdr: 'rgba(88,56,160,0.25)', color: 'var(--purple)' };
  return { bg: 'rgba(78,110,150,0.08)', bdr: 'rgba(78,110,150,0.2)', color: 'var(--blue)' };
}

function parseCatalysts(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch {
      // Plain string tag
      return [{ tag: raw }];
    }
  }
  if (typeof raw === 'object') return [raw];
  return [];
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [activeFilters, setActiveFilters] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('score');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { loadLeads(); }, []);

  async function loadLeads() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('score', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch(e) {
      console.error('Leads error:', e);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  const allLeads = leads.map(l => ({
    ...l,
    _catalysts: parseCatalysts(l.catalyst_tags),
    _hot: (l.score || 0) >= 80,
    _warn: parseCatalysts(l.catalyst_tags).some(t => (t?.tag || t || '').toLowerCase().includes('warn')),
  }));

  const filtered = allLeads.filter(l => {
    if (activeTab === 'hot') return l._hot;
    if (activeTab === 'warn') return l._warn;
    if (activeTab === 'new') return l.stage === 'New';
    if (activeTab === 'researching') return l.stage === 'Researching';
    if (activeTab === 'dm_found') return l.stage === 'Decision Maker Identified';
    if (activeTab === 'contacted') return l.stage === 'Contacted';
    if (activeTab === 'converted') return l.stage === 'Converted';
    return !['Converted', 'Killed'].includes(l.stage);
  }).filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.lead_name || '').toLowerCase().includes(q) ||
           (l.company || '').toLowerCase().includes(q) ||
           (l.address || '').toLowerCase().includes(q) ||
           (l.city || '').toLowerCase().includes(q);
  }).sort((a, b) => {
    if (sort === 'score') return (b.score || 0) - (a.score || 0);
    if (sort === 'date') return new Date(b.created_at) - new Date(a.created_at);
    if (sort === 'followup') return new Date(a.follow_up_date || '9999') - new Date(b.follow_up_date || '9999');
    return 0;
  });

  const hotCount = allLeads.filter(l => l._hot).length;
  const warnCount = allLeads.filter(l => l._warn).length;
  const newCount = allLeads.filter(l => l.stage === 'New').length;
  const convertedCount = allLeads.filter(l => l.stage === 'Converted').length;

  const TABS = [
    { key: 'all', label: 'All', count: allLeads.filter(l => !['Converted','Killed'].includes(l.stage)).length },
    { key: 'new', label: 'New', count: newCount },
    { key: 'researching', label: 'Researching', count: allLeads.filter(l => l.stage === 'Researching').length },
    { key: 'dm_found', label: 'DM Found', count: allLeads.filter(l => l.stage === 'Decision Maker Identified').length },
    { key: 'contacted', label: 'Contacted', count: allLeads.filter(l => l.stage === 'Contacted').length },
    { key: 'hot', label: '⚡ Hot A+/A', count: hotCount, hot: true },
    { key: 'warn', label: '⚠ WARN', count: warnCount, warn: true },
    { key: 'converted', label: 'Converted', count: convertedCount },
  ];

  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>

      {/* PAGE HEADER */}
      <div style={{ padding: '22px 0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Lead <em style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue)', fontSize: 36, fontWeight: 400 }}>Gen</em>
          </h1>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--text-tertiary)', marginTop: 4 }}>
            {loading ? 'Loading…' : `${allLeads.filter(l => !['Converted','Killed'].includes(l.stage)).length} leads · ${hotCount} hot · ${warnCount} WARN signals`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company, address…"
            style={{ padding: '7px 13px', borderRadius: 8, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)', outline: 'none', width: 240 }}
          />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--card-border)', background: 'var(--card-bg)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', outline: 'none' }}
          >
            <option value="score">Sort: Score</option>
            <option value="date">Sort: Date Added</option>
            <option value="followup">Sort: Follow-up</option>
          </select>
          <button
            className="cl-btn cl-btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ fontSize: 13 }}
          >
            + New Lead
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '◉', label: 'Total Leads', val: allLeads.filter(l => !['Converted','Killed'].includes(l.stage)).length, color: 'blue' },
          { icon: '⚡', label: 'Hot — A+/A', val: hotCount, color: 'rust' },
          { icon: '⚠', label: 'WARN Matched', val: warnCount, color: 'amber' },
          { icon: '◈', label: 'Converted', val: convertedCount, color: 'green' },
          { icon: '↗', label: 'New This Week', val: allLeads.filter(l => { const d = new Date(l.created_at); const week = new Date(); week.setDate(week.getDate()-7); return d > week; }).length, color: 'purple' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--card-bg)', borderRadius: 10, border: '1px solid var(--card-border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--card-shadow)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: `var(--${k.color}-bg)`, color: `var(--${k.color})`, flexShrink: 0 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: k.color === 'rust' ? 'var(--rust)' : 'var(--text-primary)', lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', marginBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '9px 14px', fontSize: 13.5, cursor: 'pointer',
              borderBottom: activeTab === t.key ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: -1, background: 'none', border: 'none',
              borderBottomWidth: 2, borderBottomStyle: 'solid',
              borderBottomColor: activeTab === t.key ? 'var(--blue)' : 'transparent',
              color: activeTab === t.key ? 'var(--blue)' : 'var(--text-tertiary)',
              fontWeight: activeTab === t.key ? 500 : 400,
              fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
            }}>
            {t.label}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              background: t.warn ? 'var(--rust-bg)' : t.hot ? 'var(--rust-bg)' : 'rgba(0,0,0,0.06)',
              border: `1px solid ${t.warn || t.hot ? 'var(--rust-bdr)' : 'rgba(0,0,0,0.1)'}`,
              color: t.warn || t.hot ? 'var(--rust)' : 'var(--text-tertiary)',
              borderRadius: 20, padding: '1px 6px',
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '0 0 12px 12px', border: '1px solid var(--card-border)', borderTop: 'none', overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.025)', borderBottom: '1px solid var(--card-border)' }}>
              {['Score', 'Company / Address', 'City', 'SF', 'Stage', 'Catalysts', 'Follow Up', 'Contact', ''].map((h, i) => (
                <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}>
                <div className="cl-loading" style={{ padding: 48 }}><div className="cl-spinner" />Loading leads…</div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="cl-empty" style={{ padding: 56 }}>
                  <div className="cl-empty-label">No leads found</div>
                  <div className="cl-empty-sub">Add your first lead or import from CSV</div>
                </div>
              </td></tr>
            ) : filtered.map((l, i) => (
              <LeadRow
                key={l.id}
                lead={l}
                isLast={i === filtered.length - 1}
                onClick={() => setSelectedLead(l)}
                onFullPage={() => router.push(`/leads/${l.id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* SLIDE DRAWER */}
      <SlideDrawer
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        fullPageHref={selectedLead ? `/leads/${selectedLead.id}` : undefined}
        title={selectedLead?.lead_name || selectedLead?.company || 'Lead'}
        subtitle={selectedLead ? [selectedLead.address, selectedLead.city].filter(Boolean).join(' · ') : ''}
        badge={{ label: selectedLead?.stage || 'Lead', color: 'blue' }}
      >
        {selectedLead && (
          <LeadDetail
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onRefresh={loadLeads}
          />
        )}
      </SlideDrawer>

      {/* ADD LEAD MODAL */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); loadLeads(); }}
        />
      )}
    </div>
  );
}

// ── LEAD ROW ──────────────────────────────────────────────────
function LeadRow({ lead: l, isLast, onClick, onFullPage }) {
  const [hover, setHover] = useState(false);
  const score = l.score || 0;
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : 'C';
  const cats = l._catalysts || [];
  const isWarn = l._warn;
  const isHot = l._hot;

  const rowBg = isWarn
    ? (hover ? '#FFF1EC' : '#FFF9F7')
    : isHot
    ? (hover ? '#EDF3FA' : '#F5F9FD')
    : hover ? 'rgba(78,110,150,0.03)' : 'transparent';

  const stageColors = {
    'New': { bg: 'rgba(78,110,150,0.08)', color: 'var(--blue)', border: 'rgba(78,110,150,0.2)' },
    'Researching': { bg: 'rgba(140,90,4,0.08)', color: 'var(--amber)', border: 'rgba(140,90,4,0.2)' },
    'Decision Maker Identified': { bg: 'rgba(88,56,160,0.08)', color: 'var(--purple)', border: 'rgba(88,56,160,0.2)' },
    'Contacted': { bg: 'rgba(24,112,66,0.08)', color: 'var(--green)', border: 'rgba(24,112,66,0.2)' },
    'Converted': { bg: 'rgba(24,112,66,0.12)', color: 'var(--green)', border: 'rgba(24,112,66,0.3)' },
  };
  const stageStyle = stageColors[l.stage] || stageColors['New'];

  const followUpDate = l.follow_up_date ? new Date(l.follow_up_date) : null;
  const isOverdue = followUpDate && followUpDate < new Date();

  return (
    <tr
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.05)', background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Score */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', width: 64 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {score > 0 ? (
            <>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: isWarn ? 'var(--rust)' : SCORE_COLOR(score), lineHeight: 1 }}>{score}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isWarn ? 'var(--rust)' : SCORE_COLOR(score), marginTop: 1 }}>{grade}</div>
            </>
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>—</div>
          )}
        </div>
      </td>

      {/* Company */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: isWarn ? 'var(--rust)' : 'var(--text-primary)', marginBottom: 2 }}>
          {l.lead_name || l.company || '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {l.company && l.company !== l.lead_name ? l.company : l.address || ''}
        </div>
      </td>

      {/* City */}
      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {l.city || '—'}
      </td>

      {/* SF */}
      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {l.building_sf ? Number(l.building_sf).toLocaleString() : '—'}
      </td>

      {/* Stage */}
      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 500, background: stageStyle.bg, color: stageStyle.color, border: `1px solid ${stageStyle.border}`, fontFamily: 'var(--font-mono)' }}>
          {l.stage || 'New'}
        </span>
      </td>

      {/* Catalysts */}
      <td style={{ padding: '12px 14px', maxWidth: 240 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {cats.slice(0, 3).map((c, ci) => {
            const cs = getCatalystColor(c);
            const label = c?.tag || c;
            return (
              <span key={ci} style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 500, border: `1px solid ${cs.bdr}`, background: cs.bg, color: cs.color }}>
                {label}
              </span>
            );
          })}
          {cats.length > 3 && (
            <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', padding: '2px 4px' }}>+{cats.length - 3}</span>
          )}
        </div>
      </td>

      {/* Follow up */}
      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap', color: isOverdue ? 'var(--rust)' : 'var(--text-tertiary)' }}>
        {followUpDate ? (
          <span>
            {isOverdue ? '⚠ ' : ''}
            {followUpDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : '—'}
      </td>

      {/* Contact */}
      <td style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
        {l.decision_maker || l.contact_name || '—'}
        {l.phone && <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 1 }}>{l.phone}</div>}
      </td>

      {/* Actions */}
      <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 4, opacity: hover ? 1 : 0, transition: 'opacity 0.1s' }}>
          {l.phone && (
            <a href={`tel:${l.phone}`} style={{ padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500, border: '1px solid var(--blue-bdr)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer', fontFamily: 'var(--font-ui)', textDecoration: 'none' }}>
              📞
            </a>
          )}
          <button
            onClick={() => onFullPage()}
            style={{ padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500, border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
          >
            Open →
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── ADD LEAD MODAL ────────────────────────────────────────────
function AddLeadModal({ onClose, onSuccess }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    lead_name: '', company: '', address: '', city: '',
    market: '', building_sf: '', stage: 'New', priority: 'Medium',
    owner_type: '', source: '', score: 60, notes: '',
  });

  async function handleSave() {
    if (!form.lead_name.trim()) { alert('Lead name is required'); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('leads').insert({
        lead_name: form.lead_name,
        company: form.company || form.lead_name,
        address: form.address || null,
        city: form.city || null,
        market: form.market || null,
        building_sf: form.building_sf ? parseInt(form.building_sf.replace(/,/g,'')) : null,
        stage: form.stage,
        priority: form.priority,
        owner_type: form.owner_type || null,
        source: form.source || null,
        score: Number(form.score),
        notes: form.notes || null,
      });
      if (error) throw error;
      onSuccess();
    } catch(e) {
      alert('Error saving lead: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.025)', fontFamily: 'var(--font-ui)', fontSize: 13.5, color: 'var(--text-primary)', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg)', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '18px 24px', borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Add New Lead</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-tertiary)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Lead / Company Name *</label>
            <input style={inputStyle} value={form.lead_name} onChange={e => setForm(f => ({ ...f, lead_name: e.target.value }))} placeholder="e.g. Leegin Creative Leather" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Market</label>
              <select style={inputStyle} value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))}>
                <option value="">Select…</option>
                <option>SGV</option><option>IE West</option><option>IE East</option><option>Long Beach</option><option>OC</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Building SF</label>
              <input style={inputStyle} value={form.building_sf} onChange={e => setForm(f => ({ ...f, building_sf: e.target.value }))} placeholder="e.g. 186,400" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Stage</label>
              <select style={inputStyle} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                {['New', 'Researching', 'Decision Maker Identified', 'Contacted', 'Converted'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Owner Type</label>
              <select style={inputStyle} value={form.owner_type} onChange={e => setForm(f => ({ ...f, owner_type: e.target.value }))}>
                <option value="">Select…</option>
                <option>Owner-User</option><option>Private LLC</option><option>Family Trust</option><option>Corp</option><option>REIT</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Source</label>
              <select style={inputStyle} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                <option value="">Select…</option>
                <option>Broker intel</option><option>WARN filing</option><option>CapEx permit</option><option>NOD filing</option><option>Grapevine</option><option>CoStar</option><option>Direct</option><option>Research Campaign</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Lead Score (1–100): <strong style={{ color: 'var(--blue)' }}>{form.score}</strong></label>
            <input type="range" min={1} max={100} value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} style={{ width: '100%', accentColor: 'var(--blue)' }} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Research notes, context, source details…" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="cl-btn cl-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="cl-btn cl-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Lead'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
