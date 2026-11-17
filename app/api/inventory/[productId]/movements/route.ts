import { ApiError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/api/guard';
import { jsonFromError, jsonPaginated } from '@/lib/api/response';
import { validationDetails } from '@/lib/api/validation';
import prisma from '@/lib/db';
import { stockMovementProductIdSchema, stockMovementQuerySchema } from '@/modules/inventory/schemas';
import { listStockMovements } from '@/modules/inventory/service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    await requireAdmin(prisma, request);

    const { productId } = await params;
    const idResult = stockMovementProductIdSchema.safeParse(productId);
    if (!idResult.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(idResult.error));
    }

    const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = stockMovementQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
    }

    const result = await listStockMovements(prisma, idResult.data, parsed.data);
    return jsonPaginated(result.data, result.meta);
  } catch (error) {
    return jsonFromError(error);
  }
}
