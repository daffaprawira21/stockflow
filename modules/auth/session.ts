import { createHash, randomBytes } from 'node:crypto';
import type { Prisma, PrismaClient } from '../../lib/generated/prisma/client';

export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;
export const SESSION_TOKEN_BYTES = 32;

type SessionClient = Pick<PrismaClient, 'session' | '$transaction'>;

export type CreatedSession = {
  token: string;
  expiresAt: Date;
};

export type ValidatedSession = {
  session: Prisma.SessionModel;
  user: Prisma.UserModel;
};

export type SessionCookie = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
};

export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isSessionExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export async function createSession(
  prisma: SessionClient,
  userId: string,
  now: Date = new Date(),
): Promise<CreatedSession> {
  const token = generateSessionToken();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { expiresAt: { lte: now } } });
    await tx.session.create({
      data: {
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt,
      },
    });
  });

  return { token, expiresAt };
}

export async function validateSession(
  prisma: SessionClient,
  token: string,
  now: Date = new Date(),
): Promise<ValidatedSession | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });

  if (!session || isSessionExpired(session.expiresAt, now)) {
    return null;
  }

  return { session, user: session.user };
}

export async function revokeSession(prisma: SessionClient, token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

function sessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME ?? 'stockflow_session';
}

function cookieSecureByDefault(): boolean {
  const override = process.env.SESSION_COOKIE_SECURE;

  if (override === 'true') {
    return true;
  }

  if (override === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}

export function buildSessionCookie(
  token: string,
  options: { secure?: boolean } = {},
): SessionCookie {
  return {
    name: sessionCookieName(),
    value: token,
    httpOnly: true,
    secure: options.secure ?? cookieSecureByDefault(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  };
}

export function buildClearedSessionCookie(options: { secure?: boolean } = {}): SessionCookie {
  return {
    ...buildSessionCookie('', options),
    maxAge: 0,
  };
}

export function serializeSessionCookie(cookie: SessionCookie): string {
  const parts = [
    `${cookie.name}=${encodeURIComponent(cookie.value)}`,
    `Path=${cookie.path}`,
    `Max-Age=${cookie.maxAge}`,
    'HttpOnly',
    `SameSite=${cookie.sameSite === 'lax' ? 'Lax' : cookie.sameSite}`,
  ];

  if (cookie.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}
