'use client';

import { useState } from 'react';
import { DEAL_STAGES, STAGE_COLORS, MARKETING_TYPES, fmt } from '../lib/constants';
import { updateRow } from '../lib/db';

export default function DealPipeline({ deals, onRefresh, showToast, onDealClick }) {
  const [view, setView] = useState('kanban');
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const dealsByStage = {};
  DEAL_STAGES.forEach((s) => { dealsByStage[s] = deals.filter((d) => d.stage === s); });

  const onDragStart = (e, deal) => { setDragging(deal); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = (e, stage) => { e.preventDefault(); setDragOver(stage); };
  const onDragLeave = () => setDragOver(null);

  const onDrop = async (e, newStage) => {
    e.preventDefault();
    setDragOver(null);
    if (dragging && dragging.stage !== newStage) {
      try {
        await updateRow('deals', dragging.id, { stage: newStage });
        showToast(`Moved to ${newStage}`);
        onRefresh();
      } catch (err) { console.error('Move error:', err); }
    }
    setDragging(null);
  };

  const priorityDot = (priority) => {
    const colors = { Urgent: 'var(--red)', High: 'var(--amber)', Medium: 'var(--accent)', Low: 'var(--text-muted)' };
    return colors[priority] || 'var(--text-muted)';
  };

  const toggleExpand = (e, dealId) => { e.stopPropagation(); setExpanded(expanded === dealId ? null : dealId); };

  const activeDeals = deals.filter(d => !['Closed', 'Dead'].includes(d.stage));
  const totalValue = activeDeals.filter(d => d.deal_value).reduce((s, d) => s + d.deal_value, 0);
  const totalComm = activeDeals.filter(d => d.commission_est).reduce((s, d) => s + d.commission_est, 0);
  const weightedComm = activeDeals.reduce((s, d) => s + (d.commission_est || 0) * ((d.probability || 0) / 100), 0);

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '20px', fontSize: '15px', color: 'var(--text-muted)' }}>
          <span>Pipeline: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{totalValue > 0 ? `$${(totalValue / 1000000).toFixed(1)}M` : '—'}</span></span>
          <span>Commission: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 600 }}>{totalComm > 0 ? fmt.price(Math.round(totalComm)) : '—'}</span></span>
          <span>Weighted: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 600 }}>{weightedComm > 0 ? fmt.price(Math.round(weightedComm)) : '—'}</span></span>
        </div>
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-input)', borderRadius: '6px', padding: '2px' }}>
          {[['kanban', '⊞'], ['list', '☰']].map(([v, icon]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '4px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '15px', background: view === v ? 'var(--bg-card)' : 'transparent', color: view === v ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.15s' }}>{icon}</button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          <table>
            <thead>
              <tr><th>Deal</th><th>Stage</th><th>Type</th><th>Value</th><th>Commission</th><th>Probability</th><th>Close Date</th><th>Buyer/Tenant</th><th>Priority</th></tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} onClick={() => onDealClick?.(d)} style={{ cursor: 'pointer' }}>
                  <td><div style={{ fontWeight: 500 }}>{d.deal_name}</div>{d.address && <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{d.address}</div>}</td>
                  <td><span style={{ fontSize: '15px', padding: '2px 7px', borderRadius: '4px', background: (STAGE_COLORS[d.stage] || '#6b7280') + '22', color: STAGE_COLORS[d.stage] || '#6b7280', fontWeight: 600 }}>{d.stage}</span></td>
                  <td style={{ fontSize: '15px' }}>{d.deal_type || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: 'var(--accent)' }}>{d.deal_value ? fmt.price(d.deal_value) : '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: '#22c55e' }}>{d.commission_est ? fmt.price(d.commission_est) : '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '15px' }}>{d.probability != null ? `${d.probability}%` : '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '15px' }}>{d.close_date || '—'}</td>
                  <td style={{ fontSize: '15px' }}>{d.buyer || d.tenant_name || '—'}</td>
                  <td>{d.priority && <span style={{ fontSize: '15px', fontWeight: 600, color: priorityDot(d.priority) }}>{d.priority}</span>}</td>
                </tr>
              ))}
              {deals.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No deals</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="kanban-board" style={{ gap: '10px' }}>
          {DEAL_STAGES.map((stage) => {
            const stageDeals = dealsByStage[stage] || [];
            const isOver = dragOver === stage;
            const stageValue = stageDeals.reduce((s, d) => s + (d.deal_value || 0), 0);
            return (
              <div key={stage} className="kanban-col" style={{ minWidth: '230px', maxWidth: '230px' }}
                onDragOver={(e) => onDragOver(e, stage)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, stage)}>

                <div className="kanban-col-header" style={{ padding: '8px 10px', fontSize: '15px' }}>
                  <div className="kanban-col-dot" style={{ background: STAGE_COLORS[stage], width: '7px', height: '7px' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage}</span>
                  <span className="kanban-col-count">{stageDeals.length}</span>
                </div>

                {stageValue > 0 && (
                  <div style={{ padding: '0 10px 6px', fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {(stageValue / 1000000).toFixed(1)}M
                  </div>
                )}

                <div className="kanban-col-cards"
                  style={{ background: isOver ? 'var(--accent-soft)' : 'transparent', borderRadius: '8px', padding: '4px', transition: 'background 0.15s', minHeight: '80px' }}>

                  {stageDeals.map((deal) => (
                    <div key={deal.id} className="kanban-card" draggable
                      onDragStart={(e) => onDragStart(e, deal)}
                      onClick={(e) => toggleExpand(e, deal.id)}
                      onDoubleClick={() => onDealClick?.(deal)}
                      style={{ borderLeft: `3px solid ${STAGE_COLORS[stage]}`, opacity: dragging?.id === deal.id ? 0.4 : 1, padding: '12px' }}>

                      <div className="kanban-card-title" style={{ fontSize: '14px', marginBottom: '4px', lineHeight: '1.35' }}>{deal.deal_name}</div>
                      {deal.address && <div className="kanban-card-sub" style={{ fontSize: '13px', marginBottom: '6px' }}>{deal.address}</div>}

                      {stage === 'Marketing' && (
                        <div style={{ marginBottom: '6px' }}>
                          <div style={{ display: 'inline-flex', gap: '1px', background: 'var(--bg-input)', borderRadius: '4px', padding: '1px' }}>
                            {MARKETING_TYPES.map(mt => (
                              <button key={mt} onClick={async (e) => { e.stopPropagation(); await updateRow('deals', deal.id, { marketing_type: mt }); onRefresh(); }}
                                style={{ padding: '2px 8px', borderRadius: '3px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                                  background: (deal.marketing_type || 'Off-Market') === mt ? (mt === 'On-Market' ? 'var(--green)' : 'var(--accent)') : 'transparent',
                                  color: (deal.marketing_type || 'Off-Market') === mt ? 'white' : 'var(--text-muted)',
                                  transition: 'all 0.15s' }}>{mt}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="kanban-card-meta" style={{ gap: '6px' }}>
                        {deal.deal_value && <span className="kanban-card-value" style={{ fontSize: '15px' }}>{fmt.price(deal.deal_value)}</span>}
                        {deal.priority && (
                          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: priorityDot(deal.priority) }} />
                            <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{deal.priority}</span>
                          </span>
                        )}
                      </div>

                      {deal.probability != null && (
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${deal.probability}%`, height: '100%', borderRadius: '2px', background: deal.probability >= 70 ? 'var(--green)' : deal.probability >= 40 ? 'var(--amber)' : 'var(--text-muted)' }} />
                          </div>
                          <div style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '2px' }}>{deal.probability}%</div>
                        </div>
                      )}

                      {expanded === deal.id && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '15px' }}>
                            {[
                              ['Type', deal.deal_type],
                              ['Strategy', deal.strategy],
                              ['Buyer', deal.buyer],
                              ['Seller', deal.seller],
                              ['Tenant', deal.tenant_name],
                              ['Commission', deal.commission_est ? fmt.price(deal.commission_est) : null],
                              ['Rate', deal.commission_rate ? `${deal.commission_rate}%` : null],
                              ['Close Date', deal.close_date ? fmt.date(deal.close_date) : null],
                            ].filter(([, v]) => v).map(([label, val]) => (
                              <div key={label}>
                                <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '1px' }}>{label}</div>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{val}</div>
                              </div>
                            ))}
                          </div>
                          {deal.notes && (
                            <div style={{ marginTop: '8px', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>{deal.notes.slice(0, 120)}{deal.notes.length > 120 ? '...' : ''}</div>
                          )}
                          <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {DEAL_STAGES.filter(s => s !== deal.stage && s !== 'Dead').slice(0, 3).map(s => (
                              <button key={s} className="btn btn-ghost btn-sm" style={{ fontSize: '15px', padding: '2px 6px' }}
                                onClick={async (e) => { e.stopPropagation(); await updateRow('deals', deal.id, { stage: s }); showToast(`Moved to ${s}`); onRefresh(); }}>
                                → {s}
                              </button>
                            ))}
                          </div>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '15px', width: '100%', marginTop: '6px' }}
                            onClick={(e) => { e.stopPropagation(); onDealClick?.(deal); }}>
                            Open Full Page →
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {stageDeals.length === 0 && !isOver && (
                    <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '15px', color: 'var(--text-muted)', fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: '6px' }}>Drop here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
