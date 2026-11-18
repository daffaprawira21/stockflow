import { type Prisma, type PrismaClient } from '../../lib/generated/prisma/client';
import { ApiError } from '../../lib/api/errors';
import { paginationMeta } from '../../lib/api/response';
import type { OrderListQuery } from './schemas';
import { serializeOrderDetail, serializeOrderListItem } from './serializer';

type OrderReadClient = Pick<PrismaClient, 'order' | '$transaction'>;

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
