'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

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
    <main>
      <h1>Sign in to StockFlow</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div>
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
        <div>
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
          <p role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
