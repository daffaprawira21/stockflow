import { describe, expect, it } from 'vitest';
import { createOrderSchema, orderListQuerySchema, orderIdSchema } from '../../modules/orders/schemas';

describe('order query schemas', () => {
  it('uses newest-first pagination defaults', () => {
    expect(orderListQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      search: undefined,
      status: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('trims search and ignores it when empty', () => {
    expect(orderListQuerySchema.parse({ search: '  ORD-2026  ' }).search).toBe('ORD-2026');
    expect(orderListQuerySchema.parse({ search: '   ' }).search).toBeUndefined();
  });

  it.each(['PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED'] as const)(
    'accepts %s as a status filter',
    (status) => {
      expect(orderListQuerySchema.parse({ status }).status).toBe(status);
    },
  );

  it.each([
    { page: '0' },
    { limit: '101' },
    { status: 'UNKNOWN' },
    { sortBy: 'status' },
    { sortOrder: 'newest' },
  ])('rejects invalid query %#', (query) => {
    expect(orderListQuerySchema.safeParse(query).success).toBe(false);
  });

  it('validates order identifiers as UUIDs', () => {
    expect(orderIdSchema.safeParse('00000000-0000-4000-8000-000000000001').success).toBe(true);
    expect(orderIdSchema.safeParse('not-a-uuid').success).toBe(false);
  });

  it('accepts a non-empty order item list with UUIDs and positive integer quantities', () => {
    expect(createOrderSchema.parse({
      items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 2 }],
    })).toEqual({
      items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 2 }],
    });
  });

  it.each([
    { items: [] },
    { items: [{ productId: 'not-a-uuid', quantity: 1 }] },
    { items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 0 }] },
    { items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 1.5 }] },
  ])('rejects invalid create-order payload %#', (payload) => {
    expect(createOrderSchema.safeParse(payload).success).toBe(false);
  });
});
