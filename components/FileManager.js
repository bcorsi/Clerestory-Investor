'use client';

import { useState, useRef, useEffect } from 'react';
import { uploadFile, fetchAttachments, deleteAttachment, downloadFile, formatFileSize, getFileIcon } from '../lib/storage';

export default function FileManager({ propertyId, dealId, showToast }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef(null);

  const photos = attachments.filter((a) => a.file_type === 'photo');
  const files = attachments.filter((a) => a.file_type === 'document');

  // Load attachments
  useEffect(() => {
    loadAttachments();
  }, [propertyId, dealId]);

  const loadAttachments = async () => {
    try {
      const data = await fetchAttachments({ propertyId, dealId });
      setAttachments(data);
    } catch (err) {
      console.error('Load attachments error:', err);
    }
  };

  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        await uploadFile(file, { propertyId, dealId });
      }
      await loadAttachments();
      showToast?.(`${fileList.length} file${fileList.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      console.error('Upload error:', err);
      showToast?.('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (att) => {
    if (!confirm(`Delete ${att.file_name}?`)) return;
    try {
      await deleteAttachment(att);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
      showToast?.('File deleted');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div>
      {/* Photos Section */}
      <div className="detail-section">
        <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Photos ({photos.length})</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              fileRef.current.accept = 'image/*';
              fileRef.current.click();
            }}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : '+ Upload'}
          </button>
        </div>

        {photos.length === 0 ? (
          <div
            style={{
              padding: '32px', textAlign: 'center', border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              transition: 'all 0.2s', background: dragging ? 'var(--accent-soft)' : 'transparent',
              borderColor: dragging ? 'var(--accent)' : 'var(--border)',
            }}
            onClick={() => { fileRef.current.accept = 'image/*'; fileRef.current.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }}>🖼</div>
            <div style={{  color: 'var(--text-muted)' }}>Drop photos here or click to upload</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                  aspectRatio: '4/3', cursor: 'pointer', border: '1px solid var(--border)',
                }}
                onClick={() => setLightbox(photo)}
              >
                <img
                  src={photo.url}
                  alt={photo.file_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}
                  style={{
                    position: 'absolute', top: '4px', right: '4px',
                    background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                    borderRadius: '4px', width: '22px', height: '22px', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  ×
                </button>
              </div>
            ))}
            {/* Add more button */}
            <div
              style={{
                aspectRatio: '4/3', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onClick={() => { fileRef.current.accept = 'image/*'; fileRef.current.click(); }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: '20px', color: 'var(--text-muted)' }}>+</span>
            </div>
          </div>
        )}
      </div>

      {/* Files Section */}
      <div className="detail-section">
        <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Files ({files.length})</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              fileRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip';
              fileRef.current.click();
            }}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : '+ Upload'}
          </button>
        </div>

        {files.length === 0 ? (
          <div
            style={{
              padding: '24px', textAlign: 'center', border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              transition: 'all 0.2s', background: dragging ? 'var(--accent-soft)' : 'transparent',
              borderColor: dragging ? 'var(--accent)' : 'var(--border)',
            }}
            onClick={() => { fileRef.current.accept = '*'; fileRef.current.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }}>📁</div>
            <div style={{  color: 'var(--text-muted)' }}>Drop files here or click to upload</div>
            <div style={{  color: 'var(--text-muted)', marginTop: '4px' }}>PDF, Excel, Word, PowerPoint, CSV</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {files.map((file) => (
              <div
                key={file.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
              >
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{getFileIcon(file.file_name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{  fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.file_name}
                  </div>
                  <div style={{  color: 'var(--text-muted)' }}>
                    {formatFileSize(file.file_size)} · {new Date(file.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => downloadFile(file)}
                  className="btn btn-ghost btn-sm"
                  style={{  }}
                >
                  ↓
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  className="btn btn-ghost btn-sm"
                  style={{  color: 'var(--text-muted)' }}
                >
                  ×
                </button>
              </div>
            ))}
            {/* Upload more */}
            <div
              style={{
                padding: '8px 12px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                textAlign: 'center', cursor: 'pointer',  color: 'var(--text-muted)',
                transition: 'border-color 0.15s',
              }}
              onClick={() => { fileRef.current.accept = '*'; fileRef.current.click(); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              + Add more files
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, cursor: 'pointer',
          }}
          onClick={() => setLightbox(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={lightbox.url}
              alt={lightbox.file_name}
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
            />
            <div style={{
              position: 'absolute', bottom: '-40px', left: 0, right: 0, textAlign: 'center',
               color: 'rgba(255,255,255,0.7)',
            }}>
              {lightbox.file_name}
            </div>
          </div>
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none',
              borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
