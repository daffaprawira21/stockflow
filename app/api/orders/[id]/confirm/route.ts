import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import { orderIdSchema } from '@/modules/orders/schemas';
import { confirmOrder } from '@/modules/orders/service';

export const POST = apiHandler({
  method: 'POST',
  auth: true,
  param: { name: 'id', schema: orderIdSchema },
  run: async (ctx) => {
    const admin = ctx.admin!;
    const result = await confirmOrder(prisma, admin.id, ctx.param as string);
    return { data: result };
  },
}).handler;
