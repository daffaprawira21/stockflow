import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import { productListQuerySchema } from '@/modules/products/list-query';
import { createProductSchema } from '@/modules/products/schemas';
import { createProduct, listProducts } from '@/modules/products/service';

export const GET = apiHandler({
  method: 'GET',
  auth: true,
  query: productListQuerySchema,
  run: async (ctx) => {
    const result = await listProducts(prisma, ctx.query as never);
    // Shared paginated helper — the hand-built Response.json is gone.
    return { data: result.data, meta: result.meta };
  },
}).handler;

export const POST = apiHandler({
  method: 'POST',
  auth: true,
  body: createProductSchema,
  run: async (ctx) => {
    const admin = ctx.admin!;
    const product = await createProduct(prisma, admin.id, ctx.body as never);
    return { data: product, status: 201 };
  },
}).handler;
