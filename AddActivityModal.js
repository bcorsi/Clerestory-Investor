'use client';

import { useState } from 'react';
import { ACCOUNT_TYPES, MARKETS, fmt } from '../lib/constants';
import { updateRow } from '../lib/db';

// Inline buyer match scoring for account rollup (simplified from BuyerMatching.js)
function matchScore(property, account) {
  let score = 0;
  const pm = (property.market || property.submarket || '').toLowerCase();
  const bm = (account.preferred_markets || []).map(m => m.toLowerCase());
  if (bm.some(m => pm.includes(m.substring(0, 3)))) score += 20;
  const sf = property.total_sf || property.building_sf;
  if (sf && account.min_sf && sf >= account.min_sf && (!account.max_sf || sf <= account.max_sf)) score += 15;
  if (account.deal_type_preference?.length) score += 15;
  const tags = property.catalyst_tags || [];
  if (tags.includes('SLB Potential') && account.deal_type_preference?.includes('SLB')) score += 10;
  if (property.clear_height && account.min_clear_height && property.clear_height >= account.min_clear_height) score += 5;
  if (['Active', 'Aggressive'].includes(account.acquisition_timing)) score += 10;
  return score;
}

export default function AccountDetail({ account, contacts, deals, properties, activities, tasks, onRefresh, showToast, onContactClick, onDealClick, onPropertyClick, onAddActivity, onAddTask }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...account });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRow('accounts', account.id, {
        name: form.name, account_type: form.account_type, market: form.market,
        city: form.city, phone: form.phone, email: form.email,
        website: form.website, notes: form.notes,
      });
      onRefresh();
      setEditing(false);
      showToast('Account updated');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const linkedContacts = contacts.filter((c) => c.account_id === account.id || c.company === account.name);
  const linkedDeals = deals.filter((d) => d.buyer === account.name || d.seller === account.name || d.tenant_name === account.name);
  const linkedProperties = properties.filter((p) => p.owner === account.name || p.tenant === account.name);
  const linkedActivities = activities.filter((a) => {
    return linkedDeals.some(d => d.id === a.deal_id) || linkedProperties.some(p => p.id === a.property_id);
  });
  const linkedTasks = (tasks || []).filter((t) => {
    return linkedDeals.some(d => d.id === t.deal_id) || linkedProperties.some(p => p.id === t.property_id);
  });
  const pendingTasks = linkedTasks.filter((t) => !t.completed).length;

  const typeColor = (type) => {
    const map = { 'Owner': 'tag-amber', 'Institutional Buyer': 'tag-green', 'Private Buyer': 'tag-green', 'Tenant': 'tag-blue', 'Broker / Advisor': 'tag-purple', 'Lender': 'tag-ghost', 'Investor': 'tag-green', 'Developer': 'tag-purple' };
    return map[type] || 'tag-ghost';
  };

  const Field = ({ label, value, mono }) => (
    <div>
      <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '15px', color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value || '—'}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{account.name}</h2>
              {account.account_type && <span className={`tag ${typeColor(account.account_type)}`}>{account.account_type}</span>}
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
              {account.city}{account.market ? ` · ${account.market}` : ''}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
        </div>
      </div>

      {editing ? (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[['name','Company Name'],['city','City'],['phone','Phone'],['email','Email'],['website','Website']].map(([f, l]) => (
              <div key={f} className="form-group">
                <label className="form-label">{l}</label>
                <input className="input" value={form[f] || ''} onChange={(e) => set(f, e.target.value)} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="select" value={form.account_type || ''} onChange={(e) => set('account_type', e.target.value)}>
                <option value="">Select</option>
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Market</label>
              <select className="select" value={form.market || ''} onChange={(e) => set('market', e.target.value)}>
                <option value="">Select</option>
                {(MARKETS || ['SGV', 'IE', 'LA', 'OC', 'Ventura', 'National']).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Notes / Intel</label>
            <textarea className="textarea" rows={4} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Company Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="Phone" value={account.phone} mono />
              <Field label="Email" value={account.email} />
              <Field label="Website" value={account.website} />
              <Field label="City / HQ" value={account.city} />
              <Field label="Market" value={account.market} />
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Intel / Notes</h3>
            <div style={{ fontSize: '15px', color: account.notes ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.7 }}>{account.notes || 'No notes'}</div>
          </div>
        </div>

        {(account.preferred_markets?.length > 0 || account.buyer_type) && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Buyer Criteria</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
            <Field label="Buyer Type" value={account.buyer_type} />
            <Field label="Entity Type" value={account.entity_type} />
            <Field label="Risk Profile" value={account.risk_profile} />
            <Field label="Timing" value={account.acquisition_timing} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>Preferred Markets</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(account.preferred_markets || []).map(m => {
                  const c = {SGV:'#8b5cf6',IE:'#f97316',LA:'#3b82f6',OC:'#06b6d4','San Diego':'#10b981'}[m] || '#6b7280';
                  return <span key={m} style={{ fontSize: '15px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: c+'18', color: c }}>{m}</span>;
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>Deal Types</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(account.deal_type_preference || []).map(t => <span key={t} className="tag tag-ghost" style={{ fontSize: '15px' }}>{t}</span>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>Product Preference</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(account.product_preference || []).map(t => <span key={t} className="tag tag-blue" style={{ fontSize: '15px' }}>{t}</span>)}
              </div>
            </div>
            <Field label="Min Clear Height" value={account.min_clear_height ? account.min_clear_height + "ft" : null} />
            <Field label="SF Range" value={account.min_sf && account.max_sf ? (account.min_sf/1000).toFixed(0) + 'K - ' + (account.max_sf/1000).toFixed(0) + 'K SF' : null} />
            <Field label="$/SF Range" value={account.min_price_psf && account.max_price_psf ? '$' + Math.round(account.min_price_psf) + ' - $' + Math.round(account.max_price_psf) : null} />
            <Field label="Capital Deployed" value={account.est_capital_deployed} />
            <Field label="Deal Count" value={account.deal_count} />
            <Field label="Activity Score" value={account.buyer_activity_score} mono />
            <Field label="Velocity Score" value={account.buyer_velocity_score} mono />
          </div>
          {account.known_acquisitions && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>Known Acquisitions</div>
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{account.known_acquisitions}</div>
            </div>
          )}
        </div>
        )}
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Contacts ({linkedContacts.length})</h3>
          {linkedContacts.length === 0 ? <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>None</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkedContacts.map((c) => (
                <div key={c.id} onClick={() => onContactClick && onContactClick(c)} style={{ padding: '8px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ fontSize: '15px', fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{c.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Properties ({linkedProperties.length})</h3>
          {linkedProperties.length === 0 ? <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>None</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkedProperties.map((p) => (
                <div key={p.id} onClick={() => onPropertyClick && onPropertyClick(p)} style={{ padding: '8px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ fontSize: '15px', fontWeight: 500 }}>{p.address}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{p.submarket}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Deals ({linkedDeals.length})</h3>
          {linkedDeals.length === 0 ? <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>None</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkedDeals.map((d) => (
                <div key={d.id} onClick={() => onDealClick && onDealClick(d)} style={{ padding: '8px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ fontSize: '15px', fontWeight: 500 }}>{d.deal_name}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{d.stage}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tasks {pendingTasks > 0 && <span style={{ color: '#ef4444' }}>({pendingTasks} pending)</span>}
          </h3>
        </div>
        {linkedTasks.length === 0 ? (
          <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>No tasks linked via deals or properties</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {linkedTasks.sort((a, b) => a.completed - b.completed).map((t) => {
              const pc = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }[t.priority] || '#6b7280';
              const overdue = !t.completed && t.due_date && new Date(t.due_date) < new Date();
              return (
                <div key={t.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '6px', borderLeft: `3px solid ${t.completed ? 'var(--border)' : pc}`, opacity: t.completed ? 0.6 : 1 }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, marginTop: '2px', border: '2px solid', borderColor: t.completed ? 'var(--accent)' : pc, background: t.completed ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '15px' }}>{t.completed ? '✓' : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 500, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>
                    {t.due_date && <div style={{ fontSize: '15px', color: overdue ? 'var(--red)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{overdue ? '⚠ ' : ''}{t.due_date}</div>}
                  </div>
                  <span style={{ fontSize: '15px', padding: '1px 5px', borderRadius: '3px', background: pc + '22', color: pc, flexShrink: 0 }}>{t.priority}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activities */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity Log ({linkedActivities.length})</h3>
        </div>
        {linkedActivities.length === 0 ? (
          <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>No activity logged via linked deals or properties</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {linkedActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10).map((a) => (
              <div key={a.id} style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px', opacity: a.completed ? 0.7 : 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                  <span className="tag tag-blue" style={{ fontSize: '15px' }}>{a.activity_type}</span>
                  <span style={{ fontSize: '15px', fontWeight: 500 }}>{a.subject}</span>
                  {a.outcome && <span className="tag tag-ghost" style={{ fontSize: '15px' }}>{a.outcome}</span>}
                  <span style={{ fontSize: '15px', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{a.activity_date}</span>
                </div>
                {a.notes && <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{a.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Matched Properties (Buyer Match Rollup) */}
      {['Institutional Buyer', 'Private Buyer', 'Investor', 'Developer'].includes(account.account_type) && (
        <div className="card" style={{ marginTop: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
            Buyer Match — Properties
          </h3>
          {(() => {
            const matches = properties
              .map(p => ({ ...p, matchScore: matchScore(p, account) }))
              .filter(p => p.matchScore >= 25)
              .sort((a, b) => b.matchScore - a.matchScore);
            if (matches.length === 0) return <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>No properties match this buyer's criteria. Add buyer criteria above to enable matching.</div>;
            return (
              <div style={{ overflowX: 'auto' }}>
                <table><thead><tr>
                  <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Address</th>
                  <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Submarket</th>
                  <th style={{ textAlign: 'right', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>SF</th>
                  <th style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Owner</th>
                  <th style={{ textAlign: 'right', fontSize: '12px', padding: '8px 10px', color: 'var(--text-muted)' }}>Match</th>
                </tr></thead><tbody>
                  {matches.slice(0, 20).map(p => {
                    const scoreColor = p.matchScore >= 70 ? '#22c55e' : p.matchScore >= 50 ? '#3b82f6' : '#f59e0b';
                    return (
                      <tr key={p.id} onClick={() => onPropertyClick?.(p)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 500 }}>{p.address}</td>
                        <td style={{ padding: '8px 10px', fontSize: '13px', color: 'var(--text-muted)' }}>{p.submarket || '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right' }}>{(p.total_sf || p.building_sf) ? Number(p.total_sf || p.building_sf).toLocaleString() : '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '13px' }}>{p.owner || '—'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: scoreColor }}>{p.matchScore}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody></table>
                {matches.length > 20 && <div style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>Showing 20 of {matches.length} matches</div>}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
