'use client';

import { useState } from 'react';
import { DEAL_STAGES, STAGE_COLORS, MARKETING_TYPES, fmt } from '../lib/constants';
import { updateRow } from '../lib/db';

export default function DealPipeline({ deals, onRefresh, showToast, onDealClick }) {
  const [view, setView] = useState('kanban');
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const dealsByStage = {};
  DEAL_STAGES.forEach((s) => { dealsByStage[s] = deals.filter((d) => d.stage === s); });

  const onDragStart = (e, deal) => { setDragging(deal); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = (e, stage) => { e.preventDefault(); setDragOver(stage); };
  const onDragLeave = () => setDragOver(null);
  const onDrop = async (e, newStage) => {
    e.preventDefault(); setDragOver(null);
    if (dragging && dragging.stage !== newStage) {
      try { await updateRow('deals', dragging.id, { stage: newStage }); showToast(`Moved to ${newStage}`); onRefresh(); }
      catch (err) { console.error(err); }
    }
    setDragging(null);
  };

  const activeDeals = deals.filter(d => !['Closed', 'Dead'].includes(d.stage));
  const totalValue = activeDeals.reduce((s, d) => s + (d.deal_value || 0), 0);
  const totalComm = activeDeals.reduce((s, d) => s + (d.commission_est || 0), 0);
  const weightedComm = activeDeals.reduce((s, d) => s + (d.commission_est || 0) * ((d.probability || 0) / 100), 0);

  const probClass = (p) => p >= 70 ? 'high' : p >= 40 ? 'med' : 'low';

  return (
    <div>
      {/* Summary strip */}
      <div className="summary">
        <div className="sum-cell"><div className="sum-label">Total Value</div><div className="sum-val accent">{totalValue > 0 ? `$${(totalValue/1e6).toFixed(1)}M` : '—'}</div><div className="sum-sub">{activeDeals.length} deals</div></div>
        <div className="sum-cell"><div className="sum-label">Weighted</div><div className="sum-val">{weightedComm > 0 ? fmt.price(Math.round(weightedComm)) : '—'}</div><div className="sum-sub">by probability</div></div>
        <div className="sum-cell"><div className="sum-label">Commission</div><div className="sum-val accent">{totalComm > 0 ? fmt.price(Math.round(totalComm)) : '—'}</div><div className="sum-sub">estimated</div></div>
        <div className="sum-cell"><div className="sum-label">Avg Probability</div><div className="sum-val">{activeDeals.length > 0 ? Math.round(activeDeals.reduce((s,d) => s + (d.probability||0), 0) / activeDeals.length) + '%' : '—'}</div><div className="sum-sub">across pipeline</div></div>
        <div className="sum-cell"><div className="sum-label">View</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button className={`btn btn-sm ${view === 'kanban' ? 'btn-blue' : ''}`} onClick={() => setView('kanban')}>Board</button>
            <button className={`btn btn-sm ${view === 'list' ? 'btn-blue' : ''}`} onClick={() => setView('list')}>List</button>
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <div className="table-container">
          <table>
            <thead><tr><th>Deal</th><th>Stage</th><th>Type</th><th>Value</th><th>Commission</th><th>Probability</th><th>Close Date</th></tr></thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} onClick={() => onDealClick?.(d)} style={{ cursor: 'pointer' }}>
                  <td><div className="td-name">{d.deal_name}</div>{d.address && <div className="td-addr">{d.address}</div>}</td>
                  <td><span className="badge" style={{ background: (STAGE_COLORS[d.stage]||'#7A746C')+'14', borderColor: (STAGE_COLORS[d.stage]||'#7A746C')+'44', color: STAGE_COLORS[d.stage]||'#7A746C' }}>{d.stage}</span></td>
                  <td>{d.deal_type || '—'}</td>
                  <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--blue)' }}>{d.deal_value ? fmt.price(d.deal_value) : '—'}</td>
                  <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--green)' }}>{d.commission_est ? fmt.price(d.commission_est) : '—'}</td>
                  <td style={{ fontFamily: "'DM Mono',monospace" }}>{d.probability != null ? `${d.probability}%` : '—'}</td>
                  <td style={{ fontFamily: "'DM Mono',monospace" }}>{d.close_date || '—'}</td>
                </tr>
              ))}
              {deals.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink4)' }}>No deals</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        /* KANBAN VIEW — matches v5-03-pipeline mockup */
        <div className="kanban" style={{ gridTemplateColumns: `repeat(${DEAL_STAGES.filter(s => s !== 'Dead').length}, minmax(220px, 1fr))`, overflowX: 'auto' }}>
          {DEAL_STAGES.filter(s => s !== 'Dead').map((stage) => {
            const stageDeals = dealsByStage[stage] || [];
            const stageValue = stageDeals.reduce((s, d) => s + (d.deal_value || 0), 0);
            const isOver = dragOver === stage;
            return (
              <div key={stage} className="stage-col"
                onDragOver={(e) => onDragOver(e, stage)} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, stage)}>

                <div className="stage-head">
                  <div className="sh-left">
                    <div className="stage-dot" style={{ background: STAGE_COLORS[stage] }} />
                    <div className="stage-name">{stage}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="stage-count">{stageDeals.length}</div>
                    {stageValue > 0 && <div className="stage-val">${(stageValue/1e6).toFixed(1)}M</div>}
                  </div>
                </div>

                <div className="deals-list" style={{ background: isOver ? 'rgba(85,119,160,0.06)' : 'transparent', transition: 'background 0.15s', minHeight: '80px' }}>
                  {stageDeals.length === 0 ? (
                    <div className="empty-stage">
                      <div className="empty-label">Empty</div>
                    </div>
                  ) : stageDeals.map((deal) => (
                    <div key={deal.id}
                      className={`deal-card ${deal.priority === 'High' || deal.priority === 'Urgent' ? 'priority' : ''} ${['LOI Accepted / PSA','Closing'].includes(stage) ? 'urgent' : ''}`}
                      draggable onDragStart={(e) => onDragStart(e, deal)}
                      onClick={() => onDealClick?.(deal)}
                      style={{ opacity: dragging?.id === deal.id ? 0.4 : 1 }}>
                      <div className="dc-type">{deal.deal_type || 'Deal'}</div>
                      <div className="dc-name">{deal.deal_name}</div>
                      {deal.address && <div className="dc-address">{deal.address}</div>}
                      {deal.deal_value && <div className="dc-val">{fmt.price(deal.deal_value)}</div>}
                      <div className="dc-meta">
                        <span className="dc-sf">{deal.building_sf ? Number(deal.building_sf).toLocaleString() + ' SF' : ''}</span>
                        {deal.probability != null && <span className={`dc-prob ${probClass(deal.probability)}`}>{deal.probability}%</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="add-deal" onClick={() => showToast?.('Use + Deal button to add')}>+ Add Deal</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
