'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import SlideDrawer from '@/components/SlideDrawer';
import LeadDetail from '@/components/LeadDetail';
import { getCatalystStyle, getScoreRing, CATALYST_TAGS } from '@/lib/catalyst-constants';

// ── PARSE CATALYSTS — handles all storage formats including double-encoded ──
function parseCatalysts(raw) {
  if (!raw) return [];

  // Already an array
  if (Array.isArray(raw)) {
    return raw.flatMap(c => {
      if (typeof c === 'string') {
        try {
          const p = JSON.parse(c);
          if (Array.isArray(p)) return p.map(x => typeof x === 'object' && x.tag ? x : { tag: String(x) });
          return typeof p === 'object' && p.tag ? [p] : [{ tag: c }];
        } catch { return [{ tag: c }]; }
      }
      return typeof c === 'object' && c !== null && c.tag ? [c] : [{ tag: String(c) }];
    });
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    try {
      const p = JSON.parse(trimmed);
      if (Array.isArray(p)) {
        return p.flatMap(c => {
          if (typeof c === 'string') {
            try {
              const inner = JSON.parse(c);
              if (Array.isArray(inner)) return inner.map(x => typeof x === 'object' && x.tag ? x : { tag: String(x) });
              return typeof inner === 'object' && inner.tag ? [inner] : [{ tag: c }];
            } catch { return [{ tag: c }]; }
          }
          return typeof c === 'object' && c !== null && c.tag ? [c] : [{ tag: String(c) }];
        });
      }
      if (typeof p === 'object' && p !== null && p.tag) return [p];
      if (typeof p === 'string') return [{ tag: p }];
    } catch {
      return [{ tag: trimmed }];
    }
  }

  if (typeof raw === 'object' && raw !== null && raw.tag) return [raw];
  return [];
}

// Normalize stage — "Lead" is not a valid stage
function normalizeStage(stage) {
  if (!stage || stage === 'Lead') return 'New';
  return stage;
}

const STAGE_TABS = ['All', 'New', 'Researching', 'Decision Maker Identified', 'Contacted', 'Converted'];

const PRIORITY_COLORS = {
  Critical: { bg: 'rgba(184,55,20,0.12)', color: 'var(--rust)',          border: 'rgba(184,55,20,0.25)' },
  High:     { bg: 'rgba(168,112,16,0.10)', color: 'var(--amber)',         border: 'rgba(168,112,16,0.25)' },
  Medium:   { bg: 'rgba(78,110,150,0.10)', color: 'var(--blue)',          border: 'rgba(78,110,150,0.2)'  },
  Low:      { bg: 'rgba(0,0,0,0.05)',      color: 'var(--text-tertiary)', border: 'rgba(0,0,0,0.1)'       },
};

const STAGE_COLORS = {
  'New':                      { background: 'rgba(0,0,0,0.05)',       color: '#78726A',  border: '1px solid rgba(0,0,0,0.12)'       },
  'Researching':               { background: 'rgba(88,56,160,0.08)',   color: '#5838A0',  border: '1px solid rgba(88,56,160,0.2)'     },
  'Decision Maker Identified': { background: 'rgba(14,124,123,0.08)',  color: '#0E7C7B',  border: '1px solid rgba(14,124,123,0.2)'    },
  'Contacted':                 { background: 'rgba(212,98,42,0.10)',   color: '#D4622A',  border: '1px solid rgba(212,98,42,0.25)'    },
  'Converted':                 { background: 'rgba(24,112,66,0.08)',   color: '#187042',  border: '1px solid rgba(24,112,66,0.2)'     },
};

