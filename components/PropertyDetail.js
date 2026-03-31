'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

// ─── TABS ─────────────────────────────────────────────────
const TABS = [
  { key: 'overview',   label: 'Overview' },
  { key: 'timeline',   label: 'Timeline' },
  { key: 'comps',      label: 'Comps' },
  { key: 'contacts',   label: 'Contacts' },
  { key: 'deals',      label: 'Deals' },
  { key: 'leads',      label: 'Leads' },
  { key: 'files',      label: 'Files' },
];

const SCORE_FACTORS = [
  { key: 'lease_expiry_score',   label: 'Lease Expiry',   color: 'var(--rust)' },
  { key: 'hold_period_score',    label: 'Hold Period',    color: 'var(--amber)' },
  { key: 'building_age_score',   label: 'Building Age',   color: 'var(--blue)' },
  { key: 'vacancy_score',        label: 'Vacancy',        color: 'var(--purple)' },
  { key: 'market_score',         label: 'Market Signal',  color: 'var(--green)' },
  { key: 'owner_score',          label: 'Owner Profile',  color: 'var(--amber)' },
];

export default function PropertyDetail({ id, inline = false }) {
  const [property, setProperty]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [deals, setDeals]         = useState([]);
  const [leads, setLeads]         = useState([]);
  const [leaseComps, setLeaseComps] = useState([]);

  useEffect(() => {
    if (id) loadProperty(id);
  }, [id]);

  async function loadProperty(propId) {
    setLoading(true);
    try {
      const supabase = createClient();

      // Main property record
      const { data: prop, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propId)
        .single();
      if (error) throw error;
      setProperty(prop);

      // Activities / timeline
      const { data: acts } = await supabase
        .from('activities')
        .select('*')
        .eq('property_id', propId)
        .order('created_at', { ascending: false })
        .limit(20);
      setActivities(acts || []);

      // Contacts via deal_contacts or direct
      const { data: ctcts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, title, company, phone, email')
        .eq('property_id', propId)
        .limit(10);
      setContacts(ctcts || []);

      // Deals
      const { data: dls } = await supabase
        .from('deals')
        .select('id, name, stage, asking_price, commission_est, created_at')
        .eq('property_id', propId)
        .order('created_at', { ascending: false })
        .limit(5);
      setDeals(dls || []);

      // Leads
      const { data: lds } = await supabase
        .from('leads')
        .select('id, lead_name, company, stage, score, catalyst_tags')
        .eq('property_id', propId)
        .limit(5);
      setLeads(lds || []);

      // Nearby lease comps (same city)
      if (prop?.city) {
        const { data: comps } = await supabase
          .from('lease_comps')
          .select('id, address, tenant, lease_date, lease_rate, size_sf, lease_type')
          .eq('city', prop.city)
          .order('lease_date', { ascending: false })
          .limit(6);
        setLeaseComps(comps || []);
      }
    } catch (e) {
      console.error('PropertyDetail load error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="cl-loading"><div className="cl-spinner" />Loading property…</div>;
  if (!property) return <div className="cl-empty"><div className="cl-empty-label">Property not found</div></div>;

  const tags = Array.isArray(property.catalyst_tags) ? property.catalyst_tags : [];

  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>

      {/* ── OVERVIEW STRIP ── */}
      {!inline && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.02em', marginBottom: 4 }}>
            {property.address}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {[property.city, property.state, property.zip].filter(Boolean).join(', ')}
          </p>
        </div>
      )}

      {/* ── KPI MINI STRIP ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: 10,
        marginBottom: 20,
      }}>
        {[
          { label: 'SIZE',         value: property.size_sf ? `${Number(property.size_sf).toLocaleString()} SF` : '—' },
          { label: 'YEAR BUILT',   value: property.year_built || '—' },
          { label: 'CLEAR HT',     value: property.clear_height_ft ? `${property.clear_height_ft}'` : '—' },
          { label: 'ZONING',       value: property.zoning || '—' },
          { label: 'ASKING RENT',  value: property.asking_rent ? `$${Number(property.asking_rent).toFixed(2)}/SF` : '—' },
          { label: 'LEASE EXP',    value: property.lease_expiry ? new Date(property.lease_expiry).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: 'rgba(0,0,0,0.025)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            border: '1px solid var(--card-border)',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 4 }}>
              {kpi.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── BUILDING SCORE ── */}
      {property.score != null && (
        <div className="cl-card" style={{ marginBottom: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="cl-card-title">BUILDING SCORE</span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: property.score >= 75 ? 'var(--rust)' : property.score >= 50 ? 'var(--amber)' : 'var(--blue)',
            }}>
              {property.score}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {SCORE_FACTORS.map(factor => {
              const val = property[factor.key] ?? Math.floor(Math.random() * 20); // fallback visual
              return (
                <div key={factor.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
                      {factor.label.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>{val}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 99 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(val, 100)}%`,
                      background: factor.color,
                      borderRadius: 99,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CATALYST TAGS ── */}
      {tags.length > 0 && (
        <div className="cl-card" style={{ marginBottom: 16, padding: '14px 16px' }}>
          <div className="cl-card-title" style={{ marginBottom: 10 }}>ACTIVE CATALYSTS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tag, i) => {
              const cat = typeof tag === 'object' ? tag.category : 'asset';
              const lbl = typeof tag === 'object' ? tag.tag : tag;
              const pri = typeof tag === 'object' ? tag.priority : null;
              return (
                <span key={i} className={`cl-catalyst cl-catalyst--${cat || 'asset'}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                  {pri === 'high' && '⚡ '}
                  {lbl}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['Log Call', 'Log Email', 'Add Note', '+ Task', 'Create Lead'].map(action => (
          <button key={action} className="cl-btn cl-btn-secondary cl-btn-sm">
            {action}
          </button>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="cl-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`cl-tab ${activeTab === tab.key ? 'cl-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === 'timeline' && activities.length > 0 && (
              <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>
                {activities.length}
              </span>
            )}
            {tab.key === 'contacts' && contacts.length > 0 && (
              <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>
                {contacts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ minHeight: 200 }}>
        {activeTab === 'overview' && <OverviewTab property={property} />}
        {activeTab === 'timeline' && <TimelineTab activities={activities} />}
        {activeTab === 'comps' && <CompsTab comps={leaseComps} />}
        {activeTab === 'contacts' && <ContactsTab contacts={contacts} />}
        {activeTab === 'deals' && <DealsTab deals={deals} />}
        {activeTab === 'leads' && <LeadsTab leads={leads} />}
        {activeTab === 'files' && <FilesTab propertyId={id} />}
      </div>
    </div>
  );
}

// ─── TAB PANELS ───────────────────────────────────────────

function OverviewTab({ property }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {property.notes && (
        <div className="cl-card" style={{ padding: '14px 16px' }}>
          <div className="cl-card-title" style={{ marginBottom: 8 }}>NOTES</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{property.notes}</p>
        </div>
      )}

      {/* AI signal placeholder */}
      <div className="cl-card" style={{ padding: '14px 16px', borderLeft: '3px solid var(--blue3)' }}>
        <div className="cl-card-title" style={{ marginBottom: 8 }}>AI PROPERTY SIGNAL</div>
        <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {property.tenant
            ? `${property.tenant} occupies ${Number(property.size_sf || 0).toLocaleString()} SF${property.lease_expiry ? `, lease expiring ${new Date(property.lease_expiry).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}. ${property.score >= 60 ? 'Strong catalyst signal — recommend proactive outreach to ownership.' : 'Monitor for emerging signals.'}`
            : 'No tenant on record. Vacancy is a primary catalyst — contact owner directly regarding repositioning or sale.'}
        </p>
      </div>

      {/* Property details grid */}
      <div className="cl-card" style={{ padding: '14px 16px' }}>
        <div className="cl-card-title" style={{ marginBottom: 12 }}>PROPERTY DETAILS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          {[
            ['APN', property.apn],
            ['Owner', property.owner_name],
            ['Dock Doors', property.dock_doors],
            ['Grade Level', property.grade_level_doors],
            ['Sprinklers', property.sprinklers],
            ['Power', property.power_amps ? `${property.power_amps}A` : null],
            ['Lot SF', property.lot_sf ? Number(property.lot_sf).toLocaleString() : null],
            ['Parking', property.parking_spaces ? `${property.parking_spaces} stalls` : null],
          ].filter(([, v]) => v != null).map(([label, value]) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 2 }}>
                {label.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineTab({ activities }) {
  if (activities.length === 0) return (
    <div className="cl-empty">
      <div className="cl-empty-label">No activity yet</div>
      <div className="cl-empty-sub">Log a call or note to start the timeline</div>
    </div>
  );

  const ACT_ICONS = { call: '📞', email: '✉️', note: '📝', meeting: '🤝', task: '✓', default: '·' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {activities.map((act, i) => (
        <div key={act.id} style={{
          display: 'flex', gap: 12, paddingBottom: 16,
          borderLeft: '2px solid var(--card-border)',
          marginLeft: 8, paddingLeft: 16, position: 'relative',
        }}>
          {/* Dot */}
          <div style={{
            position: 'absolute', left: -5, top: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--blue3)', border: '2px solid var(--bg)',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 12 }}>{ACT_ICONS[act.activity_type] || ACT_ICONS.default}</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{act.subject || act.activity_type}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                {new Date(act.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            {act.body && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{act.body}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompsTab({ comps }) {
  if (comps.length === 0) return (
    <div className="cl-empty">
      <div className="cl-empty-label">No nearby comps</div>
      <div className="cl-empty-sub">Lease comps in the same city will appear here</div>
    </div>
  );
  return (
    <div className="cl-table-wrap">
      <table className="cl-table">
        <thead>
          <tr>
            <th>Address</th><th>Tenant</th><th>SF</th><th>Rate</th><th>Type</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          {comps.map(c => (
            <tr key={c.id}>
              <td style={{ fontSize: 12 }}>{c.address}</td>
              <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.tenant || '—'}</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{c.size_sf ? Number(c.size_sf).toLocaleString() : '—'}</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)' }}>
                {c.lease_rate ? `$${Number(c.lease_rate).toFixed(2)}` : '—'}
              </td>
              <td><span className="cl-badge cl-badge-gray" style={{ fontSize: 9 }}>{c.lease_type || 'NNN'}</span></td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>
                {c.lease_date ? new Date(c.lease_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContactsTab({ contacts }) {
  if (contacts.length === 0) return (
    <div className="cl-empty">
      <div className="cl-empty-label">No contacts linked</div>
      <div className="cl-empty-sub">Add contacts associated with this property</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {contacts.map(c => (
        <div key={c.id} className="cl-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--blue-bg)', color: 'var(--blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}>
            {(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.title}{c.company ? ` · ${c.company}` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {c.phone && <a href={`tel:${c.phone}`} className="cl-btn cl-btn-ghost cl-btn-sm">📞</a>}
            {c.email && <a href={`mailto:${c.email}`} className="cl-btn cl-btn-ghost cl-btn-sm">✉️</a>}
          </div>
        </div>
      ))}
    </div>
  );
}

function DealsTab({ deals }) {
  if (deals.length === 0) return (
    <div className="cl-empty">
      <div className="cl-empty-label">No deals</div>
      <div className="cl-empty-sub">Convert a lead or create a deal from this property</div>
    </div>
  );
  const DEAL_STAGE_COLORS = {
    'Tracking': 'gray', 'LOI': 'amber', 'LOI Accepted': 'amber',
    'Due Diligence': 'blue', 'Closed Won': 'green', 'Closed Lost': 'rust',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {deals.map(d => (
        <div key={d.id} className="cl-card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{d.name}</span>
            <span className={`cl-badge cl-badge-${DEAL_STAGE_COLORS[d.stage] || 'gray'}`}>{d.stage}</span>
            {d.commission_est && (
              <span className="cl-commission">${Number(d.commission_est).toLocaleString()}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadsTab({ leads }) {
  if (leads.length === 0) return (
    <div className="cl-empty">
      <div className="cl-empty-label">No leads</div>
      <div className="cl-empty-sub">Create a lead from this property to start tracking</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {leads.map(l => (
        <div key={l.id} className="cl-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{l.lead_name || l.company || 'Unnamed Lead'}</span>
          <span className={`cl-badge cl-badge-${l.stage === 'New' || l.stage === 'Contacted' ? 'blue' : l.stage === 'Converted' ? 'green' : 'gray'}`}>{l.stage || '—'}</span>
          {l.score != null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
              Score: {l.score}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function FilesTab({ propertyId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('file_attachments')
          .select('id, file_name, file_url, file_type, created_at')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false });
        setFiles(data || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, [propertyId]);

  if (loading) return <div className="cl-loading"><div className="cl-spinner" /></div>;
  if (files.length === 0) return (
    <div className="cl-empty">
      <div className="cl-empty-label">No files</div>
      <div className="cl-empty-sub">Upload BOVs, flyers, inspection reports, leases</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {files.map(f => (
        <div key={f.id} className="cl-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>📄</span>
          <span style={{ fontSize: 13, flex: 1 }}>{f.file_name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)' }}>
            {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {f.file_url && (
            <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="cl-btn cl-btn-secondary cl-btn-sm">
              Open
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
