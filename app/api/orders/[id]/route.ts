import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import { orderIdSchema } from '@/modules/orders/schemas';
import { getOrderById } from '@/modules/orders/service';

export const GET = apiHandler({
  method: 'GET',
  auth: true,
  param: { name: 'id', schema: orderIdSchema },
  run: async (ctx) => {
    const order = await getOrderById(prisma, ctx.param!);
    return { data: order };
  },
}).handler;