export default function LeadsPage() {
  const router = useRouter();

  const [leads, setLeads]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [total, setTotal]               = useState(0);
  const [selectedId, setSelectedId]     = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [kpis, setKpis]                 = useState({ total: 0, hot: 0, pipeline: 0 });

  const [stageTab, setStageTab]                     = useState('All');
  const [search, setSearch]                         = useState('');
  const [activeCatalystFilter, setActiveCatalystFilter] = useState(null);
  const [sortBy, setSortBy]                         = useState('score');
  const [sortDir, setSortDir]                       = useState('desc');
  const [page, setPage]                             = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { loadLeads(); }, [stageTab, search, activeCatalystFilter, sortBy, sortDir, page]);
  useEffect(() => { loadKpis(); }, []);

  async function loadKpis() {
    try {
      const sb = createClient();
      const [{ count: t }, { count: h }, { count: p }] = await Promise.all([
        sb.from('leads').select('*', { count: 'exact', head: true }).not('stage', 'in', '("Converted","Killed")'),
        sb.from('leads').select('*', { count: 'exact', head: true }).gte('score', 70).not('stage', 'in', '("Converted","Killed")'),
        sb.from('leads').select('*', { count: 'exact', head: true }).in('stage', ['Decision Maker Identified', 'Contacted']),
      ]);
      setKpis({ total: t || 0, hot: h || 0, pipeline: p || 0 });
    } catch {}
  }

  async function loadLeads() {
    setLoading(true);
    try {
      const sb = createClient();
      let q = sb.from('leads')
        .select('id, lead_name, company, address, city, market, stage, priority, score, catalyst_tags, building_sf, land_acres, clear_height, dock_doors, year_built, owner_type, decision_maker, phone, created_at, follow_up_date', { count: 'exact' })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (stageTab !== 'All') q = q.eq('stage', stageTab);
      if (search) q = q.or(`lead_name.ilike.%${search}%,company.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`);
      q = q.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });

      const { data, error, count } = await q;
      if (error) throw error;

      let filtered = data || [];
      if (activeCatalystFilter) {
        filtered = filtered.filter(lead => {
          const cats = parseCatalysts(lead.catalyst_tags);
          return cats.some(c => (c?.tag || '').toLowerCase() === activeCatalystFilter.toLowerCase());
        });
      }

      setLeads(filtered);
      setTotal(activeCatalystFilter ? filtered.length : (count || 0));
    } catch (e) {
      console.error('Leads load error:', e);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  function handleCatalystClick(tagName) {
    setActiveCatalystFilter(prev => prev === tagName ? null : tagName);
    setPage(0);
  }

  function handleSelectLead(lead) {
    setSelectedId(lead.id);
    setSelectedLead(lead);
  }

  function handleClose() {
    setSelectedId(null);
    setSelectedLead(null);
  }

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
    setPage(0);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Lead Gen</h1>
          <p className="cl-page-subtitle">
            {loading ? 'Loading…' : `${total.toLocaleString()} lead${total !== 1 ? 's' : ''}${activeCatalystFilter ? ` · filtered: "${activeCatalystFilter}"` : ''}`}
          </p>
        </div>
        <div className="cl-page-actions">
          <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => alert('Import CSV coming soon — check back next build')}>
            Import CSV
          </button>
          <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={() => router.push('/leads/new')}>
            + New Lead
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active Leads',    value: kpis.total,    color: 'var(--text-primary)', sub: 'Excluding converted' },
          { label: 'Hot (Score ≥70)', value: kpis.hot,      color: 'var(--rust)',         sub: 'High catalyst signal' },
          { label: 'In Pipeline',     value: kpis.pipeline, color: 'var(--blue)',         sub: 'DM found or contacted' },
          { label: 'Showing',         value: leads.length,  color: 'var(--text-primary)', sub: activeCatalystFilter ? `"${activeCatalystFilter}"` : stageTab === 'All' ? 'All stages' : stageTab },
        ].map(kpi => (
          <div key={kpi.label} className="cl-kpi">
            <div className="cl-kpi-label">{kpi.label}</div>
            <div className="cl-kpi-value" style={{ color: kpi.color, fontSize: 28 }}>{kpi.value}</div>
            <div className="cl-kpi-delta" style={{ marginTop: 2 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ACTIVE CATALYST FILTER BANNER */}
      {activeCatalystFilter && (() => {
        const cs = getCatalystStyle(activeCatalystFilter);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 12, background: cs.bg, border: `1px solid ${cs.bdr}`, borderRadius: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: cs.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Catalyst Filter:
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: cs.color, fontFamily: 'var(--font-mono)' }}>{activeCatalystFilter}</span>
            <span style={{ fontSize: 12, color: cs.color, opacity: 0.65 }}>— {leads.length} lead{leads.length !== 1 ? 's' : ''} matched</span>
            <button
              onClick={() => setActiveCatalystFilter(null)}
              style={{ marginLeft: 'auto', fontSize: 11, color: cs.color, background: 'none', border: `1px solid ${cs.bdr}`, borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
            >
              ✕ Clear
            </button>
          </div>
        );
      })()}

      {/* STAGE FILTER TABS */}
      <div className="cl-tabs">
        {STAGE_TABS.map(tab => (
          <button
            key={tab}
            className={`cl-tab ${stageTab === tab ? 'cl-tab--active' : ''}`}
            onClick={() => { setStageTab(tab); setPage(0); }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* SEARCH */}
      <div className="cl-filter-bar">
        <input
          className="cl-search-input"
          placeholder="Search name, company, address, city…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
        />
        {(search || activeCatalystFilter) && (
          <button className="cl-btn cl-btn-ghost cl-btn-sm" onClick={() => { setSearch(''); setActiveCatalystFilter(null); setPage(0); }}>
            Clear all
          </button>
        )}
      </div>

      {/* TABLE */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--card-bg)', fontSize: 13, minWidth: 1100 }}>
          <thead>
            <tr>
              {[
                { key: 'score',          label: 'Score',    width: 72,  sortable: true  },
                { key: 'lead_name',      label: 'Lead',     width: null, sortable: true  },
                { key: 'city',           label: 'City',     width: 110, sortable: true  },
                { key: 'stage',          label: 'Stage',    width: 180, sortable: true  },
                { key: 'building_sf',    label: 'Bldg SF',  width: 90,  sortable: true  },
                { key: 'land_acres',     label: 'Land AC',  width: 76,  sortable: true  },
                { key: 'clear_height',   label: 'Clear Ht', width: 74,  sortable: true  },
                { key: 'dock_doors',     label: 'DH Doors', width: 74,  sortable: true  },
                { key: 'priority',       label: 'Priority', width: 86,  sortable: false },
                { key: 'catalyst_tags',  label: 'Catalysts',width: 220, sortable: false },
                { key: 'follow_up_date', label: 'Next F/U', width: 88,  sortable: true  },
              ].map(col => (
                <th key={col.key}
                  style={{ width: col.width || undefined, cursor: col.sortable ? 'pointer' : 'default', background: 'rgba(0,0,0,0.025)', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', color: 'var(--text-tertiary)', textTransform: 'uppercase', padding: '11px 14px', textAlign: 'left', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap', userSelect: 'none' }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.label}{col.sortable && sortBy === col.key && <span style={{ marginLeft: 4, opacity: 0.5 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11}><div className="cl-loading" style={{ padding: 40 }}><div className="cl-spinner" />Loading leads…</div></td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={11}><div className="cl-empty" style={{ padding: 48 }}>
                <div className="cl-empty-label">No leads found</div>
                <div className="cl-empty-sub">{activeCatalystFilter ? `No leads tagged "${activeCatalystFilter}"` : 'Try adjusting your filters'}</div>
              </div></td></tr>
            ) : leads.map(lead => (
              <LeadRow key={lead.id} lead={lead} selected={selectedId === lead.id}
                activeCatalystFilter={activeCatalystFilter}
                onClick={() => handleSelectLead(lead)}
                onCatalystClick={handleCatalystClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '0 2px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="cl-btn cl-btn-secondary cl-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="cl-btn cl-btn-secondary cl-btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* SLIDE DRAWER */}
      <SlideDrawer
        open={!!selectedId}
        onClose={handleClose}
        fullPageHref={selectedId ? `/leads/${selectedId}` : undefined}
        title={selectedLead?.lead_name || selectedLead?.company || ''}
        subtitle={selectedLead ? [selectedLead.city, selectedLead.building_sf ? `${Number(selectedLead.building_sf).toLocaleString()} SF` : null].filter(Boolean).join(' · ') : ''}
        badge={selectedLead?.stage ? { label: normalizeStage(selectedLead.stage), color: 'blue' } : undefined}
      >
        {selectedId && selectedLead && (
          <LeadDetail
            lead={{ ...selectedLead, stage: normalizeStage(selectedLead.stage) }}
            onClose={handleClose}
            onRefresh={() => { loadLeads(); loadKpis(); }}
          />
        )}
      </SlideDrawer>
    </div>
  );
}

// ── LEAD ROW ──────────────────────────────────────────────────────────────
function LeadRow({ lead, selected, activeCatalystFilter, onClick, onCatalystClick }) {
  const catalysts = parseCatalysts(lead.catalyst_tags);
  const { color: scoreColor, grade } = getScoreRing(lead.score || 0);
  const score = lead.score || 0;
  const stage = normalizeStage(lead.stage);
  const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date();
  const priStyle = PRIORITY_COLORS[lead.priority] || PRIORITY_COLORS.Medium;

  return (
    <tr onClick={onClick}
      style={{ background: selected ? 'rgba(78,110,150,0.06)' : undefined, outline: selected ? '1px solid rgba(78,110,150,0.2)' : undefined, outlineOffset: -1, borderBottom: '1px solid rgba(0,0,0,0.04)', transition: 'background 120ms ease', cursor: 'pointer' }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(78,110,150,0.03)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Score */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
        {score > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <ScoreRing score={score} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: scoreColor }}>{grade}</span>
          </div>
        ) : <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>—</span>}
      </td>

      {/* Lead */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{lead.lead_name || lead.company || '—'}</div>
        {lead.address && <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{lead.address}</div>}
        {lead.owner_type && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1, fontStyle: 'italic' }}>{lead.owner_type}</div>}
      </td>

      {/* City */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle', fontSize: 12.5, color: 'var(--text-secondary)' }}>
        {lead.city || '—'}
        {lead.market && <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>{lead.market}</div>}
      </td>

      {/* Stage */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', ...STAGE_COLORS[stage] || STAGE_COLORS.New }}>
  {stage}
</span>
      </td>

      {/* SF */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
        {lead.building_sf ? Number(lead.building_sf).toLocaleString() : '—'}
      </td>

      {/* Land */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
        {lead.land_acres ? Number(lead.land_acres).toFixed(2) : '—'}
      </td>

      {/* Clear Ht */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
        {lead.clear_height ? `${lead.clear_height}'` : '—'}
      </td>

      {/* DH Doors */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
        {lead.dock_doors || '—'}
      </td>

      {/* Priority */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
        {lead.priority && (
          <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: priStyle.bg, color: priStyle.color, border: `1px solid ${priStyle.border}`, fontFamily: 'var(--font-mono)' }}>
            {lead.priority}
          </span>
        )}
      </td>

      {/* Catalysts — CLICKABLE */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {catalysts.slice(0, 3).map((c, i) => {
            const tagName = (c?.tag || String(c)).trim();
            // Skip any that still look like raw JSON
            if (!tagName || tagName.startsWith('{') || tagName.startsWith('[')) return null;
            const cs = getCatalystStyle(tagName);
            const isActive = activeCatalystFilter === tagName;
            return (
              <span key={i} onClick={() => onCatalystClick(tagName)}
                title={`Filter by "${tagName}"`}
                style={{ display: 'inline-flex', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 500, border: `1px solid ${cs.bdr}`, background: isActive ? cs.color : cs.bg, color: isActive ? '#fff' : cs.color, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all 120ms ease' }}
              >
                {tagName}
              </span>
            );
          })}
          {catalysts.length > 3 && (
            <span style={{ display: 'inline-flex', padding: '2px 6px', borderRadius: 4, fontSize: 10, background: 'rgba(0,0,0,0.05)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              +{catalysts.length - 3}
            </span>
          )}
          {catalysts.length === 0 && <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>}
        </div>
      </td>

      {/* Next F/U */}
      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
        {lead.follow_up_date ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isOverdue ? 'var(--rust)' : 'var(--text-secondary)', fontWeight: isOverdue ? 600 : 400 }}>
            {isOverdue && '⚠ '}{new Date(lead.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>}
      </td>
    </tr>
  );
}

// ── SCORE RING ─────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const { color } = getScoreRing(score);
  const r = 13, circ = 2 * Math.PI * r, filled = (score / 100) * circ;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34 }}>
      <svg width="34" height="34" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="2.5" />
        <circle cx="17" cy="17" r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" transform="rotate(-90 17 17)" />
      </svg>
      <span style={{ position: 'absolute', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color }}>{score}</span>
    </div>
  );
}
