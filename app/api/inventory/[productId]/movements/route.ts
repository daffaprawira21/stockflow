import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import { stockMovementProductIdSchema, stockMovementQuerySchema } from '@/modules/inventory/schemas';
import { listStockMovements } from '@/modules/inventory/service';

export const GET = apiHandler({
  method: 'GET',
  auth: true,
  param: { name: 'productId', schema: stockMovementProductIdSchema },
  query: stockMovementQuerySchema,
  run: async (ctx) => {
    const result = await listStockMovements(prisma, ctx.param!, ctx.query!);
    return { data: result.data, meta: result.meta };
  },
}).handler;
