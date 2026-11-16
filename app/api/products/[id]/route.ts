import { ApiError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/api/guard';
import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import { isOriginAllowed } from '@/lib/api/origin';
import { validationDetails } from '@/lib/api/validation';
import prisma from '@/lib/db';
import { allowedOrigins } from '@/lib/env';
import { getProductById, updateProduct } from '@/modules/products/service';
import { updateProductSchema } from '@/modules/products/schemas';
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

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON');
    }

    const parsed = updateProductSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
    }

    return jsonSuccess(await updateProduct(prisma, parsedId.data, parsed.data));
  } catch (error) {
    return jsonFromError(error);
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(prisma, request);

    const { id } = await context.params;
    const parsedId = productIdSchema.safeParse(id);
    if (!parsedId.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsedId.error));
    }

    const product = await getProductById(prisma, parsedId.data);
    return jsonSuccess(product);
  } catch (error) {
    return jsonFromError(error);
  }
}
