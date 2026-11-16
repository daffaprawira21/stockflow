import { describe, expect, it } from 'vitest';
import { Prisma } from '../../lib/generated/prisma/client';
import { listProducts } from '../../modules/products/service';
import { productListQuerySchema } from '../../modules/products/list-query';

const product = {
  id: 'product-id',
  sku: 'PRD-001',
  name: 'Wireless Mouse',
  description: 'Wireless computer mouse',
  price: new Prisma.Decimal('150000.00'),
  stock: 5,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('listProducts', () => {
  it('returns contract fields and pagination metadata', async () => {
    const prisma = {
      product: {
        findMany: async () => [product],
        count: async () => 1,
      },
    } as never;

    await expect(listProducts(prisma, productListQuerySchema.parse({}))).resolves.toEqual({
      data: [{
        id: 'product-id',
        sku: 'PRD-001',
        name: 'Wireless Mouse',
        description: 'Wireless computer mouse',
        price: '150000.00',
        stock: 5,
        isActive: true,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }],
      meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    });
  });
});
