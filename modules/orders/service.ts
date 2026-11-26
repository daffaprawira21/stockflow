import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '../../lib/generated/prisma/client';
import { ApiError } from '../../lib/api/errors';
import { paginationMeta } from '../../lib/api/response';
import { consolidateStockItems } from '../inventory/consolidate';
import { deductStockForOrder, restoreStockForOrder } from '../inventory/service';
import type { CreateOrderInput, OrderListQuery } from './schemas';
import {
  type CancelledOrder,
  type ConfirmedOrder,
  type CreatedOrder,
  type ShippedOrder,
  serializeCancelledOrder,
  serializeConfirmedOrder,
  serializeCreatedOrder,
  serializeOrderDetail,
  serializeOrderListItem,
  serializeShippedOrder,
} from './serializer';
import type { OrderStatus } from './schemas';

type OrderReadClient = Pick<PrismaClient, 'order' | '$transaction'>;
type OrderCreateClient = Pick<PrismaClient, '$transaction'>;
type OrderTransactionClient = Pick<PrismaClient, '$transaction'>;

export type CreateOrderResult = {
  order: CreatedOrder;
  replayed: boolean;
};

const CREATE_ORDER_OPERATION = 'CREATE_ORDER';

function requestHash(items: ReturnType<typeof consolidateStockItems>): string {
  const canonicalItems = [...items].sort((left, right) =>
    left.productId.localeCompare(right.productId),
  );
  return createHash('sha256').update(JSON.stringify(canonicalItems)).digest('hex');
}

function orderNumber(sequenceValue: bigint, createdAt: Date): string {
  return `ORD-${createdAt.getUTCFullYear()}-${sequenceValue.toString().padStart(6, '0')}`;
}

export async function listOrders(prisma: OrderReadClient, query: OrderListQuery) {
  const where: Prisma.OrderWhereInput = {
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.search
      ? { orderNumber: { contains: query.search, mode: 'insensitive' } }
      : {}),
  };
  const skip = (query.page - 1) * query.limit;
  const orderBy: Prisma.OrderOrderByWithRelationInput[] = [
    { [query.sortBy]: query.sortOrder },
    { id: 'asc' },
  ];

  const [orders, totalItems] = await prisma.$transaction([
    prisma.order.findMany({ where, orderBy, skip, take: query.limit }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders.map(serializeOrderListItem),
    meta: paginationMeta(query.page, query.limit, totalItems),
  };
}

export async function createOrder(
  prisma: OrderCreateClient,
  createdBy: string,
  idempotencyKey: string,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const items = consolidateStockItems(input.items);
  const hash = requestHash(items);

  return prisma.$transaction(async (tx) => {
    const idempotencyScope = `${createdBy}:${CREATE_ORDER_OPERATION}:${idempotencyKey}`;
    const [locks] = await tx.$queryRaw<{
      scopeLocked: boolean;
      payloadLocked: boolean;
    }[]>`
      SELECT
        pg_try_advisory_xact_lock(hashtextextended(${idempotencyScope}, 0)) AS "scopeLocked",
        pg_try_advisory_xact_lock(hashtextextended(${`${idempotencyScope}:${hash}`}, 0)) AS "payloadLocked"
    `;
    if (!locks?.scopeLocked) {
      throw new ApiError(
        locks?.payloadLocked ? 'IDEMPOTENCY_CONFLICT' : 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
      );
    }
    if (!locks.payloadLocked) {
      throw new ApiError('IDEMPOTENCY_REQUEST_IN_PROGRESS');
    }

    const existing = await tx.idempotencyRecord.findUnique({
      where: {
        userId_operation_idempotencyKey: {
          userId: createdBy,
          operation: CREATE_ORDER_OPERATION,
          idempotencyKey,
        },
      },
      include: { order: { include: { items: { orderBy: { id: 'asc' } } } } },
    });
    if (existing) {
      if (existing.requestHash !== hash) {
        throw new ApiError('IDEMPOTENCY_CONFLICT');
      }
      return { order: serializeCreatedOrder(existing.order), replayed: true };
    }

    const products = await tx.product.findMany({
      where: { id: { in: items.map((item) => item.productId) } },
      select: { id: true, price: true, isActive: true },
    });
    if (products.length !== items.length) {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }
    if (products.some((product) => !product.isActive)) {
      throw new ApiError('PRODUCT_INACTIVE');
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const orderItems = items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new ApiError('RESOURCE_NOT_FOUND');
      }
      const unitPrice = product.price;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice.mul(item.quantity),
      };
    });
    const totalAmount = orderItems.reduce(
      (total, item) => total.plus(item.subtotal),
      new Prisma.Decimal(0),
    );
    const [sequence] = await tx.$queryRaw<{ value: bigint }[]>`
      SELECT nextval('order_number_sequence') AS "value"
    `;
    const createdAt = new Date();
    const order = await tx.order.create({
      data: {
        orderNumber: orderNumber(sequence.value, createdAt),
        status: 'PENDING',
        totalAmount,
        createdBy,
        createdAt,
        items: { create: orderItems },
        statusHistory: {
          create: { changedBy: createdBy, fromStatus: null, toStatus: 'PENDING' },
        },
      },
      include: { items: { orderBy: { id: 'asc' } } },
    });
    const serialized = serializeCreatedOrder(order);
    await tx.idempotencyRecord.create({
      data: {
        userId: createdBy,
        operation: CREATE_ORDER_OPERATION,
        idempotencyKey,
        requestHash: hash,
        resourceId: order.id,
        responseBody: serialized as Prisma.InputJsonValue,
      },
    });

    return { order: serialized, replayed: false };
  });
}

