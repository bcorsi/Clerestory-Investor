'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchAttachments, uploadFile, addExternalLink, deleteAttachment } from '../lib/db';

const FILE_CATEGORIES = ['BOV', 'OM', 'LOI', 'PSA', 'Research Map', 'Financial Model', 'Comp Package', 'Report', 'Presentation', 'Photo', 'Other'];

const ICON_MAP = {
  html: '🗺', htm: '🗺',
  xlsx: '📊', xls: '📊', csv: '📊',
  pdf: '📄',
  pptx: '📽', ppt: '📽',
  docx: '📝', doc: '📝',
  png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼',
  zip: '📦',
};

const EMBEDDABLE = ['html', 'htm', 'png', 'jpg', 'jpeg', 'gif', 'pdf'];

export default function FilePanel({ recordType, recordId, showToast }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [linkCategory, setLinkCategory] = useState('');
  const [viewingFile, setViewingFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (recordId) {
      setLoading(true);
      fetchAttachments(recordType, recordId).then(f => { setFiles(f); setLoading(false); });
    }
  }, [recordType, recordId]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file, recordType, recordId);
      setFiles(prev => [result, ...prev]);
      showToast?.(`Uploaded ${file.name}`);
    } catch (err) {
      console.error('Upload error:', err);
      showToast?.('Upload failed — check Supabase Storage config');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;
    try {
      const name = linkName.trim() || linkUrl.split('/').pop() || 'External Link';
      const result = await addExternalLink(linkUrl.trim(), name, recordType, recordId, linkCategory || null);
      setFiles(prev => [result, ...prev]);
      setShowLinkForm(false); setLinkUrl(''); setLinkName(''); setLinkCategory('');
      showToast?.(`Link added: ${name}`);
    } catch (err) {
      console.error('Add link error:', err);
      showToast?.('Failed to add link');
    }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Delete ${file.file_name}?`)) return;
    try {
      const storagePath = file.source === 'upload' ? file.file_url.split('/attachments/')[1] : null;
      await deleteAttachment(file.id, storagePath);
      setFiles(prev => prev.filter(f => f.id !== file.id));
      showToast?.('File removed');
    } catch (err) { console.error(err); }
  };

  const openFile = (file) => {
    const ext = (file.file_type || '').toLowerCase();
    const isEmbeddable = EMBEDDABLE.includes(ext) && file.source === 'upload';
    
    if (isEmbeddable) {
      setViewingFile(file);
    } else {
      window.open(file.file_url, '_blank');
    }
  };

  const icon = (ext) => ICON_MAP[(ext || '').toLowerCase()] || '📎';
  const sourceLabel = (s) => ({ upload: 'Uploaded', onedrive: 'OneDrive', sharepoint: 'SharePoint', external: 'Link' }[s] || s);

  // Viewer modal
  if (viewingFile) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewingFile(null)}>← Back to Files</button>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{viewingFile.file_name}</span>
          </div>
          <a href={viewingFile.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ textDecoration: 'none' }}>Open in New Tab ↗</a>
        </div>
        <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--line)', height: '600px', background: '#111' }}>
          <iframe src={viewingFile.file_url} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Action bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
        <input ref={fileInputRef} type="file" onChange={handleUpload} style={{ display: 'none' }} />
        <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading...' : '↑ Upload File'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowLinkForm(!showLinkForm)}>
          {showLinkForm ? 'Cancel' : '+ Add Link'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {files.length} file{files.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Link form */}
      {showLinkForm && (
        <div className="card" style={{ marginBottom: '14px', padding: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input className="input" placeholder="OneDrive / SharePoint / URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} style={{ flex: 2 }} />
            <input className="input" placeholder="File name (optional)" value={linkName} onChange={e => setLinkName(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select className="select" value={linkCategory} onChange={e => setLinkCategory(e.target.value)} style={{ maxWidth: '160px' }}>
              <option value="">Category (optional)</option>
              {FILE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleAddLink} disabled={!linkUrl.trim()}>Add Link</button>
          </div>
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading files...</div>
      ) : files.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>📁</div>
          <div style={{ fontSize: '13px' }}>No files attached. Upload a file or add a OneDrive link.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {files.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
              onClick={() => openFile(f)}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{icon(f.file_type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                  <span>{sourceLabel(f.source)}</span>
                  {f.category && <span style={{ color: 'var(--accent)' }}>{f.category}</span>}
                  {f.file_size && <span>{(f.file_size / 1024).toFixed(0)}KB</span>}
                  <span>{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(f); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '4px', opacity: 0.5 }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
