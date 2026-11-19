import { z } from 'zod';

const positiveIntegerQuery = (fallback: string, maximum?: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .default(fallback)
    .transform(Number)
    .pipe(
      maximum === undefined
        ? z.number().int().positive()
        : z.number().int().min(1).max(maximum),
    );

export const orderStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED'] as const;

export const orderListQuerySchema = z
  .object({
    page: positiveIntegerQuery('1'),
    limit: positiveIntegerQuery('10', 100),
    status: z.enum(orderStatuses).optional(),
    search: z.string().trim().optional().transform((value) => value || undefined),
    sortBy: z.enum(['createdAt', 'orderNumber']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strip();

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.uuid(),
    quantity: z.number().int().min(1).max(2_147_483_647),
  })).min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderIdSchema = z.uuid();
