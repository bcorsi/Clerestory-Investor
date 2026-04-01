'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { CATALYST_TAGS, CATALYST_CATEGORIES } from '@/lib/constants';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function daysSince(d) {
  if (!d) return null;
  return Math.floor((new Date() - new Date(d)) / (1000 * 60 * 60 * 24));
}

const PROP_TYPES = [
  'Warehouse / Distribution', 'Manufacturing', 'Flex / R&D', 'Food Processing',
  'Cold Storage / Refrigerated', 'Truck Terminal', 'IOS (Outdoor Storage)',
  'Office', 'Retail', 'Other',
];

const RELATED_INDUSTRIES = [
  'Manufacturing', 'Wholesale Trade', 'Retail Trade', 'Transportation & Warehousing',
  'Construction', 'Food & Beverage', 'Technology', 'Healthcare',
  'Finance & Insurance', 'Professional Services', 'Government', 'Education', 'Other',
];

export default function WarnDetailPage() {
  const { id } = useParams();
  const router  = useRouter();
  const [notice, setNotice]               = useState(null);
  const [loading, setLoading]             = useState(true);
  const [editing, setEditing]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [form, setForm]                   = useState(null);
  const [linkedLead, setLinkedLead]       = useState(null);
  const [linkedProperty, setLinkedProperty] = useState(null);
  const [showModal, setShowModal]         = useState(false);

  useEffect(() => {
    if (!id) return;
    loadNotice();
  }, [id]);

  async function loadNotice() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('warn_notices')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setNotice(data);
      setForm({
        company:          data.company || '',
        address:          data.address || '',
        county:           data.county || '',
        employees:        data.employees || '',
        notice_date:      data.notice_date || '',
        effective_date:   data.effective_date || '',
        is_industrial:    data.is_industrial || false,
        is_in_market:     data.is_in_market || false,
        prop_type:        data.prop_type || '',
        related_industry: data.related_industry || '',
        research_notes:   data.research_notes || '',
      });

      if (data.converted_lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('id, lead_name, company, stage, score')
          .eq('id', data.converted_lead_id)
          .single();
        if (lead) setLinkedLead(lead);
      }

      if (data.matched_property_id) {
        const { data: prop } = await supabase
          .from('properties')
          .select('id, address, city, building_sf, vacancy_status')
          .eq('id', data.matched_property_id)
          .single();
        if (prop) setLinkedProperty(prop);
      }
    }
    setLoading(false);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('warn_notices')
        .update({
          company:          form.company,
          address:          form.address,
          county:           form.county,
          employees:        parseInt(form.employees) || null,
          notice_date:      form.notice_date || null,
          effective_date:   form.effective_date || null,
          is_industrial:    form.is_industrial,
          is_in_market:     form.is_in_market,
          prop_type:        form.prop_type || null,
          related_industry: form.related_industry || null,
          research_notes:   form.research_notes,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setNotice(data);
      setEditing(false);
    } catch(e) {
      console.error(e);
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="cl-loading" style={{ padding: 80 }}>
      <div className="cl-spinner" />Loading WARN filing…
    </div>
  );

  if (!notice) return (
    <div className="cl-empty" style={{ padding: 80 }}>
      <div className="cl-empty-label">Filing not found</div>
    </div>
  );

  const days = daysSince(notice.notice_date);
  const window60 = notice.effective_date
    ? Math.floor((new Date(notice.effective_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'rgba(0,0,0,0.025)', border: '1px solid var(--card-border)',
    borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 14,
    color: 'var(--text-primary)', outline: 'none',
  };
  const labelStyle = {
    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
    color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4, display: 'block',
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 28px 64px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--rust)', textTransform: 'uppercase', marginBottom: 8 }}>
            WARN Act Filing
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
            {notice.company}
          </h1>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {[notice.address, notice.city || notice.county].filter(Boolean).join(' · ')}
          </div>
          {(notice.related_industry || notice.prop_type) && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {[notice.related_industry, notice.prop_type].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {editing ? (
            <>
              <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => {
                setEditing(false);
                setForm({
                  company: notice.company || '', address: notice.address || '',
                  county: notice.county || '', employees: notice.employees || '',
                  notice_date: notice.notice_date || '', effective_date: notice.effective_date || '',
                  is_industrial: notice.is_industrial || false, is_in_market: notice.is_in_market || false,
                  prop_type: notice.prop_type || '', related_industry: notice.related_industry || '',
                  research_notes: notice.research_notes || '',
                });
              }}>Cancel</button>
              <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : '✓ Save Changes'}
              </button>
            </>
          ) : (
            <>
              {!notice.converted_lead_id && (
                <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={() => setShowModal(true)}>
                  ⚡ Create Lead
                </button>
              )}
              <button className="cl-btn cl-btn-secondary cl-btn-sm"
                onClick={() => window.open(`/owner-search?q=${encodeURIComponent(notice.company)}`, '_blank')}>
                📋 Research
              </button>
              <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => setEditing(true)}>
                ✏️ Edit Filing
              </button>
            </>
          )}
        </div>
      </div>

      {/* 60-day alert */}
      {window60 !== null && window60 > 0 && (
        <div style={{
          background: window60 <= 30 ? 'rgba(184,55,20,0.08)' : 'rgba(168,112,16,0.08)',
          border: `1px solid ${window60 <= 30 ? 'rgba(184,55,20,0.2)' : 'rgba(168,112,16,0.2)'}`,
          borderRadius: 10, padding: '14px 18px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>⏱</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: window60 <= 30 ? 'var(--rust)' : 'var(--amber)' }}>
              {window60} days until effective date
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
              The 60-day WARN window closes {fmtDate(notice.effective_date)}. Act before vacancy hits the market.
            </div>
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'WORKERS',     value: notice.employees ? fmt(notice.employees) : '—' },
          { label: 'NOTICE DATE', value: fmtDate(notice.notice_date) },
          { label: 'EFFECTIVE',   value: fmtDate(notice.effective_date) },
          { label: 'DAYS SINCE',  value: days !== null ? `${days}d ago` : '—' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Edit form */}
      {editing && form ? (
        <div className="cl-card" style={{ padding: '18px 20px', marginBottom: 16 }}>
          <div className="cl-card-title" style={{ marginBottom: 16 }}>EDIT FILING</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Company</label>
                <input style={inputStyle} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>County</label>
                <input style={inputStyle} value={form.county} onChange={e => setForm(f => ({ ...f, county: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Employees Affected</label>
                <input style={inputStyle} type="number" value={form.employees} onChange={e => setForm(f => ({ ...f, employees: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Notice Date</label>
                <input style={inputStyle} type="date" value={form.notice_date} onChange={e => setForm(f => ({ ...f, notice_date: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Effective Date</label>
                <input style={inputStyle} type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Property Type</label>
                <select style={inputStyle} value={form.prop_type} onChange={e => setForm(f => ({ ...f, prop_type: e.target.value }))}>
                  <option value="">Unknown / Not Set</option>
                  {PROP_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Related Industry</label>
                <select style={inputStyle} value={form.related_industry} onChange={e => setForm(f => ({ ...f, related_industry: e.target.value }))}>
                  <option value="">Unknown / Not Set</option>
                  {RELATED_INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_industrial} onChange={e => setForm(f => ({ ...f, is_industrial: e.target.checked }))} />
                <span style={{ color: 'var(--text-secondary)' }}>Industrial Property</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_in_market} onChange={e => setForm(f => ({ ...f, is_in_market: e.target.checked }))} />
                <span style={{ color: 'var(--text-secondary)' }}>In My Market</span>
              </label>
            </div>
            <div>
              <label style={labelStyle}>Research Notes</label>
              <textarea
                value={form.research_notes}
                onChange={e => setForm(f => ({ ...f, research_notes: e.target.value }))}
                placeholder="Matched property, outreach status, owner intel..."
                style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="cl-card" style={{ padding: '18px 20px', marginBottom: 16 }}>
            <div className="cl-card-title" style={{ marginBottom: 14 }}>FILING DETAILS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Company',          value: notice.company },
                { label: 'Address',          value: notice.address || '—' },
                { label: 'County',           value: notice.county || '—' },
                { label: 'Workers Affected', value: notice.employees ? fmt(notice.employees) : '—' },
                { label: 'Notice Date',      value: fmtDate(notice.notice_date) },
                { label: 'Effective Date',   value: fmtDate(notice.effective_date) },
                { label: 'Days Since',       value: days !== null ? `${days} days ago` : '—' },
                { label: 'Property Type',    value: notice.prop_type || '—' },
                { label: 'Related Industry', value: notice.related_industry || '—' },
                { label: 'Industrial',       value: notice.is_industrial ? 'Yes' : 'No' },
                { label: 'In Market',        value: notice.is_in_market ? 'Yes' : 'No' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', width: 150, flexShrink: 0, paddingTop: 2 }}>
                    {row.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="cl-card" style={{ padding: '18px 20px', marginBottom: 16 }}>
            <div className="cl-card-title" style={{ marginBottom: 10 }}>RESEARCH NOTES</div>
            <p style={{
              fontSize: 14, lineHeight: 1.65,
              color: notice.research_notes ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              fontStyle: notice.research_notes ? 'normal' : 'italic',
            }}>
              {notice.research_notes || 'No notes yet. Click Edit Filing to add research.'}
            </p>
          </div>
        </>
      )}

      {/* Linked records */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Lead status */}
        <div className="cl-card" style={{ padding: '18px 20px', borderLeft: `3px solid ${linkedLead ? 'var(--green)' : 'var(--rust)'}` }}>
          <div className="cl-card-title" style={{ marginBottom: 12 }}>LEAD STATUS</div>
          {linkedLead ? (
            <div>
              <div
                onClick={() => router.push(`/leads/${linkedLead.id}`)}
                style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', cursor: 'pointer', marginBottom: 6 }}
              >
                {linkedLead.lead_name || linkedLead.company}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <span className="cl-badge cl-badge-green" style={{ fontSize: 10 }}>{linkedLead.stage}</span>
                {linkedLead.score != null && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                    Score: {linkedLead.score}
                  </span>
                )}
              </div>
              <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => router.push(`/leads/${linkedLead.id}`)} style={{ fontSize: 12 }}>
                Open Lead →
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: 'var(--rust)', fontWeight: 500, marginBottom: 4 }}>No lead created yet</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                Create a lead to start tracking outreach on this filing.
              </div>
              <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={() => setShowModal(true)} style={{ fontSize: 12 }}>
                ⚡ Create Lead
              </button>
            </div>
          )}
        </div>

        {/* Linked property */}
        <div className="cl-card" style={{ padding: '18px 20px', borderLeft: '3px solid var(--blue)' }}>
          <div className="cl-card-title" style={{ marginBottom: 12 }}>LINKED PROPERTY</div>
          {linkedProperty ? (
            <div>
              <div
                onClick={() => router.push(`/properties/${linkedProperty.id}`)}
                style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', cursor: 'pointer', marginBottom: 4 }}
              >
                {linkedProperty.address}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {[linkedProperty.city, linkedProperty.building_sf ? `${Number(linkedProperty.building_sf).toLocaleString()} SF` : null].filter(Boolean).join(' · ')}
              </div>
              {linkedProperty.vacancy_status && (
                <span className={`cl-badge cl-badge-${linkedProperty.vacancy_status === 'Vacant' ? 'rust' : 'green'}`} style={{ fontSize: 10, marginBottom: 12, display: 'inline-block' }}>
                  {linkedProperty.vacancy_status}
                </span>
              )}
              <div>
                <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => router.push(`/properties/${linkedProperty.id}`)} style={{ fontSize: 12 }}>
                  Open Property →
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              No property matched yet. Use Search Property Database in the drawer to find a match.
            </div>
          )}
        </div>
      </div>

      {/* Create Lead Modal */}
      {showModal && (
        <CreateLeadFromWarnModal
          notice={notice}
          onClose={() => setShowModal(false)}
          onSuccess={async (leadId) => {
            setShowModal(false);
            const supabase = createClient();
            const { data: lead } = await supabase
              .from('leads')
              .select('id, lead_name, company, stage, score')
              .eq('id', leadId)
              .single();
            if (lead) setLinkedLead(lead);
            setNotice(n => ({ ...n, converted_lead_id: leadId }));
          }}
        />
      )}
    </div>
  );
}

// ── CREATE LEAD FROM WARN MODAL ───────────────────────────────
function CreateLeadFromWarnModal({ notice, onClose, onSuccess }) {
  const [saving, setSaving]           = useState(false);
  const [matchedProp, setMatchedProp] = useState(null);

  const autoSuggested = ['WARN Notice', 'M&A — Acquisition', 'Relocation Risk'];
  const [selectedTags, setSelectedTags] = useState(autoSuggested);
  const [form, setForm] = useState({
    lead_name: notice.company || '',
    company:   notice.company || '',
    address:   notice.address || '',
    city:      notice.county || '',
    stage:     'New',
    priority:  'High',
    notes:     `WARN filing: ${notice.employees ? Number(notice.employees).toLocaleString() : '—'} workers affected. Notice: ${notice.notice_date || '—'}. Effective: ${notice.effective_date || '—'}.`,
  });

  useEffect(() => {
    async function findProperty() {
      if (!notice.address && !notice.company) return;
      try {
        const supabase = createClient();
        const streetAddress = (notice.address || '').split(',')[0];
        const { data } = await supabase
          .from('properties')
          .select('id, address, city, building_sf, lease_expiration, owner_type, tenant')
          .or(`address.ilike.%${streetAddress}%,tenant.ilike.%${notice.company}%,owner.ilike.%${notice.company}%`)
          .limit(1)
          .single();
        if (data) {
          setMatchedProp(data);
          const extra = [];
          if (data.lease_expiration) {
            const months = Math.round((new Date(data.lease_expiration) - new Date()) / (1000 * 60 * 60 * 24 * 30));
            if (months <= 12) extra.push('Lease Exp < 12 Mo');
            else if (months <= 24) extra.push('Lease Exp 12–24 Mo');
          }
          if (data.owner_type === 'Owner-User') extra.push('SLB Potential');
          if (extra.length > 0) setSelectedTags(prev => [...new Set([...prev, ...extra])]);
        }
      } catch(e) { /* no match */ }
    }
    findProperty();
  }, []);

  function toggleTag(key) {
    setSelectedTags(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  const score = Math.min(100, selectedTags.reduce((s, key) => {
    const tag = CATALYST_TAGS.find(t => t.key === key);
    return s + (tag?.scoreBoost || 5);
  }, matchedProp ? 20 : 10));

  async function handleCreate() {
    setSaving(true);
    try {
      const supabase = createClient();
      const catalystPayload = selectedTags.map(key => {
        const tag = CATALYST_TAGS.find(t => t.key === key);
        return {
          tag:      tag?.label || key,
          category: tag ? tag.category.toLowerCase().split(' ')[0] : 'owner',
          priority: tag?.priority?.toLowerCase() || 'medium',
        };
      });

      const { data: lead, error } = await supabase.from('leads').insert({
        lead_name:     form.lead_name,
        company:       form.company,
        address:       form.address,
        city:          form.city,
        stage:         form.stage,
        priority:      form.priority,
        score,
        catalyst_tags: JSON.stringify(catalystPayload),
        notes:         form.notes,
        ...(matchedProp ? { property_id: matchedProp.id } : {}),
      }).select('id').single();

      if (error) throw error;

      await supabase.from('warn_notices')
        .update({ converted_lead_id: lead.id })
        .eq('id', notice.id);

      onSuccess(lead.id);
    } catch(e) {
      console.error('Create lead error:', e);
      alert('Error creating lead: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'rgba(0,0,0,0.025)', border: '1px solid var(--card-border)',
    borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 13,
    color: 'var(--text-primary)', outline: 'none',
  };
  const labelStyle = {
    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
    color: 'var(--text-tertiary)', textTransform: 'uppercase',
    marginBottom: 4, display: 'block',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 16,
        width: '100%', maxWidth: 700,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          background: '#EDE8E0', borderBottom: '1px solid rgba(0,0,0,0.08)',
          padding: '18px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Create Lead from WARN Filing</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{notice.company}</div>
          </div>
          <button onClick={onClose} style={{ fontSize: 22, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {matchedProp && (
            <div style={{
              background: 'rgba(24,112,66,0.06)', border: '1px solid rgba(24,112,66,0.2)',
              borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>Matched to tracked property</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {matchedProp.address}{matchedProp.building_sf ? ` · ${Number(matchedProp.building_sf).toLocaleString()} SF` : ''}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Lead Name</label>
              <input style={inputStyle} value={form.lead_name} onChange={e => setForm(f => ({ ...f, lead_name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input style={inputStyle} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>City / County</label>
              <input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Stage</label>
              <select style={inputStyle} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                {['New', 'Researching', 'Decision Maker Identified', 'Contacted'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Catalyst Tags</label>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
                color: score >= 70 ? 'var(--rust)' : score >= 50 ? 'var(--amber)' : 'var(--blue)',
              }}>
                Score: {score}
              </div>
            </div>
            {Object.keys(CATALYST_CATEGORIES).map(cat => {
              const catTags = CATALYST_TAGS.filter(t => t.category === cat);
              const catStyle = CATALYST_CATEGORIES[cat];
              return (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: catStyle.color, marginBottom: 8 }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {catTags.map(tag => {
                      const selected = selectedTags.includes(tag.key);
                      const isAuto = autoSuggested.includes(tag.key);
                      return (
                        <div key={tag.key} onClick={() => toggleTag(tag.key)} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                          fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)',
                          border: `1.5px solid ${selected ? catStyle.color : 'rgba(0,0,0,0.12)'}`,
                          background: selected ? catStyle.bg : 'transparent',
                          color: selected ? catStyle.color : 'var(--text-tertiary)',
                          transition: 'all 0.12s',
                        }}>
                          {isAuto && selected && <span style={{ fontSize: 8 }}>★</span>}
                          {tag.label}
                          {tag.priority === 'HIGH' && <span style={{ fontSize: 8, opacity: 0.6 }}>●</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: 4 }}>
              ★ Auto-suggested from WARN filing · Score updates as you select tags
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
            <button className="cl-btn cl-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="cl-btn cl-btn-primary" onClick={handleCreate} disabled={saving} style={{ minWidth: 180 }}>
              {saving ? 'Creating…' : `⚡ Create Lead (Score: ${score})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
