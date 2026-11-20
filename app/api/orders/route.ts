import { ApiError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/api/guard';
import { isOriginAllowed } from '@/lib/api/origin';
import { jsonFromError, jsonPaginated, jsonSuccess } from '@/lib/api/response';
import { validationDetails } from '@/lib/api/validation';
import prisma from '@/lib/db';
import { allowedOrigins } from '@/lib/env';
import { createOrderSchema, orderListQuerySchema } from '@/modules/orders/schemas';
import { createOrder, listOrders } from '@/modules/orders/service';

export async function POST(request: Request) {
  try {
    if (!isOriginAllowed(request, allowedOrigins)) {
      throw new ApiError('FORBIDDEN', undefined, [{ origin: request.headers.get('origin') }]);
    }

    const admin = await requireAdmin(prisma, request);
    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    if (!idempotencyKey || idempotencyKey.length > 255) {
      throw new ApiError('VALIDATION_ERROR', 'Idempotency-Key header must contain 1 to 255 characters');
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON');
    }

    const parsed = createOrderSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
    }

    const result = await createOrder(prisma, admin.id, idempotencyKey, parsed.data);
    return jsonSuccess(result.order, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    return jsonFromError(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin(prisma, request);

    const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = orderListQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
    }

    const result = await listOrders(prisma, parsed.data);
    return jsonPaginated(result.data, result.meta);
  } catch (error) {
    return jsonFromError(error);
  }
}
