import { ApiError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/api/guard';
import { isOriginAllowed } from '@/lib/api/origin';
import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import { validationDetails } from '@/lib/api/validation';
import prisma from '@/lib/db';
import { allowedOrigins } from '@/lib/env';
import { productListQuerySchema } from '@/modules/products/list-query';
import { createProduct, listProducts } from '@/modules/products/service';
import { createProductSchema } from '@/modules/products/schemas';

export async function GET(request: Request) {
  try {
    await requireAdmin(prisma, request);

    const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = productListQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
    }

    const result = await listProducts(prisma, parsed.data);
    return Response.json(
      { success: true, data: result.data, meta: result.meta },
      { status: 200 },
    );
  } catch (error) {
    return jsonFromError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!isOriginAllowed(request, allowedOrigins)) {
      throw new ApiError('FORBIDDEN', undefined, [
        { origin: request.headers.get('origin') },
      ]);
    }

    const admin = await requireAdmin(prisma, request);

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON');
    }

    const parsed = createProductSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
    }

    const product = await createProduct(prisma, admin.id, parsed.data);
    return jsonSuccess(product, { status: 201 });
  } catch (error) {
    return jsonFromError(error);
  }
}
