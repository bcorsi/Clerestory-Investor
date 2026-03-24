'use client';

import { useState, useMemo, useCallback } from 'react';
import { fetchNewsArticles, saveNewsArticles, markArticleRead, toggleArticleStar, fetchNewsKeywords } from '../lib/db';

const SIGNAL_COLORS = {
  'SLB': { bg: 'rgba(26,122,72,0.1)', color: 'var(--green)' },
  'Vacancy': { bg: 'rgba(192,60,24,0.1)', color: 'var(--red)' },
  'Expansion': { bg: 'rgba(85,119,160,0.1)', color: 'var(--blue)' },
  'Distress': { bg: 'rgba(192,60,24,0.1)', color: 'var(--red)' },
  'M&A': { bg: 'rgba(187,136,255,0.1)', color: '#BB88FF' },
  'Relocation': { bg: 'rgba(232,160,32,0.1)', color: 'var(--amber)' },
  'Development': { bg: 'rgba(85,119,160,0.1)', color: 'var(--blue)' },
  'Policy': { bg: 'var(--bg-input)', color: 'var(--text-muted)' },
};

export default function NewsFeed({ articles: initialArticles, properties, accounts, leads, onRefresh, showToast, onPropertyClick, onLeadClick, onAccountClick }) {
  const [articles, setArticles] = useState(initialArticles || []);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all | unread | starred | matched
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = [...articles];
    if (filter === 'unread') list = list.filter(a => !a.read);
    if (filter === 'starred') list = list.filter(a => a.starred);
    if (filter === 'matched') list = list.filter(a => a.matched_entity_name);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => [a.title, a.snippet, a.source, a.matched_entity_name].some(f => f && f.toLowerCase().includes(q)));
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [articles, filter, search]);

  const stats = useMemo(() => ({
    total: articles.length,
    unread: articles.filter(a => !a.read).length,
    matched: articles.filter(a => a.matched_entity_name).length,
    starred: articles.filter(a => a.starred).length,
  }), [articles]);

  const handleFetchNews = async () => {
    setLoading(true);
    try {
      // Get active keywords
      const keywords = await fetchNewsKeywords();
      const highPriority = keywords.filter(k => k.priority === 'High').map(k => k.keyword);
      const medPriority = keywords.filter(k => k.priority === 'Medium').map(k => k.keyword);
      // Send top 8 high-priority keywords
      const batch = [...highPriority.slice(0, 6), ...medPriority.slice(0, 2)];

      if (batch.length === 0) {
        showToast?.('No active keywords — add some in Settings');
        setLoading(false);
        return;
      }

      const entities = {
        properties: (properties || []).slice(0, 20).map(p => ({ address: p.address, owner: p.owner, tenant: p.tenant })),
        accounts: (accounts || []).slice(0, 30).map(a => ({ name: a.name })),
        leads: (leads || []).slice(0, 20).map(l => ({ lead_name: l.lead_name, company: l.company })),
      };

      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: batch, entities }),
      });

      if (!res.ok) throw new Error('News fetch failed');
      const data = await res.json();

      if (data.articles?.length > 0) {
        // Save to Supabase (deduplicates by URL)
        const saved = await saveNewsArticles(data.articles.map(a => ({
          title: a.title,
          url: a.url,
          source: a.source,
          snippet: a.snippet,
          published_at: a.published_at || null,
          matched_keywords: a.matched_keywords || [],
          matched_entity_name: a.matched_entity_name || null,
        })));
        showToast?.(`${saved.length} new articles found`);
        // Reload
        const fresh = await fetchNewsArticles();
        setArticles(fresh);
      } else {
        showToast?.('No new articles found');
      }
    } catch (e) {
      console.error('News fetch error:', e);
      showToast?.('Error fetching news');
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async (id) => {
    await markArticleRead(id);
    setArticles(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const handleStar = async (id, starred) => {
    await toggleArticleStar(id, !starred);
    setArticles(prev => prev.map(a => a.id === id ? { ...a, starred: !starred } : a));
  };

  const [synopsisLoading, setSynopsisLoading] = useState(false);
  const [synopsis, setSynopsis] = useState(null);

  const handleSynopsis = async () => {
    setSynopsisLoading(true);
    try {
      const recent = articles.slice(0, 10);
      if (!recent.length) { showToast?.('No articles to synthesize'); setSynopsisLoading(false); return; }
      const articlesText = recent.map((a, i) => `${i+1}. [${a.source||'Unknown'}] ${a.title}: ${a.snippet || ''}`).join('\n');
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 600,
          system: 'You are a CRE brokerage intelligence analyst. Synthesize news articles into a brief daily intelligence brief for an industrial broker covering SGV and Inland Empire. Focus on actionable signals: deals, tenant moves, vacancies, rent trends, M&A activity. Be concise and specific.',
          messages: [{ role: 'user', content: `Synthesize these ${recent.length} articles into a 2-3 paragraph daily intel brief:\n\n${articlesText}` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'Could not generate synopsis.';
      setSynopsis(text);
    } catch { setSynopsis('Error generating synopsis.'); }
    finally { setSynopsisLoading(false); }
  };

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleFetchNews} disabled={loading}>
          {loading ? '✦ Scanning...' : '✦ Scan News'}
        </button>
        <button className="btn" onClick={handleSynopsis} disabled={synopsisLoading || articles.length === 0}>
          {synopsisLoading ? '✦ Synthesizing...' : '✦ AI Synopsis'}
        </button>
        <input className="input" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '220px' }} />
        {['all', 'unread', 'starred', 'matched'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              background: filter === f ? 'var(--accent-bg)' : 'transparent',
              borderColor: filter === f ? 'var(--accent)' : 'var(--border)',
              color: filter === f ? 'var(--accent)' : 'var(--text-muted)' }}>
            {f === 'all' ? `All (${stats.total})` : f === 'unread' ? `Unread (${stats.unread})` : f === 'starred' ? `★ (${stats.starred})` : `Matched (${stats.matched})`}
          </button>
        ))}
      </div>

      {/* AI Synopsis */}
      {synopsis && (
        <div style={{ padding: '16px 20px', background: 'var(--purple-bg)', border: '1px solid rgba(96,64,168,0.2)', borderRadius: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>✦ Daily Intelligence Brief</div>
            <button onClick={() => setSynopsis(null)} style={{ background: 'none', border: 'none', color: 'var(--ink4)', cursor: 'pointer', fontSize: '14px' }}>×</button>
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>{synopsis}</div>
        </div>
      )}

      {/* Articles */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '40px' }}>
          <div className="empty-state-icon">📰</div>
          <div className="empty-state-title">{articles.length === 0 ? 'No Articles Yet' : 'No Articles Match Filter'}</div>
          <div className="empty-state-sub">{articles.length === 0 ? 'Click "Scan News" to search the web for articles matching your intelligence keywords.' : 'Try adjusting filters or search.'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(a => {
            const sig = SIGNAL_COLORS[a.catalyst_signal] || SIGNAL_COLORS['Policy'];
            return (
              <div key={a.id} className="card" style={{ padding: '14px 18px', opacity: a.read ? 0.7 : 1, borderLeft: a.matched_entity_name ? '4px solid var(--green)' : '4px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {a.source && <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{a.source}</span>}
                      {a.catalyst_signal && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: sig.bg, color: sig.color, fontWeight: 600 }}>{a.catalyst_signal}</span>
                      )}
                      {a.matched_entity_name && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(26,122,72,0.1)', color: 'var(--green)', fontWeight: 600 }}>↗ {a.matched_entity_name}</span>
                      )}
                    </div>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" onClick={() => handleRead(a.id)}
                      style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', lineHeight: 1.4 }}>
                      {a.title}
                    </a>
                    {a.snippet && (
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '4px' }}>{a.snippet}</div>
                    )}
                    {a.matched_keywords?.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {a.matched_keywords.slice(0, 5).map((k, i) => (
                          <span key={i} style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'var(--bg-input)', color: 'var(--text-muted)' }}>{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px', alignItems: 'flex-start' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleStar(a.id, a.starred); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: a.starred ? 'var(--amber)' : 'var(--text-muted)', padding: '2px' }}>
                      {a.starred ? '★' : '☆'}
                    </button>
                    <div style={{ position: 'relative' }}>
                      <button onClick={(e) => { e.stopPropagation(); const el = e.currentTarget.nextSibling; el.style.display = el.style.display === 'block' ? 'none' : 'block'; }}
                        style={{ background: 'none', border: '1px solid var(--line)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: 'var(--ink3)', padding: '2px 6px', fontWeight: 600 }}>
                        + Link
                      </button>
                      <div style={{ display: 'none', position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px', zIndex: 10, minWidth: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Link to...</div>
                        {(leads || []).slice(0, 5).map(l => (
                          <div key={l.id} onClick={async (e) => {
                            e.stopPropagation();
                            try { const { insertRow } = await import('../lib/db'); await insertRow('notes', { content: `📰 News: ${a.title}\n${a.snippet || ''}\n\nSource: ${a.source || ''}\nURL: ${a.url || ''}`, note_type: 'Intel', lead_id: l.id }); showToast?.(`Linked to ${l.lead_name}`); } catch(err) { console.error(err); }
                          }} style={{ padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: 'var(--ink2)' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                            🎯 {l.lead_name}
                          </div>
                        ))}
                        {(properties || []).slice(0, 5).map(p => (
                          <div key={p.id} onClick={async (e) => {
                            e.stopPropagation();
                            try { const { insertRow } = await import('../lib/db'); await insertRow('notes', { content: `📰 News: ${a.title}\n${a.snippet || ''}\n\nSource: ${a.source || ''}\nURL: ${a.url || ''}`, note_type: 'Intel', property_id: p.id }); showToast?.(`Linked to ${p.address}`); } catch(err) { console.error(err); }
                          }} style={{ padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: 'var(--ink2)' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                            🏭 {p.address}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
