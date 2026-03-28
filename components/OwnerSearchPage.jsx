'use client';
import { useState } from 'react';

const MOCK_RESULTS = [
  { id: 1, owner: 'Leegin Creative Leather Products', entityType: 'Corp', properties: 1, totalSF: '186,400 SF', markets: 'SGV', estValue: '$48M', heldSince: 2009, contactStatus: 'Active' },
  { id: 2, owner: 'RJ Neu Properties', entityType: 'Private LLC', properties: 2, totalSF: '408,000 SF', markets: 'SGV', estValue: '$95M', heldSince: 1998, contactStatus: 'Active' },
  { id: 3, owner: 'Snak King Corp', entityType: 'Corp', properties: 5, totalSF: '18.84 ac', markets: 'SGV', estValue: '$62M', heldSince: 2005, contactStatus: 'Active' },
  { id: 4, owner: 'Tarhong Industry LLC', entityType: 'Private LLC', properties: 1, totalSF: '96,000 SF', markets: 'SGV', estValue: '$24M', heldSince: 2012, contactStatus: 'Contacted' },
  { id: 5, owner: 'Smith Family Trust', entityType: 'Trust', properties: 3, totalSF: '145,000 SF', markets: 'IE West', estValue: '$38M', heldSince: 1987, contactStatus: 'Never' },
  { id: 6, owner: 'Pacific Coast Mfg LLC', entityType: 'LLC', properties: 2, totalSF: '88,000 SF', markets: 'SGV', estValue: '$28M', heldSince: 2001, contactStatus: 'Never' },
];

const STATUS_STYLE = {
  Active: { bg: 'var(--green-bg)', bdr: 'var(--green-bdr)', color: 'var(--green)' },
  Contacted: { bg: 'var(--blue-bg)', bdr: 'var(--blue-bdr)', color: 'var(--blue)' },
  Never: { bg: 'var(--bg2)', bdr: 'var(--line)', color: 'var(--ink4)' },
};

