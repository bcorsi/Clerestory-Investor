import { supabase, isConfigured } from './supabase';

// ══════════════════════════════════════════════════════════════
// CLERESTORY — File & Photo Storage
// ══════════════════════════════════════════════════════════════

const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];

function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return PHOTO_EXTENSIONS.includes(ext) ? 'photo' : 'document';
}

function generatePath(bucket, recordType, recordId, fileName) {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${recordType}/${recordId}/${timestamp}_${safeName}`;
}

// ─── UPLOAD ──────────────────────────────────────────────────

export async function uploadFile(file, { propertyId, dealId }) {
  if (!isConfigured()) {
    // Demo mode — return fake attachment
    return {
      id: `demo-${Date.now()}`,
      file_name: file.name,
      file_type: getFileType(file.name),
      mime_type: file.type,
      file_size: file.size,
      url: URL.createObjectURL(file),
      storage_path: `demo/${file.name}`,
      property_id: propertyId || null,
      deal_id: dealId || null,
      created_at: new Date().toISOString(),
    };
  }

  const fileType = getFileType(file.name);
  const bucket = fileType === 'photo' ? 'photos' : 'files';
  const recordType = propertyId ? 'properties' : 'deals';
  const recordId = propertyId || dealId;
  const path = generatePath(bucket, recordType, recordId, file.name);

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL for photos
  let url;
  if (bucket === 'photos') {
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    url = publicUrl;
  } else {
    // For private files, generate a signed URL
    const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24); // 24hr
    url = signedData?.signedUrl;
  }

  // Save metadata to attachments table
  const { data: attachment, error: dbError } = await supabase
    .from('attachments')
    .insert({
      property_id: propertyId || null,
      deal_id: dealId || null,
      file_name: file.name,
      file_type: fileType,
      mime_type: file.type,
      file_size: file.size,
      storage_path: path,
      url: url,
    })
    .select()
    .single();

  if (dbError) throw dbError;

  return attachment;
}

// ─── FETCH ───────────────────────────────────────────────────

export async function fetchAttachments({ propertyId, dealId }) {
  if (!isConfigured()) return [];

  let query = supabase.from('attachments').select('*').order('created_at', { ascending: false });

  if (propertyId) query = query.eq('property_id', propertyId);
  if (dealId) query = query.eq('deal_id', dealId);

  const { data, error } = await query;
  if (error) throw error;

  // Refresh signed URLs for private files
  const results = await Promise.all((data || []).map(async (att) => {
    if (att.file_type !== 'photo' && att.storage_path) {
      const { data: signedData } = await supabase.storage.from('files').createSignedUrl(att.storage_path, 60 * 60 * 24);
      return { ...att, url: signedData?.signedUrl || att.url };
    }
    return att;
  }));

  return results;
}

// ─── DELETE ──────────────────────────────────────────────────

export async function deleteAttachment(attachment) {
  if (!isConfigured()) return true;

  const bucket = attachment.file_type === 'photo' ? 'photos' : 'files';

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove([attachment.storage_path]);

  if (storageError) console.error('Storage delete error:', storageError);

  // Delete metadata
  const { error: dbError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachment.id);

  if (dbError) throw dbError;
  return true;
}

// ─── DOWNLOAD ────────────────────────────────────────────────

export async function downloadFile(attachment) {
  if (attachment.file_type === 'photo') {
    // Photos are public, just open the URL
    window.open(attachment.url, '_blank');
    return;
  }

  // For private files, get a fresh signed URL
  const { data } = await supabase.storage
    .from('files')
    .createSignedUrl(attachment.storage_path, 60 * 5); // 5 min

  if (data?.signedUrl) {
    window.open(data.signedUrl, '_blank');
  }
}

// ─── HELPERS ─────────────────────────────────────────────────

export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  const icons = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    ppt: '📑', pptx: '📑', csv: '📊', txt: '📃',
    jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼',
    zip: '📦', rar: '📦',
  };
  return icons[ext] || '📎';
}
