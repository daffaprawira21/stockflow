import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '../../lib/generated/prisma/client';
import { ApiError } from '../../lib/api/errors';
import { paginationMeta } from '../../lib/api/response';
import type { CreateOrderInput, OrderListQuery } from './schemas';
import {
  type CreatedOrder,
  serializeCreatedOrder,
  serializeOrderDetail,
  serializeOrderListItem,
} from './serializer';

type OrderReadClient = Pick<PrismaClient, 'order' | '$transaction'>;
type OrderCreateClient = Pick<PrismaClient, '$transaction'>;

export type CreateOrderResult = {
  order: CreatedOrder;
  replayed: boolean;
};

const CREATE_ORDER_OPERATION = 'CREATE_ORDER';

function consolidateItems(items: CreateOrderInput['items']) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  return [...quantities.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

function requestHash(items: CreateOrderInput['items']): string {
  const canonicalItems = consolidateItems(items).sort((left, right) =>
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
  const hash = requestHash(input.items);

  return prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(
        hashtextextended(${`${createdBy}:${CREATE_ORDER_OPERATION}:${idempotencyKey}`}, 0)
      ) AS "locked"
    `;
    if (!lock?.locked) {
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
      return { order: existing.responseBody as unknown as CreatedOrder, replayed: true };
    }

    const items = consolidateItems(input.items);
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
