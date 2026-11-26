import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import { updateProductSchema } from '@/modules/products/schemas';
import { getProductById, updateProduct } from '@/modules/products/service';
import { z } from 'zod';

const productIdSchema = z.uuid();

export const PATCH = apiHandler({
  method: 'PATCH',
  auth: true,
  param: { name: 'id', schema: productIdSchema },
  body: updateProductSchema,
  run: async (ctx) => {
    const result = await updateProduct(prisma, ctx.param!, ctx.body!);
    return { data: result };
  },
}).handler;

export const GET = apiHandler({
  method: 'GET',
  auth: true,
  param: { name: 'id', schema: productIdSchema },
  run: async (ctx) => {
    const product = await getProductById(prisma, ctx.param!);
    return { data: product };
  },
}).handler;
