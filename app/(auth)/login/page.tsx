'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/app/(admin)/theme-toggle';
import { AlertIcon, SpinnerIcon } from '@/components/ui/Icons';

type ErrorResponse = {
  error?: {
    code?: string;
    details?: Array<{ origin?: string | null }>;
  };
};

const FALLBACK_ERROR = 'Unable to sign in. Please try again.';

function errorMessage(body: ErrorResponse | null): string {
  switch (body?.error?.code) {
    case 'UNAUTHENTICATED':
      return 'Invalid email or password';
    case 'VALIDATION_ERROR':
      return 'Please enter a valid email and password';
    case 'FORBIDDEN': {
      const origin = body?.error?.details?.[0]?.origin;

      return origin
        ? `Sign-in was blocked for ${origin}. Add it to ALLOWED_ORIGINS in .env.`
        : 'Sign-in was blocked for this address. Add it to ALLOWED_ORIGINS in .env.';
    }
    case 'INTERNAL_SERVER_ERROR':
      return 'The server could not complete the sign-in. Check the database connection.';
    default:
      return FALLBACK_ERROR;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ErrorResponse | null;

        setError(errorMessage(body));
        return;
      }

      router.replace('/');
    } catch {
      setError(FALLBACK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          position: 'relative',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: 32,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
          }}
        >
          <ThemeToggle />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <Logo style={{ width: 48, height: 48 }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            Sign in to StockFlow
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', margin: 0 }}>
            Admin inventory &amp; order management
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <div className="form-error" role="alert" aria-live="polite" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending}
            style={{ width: '100%', marginTop: 8 }}
          >
            {pending ? (
              <>
                <SpinnerIcon style={{ width: 14, height: 14 }} className="animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
