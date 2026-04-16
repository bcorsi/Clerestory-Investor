'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import SlideDrawer from '@/components/SlideDrawer';
import PropertyDetail from '@/components/PropertyDetail';
import {
  getFitColors, getBuildingColors, getOrsColors, getOrsLabel, getGrade,
  isPropertyTag, isCatalystTag, getTagStyle,
  CATALYST_TAGS, CATALYST_CATEGORIES,
  PROPERTY_TAGS, PROPERTY_TAG_CATEGORIES,
  getCatalystTagsByCategory, getPropertyTagsByCategory,
} from '@/lib/catalyst-constants';

// ─── FORMATTERS ───────────────────────────────────────────
function fmtSF(n) {
  if (n == null) return '—';
  const v = Number(n);
  if (v >= 1000) return `${Math.round(v / 1000)}K`;
  return v.toLocaleString();
}
function fmtAcres(n) {
  if (n == null) return '—';
  return Number(n).toFixed(1);
}
function fmtCoverage(n) {
  if (n == null) return '—';
  return `${Math.round(Number(n))}%`;
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ─── COLUMNS ──────────────────────────────────────────────
const COLUMNS = [
  { key: 'check',           label: '',          width: 36,  sortable: false },
  { key: 'scores',          label: 'Scores',    width: 120, sortable: false },
  { key: 'address',         label: 'Address',   width: null, sortable: true },
  { key: 'city',            label: 'City',      width: 120, sortable: true },
  { key: 'building_sf',     label: 'SF',        width: 72,  sortable: true },
  { key: 'land_acres',      label: 'Land AC',   width: 68,  sortable: true },
  { key: 'coverage',        label: 'Cov.',      width: 56,  sortable: true },
  { key: 'clear_height',    label: 'Clear Ht',  width: 68,  sortable: true },
  { key: 'dock_doors',      label: 'Docks',     width: 52,  sortable: true },
  { key: 'year_built',      label: 'Year',      width: 56,  sortable: true },
  { key: 'owner',           label: 'Owner',     width: 150, sortable: true },
  { key: 'tenant',          label: 'Tenant',    width: 140, sortable: true },
  { key: 'lease_expiration',label: 'Exp.',      width: 72,  sortable: true },
  { key: 'in_place_rent',   label: '$/SF',      width: 60,  sortable: true },
  { key: 'tags',            label: 'Tags',      width: 220, sortable: false },
];

export default function PropertiesPage() {
  const [properties, setProperties]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [total, setTotal]               = useState(0);
  const [selectedId, setSelectedId]     = useState(null);
  const [selectedProp, setSelectedProp] = useState(null);

  // Filters
  const [search, setSearch]             = useState('');
  const [cityFilter, setCityFilter]     = useState('');
  const [sortBy, setSortBy]             = useState('ai_score');
  const [sortDir, setSortDir]           = useState('desc');

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advFilters, setAdvFilters]     = useState({
    minSF: '', maxSF: '', minClear: '', maxClear: '',
    minScore: '', leaseExpiry: '', ownerType: '',
    catalystTag: '', propertyTag: '', submarket: '',
  });

  // Selection + Bulk
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [showBulkTag, setShowBulkTag]   = useState(false);

  // Compare
  const [compareIds, setCompareIds]     = useState([]);
  const [showCompare, setShowCompare]   = useState(false);
  const [aiCompare, setAiCompare]       = useState('');
  const [aiLoading, setAiLoading]       = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Cities for filter
  const [cities, setCities] = useState([]);

  useEffect(() => {
    loadProperties();
  }, [search, cityFilter, sortBy, sortDir, page]);

  useEffect(() => {
    loadCities();
  }, []);

  async function loadCities() {
    try {
      const supabase = createClient();
      const { data } = await supabase.from('properties').select('city').not('city', 'is', null);
      if (data) {
        const unique = [...new Set(data.map(d => d.city).filter(Boolean))].sort();
        setCities(unique);
      }
    } catch (e) { console.error(e); }
  }

  async function loadProperties() {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('properties')
        .select(
          'id, address, city, zip, building_sf, land_acres, tenant, lease_expiration, in_place_rent, ' +
          'ai_score, building_score, ors_score, building_grade, catalyst_tags, property_tags, ' +
          'year_built, clear_height, coverage, dock_doors, owner, prop_type, submarket',
          { count: 'exact' }
        )
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.or(`address.ilike.%${search}%,tenant.ilike.%${search}%,city.ilike.%${search}%,owner.ilike.%${search}%`);
      }
      if (cityFilter) query = query.eq('city', cityFilter);

      // Advanced filters — applied as Supabase conditions
      if (advFilters.minSF) query = query.gte('building_sf', Number(advFilters.minSF));
      if (advFilters.maxSF) query = query.lte('building_sf', Number(advFilters.maxSF));
      if (advFilters.minClear) query = query.gte('clear_height', Number(advFilters.minClear));
      if (advFilters.maxClear) query = query.lte('clear_height', Number(advFilters.maxClear));
      if (advFilters.minScore) query = query.gte('ai_score', Number(advFilters.minScore));
      if (advFilters.submarket) query = query.eq('submarket', advFilters.submarket);

      query = query.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });

      const { data, error, count } = await query;
      if (error) throw error;

      // Client-side tag filtering (catalyst_tags is ARRAY)
      let filtered = data || [];
      if (advFilters.catalystTag) {
        filtered = filtered.filter(p => {
          const tags = parseTags(p.catalyst_tags);
          return tags.includes(advFilters.catalystTag);
        });
      }
      if (advFilters.propertyTag) {
        filtered = filtered.filter(p => {
          const tags = parseTags(p.property_tags);
          return tags.includes(advFilters.propertyTag);
        });
      }

      setProperties(filtered);
      setTotal(count || 0);
    } catch (e) {
      console.error('Properties load error:', e);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }

  function parseTags(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(t => typeof t === 'object' ? t.tag || t.name || '' : t).filter(Boolean);
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  }

  function handleSort(col) {
    if (!col.sortable) return;
    if (sortBy === col.key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col.key);
      setSortDir('desc');
    }
    setPage(0);
  }

  function handleSelectProperty(prop) {
    setSelectedId(prop.id);
    setSelectedProp(prop);
  }

  function toggleCheck(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === properties.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(properties.map(p => p.id)));
    }
  }

  function toggleCompareId(id) {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  }

  function clearAdvanced() {
    setAdvFilters({ minSF: '', maxSF: '', minClear: '', maxClear: '', minScore: '', leaseExpiry: '', ownerType: '', catalystTag: '', propertyTag: '', submarket: '' });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const compareProps = compareIds.map(id => properties.find(p => p.id === id)).filter(Boolean);

  // ─── AI COMPARISON ────────────────────────────────────────
  async function runAiCompare() {
    if (compareProps.length < 2) return;
    setAiLoading(true);
    setAiCompare('');
    try {
      const prompt = `Compare these ${compareProps.length} industrial properties for an investor/broker. For each, note strengths and weaknesses. Then recommend which is the best acquisition target and why.\n\n${compareProps.map((p, i) => `Property ${i + 1}: ${p.address}, ${p.city}\n  SF: ${p.building_sf || '?'}, Land: ${p.land_acres || '?'} AC, Clear: ${p.clear_height || '?'}', Year: ${p.year_built || '?'}, Owner: ${p.owner || '?'}, Tenant: ${p.tenant || 'Vacant'}, Rent: ${p.in_place_rent ? `$${p.in_place_rent}/SF` : '?'}, Lease Exp: ${p.lease_expiration || '?'}, Coverage: ${p.coverage || '?'}%, Fit Score: ${p.ai_score || '?'}, Building Score: ${p.building_score || '?'}, ORS: ${p.ors_score || '?'}\n  Tags: ${[...parseTags(p.catalyst_tags), ...parseTags(p.property_tags)].join(', ') || 'None'}`).join('\n\n')}`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          system: 'You are Clerestory AI, an expert industrial real estate analyst covering SGV and Inland Empire. Be direct, data-driven, and specific. Use broker terminology.',
        }),
      });
      const data = await res.json();
      setAiCompare(data.content || data.text || data.message || 'No response');
    } catch (e) {
      setAiCompare('AI comparison unavailable. Check API configuration.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Properties</h1>
          <p className="cl-page-subtitle">
            {loading ? 'Loading…' : `${total.toLocaleString()} properties tracked`}
          </p>
        </div>
        <div className="cl-page-actions" style={{ display: 'flex', gap: 8 }}>
          <button
            className="cl-btn cl-btn-secondary cl-btn-sm"
            onClick={() => setShowAdvanced(v => !v)}
            style={showAdvanced ? { background: 'var(--blue-bg)', borderColor: 'var(--blue)', color: 'var(--blue)' } : undefined}
          >
            ⊕ Advanced Filter
          </button>
          {compareIds.length >= 2 && (
            <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => setShowCompare(true)}
              style={{ background: 'rgba(88,56,160,0.08)', borderColor: 'rgba(88,56,160,0.25)', color: '#5838A0' }}
            >
              ⊞ Compare ({compareIds.length})
            </button>
          )}
          <button className="cl-btn cl-btn-secondary cl-btn-sm">Import CSV</button>
          <button className="cl-btn cl-btn-primary cl-btn-sm">+ Add Property</button>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <KPIStrip properties={properties} total={total} loading={loading} parseTags={parseTags} />

      {/* ── ADVANCED FILTER PANEL ── */}
      {showAdvanced && (
        <AdvancedFilterPanel
          filters={advFilters}
          setFilters={setAdvFilters}
          onApply={() => { setPage(0); loadProperties(); }}
          onClear={clearAdvanced}
          onClose={() => setShowAdvanced(false)}
        />
      )}

      {/* ── FILTER BAR ── */}
      <div className="cl-filter-bar" style={{ marginBottom: 14 }}>
        <input
          className="cl-search-input"
          placeholder="Search address, owner, tenant, city…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
        />
        <select className="cl-select" value={cityFilter} onChange={e => { setCityFilter(e.target.value); setPage(0); }}>
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || cityFilter) && (
          <button className="cl-btn cl-btn-ghost cl-btn-sm" onClick={() => { setSearch(''); setCityFilter(''); setPage(0); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── TABLE ── */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--card-bg)', fontSize: 14, minWidth: 1500 }}>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  style={{
                    width: col.width || undefined,
                    cursor: col.sortable ? 'pointer' : 'default',
                    background: 'rgba(0,0,0,0.025)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    padding: col.key === 'check' ? '12px 10px' : '12px 14px',
                    textAlign: 'left',
                    borderBottom: '1px solid var(--card-border)',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => handleSort(col)}
                >
                  {col.key === 'check' ? (
                    <Checkbox checked={properties.length > 0 && selectedIds.size === properties.length} onClick={e => { e.stopPropagation(); toggleAll(); }} />
                  ) : (
                    <>
                      {col.label}
                      {col.sortable && sortBy === col.key && (
                        <span style={{ marginLeft: 4, opacity: 0.6 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length}>
                  <div className="cl-loading" style={{ padding: 48 }}><div className="cl-spinner" />Loading properties…</div>
                </td>
              </tr>
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length}>
                  <div className="cl-empty" style={{ padding: 48 }}>
                    <div className="cl-empty-label">No properties found</div>
                    <div className="cl-empty-sub">Try adjusting your filters or import from CoStar</div>
                  </div>
                </td>
              </tr>
            ) : (
              properties.map(prop => (
                <PropertyRow
                  key={prop.id}
                  prop={prop}
                  parseTags={parseTags}
                  selected={selectedId === prop.id}
                  checked={selectedIds.has(prop.id)}
                  onCheck={() => toggleCheck(prop.id)}
                  inCompare={compareIds.includes(prop.id)}
                  onCompare={() => toggleCompareId(prop.id)}
                  onClick={() => handleSelectProperty(prop)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION ── */}
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

      {/* ── BULK ACTION BAR ── */}
      {selectedIds.size > 0 && (
        <BulkBar
          count={selectedIds.size}
          onTag={() => setShowBulkTag(true)}
          onClear={() => setSelectedIds(new Set())}
          onExport={() => {}}
        />
      )}

      {/* ── BULK TAG MODAL ── */}
      {showBulkTag && (
        <BulkTagModal
          selectedIds={selectedIds}
          onClose={() => setShowBulkTag(false)}
          onSuccess={() => { setShowBulkTag(false); setSelectedIds(new Set()); loadProperties(); }}
        />
      )}

      {/* ── COMPARE DRAWER ── */}
      {showCompare && (
        <CompareDrawer
          props={compareProps}
          parseTags={parseTags}
          onClose={() => setShowCompare(false)}
          onRemove={(id) => setCompareIds(prev => prev.filter(i => i !== id))}
          aiResult={aiCompare}
          aiLoading={aiLoading}
          onRunAi={runAiCompare}
        />
      )}

      {/* ── SLIDE DRAWER ── */}
      <SlideDrawer
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setSelectedProp(null); }}
        fullPageHref={selectedId ? `/properties/${selectedId}` : undefined}
        title={selectedProp?.address || ''}
        subtitle={selectedProp ? `${selectedProp.city}${selectedProp.building_sf ? ` · ${fmtSF(selectedProp.building_sf)} SF` : ''}` : ''}
      >
        {selectedId && <PropertyDetail id={selectedId} inline />}
      </SlideDrawer>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// KPI STRIP
// ═══════════════════════════════════════════════════════════
function KPIStrip({ properties, total, loading, parseTags }) {
  if (loading) return null;
  const totalSF = properties.reduce((s, p) => s + (Number(p.building_sf) || 0), 0);
  const withTags = properties.filter(p => parseTags(p.catalyst_tags).length > 0).length;
  const avgScore = properties.length > 0
    ? Math.round(properties.reduce((s, p) => s + (p.ai_score || 0), 0) / properties.length)
    : 0;
  const vacant = properties.filter(p => {
    const tags = parseTags(p.catalyst_tags);
    return tags.includes('Vacant') || tags.includes('Partial Vacancy');
  }).length;

  const kpis = [
    { icon: '🏢', value: total.toLocaleString(), label: 'Total Properties', color: 'var(--blue)' },
    { icon: '◫', value: totalSF >= 1e6 ? `${(totalSF / 1e6).toFixed(1)}M` : fmtSF(totalSF), label: 'Total SF', color: 'var(--amber)' },
    { icon: '◉', value: `${avgScore}`, label: 'Avg Fit Score', color: 'var(--green)' },
    { icon: '⚡', value: `${withTags}`, label: 'Active Catalysts', color: 'var(--purple)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 14, marginBottom: 18 }}>
      {kpis.map((k, i) => (
        <div key={i} style={{
          background: 'var(--card-bg)', borderRadius: 12, boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--card-border)', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, background: `color-mix(in srgb, ${k.color} 8%, transparent)`,
          }}>{k.icon}</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{k.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// PROPERTY ROW
// ═══════════════════════════════════════════════════════════
function PropertyRow({ prop, parseTags, selected, checked, onCheck, inCompare, onCompare, onClick }) {
  const catalystTags = parseTags(prop.catalyst_tags).filter(t => isCatalystTag(t));
  const propertyTags = parseTags(prop.property_tags || prop.catalyst_tags).filter(t => isPropertyTag(t));
  // If property_tags col doesn't exist, extract from catalyst_tags
  const allCatTags = parseTags(prop.catalyst_tags);
  const finalCatalyst = catalystTags.length > 0 ? catalystTags : allCatTags.filter(t => isCatalystTag(t));
  const finalProperty = propertyTags.length > 0 ? propertyTags : allCatTags.filter(t => isPropertyTag(t));

  const leaseExp = prop.lease_expiration ? new Date(prop.lease_expiration) : null;
  const monthsToExp = leaseExp ? Math.round((leaseExp - new Date()) / (1000 * 60 * 60 * 24 * 30)) : null;
  const expiryUrgent = monthsToExp !== null && monthsToExp <= 12;

  return (
    <tr
      onClick={onClick}
      style={{
        background: selected ? 'rgba(78,110,150,0.06)' : inCompare ? 'rgba(88,56,160,0.04)' : undefined,
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        cursor: 'pointer',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={e => { if (!selected && !inCompare) e.currentTarget.style.background = 'rgba(78,110,150,0.03)'; }}
      onMouseLeave={e => { if (!selected && !inCompare) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Checkbox */}
      <td style={{ padding: '12px 10px' }}>
        <Checkbox checked={checked} onClick={e => { e.stopPropagation(); onCheck(); }} />
      </td>

      {/* Scores — Fit ring + Building num + ORS num */}
      <td style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScoreRing score={prop.ai_score} type="fit" size={34} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ScoreBadge score={prop.building_score} type="building" label="Bldg" />
            <ScoreBadge score={prop.ors_score} type="ors" />
          </div>
        </div>
      </td>

      {/* Address */}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
            {prop.address || '—'}
          </span>
          {inCompare && (
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', background: 'rgba(88,56,160,0.1)', color: '#5838A0', padding: '1px 5px', borderRadius: 3 }}>CMP</span>
          )}
        </div>
        {prop.prop_type && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{prop.prop_type}</div>
        )}
      </td>

      {/* City */}
      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{prop.city || '—'}</td>

      {/* SF */}
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{fmtSF(prop.building_sf)}</td>

      {/* Land AC */}
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{fmtAcres(prop.land_acres)}</td>

      {/* Coverage */}
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{fmtCoverage(prop.coverage)}</td>

      {/* Clear Ht */}
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
        {prop.clear_height ? `${prop.clear_height}'` : '—'}
      </td>

      {/* Docks */}
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
        {prop.dock_doors != null ? prop.dock_doors : '—'}
      </td>

      {/* Year */}
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{prop.year_built || '—'}</td>

      {/* Owner */}
      <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {prop.owner || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
      </td>

      {/* Tenant */}
      <td style={{ fontSize: 13, color: 'var(--text-primary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {prop.tenant || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
      </td>

      {/* Lease Exp */}
      <td>
        {leaseExp ? (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: expiryUrgent ? '#C41E1E' : 'var(--text-secondary)',
            fontWeight: expiryUrgent ? 600 : 400,
          }}>
            {fmtDate(prop.lease_expiration)}
            {monthsToExp !== null && monthsToExp <= 6 && <span style={{ marginLeft: 3 }}>⚠</span>}
          </span>
        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
      </td>

      {/* $/SF */}
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
        {prop.in_place_rent ? `$${Number(prop.in_place_rent).toFixed(2)}` : '—'}
      </td>

      {/* Tags — catalyst (warm) | divider | property (cool) */}
      <td>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          {finalCatalyst.slice(0, 2).map((tag, i) => <TagChip key={`c-${i}`} tag={tag} />)}
          {(finalCatalyst.length > 0 && finalProperty.length > 0) && (
            <span style={{ width: 1, height: 14, background: 'rgba(0,0,0,0.12)', margin: '0 2px', flexShrink: 0 }} />
          )}
          {finalProperty.slice(0, 2).map((tag, i) => <TagChip key={`p-${i}`} tag={tag} />)}
          {(finalCatalyst.length + finalProperty.length) > 4 && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)',
              background: 'rgba(0,0,0,0.04)', padding: '2px 5px', borderRadius: 4,
            }}>
              +{(finalCatalyst.length + finalProperty.length) - 4}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}


// ═══════════════════════════════════════════════════════════
// TAG CHIP — auto-detects property vs catalyst
// ═══════════════════════════════════════════════════════════
function TagChip({ tag }) {
  const style = getTagStyle(tag);
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 7px', borderRadius: 5,
      fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
      background: style.bg, color: style.color, border: `1px solid ${style.bdr || style.border || 'transparent'}`,
    }}>
      {tag}
    </span>
  );
}


// ═══════════════════════════════════════════════════════════
// SCORE RING — Fit score with SVG ring
// ═══════════════════════════════════════════════════════════
function ScoreRing({ score, type = 'fit', size = 36 }) {
  if (score == null) return <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>—</span>;

  const colors = type === 'fit' ? getFitColors(score) : type === 'building' ? getBuildingColors(score) : getOrsColors(score);
  const r = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(score, 100) / 100) * circ;
  const grade = getGrade(score);

  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="2.5" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={colors.color} strokeWidth="2.5"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <span style={{
        position: 'absolute', fontFamily: 'var(--font-mono)', fontSize: size <= 34 ? 10 : 11,
        fontWeight: 700, color: colors.color, lineHeight: 1,
      }}>{score}</span>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// SCORE BADGE — inline Building / ORS number badge
// ═══════════════════════════════════════════════════════════
function ScoreBadge({ score, type, label }) {
  if (score == null) return null;

  const colors = type === 'building' ? getBuildingColors(score) : getOrsColors(score);
  const displayLabel = type === 'ors' ? getOrsLabel(score) : (label || '');

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 6px', borderRadius: 4,
      background: colors.bg, border: `1px solid ${colors.bdr}`,
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: colors.color, lineHeight: 1.2 }}>
        {score}
      </span>
      {displayLabel && (
        <span style={{ fontSize: 8, fontWeight: 600, color: colors.color, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {displayLabel}
        </span>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// CHECKBOX
// ═══════════════════════════════════════════════════════════
function Checkbox({ checked, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 16, height: 16, borderRadius: 3,
        border: `2px solid ${checked ? 'var(--blue)' : 'rgba(0,0,0,0.15)'}`,
        background: checked ? 'var(--blue)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 120ms',
        flexShrink: 0,
      }}
    >
      {checked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// ADVANCED FILTER PANEL
// ═══════════════════════════════════════════════════════════
function AdvancedFilterPanel({ filters, setFilters, onApply, onClear, onClose }) {
  const catalystGrouped = getCatalystTagsByCategory();
  const propertyGrouped = getPropertyTagsByCategory();
  const u = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const inputStyle = {
    padding: '7px 10px', border: '1px solid var(--card-border)', borderRadius: 6,
    fontFamily: 'var(--font-mono)', fontSize: 12, width: '100%',
    color: 'var(--text-primary)', background: 'var(--bg)', outline: 'none',
  };
  const selectStyle = {
    ...inputStyle, fontFamily: 'var(--font-ui)', cursor: 'pointer',
  };
  const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 5,
  };

  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      border: '1px solid var(--card-border)', padding: 20, marginBottom: 16,
      animation: 'slideDown 200ms ease',
    }}>
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--text-secondary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        ⊕ Advanced Filters
        <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: 'var(--text-tertiary)', fontSize: 13 }}>
          Narrow your universe
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div>
          <label style={labelStyle}>Building SF</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input style={inputStyle} placeholder="Min" value={filters.minSF} onChange={e => u('minSF', e.target.value)} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>to</span>
            <input style={inputStyle} placeholder="Max" value={filters.maxSF} onChange={e => u('maxSF', e.target.value)} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Clear Height</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input style={inputStyle} placeholder="Min" value={filters.minClear} onChange={e => u('minClear', e.target.value)} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>to</span>
            <input style={inputStyle} placeholder="Max" value={filters.maxClear} onChange={e => u('maxClear', e.target.value)} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Min Fit Score</label>
          <input style={inputStyle} type="number" placeholder="0" value={filters.minScore} onChange={e => u('minScore', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Submarket</label>
          <select style={selectStyle} value={filters.submarket} onChange={e => u('submarket', e.target.value)}>
            <option value="">All Submarkets</option>
            <option value="SGV Mid-Valley">SGV Mid-Valley</option>
            <option value="SGV East">SGV East</option>
            <option value="SGV West">SGV West</option>
            <option value="IE West">IE West</option>
            <option value="Chino/Chino Hills">Chino/Chino Hills</option>
            <option value="Ontario Airport">Ontario Airport</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Catalyst Tag</label>
          <select style={selectStyle} value={filters.catalystTag} onChange={e => u('catalystTag', e.target.value)}>
            <option value="">Any Catalyst</option>
            {Object.entries(catalystGrouped).map(([cat, group]) => (
              <optgroup key={cat} label={group.label}>
                {group.tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Property Tag</label>
          <select style={selectStyle} value={filters.propertyTag} onChange={e => u('propertyTag', e.target.value)}>
            <option value="">Any Property Tag</option>
            {Object.entries(propertyGrouped).map(([cat, group]) => (
              <optgroup key={cat} label={group.label}>
                {group.tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Lease Expiry</label>
          <select style={selectStyle} value={filters.leaseExpiry} onChange={e => u('leaseExpiry', e.target.value)}>
            <option value="">Any</option>
            <option value="6">≤ 6 months</option>
            <option value="12">≤ 12 months</option>
            <option value="24">≤ 24 months</option>
            <option value="36">≤ 36 months</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Owner Type</label>
          <select style={selectStyle} value={filters.ownerType} onChange={e => u('ownerType', e.target.value)}>
            <option value="">Any</option>
            <option value="Owner-User">Owner-User</option>
            <option value="Private LLC">Private LLC</option>
            <option value="Institutional">Institutional / REIT</option>
            <option value="Trust">Trust / Estate</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button className="cl-btn cl-btn-ghost cl-btn-sm" onClick={() => { onClear(); onApply(); }}>Clear All</button>
        <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={() => { onApply(); onClose(); }}>Apply Filters</button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// BULK ACTION BAR
// ═══════════════════════════════════════════════════════════
function BulkBar({ count, onTag, onClear, onExport }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 272, right: 0,
      background: 'linear-gradient(90deg, #1A2130, #1F2840)',
      borderRadius: '12px 12px 0 0', padding: '12px 24px',
      display: 'flex', alignItems: 'center', gap: 12,
      zIndex: 50, boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      borderTop: '2px solid rgba(100,128,162,0.25)',
      animation: 'slideUp 250ms ease',
    }}>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#fff' }}>{count}</span>
      <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.7)', marginRight: 12 }}>selected</span>
      <BulkButton onClick={onTag}>🏷 Bulk Tag</BulkButton>
      <BulkButton onClick={onExport}>📄 Export</BulkButton>
      <div style={{ marginLeft: 'auto', color: 'rgba(245,240,232,0.5)', cursor: 'pointer', fontSize: 18, padding: '4px 8px' }} onClick={onClear}>×</div>
    </div>
  );
}

function BulkButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer',
      border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
      color: 'rgba(245,240,232,0.9)', fontFamily: 'var(--font-ui)', transition: 'all 120ms',
      display: 'flex', alignItems: 'center', gap: 5,
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
    >{children}</button>
  );
}


// ═══════════════════════════════════════════════════════════
// BULK TAG MODAL — All 51 catalyst + 30 property tags
// ═══════════════════════════════════════════════════════════
function BulkTagModal({ selectedIds, onClose, onSuccess }) {
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('add'); // 'add' or 'remove'

  const catalystGrouped = getCatalystTagsByCategory();
  const propertyGrouped = getPropertyTagsByCategory();

  function toggleTag(tag) {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  async function handleSave() {
    if (selectedTags.size === 0) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const ids = Array.from(selectedIds);
      const tagsToApply = Array.from(selectedTags);

      // For each property, update catalyst_tags or property_tags
      for (const id of ids) {
        const { data: prop } = await supabase.from('properties').select('catalyst_tags, property_tags').eq('id', id).single();
        if (!prop) continue;

        const existingCatalyst = Array.isArray(prop.catalyst_tags) ? prop.catalyst_tags : [];
        const existingProperty = Array.isArray(prop.property_tags) ? prop.property_tags : [];

        const newCatalyst = tagsToApply.filter(t => isCatalystTag(t));
        const newProperty = tagsToApply.filter(t => isPropertyTag(t));

        let updatedCatalyst, updatedProperty;
        if (mode === 'add') {
          updatedCatalyst = [...new Set([...existingCatalyst, ...newCatalyst])];
          updatedProperty = [...new Set([...existingProperty, ...newProperty])];
        } else {
          updatedCatalyst = existingCatalyst.filter(t => !newCatalyst.includes(t));
          updatedProperty = existingProperty.filter(t => !newProperty.includes(t));
        }

        await supabase.from('properties').update({
          catalyst_tags: updatedCatalyst,
          property_tags: updatedProperty,
        }).eq('id', id);
      }

      onSuccess();
    } catch (e) {
      console.error('Bulk tag error:', e);
      alert('Error applying tags: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 16, width: '100%', maxWidth: 720,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.08)',
          padding: '16px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              Bulk Tag · {selectedIds.size} Properties
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {selectedTags.size} tag{selectedTags.size !== 1 ? 's' : ''} selected
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.06)', borderRadius: 6, overflow: 'hidden' }}>
              <button
                onClick={() => setMode('add')}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: mode === 'add' ? 'var(--blue)' : 'transparent',
                  color: mode === 'add' ? '#fff' : 'var(--text-secondary)',
                }}
              >+ Add</button>
              <button
                onClick={() => setMode('remove')}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: mode === 'remove' ? 'var(--rust)' : 'transparent',
                  color: mode === 'remove' ? '#fff' : 'var(--text-secondary)',
                }}
              >− Remove</button>
            </div>
            <button onClick={onClose} style={{ fontSize: 22, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Catalyst Tags */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ⚡ Catalyst Tags
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>({CATALYST_TAGS.length})</span>
            </div>
            {Object.entries(catalystGrouped).map(([cat, group]) => (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: group.color, marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {group.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 120ms', border: `1px solid ${group.bdr}`,
                        background: selectedTags.has(tag) ? group.color : group.bg,
                        color: selectedTags.has(tag) ? '#fff' : group.color,
                      }}
                    >{tag}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginBottom: 24 }} />

          {/* Property Tags */}
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              🏗 Property Tags
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>({PROPERTY_TAGS.length})</span>
            </div>
            {Object.entries(propertyGrouped).map(([cat, group]) => (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: group.color, marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {group.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 120ms', border: `1px solid ${group.bdr}`,
                        background: selectedTags.has(tag) ? group.color : group.bg,
                        color: selectedTags.has(tag) ? '#fff' : group.color,
                      }}
                    >{tag}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', justifyContent: 'flex-end', gap: 10, borderRadius: '0 0 16px 16px',
        }}>
          <button className="cl-btn cl-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="cl-btn cl-btn-primary"
            onClick={handleSave}
            disabled={saving || selectedTags.size === 0}
            style={{ minWidth: 160 }}
          >
            {saving ? 'Applying…' : `${mode === 'add' ? 'Add' : 'Remove'} ${selectedTags.size} Tag${selectedTags.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// COMPARE DRAWER
// ═══════════════════════════════════════════════════════════
function CompareDrawer({ props, parseTags, onClose, onRemove, aiResult, aiLoading, onRunAi }) {
  if (props.length < 2) return null;

  const metrics = [
    { label: 'Building SF', fn: p => fmtSF(p.building_sf) },
    { label: 'Land AC', fn: p => fmtAcres(p.land_acres) },
    { label: 'Coverage', fn: p => fmtCoverage(p.coverage) },
    { label: 'Clear Height', fn: p => p.clear_height ? `${p.clear_height}'` : '—' },
    { label: 'Dock Doors', fn: p => p.dock_doors ?? '—' },
    { label: 'Year Built', fn: p => p.year_built || '—' },
    { label: 'Fit Score', fn: p => p.ai_score ?? '—' },
    { label: 'Building Score', fn: p => p.building_score ?? '—' },
    { label: 'ORS', fn: p => p.ors_score ?? '—' },
    { label: 'Tenant', fn: p => p.tenant || '—' },
    { label: 'Owner', fn: p => p.owner || '—' },
    { label: 'Rent $/SF', fn: p => p.in_place_rent ? `$${Number(p.in_place_rent).toFixed(2)}` : '—' },
    { label: 'Lease Exp', fn: p => fmtDate(p.lease_expiration) },
  ];

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 520,
      background: 'var(--card-bg)', boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
      zIndex: 200, display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid var(--card-border)',
      animation: 'slideIn 300ms ease',
    }}>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⊞ Compare · {props.length} Properties
        </div>
        <button onClick={onClose} style={{ color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18, background: 'none', border: 'none' }}>×</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Property headers */}
        <div style={{ display: 'grid', gridTemplateColumns: `140px repeat(${props.length}, 1fr)`, borderBottom: '2px solid var(--card-border)' }}>
          <div style={{ padding: '10px 14px', background: 'var(--bg)', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Metric</div>
          {props.map(p => (
            <div key={p.id} style={{ padding: '10px 14px', background: 'var(--bg)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.address}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{p.city}</div>
              <button
                onClick={() => onRemove(p.id)}
                style={{ fontSize: 9, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 3 }}
              >✕ Remove</button>
            </div>
          ))}
        </div>

        {/* Metrics rows */}
        {metrics.map((m, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: `140px repeat(${props.length}, 1fr)`, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--text-tertiary)', background: 'rgba(0,0,0,0.015)' }}>{m.label}</div>
            {props.map(p => (
              <div key={p.id} style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                {m.fn(p)}
              </div>
            ))}
          </div>
        ))}

        {/* Tags row */}
        <div style={{ display: 'grid', gridTemplateColumns: `140px repeat(${props.length}, 1fr)`, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--text-tertiary)', background: 'rgba(0,0,0,0.015)' }}>Tags</div>
          {props.map(p => {
            const allTags = [...parseTags(p.catalyst_tags), ...parseTags(p.property_tags || [])];
            return (
              <div key={p.id} style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {allTags.slice(0, 5).map((tag, i) => <TagChip key={i} tag={tag} />)}
                {allTags.length > 5 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{allTags.length - 5}</span>}
              </div>
            );
          })}
        </div>

        {/* AI Analysis */}
        <div style={{ padding: 20 }}>
          <button
            className="cl-btn cl-btn-primary cl-btn-sm"
            onClick={onRunAi}
            disabled={aiLoading}
            style={{ width: '100%', marginBottom: 14, background: '#5838A0', borderColor: '#5838A0' }}
          >
            {aiLoading ? '✦ Analyzing…' : '✦ AI Comparison'}
          </button>
          {aiResult && (
            <div style={{
              background: 'rgba(88,56,160,0.04)', border: '1px solid rgba(88,56,160,0.15)',
              borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--text-secondary)',
              lineHeight: 1.65, whiteSpace: 'pre-wrap',
            }}>
              {aiResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
