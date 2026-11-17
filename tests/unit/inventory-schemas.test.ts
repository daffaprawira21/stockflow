import { describe, expect, it } from 'vitest';
import {
  adjustInventorySchema,
  inventoryListQuerySchema,
  stockMovementQuerySchema,
} from '../../modules/inventory/schemas';

describe('inventoryListQuerySchema', () => {
  it('defaults pagination and ignores unknown query parameters', () => {
    expect(inventoryListQuerySchema.parse({ ignored: 'value' })).toEqual({
      page: 1,
      limit: 10,
      search: undefined,
      lowStock: undefined,
    });
  });

  it('parses pagination, trims search, normalizes empty search, and accepts integer low-stock boundaries', () => {
    expect(inventoryListQuerySchema.parse({
      page: '2',
      limit: '100',
      search: '  mouse  ',
      lowStock: '2147483647',
    })).toEqual({ page: 2, limit: 100, search: 'mouse', lowStock: 2147483647 });
    expect(inventoryListQuerySchema.parse({ lowStock: '0' }).lowStock).toBe(0);
    expect(inventoryListQuerySchema.parse({ search: '   ' }).search).toBeUndefined();
  });

  it.each([
    { page: '0' },
    { page: '1.5' },
    { limit: '101' },
    { lowStock: '-1' },
    { lowStock: '1.5' },
    { lowStock: '2147483648' },
  ])('rejects invalid query values: %o', (query) => {
    expect(inventoryListQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('stockMovementQuerySchema', () => {
  it('defaults pagination and ignores unknown query parameters', () => {
    expect(stockMovementQuerySchema.parse({ unknown: 'x' })).toEqual({
      page: 1,
      limit: 10,
      movementType: undefined,
    });
  });

  it.each(['INITIAL_STOCK', 'ORDER_CONFIRMED', 'ORDER_CANCELLED', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'])('accepts movement type %s', (movementType) => {
    expect(stockMovementQuerySchema.parse({ movementType }).movementType).toBe(movementType);
  });

  it('rejects unsupported movement types and invalid pagination', () => {
    expect(stockMovementQuerySchema.safeParse({ movementType: 'OTHER' }).success).toBe(false);
    expect(stockMovementQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });
});

describe('adjustInventorySchema', () => {
  const validRequest = {
    productId: '550e8400-e29b-41d4-a716-446655440000',
    type: 'ADJUSTMENT_IN',
    quantity: 1,
    reason: '  received stock  ',
  };

  it('accepts adjustment types, trims reason, and strips unknown fields', () => {
    expect(adjustInventorySchema.parse({ ...validRequest, extra: true })).toEqual({
      ...validRequest,
      reason: 'received stock',
    });
    expect(adjustInventorySchema.parse({ ...validRequest, type: 'ADJUSTMENT_OUT' }).type).toBe('ADJUSTMENT_OUT');
  });

  it.each([
    { ...validRequest, productId: 'not-a-uuid' },
    { ...validRequest, type: 'INITIAL_STOCK' },
    { ...validRequest, quantity: 0 },
    { ...validRequest, quantity: 1.5 },
    { ...validRequest, quantity: '1' },
    { ...validRequest, reason: '   ' },
  ])('rejects invalid adjustment: %o', (input) => {
    expect(adjustInventorySchema.safeParse(input).success).toBe(false);
  });
});
