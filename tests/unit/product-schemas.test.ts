import { describe, expect, it } from 'vitest';
import { createProductSchema } from '../../modules/products/schemas';

describe('createProductSchema', () => {
  it('normalizes SKU and trims product name', () => {
    expect(
      createProductSchema.parse({
        sku: '  prd-001  ',
        name: '  Wireless Mouse  ',
        price: '150000.00',
        initialStock: 50,
      }),
    ).toEqual({
      sku: 'PRD-001',
      name: 'Wireless Mouse',
      price: '150000.00',
      initialStock: 50,
    });
  });

  it.each([
    ['negative price', { sku: 'PRD-001', name: 'Mouse', price: '-1.00', initialStock: 1 }],
    ['numeric price', { sku: 'PRD-001', name: 'Mouse', price: 10, initialStock: 1 }],
    ['price with more than two decimals', { sku: 'PRD-001', name: 'Mouse', price: '1.001', initialStock: 1 }],
    ['price outside Decimal(15,2)', { sku: 'PRD-001', name: 'Mouse', price: '10000000000000.00', initialStock: 1 }],
    ['missing initial stock', { sku: 'PRD-001', name: 'Mouse', price: '1.00' }],
    ['negative stock', { sku: 'PRD-001', name: 'Mouse', price: '1.00', initialStock: -1 }],
    ['fractional stock', { sku: 'PRD-001', name: 'Mouse', price: '1.00', initialStock: 1.5 }],
    ['empty name', { sku: 'PRD-001', name: '  ', price: '1.00', initialStock: 1 }],
  ])('rejects %s', (_label, payload) => {
    expect(createProductSchema.safeParse(payload).success).toBe(false);
  });

  it('accepts optional description and preserves empty description as empty text', () => {
    expect(
      createProductSchema.parse({
        sku: 'PRD-001',
        name: 'Mouse',
        description: '',
        price: '0',
        initialStock: 0,
      }).description,
    ).toBe('');
  });
});
