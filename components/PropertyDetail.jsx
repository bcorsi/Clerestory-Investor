'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'comps',    label: 'Comps' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'deals',    label: 'Deals' },
  { key: 'files',    label: 'Files' },
];

export default function PropertyDetail({ id, inline = false }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [leaseComps, setLeaseComps] = useState([]);
  const [saleComps, setSaleComps] = useState([]);
  const [warnNotice, setWarnNotice] = useState(null);

  useEffect(() => { if (id) loadProperty(id); }, [id]);

  async function loadProperty(propId) {
    setLoading(true);
    try {
      const sb = createClient();
      const { data: prop, error } = await sb.from('properties').select('*').eq('id', propId).single();
      if (error) throw error;
      setProperty(prop);

      const [acts, ctcts, dls] = await Promise.all([
        sb.from('activities').select('*').eq('property_id', propId).order('created_at', { ascending: false }).limit(20),
        sb.from('contacts').select('*').eq('property_id', propId).limit(10),
        sb.from('deals').select('*').eq('property_id', propId).order('created_at', { ascending: false }).limit(5),
      ]);
      setActivities(acts.data || []);
      setContacts(ctcts.data || []);
      setDeals(dls.data || []);

      if (prop?.market) {
        const [lc, sc] = await Promise.all([
          sb.from('lease_comps').select('*').eq('market', prop.market).order('commencement_date', { ascending: false }).limit(8),
          sb.from('sale_comps').select('*').eq('market', prop.market).order('sale_date', { ascending: false }).limit(8),
        ]);
        setLeaseComps(lc.data || []);
        setSaleComps(sc.data || []);
      }

      const { data: wm } = await sb.from('warn_notices').select('id, company, notice_date, employees').eq('matched_property_id', propId).limit(1).maybeSingle();
      if (wm) setWarnNotice(wm);
    } catch (e) { console.error('PropertyDetail error:', e); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="cl-loading"><div className="cl-spinner" />Loading property…</div>;
  if (!property) return <div className="cl-empty"><div className="cl-empty-label">Property not found</div></div>;

  const p = property;
  const tags = Array.isArray(p.catalyst_tags) ? p.catalyst_tags : [];
  const isIDS = p.owner === 'IDS Real Estate Group';

  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>

      {/* Full page header (not shown in drawer) */}
      {!inline && (
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>{p.address}</h1>
          <p style={{ color: '#888', fontSize: 14 }}>{[p.city, p.state, p.zip].filter(Boolean).join(', ')}{p.market ? ' · ' + p.market : ''}</p>
        </div>
      )}

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 18 }}>
        <KBox l="Building SF" v={p.building_sf ? Number(p.building_sf).toLocaleString() + ' SF' : '—'} />
        <KBox l="Year Built" v={p.year_built || '—'} />
        <KBox l="Clear Height" v={p.clear_height ? p.clear_height + "'" : '—'} />
        <KBox l="Dock Doors" v={p.dock_doors || '—'} />
        <KBox l="Land Acres" v={p.land_acres ? Number(p.land_acres).toFixed(2) : '—'} />
        <KBox l="Zoning" v={p.zoning || '—'} />
      </div>

      {/* ── Owner Strip ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: '10px 14px', background: isIDS ? 'rgba(78,110,150,0.06)' : 'rgba(0,0,0,0.02)', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', marginBottom: 3 }}>Owner</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: isIDS ? '#4E6E96' : '#1A1A1A' }}>{p.owner || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', marginBottom: 3 }}>Market</div>
          <div style={{ fontSize: 13, color: '#444' }}>{p.market || '—'}{p.submarket ? ' · ' + p.submarket : ''}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', marginBottom: 3 }}>Status</div>
          <div style={{ fontSize: 13, color: p.vacancy_status === 'vacant' ? '#B83714' : '#156636', fontWeight: 500 }}>{p.vacancy_status || '—'}</div>
        </div>
      </div>

      {/* ── Catalysts ── */}
      {tags.length > 0 && (
        <div className="cl-card" style={{ marginBottom: 16, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#78726A', marginBottom: 8 }}>Active Catalysts</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tag, i) => {
              const cat = typeof tag === 'object' ? tag.category : 'asset';
              const lbl = typeof tag === 'object' ? tag.tag : tag;
              return <span key={i} className={`cl-catalyst cl-catalyst--${cat || 'asset'}`} style={{ fontSize: 11, padding: '3px 9px' }}>{lbl}</span>;
            })}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {['Log Call', 'Log Email', 'Add Note', '+ Task'].map(a => (
          <button key={a} className="cl-btn cl-btn-secondary cl-btn-sm">{a}</button>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="cl-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`cl-tab ${activeTab === t.key ? 'cl-tab--active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
            {t.key === 'timeline' && activities.length > 0 && <CT>{activities.length}</CT>}
            {t.key === 'contacts' && contacts.length > 0 && <CT>{contacts.length}</CT>}
            {t.key === 'deals' && deals.length > 0 && <CT>{deals.length}</CT>}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ minHeight: 200 }}>
        {activeTab === 'overview' && <OverviewTab p={p} warn={warnNotice} />}
        {activeTab === 'timeline' && <TimelineTab acts={activities} />}
        {activeTab === 'comps' && <CompsTab lease={leaseComps} sale={saleComps} />}
        {activeTab === 'contacts' && <ContactsTab contacts={contacts} />}
        {activeTab === 'deals' && <DealsTab deals={deals} />}
        {activeTab === 'files' && <FilesTab propId={id} />}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({ p, warn }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>

      {/* WARN Notice */}
      {warn && (
        <div className="cl-card" style={{ padding: '14px 16px', borderLeft: '3px solid #B83714' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B83714', marginBottom: 8 }}>⚡ Linked WARN Filing</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>{warn.company}</div>
          <div style={{ fontSize: 13, color: '#888' }}>{warn.employees ? Number(warn.employees).toLocaleString() + ' workers affected' : ''}{warn.notice_date ? ' · Filed ' + new Date(warn.notice_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
          <Link href={'/warn-intel/' + warn.id} style={{ fontSize: 13, color: '#4E6E96', textDecoration: 'none', fontWeight: 500, display: 'inline-block', marginTop: 6 }}>View WARN Filing →</Link>
        </div>
      )}

      {/* Notes */}
      {p.notes && (
        <div className="cl-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#78726A', marginBottom: 8 }}>Notes</div>
          <p style={{ fontSize: 14, color: '#444', lineHeight: 1.65 }}>{p.notes}</p>
        </div>
      )}

      {/* AI Property Signal */}
      {p.ai_signal && (
        <div className="cl-card" style={{ padding: '14px 16px', borderLeft: '3px solid #8C5A04' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8C5A04', marginBottom: 8 }}>AI Property Signal</div>
          <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, fontStyle: 'italic' }}>{p.ai_signal}</p>
        </div>
      )}

      {/* Full Building Specs */}
      <div className="cl-card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#78726A', marginBottom: 12 }}>Building Specifications</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <DR k="Building SF" v={p.building_sf ? Number(p.building_sf).toLocaleString() : '—'} mono />
          <DR k="Land Acres" v={p.land_acres ? Number(p.land_acres).toFixed(2) : '—'} mono />
          <DR k="Year Built" v={p.year_built || '—'} mono />
          <DR k="Clear Height" v={p.clear_height ? p.clear_height + "'" : '—'} mono />
          <DR k="Dock Doors" v={p.dock_doors || '—'} mono />
          <DR k="Grade Doors" v={p.grade_doors || '—'} mono />
          <DR k="Power" v={p.power || '—'} mono />
          <DR k="Sprinklers" v={p.sprinklers || '—'} />
          <DR k="Zoning" v={p.zoning || '—'} mono />
          <DR k="Construction" v={p.construction_type || '—'} />
          <DR k="Parking Ratio" v={p.parking_ratio || '—'} mono />
          <DR k="Column Spacing" v={p.column_spacing || '—'} mono />
          <DR k="Property Type" v={p.prop_type || '—'} />
          <DR k="Building Class" v={p.building_class || '—'} />
        </div>
      </div>

      {/* Ownership & Transaction */}
      <div className="cl-card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#78726A', marginBottom: 12 }}>Ownership & Transaction History</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <DR k="Owner" v={p.owner || '—'} />
          <DR k="Owner Type" v={p.owner_type || '—'} />
          <DR k="Last Transfer" v={p.last_transfer_date ? new Date(p.last_transfer_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} />
          <DR k="APN" v={p.apn || '—'} mono />
          <DR k="In-Place Rent" v={p.in_place_rent ? '$' + Number(p.in_place_rent).toFixed(2) + '/SF' : '—'} mono />
          <DR k="Lease Expiration" v={p.lease_expiration ? new Date(p.lease_expiration).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'} />
          <DR k="Tenant" v={p.tenant || '—'} />
          <DR k="Vacancy Status" v={p.vacancy_status || '—'} />
        </div>
      </div>

      {/* Building Score */}
      {p.ai_score != null && (
        <div className="cl-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#78726A' }}>Building Score</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: p.ai_score >= 75 ? '#B83714' : p.ai_score >= 50 ? '#8C5A04' : '#4E6E96' }}>{p.ai_score}</span>
          </div>
          {p.building_grade && <div style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>Grade: {p.building_grade}</div>}
        </div>
      )}
    </div>
  );
}

// ── Timeline Tab ─────────────────────────────────────────────
function TimelineTab({ acts }) {
  if (acts.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 14 }}>No activity logged yet.</div>;
  return <div style={{ paddingTop: 8 }}>{acts.map(a => (
    <div key={a.id} style={{ display: 'flex', gap: 9, padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ width: 27, height: 27, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0,
        background: a.activity_type === 'call' ? 'rgba(78,110,150,0.08)' : a.activity_type === 'email' ? 'rgba(88,56,160,0.08)' : 'rgba(140,90,4,0.08)',
        color: a.activity_type === 'call' ? '#4E6E96' : a.activity_type === 'email' ? '#5838A0' : '#8C5A04',
      }}>{a.activity_type === 'call' ? '☏' : a.activity_type === 'email' ? '✉' : '✎'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{a.subject || a.activity_type}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#888', marginTop: 2 }}>{a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
      </div>
    </div>
  ))}</div>;
}

// ── Comps Tab ────────────────────────────────────────────────
function CompsTab({ lease, sale }) {
  return (
    <div style={{ paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#78726A', marginBottom: 8 }}>Sale Comps</div>
        {sale.length === 0 ? <div style={{ color: '#888', fontSize: 13 }}>No sale comps yet.</div>
        : sale.map(c => (
          <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 13 }}>
            <div style={{ fontWeight: 500, color: '#1A1A1A' }}>{c.address || c.property_name || '—'}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#888', marginTop: 2 }}>
              {c.sale_price ? '$' + (Number(c.sale_price) / 1e6).toFixed(1) + 'M' : ''} {c.price_per_sf ? '· $' + Math.round(c.price_per_sf) + '/SF' : ''} {c.cap_rate ? '· ' + Number(c.cap_rate).toFixed(1) + '% cap' : ''}
            </div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#78726A', marginBottom: 8 }}>Lease Comps</div>
        {lease.length === 0 ? <div style={{ color: '#888', fontSize: 13 }}>No lease comps yet.</div>
        : lease.map(c => (
          <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 13 }}>
            <div style={{ fontWeight: 500, color: '#1A1A1A' }}>{c.address || c.property_name || '—'}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#888', marginTop: 2 }}>
              {c.effective_rent ? '$' + Number(c.effective_rent).toFixed(2) + '/SF' : ''} {c.lease_type || ''} {c.term_months ? '· ' + c.term_months + 'mo' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Contacts Tab ─────────────────────────────────────────────
function ContactsTab({ contacts }) {
  if (contacts.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 14 }}>No contacts linked.</div>;
  return <div style={{ paddingTop: 8 }}>{contacts.map(c => (
    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#4E6E96', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{(c.name || '?').slice(0, 2).toUpperCase()}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{c.name || '—'}</div>
        <div style={{ fontSize: 12, color: '#888' }}>{c.title}{c.company ? ' · ' + c.company : ''}</div>
      </div>
      {c.phone && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#4E6E96' }}>{c.phone}</span>}
    </div>
  ))}</div>;
}

// ── Deals Tab ────────────────────────────────────────────────
function DealsTab({ deals }) {
  if (deals.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 14 }}>No deals linked.</div>;
  return <div style={{ paddingTop: 8 }}>{deals.map(d => (
    <Link key={d.id} href={'/deals/' + d.id} style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{d.deal_name || d.company || '—'}</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
        {d.stage || '—'} {d.deal_value ? '· $' + (Number(d.deal_value) / 1e6).toFixed(1) + 'M' : ''} {d.going_in_cap ? '· ' + Number(d.going_in_cap).toFixed(1) + '% cap' : ''}
      </div>
    </Link>
  ))}</div>;
}

// ── Files Tab ────────────────────────────────────────────────
function FilesTab({ propId }) {
  const [files, setFiles] = useState([]);
  useEffect(() => {
    async function load() {
      const sb = createClient();
      const { data } = await sb.from('file_attachments').select('*').eq('property_id', propId).order('created_at', { ascending: false });
      setFiles(data || []);
    }
    if (propId) load();
  }, [propId]);

  if (files.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 14 }}>No files attached.</div>;
  return <div style={{ paddingTop: 8 }}>{files.map(f => (
    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(78,110,150,0.08)', color: '#4E6E96', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📄</div>
      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{f.file_name || f.name || 'File'}</div><div style={{ fontSize: 10, color: '#888' }}>{f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}</div></div>
    </div>
  ))}</div>;
}

// ── Shared Components ────────────────────────────────────────
function KBox({ l, v }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.025)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>{l}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{v}</div>
    </div>
  );
}

function DR({ k, v, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 13 }}>
      <span style={{ color: '#888' }}>{k}</span>
      <span style={{ color: '#1A1A1A', fontWeight: 500, textAlign: 'right', fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: mono ? 12 : undefined }}>{v}</span>
    </div>
  );
}

function CT({ children }) {
  return <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: '#888' }}>{children}</span>;
}
