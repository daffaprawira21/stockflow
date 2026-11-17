import { ApiError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/api/guard';
import { isOriginAllowed } from '@/lib/api/origin';
import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import { validationDetails } from '@/lib/api/validation';
import prisma from '@/lib/db';
import { allowedOrigins } from '@/lib/env';
import { adjustInventorySchema } from '@/modules/inventory/schemas';
import { adjustInventory } from '@/modules/inventory/service';

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

    const parsed = adjustInventorySchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
    }

    const result = await adjustInventory(prisma, admin.id, parsed.data);
    return jsonSuccess(result, { status: 201 });
  } catch (error) {
    return jsonFromError(error);
  }
}
