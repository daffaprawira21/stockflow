import { describe, expect, it } from 'vitest';
import { getDashboardSummary } from '../../modules/dashboard/service';

describe('getDashboardSummary', () => {
  it('returns the contract §9.1 shape with zero counts when the database is empty', async () => {
    const prisma = {
      product: {
        aggregate: async () => ({ _sum: { stock: null } }),
        count: async () => 0,
      },
      order: {
        groupBy: async () => [],
        count: async () => 0,
      },
    } as never;

    await expect(getDashboardSummary(prisma)).resolves.toEqual({
      totalProducts: 0,
      activeProducts: 0,
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      shippedOrders: 0,
      cancelledOrders: 0,
      totalInventoryUnits: 0,
    });
  });

  it('returns product and per-status order counts from the mocked delegates', async () => {
    const prisma = {
      product: {
        aggregate: async () => ({ _sum: { stock: 1500 } }),
        count: async (args?: { where?: { isActive?: boolean } }) =>
          args?.where?.isActive ? 110 : 120,
      },
      order: {
        groupBy: async () => [
          { status: 'PENDING', _count: { _all: 15 } },
          { status: 'CONFIRMED', _count: { _all: 20 } },
          { status: 'SHIPPED', _count: { _all: 200 } },
          { status: 'CANCELLED', _count: { _all: 15 } },
        ],
        count: async () => 250,
      },
    } as never;

    await expect(getDashboardSummary(prisma)).resolves.toEqual({
      totalProducts: 120,
      activeProducts: 110,
      totalOrders: 250,
      pendingOrders: 15,
      confirmedOrders: 20,
      shippedOrders: 200,
      cancelledOrders: 15,
      totalInventoryUnits: 1500,
    });
  });

  it('returns zero for statuses absent from the groupBy result', async () => {
    const prisma = {
      product: {
        aggregate: async () => ({ _sum: { stock: 40 } }),
        count: async (args?: { where?: { isActive?: boolean } }) =>
          args?.where?.isActive ? 2 : 3,
      },
      order: {
        groupBy: async () => [{ status: 'PENDING', _count: { _all: 1 } }],
        count: async () => 1,
      },
    } as never;

    await expect(getDashboardSummary(prisma)).resolves.toEqual({
      totalProducts: 3,
      activeProducts: 2,
      totalOrders: 1,
      pendingOrders: 1,
      confirmedOrders: 0,
      shippedOrders: 0,
      cancelledOrders: 0,
      totalInventoryUnits: 40,
    });
  });

  it('treats a null stock sum as zero units', async () => {
    const prisma = {
      product: {
        aggregate: async () => ({ _sum: { stock: null } }),
        count: async (args?: { where?: { isActive?: boolean } }) =>
          args?.where?.isActive ? 2 : 2,
      },
      order: {
        groupBy: async () => [],
        count: async () => 0,
      },
    } as never;

    const summary = await getDashboardSummary(prisma);

    expect(summary.totalInventoryUnits).toBe(0);
  });
});
