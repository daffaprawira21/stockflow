import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as loginRoute } from '../../app/api/auth/login/route';
import { POST as logoutRoute } from '../../app/api/auth/logout/route';
import { GET as meRoute } from '../../app/api/auth/me/route';
import prisma from '../../lib/db';
import { hashPassword } from '../../modules/auth/password';
import {
  SESSION_DURATION_MS,
  createSession,
  hashSessionToken,
  serializeSessionCookie,
  buildSessionCookie,
} from '../../modules/auth/session';
import { createTestPrismaClient, truncateAll } from '../helpers/db';
import { createTestAdmin } from '../helpers/factories';

const db = createTestPrismaClient();
const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'integration-test-password';

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.$disconnect();
  await prisma.$disconnect();
});

async function seedAdmin() {
  return createTestAdmin(db, { passwordHash: await hashPassword(PASSWORD) });
}

function jsonRequest(path: string, body: unknown, origin: string | null = ORIGIN): Request {
  const headers = new Headers({ 'content-type': 'application/json' });

  if (origin) {
    headers.set('origin', origin);
  }

  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function cookieRequest(path: string, token?: string, method = 'GET'): Request {
  const headers = new Headers();

  if (token) {
    headers.set('cookie', `stockflow_session=${encodeURIComponent(token)}`);
  }

  if (method !== 'GET') {
    headers.set('origin', ORIGIN);
    headers.set('content-type', 'application/json');
  }

  return new Request(`${ORIGIN}${path}`, { method, headers });
}

function readSessionToken(response: Response): string | null {
  const header = response.headers.get('set-cookie');

  if (!header) {
    return null;
  }

  const match = /stockflow_session=([^;]*)/.exec(header);
  return match ? decodeURIComponent(match[1]) : null;
}

describe('POST /api/auth/login', () => {
  it('creates a session and returns the administrator without the password hash', async () => {
    const admin = await seedAdmin();

    const response = await loginRoute(
      jsonRequest('/api/auth/login', { email: admin.email, password: PASSWORD }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { user: { id: admin.id, email: admin.email, role: 'ADMIN' } },
      meta: null,
    });
    expect(JSON.stringify(body)).not.toContain('password');

    const token = readSessionToken(response);
    expect(token).toBeTruthy();

    const session = await db.session.findFirstOrThrow();
    expect(session.userId).toBe(admin.id);
    expect(session.tokenHash).toBe(hashSessionToken(token as string));
    expect(session.tokenHash).not.toBe(token);
  });

  it('returns the same 401 for a wrong password and an unknown email, with no cookie', async () => {
    const admin = await seedAdmin();

    const wrongPassword = await loginRoute(
      jsonRequest('/api/auth/login', { email: admin.email, password: 'wrong-password' }),
    );
    const unknownEmail = await loginRoute(
      jsonRequest('/api/auth/login', { email: 'nobody@example.com', password: PASSWORD }),
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
    expect(wrongPassword.headers.get('set-cookie')).toBeNull();
    expect(unknownEmail.headers.get('set-cookie')).toBeNull();
    expect(await db.session.count()).toBe(0);
  });

  it('rejects invalid payloads with validation details', async () => {
    const response = await loginRoute(
      jsonRequest('/api/auth/login', { email: 'not-an-email', password: '' }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.length).toBeGreaterThan(0);
  });

  it('rejects a missing Origin header', async () => {
    const admin = await seedAdmin();

    const response = await loginRoute(
      jsonRequest('/api/auth/login', { email: admin.email, password: PASSWORD }, null),
    );

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('FORBIDDEN');
  });

  it('removes expired sessions on login but keeps live ones', async () => {
    const admin = await seedAdmin();
    const expired = await createSession(
      db,
      admin.id,
      new Date(Date.now() - SESSION_DURATION_MS - 1_000),
    );
    const live = await createSession(db, admin.id);

    await loginRoute(jsonRequest('/api/auth/login', { email: admin.email, password: PASSWORD }));

    const hashes = (await db.session.findMany()).map((row) => row.tokenHash);
    expect(hashes).not.toContain(hashSessionToken(expired.token));
    expect(hashes).toContain(hashSessionToken(live.token));
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated administrator', async () => {
    const admin = await seedAdmin();
    const { token } = await createSession(db, admin.id);

    const response = await meRoute(cookieRequest('/api/auth/me', token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: admin.id, email: admin.email, role: 'ADMIN' });
  });

  it('rejects a request without a session', async () => {
    const response = await meRoute(cookieRequest('/api/auth/me'));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an expired session', async () => {
    const admin = await seedAdmin();
    const { token } = await createSession(
      db,
      admin.id,
      new Date(Date.now() - SESSION_DURATION_MS - 1_000),
    );

    const response = await meRoute(cookieRequest('/api/auth/me', token));

    expect(response.status).toBe(401);
  });

  it('rejects an unknown token', async () => {
    const response = await meRoute(cookieRequest('/api/auth/me', 'not-a-real-token'));

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('deletes the session row and clears the cookie', async () => {
    const admin = await seedAdmin();
    const { token } = await createSession(db, admin.id);

    const response = await logoutRoute(
      cookieRequest('/api/auth/logout', token, 'POST'),
    );

    expect(response.status).toBe(200);
    expect(readSessionToken(response)).toBe('');

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('Max-Age=0');
    expect(await db.session.count()).toBe(0);

    const meResponse = await meRoute(cookieRequest('/api/auth/me', token));
    expect(meResponse.status).toBe(401);
  });

  it('rejects logout without a session', async () => {
    const response = await logoutRoute(cookieRequest('/api/auth/logout', undefined, 'POST'));

    expect(response.status).toBe(401);
  });
});

describe('session cookie serialization', () => {
  it('round-trips through the guard parser', () => {
    const token = 'round-trip-token';
    const serialized = serializeSessionCookie(buildSessionCookie(token));

    expect(serialized).toContain(`stockflow_session=${token}`);
  });
});
