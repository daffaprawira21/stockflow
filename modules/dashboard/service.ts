import { type PrismaClient } from '../../lib/generated/prisma/client';

export type DashboardClient = Pick<PrismaClient, 'product' | 'order'>;

export type DashboardSummary = {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  cancelledOrders: number;
  totalInventoryUnits: number;
};

export async function getDashboardSummary(prisma: DashboardClient): Promise<DashboardSummary> {
  const [productAggregate, activeProducts, totalProducts, orderGroups, totalOrders] =
    await Promise.all([
      prisma.product.aggregate({
        _sum: { stock: true },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count(),
      prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.order.count(),
    ]);

  const ordersByStatus = new Map(orderGroups.map((row) => [row.status, row._count._all]));

  return {
    totalProducts,
    activeProducts,
    totalOrders,
    totalInventoryUnits: productAggregate._sum.stock ?? 0,
    pendingOrders: ordersByStatus.get('PENDING') ?? 0,
    confirmedOrders: ordersByStatus.get('CONFIRMED') ?? 0,
    shippedOrders: ordersByStatus.get('SHIPPED') ?? 0,
    cancelledOrders: ordersByStatus.get('CANCELLED') ?? 0,
  };
}
