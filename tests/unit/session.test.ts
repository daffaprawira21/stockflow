import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_DURATION_MS,
  SESSION_TOKEN_BYTES,
  buildClearedSessionCookie,
  buildSessionCookie,
  generateSessionToken,
  hashSessionToken,
  isSessionExpired,
  serializeSessionCookie,
} from '../../modules/auth/session';

describe('session tokens', () => {
  it('generates a 32-byte base64url token', () => {
    const token = generateSessionToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(SESSION_TOKEN_BYTES);
  });

  it('generates a unique token each time', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateSessionToken()));

    expect(tokens.size).toBe(20);
  });

  it('hashes a token to a stable SHA-256 digest', () => {
    const token = 'example-session-token';
    const hash = hashSessionToken(token);

    expect(hash).toBe(hashSessionToken(token));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
  });
});

describe('session expiry', () => {
  const now = new Date('2026-11-13T10:00:00.000Z');

  it('treats a session as valid before its expiry', () => {
    expect(isSessionExpired(new Date(now.getTime() + 1), now)).toBe(false);
  });

  it('treats a session as expired at its expiry timestamp', () => {
    expect(isSessionExpired(new Date(now), now)).toBe(true);
  });

  it('treats a session as expired after its expiry', () => {
    expect(isSessionExpired(new Date(now.getTime() - 1), now)).toBe(true);
  });

  it('expires after exactly 12 hours', () => {
    expect(SESSION_DURATION_MS).toBe(43_200_000);
    expect(SESSION_COOKIE_MAX_AGE_SECONDS).toBe(43_200);
  });
});

describe('session cookies', () => {
  it('sets hardened cookie attributes', () => {
    const cookie = buildSessionCookie('token-value', { secure: true });

    expect(cookie).toMatchObject({
      name: 'stockflow_session',
      value: 'token-value',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 43_200,
    });
  });

  it('only marks the cookie secure in production by default', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(buildSessionCookie('token').secure).toBe(false);

    vi.stubEnv('NODE_ENV', 'production');
    expect(buildSessionCookie('token').secure).toBe(true);
  });

  it('lets SESSION_COOKIE_SECURE override the NODE_ENV default', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_COOKIE_SECURE', 'false');
    expect(buildSessionCookie('token').secure).toBe(false);

    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SESSION_COOKIE_SECURE', 'true');
    expect(buildSessionCookie('token').secure).toBe(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('clears the cookie with an empty value and zero age', () => {
    const cookie = buildClearedSessionCookie({ secure: true });

    expect(cookie.value).toBe('');
    expect(cookie.maxAge).toBe(0);
  });

  it('serializes the cookie header with hardened attributes', () => {
    const serialized = serializeSessionCookie(buildSessionCookie('token-value', { secure: true }));

    expect(serialized).toBe(
      'stockflow_session=token-value; Path=/; Max-Age=43200; HttpOnly; SameSite=Lax; Secure',
    );
  });
});
