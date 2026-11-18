import type { Prisma } from '../../lib/generated/prisma/client';
import { toMoneyString } from '../../lib/money';

export type OrderListRecord = Pick<
  Prisma.OrderModel,
  'id' | 'orderNumber' | 'status' | 'totalAmount' | 'createdAt'
>;

export function serializeOrderListItem(order: OrderListRecord) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: toMoneyString(order.totalAmount),
    createdAt: order.createdAt,
  };
}

type OrderDetailRecord = Prisma.OrderGetPayload<{
  include: {
    items: true;
    statusHistory: true;
  };
}>;

export function serializeOrderDetail(order: OrderDetailRecord) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: toMoneyString(order.totalAmount),
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: toMoneyString(item.unitPrice),
      subtotal: toMoneyString(item.subtotal),
    })),
    statusHistory: order.statusHistory.map((history) => ({
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      reason: history.reason,
      createdAt: history.createdAt,
    })),
    createdAt: order.createdAt,
  };
}
