'use client';

import { useState } from 'react';
import { updateRow } from '../lib/db';

const LINK_TYPES = ['Acquisition Model', 'BOV/OM', 'Survey', 'Site Photos', 'Title Report', 'Environmental', 'Lease Abstract', 'Purchase Agreement', 'OneDrive Folder', 'Appraisal', 'Other'];
const ICONS = { 'Acquisition Model': '📊', 'BOV/OM': '📄', 'Survey': '📐', 'Site Photos': '📷', 'Title Report': '📋', 'Environmental': '🌿', 'Lease Abstract': '📝', 'Purchase Agreement': '📑', 'OneDrive Folder': '📁', 'Appraisal': '💰', 'Other': '🔗' };

export default function FilesLinks({ record, table, onRefresh, showToast }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('OneDrive Folder');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const links = record.file_links || [];

  const handleAdd = async () => {
    if (!url.trim()) return;
    setSaving(true);
    const updated = [...links, { label, url: url.trim(), added: new Date().toISOString() }];
    try {
      await updateRow(table, record.id, { file_links: updated });
      onRefresh?.();
      showToast?.(`Added: ${label}`);
      setUrl('');
      setAdding(false);
    } catch (e) { console.error(e); showToast?.('Error — run SQL migration to add file_links column'); }
    finally { setSaving(false); }
  };

  const handleRemove = async (idx) => {
    const updated = links.filter((_, i) => i !== idx);
    try {
      await updateRow(table, record.id, { file_links: updated });
      onRefresh?.();
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Files & Links ({links.length})</h3>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }} onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add Link'}</button>
      </div>

      {adding && (
        <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '6px', marginBottom: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <select className="select" style={{ fontSize: '13px', width: '180px' }} value={label} onChange={e => setLabel(e.target.value)}>
              {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="input" style={{ flex: 1, minWidth: '200px', fontSize: '13px' }} placeholder="Paste OneDrive / Google Drive URL..." value={url} onChange={e => setUrl(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving || !url.trim()}>{saving ? '...' : 'Add'}</button>
          </div>
        </div>
      )}

      {links.length === 0 && !adding && (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No files linked yet — click + Add Link to attach OneDrive or Google Drive files</div>
      )}

      {links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {links.map((link, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '6px' }}>
              <span style={{ fontSize: '18px' }}>{ICONS[link.label] || '🔗'}</span>
              <div style={{ flex: 1 }}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}>{link.label}</a>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{new Date(link.added).toLocaleDateString()}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', color: 'var(--red)', padding: '2px 6px' }} onClick={() => handleRemove(i)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
