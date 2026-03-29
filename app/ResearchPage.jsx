'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

// ─── CONSTANTS ────────────────────────────────────────────
const CAMPAIGN_TYPES = {
  bess:       { label: 'BESS',        color: 'purple', icon: '⚡' },
  ev_charging:{ label: 'EV Charging', color: 'blue',   icon: '🔋' },
  slb:        { label: 'SLB',         color: 'amber',  icon: '🏭' },
  off_market: { label: 'Off-Market',  color: 'rust',   icon: '🎯' },
  land:       { label: 'Land',        color: 'green',  icon: '📍' },
  other:      { label: 'Other',       color: 'gray',   icon: '📋' },
};

const STATUS_COLORS = {
  active:   'green',
  paused:   'amber',
  complete: 'blue',
  draft:    'gray',
};

// ─── SEED DATA — shown if Supabase returns empty ──────────
// Remove once real data is in Supabase
const SEED_CAMPAIGNS = [
  {
    id: 'seed-1',
    name: 'Long Beach BESS Land Acquisition',
    campaign_type: 'bess',
    status: 'active',
    market: 'Long Beach / South Bay',
    description: 'Targeting industrial-zoned parcels adjacent to SCE 230kV substations for BESS developer acquisition. Priority corridors: Cherry Ave, PCH industrial nodes. Demolish-and-build outdoor battery container fields.',
    target_count: null,
    contacted_count: 0,
    criteria: {
      acres_min: 1,
      acres_max: 10,
      zoning: ['M1', 'M2', 'Industrial'],
      substation_proximity: '0.5 mile SCE 230kV',
      owner_type: 'Private / Owner-User',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seed-2',
    name: 'Tesla Truck EV Charging — City of Industry',
    campaign_type: 'ev_charging',
    status: 'active',
    market: 'City of Industry / SGV',
    description: 'Investor acquisition of covered land / functionally obsolete industrial buildings on 2–4 acre sites. Investor demolishes existing structure and develops heavy-duty Tesla Semi truck charging depot. Freeway-adjacent preferred (60/605/10). Strong SCE amperage required.',
    target_count: null,
    contacted_count: 0,
    criteria: {
      acres_min: 2,
      acres_max: 4,
      building_vintage: 'Pre-1990 preferred',
      zoning: ['M1', 'M2'],
      freeway_access: '60 / 605 / 10',
      power: 'Heavy SCE service',
      owner_type: 'Private / Owner-User',
      strategy: 'Covered land / demolish & redevelop',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ─── MAIN PAGE ────────────────────────────────────────────
export default function ResearchPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [filter, setFilter]       = useState('all');

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('research_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // If table is empty, show seed data so the page isn't blank
      setCampaigns(data && data.length > 0 ? data : SEED_CAMPAIGNS);
    } catch (e) {
      console.error('Campaign load error:', e);
      setCampaigns(SEED_CAMPAIGNS);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === filter);

  const activeCampaigns  = campaigns.filter(c => c.status === 'active');
  const totalTargets     = campaigns.reduce((s, c) => s + (c.target_count || 0), 0);
  const totalContacted   = campaigns.reduce((s, c) => s + (c.contacted_count || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Research Campaigns</h1>
          <p className="cl-page-subtitle">Targeted acquisition intelligence — site by site</p>
        </div>
        <div className="cl-page-actions">
          <button className="cl-btn cl-btn-primary" onClick={() => setShowNew(true)}>
            + New Campaign
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="cl-kpi-strip">
        <div className="cl-kpi">
          <div className="cl-kpi-label">Active Campaigns</div>
          <div className="cl-kpi-value">{activeCampaigns.length}</div>
        </div>
        <div className="cl-kpi">
          <div className="cl-kpi-label">Total Campaigns</div>
          <div className="cl-kpi-value">{campaigns.length}</div>
        </div>
        <div className="cl-kpi">
          <div className="cl-kpi-label">Properties Targeted</div>
          <div className="cl-kpi-value">{totalTargets > 0 ? totalTargets : '—'}</div>
        </div>
        <div className="cl-kpi">
          <div className="cl-kpi-label">Owners Contacted</div>
          <div className="cl-kpi-value">{totalContacted > 0 ? totalContacted : '—'}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="cl-tabs" style={{ marginBottom: 16 }}>
        {['all','active','paused','complete','draft'].map(f => (
          <button
            key={f}
            className={`cl-tab ${filter === f ? 'cl-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'active' && activeCampaigns.length > 0 && (
              <span style={{ marginLeft: 5 }} className="cl-badge cl-badge-green">
                {activeCampaigns.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Campaign grid */}
      {loading ? (
        <div className="cl-loading"><div className="cl-spinner" />Loading campaigns…</div>
      ) : filtered.length === 0 ? (
        <div className="cl-empty">
          <div className="cl-empty-label">No campaigns</div>
          <div className="cl-empty-sub">Create your first campaign to start tracking targets</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 16 }}>
          {filtered.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} onRefresh={loadCampaigns} />
          ))}
        </div>
      )}

      {/* New Campaign Modal */}
      {showNew && (
        <NewCampaignModal onClose={() => setShowNew(false)} onSave={() => { setShowNew(false); loadCampaigns(); }} />
      )}
    </div>
  );
}

// ─── CAMPAIGN CARD ────────────────────────────────────────
function CampaignCard({ campaign, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = CAMPAIGN_TYPES[campaign.campaign_type] || CAMPAIGN_TYPES.other;
  const statusColor = STATUS_COLORS[campaign.status] || 'gray';
  const progress = campaign.target_count
    ? Math.round((campaign.contacted_count / campaign.target_count) * 100)
    : null;

  return (
    <div className="cl-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Card header bar */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--card-border)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        {/* Type icon */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: `var(--${typeConfig.color}-bg, var(--blue-bg))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}>
          {typeConfig.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--text-primary)',
            }}>
              {campaign.name}
            </span>
            <span className={`cl-badge cl-badge-${statusColor}`}>
              {campaign.status}
            </span>
            <span className={`cl-badge cl-badge-${typeConfig.color === 'gray' ? 'gray' : typeConfig.color}`}>
              {typeConfig.label}
            </span>
          </div>
          {campaign.market && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-tertiary)',
              marginTop: 3,
              letterSpacing: '0.05em',
            }}>
              {campaign.market}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '14px 18px' }}>
        <p style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          fontFamily: 'var(--font-ui)',
        }}>
          {campaign.description}
        </p>

        {/* Progress bar */}
        {campaign.target_count > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 5,
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
                OUTREACH PROGRESS
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>
                {campaign.contacted_count} / {campaign.target_count}
              </span>
            </div>
            <div style={{
              height: 4,
              background: 'rgba(0,0,0,0.07)',
              borderRadius: 99,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(progress, 100)}%`,
                background: 'var(--blue)',
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}

        {/* Criteria chips — expandable */}
        {campaign.criteria && Object.keys(campaign.criteria).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.08em',
                color: 'var(--text-tertiary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: expanded ? 8 : 0,
              }}
            >
              SITE CRITERIA {expanded ? '▲' : '▼'}
            </button>
            {expanded && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {Object.entries(campaign.criteria).map(([k, v]) => (
                  <span key={k} className="cl-badge cl-badge-gray" style={{ fontSize: 9 }}>
                    <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {k.replace(/_/g, ' ')}:
                    </span>{' '}
                    {Array.isArray(v) ? v.join(', ') : v}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{
        padding: '10px 18px',
        borderTop: '1px solid var(--card-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(0,0,0,0.015)',
      }}>
        <Link href={`/research/${campaign.id}`} className="cl-btn cl-btn-secondary cl-btn-sm">
          View Targets
        </Link>
        <Link href={`/research/${campaign.id}/outreach`} className="cl-btn cl-btn-ghost cl-btn-sm">
          Log Outreach
        </Link>
        <div style={{ flex: 1 }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.05em',
        }}>
          {new Date(campaign.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// ─── NEW CAMPAIGN MODAL ───────────────────────────────────
function NewCampaignModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    campaign_type: 'off_market',
    status: 'active',
    market: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) { setError('Campaign name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('research_campaigns')
        .insert([{
          name:            form.name.trim(),
          campaign_type:   form.campaign_type,
          status:          form.status,
          market:          form.market.trim() || null,
          description:     form.description.trim() || null,
          target_count:    0,
          contacted_count: 0,
          criteria:        {},
        }]);
      if (err) throw err;
      onSave();
    } catch (e) {
      setError(e.message || 'Failed to save. Check Supabase connection.');
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      padding: 24,
    }}>
      <div className="cl-card" style={{ width: '100%', maxWidth: 520, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>New Campaign</h2>
          <button className="cl-btn cl-btn-ghost cl-btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Campaign Name *">
            <input
              className="cl-search-input"
              style={{ width: '100%' }}
              placeholder="e.g. Tesla EV Charging — City of Industry"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Type">
              <select className="cl-select" style={{ width: '100%' }} value={form.campaign_type} onChange={e => set('campaign_type', e.target.value)}>
                {Object.entries(CAMPAIGN_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className="cl-select" style={{ width: '100%' }} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
                <option value="complete">Complete</option>
              </select>
            </Field>
          </div>

          <Field label="Market / Submarket">
            <input
              className="cl-search-input"
              style={{ width: '100%' }}
              placeholder="e.g. City of Industry / SGV"
              value={form.market}
              onChange={e => set('market', e.target.value)}
            />
          </Field>

          <Field label="Description">
            <textarea
              className="cl-search-input"
              style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
              placeholder="Site criteria, strategy, investor notes…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </Field>

          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--rust-bg)',
              color: 'var(--rust)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="cl-btn cl-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="cl-btn cl-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.1em',
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        marginBottom: 5,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}
