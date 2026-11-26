import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import {
  orderListQuerySchema,
  createOrderSchema,
  type CreateOrderInput,
  type OrderListQuery,
} from '@/modules/orders/schemas';
import { createOrder, listOrders } from '@/modules/orders/service';
import { z } from 'zod';

/**
 * The idempotency-key rule (1–255 chars) lives in the header schema, not in
 * the route body. The pipeline validates it before `run`.
 *
 * Length is checked on the raw header value (no trim), matching the pre-
 * migration behaviour: a raw header longer than 255 chars is rejected even
 * if it trims to 255 or fewer. The value is trimmed before use so leading/
 * trailing whitespace doesn't change the key.
 */
const idempotencyKeyHeaderSchema = z.object({
  'idempotency-key': z.string().min(1).max(255),
});

export const POST = apiHandler({
  method: 'POST',
  auth: true,
  headers: idempotencyKeyHeaderSchema,
  body: createOrderSchema,
  run: async (ctx) => {
    const admin = ctx.admin!;
    const rawKey = ctx.headers!['idempotency-key'];
    const key = rawKey.trim();
    const input = ctx.body as CreateOrderInput;
    const result = await createOrder(prisma, admin.id, key, input);
    return { data: result.order, status: result.replayed ? 200 : 201 };
  },
}).handler;

export const GET = apiHandler({
  method: 'GET',
  auth: true,
  query: orderListQuerySchema,
  run: async (ctx) => {
    const result = await listOrders(prisma, ctx.query as OrderListQuery);
    return { data: result.data, meta: result.meta };
  },
}).handler;
