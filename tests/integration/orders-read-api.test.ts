import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as getOrderRoute } from '../../app/api/orders/[id]/route';
import { GET as listOrdersRoute } from '../../app/api/orders/route';
import prisma from '../../lib/db';
import { createSession } from '../../modules/auth/session';
import { createTestPrismaClient, truncateAll } from '../helpers/db';
import { createTestAdmin, createTestOrder, createTestProduct } from '../helpers/factories';

const db = createTestPrismaClient();
const ORIGIN = 'http://localhost:3000';

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.$disconnect();
  await prisma.$disconnect();
});

async function adminToken(role = 'ADMIN') {
  const admin = await createTestAdmin(db, { role });
  return { admin, token: (await createSession(db, admin.id)).token };
}

function listRequest(query: string, token?: string): Request {
  const headers = new Headers();
  if (token) headers.set('cookie', `stockflow_session=${encodeURIComponent(token)}`);
  return new Request(`${ORIGIN}/api/orders${query}`, { headers });
}

function detailRequest(id: string, token?: string): Request {
  const headers = new Headers();
  if (token) headers.set('cookie', `stockflow_session=${encodeURIComponent(token)}`);
  return new Request(`${ORIGIN}/api/orders/${id}`, { headers });
}

function detailRoute(request: Request) {
  return getOrderRoute(request, {
    params: Promise.resolve({ id: request.url.split('/').pop() ?? '' }),
  });
}

describe('Order read APIs', () => {
  it('creates the global order number sequence with a starting value of one', async () => {
    const [result] = await db.$queryRaw<{ startValue: string; value: string }[]>`
      SELECT
        seqstart::text AS "startValue",
        nextval('order_number_sequence')::text AS "value"
      FROM pg_sequence
      WHERE seqrelid = 'order_number_sequence'::regclass
    `;

    expect(result.startValue).toBe('1');
    expect(Number(result.value)).toBeGreaterThanOrEqual(1);
  });

  it('lists orders by default newest first with stable pagination', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db);
    const first = await createTestOrder(db, admin.id, {
      orderNumber: 'ORD-2026-000001',
      items: [{ productId: product.id, quantity: 1, unitPrice: '100.00' }],
    });
    const second = await createTestOrder(db, admin.id, {
      orderNumber: 'ORD-2026-000002',
      status: 'CONFIRMED',
      items: [{ productId: product.id, quantity: 2, unitPrice: '100.00' }],
    });
    await db.order.update({ where: { id: first.id }, data: { createdAt: new Date('2026-01-01T00:00:00.000Z') } });
    await db.order.update({ where: { id: second.id }, data: { createdAt: new Date('2026-01-02T00:00:00.000Z') } });

    const response = await listOrdersRoute(listRequest('?limit=1', token));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: [{
        id: second.id,
        orderNumber: 'ORD-2026-000002',
        status: 'CONFIRMED',
        totalAmount: '200.00',
        createdAt: '2026-01-02T00:00:00.000Z',
      }],
      meta: { page: 1, limit: 1, totalItems: 2, totalPages: 2 },
    });
  });

  it('uses ID ascending as a stable tie-break for orders created at the same time', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db);
    const first = await createTestOrder(db, admin.id, {
      orderNumber: 'ORD-2026-000001',
      items: [{ productId: product.id, quantity: 1, unitPrice: '100.00' }],
    });
    const second = await createTestOrder(db, admin.id, {
      orderNumber: 'ORD-2026-000002',
      items: [{ productId: product.id, quantity: 1, unitPrice: '100.00' }],
    });
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    await db.order.update({ where: { id: first.id }, data: { createdAt } });
    await db.order.update({ where: { id: second.id }, data: { createdAt } });

    const response = await listOrdersRoute(listRequest('', token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((order: { id: string }) => order.id)).toEqual(
      [first.id, second.id].sort(),
    );
  });

  it('filters orders by case-insensitive order number search and status', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db);
    await createTestOrder(db, admin.id, {
      orderNumber: 'ORD-2026-000001',
      status: 'PENDING',
      items: [{ productId: product.id, quantity: 1, unitPrice: '100.00' }],
    });
    await createTestOrder(db, admin.id, {
      orderNumber: 'ORD-2026-000002',
      status: 'SHIPPED',
      items: [{ productId: product.id, quantity: 1, unitPrice: '100.00' }],
    });

    const response = await listOrdersRoute(listRequest('?search=000002&status=SHIPPED', token));

    expect((await response.json()).data.map((order: { orderNumber: string }) => order.orderNumber)).toEqual([
      'ORD-2026-000002',
    ]);
  });

  it('returns order detail with stored price snapshots and chronological status history', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { price: '999.99' });
    const order = await createTestOrder(db, admin.id, {
      orderNumber: 'ORD-2026-000001',
      items: [{ productId: product.id, quantity: 2, unitPrice: '100.00' }],
    });
    const pending = await db.orderStatusHistory.create({
      data: { orderId: order.id, changedBy: admin.id, fromStatus: null, toStatus: 'PENDING' },
    });
    const confirmed = await db.orderStatusHistory.create({
      data: { orderId: order.id, changedBy: admin.id, fromStatus: 'PENDING', toStatus: 'CONFIRMED' },
    });
    await db.orderStatusHistory.update({
      where: { id: pending.id },
      data: { createdAt: new Date('2026-01-01T08:00:00.000Z') },
    });
    const shipped = await db.orderStatusHistory.create({
      data: { orderId: order.id, changedBy: admin.id, fromStatus: 'CONFIRMED', toStatus: 'SHIPPED' },
    });
    const tiedCreatedAt = new Date('2026-01-01T10:00:00.000Z');
    await db.orderStatusHistory.update({ where: { id: confirmed.id }, data: { createdAt: tiedCreatedAt } });
    await db.orderStatusHistory.update({ where: { id: shipped.id }, data: { createdAt: tiedCreatedAt } });
    await db.product.update({ where: { id: product.id }, data: { price: '500.00' } });

    const response = await detailRoute(detailRequest(order.id, token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toEqual([
      {
        productId: product.id,
        quantity: 2,
        unitPrice: '100.00',
        subtotal: '200.00',
        productLabel: `${product.sku} — ${product.name}`,
      },
    ]);
    expect(body.data.statusHistory).toEqual([
      { fromStatus: null, toStatus: 'PENDING', reason: null, createdAt: '2026-01-01T08:00:00.000Z' },
      ...[
        { id: confirmed.id, fromStatus: 'PENDING', toStatus: 'CONFIRMED', reason: null },
        { id: shipped.id, fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', reason: null },
      ].sort((left, right) => left.id.localeCompare(right.id)).map((history) => ({
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        reason: history.reason,
        createdAt: '2026-01-01T10:00:00.000Z',
      })),
    ]);
  });

  it.each(['?status=UNKNOWN', '?sortBy=status', '?page=0'])('rejects invalid list query %s', async (query) => {
    const { token } = await adminToken();
    const response = await listOrdersRoute(listRequest(query, token));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for invalid order ID and not found for absent order', async () => {
    const { token } = await adminToken();

    expect((await detailRoute(detailRequest('not-a-uuid', token))).status).toBe(400);
    expect((await detailRoute(detailRequest('00000000-0000-4000-8000-000000000001', token))).status).toBe(404);
  });

  it('requires an ADMIN session', async () => {
    expect((await listOrdersRoute(listRequest(''))).status).toBe(401);
    const { token } = await adminToken('STAFF');
    expect((await listOrdersRoute(listRequest('', token))).status).toBe(403);
  });
});
