'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60));
  if (diff < 1) return 'Just now';
  if (diff < 24) return `${diff}h ago`;
  if (diff < 48) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CATEGORY_COLORS = {
  'WARN':    'rust',
  'REIT':    'blue',
  'MARKET':  'amber',
  'BESS':    'purple',
  'DEAL':    'green',
  'TENANT':  'amber',
  'BUYER':   'blue',
  'POLICY':  'gray',
  'OTHER':   'gray',
};

const SEED_ARTICLES = [
  { id: 's1', title: 'IE West vacancy ticks to 9.2% as new supply hits market', category: 'MARKET', source: 'CoStar', published_at: new Date(Date.now() - 2*3600000).toISOString(), url: null, summary: 'Industrial vacancy in the Inland Empire West submarket rose to 9.2% in Q1 2026, the first meaningful uptick in 14 quarters as new Class A supply outpaced net absorption.' },
  { id: 's2', title: 'Rexford announces $130M in dispositions for FY2026', category: 'REIT', source: 'Bloomberg', published_at: new Date(Date.now() - 4*3600000).toISOString(), url: null, summary: 'Rexford Industrial confirmed its 2026 disposition target of $500M at its annual investor day, with $130M of assets currently under contract or actively marketed.' },
  { id: 's3', title: 'BESS developers accelerate Long Beach land acquisitions near SCE substations', category: 'BESS', source: 'LADWP Report', published_at: new Date(Date.now() - 24*3600000).toISOString(), url: null, summary: 'Battery energy storage developers including Aypa Power and RWE have accelerated acquisitions of M1/M2 industrial parcels within 0.5 miles of SCE 230kV substations in the Long Beach corridor.' },
  { id: 's4', title: 'SGV industrial rents soften to $1.17/SF as new supply pressures older product', category: 'MARKET', source: 'CBRE Research', published_at: new Date(Date.now() - 48*3600000).toISOString(), url: null, summary: 'After peaking at $1.64/SF/month in mid-2023, SGV industrial lease rates have corrected to $1.17 in Q1 2026 as older functionally obsolete product struggles to compete with new Class A space.' },
  { id: 's5', title: 'WARN filings spike in SGV — 3 industrial tenants announce layoffs', category: 'WARN', source: 'CA EDD', published_at: new Date(Date.now() - 72*3600000).toISOString(), url: null, summary: 'Three industrial tenants in the San Gabriel Valley filed WARN notices this week affecting over 800 workers combined, signaling potential vacancy in three tracked properties.' },
];

export default function NewsFeedPage() {
  const [articles, setArticles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState('');
  const [search, setSearch]       = useState('');
  const [keywords, setKeywords]   = useState([]);

  useEffect(() => { loadArticles(); loadKeywords(); }, [category, search]);

  async function loadArticles() {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('news_articles')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(50);
      if (category) query = query.eq('category', category);
      if (search) query = query.ilike('title', `%${search}%`);
      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        setArticles(SEED_ARTICLES);
      } else {
        setArticles(data);
      }
    } catch(e) {
      setArticles(SEED_ARTICLES);
    } finally {
      setLoading(false);
    }
  }

  async function loadKeywords() {
    try {
      const supabase = createClient();
      const { data } = await supabase.from('news_keywords').select('*').order('keyword');
      setKeywords(data || []);
    } catch(e) { console.error(e); }
  }

  async function fetchLatestNews() {
    setLoading(true);
    try {
      await fetch('/api/news', { method: 'POST' });
      await loadArticles();
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  const categories = ['WARN', 'REIT', 'MARKET', 'BESS', 'DEAL', 'TENANT', 'BUYER', 'POLICY'];

  return (
    <div>
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">News Feed</h1>
          <p className="cl-page-subtitle">SoCal industrial intelligence — curated daily</p>
        </div>
        <div className="cl-page-actions">
          <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={fetchLatestNews}>↻ Fetch Latest</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'flex-start' }}>
        {/* Main feed */}
        <div>
          <div className="cl-filter-bar" style={{ marginBottom: 16 }}>
            <input className="cl-search-input" placeholder="Search headlines…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
            <div className="cl-tabs" style={{ margin: 0, border: 'none', flexWrap: 'wrap' }}>
              <button className={`cl-tab ${category === '' ? 'cl-tab--active' : ''}`}
                onClick={() => setCategory('')} style={{ padding: '5px 10px' }}>All</button>
              {categories.map(c => (
                <button key={c} className={`cl-tab ${category === c ? 'cl-tab--active' : ''}`}
                  onClick={() => setCategory(c)} style={{ padding: '5px 10px' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="cl-loading" style={{ padding: 40 }}><div className="cl-spinner" />Loading news…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {articles.map(article => (
                <div key={article.id} style={{
                  background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 150ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'}
                >
                  <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '8px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`cl-badge cl-badge-${CATEGORY_COLORS[article.category] || 'gray'}`} style={{ fontSize: 9 }}>
                        {article.category || 'NEWS'}
                      </span>
                      {article.source && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>
                          {article.source}
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>
                      {fmtDate(article.published_at)}
                    </span>
                  </div>
                  <div style={{ padding: '14px 18px' }}>
                    {article.url ? (
                      <a href={article.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', lineHeight: 1.4, marginBottom: 8, cursor: 'pointer' }}>
                          {article.title}
                        </div>
                      </a>
                    ) : (
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 8 }}>
                        {article.title}
                      </div>
                    )}
                    {article.summary && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {article.summary}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Keywords sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>
                Tracked Keywords
              </span>
            </div>
            <div style={{ padding: '12px 18px' }}>
              {keywords.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-editorial)', fontSize: 12, fontStyle: 'italic', color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px 0' }}>
                  No keywords configured
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {keywords.map(kw => (
                    <span key={kw.id} className="cl-badge cl-badge-blue" style={{ fontSize: 11 }}>{kw.keyword}</span>
                  ))}
                </div>
              )}
              <button className="cl-btn cl-btn-secondary cl-btn-sm" style={{ marginTop: 12, width: '100%' }}>
                + Add Keyword
              </button>
            </div>
          </div>

          <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>
                Sources
              </span>
            </div>
            <div style={{ padding: '12px 18px' }}>
              {['CoStar News', 'CA EDD (WARN)', 'CBRE Research', 'Bloomberg RE', 'JLL Market Reports', 'Colliers Research'].map(src => (
                <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{src}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
