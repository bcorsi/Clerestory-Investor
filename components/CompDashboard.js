'use client';

import { useState, useMemo } from 'react';
import { fmt } from '../lib/constants';

// ── Inline SVG mini-chart components ─────────────────────────

function BarChart({ data, width = 520, height = 220, label = 'value', color = 'var(--accent)' }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 0.01);
  const barW = Math.min(36, (width - 40) / data.length - 6);
  const chartH = height - 44;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * (chartH - 20);
        const x = 30 + i * ((width - 40) / data.length);
        const y = chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3}
              fill={d.color || color} opacity={0.85} />
            <text x={x + barW / 2} y={y - 6} textAnchor="middle"
              style={{ fontSize: '10px', fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {typeof d.value === 'number' && d.value < 100 ? d.value.toFixed(2) : Math.round(d.value)}
            </text>
            <text x={x + barW / 2} y={height - 4} textAnchor="middle"
              style={{ fontSize: '9px', fill: 'var(--text-muted)' }}
              transform={data.length > 8 ? `rotate(-35 ${x + barW / 2} ${height - 4})` : ''}>
              {d.label.length > 12 ? d.label.slice(0, 11) + '…' : d.label}
            </text>
          </g>
        );
      })}
      {/* Y-axis line */}
      <line x1={26} y1={0} x2={26} y2={chartH} stroke="var(--border-subtle)" strokeWidth={1} />
    </svg>
  );
}

