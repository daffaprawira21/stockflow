import { ApiError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/api/guard';
import { jsonFromError, jsonPaginated } from '@/lib/api/response';
import { validationDetails } from '@/lib/api/validation';
import prisma from '@/lib/db';
import { orderListQuerySchema } from '@/modules/orders/schemas';
import { listOrders } from '@/modules/orders/service';

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
