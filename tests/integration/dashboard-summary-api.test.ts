import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as getDashboardSummary } from '../../app/api/dashboard/summary/route';
import { createSession } from '../../modules/auth/session';
import prisma from '../../lib/db';
import { createTestPrismaClient, truncateAll } from '../helpers/db';
import { createTestAdmin, createTestProduct, createTestOrder } from '../helpers/factories';

const db = createTestPrismaClient();
const ORIGIN = 'http://localhost:3000';

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.$disconnect();
  await prisma.$disconnect();
});

function request(options: { token?: string } = {}): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (options.token) headers.set('cookie', `stockflow_session=${encodeURIComponent(options.token)}`);

  return new Request(`${ORIGIN}/api/dashboard/summary`, { method: 'GET', headers });
}

async function createAdmin() {
  const admin = await createTestAdmin(db);
  const session = await createSession(db, admin.id);
  return { admin, token: session.token };
}

describe('GET /api/dashboard/summary', () => {
  it('returns 401 without an authenticated session', async () => {
    const response = await getDashboardSummary(request());

    expect(response.status).toBe(401);
    const body = await response.json();

    expect(body).toMatchObject({ success: false, error: { code: 'UNAUTHENTICATED' } });
  });

  it('returns zeroed summaries when no data has been seeded', async () => {
    const { token } = await createAdmin();
    const response = await getDashboardSummary(request({ token }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        totalProducts: 0,
        activeProducts: 0,
        totalOrders: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        shippedOrders: 0,
        cancelledOrders: 0,
        totalInventoryUnits: 0,
      },
      meta: null,
    });
  });

  it('reflects product, order, and stock counts from seeded data', async () => {
    const { admin, token } = await createAdmin();

    await createTestProduct(db, { sku: 'PRD-ACT-1', stock: 10, isActive: true });
    await createTestProduct(db, { sku: 'PRD-ACT-2', stock: 20, isActive: true });
    await createTestProduct(db, { sku: 'PRD-IN-1', stock: 5, isActive: false });

    const products = await db.product.findMany();
    const pending = await createTestOrder(db, admin.id, {
      status: 'PENDING',
      items: [{ productId: products[0].id, quantity: 1, unitPrice: '100.00' }],
    });
    void pending;
    const shipped = await createTestOrder(db, admin.id, {
      status: 'SHIPPED',
      items: [{ productId: products[1].id, quantity: 1, unitPrice: '100.00' }],
    });
    void shipped;

    const response = await getDashboardSummary(request({ token }));
    const body = await response.json();

    expect(body).toMatchObject({
      success: true,
      data: {
        totalProducts: 3,
        activeProducts: 2,
        totalOrders: 2,
        pendingOrders: 1,
        confirmedOrders: 0,
        shippedOrders: 1,
        cancelledOrders: 0,
        totalInventoryUnits: 35,
      },
    });
  });
});