function HorizontalBarChart({ data, width = 520, height, color = 'var(--accent)' }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 0.01);
  const rowH = 28;
  const h = height || data.length * rowH + 8;
  const labelW = 140;
  const barArea = width - labelW - 60;

  return (
    <svg width={width} height={h} style={{ display: 'block' }}>
      {data.map((d, i) => {
        const barW = (d.value / maxVal) * barArea;
        const y = i * rowH + 4;
        return (
          <g key={i}>
            <text x={labelW - 8} y={y + 18} textAnchor="end"
              style={{ fontSize: '11px', fill: 'var(--text-secondary)' }}>
              {d.label.length > 18 ? d.label.slice(0, 17) + '…' : d.label}
            </text>
            <rect x={labelW} y={y + 4} width={barW} height={18} rx={3}
              fill={d.color || color} opacity={0.8} />
            <text x={labelW + barW + 6} y={y + 18}
              style={{ fontSize: '10px', fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {typeof d.value === 'number' && d.value < 100 ? `$${d.value.toFixed(2)}` : d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ScatterDot({ data, width = 520, height = 240 }) {
  if (!data.length) return null;
  const minX = Math.min(...data.map(d => d.x));
  const maxX = Math.max(...data.map(d => d.x));
  const minY = Math.min(...data.map(d => d.y)) * 0.9;
  const maxY = Math.max(...data.map(d => d.y)) * 1.05;
  const pad = { l: 50, r: 20, t: 10, b: 30 };
  const cw = width - pad.l - pad.r;
  const ch = height - pad.t - pad.b;
  const scaleX = (v) => pad.l + ((v - minX) / (maxX - minX || 1)) * cw;
  const scaleY = (v) => pad.t + ch - ((v - minY) / (maxY - minY || 1)) * ch;

  // Y axis ticks
  const yTicks = 5;
  const yStep = (maxY - minY) / yTicks;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Grid lines + y labels */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = minY + i * yStep;
        const y = scaleY(val);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={width - pad.r} y2={y} stroke="var(--border-subtle)" strokeWidth={0.5} />
            <text x={pad.l - 6} y={y + 3} textAnchor="end"
              style={{ fontSize: '9px', fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ${val.toFixed(2)}
            </text>
          </g>
        );
      })}
      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={scaleX(d.x)} cy={scaleY(d.y)} r={Math.max(3, Math.min(8, d.size ? d.size / 10000 : 5))}
          fill={d.color || 'var(--accent)'} opacity={0.65} stroke={d.color || 'var(--accent)'} strokeWidth={1} />
      ))}
      {/* X axis */}
      <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke="var(--border-subtle)" strokeWidth={1} />
    </svg>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', minWidth: '130px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function CompDashboard({ leaseComps, saleComps }) {
  const [tab, setTab] = useState('lease');

  // ── LEASE COMP ANALYTICS ───
  const leaseStats = useMemo(() => {
    const comps = leaseComps || [];
    if (!comps.length) return null;

    const withRate = comps.filter(c => c.rate && c.rate > 0);
    const avgRate = withRate.length ? withRate.reduce((s, c) => s + Number(c.rate), 0) / withRate.length : 0;
    const medRate = withRate.length ? [...withRate].sort((a, b) => a.rate - b.rate)[Math.floor(withRate.length / 2)].rate : 0;
    const totalSf = comps.reduce((s, c) => s + (Number(c.rsf) || 0), 0);

    // By submarket
    const bySubmarket = {};
    withRate.forEach(c => {
      const sm = c.submarket || c.city || 'Unknown';
      if (!bySubmarket[sm]) bySubmarket[sm] = { rates: [], count: 0, sf: 0 };
      bySubmarket[sm].rates.push(Number(c.rate));
      bySubmarket[sm].count++;
      bySubmarket[sm].sf += Number(c.rsf) || 0;
    });
    const submarketAvgs = Object.entries(bySubmarket)
      .map(([name, d]) => ({
        label: name,
        value: d.rates.reduce((s, r) => s + r, 0) / d.rates.length,
        count: d.count,
        color: name.includes('Ontario') ? 'var(--accent)' : name.includes('Industry') ? 'var(--green)' : name.includes('Fontana') ? 'var(--amber)' : 'var(--purple)',
      }))
      .sort((a, b) => b.value - a.value);

    // By size bracket
    const brackets = [
      { label: '< 10K', min: 0, max: 10000 },
      { label: '10–25K', min: 10000, max: 25000 },
      { label: '25–50K', min: 25000, max: 50000 },
      { label: '50–100K', min: 50000, max: 100000 },
      { label: '100K+', min: 100000, max: Infinity },
    ];
    const sizeBrackets = brackets.map(b => {
      const inBracket = withRate.filter(c => {
        const sf = Number(c.rsf) || 0;
        return sf >= b.min && sf < b.max;
      });
      return {
        label: b.label,
        value: inBracket.length ? inBracket.reduce((s, c) => s + Number(c.rate), 0) / inBracket.length : 0,
        count: inBracket.length,
      };
    }).filter(b => b.count > 0);

    // Rate vs SF scatter
    const scatter = withRate.filter(c => c.rsf).map(c => ({
      x: Number(c.rsf),
      y: Number(c.rate),
      size: Number(c.rsf),
      color: c.lease_type === 'NNN' ? 'var(--accent)' : c.lease_type === 'Gross' ? 'var(--green)' : 'var(--amber)',
    }));

    // Concession analysis
    const withFR = comps.filter(c => c.free_rent_months && c.free_rent_months > 0);
    const avgFR = withFR.length ? withFR.reduce((s, c) => s + Number(c.free_rent_months), 0) / withFR.length : 0;
    const withTI = comps.filter(c => c.ti_psf && c.ti_psf > 0);
    const avgTI = withTI.length ? withTI.reduce((s, c) => s + Number(c.ti_psf), 0) / withTI.length : 0;

    // By lease type
    const byType = {};
    withRate.forEach(c => {
      const t = c.lease_type || 'Unknown';
      if (!byType[t]) byType[t] = { rates: [], count: 0 };
      byType[t].rates.push(Number(c.rate));
      byType[t].count++;
    });
    const typeAvgs = Object.entries(byType).map(([name, d]) => ({
      label: name,
      value: d.rates.reduce((s, r) => s + r, 0) / d.rates.length,
      count: d.count,
      color: name === 'NNN' ? 'var(--accent)' : name === 'Gross' ? 'var(--green)' : name === 'Modified Gross' ? 'var(--amber)' : 'var(--purple)',
    })).sort((a, b) => b.value - a.value);

    // Time trend (by quarter)
    const byQuarter = {};
    comps.filter(c => c.start_date && c.rate).forEach(c => {
      const d = new Date(c.start_date);
      const q = `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
      if (!byQuarter[q]) byQuarter[q] = { rates: [], count: 0 };
      byQuarter[q].rates.push(Number(c.rate));
      byQuarter[q].count++;
    });
    const timeTrend = Object.entries(byQuarter)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([q, d]) => ({
        label: q,
        value: d.rates.reduce((s, r) => s + r, 0) / d.rates.length,
        count: d.count,
      }));

    return { avgRate, medRate, totalSf, count: comps.length, submarketAvgs, sizeBrackets, scatter, avgFR, avgTI, typeAvgs, timeTrend, withFR: withFR.length, withTI: withTI.length };
  }, [leaseComps]);

  // ── SALE COMP ANALYTICS ───
  const saleStats = useMemo(() => {
    const comps = saleComps || [];
    if (!comps.length) return null;

    const withPrice = comps.filter(c => c.price_psf && c.price_psf > 0);
    const avgPsf = withPrice.length ? withPrice.reduce((s, c) => s + Number(c.price_psf), 0) / withPrice.length : 0;
    const totalVolume = comps.reduce((s, c) => s + (Number(c.sale_price) || 0), 0);
    const withCap = comps.filter(c => c.cap_rate && c.cap_rate > 0);
    const avgCap = withCap.length ? withCap.reduce((s, c) => s + Number(c.cap_rate), 0) / withCap.length : 0;

    // By submarket
    const bySubmarket = {};
    withPrice.forEach(c => {
      const sm = c.submarket || c.city || 'Unknown';
      if (!bySubmarket[sm]) bySubmarket[sm] = { prices: [], count: 0 };
      bySubmarket[sm].prices.push(Number(c.price_psf));
      bySubmarket[sm].count++;
    });
    const submarketAvgs = Object.entries(bySubmarket)
      .map(([name, d]) => ({
        label: name,
        value: d.prices.reduce((s, p) => s + p, 0) / d.prices.length,
        count: d.count,
      }))
      .sort((a, b) => b.value - a.value);

    // By type
    const byType = {};
    comps.forEach(c => {
      const t = c.sale_type || 'Unknown';
      if (!byType[t]) byType[t] = { prices: [], count: 0 };
      if (c.price_psf) byType[t].prices.push(Number(c.price_psf));
      byType[t].count++;
    });
    const typeBreakdown = Object.entries(byType).map(([name, d]) => ({
      label: name,
      value: d.count,
      avgPsf: d.prices.length ? d.prices.reduce((s, p) => s + p, 0) / d.prices.length : 0,
      color: { Investment: 'var(--accent)', 'Owner-User': 'var(--amber)', SLB: 'var(--green)', Portfolio: 'var(--purple)', Distress: 'var(--red)' }[name] || 'var(--text-muted)',
    })).sort((a, b) => b.value - a.value);

    // Price vs SF scatter
    const scatter = withPrice.filter(c => c.building_sf).map(c => ({
      x: Number(c.building_sf),
      y: Number(c.price_psf),
      size: Number(c.building_sf),
      color: c.sale_type === 'Investment' ? 'var(--accent)' : c.sale_type === 'Owner-User' ? 'var(--amber)' : 'var(--green)',
    }));

    // Time trend (by quarter)
    const byQuarter = {};
    comps.filter(c => c.sale_date && c.price_psf).forEach(c => {
      const d = new Date(c.sale_date);
      const q = `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
      if (!byQuarter[q]) byQuarter[q] = { prices: [], count: 0 };
      byQuarter[q].prices.push(Number(c.price_psf));
      byQuarter[q].count++;
    });
    const timeTrend = Object.entries(byQuarter)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([q, d]) => ({
        label: q,
        value: d.prices.reduce((s, p) => s + p, 0) / d.prices.length,
        count: d.count,
      }));

    return { avgPsf, totalVolume, avgCap, count: comps.length, submarketAvgs, typeBreakdown, scatter, timeTrend };
  }, [saleComps]);

  const tabStyle = (t) => ({
    padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none',
    background: tab === t ? 'var(--accent)' : 'transparent',
    color: tab === t ? '#fff' : 'var(--text-secondary)',
    borderRadius: '6px',
  });

  return (
    <div>
      {/* Tab selector */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', padding: '4px', background: 'var(--bg)', borderRadius: '8px', width: 'fit-content' }}>
        <button style={tabStyle('lease')} onClick={() => setTab('lease')}>Lease Comps</button>
        <button style={tabStyle('sale')} onClick={() => setTab('sale')}>Sale Comps</button>
      </div>

      {tab === 'lease' && leaseStats && (
        <div>
          {/* KPI Row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <StatCard label="Total Comps" value={leaseStats.count} />
            <StatCard label="Avg Rate" value={`$${leaseStats.avgRate.toFixed(2)}`} sub="/ SF / Mo" color="var(--green)" />
            <StatCard label="Median Rate" value={`$${leaseStats.medRate.toFixed(2)}`} sub="/ SF / Mo" color="var(--accent)" />
            <StatCard label="Total SF" value={fmt.sf(leaseStats.totalSf)} />
            <StatCard label="Avg Free Rent" value={`${leaseStats.avgFR.toFixed(1)} mo`} sub={`${leaseStats.withFR} comps`} color="var(--amber)" />
            <StatCard label="Avg TI" value={`$${leaseStats.avgTI.toFixed(2)}`} sub={`${leaseStats.withTI} comps`} color="var(--purple)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Rate by Submarket */}
            {leaseStats.submarketAvgs.length > 0 && (
              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Avg Rate by Submarket
                </div>
                <HorizontalBarChart data={leaseStats.submarketAvgs} color="var(--accent)" />
              </div>
            )}

            {/* Rate by Size Bracket */}
            {leaseStats.sizeBrackets.length > 0 && (
              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Avg Rate by Size Bracket
                </div>
                <BarChart data={leaseStats.sizeBrackets} color="var(--green)" />
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {leaseStats.sizeBrackets.map(b => (
                    <span key={b.label} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {b.label}: {b.count} comps
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Time Trend */}
            {leaseStats.timeTrend.length > 1 && (
              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Rate Trend by Quarter
                </div>
                <BarChart data={leaseStats.timeTrend} color="var(--accent)" />
              </div>
            )}

            {/* Rate by Lease Type */}
            {leaseStats.typeAvgs.length > 0 && (
              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Avg Rate by Lease Type
                </div>
                <BarChart data={leaseStats.typeAvgs} />
              </div>
            )}

            {/* Rate vs SF Scatter */}
            {leaseStats.scatter.length > 3 && (
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Rate vs Building Size
                  <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    ● NNN &nbsp; <span style={{ color: 'var(--green)' }}>●</span> Gross &nbsp; <span style={{ color: 'var(--amber)' }}>●</span> Mod Gross
                  </span>
                </div>
                <ScatterDot data={leaseStats.scatter} width={700} height={260} />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'lease' && !leaseStats && (
        <div className="empty-state">
          <div className="empty-state-icon">◔</div>
          <div className="empty-state-title">No Lease Comps</div>
          <div className="empty-state-sub">Import your comp database to see analytics</div>
        </div>
      )}

      {tab === 'sale' && saleStats && (
        <div>
          {/* KPI Row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <StatCard label="Total Comps" value={saleStats.count} />
            <StatCard label="Avg $/SF" value={`$${Math.round(saleStats.avgPsf)}`} color="var(--accent)" />
            <StatCard label="Avg Cap Rate" value={saleStats.avgCap ? `${saleStats.avgCap.toFixed(2)}%` : '—'} color="var(--green)" />
            <StatCard label="Total Volume" value={fmt.price(saleStats.totalVolume)} color="var(--amber)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* $/SF by Submarket */}
            {saleStats.submarketAvgs.length > 0 && (
              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Avg $/SF by Submarket
                </div>
                <HorizontalBarChart data={saleStats.submarketAvgs.map(d => ({ ...d, value: Math.round(d.value) }))} color="var(--accent)" />
              </div>
            )}

            {/* By Sale Type */}
            {saleStats.typeBreakdown.length > 0 && (
              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Comps by Sale Type
                </div>
                <BarChart data={saleStats.typeBreakdown} />
              </div>
            )}

            {/* Time Trend */}
            {saleStats.timeTrend.length > 1 && (
              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  $/SF Trend by Quarter
                </div>
                <BarChart data={saleStats.timeTrend.map(d => ({ ...d, value: Math.round(d.value) }))} color="var(--amber)" />
              </div>
            )}

            {/* Price vs SF Scatter */}
            {saleStats.scatter.length > 3 && (
              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  $/SF vs Building Size
                </div>
                <ScatterDot data={saleStats.scatter} width={520} height={240} />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'sale' && !saleStats && (
        <div className="empty-state">
          <div className="empty-state-icon">◔</div>
          <div className="empty-state-title">No Sale Comps</div>
          <div className="empty-state-sub">Add sale comps to see analytics</div>
        </div>
      )}
    </div>
  );
}
