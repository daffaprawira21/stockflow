import { ApiError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/api/guard';
import { isOriginAllowed } from '@/lib/api/origin';
import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import { validationDetails } from '@/lib/api/validation';
import prisma from '@/lib/db';
import { allowedOrigins } from '@/lib/env';
import { cancelOrderSchema, orderIdSchema } from '@/modules/orders/schemas';
import { cancelOrder } from '@/modules/orders/service';

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

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON');
    }

    const parsed = cancelOrderSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
    }

    return jsonSuccess(
      await cancelOrder(prisma, admin.id, parsedId.data, parsed.data.reason),
    );
  } catch (error) {
    return jsonFromError(error);
  }
}
