'use client';

import { useState, useMemo } from 'react';
import { ACCOUNT_TYPES, MARKETS, SUBMARKETS, CATALYST_TAGS, catalystTagClass, fmt } from '../lib/constants';
import { updateRow } from '../lib/db';

// Full buyer match scoring (same as BuyerMatching.js)
function calculateMatchScore(property, account) {
  let score = 0; const reasons = [];
  const pm = (property.market || property.submarket || '').toLowerCase();
  const bm = (account.preferred_markets || []).map(m => m.toLowerCase());
  if (pm && bm.some(m => pm.includes(m.substring(0, 3)))) { score += 20; reasons.push('Market ✓'); }
  const propDealTypes = [];
  if ((property.catalyst_tags || []).includes('SLB Potential')) propDealTypes.push('SLB');
  if (property.vacancy_status === 'Vacant') propDealTypes.push('Value-Add');
  const buyerDealTypes = account.deal_type_preference || [];
  if (propDealTypes.some(t => buyerDealTypes.includes(t))) { score += 20; reasons.push('Deal type ✓'); }
  else if (buyerDealTypes.length) { score += 10; reasons.push('Deal type ~'); }
  const sf = property.total_sf || property.building_sf;
  if (sf && account.min_sf && sf >= account.min_sf && (!account.max_sf || sf <= account.max_sf)) { score += 15; reasons.push('SF fit ✓'); }
  else if (sf && account.min_sf && sf >= account.min_sf * 0.8) { score += 8; reasons.push('SF near'); }
  const ppsf = property.price_psf || (property.last_sale_price && sf ? Math.round(property.last_sale_price / sf) : null);
  if (ppsf && account.min_price_psf && account.max_price_psf && ppsf >= account.min_price_psf && ppsf <= account.max_price_psf) { score += 15; reasons.push('Price ✓'); }
  if ((property.catalyst_tags || []).includes('SLB Potential') && buyerDealTypes.includes('SLB')) { score += 10; reasons.push('SLB ✓'); }
  if (property.clear_height && account.min_clear_height && property.clear_height >= account.min_clear_height) { score += 5; reasons.push('Clear ✓'); }
  if (['Active', 'Actively Buying Now', 'Aggressive'].includes(account.acquisition_timing)) { score += 10; reasons.push('Active buyer'); }
  return { score: Math.min(score, 100), reasons };
}