type OrderTransitionTransaction = Pick<
  Prisma.TransactionClient,
  'order' | 'orderItem' | 'orderStatusHistory' | '$queryRaw'
>;

async function lockOrderForTransition(
  tx: OrderTransitionTransaction,
  orderId: string,
): Promise<OrderStatus> {
  const [order] = await tx.$queryRaw<{ status: OrderStatus }[]>`
    SELECT status
    FROM orders
    WHERE id = ${orderId}::uuid
    FOR UPDATE
  `;
  if (!order) {
    throw new ApiError('RESOURCE_NOT_FOUND');
  }
  return order.status;
}

async function recordOrderTransition(
  tx: OrderTransitionTransaction,
  transition: {
    orderId: string;
    performedBy: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    reason?: string;
  },
): Promise<void> {
  await tx.orderStatusHistory.create({
    data: {
      orderId: transition.orderId,
      changedBy: transition.performedBy,
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
      reason: transition.reason,
    },
  });
}

export async function confirmOrder(
  prisma: OrderTransactionClient,
  performedBy: string,
  orderId: string,
): Promise<ConfirmedOrder> {
  return prisma.$transaction(async (tx) => {
    const status = await lockOrderForTransition(tx, orderId);
    if (status !== 'PENDING') {
      throw new ApiError('ORDER_CONFLICT');
    }

    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { productId: true, quantity: true },
      orderBy: { productId: 'asc' },
    });
    if (items.length === 0) {
      throw new ApiError('ORDER_CONFLICT');
    }

    await deductStockForOrder(tx, { orderId, performedBy, items });

    const confirmedAt = new Date();
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED', confirmedAt },
      select: { status: true, confirmedAt: true },
    });
    if (!updated.confirmedAt) {
      throw new Error('Confirmed order is missing its confirmation timestamp');
    }
    await recordOrderTransition(tx, {
      orderId,
      performedBy,
      fromStatus: status,
      toStatus: 'CONFIRMED',
    });

    return serializeConfirmedOrder({
      id: orderId,
      status: updated.status as OrderStatus,
      confirmedAt: updated.confirmedAt,
    });
  });
}

export async function cancelOrder(
  prisma: OrderTransactionClient,
  performedBy: string,
  orderId: string,
  reason: string,
): Promise<CancelledOrder> {
  return prisma.$transaction(async (tx) => {
    const status = await lockOrderForTransition(tx, orderId);
    if (status !== 'PENDING' && status !== 'CONFIRMED') {
      throw new ApiError('ORDER_CONFLICT');
    }

    if (status === 'CONFIRMED') {
      const items = await tx.orderItem.findMany({
        where: { orderId },
        select: { productId: true, quantity: true },
      });
      if (items.length === 0) {
        throw new ApiError('ORDER_CONFLICT');
      }
      await restoreStockForOrder(tx, { orderId, performedBy, items });
    }

    const cancelledAt = new Date();
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', cancelledAt },
      select: { status: true, cancelledAt: true },
    });
    if (!updated.cancelledAt) {
      throw new Error('Cancelled order is missing its cancellation timestamp');
    }
    await recordOrderTransition(tx, {
      orderId,
      performedBy,
      fromStatus: status,
      toStatus: 'CANCELLED',
      reason,
    });

    return serializeCancelledOrder({
      id: orderId,
      status: updated.status as OrderStatus,
      cancelledAt: updated.cancelledAt,
    });
  });
}

export async function shipOrder(
  prisma: OrderTransactionClient,
  performedBy: string,
  orderId: string,
): Promise<ShippedOrder> {
  return prisma.$transaction(async (tx) => {
    const status = await lockOrderForTransition(tx, orderId);
    if (status !== 'CONFIRMED') {
      throw new ApiError('ORDER_CONFLICT');
    }

    const shippedAt = new Date();
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'SHIPPED', shippedAt },
      select: { status: true, shippedAt: true },
    });
    if (!updated.shippedAt) {
      throw new Error('Shipped order is missing its shipment timestamp');
    }
    await recordOrderTransition(tx, {
      orderId,
      performedBy,
      fromStatus: status,
      toStatus: 'SHIPPED',
    });

    return serializeShippedOrder({
      id: orderId,
      status: updated.status as OrderStatus,
      shippedAt: updated.shippedAt,
    });
  });
}

export async function getOrderById(prisma: OrderReadClient, id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: 'asc' } },
      statusHistory: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
    },
  });

  if (!order) {
    throw new ApiError('RESOURCE_NOT_FOUND');
  }

  return serializeOrderDetail(order);
}
