import type { Prisma } from '../../lib/generated/prisma/client';
import { toMoneyString } from '../../lib/money';
import type { OrderStatus } from './schemas';

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
    items: {
      include: {
        product: {
          select: { sku: true; name: true };
        };
      };
    };
    statusHistory: true;
  };
}>;

export type CreatedOrder = {
  id: string;
  orderNumber: string;
  status: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }[];
  totalAmount: string;
};

export type CreatedOrderRecord = Prisma.OrderGetPayload<{
  include: { items: true };
}>;

export function serializeCreatedOrder(order: CreatedOrderRecord): CreatedOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: toMoneyString(item.unitPrice),
      subtotal: toMoneyString(item.subtotal),
    })),
    totalAmount: toMoneyString(order.totalAmount),
  };
}

export type ConfirmedOrder = {
  orderId: string;
  status: OrderStatus;
  confirmedAt: string;
};

export function serializeConfirmedOrder(order: {
  id: string;
  status: OrderStatus;
  confirmedAt: Date;
}): ConfirmedOrder {
  return {
    orderId: order.id,
    status: order.status,
    confirmedAt: order.confirmedAt.toISOString(),
  };
}

export type CancelledOrder = {
  orderId: string;
  status: OrderStatus;
  cancelledAt: string;
};

export function serializeCancelledOrder(order: {
  id: string;
  status: OrderStatus;
  cancelledAt: Date;
}): CancelledOrder {
  return {
    orderId: order.id,
    status: order.status,
    cancelledAt: order.cancelledAt.toISOString(),
  };
}

export type ShippedOrder = {
  orderId: string;
  status: OrderStatus;
  shippedAt: string;
};

export function serializeShippedOrder(order: {
  id: string;
  status: OrderStatus;
  shippedAt: Date;
}): ShippedOrder {
  return {
    orderId: order.id,
    status: order.status,
    shippedAt: order.shippedAt.toISOString(),
  };
}

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
      // Product names enriched in the same query as the order detail, so the
      // page no longer fires a per-item product fetch.
      productLabel: item.product ? `${item.product.sku} — ${item.product.name}` : undefined,
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
