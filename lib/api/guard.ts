import { ApiError } from './errors';
import { validateSession } from '../../modules/auth/session';
import { toPublicUser, type AuthPrismaClient, type PublicUser } from '../../modules/auth/service';

const DEFAULT_COOKIE_NAME = 'stockflow_session';

function sessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME ?? DEFAULT_COOKIE_NAME;
}

export function getSessionToken(request: Request): string | null {
  const header = request.headers.get('cookie');

  if (!header) {
    return null;
  }

  const name = sessionCookieName();

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const key = part.slice(0, separator).trim();

    if (key === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }

  return null;
}

export async function requireAdmin(
  prisma: AuthPrismaClient,
  request: Request,
): Promise<PublicUser> {
  const token = getSessionToken(request);

  if (!token) {
    throw new ApiError('UNAUTHENTICATED');
  }

  const validated = await validateSession(prisma, token);

  if (!validated) {
    throw new ApiError('UNAUTHENTICATED');
  }

  if (validated.user.role !== 'ADMIN') {
    throw new ApiError('FORBIDDEN');
  }

  return toPublicUser(validated.user);
}
