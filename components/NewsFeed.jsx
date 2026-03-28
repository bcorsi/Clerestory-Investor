'use client';
import { useState, useEffect } from 'react';

const MOCK_ARTICLES = [
  { id: 1, title: 'WARN Act Filings Spike in SGV — 3 Industrial Tenants Announce Layoffs', source: 'CA EDD', date: 'Mar 24', snippet: 'Leegin Creative Leather (287 workers), Pacific Supply Inc. (142 workers), and Global Freight Solutions (89 workers) filed WARN notices for City of Industry and Baldwin Park facilities. Permanent closures expected Q3 2025.', signal: 'WARN', signalColor: 'var(--rust)', url: '#' },
  { id: 2, title: 'Rexford Industrial Realty Expands IE West Portfolio with $220M Acquisition', source: 'CoStar News', date: 'Mar 23', snippet: 'Rexford closed on a 7-property industrial portfolio totaling 1.2M SF in Fontana and Ontario Airport submarkets. Average price of $183/SF reflects continued appetite for last-mile assets near logistics corridors.', signal: 'Buyer Activity', signalColor: 'var(--blue)', url: '#' },
  { id: 3, title: 'Amazon Leases 1.5M SF Fulfillment Center in Moreno Valley — Opens Q1 2026', source: 'Inland Empire Business Journal', date: 'Mar 23', snippet: 'E-commerce giant secures 15-year NNN lease at $1.42/SF/Mo at a newly built Prologis development. Deal underscores continued demand for Class A distribution space in the IE East submarket.', signal: 'New Lease', signalColor: 'var(--green)', url: '#' },
  { id: 4, title: 'SoCal Industrial Vacancy Ticks Up to 4.8% — First Rise in 14 Quarters', source: 'CBRE Research', date: 'Mar 22', snippet: 'Vacancy in the SGV/IE markets climbed 40 bps in Q1 2025 as several large-block availabilities hit the market. Asking rents held steady at $1.38/SF NNN on average across the Inland Empire.', signal: 'Market Shift', signalColor: 'var(--amber)', url: '#' },
  { id: 5, title: 'Snak King Corp Files CapEx Permits — $18M Equipment Expansion at Industry Facility', source: 'LA County DBS', date: 'Mar 21', snippet: 'Multiple building permits filed for mechanical/equipment upgrades totaling $18.4M at 16150 Stephens St, City of Industry. Filings suggest long-term occupancy intent, though SLB scenario remains viable post-upgrade.', signal: 'CapEx Signal', signalColor: 'var(--purple)', url: '#' },
  { id: 6, title: 'Interest Rate Cut Expectations Boost CRE Deal Activity in Q1 2025', source: 'The Real Deal', date: 'Mar 20', snippet: 'Fed comments signal potential rate cuts in H2 2025, re-energizing institutional buyers who had stepped back. Industrial cap rates compressed 15–25 bps in SGV/IE markets on forward-looking repricing.', signal: 'Market Signal', signalColor: 'var(--blue)', url: '#' },
  { id: 7, title: 'City of Industry Adopts New Truck Route Restrictions — Impact on Logistics Tenants', source: 'SGV Tribune', date: 'Mar 19', snippet: 'Effective June 1, heavy trucks restricted from Workman Mill Rd between 10pm–6am. Several industrial tenants near Azusa Canyon corridor evaluating operational adjustments. Sublease risk may increase for affected properties.', signal: 'Regulatory', signalColor: 'var(--amber)', url: '#' },
  { id: 8, title: 'Teledyne Technologies Consolidating Operations — Fontana Facility Listed for Sale', source: 'Broker Intel', date: 'Mar 18', snippet: 'Per broker sources, Teledyne is consolidating Fontana and San Diego operations. The 212K SF Fontana manufacturing facility at 16830 Chestnut St is expected to go to market Q2 2025. Owner-user or investment sale.', signal: 'Disposition', signalColor: 'var(--rust)', url: '#' },
];

const SIGNAL_STYLE = {
  'var(--rust)':   { bg: 'var(--rust-bg)',   bdr: 'var(--rust-bdr)',   color: 'var(--rust)' },
  'var(--blue)':   { bg: 'var(--blue-bg)',   bdr: 'var(--blue-bdr)',   color: 'var(--blue)' },
  'var(--green)':  { bg: 'var(--green-bg)',  bdr: 'var(--green-bdr)',  color: 'var(--green)' },
  'var(--amber)':  { bg: 'var(--amber-bg)',  bdr: 'var(--amber-bdr)',  color: 'var(--amber)' },
  'var(--purple)': { bg: 'var(--purple-bg)', bdr: 'var(--purple-bdr)', color: 'var(--purple)' },
};

export default function NewsFeed({ onNavigate }) {
  const [articles, setArticles] = useState(MOCK_ARTICLES);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = ['all', 'WARN', 'Buyer Activity', 'New Lease', 'Market Shift', 'CapEx Signal'];
  const filtered = activeFilter === 'all' ? articles : articles.filter(a => a.signal === activeFilter);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: ['SGV industrial', 'IE industrial', 'WARN notice SoCal', 'industrial real estate Southern California'] }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.articles?.length) setArticles(data.articles);
      }
    } catch {
      // keep mock data on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>News Feed</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={S.btnGhost} onClick={refresh} disabled={loading}>
            {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* PAGE HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>News <em style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)', fontSize: 36, fontWeight: 400 }}>Feed</em></div>
              <div style={S.pageSub}>SGV · IE industrial market intelligence — updated daily</div>
            </div>
          </div>

          {/* FILTER CHIPS */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {filters.map(f => (
              <button key={f} style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: activeFilter === f ? '1px solid var(--blue)' : '1px solid var(--line)', background: activeFilter === f ? 'var(--blue-bg)' : 'var(--card)', color: activeFilter === f ? 'var(--blue)' : 'var(--ink3)', transition: 'all 0.1s' }}
                onClick={() => setActiveFilter(f)}>
                {f === 'all' ? 'All Signals' : f}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink4)', alignSelf: 'center' }}>{filtered.length} articles</span>
          </div>

          {/* ARTICLES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(a => {
              const ss = SIGNAL_STYLE[a.signalColor] ?? SIGNAL_STYLE['var(--blue)'];
              return (
                <div key={a.id} style={{ ...S.card, cursor: 'pointer' }}
                  onClick={() => a.url && a.url !== '#' && window.open(a.url, '_blank')}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8F6F2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}
                >
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, border: `1px solid ${ss.bdr}`, background: ss.bg, color: ss.color, letterSpacing: '0.04em' }}>{a.signal}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: "'DM Mono',monospace" }}>{a.source}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: "'DM Mono',monospace" }}>{a.date}</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink2)', lineHeight: 1.4, marginBottom: 6 }}>
                        {a.title}
                      </div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', lineHeight: 1.55 }}>
                        {a.snippet}
                      </div>
                      {a.url && a.url !== '#' && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>Read more →</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  pageWrap: { maxWidth: 1200, margin: '0 auto', padding: '0 28px 60px' },
  pageHeader: { padding: '22px 0 16px' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em' },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  btnGhost: { display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  btnLink: { display: 'inline-flex', alignItems: 'center', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--blue)', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  card: { background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
};