export default function AccountDetail({ account, contacts, deals, properties, activities, tasks, onRefresh, showToast, onContactClick, onDealClick, onPropertyClick }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...account });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('matches');
  const [minScore, setMinScore] = useState(20);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRow('accounts', account.id, {
        name: form.name, account_type: form.account_type, market: form.market,
        city: form.city, phone: form.phone, email: form.email,
        website: form.website, notes: form.notes,
        preferred_markets: form.preferred_markets, deal_type_preference: form.deal_type_preference,
        min_sf: form.min_sf ? parseInt(form.min_sf) : null, max_sf: form.max_sf ? parseInt(form.max_sf) : null,
        min_price_psf: form.min_price_psf ? parseFloat(form.min_price_psf) : null, max_price_psf: form.max_price_psf ? parseFloat(form.max_price_psf) : null,
        min_clear_height: form.min_clear_height ? parseInt(form.min_clear_height) : null,
        acquisition_timing: form.acquisition_timing,
      });
      onRefresh(); setEditing(false); showToast('Account updated');
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const linkedContacts = contacts.filter(c => c.account_id === account.id || c.company === account.name);
  const linkedDeals = deals.filter(d => d.buyer === account.name || d.seller === account.name || d.tenant_name === account.name);
  const linkedProperties = properties.filter(p => p.owner === account.name || p.tenant === account.name);

  // Full buyer matching
  const isBuyer = ['Institutional Buyer', 'Private Buyer', 'Investor', 'Developer'].includes(account.account_type);
  const matches = useMemo(() => {
    if (!isBuyer) return [];
    return (properties || [])
      .map(p => { const { score, reasons } = calculateMatchScore(p, account); return { ...p, matchScore: score, matchReasons: reasons }; })
      .filter(p => p.matchScore >= minScore)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [properties, account, minScore, isBuyer]);

  const tier = (score) => {
    if (score >= 80) return { label: 'A', color: '#22c55e' };
    if (score >= 60) return { label: 'B', color: '#3b82f6' };
    if (score >= 40) return { label: 'C', color: '#f59e0b' };
    return { label: 'D', color: '#6b7280' };
  };

  const typeColor = (type) => ({ 'Owner': 'tag-amber', 'Institutional Buyer': 'tag-green', 'Private Buyer': 'tag-green', 'Tenant': 'tag-blue', 'Investor': 'tag-green', 'Developer': 'tag-purple' }[type] || 'tag-ghost');

  const Field = ({ label, value, mono }) => (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value || '—'}</div>
    </div>
  );

  const TABS = [
    ...(isBuyer ? [{ id: 'matches', label: `Matched Properties (${matches.length})` }] : []),
    { id: 'info', label: 'Company Info' },
    { id: 'contacts', label: `Contacts (${linkedContacts.length})` },
    { id: 'deals', label: `Deals (${linkedDeals.length})` },
    { id: 'properties', label: `Properties (${linkedProperties.length})` },
  ];

  return (
    <div style={{ maxWidth: '1000px' }}>
      {/* HEADER */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{account.name}</h2>
              {account.account_type && <span className={`tag ${typeColor(account.account_type)}`}>{account.account_type}</span>}
              {account.acquisition_timing && <span className="tag tag-ghost" style={{ fontSize: '12px' }}>{account.acquisition_timing}</span>}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {[account.city, account.market, account.phone, account.website].filter(Boolean).join(' · ')}
            </div>
            {account.preferred_markets?.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                {account.preferred_markets.map(m => <span key={m} className="tag tag-blue" style={{ fontSize: '11px' }}>{m}</span>)}
                {account.deal_type_preference?.map(d => <span key={d} className="tag tag-amber" style={{ fontSize: '11px' }}>{d}</span>)}
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
        </div>
        {isBuyer && (
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            {account.min_sf && <div><div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SF Range</div><div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{(account.min_sf/1000).toFixed(0)}K–{account.max_sf ? (account.max_sf/1000).toFixed(0) + 'K' : '∞'}</div></div>}
            {account.min_price_psf && <div><div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>$/SF Range</div><div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>${Math.round(account.min_price_psf)}–${account.max_price_psf ? Math.round(account.max_price_psf) : '∞'}</div></div>}
            {account.min_clear_height && <div><div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Min Clear</div><div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{account.min_clear_height}'</div></div>}
            <div><div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Matches</div><div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>{matches.length}</div></div>
          </div>
        )}
      </div>

      {/* EDIT FORM — shows above tabs when editing */}
      {editing && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Edit Account & Buyer Criteria</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[['name','Company Name'],['city','City'],['phone','Phone'],['email','Email'],['website','Website']].map(([f, l]) => (
              <div key={f} className="form-group"><label className="form-label">{l}</label><input className="input" value={form[f] || ''} onChange={e => set(f, e.target.value)} /></div>
            ))}
            <div className="form-group"><label className="form-label">Type</label><select className="select" value={form.account_type || ''} onChange={e => set('account_type', e.target.value)}><option value="">Select</option>{ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Market</label><select className="select" value={form.market || ''} onChange={e => set('market', e.target.value)}><option value="">Select</option>{MARKETS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Timing</label><select className="select" value={form.acquisition_timing || ''} onChange={e => set('acquisition_timing', e.target.value)}><option value="">Select</option>{['Actively Buying Now','Active','Passive','On Hold','Not Buying'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '12px', marginBottom: '8px' }}>Buyer Criteria</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group"><label className="form-label">Min SF</label><input className="input" type="number" value={form.min_sf || ''} onChange={e => set('min_sf', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Max SF</label><input className="input" type="number" value={form.max_sf || ''} onChange={e => set('max_sf', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Min $/SF</label><input className="input" type="number" value={form.min_price_psf || ''} onChange={e => set('min_price_psf', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Max $/SF</label><input className="input" type="number" value={form.max_price_psf || ''} onChange={e => set('max_price_psf', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Min Clear Height</label><input className="input" type="number" value={form.min_clear_height || ''} onChange={e => set('min_clear_height', e.target.value)} /></div>
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}><label className="form-label">Notes</label><textarea className="textarea" rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
        {TABS.map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500, background: 'transparent', color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)', borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent' }}>{t.label}</button>)}
      </div>

      {/* MATCHED PROPERTIES TAB */}
      {activeTab === 'matches' && isBuyer && (
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Min score:</span>
            <select className="select" value={minScore} onChange={e => setMinScore(+e.target.value)} style={{ width: '80px', fontSize: '13px' }}>
              <option value={80}>80+</option><option value={60}>60+</option><option value={40}>40+</option><option value={20}>20+</option><option value={0}>All</option>
            </select>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>{matches.filter(m => m.matchScore >= 80).length} hot · {matches.filter(m => m.matchScore >= 60 && m.matchScore < 80).length} strong · {matches.length} total</span>
          </div>
          {matches.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No properties match above score {minScore}. Add buyer criteria to enable matching.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {matches.map(p => {
                const t = tier(p.matchScore);
                return (
                  <div key={p.id} className="card" style={{ padding: '14px 18px', borderLeft: `4px solid ${t.color}`, cursor: 'pointer' }} onClick={() => onPropertyClick?.(p)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700 }}>{p.address}</span>
                          <span style={{ fontSize: '13px', padding: '2px 8px', borderRadius: '4px', background: t.color + '22', color: t.color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.matchScore}/100 ({t.label})</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          {[p.city || p.submarket, (p.total_sf || p.building_sf) ? Number(p.total_sf || p.building_sf).toLocaleString() + ' SF' : null, p.owner, p.vacancy_status].filter(Boolean).join(' · ')}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {p.matchReasons.map((r, i) => <span key={i} style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '3px', background: r.includes('✓') ? '#22c55e15' : '#f59e0b15', color: r.includes('✓') ? '#22c55e' : '#f59e0b', fontFamily: 'var(--font-mono)' }}>{r}</span>)}
                        </div>
                        {(p.catalyst_tags || []).length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {p.catalyst_tags.map(tag => <span key={tag} className={`tag ${catalystTagClass(tag)}`} style={{ fontSize: '11px' }}>{tag}</span>)}
                          </div>
                        )}
                      </div>
                      <div style={{ width: '50px', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0, marginTop: '8px' }}>
                        <div style={{ width: `${p.matchScore}%`, height: '100%', background: t.color, borderRadius: '3px' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Match Score: Market (+20) · Deal Type (+20) · SF Fit (+15) · Price Fit (+15) · SLB (+10) · Clear Height (+5) · Timing (+10) = 100 max
          </div>
        </div>
      )}

      {/* COMPANY INFO TAB */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Company Info</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Phone" value={account.phone} mono />
              <Field label="Email" value={account.email} />
              <Field label="Website" value={account.website} />
              <Field label="City" value={account.city} />
              <Field label="Market" value={account.market} />
              <Field label="Timing" value={account.acquisition_timing} />
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Buyer Criteria</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Min SF" value={account.min_sf ? Number(account.min_sf).toLocaleString() : null} mono />
              <Field label="Max SF" value={account.max_sf ? Number(account.max_sf).toLocaleString() : null} mono />
              <Field label="Min $/SF" value={account.min_price_psf ? '$' + Math.round(account.min_price_psf) : null} mono />
              <Field label="Max $/SF" value={account.max_price_psf ? '$' + Math.round(account.max_price_psf) : null} mono />
              <Field label="Min Clear" value={account.min_clear_height ? account.min_clear_height + "'" : null} mono />
            </div>
          </div>
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Notes</h3>
            <div style={{ fontSize: '14px', color: account.notes ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{account.notes || 'No notes — click Edit to add'}</div>
          </div>
        </div>
      )}

      {/* CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Contacts ({linkedContacts.length})</h3>
          {linkedContacts.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No contacts linked</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {linkedContacts.map(c => (
                <div key={c.id} onClick={() => onContactClick?.(c)} style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.title}{c.contact_type ? ` · ${c.contact_type}` : ''}{c.phone ? ` · ${c.phone}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DEALS TAB */}
      {activeTab === 'deals' && (
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Deals ({linkedDeals.length})</h3>
          {linkedDeals.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No deals linked</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {linkedDeals.map(d => (
                <div key={d.id} onClick={() => onDealClick?.(d)} style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{d.deal_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{d.stage}{d.deal_value ? ` · ${fmt.price(d.deal_value)}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROPERTIES TAB */}
      {activeTab === 'properties' && (
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Properties ({linkedProperties.length})</h3>
          {linkedProperties.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No properties linked</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {linkedProperties.map(p => (
                <div key={p.id} onClick={() => onPropertyClick?.(p)} style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{p.address}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.submarket}{(p.total_sf || p.building_sf) ? ` · ${Number(p.total_sf || p.building_sf).toLocaleString()} SF` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
