'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtM(n) { return n != null && n > 0 ? `$${(Number(n)/1000000).toFixed(1)}M` : '—'; }

export default function CompAnalyticsPage() {
  const [leaseStats, setLeaseStats]   = useState(null);
  const [saleStats, setSaleStats]     = useState(null);
  const [leaseByCity, setLeaseByCity] = useState([]);
  const [saleByCity, setSaleByCity]   = useState([]);
  const [leaseByYear, setLeaseByYear] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('lease');

  useEffect(() => { loadAnalytics(); }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const supabase = createClient();
      const [
        { data: leaseData },
        { data: saleData },
      ] = await Promise.all([
        supabase.from('lease_comps').select('city, rate, gross_equivalent, rsf, start_date, submarket, lease_type'),
        supabase.from('sale_comps').select('city, sale_price, price_psf, cap_rate, building_sf, sale_date, submarket, sale_type'),
      ]);

      // ── LEASE STATS ─────────────────────────────────────
      if (leaseData && leaseData.length > 0) {
        const rates = leaseData.filter(c => c.rate > 0).map(c => Number(c.rate));
        const gross = leaseData.filter(c => c.gross_equivalent > 0).map(c => Number(c.gross_equivalent));
        const rsfs  = leaseData.filter(c => c.rsf > 0).map(c => Number(c.rsf));

        setLeaseStats({
          count: leaseData.length,
          avgRate: rates.length ? rates.reduce((a,b) => a+b, 0) / rates.length : 0,
          avgGross: gross.length ? gross.reduce((a,b) => a+b, 0) / gross.length : 0,
          avgSf: rsfs.length ? rsfs.reduce((a,b) => a+b, 0) / rsfs.length : 0,
          maxRate: Math.max(...rates),
          minRate: Math.min(...rates),
        });

        // By city
        const cityMap = {};
        leaseData.forEach(c => {
          if (!c.city || !c.rate) return;
          if (!cityMap[c.city]) cityMap[c.city] = { rates: [], count: 0 };
          cityMap[c.city].rates.push(Number(c.rate));
          cityMap[c.city].count++;
        });
        const byCity = Object.entries(cityMap)
          .map(([city, d]) => ({ city, avg: d.rates.reduce((a,b)=>a+b,0)/d.rates.length, count: d.count }))
          .filter(d => d.count >= 2)
          .sort((a,b) => b.avg - a.avg)
          .slice(0, 12);
        setLeaseByCity(byCity);

        // By year
        const yearMap = {};
        leaseData.forEach(c => {
          if (!c.start_date || !c.rate) return;
          const yr = new Date(c.start_date).getFullYear();
          if (!yearMap[yr]) yearMap[yr] = { rates: [], count: 0 };
          yearMap[yr].rates.push(Number(c.rate));
          yearMap[yr].count++;
        });
        const byYear = Object.entries(yearMap)
          .map(([year, d]) => ({ year: Number(year), avg: d.rates.reduce((a,b)=>a+b,0)/d.rates.length, count: d.count }))
          .sort((a,b) => a.year - b.year);
        setLeaseByYear(byYear);
      }

      // ── SALE STATS ───────────────────────────────────────
      if (saleData && saleData.length > 0) {
        const psfs   = saleData.filter(c => c.price_psf > 0).map(c => Number(c.price_psf));
        const prices = saleData.filter(c => c.sale_price > 0).map(c => Number(c.sale_price));
        const caps   = saleData.filter(c => c.cap_rate > 0).map(c => Number(c.cap_rate));

        setSaleStats({
          count: saleData.length,
          avgPsf: psfs.length ? psfs.reduce((a,b)=>a+b,0)/psfs.length : 0,
          avgPrice: prices.length ? prices.reduce((a,b)=>a+b,0)/prices.length : 0,
          avgCap: caps.length ? caps.reduce((a,b)=>a+b,0)/caps.length : 0,
          maxPsf: Math.max(...psfs),
          minPsf: Math.min(...psfs),
          totalVolume: prices.reduce((a,b)=>a+b,0),
        });

        // By city
        const cityMap = {};
        saleData.forEach(c => {
          if (!c.city || !c.price_psf) return;
          if (!cityMap[c.city]) cityMap[c.city] = { psfs: [], count: 0 };
          cityMap[c.city].psfs.push(Number(c.price_psf));
          cityMap[c.city].count++;
        });
        const byCity = Object.entries(cityMap)
          .map(([city, d]) => ({ city, avg: d.psfs.reduce((a,b)=>a+b,0)/d.psfs.length, count: d.count }))
          .filter(d => d.count >= 2)
          .sort((a,b) => b.avg - a.avg)
          .slice(0, 12);
        setSaleByCity(byCity);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Simple bar chart using divs
  function BarChart({ data, valueKey, labelKey, valueFormat, color = 'var(--blue)', height = 180 }) {
    if (!data || data.length === 0) return <div className="cl-empty" style={{ padding: 32 }}><div className="cl-empty-label">No data</div></div>;
    const max = Math.max(...data.map(d => d[valueKey]));
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.2 }}>
              {valueFormat(d[valueKey])}
            </div>
            <div style={{
              width: '100%', background: color, borderRadius: '3px 3px 0 0',
              height: `${Math.max(4, (d[valueKey] / max) * (height - 40))}px`,
              transition: 'height 300ms ease', opacity: 0.85,
            }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.2, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d[labelKey]}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function LineChart({ data, height = 140 }) {
    if (!data || data.length < 2) return <div className="cl-empty" style={{ padding: 32 }}><div className="cl-empty-label">Not enough data</div></div>;
    const max = Math.max(...data.map(d => d.avg));
    const min = Math.min(...data.map(d => d.avg));
    const range = max - min || 0.01;
    const w = 100 / (data.length - 1);

    const points = data.map((d, i) => ({
      x: i * w,
      y: 100 - ((d.avg - min) / range) * 80 - 10,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div style={{ position: 'relative', height }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: height - 24, display: 'block' }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${pathD} L ${points[points.length-1].x} 100 L ${points[0].x} 100 Z`} fill="url(#lineGrad)" />
          <path d={pathD} fill="none" stroke="var(--blue)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1.2" fill="var(--blue)" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {data.map((d, i) => (
            <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              {d.year}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) return <div className="cl-loading" style={{ padding: 60 }}><div className="cl-spinner" />Loading analytics…</div>;

  return (
    <div>
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Comp Analytics</h1>
          <p className="cl-page-subtitle">SGV & Inland Empire Industrial — Market Intelligence</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="cl-tabs" style={{ marginBottom: 20 }}>
        <button className={`cl-tab ${activeTab === 'lease' ? 'cl-tab--active' : ''}`} onClick={() => setActiveTab('lease')}>Lease Comps</button>
        <button className={`cl-tab ${activeTab === 'sale' ? 'cl-tab--active' : ''}`} onClick={() => setActiveTab('sale')}>Sale Comps</button>
      </div>

      {/* ── LEASE ANALYTICS ── */}
      {activeTab === 'lease' && leaseStats && (
        <>
          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Comps',   value: fmt(leaseStats.count) },
              { label: 'Avg NNN Rate',  value: `$${leaseStats.avgRate.toFixed(2)}`, color: 'var(--blue)' },
              { label: 'Avg Gross Rate', value: `$${leaseStats.avgGross.toFixed(2)}`, color: 'var(--green)' },
              { label: 'High Water',    value: `$${leaseStats.maxRate.toFixed(2)}`, color: 'var(--rust)' },
              { label: 'Avg Deal Size', value: `${Math.round(leaseStats.avgSf / 1000)}K SF` },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '8px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#78726A' }}>{kpi.label}</span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: kpi.color || 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {kpi.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Avg NNN rate by city */}
            <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>Avg NNN Rate by City ($/SF/mo)</span>
              </div>
              <div style={{ padding: '20px 18px' }}>
                <BarChart data={leaseByCity} valueKey="avg" labelKey="city" valueFormat={v => `$${v.toFixed(2)}`} color="var(--blue)" height={200} />
              </div>
            </div>

            {/* Rate trend by year */}
            <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>NNN Rate Trend by Year</span>
              </div>
              <div style={{ padding: '20px 18px' }}>
                <LineChart data={leaseByYear} height={200} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>Low: ${leaseStats.minRate.toFixed(2)}/SF/mo</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>High: ${leaseStats.maxRate.toFixed(2)}/SF/mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Data table */}
          <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>Rate Summary by City</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['City', 'Avg NNN Rate', 'Comp Count'].map(h => (
                    <th key={h} style={{ background: 'rgba(0,0,0,0.015)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 18px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaseByCity.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '10px 18px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{row.city}</td>
                    <td style={{ padding: '10px 18px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>${row.avg.toFixed(2)}/SF/mo</td>
                    <td style={{ padding: '10px 18px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>{row.count} comps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── SALE ANALYTICS ── */}
      {activeTab === 'sale' && saleStats && (
        <>
          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Comps',   value: fmt(saleStats.count) },
              { label: 'Avg $/SF',      value: `$${Math.round(saleStats.avgPsf)}`, color: 'var(--blue)' },
              { label: 'Avg Cap Rate',  value: saleStats.avgCap > 0 ? `${saleStats.avgCap.toFixed(2)}%` : '—', color: 'var(--green)' },
              { label: 'High Water $/SF', value: `$${Math.round(saleStats.maxPsf)}`, color: 'var(--rust)' },
              { label: 'Total Volume',  value: fmtM(saleStats.totalVolume), color: 'var(--purple)' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '8px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#78726A' }}>{kpi.label}</span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: kpi.color || 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {kpi.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart by city */}
          <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', marginBottom: 20 }}>
            <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>Avg $/SF by City</span>
            </div>
            <div style={{ padding: '20px 18px' }}>
              <BarChart data={saleByCity} valueKey="avg" labelKey="city" valueFormat={v => `$${Math.round(v)}`} color="var(--green)" height={220} />
            </div>
          </div>

          {/* Data table */}
          <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '10px 18px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#78726A' }}>$/SF Summary by City</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['City', 'Avg $/SF', 'Comp Count'].map(h => (
                    <th key={h} style={{ background: 'rgba(0,0,0,0.015)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 18px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {saleByCity.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '10px 18px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{row.city}</td>
                    <td style={{ padding: '10px 18px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>${Math.round(row.avg)}/SF</td>
                    <td style={{ padding: '10px 18px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>{row.count} comps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
