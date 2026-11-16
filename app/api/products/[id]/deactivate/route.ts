import { ApiError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/api/guard';
import { isOriginAllowed } from '@/lib/api/origin';
import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import { validationDetails } from '@/lib/api/validation';
import prisma from '@/lib/db';
import { allowedOrigins } from '@/lib/env';
import { deactivateProduct } from '@/modules/products/service';
import { z } from 'zod';

const productIdSchema = z.uuid();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!isOriginAllowed(request, allowedOrigins)) {
      throw new ApiError('FORBIDDEN');
    }

    await requireAdmin(prisma, request);
    const { id } = await context.params;
    const parsedId = productIdSchema.safeParse(id);
    if (!parsedId.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsedId.error));
    }

    return jsonSuccess(await deactivateProduct(prisma, parsedId.data));
  } catch (error) {
    return jsonFromError(error);
  }
}
