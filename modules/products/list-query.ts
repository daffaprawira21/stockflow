import { z } from 'zod';

const positiveIntegerQuery = (fallback: string, maximum?: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .default(fallback)
    .transform(Number)
    .pipe(maximum === undefined
      ? z.number().int().positive()
      : z.number().int().min(1).max(maximum));

export const productListQuerySchema = z.object({
  page: positiveIntegerQuery('1'),
  limit: positiveIntegerQuery('10', 100),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform((value) =>
    value === undefined ? undefined : value === 'true',
  ),
  sortBy: z.enum(['name', 'sku', 'price', 'stock', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strip();

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
