import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import { z } from 'zod';
import { deactivateProduct } from '@/modules/products/service';

const productIdSchema = z.uuid();

export const PATCH = apiHandler({
  method: 'PATCH',
  auth: true,
  param: { name: 'id', schema: productIdSchema },
  run: async (ctx) => {
    const result = await deactivateProduct(prisma, ctx.param as string);
    return { data: result };
  },
}).handler;
