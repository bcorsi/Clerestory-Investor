'use client';

import { useState } from 'react';
import { signIn, signUp } from '../lib/supabase';

export default function AuthGate({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) { setError('Name is required'); setLoading(false); return; }
        await signUp(email, password, fullName.trim());
      } else {
        await signIn(email, password);
      }
      onAuth();
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-root)', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '48px', height: '48px', background: 'var(--accent)', borderRadius: '12px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, color: 'white', marginBottom: '16px',
          }}>C</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Clerestory</h1>
          <p style={{  color: 'var(--text-muted)', marginTop: '6px' }}>CRE Brokerage Intelligence</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '32px',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)' }}>
            {mode === 'login' ? 'Sign in' : 'Create your account'}
          </h2>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Briana"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@colliers.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer',  fontFamily: 'var(--font-sans)',
                    padding: '2px 4px', borderRadius: '4px',
                  }}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg)', color: 'var(--red)',
                 marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px',  marginTop: '8px' }}
            >
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign in' : 'Create account')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px',  color: 'var(--text-muted)' }}>
            {mode === 'login' ? (
              <>
                No account yet?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-sans)',  fontWeight: 500 }}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setError(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-sans)',  fontWeight: 500 }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center',  color: 'var(--text-muted)', marginTop: '24px' }}>
          Colliers · SGV / IE Industrial
        </p>
      </div>
    </div>
  );
}
