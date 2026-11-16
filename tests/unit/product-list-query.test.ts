import { describe, expect, it } from 'vitest';
import { productListQuerySchema } from '../../modules/products/list-query';

describe('productListQuerySchema', () => {
  it('applies default pagination and ordering', () => {
    expect(productListQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      search: undefined,
      isActive: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('parses allowed query values and ignores unknown parameters', () => {
    expect(
      productListQuerySchema.parse({
        page: '2',
        limit: '25',
        search: ' mouse ',
        isActive: 'false',
        sortBy: 'price',
        sortOrder: 'asc',
        ignored: 'value',
      }),
    ).toEqual({
      page: 2,
      limit: 25,
      search: ' mouse ',
      isActive: false,
      sortBy: 'price',
      sortOrder: 'asc',
    });
  });

  it.each([
    { page: '0' },
    { page: '1.5' },
    { page: 'abc' },
    { limit: '0' },
    { limit: '101' },
    { limit: '3.2' },
    { sortBy: 'id' },
    { sortOrder: 'up' },
    { isActive: 'yes' },
  ])('rejects invalid query values: %o', (query) => {
    expect(productListQuerySchema.safeParse(query).success).toBe(false);
  });
});
