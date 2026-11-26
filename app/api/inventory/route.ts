import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import { inventoryListQuerySchema } from '@/modules/inventory/schemas';
import { listInventory } from '@/modules/inventory/service';

export const GET = apiHandler({
  method: 'GET',
  auth: true,
  query: inventoryListQuerySchema,
  run: async (ctx) => {
    const result = await listInventory(prisma, ctx.query!);
    return { data: result.data, meta: result.meta };
  },
}).handler;
