import { ApiError } from '@/lib/api/errors';
import { getSessionToken, requireAdmin } from '@/lib/api/guard';
import { isOriginAllowed } from '@/lib/api/origin';
import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import prisma from '@/lib/db';
import { allowedOrigins } from '@/lib/env';
import { logout } from '@/modules/auth/service';
import { buildClearedSessionCookie, serializeSessionCookie } from '@/modules/auth/session';

export async function POST(request: Request) {
  try {
    if (!isOriginAllowed(request, allowedOrigins)) {
      throw new ApiError('FORBIDDEN');
    }

    await requireAdmin(prisma, request);

    const token = getSessionToken(request);

    if (token) {
      await logout(prisma, token);
    }

    return jsonSuccess(
      { message: 'Successfully logged out' },
      {
        headers: {
          'Set-Cookie': serializeSessionCookie(buildClearedSessionCookie()),
        },
      },
    );
  } catch (error) {
    return jsonFromError(error);
  }
}
