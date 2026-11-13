import { ApiError } from '@/lib/api/errors';
import { isOriginAllowed } from '@/lib/api/origin';
import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import prisma from '@/lib/db';
import { allowedOrigins } from '@/lib/env';
import { loginSchema, validationDetails } from '@/modules/auth/schemas';
import { login } from '@/modules/auth/service';
import { buildSessionCookie, serializeSessionCookie } from '@/modules/auth/session';

export async function POST(request: Request) {
  try {
    if (!isOriginAllowed(request, allowedOrigins)) {
      throw new ApiError('FORBIDDEN');
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON');
    }

    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
    }

    const result = await login(prisma, parsed.data);

    return jsonSuccess(
      { user: result.user },
      {
        headers: {
          'Set-Cookie': serializeSessionCookie(buildSessionCookie(result.token)),
        },
      },
    );
  } catch (error) {
    return jsonFromError(error);
  }
}
