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

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleFetchNews} disabled={loading}>
          {loading ? '✦ Scanning...' : '✦ Scan News'}
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
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleStar(a.id, a.starred); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: a.starred ? 'var(--amber)' : 'var(--text-muted)', padding: '2px' }}>
                      {a.starred ? '★' : '☆'}
                    </button>
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
