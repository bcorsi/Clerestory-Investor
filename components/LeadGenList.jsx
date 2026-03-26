'use client';
import { useState } from 'react';
import { insertRecord } from '../lib/useSupabase';

const CATALYST_TAGS_OPTIONS = ['Lease Expiry \'25–\'27', 'WARN Notice', 'NOD Filed', 'CapEx Signal', 'Sale-Leaseback', 'Owner-User', 'Hiring Signal', 'Vacancy Risk', 'Broker Intel'];

function AddLeadModal({ onClose, onSave }) {
  const [form, setForm] = useState({ company: '', address: '', city: '', state: '', zip: '', market: '', sf: '', propType: '', ownerName: '', ownerType: '', source: '', score: 75, notes: '' });
  const [tags, setTags] = useState([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleTag = t => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = () => {
    if (!form.company) { alert('Company Name is required'); return; }
    const C = (bg, bdr, color, label) => ({ bg, bdr, color, label });
    const catalysts = tags.map(t => t.includes('WARN') ? C('var(--rust-bg)', 'var(--rust-bdr)', 'var(--rust)', '⚠ ' + t) : t.includes('Expiry') ? C('var(--amber-bg)', 'var(--amber-bdr)', 'var(--amber)', t) : t.includes('CapEx') || t.includes('SLB') ? C('var(--purple-bg)', 'var(--purple-bdr)', 'var(--purple)', t) : C('var(--blue-bg)', 'var(--blue-bdr)', 'var(--blue)', t));
    // Pass both the UI-shaped lead AND the raw form data + tags for Supabase
    onSave({
      id: Date.now(), score: Number(form.score), grade: Number(form.score) >= 90 ? 'A+' : Number(form.score) >= 80 ? 'A' : Number(form.score) >= 70 ? 'B+' : 'B',
      name: form.company, addr: form.address + (form.city ? ' · ' + form.city : ''),
      market: form.market || 'SGV', sf: form.sf ? form.sf + ' SF' : '—',
      catalysts, source: form.source || 'Manual', owner: form.ownerName || 'Unknown',
      lastContact: 'Never', hot: Number(form.score) >= 80, warn: tags.some(t => t.includes('WARN')),
    }, form, tags);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--card)', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', width: 540, maxHeight: '90vh', overflowY: 'auto', padding: '0 0 24px' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink2)' }}>Add New Lead</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--ink4)', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Company Name */}
          <div>
            <label style={ML}>Company Name <span style={{ color: 'var(--rust)' }}>*</span></label>
            <input style={MI} value={form.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Leegin Creative Leather" />
          </div>

          {/* Address */}
          <div>
            <label style={ML}>Address</label>
            <input style={MI} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
          </div>

          {/* City + State/ZIP */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={ML}>City</label>
              <input style={MI} value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
            </div>
            <div>
              <label style={ML}>State / ZIP</label>
              <input style={MI} value={form.state} onChange={e => set('state', e.target.value)} placeholder="CA 91706" />
            </div>
          </div>

          {/* Market */}
          <div>
            <label style={ML}>Market</label>
            <select style={MS} value={form.market} onChange={e => set('market', e.target.value)}>
              <option value="">Select market…</option>
              <option>SGV</option><option>IE West</option><option>IE East</option><option>OC</option>
            </select>
          </div>

          {/* Building SF + Property Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={ML}>Building SF</label>
              <input style={MI} value={form.sf} onChange={e => set('sf', e.target.value)} placeholder="e.g. 186,400" />
            </div>
            <div>
              <label style={ML}>Property Type</label>
              <select style={MS} value={form.propType} onChange={e => set('propType', e.target.value)}>
                <option value="">Select…</option>
                <option>Industrial / Warehouse</option><option>Manufacturing</option><option>Flex / R&D</option><option>Cold Storage</option>
              </select>
            </div>
          </div>

          {/* Owner Name + Owner Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={ML}>Owner Name</label>
              <input style={MI} value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="Owner or company" />
            </div>
            <div>
              <label style={ML}>Owner Type</label>
              <select style={MS} value={form.ownerType} onChange={e => set('ownerType', e.target.value)}>
                <option value="">Select…</option>
                <option>Private · Owner-User</option><option>Private LLC</option><option>Corp</option><option>Family Trust</option><option>REIT</option>
              </select>
            </div>
          </div>

          {/* Lead Source */}
          <div>
            <label style={ML}>Lead Source</label>
            <select style={MS} value={form.source} onChange={e => set('source', e.target.value)}>
              <option value="">Select…</option>
              <option>Broker intel</option><option>WARN filing</option><option>CapEx permit pull</option><option>NOD filing</option><option>Grapevine</option><option>CoStar</option><option>Direct</option>
            </select>
          </div>

          {/* Catalyst Tags */}
          <div>
            <label style={ML}>Catalyst Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {CATALYST_TAGS_OPTIONS.map(t => (
                <button key={t} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11.5, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', background: tags.includes(t) ? 'var(--blue-bg)' : 'var(--card)', borderColor: tags.includes(t) ? 'var(--blue-bdr)' : 'var(--line)', color: tags.includes(t) ? 'var(--blue)' : 'var(--ink3)' }}
                  onClick={() => toggleTag(t)}>{t}</button>
              ))}
            </div>
          </div>

          {/* Lead Score */}
          <div>
            <label style={ML}>Lead Score (1–100): <strong style={{ color: 'var(--blue)' }}>{form.score}</strong></label>
            <input type="range" min={1} max={100} value={form.score} onChange={e => set('score', e.target.value)} style={{ width: '100%', accentColor: 'var(--blue)' }} />
          </div>

          {/* Notes */}
          <div>
            <label style={ML}>Notes</label>
            <textarea style={{ ...MI, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Research notes, context, source details…" />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button style={MBGhost} onClick={onClose}>Cancel</button>
            <button style={MBBlue} onClick={handleSave}>Save Lead</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ML = { display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink4)', marginBottom: 5 };
const MI = { display: 'block', width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--ink2)', outline: 'none', boxSizing: 'border-box' };
const MS = { display: 'block', width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--ink2)', outline: 'none', cursor: 'pointer' };
const MBGhost = { display: 'inline-flex', alignItems: 'center', padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' };
const MBBlue = { display: 'inline-flex', alignItems: 'center', padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontFamily: 'inherit' };

const TABS = [
  { label: 'All Leads', key: 'all', count: 237 },
  { label: 'A+/A Hot', key: 'hot', count: 40, hot: true },
  { label: 'WARN Matched', key: 'warn', count: 4, hot: true },
  { label: 'Pipeline Ready', key: 'pipeline', count: 18 },
  { label: 'Grapevine', key: 'grapevine', count: 12 },
  { label: 'Archived', key: 'archived', count: 22 },
];

const FILTERS = ['SGV', 'IE West', 'IE East', '⚠ WARN', 'Lease Expiry \'25–\'27', 'NOD Filed', 'CapEx Signal', 'Sale-Leaseback', 'Owner-User', '50K+ SF', '100K+ SF'];
const MARKET_FILTERS = ['SGV', 'IE West', 'IE East'];
const CATALYST_FILTERS = ['⚠ WARN', 'Lease Expiry \'25–\'27', 'NOD Filed', 'CapEx Signal', 'Sale-Leaseback', 'Owner-User'];
const SIZE_FILTERS = ['50K+ SF', '100K+ SF'];

const SCORE_COLOR = (score) => score >= 85 ? 'var(--blue)' : score >= 70 ? 'var(--blue2)' : score >= 55 ? 'var(--amber)' : 'var(--ink4)';

export default function LeadGenList({ leads: propLeads, loading, onRefresh, toast, onSelectLead, onNavigate }) {
  const [activeTab, setActiveTab] = useState('all');
  const [activeFilters, setActiveFilters] = useState(['SGV', 'IE West']);
  const [showAddLead, setShowAddLead] = useState(false);

  // Use Supabase data when available, fall back to mock
  const leads = (propLeads && propLeads.length > 0) ? propLeads : MOCK_LEADS;

  const filteredLeads = leads.filter(l => {
    if (activeTab === 'hot') return l.hot || l.score >= 80;
    if (activeTab === 'warn') return l.warn;
    if (activeTab === 'pipeline') return l.score >= 65 && !l.warn;
    if (activeTab === 'grapevine') return l.source?.toLowerCase().includes('grapevine');
    if (activeTab === 'archived') return l.score < 50;
    return true; // 'all'
  });

  const toggleFilter = (f) => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} onSave={async (lead, formData, tags) => {
        try {
          await insertRecord('leads', {
            lead_name: formData.company,
            company: formData.company,
            address: formData.address,
            city: formData.city,
            market: formData.market,
            submarket: formData.submarket,
            building_sf: formData.sf ? parseInt(String(formData.sf).replace(/,/g, '')) : null,
            prop_type: formData.propType,
            owner: formData.ownerName,
            owner_type: formData.ownerType,
            catalyst_tags: tags,
            score: Number(formData.score),
            notes: formData.notes,
            stage: 'New',
            tier: Number(formData.score) >= 80 ? 'A' : Number(formData.score) >= 60 ? 'B' : 'C',
            priority: Number(formData.score) >= 80 ? 'High' : 'Medium',
            source: formData.source,
          });
          toast?.('Lead added successfully', 'success');
          onRefresh?.();
        } catch (e) {
          toast?.('Failed to save lead — ' + e.message, 'error');
        }
        setActiveTab('all');
      }} />}
      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={{ fontSize: 13, color: 'var(--ink4)' }}><span style={{ color: 'var(--ink2)', fontWeight: 500 }}>Lead Gen</span></span>
        <div style={S.topbarRight}>
          <div style={S.searchWrap}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#6E6860" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="#6E6860" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input placeholder="Search company, address, market…" style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink2)', width: '100%' }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 4, padding: '2px 5px' }}>⌘K</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={S.pageWrap}>
          {/* PAGE HEADER */}
          <div style={S.pageHeader}>
            <div>
              <div style={S.pageTitle}>Lead <em style={S.pageTitleEm}>Gen</em></div>
              <div style={S.pageSub}>237 leads · 40 hot (A+/A) · 4 active WARN signals</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={S.btnGhost} onClick={() => alert('Import CSV — coming soon')}>Import CSV</button>
              <button style={S.btnGhost} onClick={() => alert('Map View — coming soon')}>Map View</button>
              <button style={{ ...S.btn, background: 'var(--rust)', color: '#fff', borderColor: 'var(--rust)', fontSize: 12 }} onClick={() => setActiveTab('hot')}>⚡ Hot Queue (40)</button>
              <button style={{ ...S.btn, background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)' }} onClick={() => setShowAddLead(true)}>+ Add Lead</button>
            </div>
          </div>

          {/* KPI STRIP */}
          <div style={S.kpiStrip}>
            {[
              { icon: '◉', label: 'Total Leads', val: 237, color: 'blue' },
              { icon: '⚡', label: 'Hot — A+/A', val: 40, color: 'rust' },
              { icon: '⚠', label: 'WARN Matched', val: 4, color: 'amber' },
              { icon: '◈', label: 'Pipeline Candidates', val: 18, color: 'green' },
              { icon: '↗', label: 'Grapevine', val: 12, color: 'purple' },
            ].map((k, i) => (
              <div key={i} style={S.kpiCard}>
                <div style={{ ...S.kpiIcon, background: `var(--${k.color}-bg)`, color: `var(--${k.color})` }}>{k.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: k.color === 'rust' ? 'var(--rust)' : 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* TABS */}
          <div style={S.tabsNav}>
            {TABS.map(t => (
              <div key={t.key} style={{ ...S.tabItem, ...(activeTab === t.key ? S.tabActive : {}) }} onClick={() => setActiveTab(t.key)}>
                {t.label}
                <span style={{ ...S.tabCt, ...(t.hot ? S.tabCtHot : {}) }}>{t.count}</span>
              </div>
            ))}
          </div>

          {/* FILTER BAR */}
          <div style={S.filterBar}>
            {MARKET_FILTERS.map(f => (
              <button key={f} style={{ ...S.fc, ...(activeFilters.includes(f) ? S.fcOn : {}) }} onClick={() => toggleFilter(f)}>{f}</button>
            ))}
            <div style={S.fcSep} />
            {CATALYST_FILTERS.map(f => (
              <button key={f} style={{ ...S.fc, ...(activeFilters.includes(f) ? (f.includes('WARN') ? S.fcOnRust : S.fcOn) : {}) }} onClick={() => toggleFilter(f)}>{f}</button>
            ))}
            <div style={S.fcSep} />
            {SIZE_FILTERS.map(f => (
              <button key={f} style={{ ...S.fc, ...(activeFilters.includes(f) ? S.fcOn : {}) }} onClick={() => toggleFilter(f)}>{f}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink4)' }}>Showing <strong style={{ color: 'var(--ink2)' }}>40</strong> of 237</span>
          </div>

          {/* TABLE */}
          {loading ? (
            <div style={{ padding: '8px 0' }}>
              {[1,2,3,4,5,6,7].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 6 }} />)}
            </div>
          ) : (
            <div style={S.tblWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Score', 'Company / Address', 'Market', 'SF', 'Catalyst', 'Source', 'Owner', 'Last Contact', ''].map((h, i) => (
                      <th key={i} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--ink4)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 15 }}>No leads yet — add your first lead or sync WARN Intel</td></tr>
                  ) : filteredLeads.map((l, i) => (
                    <LeadRow key={l.id ?? i} lead={l} onClick={() => onSelectLead?.(l)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadRow({ lead: l, onClick }) {
  const [hover, setHover] = useState(false);
  const rowBg = l.warn ? (hover ? '#FFF1EC' : '#FFF9F7') : l.hot ? (hover ? '#EDF3FA' : '#F5F9FD') : hover ? '#F8F6F2' : 'transparent';
  return (
    <tr style={{ borderBottom: '1px solid var(--line2)', background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
      onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <td style={{ padding: '11px 13px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: l.warn ? 'var(--rust)' : SCORE_COLOR(l.score), lineHeight: 1 }}>{l.score}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: l.warn ? 'var(--rust)' : SCORE_COLOR(l.score), marginTop: 1, letterSpacing: '0.06em' }}>{l.grade}</div>
        </div>
      </td>
      <td style={{ padding: '11px 13px', verticalAlign: 'middle' }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: l.warn ? 'var(--rust)' : 'var(--ink2)' }}>{l.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>{l.addr}</div>
      </td>
      <td style={{ padding: '11px 13px', fontSize: 13, color: 'var(--ink3)' }}>{l.market}</td>
      <td style={{ padding: '11px 13px', fontFamily: "'DM Mono',monospace", fontSize: 12.5 }}>{l.sf}</td>
      <td style={{ padding: '11px 13px', verticalAlign: 'middle' }}>
        {l.catalysts.map((c, ci) => <div key={ci} style={{ marginBottom: ci < l.catalysts.length - 1 ? 3 : 0 }}><span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 500, border: '1px solid', background: c.bg, borderColor: c.bdr, color: c.color }}>{c.label}</span></div>)}
      </td>
      <td style={{ padding: '11px 13px', fontSize: 12.5, color: l.warn ? 'var(--rust)' : 'var(--ink4)' }}>{l.source}</td>
      <td style={{ padding: '11px 13px', fontSize: 13, color: 'var(--ink2)' }}>{l.owner}</td>
      <td style={{ padding: '11px 13px', fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)' }}>{l.lastContact}</td>
      <td style={{ padding: '11px 13px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: 4, opacity: hover ? 1 : 0, transition: 'opacity 0.1s' }}>
          <button style={S.qaBlue} onClick={e => { e.stopPropagation(); alert(`Log call for ${l.name} — activity logging coming soon`); }}>Call</button>
          <button style={l.warn ? S.qaRust : S.qaGreen} onClick={e => { e.stopPropagation(); alert(l.warn ? `Calling owner of ${l.name} — coming soon` : `Adding ${l.name} to pipeline — coming soon`); }}>
            {l.warn ? 'Call Owner' : 'Pipeline →'}
          </button>
        </div>
      </td>
    </tr>
  );
}

const S = {
  topbar: { height: 48, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10, position: 'sticky', top: 0, zIndex: 5 },
  topbarRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 13px', width: 280 },
  pageWrap: { maxWidth: 1700, minWidth: 1100, margin: '0 auto', padding: '0 28px 60px' },
  pageHeader: { padding: '22px 0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 },
  pageTitleEm: { fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: 'var(--blue2)', fontSize: 36, fontWeight: 400 },
  pageSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: 'var(--ink4)', marginTop: 4 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid', fontFamily: 'inherit' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', fontFamily: 'inherit' },
  kpiStrip: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 16 },
  kpiCard: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  kpiIcon: { width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  tabsNav: { display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 0 },
  tabItem: { padding: '9px 14px', fontSize: 13.5, color: 'var(--ink4)', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 },
  tabActive: { color: 'var(--blue)', borderBottomColor: 'var(--blue)', fontWeight: 500 },
  tabCt: { fontFamily: "'DM Mono',monospace", fontSize: 10, background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 20, padding: '1px 6px', color: 'var(--ink4)' },
  tabCtHot: { background: 'var(--rust-bg)', borderColor: 'var(--rust-bdr)', color: 'var(--rust)' },
  filterBar: { padding: '10px 0', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', borderBottom: '1px solid var(--line)', marginBottom: 14 },
  fc: { display: 'inline-flex', alignItems: 'center', padding: '5px 11px', borderRadius: 20, fontSize: 12, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'inherit' },
  fcOn: { background: 'var(--blue-bg)', borderColor: 'var(--blue-bdr)', color: 'var(--blue)' },
  fcOnRust: { background: 'var(--rust-bg)', borderColor: 'var(--rust-bdr)', color: 'var(--rust)' },
  fcSep: { width: 1, height: 20, background: 'var(--line)' },
  tblWrap: { background: 'var(--card)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid var(--line2)', overflow: 'hidden' },
  th: { padding: '10px 13px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink3)', borderBottom: '1px solid var(--line)', background: 'var(--bg2)', whiteSpace: 'nowrap' },
  qaBlue: { padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500, border: '1px solid var(--blue-bdr)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer', fontFamily: 'inherit' },
  qaRust: { padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500, border: '1px solid var(--rust-bdr)', background: 'var(--rust-bg)', color: 'var(--rust)', cursor: 'pointer', fontFamily: 'inherit' },
  qaGreen: { padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500, border: '1px solid var(--green-bdr)', background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer', fontFamily: 'inherit' },
};

const C = (bg, bdr, color, label) => ({ bg, bdr, color, label });
const MOCK_LEADS = [
  { id: 1, score: 95, grade: 'A+', name: 'Leegin Creative Leather Products', addr: '14022 Nelson Ave E · Baldwin Park', market: 'SGV · Mid Valley', sf: '186K SF', catalysts: [C('var(--amber-bg)','var(--amber-bdr)','var(--amber)',"Lease '27"), C('var(--blue-bg)','var(--blue-bdr)','var(--blue)','Hiring Signal')], source: 'Broker intel', owner: 'Private · Owner-User', lastContact: 'Never', hot: true, warn: false },
  { id: 2, score: 82, grade: 'A', name: 'Teledyne Technologies Inc.', addr: '16830 Chestnut St · Fontana', market: 'IE · IE West', sf: '186K SF', catalysts: [C('var(--rust-bg)','var(--rust-bdr)','var(--rust)','⚠ WARN 3/20')], source: 'WARN filing', owner: 'Cabot Industrial REIT', lastContact: 'Never', hot: false, warn: true },
  { id: 3, score: 78, grade: 'A', name: 'Snak King Corp', addr: '16150 Stephens St · City of Industry', market: 'SGV · Industry', sf: '18.84 ac', catalysts: [C('var(--purple-bg)','var(--purple-bdr)','var(--purple)','CapEx Permit'), C('var(--green-bg)','var(--green-bdr)','var(--green)','SLB?')], source: 'CapEx permit pull', owner: 'Private · 5 parcels', lastContact: '2 wks ago', hot: true, warn: false },
  { id: 4, score: 70, grade: 'B+', name: 'Tarhong Industry Properties LLC', addr: '780 Nogales St · City of Industry', market: 'SGV · Industry', sf: '96K SF', catalysts: [C('var(--blue-bg)','var(--blue-bdr)','var(--blue)','Broker Intel'), C('var(--green-bg)','var(--green-bdr)','var(--green)','Owner-User Exit')], source: 'Broker network', owner: 'Owner-User', lastContact: '1 mo ago', hot: false, warn: false },
  { id: 5, score: 62, grade: 'B', name: 'Acromill LLC', addr: '18421 Railroad St · Inland Empire', market: 'IE · IE South', sf: '42K SF', catalysts: [C('var(--purple-bg)','var(--purple-bdr)','var(--purple)','NOD Filed')], source: 'NOD filing', owner: 'Private LLC', lastContact: 'Never', hot: false, warn: true },
  { id: 6, score: 44, grade: 'C+', name: 'Ninth Avenue Foods Inc.', addr: '1010 Garfield Ave · Commerce', market: 'SGV', sf: '58K SF', catalysts: [C('var(--blue-bg)','var(--blue-bdr)','var(--blue)','Research Pending')], source: 'Grapevine', owner: 'Unknown', lastContact: 'Never', hot: false, warn: false },
];
