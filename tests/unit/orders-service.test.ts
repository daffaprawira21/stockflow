import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../lib/generated/prisma/client';
import { listOrders } from '../../modules/orders/service';
import { orderListQuerySchema } from '../../modules/orders/schemas';

const { orderFindMany, orderCount, transaction } = vi.hoisted(() => {
  const orderFindMany = vi.fn();
  const orderCount = vi.fn();
  const transaction = vi.fn();
  transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
  return { orderFindMany, orderCount, transaction };
});

const prisma = {
  order: { findMany: orderFindMany, count: orderCount },
  $transaction: transaction,
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
  orderFindMany.mockResolvedValue([]);
  orderCount.mockResolvedValue(0);
});

describe('listOrders', () => {
  it('filters by status and order number, then applies deterministic ordering', async () => {
    await listOrders(
      prisma,
      orderListQuerySchema.parse({
        page: '2',
        limit: '5',
        status: 'CONFIRMED',
        search: ' ORD-2026 ',
        sortBy: 'orderNumber',
        sortOrder: 'asc',
      }),
    );

    expect(orderFindMany).toHaveBeenCalledWith({
      where: {
        status: 'CONFIRMED',
        orderNumber: { contains: 'ORD-2026', mode: 'insensitive' },
      },
      orderBy: [{ orderNumber: 'asc' }, { id: 'asc' }],
      skip: 5,
      take: 5,
    });
    expect(transaction).toHaveBeenCalledOnce();
  });

  it('uses default newest-first ordering with ID tie-break', async () => {
    await listOrders(prisma, orderListQuerySchema.parse({}));

    expect(orderFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: 0,
      take: 10,
    });
  });

  it('serializes order money as fixed decimal strings', async () => {
    orderFindMany.mockResolvedValue([{
      id: 'order-1',
      orderNumber: 'ORD-2026-000001',
      status: 'PENDING',
      totalAmount: new Prisma.Decimal('100.5'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }]);

    await expect(listOrders(prisma, orderListQuerySchema.parse({}))).resolves.toEqual({
      data: [{
        id: 'order-1',
        orderNumber: 'ORD-2026-000001',
        status: 'PENDING',
        totalAmount: '100.50',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }],
      meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
    });
  });
});
