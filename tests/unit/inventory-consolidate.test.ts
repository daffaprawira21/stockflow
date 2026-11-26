import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api/errors';
import { consolidateStockItems } from '../../modules/inventory/consolidate';

describe('consolidateStockItems', () => {
  it('sums quantities per product and sorts by productId', () => {
    const result = consolidateStockItems([
      { productId: 'b', quantity: 5 },
      { productId: 'a', quantity: 2 },
      { productId: 'b', quantity: 3 },
      { productId: 'a', quantity: 1 },
    ]);
    expect(result).toEqual([
      { productId: 'a', quantity: 3 },
      { productId: 'b', quantity: 8 },
    ]);
  });

  it('returns a single item unchanged (but sorted trivially)', () => {
    expect(consolidateStockItems([{ productId: 'x', quantity: 7 }])).toEqual([
      { productId: 'x', quantity: 7 },
    ]);
  });

  it('returns an empty list for no items', () => {
    expect(consolidateStockItems([])).toEqual([]);
  });

  it('throws VALIDATION_ERROR when a consolidated quantity exceeds the Postgres bound', () => {
    const MAX = 2_147_483_647;
    expect(() =>
      consolidateStockItems([
        { productId: 'p', quantity: MAX - 10 },
        { productId: 'p', quantity: 20 }, // consolidated = MAX + 10
      ]),
    ).toThrowError(ApiError);
    expect(() =>
      consolidateStockItems([
        { productId: 'p', quantity: MAX - 10 },
        { productId: 'p', quantity: 20 },
      ]),
    ).toThrow('Consolidated item quantity exceeds the allowed maximum');
  });

  it('allows a consolidated quantity exactly at the bound', () => {
    const MAX = 2_147_483_647;
    expect(consolidateStockItems([
      { productId: 'p', quantity: MAX - 1 },
      { productId: 'p', quantity: 1 }, // consolidated = MAX
    ])).toEqual([{ productId: 'p', quantity: MAX }]);
  });
});
