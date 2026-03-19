'use client';

import { fmt } from '../lib/constants';

export default function LeaseCompDetail({ comp: c, properties }) {
  // Calculate net effective
  const netEffective = c.rate && c.term_months && c.free_rent_months
    ? c.rate * (1 - c.free_rent_months / c.term_months)
    : null;

  // Calculate total annual rent
  const totalAnnualRent = c.rate && c.rsf ? c.rate * c.rsf * 12 : null;

  // Calculate gross equivalent if not stored
  const grossEquiv = c.gross_equivalent
    || (c.rate && c.total_expenses_psf ? c.rate + c.total_expenses_psf : null);

  // Find linked property
  const linkedProperty = properties?.find((p) => p.id === c.property_id) || null;

  // Lease type badge color
  const leaseTypeColor = (type) => {
    const map = { 'NNN': 'tag-blue', 'Gross': 'tag-green', 'Modified Gross': 'tag-amber', 'Industrial Gross': 'tag-purple' };
    return map[type] || 'tag-ghost';
  };

  return (
    <div>
      {/* Header Card */}
      <div className="card mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>{c.address}</h2>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
            {c.city}{c.submarket ? ` · ${c.submarket}` : ''}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {c.lease_type && <span className={`tag ${leaseTypeColor(c.lease_type)}`}>{c.lease_type}</span>}
            {c.tenant && <span className="tag tag-ghost">{c.tenant}</span>}
            {c.rsf && <span className="tag tag-ghost">{fmt.sf(c.rsf)}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {c.rate && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '15px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Rate</div>
              <div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)', letterSpacing: '-0.02em' }}>
                ${Number(c.rate).toFixed(2)}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>/ SF / Mo {c.lease_type || ''}</div>
            </div>
          )}
          {grossEquiv && c.lease_type === 'NNN' && (
            <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              Gross equiv: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>${Number(grossEquiv).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="detail-grid">
        {/* Left Column */}
        <div>
          {/* Deal Terms */}
          <div className="detail-section">
            <div className="detail-section-title">Deal Terms</div>
            {c.rate && <div className="detail-row"><span className="detail-label">Base Rate</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>${Number(c.rate).toFixed(2)} / SF / Mo {c.lease_type || ''}</span></div>}
            {grossEquiv && <div className="detail-row"><span className="detail-label">Gross Equivalent</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>${Number(grossEquiv).toFixed(2)} / SF / Mo</span></div>}
            {netEffective && <div className="detail-row"><span className="detail-label">Net Effective</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>${netEffective.toFixed(2)} / SF / Mo</span></div>}
            {c.rsf && <div className="detail-row"><span className="detail-label">RSF</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>{fmt.sf(c.rsf)}</span></div>}
            {c.term_months && <div className="detail-row"><span className="detail-label">Term</span><span className="detail-value">{c.term_months} months ({(c.term_months / 12).toFixed(1)} years)</span></div>}
            {c.start_date && <div className="detail-row"><span className="detail-label">Start Date</span><span className="detail-value">{fmt.date(c.start_date)}</span></div>}
            {c.deal_date && <div className="detail-row"><span className="detail-label">Deal Date</span><span className="detail-value">{fmt.date(c.deal_date)}</span></div>}
            {c.free_rent_months != null && <div className="detail-row"><span className="detail-label">Free Rent</span><span className="detail-value">{c.free_rent_months} months</span></div>}
            {c.ti_psf != null && <div className="detail-row"><span className="detail-label">TI Allowance</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>${Number(c.ti_psf).toFixed(2)} / SF</span></div>}
            {c.escalations && <div className="detail-row"><span className="detail-label">Escalations</span><span className="detail-value">{c.escalations}</span></div>}
            {c.options && <div className="detail-row"><span className="detail-label">Options</span><span className="detail-value">{c.options}</span></div>}
            {totalAnnualRent && <div className="detail-row"><span className="detail-label">Annual Rent</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{fmt.price(Math.round(totalAnnualRent))}</span></div>}
          </div>

          {/* Expenses */}
          <div className="detail-section">
            <div className="detail-section-title">Expenses</div>
            {c.cam_psf != null && <div className="detail-row"><span className="detail-label">CAM</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>${Number(c.cam_psf).toFixed(2)} / SF / Mo</span></div>}
            {c.insurance_psf != null && <div className="detail-row"><span className="detail-label">Insurance</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>${Number(c.insurance_psf).toFixed(2)} / SF / Mo</span></div>}
            {c.tax_psf != null && <div className="detail-row"><span className="detail-label">Property Tax</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>${Number(c.tax_psf).toFixed(2)} / SF / Mo</span></div>}
            {c.total_expenses_psf != null && (
              <div className="detail-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
                <span className="detail-label" style={{ fontWeight: 600 }}>Total Expenses</span>
                <span className="detail-value" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${Number(c.total_expenses_psf).toFixed(2)} / SF / Mo</span>
              </div>
            )}
            {c.expense_stop != null && <div className="detail-row"><span className="detail-label">Expense Stop</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>${Number(c.expense_stop).toFixed(2)} / SF / Mo</span></div>}
            {!c.cam_psf && !c.insurance_psf && !c.tax_psf && !c.total_expenses_psf && (
              <div style={{ fontSize: '15px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No expense data recorded</div>
            )}
          </div>

          {/* Parties */}
          <div className="detail-section">
            <div className="detail-section-title">Parties</div>
            {c.tenant && <div className="detail-row"><span className="detail-label">Tenant</span><span className="detail-value">{c.tenant}</span></div>}
            {c.landlord && <div className="detail-row"><span className="detail-label">Landlord</span><span className="detail-value">{c.landlord}</span></div>}
            {c.broker_rep && <div className="detail-row"><span className="detail-label">Broker / Rep</span><span className="detail-value">{c.broker_rep}</span></div>}
            {c.commission_pct != null && <div className="detail-row"><span className="detail-label">Commission</span><span className="detail-value">{Number(c.commission_pct).toFixed(1)}%</span></div>}
            {c.source && <div className="detail-row"><span className="detail-label">Source</span><span className="detail-value">{c.source}</span></div>}
          </div>

          {/* Notes */}
          {c.notes && (
            <div className="detail-section">
              <div className="detail-section-title">Notes</div>
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{c.notes}</div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div>
          {/* Rate Summary Card */}
          <div className="card mb-4">
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>Rate Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                ['Base Rate', c.rate, c.lease_type, 'var(--green)'],
                ['Gross Equiv', grossEquiv, 'All-in', 'var(--amber)'],
                ['Net Effective', netEffective, 'After FR', 'var(--accent)'],
              ].filter(([, v]) => v).map(([label, val, sub, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{sub}</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>
                    ${Number(val).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Expense breakdown bar */}
            {c.total_expenses_psf && c.rate && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cost Breakdown</div>
                <div style={{ height: '8px', borderRadius: '4px', overflow: 'hidden', display: 'flex', background: 'var(--border)' }}>
                  <div style={{ width: `${(c.rate / (grossEquiv || c.rate + c.total_expenses_psf)) * 100}%`, background: 'var(--green)', transition: 'width 0.3s' }} title="Base Rent" />
                  {c.cam_psf && <div style={{ width: `${(c.cam_psf / (grossEquiv || c.rate + c.total_expenses_psf)) * 100}%`, background: 'var(--accent)' }} title="CAM" />}
                  {c.insurance_psf && <div style={{ width: `${(c.insurance_psf / (grossEquiv || c.rate + c.total_expenses_psf)) * 100}%`, background: 'var(--purple)' }} title="Insurance" />}
                  {c.tax_psf && <div style={{ width: `${(c.tax_psf / (grossEquiv || c.rate + c.total_expenses_psf)) * 100}%`, background: 'var(--amber)' }} title="Tax" />}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {[
                    ['Rent', 'var(--green)'],
                    ['CAM', 'var(--accent)'],
                    ['Ins', 'var(--purple)'],
                    ['Tax', 'var(--amber)'],
                  ].map(([label, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '15px', color: 'var(--text-muted)' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Building Info */}
          <div className="card mb-4">
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Building</h4>
            {c.building_sf && <div className="detail-row"><span className="detail-label">Building SF</span><span className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>{fmt.sf(c.building_sf)}</span></div>}
            {c.year_built && <div className="detail-row"><span className="detail-label">Year Built</span><span className="detail-value">{c.year_built}</span></div>}
            {c.clear_height && <div className="detail-row"><span className="detail-label">Clear Height</span><span className="detail-value">{fmt.clearHt(c.clear_height)}</span></div>}
            {!c.building_sf && !c.year_built && !c.clear_height && (
              <div style={{ fontSize: '15px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No building data</div>
            )}
          </div>

          {/* Linked Property */}
          {linkedProperty && (
            <div className="card mb-4">
              <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Linked Property</h4>
              <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{linkedProperty.address}</div>
                <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {linkedProperty.city} · {linkedProperty.submarket} · {linkedProperty.building_sf ? fmt.sf(linkedProperty.building_sf) : ''}
                </div>
              </div>
            </div>
          )}

          {/* Comp Metadata */}
          <div className="card">
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Comp Info</h4>
            <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value">{c.address}</span></div>
            <div className="detail-row"><span className="detail-label">City</span><span className="detail-value">{c.city || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Submarket</span><span className="detail-value">{c.submarket || '—'}</span></div>
            {c.created_at && <div className="detail-row"><span className="detail-label">Added</span><span className="detail-value">{fmt.date(c.created_at)}</span></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
