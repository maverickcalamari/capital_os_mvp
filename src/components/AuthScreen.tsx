import { useState } from 'react';
import { useAuth } from '../lib/auth';

type Mode = 'signin' | 'signup' | 'reset';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const { signIn, signUp, resetPassword, loading, error } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setResetSent(false);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        await signUp(email, password, displayName || undefined);
      } else {
        await resetPassword(email);
        setResetSent(true);
      }
    } catch {
      // error set in store
    }
  };

  const displayError = localError ?? error;

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand auth-brand">
          <div className="logo-orb" />
          <div>
            <strong>CAPITAL OS</strong>
            <span>AI CFO COMMAND CENTER</span>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>
            Sign in
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Create account
          </button>
          <button className={mode === 'reset' ? 'active' : ''} onClick={() => setMode('reset')}>
            Reset
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && (
            <label>
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tre"
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          {mode !== 'reset' && (
            <label>
              Password
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </label>
          )}

          {displayError && <div className="auth-error" role="alert">{displayError}</div>}
          {resetSent && <div className="auth-success">Check your inbox for a reset link.</div>}

          <button type="submit" className="primary auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-foot">
          {mode === 'signin'
            ? "Don't have an account? "
            : mode === 'signup'
            ? 'Already have an account? '
            : 'Remembered your password? '}
          <button
            className="auth-link"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
