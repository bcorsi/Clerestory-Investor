'use client';

import { useState } from 'react';
import { updateProfile, updatePassword } from '../lib/supabase';

export default function ProfileSettings({ user, showToast }) {
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [saving, setSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState(null);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim() });
      showToast('Profile updated');
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwError(null);
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }

    setPwSaving(true);
    try {
      await updatePassword(newPw);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      showToast('Password updated');
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  const initial = (fullName || user?.email || '?')[0].toUpperCase();

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Profile Header */}
      <div className="card mb-6" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', fontWeight: 700, flexShrink: 0,
        }}>{initial}</div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{fullName || 'No name set'}</div>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{user?.email}</div>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card mb-6">
        <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '16px' }}>Profile</div>

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
          <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '4px' }}>Email cannot be changed here</div>
        </div>

        <button className="btn btn-primary" onClick={handleProfileSave} disabled={saving} style={{ marginTop: '8px' }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {/* Change Password */}
      <div className="card mb-6">
        <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '16px' }}>Change Password</div>

        <div className="form-group">
          <label className="form-label">New Password</label>
          <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 6 characters" />
        </div>

        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat password" />
        </div>

        {pwError && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--red-soft)', color: 'var(--red)',
            fontSize: '15px', marginBottom: '12px',
          }}>{pwError}</div>
        )}

        <button className="btn btn-ghost" onClick={handlePasswordChange} disabled={pwSaving || !newPw}>
          {pwSaving ? 'Updating...' : 'Update Password'}
        </button>
      </div>

      {/* App Info */}
      <div className="card">
        <div style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '16px' }}>About</div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '15px' }}>
          <span style={{ color: 'var(--text-muted)' }}>App</span><span style={{ color: 'var(--text-primary)' }}>Clerestory v2</span>
          <span style={{ color: 'var(--text-muted)' }}>Platform</span><span style={{ color: 'var(--text-primary)' }}>Colliers · SGV / IE</span>
          <span style={{ color: 'var(--text-muted)' }}>Stack</span><span style={{ color: 'var(--text-primary)' }}>Next.js + Supabase + Vercel</span>
          <span style={{ color: 'var(--text-muted)' }}>Theme</span><span style={{ color: 'var(--text-primary)' }}>Soft Slate</span>
        </div>
      </div>
    </div>
  );
}
