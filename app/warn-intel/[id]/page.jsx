'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function daysSince(d) {
  if (!d) return null;
  return Math.floor((new Date() - new Date(d)) / (1000 * 60 * 60 * 24));
}

export default function WarnDetailPage() {
  const { id } = useParams();
  const [notice, setNotice]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from('warn_notices')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setNotice(data);
          setForm({
            company:        data.company || '',
            address:        data.address || '',
            county:         data.county || '',
            employees:      data.employees || '',
            notice_date:    data.notice_date || '',
            effective_date: data.effective_date || '',
            is_industrial:  data.is_industrial || false,
            is_in_market:   data.is_in_market || false,
            research_notes: data.research_notes || '',
          });
        }
        setLoading(false);
      });
  }, [id]);

  async function saveEdit() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('warn_notices')
        .update({
          company:        form.company,
          address:        form.address,
          county:         form.county,
          employees:      parseInt(form.employees) || null,
          notice_date:    form.notice_date || null,
          effective_date: form.effective_date || null,
          is_industrial:  form.is_industrial,
          is_in_market:   form.is_in_market,
          research_notes: form.research_notes,
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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 28px 64px' }}>

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
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {editing ? (
            <>
              <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => { setEditing(false); setForm({ company: notice.company || '', address: notice.address || '', county: notice.county || '', employees: notice.employees || '', notice_date: notice.notice_date || '', effective_date: notice.effective_date || '', is_industrial: notice.is_industrial || false, is_in_market: notice.is_in_market || false, research_notes: notice.research_notes || '' }); }}>
                Cancel
              </button>
              <button className="cl-btn cl-btn-primary cl-btn-sm" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : '✓ Save Changes'}
              </button>
            </>
          ) : (
            <button className="cl-btn cl-btn-secondary cl-btn-sm" onClick={() => setEditing(true)}>
              ✏️ Edit Filing
            </button>
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
          {/* Filing details */}
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

          {/* Research notes */}
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

      {/* Lead status */}
      <div className="cl-card" style={{ padding: '18px 20px', borderLeft: '3px solid var(--rust)' }}>
        <div className="cl-card-title" style={{ marginBottom: 10 }}>LEAD STATUS</div>
        {notice.converted_lead_id ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--green)' }}>Lead created</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>This filing has been converted to a lead and is being tracked.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--rust)' }}>No lead created yet</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Go back to WARN Intel to create a lead from this filing.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
