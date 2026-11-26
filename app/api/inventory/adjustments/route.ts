import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import { adjustInventorySchema } from '@/modules/inventory/schemas';
import { adjustInventory } from '@/modules/inventory/service';

export const POST = apiHandler({
  method: 'POST',
  auth: true,
  body: adjustInventorySchema,
  run: async (ctx) => {
    const admin = ctx.admin!;
    const result = await adjustInventory(prisma, admin.id, ctx.body as never);
    return { data: result, status: 201 };
  },
}).handler;
