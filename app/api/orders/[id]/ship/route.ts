import { ApiError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/api/guard';
import { isOriginAllowed } from '@/lib/api/origin';
import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import { validationDetails } from '@/lib/api/validation';
import prisma from '@/lib/db';
import { allowedOrigins } from '@/lib/env';
import { orderIdSchema } from '@/modules/orders/schemas';
import { shipOrder } from '@/modules/orders/service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!isOriginAllowed(request, allowedOrigins)) {
      throw new ApiError('FORBIDDEN', undefined, [{ origin: request.headers.get('origin') }]);
    }

    const admin = await requireAdmin(prisma, request);

    const { id } = await context.params;
    const parsedId = orderIdSchema.safeParse(id);
    if (!parsedId.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsedId.error));
    }

    return jsonSuccess(await shipOrder(prisma, admin.id, parsedId.data));
  } catch (error) {
    return jsonFromError(error);
  }
}
