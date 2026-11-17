import { z } from 'zod';
import { stockMovementTypes } from './types';

const MAX_POSTGRES_INTEGER = 2_147_483_647;

const positiveIntegerQuery = (fallback: string, maximum?: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .default(fallback)
    .transform(Number)
    .pipe(maximum === undefined
      ? z.number().int().positive()
      : z.number().int().min(1).max(maximum));

const nonnegativeIntegerQuery = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(0).max(MAX_POSTGRES_INTEGER));

export const inventoryListQuerySchema = z.object({
  page: positiveIntegerQuery('1'),
  limit: positiveIntegerQuery('10', 100),
  search: z.string().trim().optional().transform((value) => value || undefined),
  lowStock: nonnegativeIntegerQuery.optional(),
}).strip();

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;

export const stockMovementProductIdSchema = z.string().uuid();

export const stockMovementQuerySchema = z.object({
  page: positiveIntegerQuery('1'),
  limit: positiveIntegerQuery('10', 100),
  movementType: z.enum(stockMovementTypes).optional(),
}).strip();

export type StockMovementQuery = z.infer<typeof stockMovementQuerySchema>;

export const adjustInventorySchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
  quantity: z.number().int().positive(),
  reason: z.string().trim().min(1),
});

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
