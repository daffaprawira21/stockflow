import { describe, expect, it } from 'vitest';
import { updateProductSchema } from '../../modules/products/schemas';

describe('updateProductSchema', () => {
  it('accepts one or more supported fields', () => {
    expect(updateProductSchema.parse({ name: ' Updated name ' })).toEqual({ name: 'Updated name' });
    expect(updateProductSchema.parse({ description: null })).toEqual({ description: null });
  });

  it.each([
    {},
    { sku: 'NEW-SKU' },
    { stock: 10 },
    { isActive: false },
    { unexpected: 'value' },
    { name: 'valid', unexpected: true },
    { name: '' },
    { name: '  ' },
    { price: 100 },
    { price: '-1.00' },
  ])('rejects invalid update payload %o', (payload) => {
    expect(updateProductSchema.safeParse(payload).success).toBe(false);
  });
});
