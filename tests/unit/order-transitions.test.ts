import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelOrder } from '../../modules/orders/service';
import {
  serializeCancelledOrder,
  serializeConfirmedOrder,
  serializeShippedOrder,
} from '../../modules/orders/serializer';

const { transaction, queryRaw, orderUpdate, historyCreate, orderItemFindMany } = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  orderUpdate: vi.fn(),
  historyCreate: vi.fn(),
  orderItemFindMany: vi.fn(),
}));

const tx = {
  $queryRaw: queryRaw,
  order: { update: orderUpdate },
  orderStatusHistory: { create: historyCreate },
  orderItem: { findMany: orderItemFindMany },
};

const prisma = { $transaction: transaction } as never;

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
  historyCreate.mockResolvedValue({});
  orderItemFindMany.mockResolvedValue([]);
});

describe('order transition guards', () => {
  it.each(['SHIPPED', 'CANCELLED'] as const)(
    'rejects cancellation from %s with ORDER_CONFLICT',
    async (status) => {
      queryRaw.mockResolvedValue([{ status }]);

      await expect(cancelOrder(prisma, 'admin-1', 'order-1', 'reason')).rejects.toMatchObject({
        code: 'ORDER_CONFLICT',
      });
      expect(orderUpdate).not.toHaveBeenCalled();
      expect(historyCreate).not.toHaveBeenCalled();
    },
  );

  it('rejects an unknown status with ORDER_CONFLICT rather than transitioning', async () => {
    queryRaw.mockResolvedValue([{ status: 'UNKNOWN' }]);

    await expect(cancelOrder(prisma, 'admin-1', 'order-1', 'reason')).rejects.toMatchObject({
      code: 'ORDER_CONFLICT',
    });
  });

  it('rejects a missing order with RESOURCE_NOT_FOUND', async () => {
    queryRaw.mockResolvedValue([]);

    await expect(cancelOrder(prisma, 'admin-1', 'order-1', 'reason')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });
});

describe('order transition serializers', () => {
  const at = new Date('2026-01-02T03:04:05.000Z');

  it('serializes confirmed, cancelled, and shipped payloads with ISO timestamps', () => {
    expect(serializeConfirmedOrder({ id: 'order-1', status: 'CONFIRMED', confirmedAt: at })).toEqual({
      orderId: 'order-1',
      status: 'CONFIRMED',
      confirmedAt: '2026-01-02T03:04:05.000Z',
    });
    expect(serializeCancelledOrder({ id: 'order-1', status: 'CANCELLED', cancelledAt: at })).toEqual({
      orderId: 'order-1',
      status: 'CANCELLED',
      cancelledAt: '2026-01-02T03:04:05.000Z',
    });
    expect(serializeShippedOrder({ id: 'order-1', status: 'SHIPPED', shippedAt: at })).toEqual({
      orderId: 'order-1',
      status: 'SHIPPED',
      shippedAt: '2026-01-02T03:04:05.000Z',
    });
  });
});
