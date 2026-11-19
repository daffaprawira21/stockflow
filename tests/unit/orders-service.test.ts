import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../lib/generated/prisma/client';
import { createOrder, listOrders } from '../../modules/orders/service';
import { createOrderSchema, orderListQuerySchema } from '../../modules/orders/schemas';

const {
  orderFindMany,
  orderCount,
  transaction,
  transactionQueryRaw,
  productFindMany,
  orderCreate,
  idempotencyFindUnique,
  idempotencyCreate,
} = vi.hoisted(() => {
  const orderFindMany = vi.fn();
  const orderCount = vi.fn();
  const transaction = vi.fn();
  const transactionQueryRaw = vi.fn();
  const productFindMany = vi.fn();
  const orderCreate = vi.fn();
  const idempotencyFindUnique = vi.fn();
  const idempotencyCreate = vi.fn();
  transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
  return {
    orderFindMany,
    orderCount,
    transaction,
    transactionQueryRaw,
    productFindMany,
    orderCreate,
    idempotencyFindUnique,
    idempotencyCreate,
  };
});

const prisma = {
  order: { findMany: orderFindMany, count: orderCount },
  $transaction: transaction,
} as never;

const createPrisma = {
  $transaction: transaction,
} as never;

const transactionClient = {
  $queryRaw: transactionQueryRaw,
  product: { findMany: productFindMany },
  order: { create: orderCreate },
  idempotencyRecord: { findUnique: idempotencyFindUnique, create: idempotencyCreate },
};

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation((operation: Promise<unknown>[] | ((tx: typeof transactionClient) => Promise<unknown>)) => (
    typeof operation === 'function' ? operation(transactionClient) : Promise.all(operation)
  ));
  orderFindMany.mockResolvedValue([]);
  orderCount.mockResolvedValue(0);
  transactionQueryRaw
    .mockResolvedValueOnce([{ locked: true }])
    .mockResolvedValueOnce([{ value: 1n }]);
  idempotencyFindUnique.mockResolvedValue(null);
  idempotencyCreate.mockResolvedValue({});
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

describe('createOrder', () => {
  it('consolidates duplicate items and creates snapshots plus initial history', async () => {
    const productId = '00000000-0000-4000-8000-000000000001';
    productFindMany.mockResolvedValue([{ id: productId, price: new Prisma.Decimal('12.50'), isActive: true }]);
    orderCreate.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-2026-000001',
      status: 'PENDING',
      totalAmount: new Prisma.Decimal('37.50'),
      items: [{ productId, quantity: 3, unitPrice: new Prisma.Decimal('12.50'), subtotal: new Prisma.Decimal('37.50') }],
    });

    await expect(createOrder(
      createPrisma,
      '00000000-0000-4000-8000-000000000010',
      'order-key',
      createOrderSchema.parse({ items: [{ productId, quantity: 1 }, { productId, quantity: 2 }] }),
    )).resolves.toEqual({
      replayed: false,
      order: {
        id: 'order-1', orderNumber: 'ORD-2026-000001', status: 'PENDING',
        items: [{ productId, quantity: 3, unitPrice: '12.50', subtotal: '37.50' }],
        totalAmount: '37.50',
      },
    });

    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'PENDING',
        items: { create: [{ productId, quantity: 3, unitPrice: new Prisma.Decimal('12.50'), subtotal: new Prisma.Decimal('37.50') }] },
        statusHistory: { create: { changedBy: '00000000-0000-4000-8000-000000000010', fromStatus: null, toStatus: 'PENDING' } },
      }),
    }));
    expect(idempotencyCreate).toHaveBeenCalledOnce();
  });
});