export default function OwnerSearchPage({ onNavigate, onSelectAccount, onSelectProperty, accounts, properties }) {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [market, setMarket] = useState('');
  const [ownerType, setOwnerType] = useState('');
  const [webLoading, setWebLoading] = useState(false);
  const [webResult, setWebResult] = useState(null);
  const [localResults, setLocalResults] = useState([]);
  const [loanMaturity, setLoanMaturity] = useState('');

  const handleSearch = async () => {
    if (!query.trim() && !market && !ownerType) return;
    setSearched(true);
    setWebLoading(true);
    setWebResult(null);

    // Search local app data: properties by owner + accounts by name
    const q = query.toLowerCase().trim();
    const matchedAccounts = (accounts || []).filter(a => {
      const nameMatch = !q || (a.name || '').toLowerCase().includes(q);
      const mktMatch = !market || (a.city || a.market || a.location || '').toLowerCase().includes(market.toLowerCase());
      const typeMatch = !ownerType || (a.account_type || a.type || '').toLowerCase().includes(ownerType.toLowerCase());
      return nameMatch && mktMatch && typeMatch;
    }).map(a => ({ ...a, _type: 'account', owner: a.name }));
    const matchedProperties = (properties || []).filter(p => {
      const nameMatch = !q || (p.owner || '').toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q);
      const mktMatch = !market || (p.city || p.submarket || p.market || '').toLowerCase().includes(market.toLowerCase());
      return nameMatch && mktMatch;
    }).map(p => ({ ...p, _type: 'property', owner: p.owner || p.address, entityType: p.owner_type || '—', totalSF: p.building_sf ? `${Number(p.building_sf).toLocaleString()} SF` : '—', markets: p.submarket || p.city || '—' }));
    setLocalResults([...matchedProperties, ...matchedAccounts]);
    setWebLoading(false);
  };

  const filtered = searched ? MOCK_RESULTS.filter(r => {
    if (ownerType && r.entityType !== ownerType) return false;
    if (market && !r.markets.includes(market)) return false;
    return true;
  }) : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>Owner Search</span>
        {searched && (
          <div style={{ marginLeft: 'auto' }}>
            <button style={S.btnGhost} onClick={() => {}}>↓ Export Results</button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>Owner <em style={S.pageTitleEm}>Search</em></div>
              <div style={S.pageSub}>Find private owners by APN, address, or company name</div>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#6E6860" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="#6E6860" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by APN, address, or owner name…"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 15, color: 'var(--ink2)' }}
              />
            </div>
            <button style={S.btnBlue} onClick={handleSearch}>Search</button>
          </div>

          {/* FILTER PANEL */}
          <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={S.filterLabel}>Market</div>
              <select style={S.select} value={market} onChange={e => setMarket(e.target.value)}>
                <option value="">All Markets</option>
                <option>SGV</option>
                <option>IE West</option>
                <option>IE East</option>
                <option>OC</option>
              </select>
            </div>
            <div>
              <div style={S.filterLabel}>Owner Type</div>
              <select style={S.select} value={ownerType} onChange={e => setOwnerType(e.target.value)}>
                <option value="">All Types</option>
                <option>Private LLC</option>
                <option>Corp</option>
                <option>LLC</option>
                <option>Trust</option>
                <option>REIT</option>
              </select>
            </div>
            <div>
              <div style={S.filterLabel}>Property Size</div>
              <select style={S.select}>
                <option>Any SF</option>
                <option>sub-50K SF</option>
                <option>50K–100K SF</option>
                <option>100K–250K SF</option>
                <option>250K+ SF</option>
              </select>
            </div>
            <div>
              <div style={S.filterLabel}>Held Since</div>
              <select style={S.select}>
                <option>Any Year</option>
                <option>Before 1990</option>
                <option>1990–2000</option>
                <option>2000–2010</option>
                <option>2010+</option>
              </select>
            </div>
            <div>
              <div style={S.filterLabel}>Loan Maturity</div>
              <select style={S.select} value={loanMaturity} onChange={e => setLoanMaturity(e.target.value)}>
                <option value="">Any</option>
                <option>Within 1 yr</option>
                <option>Within 2 yrs</option>
                <option>Within 3 yrs</option>
              </select>
            </div>
            <button style={S.btnGhost} onClick={handleSearch}>Apply Filters</button>
          </div>

          {/* RESULTS */}
          {!searched && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 16 }}>
              Enter a search term or apply filters to find property owners
            </div>
          )}

          {searched && (
            <>
              {/* In Clerestory section */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 10 }}>In Clerestory</div>
                {localResults.length === 0 ? (
                  <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', padding: '24px', textAlign: 'center', color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 14 }}>No matches in Clerestory</div>
                ) : (
                  <div style={S.tblWrap}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)' }}>{['Owner Name', 'Entity Type', 'Properties', 'Total SF', 'Markets', 'Est. Value', 'Held Since', 'Contact Status'].map(col => <th key={col} style={S.th}>{col}</th>)}</tr></thead>
                      <tbody>
                        {localResults.map((r, i) => {
                          const ss = STATUS_STYLE[r.contactStatus] ?? STATUS_STYLE.Never;
                          return <OwnerRow key={r.id || i} row={r} last={i === localResults.length - 1} ss={ss} onClick={() => onSelectAccount?.({ name: r.owner || r.name, type: r.entityType || r.type, initial: (r.owner || r.name || '?')[0], location: r.markets || r.location })} />;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Web Research section */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 10 }}>Web Research (AI)</div>
                {webLoading ? (
                  <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', padding: '24px', textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>Researching owner intel…</div>
                ) : webResult ? (
                  <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink2)' }}>{webResult.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>{webResult.type} · {webResult.city}, {webResult.state}</div>
                      </div>
                      {webResult.website && <a href={`https://${webResult.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--blue)' }}>{webResult.website}</a>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
                      {[['Est. SF', webResult.portfolio_sf ? webResult.portfolio_sf.toLocaleString() + ' SF' : '—'], ['Properties', webResult.properties_count ?? '—'], ['Markets', (webResult.known_markets || []).join(', ') || '—']].map(([k, v]) => (
                        <div key={k} style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 16px' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 4 }}>{k}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink2)' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {webResult.acquisition_strategy && <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 8 }}><strong>Strategy:</strong> {webResult.acquisition_strategy}</div>}
                    {webResult.notes && <div style={{ fontSize: 12, color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic' }}>{webResult.notes}</div>}
                  </div>
                ) : null}
              </div>

              {/* Legacy results table */}
              {filtered.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 10 }}>Filtered Results</div>
                  <div style={S.tblWrap}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)' }}>{['Owner Name', 'Entity Type', 'Properties', 'Total SF', 'Markets', 'Est. Value', 'Held Since', 'Contact Status'].map(col => <th key={col} style={S.th}>{col}</th>)}</tr></thead>
                      <tbody>
                        {filtered.map((r, i) => {
                          const ss = STATUS_STYLE[r.contactStatus];
                          return <OwnerRow key={r.id} row={r} last={i === filtered.length - 1} ss={ss} onClick={() => onSelectAccount?.({ name: r.owner, type: r.entityType, initial: r.owner[0], location: r.markets })} />;
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OwnerRow({ row: r, last, ss, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <tr style={{ borderBottom: last ? 'none' : '1px solid var(--line2)', background: hover ? 'var(--bg)' : '', cursor: 'pointer', transition: 'background 0.1s' }}
      onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <td style={S.td}><div style={{ fontWeight: 500, color: 'var(--ink2)' }}>{r.owner}</div></td>
      <td style={S.td}><span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--ink3)' }}>{r.entityType}</span></td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", textAlign: 'center' }}>{r.properties}</td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace" }}>{r.totalSF}</td>
      <td style={S.td}>{r.markets}</td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace", fontWeight: 600, color: 'var(--green)' }}>{r.estValue}</td>
      <td style={{ ...S.td, fontFamily: "'DM Mono',monospace" }}>{r.heldSince}</td>
      <td style={S.td}><span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 500, background: ss.bg, border: `1px solid ${ss.bdr}`, color: ss.color }}>{r.contactStatus}</span></td>
    </tr>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  pageWrap: { maxWidth: 1400, minWidth: 900, margin: '0 auto', padding: '0 28px 60px' },
  pageHeader: { padding: '22px 0 16px' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em' },
  pageTitleEm: { fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)', fontSize: 36, fontWeight: 400 },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  filterLabel: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink4)', marginBottom: 5 },
  select: { padding: '7px 12px', borderRadius: 7, fontSize: 12.5, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink2)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' },
  tblWrap: { background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  th: { padding: '9px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink4)', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', fontSize: 13, color: 'var(--ink3)', verticalAlign: 'middle' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  btnBlue: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontFamily: 'inherit' },
};
