'use client';

import { useState } from 'react';
import { fmt, CATALYST_TAGS, CATALYST_URGENCY, CATALYST_WEIGHTS, STAGE_COLORS, LEAD_STAGE_COLORS } from '../lib/constants';
import { updateRow, insertRow } from '../lib/db';
import EditPropertyModal from './EditPropertyModal';
import BuyerMatching from './BuyerMatching';

export default function PropertyDetail({
  property: p, deals, leads, contacts, leaseComps, saleComps,
  activities, tasks, accounts, onLeaseCompClick, onSaleCompClick,
  onDealClick, onLeadClick, onContactClick, onAddActivity, onAddTask,
  showToast, onRefresh
}) {
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // ─── LINKED RECORDS ────────────────────────────────────────
  const linkedLeads    = (leads || []).filter((l) => l.property_id === p.id || l.address === p.address);
  const linkedDeals    = (deals || []).filter((d) => d.property_id === p.id || d.address === p.address);
  const linkedContacts = (contacts || []).filter((c) => c.property_id === p.id || c.company === p.owner || c.company === p.tenant);
  const displayLeaseComps = (leaseComps || []).filter((c) => c.property_id === p.id || c.address === p.address);
  const marketLeaseComps = displayLeaseComps.length > 0 ? displayLeaseComps
    : (leaseComps || []).filter((c) => c.submarket === p.submarket || c.city === p.city);

  const displaySaleComps = (saleComps || []).filter((c) => c.property_id === p.id || c.address === p.address);
  const marketSaleComps = displaySaleComps.length > 0 ? displaySaleComps
    : (saleComps || []).filter((c) => c.submarket === p.submarket || c.city === p.city);

  const linkedActivities = (activities || []).filter((a) => a.property_id === p.id);
  const linkedTasks      = (tasks || []).filter((t) => t.property_id === p.id);

  const avgLeaseRate = displayLeaseComps.length
    ? (displayLeaseComps.reduce((s, c) => s + (c.rate || 0), 0) / displayLeaseComps.length).toFixed(2)
    : null;
  const avgSalePsf = displaySaleComps.filter(c => c.price_psf).length
    ? Math.round(displaySaleComps.filter(c => c.price_psf).reduce((s, c) => s + c.price_psf, 0) / displaySaleComps.filter(c => c.price_psf).length)
    : null;
  const pendingTasks = linkedTasks.filter(t => !t.completed).length;

  // ─── HELPERS ───────────────────────────────────────────────
  const urgencyBadge = (tag) => {
    if (!CATALYST_URGENCY) return 'tag-ghost';
    if (CATALYST_URGENCY.critical?.includes(tag)) return 'tag-red';
    if (CATALYST_URGENCY.high?.includes(tag)) return 'tag-amber';
    if (CATALYST_URGENCY.medium?.includes(tag)) return 'tag-blue';
    return 'tag-ghost';
  };

  const probColor = (prob) => {
    if (prob >= 75) return '#22c55e';
    if (prob >= 50) return '#f59e0b';
    return '#6b7280';
  };

  const LinkedCard = ({ onClick, children, disabled }) => (
    <div
      onClick={onClick && !disabled ? onClick : undefined}
      style={{
        padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px',
        border: '1px solid transparent', transition: 'border-color 0.15s',
        cursor: onClick && !disabled ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => onClick && !disabled && (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
    >
      {children}
    </div>
  );

  const SectionHeader = ({ title, count, onAdd, addLabel }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
        {count != null && <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '1px 6px', borderRadius: '10px' }}>{count}</span>}
      </div>
      {onAdd && <button className="btn btn-ghost btn-sm" style={{ fontSize: '15px' }} onClick={onAdd}>{addLabel || '+ Add'}</button>}
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'leads', label: `Leads${linkedLeads.length ? ` (${linkedLeads.length})` : ''}` },
    { id: 'deals', label: `Deals${linkedDeals.length ? ` (${linkedDeals.length})` : ''}` },
    { id: 'contacts', label: `Contacts${linkedContacts.length ? ` (${linkedContacts.length})` : ''}` },
    { id: 'comps', label: `Comps${displayLeaseComps.length + displaySaleComps.length ? ` (${displayLeaseComps.length + displaySaleComps.length})` : ''}` },
    { id: 'buyers', label: 'Buyer Matches' },
    { id: 'tasks', label: `Tasks${pendingTasks ? ` (${pendingTasks})` : ''}` },
    { id: 'activity', label: `Activity${linkedActivities.length ? ` (${linkedActivities.length})` : ''}` },
  ];

  return (
    <div style={{ maxWidth: '1000px' }}>
      {/* ── HEADER CARD ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>{p.address}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                {[p.city, p.submarket, p.zip].filter(Boolean).join(' · ')}
              </span>
              {p.address && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.address || '') + ', ' + (p.city || '') + ', CA')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px', color: 'var(--accent)', textDecoration: 'none', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                  Google Maps ↗
                </a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onAddActivity && <button className="btn btn-ghost btn-sm" onClick={() => onAddActivity(p.id)}>+ Activity</button>}
            {onAddTask && <button className="btn btn-ghost btn-sm" onClick={() => onAddTask(p.id)}>+ Task</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
          </div>
        </div>

        {/* Key metrics strip */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
          {p.building_sf && <div><div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px' }}>Building SF</div><div style={{ fontSize: '16px', fontWeight: 700 }}>{fmt.sf(p.building_sf)}</div></div>}
          {p.land_acres && <div><div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px' }}>Land</div><div style={{ fontSize: '16px', fontWeight: 700 }}>{p.land_acres} ac</div></div>}
          {p.clear_height && <div><div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px' }}>Clear Ht</div><div style={{ fontSize: '16px', fontWeight: 700 }}>{p.clear_height}'</div></div>}
          {(p.dock_doors != null) && <div><div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px' }}>Dock Doors</div><div style={{ fontSize: '16px', fontWeight: 700 }}>{p.dock_doors}</div></div>}
          {p.year_built && <div><div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px' }}>Year Built</div><div style={{ fontSize: '16px', fontWeight: 700 }}>{p.year_built}</div></div>}
          {p.probability != null && (
            <div>
              <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px' }}>Probability</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: probColor(p.probability) }}>{p.probability}%</div>
            </div>
          )}
          {p.ai_score != null && (
            <div>
              <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px' }}>AI Score</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>{p.ai_score}</div>
            </div>
          )}
          {avgLeaseRate && <div><div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px' }}>Avg Lease Rate</div><div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>${avgLeaseRate}/SF</div></div>}
          {avgSalePsf && <div><div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px' }}>Avg Sale $/SF</div><div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>${avgSalePsf}/SF</div></div>}
        </div>

        {/* Catalyst tags */}
        {p.catalyst_tags?.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
            {p.catalyst_tags.map((tag) => (
              <span key={tag} className={`tag ${urgencyBadge(tag)}`} style={{ fontSize: '15px' }}>{tag}</span>
            ))}
          </div>
        )}

        {/* OneDrive link */}
        {p.onedrive_url && (
          <div style={{ marginTop: '10px' }}>
            <a href={p.onedrive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px', color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              📁 OneDrive Files ↗
            </a>
          </div>
        )}
      </div>

      {/* ── TABS ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', marginBottom: '16px', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 500, whiteSpace: 'nowrap',
            background: 'transparent', color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Property details */}
          <div className="card">
            <SectionHeader title="Property Details" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                ['Record Type', p.record_type], ['Property Type', p.prop_type],
                ['Owner', p.owner], ['Owner Type', p.owner_type],
                ['Tenant', p.tenant], ['Vacancy', p.vacancy_status],
                ['Lease Exp.', p.lease_expiration], ['Last Sale', p.last_sale_price ? fmt.price(p.last_sale_price) : null],
                ['Last Sale $/SF', p.price_psf ? `$${p.price_psf}/SF` : null], ['Last Transfer', p.last_transfer_date],
              ].map(([label, val]) => val ? (
                <div key={label}>
                  <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{val}</div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* APNs */}
          <div className="card">
            <SectionHeader title="APNs" count={p.apns?.length || 0} />
            {p.apns?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {p.apns.map((a, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-input)', borderRadius: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px' }}>{a.apn}</span>
                    {a.acres && <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{a.acres} ac</span>}
                  </div>
                ))}
              </div>
            ) : <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>No APNs recorded</div>}

            {p.notes && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '6px' }}>Notes</div>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.notes}</div>
              </div>
            )}
          </div>

          {/* Quick summary of all linked */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <SectionHeader title="Linked Records Summary" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
              {[
                ['Leads', linkedLeads.length, 'leads', '#8b5cf6'],
                ['Deals', linkedDeals.length, 'deals', '#f97316'],
                ['Contacts', linkedContacts.length, 'contacts', '#3b82f6'],
                ['Lease Comps', displayLeaseComps.length, 'comps', '#10b981'],
                ['Sale Comps', displaySaleComps.length, 'comps', '#22c55e'],
                ['Tasks', pendingTasks, 'tasks', '#ef4444'],
              ].map(([label, count, tab, color]) => (
                <div key={label} onClick={() => setActiveTab(tab)} style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: count > 0 ? color : 'var(--text-muted)' }}>{count}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LEADS TAB ────────────────────────────────────────── */}
      {activeTab === 'leads' && (
        <div className="card">
          <SectionHeader title="Leads" count={linkedLeads.length} />
          {linkedLeads.length === 0 ? (
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', padding: '16px 0' }}>No leads linked to this property</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkedLeads.map((l) => (
                <LinkedCard key={l.id} onClick={() => onLeadClick?.(l)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{l.lead_name}</div>
                      <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' }}>{l.decision_maker || l.owner || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {l.tier && <span style={{ fontSize: '15px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#3b82f622', color: '#3b82f6' }}>{l.tier}</span>}
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '15px', fontWeight: 600, background: (LEAD_STAGE_COLORS?.[l.stage] || '#6b7280') + '22', color: LEAD_STAGE_COLORS?.[l.stage] || '#6b7280' }}>{l.stage}</span>
                    </div>
                  </div>
                  {l.next_action && <div style={{ fontSize: '15px', color: 'var(--amber)', marginTop: '6px' }}>→ {l.next_action}</div>}
                </LinkedCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DEALS TAB ────────────────────────────────────────── */}
      {activeTab === 'deals' && (
        <div className="card">
          <SectionHeader title="Deals" count={linkedDeals.length} />
          {linkedDeals.length === 0 ? (
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', padding: '16px 0' }}>No deals linked to this property</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkedDeals.map((d) => (
                <LinkedCard key={d.id} onClick={() => onDealClick?.(d)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{d.deal_name}</div>
                      <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {d.deal_type}{d.buyer ? ` · ${d.buyer}` : ''}{d.seller ? ` · ${d.seller}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {d.deal_value && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: 'var(--accent)', fontWeight: 600 }}>{fmt.price(d.deal_value)}</span>}
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '15px', fontWeight: 600, background: (STAGE_COLORS?.[d.stage] || '#6b7280') + '22', color: STAGE_COLORS?.[d.stage] || '#6b7280' }}>{d.stage}</span>
                    </div>
                  </div>
                  {d.commission_est && <div style={{ fontSize: '15px', color: '#22c55e', marginTop: '4px' }}>Est. commission: {fmt.price(d.commission_est)}</div>}
                </LinkedCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONTACTS TAB ─────────────────────────────────────── */}
      {activeTab === 'contacts' && (
        <div className="card">
          <SectionHeader title="Contacts" count={linkedContacts.length} />
          {linkedContacts.length === 0 ? (
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', padding: '16px 0' }}>No contacts linked to this property</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {linkedContacts.map((c) => (
                <LinkedCard key={c.id} onClick={() => onContactClick?.(c)}>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{c.name}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{c.title}{c.company ? ` · ${c.company}` : ''}</div>
                  {c.phone && <div style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginTop: '4px' }}>{c.phone}</div>}
                  {c.email && <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{c.email}</div>}
                </LinkedCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMPS TAB ────────────────────────────────────────── */}
      {activeTab === 'comps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Lease Comps */}
          <div className="card">
            <SectionHeader title="Lease Comps" count={displayLeaseComps.length} />
            {displayLeaseComps.length === 0 ? (
              <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>No lease comps linked</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Address', 'Tenant', 'SF', 'Rate', 'Type', 'Term', 'Start', 'Free Rent', 'TIs'].map((h) => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h === 'SF' || h === 'Rate' || h === 'Term' || h === 'TIs' || h === 'Free Rent' ? 'right' : 'left', fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayLeaseComps.map((c) => (
                      <tr key={c.id} onClick={() => onLeaseCompClick?.(c)} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: onLeaseCompClick ? 'pointer' : 'default' }}>
                        <td style={{ padding: '8px 10px', fontSize: '15px', fontWeight: 500 }}>{c.address}</td>
                        <td style={{ padding: '8px 10px', fontSize: '15px', color: 'var(--text-muted)' }}>{c.tenant || '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'right' }}>{c.rsf ? c.rsf.toLocaleString() : '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>${c.rate}/SF</td>
                        <td style={{ padding: '8px 10px', fontSize: '15px' }}>{c.lease_type || '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'right' }}>{c.term_months ? `${c.term_months}mo` : '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px' }}>{c.start_date?.slice(0, 7) || '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'right' }}>{c.free_rent_months ? `${c.free_rent_months}mo` : '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'right' }}>{c.ti_psf ? `$${c.ti_psf}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {avgLeaseRate && <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right' }}>Avg rate: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>${avgLeaseRate}/SF NNN</span></div>}
              </div>
            )}
          </div>

          {/* Sale Comps */}
          <div className="card">
            <SectionHeader title="Sale Comps" count={displaySaleComps.length} />
            {displaySaleComps.length === 0 ? (
              <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>No sale comps linked</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Address', 'SF', 'Price', '$/SF', 'Cap Rate', 'Date', 'Buyer', 'Type'].map((h) => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: ['SF','Price','$/SF','Cap Rate'].includes(h) ? 'right' : 'left', fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displaySaleComps.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 10px', fontSize: '15px', fontWeight: 500 }}>{c.address}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'right' }}>{c.building_sf ? c.building_sf.toLocaleString() : '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'right' }}>{c.sale_price ? fmt.price(c.sale_price) : '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>{c.price_psf ? `$${Math.round(c.price_psf)}` : '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'right' }}>{c.cap_rate ? `${parseFloat(c.cap_rate).toFixed(2)}%` : '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '15px' }}>{c.sale_date?.slice(0, 7) || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '15px' }}>{c.buyer || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '15px' }}>{c.sale_type || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {avgSalePsf && <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right' }}>Avg $/SF: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>${avgSalePsf}/SF</span></div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BUYER MATCHES TAB ─────────────────────────────── */}
      {activeTab === 'buyers' && (
        <div className="card">
          <BuyerMatching property={p} accounts={accounts || []} />
        </div>
      )}

      {/* ── TASKS TAB ────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="card">
          <SectionHeader title="Tasks" count={pendingTasks} onAdd={() => onAddTask?.(p.id)} addLabel="+ Task" />
          {linkedTasks.length === 0 ? (
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', padding: '16px 0' }}>No tasks for this property</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {linkedTasks.sort((a, b) => a.completed - b.completed).map((t) => {
                const priorityColor = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }[t.priority] || '#6b7280';
                const overdue = !t.completed && t.due_date && new Date(t.due_date) < new Date();
                return (
                  <div key={t.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '6px', borderLeft: `3px solid ${t.completed ? 'var(--border)' : priorityColor}`, opacity: t.completed ? 0.6 : 1 }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, marginTop: '2px', border: '2px solid', borderColor: t.completed ? 'var(--accent)' : priorityColor, background: t.completed ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '15px' }}>
                      {t.completed ? '✓' : ''}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 500, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>
                      {t.due_date && <div style={{ fontSize: '15px', color: overdue ? 'var(--red)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{overdue ? '⚠ ' : ''}{t.due_date}</div>}
                    </div>
                    <span style={{ fontSize: '15px', padding: '1px 5px', borderRadius: '3px', background: priorityColor + '22', color: priorityColor }}>{t.priority}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVITY TAB ─────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="card">
          <SectionHeader title="Activity Log" count={linkedActivities.length} onAdd={() => onAddActivity?.(p.id)} addLabel="+ Log" />
          {linkedActivities.length === 0 ? (
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', padding: '16px 0' }}>No activity logged for this property</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkedActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((a) => (
                <div key={a.id} style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px', opacity: a.completed ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px' }}>{a.activity_type === 'Call' ? '📞' : a.activity_type === 'Email' ? '✉️' : a.activity_type === 'Meeting' ? '🤝' : '✓'}</span>
                    <span className="tag tag-blue" style={{ fontSize: '15px' }}>{a.activity_type}</span>
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>{a.subject}</span>
                    {a.outcome && <span className="tag tag-ghost" style={{ fontSize: '15px' }}>{a.outcome}</span>}
                    <span style={{ fontSize: '15px', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{a.activity_date}</span>
                  </div>
                  {a.notes && <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editing && (
        <EditPropertyModal
          property={p}
          onClose={() => setEditing(false)}
          onSave={() => { setEditing(false); showToast?.('Property updated'); onRefresh?.(); }}
        />
      )}
    </div>
  );
}
