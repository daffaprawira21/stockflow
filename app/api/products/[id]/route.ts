import { ApiError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/api/guard';
import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import { validationDetails } from '@/lib/api/validation';
import prisma from '@/lib/db';
import { getProductById } from '@/modules/products/service';
import { z } from 'zod';

const productIdSchema = z.uuid();

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
