'use client';

import { useState, useRef } from 'react';
import { researchCompany, extractJson } from './AutoResearch';

const SEARCH_EXAMPLES = [
  'Rexford Industrial Realty',
  'Prologis',
  'Montana Avenue Capital Partners',
  'Chen Family Trust',
  'Hemlock Land Holdings LLC',
];

export default function OwnerSearch({ properties, leads, onPropertyClick, onLeadClick, showToast }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  // Find local matches in properties/leads
  const localMatches = query.length >= 2 ? [
    ...(properties || []).filter(p =>
      (p.owner && p.owner.toLowerCase().includes(query.toLowerCase())) ||
      (p.tenant && p.tenant.toLowerCase().includes(query.toLowerCase()))
    ).map(p => ({ type: 'property', record: p })),
    ...(leads || []).filter(l =>
      (l.lead_name && l.lead_name.toLowerCase().includes(query.toLowerCase())) ||
      (l.company && l.company.toLowerCase().includes(query.toLowerCase()))
    ).map(l => ({ type: 'lead', record: l })),
  ] : [];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      const res = await researchCompany(query.trim());
      const parsed = extractJson(res);
      const entry = { query: query.trim(), data: parsed, timestamp: new Date().toISOString() };
      setResult(entry);
      setHistory(prev => [entry, ...prev.slice(0, 19)]);
      showToast?.(`Research complete for "${query.trim()}"`);
    } catch (e) {
      console.error(e);
      setResult({ query: query.trim(), data: { summary: `Error: ${e.message}` }, timestamp: new Date().toISOString() });
      showToast?.('Research error — check console');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const loadHistoryItem = (item) => {
    setQuery(item.query);
    setResult(item);
  };

  const InfoRow = ({ label, value, color }) => {
    if (!value || value === 'null' || value === 'N/A') return null;
    return (
      <div style={{ display: 'flex', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', minWidth: '120px' }}>{label}</span>
        <span style={{ fontSize: '13px', color: color || 'var(--text-primary)', flex: 1 }}>{value}</span>
      </div>
    );
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            ref={inputRef}
            className="input"
            placeholder="Search owner, company, or entity name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, fontSize: '14px' }}
          />
          <button className="btn btn-primary" onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? '✦ Researching...' : '✦ Research'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Try:</span>
          {SEARCH_EXAMPLES.map(ex => (
            <button key={ex} className="tag tag-ghost" style={{ cursor: 'pointer', border: 'none', fontSize: '11px' }}
              onClick={() => { setQuery(ex); inputRef.current?.focus(); }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>
        {/* Main Results */}
        <div>
          {/* Local Matches */}
          {localMatches.length > 0 && !result && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Local Matches ({localMatches.length})
              </div>
              {localMatches.slice(0, 10).map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  onClick={() => m.type === 'property' ? onPropertyClick?.(m.record) : onLeadClick?.(m.record)}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {m.type === 'property' ? m.record.address : m.record.lead_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {m.type === 'property' ? `Owner: ${m.record.owner || '—'} · ${m.record.city || ''}` : `${m.record.company || ''} · ${m.record.stage || ''}`}
                    </div>
                  </div>
                  <span className={`tag ${m.type === 'property' ? 'tag-blue' : 'tag-amber'}`} style={{ fontSize: '10px' }}>
                    {m.type}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Research Result */}
          {result && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>{result.query}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {new Date(result.timestamp).toLocaleString()}
                </span>
              </div>

              {result.data?.summary && (
                <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                  {result.data.summary}
                </div>
              )}

              <InfoRow label="Entity Type" value={result.data?.entity_type} />
              <InfoRow label="Entity Status" value={result.data?.entity_status} color={result.data?.entity_status === 'Active' ? 'var(--green)' : 'var(--amber)'} />
              <InfoRow label="Agent" value={result.data?.agent_name} />
              <InfoRow label="Filing Date" value={result.data?.filing_date} />
              <InfoRow label="Portfolio" value={result.data?.portfolio_size} />
              <InfoRow label="Financial" value={result.data?.financial_health} color={result.data?.financial_health?.toLowerCase().includes('strong') ? 'var(--green)' : undefined} />
              <InfoRow label="Leadership" value={result.data?.leadership} />

              {/* Alerts */}
              {(result.data?.ma_activity || result.data?.bankruptcy || result.data?.warn_notices) && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>Intelligence Signals</div>
                  {result.data?.ma_activity && result.data.ma_activity !== 'null' && (
                    <div style={{ padding: '10px', background: 'rgba(0,122,255,0.07)', border: '1px solid rgba(0,122,255,0.15)', borderRadius: '6px', marginBottom: '8px', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>M&A:</span> {result.data.ma_activity}
                    </div>
                  )}
                  {result.data?.bankruptcy && result.data.bankruptcy !== 'null' && (
                    <div style={{ padding: '10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px', marginBottom: '8px', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--red)' }}>Bankruptcy:</span> {result.data.bankruptcy}
                    </div>
                  )}
                  {result.data?.warn_notices && result.data.warn_notices !== 'null' && (
                    <div style={{ padding: '10px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '6px', marginBottom: '8px', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--amber)' }}>WARN Notice:</span> {result.data.warn_notices}
                    </div>
                  )}
                </div>
              )}

              {/* Related Entities */}
              {result.data?.related_entities?.length > 0 && result.data.related_entities[0] !== 'null' && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>Related Entities</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {result.data.related_entities.filter(e => e && e !== 'null').map((e, i) => (
                      <button key={i} className="tag tag-ghost" style={{ cursor: 'pointer', border: 'none', fontSize: '11px' }}
                        onClick={() => { setQuery(e); inputRef.current?.focus(); }}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Local portfolio match */}
              {localMatches.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    In Your Database ({localMatches.length})
                  </div>
                  {localMatches.slice(0, 5).map((m, i) => (
                    <div key={i} style={{ fontSize: '12px', padding: '4px 0', cursor: 'pointer', color: 'var(--accent)' }}
                      onClick={() => m.type === 'property' ? onPropertyClick?.(m.record) : onLeadClick?.(m.record)}>
                      {m.type === 'property' ? `📍 ${m.record.address}` : `🎯 ${m.record.lead_name}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!result && localMatches.length === 0 && (
            <div className="empty-state" style={{ marginTop: '40px' }}>
              <div className="empty-state-icon">✦</div>
              <div className="empty-state-title">Owner & Entity Research</div>
              <div className="empty-state-sub">Search any company, LLC, trust, or owner name. AI will search SOS filings, M&A, bankruptcy, WARN notices, SEC filings, and portfolio intel.</div>
            </div>
          )}
        </div>

        {/* History Sidebar */}
        <div>
          <div className="card" style={{ padding: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Search History
            </div>
            {history.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px 0' }}>No searches yet</div>
            )}
            {history.map((item, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                onClick={() => loadHistoryItem(item)}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.query}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
