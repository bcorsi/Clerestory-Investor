'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OwnerSearchPage() {
  const [query, setQuery]           = useState('');
  const [address, setAddress]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [history, setHistory]       = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
    // Auto-run if ?q= param present
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      // Run after state settles
      setTimeout(() => runSearchWithQuery(q), 100);
    }
  }, []);

  async function runSearchWithQuery(q) {
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/owner-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, address: '' }),
      });
      const data = await res.json();
      setResult(data);
      loadHistory();
    } catch(e) {
      console.error(e);
      setResult({ error: 'Search failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('owner_searches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setHistory(data || []);
    } catch(e) { console.error(e); }
    finally { setLoadingHistory(false); }
  }

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/owner-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, address }),
      });
      const data = await res.json();
      setResult(data);
      loadHistory();
    } catch(e) {
      console.error(e);
      setResult({ error: 'Search failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Owner Search</h1>
          <p className="cl-page-subtitle">AI-powered ownership research and entity intelligence</p>
        </div>
      </div>

      {/* Search box */}
      <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>
            🔍 Research Owner / Entity
          </span>
        </div>
        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="cl-search-input"
              placeholder="Owner name, LLC, trust, or company…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              style={{ flex: 2 }}
            />
            <input
              className="cl-search-input"
              placeholder="Property address (optional)"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="cl-btn cl-btn-primary"
              onClick={runSearch}
              disabled={loading || !query.trim()}
              style={{ minWidth: 140 }}
            >
              {loading ? '🔍 Researching…' : '🔍 Research Owner'}
            </button>
            <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 12, color: 'var(--text-tertiary)' }}>
              Uses AI to research ownership structures, decision makers, and contact info
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'flex-start' }}>
        {/* Results */}
        <div>
          {loading && (
            <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 40, textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              <div className="cl-spinner" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 16, fontStyle: 'italic', color: 'var(--blue)', marginBottom: 8 }}>
                Researching ownership…
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Searching public records, entity filings, and property databases.
                This takes 15–30 seconds.
              </div>
            </div>
          )}

          {result && !loading && (
            <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>
                  Research Results
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div style={{ padding: '20px 18px' }}>
                {result.error ? (
                  <div style={{ color: 'var(--rust)', fontSize: 13 }}>{result.error}</div>
                ) : (
                  <>
                    {(() => {
                      const r = result.result || result;
                      const fields = [
                        { label: 'Entity Name',         value: r.name },
                        { label: 'Entity Type',         value: r.type },
                        { label: 'City / Location',     value: r.city },
                        { label: 'Website',             value: r.website },
                        { label: 'Principals',          value: Array.isArray(r.principals) ? r.principals.join(', ') : r.principals },
                        { label: 'Known Markets',       value: Array.isArray(r.known_markets) ? r.known_markets.join(', ') : r.known_markets },
                        { label: 'Portfolio SF',        value: r.portfolio_sf ? Number(r.portfolio_sf).toLocaleString() + ' SF' : null },
                        { label: 'Acquisition Strategy', value: r.acquisition_strategy },
                        { label: 'Recent Activity',     value: r.recent_activity },
                        { label: 'Sell Signals',        value: Array.isArray(r.sell_signals) ? r.sell_signals.join(', ') : r.sell_signals },
                      ].filter(f => f.value);

                      return (
                        <>
                          {r.notes && (
                            <div style={{ borderLeft: '3px solid var(--blue)', paddingLeft: 14, marginBottom: 18 }}>
                              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', fontFamily: 'var(--font-editorial)', fontStyle: 'italic' }}>
                                {r.notes}
                              </p>
                            </div>
                          )}
                          {fields.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                              {fields.map(f => (
                                <div key={f.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-tertiary)', width: 140, flexShrink: 0, paddingTop: 2, textTransform: 'uppercase' }}>
                                    {f.label}
                                  </div>
                                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                    {f.label === 'Website'
                                      ? <a href={f.value.startsWith('http') ? f.value : `https://${f.value}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>{f.value}</a>
                                      : f.value
                                    }
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {fields.length === 0 && !r.notes && (
                            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: 16 }}>
                              No structured data returned. The AI may have returned a narrative — check the raw response.
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                      <button className="cl-btn cl-btn-primary cl-btn-sm">+ Create Lead from Research</button>
                      <button className="cl-btn cl-btn-secondary cl-btn-sm">📋 Save to Property</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!loading && !result && (
            <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '48px 32px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Research any owner or entity
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                Enter an owner name, LLC, trust, or company to research their structure, principals, properties, and contact information.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                {['Chen Family Trust', 'Walton Street Capital', 'Leegin Creative Leather', 'Bridge Investment Group'].map(example => (
                  <button key={example} className="cl-btn cl-btn-secondary cl-btn-sm"
                    onClick={() => { setQuery(example); }}>
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* History sidebar */}
        <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>
              Recent Searches
            </span>
          </div>
          {loadingHistory ? (
            <div className="cl-loading" style={{ padding: 24 }}><div className="cl-spinner" /></div>
          ) : history.length === 0 ? (
            <div style={{ padding: '24px 18px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
                No recent searches
              </div>
            </div>
          ) : history.map(item => (
            <div key={item.id}
              onClick={() => setQuery(item.query || item.entity_name || '')}
              style={{ padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'background 100ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,110,150,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                {item.query || item.entity_name || 'Search'}
              </div>
              {item.address && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>{item.address}</div>
              )}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>
                {fmtDate(item.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
