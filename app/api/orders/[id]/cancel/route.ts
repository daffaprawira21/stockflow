import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import { orderIdSchema, cancelOrderSchema } from '@/modules/orders/schemas';
import { cancelOrder } from '@/modules/orders/service';

export const POST = apiHandler({
  method: 'POST',
  auth: true,
  param: { name: 'id', schema: orderIdSchema },
  body: cancelOrderSchema,
  run: async (ctx) => {
    const admin = ctx.admin!;
    const reason = (ctx.body as { reason: string }).reason;
    const result = await cancelOrder(prisma, admin.id, ctx.param as string, reason);
    return { data: result };
  },
}).handler;
