import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inventoryListQuerySchema } from '../../modules/inventory/schemas';
import { listInventory } from '../../modules/inventory/service';

const { productFindMany, productCount, transaction } = vi.hoisted(() => {
  const productFindMany = vi.fn();
  const productCount = vi.fn();
  const transaction = vi.fn();
  transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
  return { productFindMany, productCount, transaction };
});

const prisma = {
  product: { findMany: productFindMany, count: productCount },
  $transaction: transaction,
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
  productFindMany.mockResolvedValue([]);
  productCount.mockResolvedValue(0);
});

describe('listInventory', () => {
  it('lists every product in SKU order with matching pagination metadata', async () => {
    const inventory = await listInventory(prisma, inventoryListQuerySchema.parse({}));

    expect(productFindMany).toHaveBeenCalledWith({
      where: {}, orderBy: [{ sku: 'asc' }, { id: 'asc' }], skip: 0, take: 10,
      select: { id: true, sku: true, name: true, stock: true, isActive: true },
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(inventory).toEqual({ data: [], meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } });
  });

  it('filters product name or SKU case-insensitively and applies low-stock threshold', async () => {
    await listInventory(prisma, inventoryListQuerySchema.parse({ search: ' mouse ', lowStock: '0' }));

    expect(productFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        stock: { lte: 0 },
        OR: [
          { name: { contains: 'mouse', mode: 'insensitive' } },
          { sku: { contains: 'mouse', mode: 'insensitive' } },
        ],
      },
    }));
  });

  it('maps inventory product fields to the contract DTO', async () => {
    productFindMany.mockResolvedValue([{
      id: 'product-1', sku: 'SKU-1', name: 'Mouse', stock: 3, isActive: false,
    }]);

    const inventory = await listInventory(prisma, inventoryListQuerySchema.parse({ page: '2', limit: '1' }));

    expect(inventory).toEqual({
      data: [{ productId: 'product-1', sku: 'SKU-1', productName: 'Mouse', stock: 3, isActive: false }],
      meta: { page: 2, limit: 1, totalItems: 0, totalPages: 0 },
    });
  });
});
