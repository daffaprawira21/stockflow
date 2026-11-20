import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as shipOrderRoute } from '../../app/api/orders/[id]/ship/route';
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

function shipRequest(orderId: string, options: { token?: string; origin?: string | null } = {}): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (options.origin !== null) headers.set('origin', options.origin ?? ORIGIN);
  if (options.token) headers.set('cookie', `stockflow_session=${encodeURIComponent(options.token)}`);

  return new Request(`${ORIGIN}/api/orders/${orderId}/ship`, { method: 'POST', headers });
}

function shipRoute(request: Request, orderId: string) {
  return shipOrderRoute(request, { params: Promise.resolve({ id: orderId }) });
}

describe('POST /api/orders/:id/ship', () => {
  it('marks a confirmed order as shipped without touching inventory', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { stock: 6 });
    const order = await createTestOrder(db, admin.id, {
      status: 'CONFIRMED',
      items: [{ productId: product.id, quantity: 2, unitPrice: '10.00' }],
    });
    await db.order.update({ where: { id: order.id }, data: { confirmedAt: new Date() } });

    const response = await shipRoute(shipRequest(order.id, { token }), order.id);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ orderId: order.id, status: 'SHIPPED' });
    expect(body.data.shippedAt).toBeTruthy();
    expect(body.meta).toBeNull();

    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe('SHIPPED');
    expect(saved.shippedAt).not.toBeNull();
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ stock: 6 });
    expect(await db.stockMovement.count()).toBe(0);
    expect(await db.orderStatusHistory.findMany({ where: { orderId: order.id } })).toMatchObject([
      { changedBy: admin.id, fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', reason: null },
    ]);
  });

  it('ships a confirmed order even after its products were deactivated', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { stock: 6 });
    const order = await createTestOrder(db, admin.id, {
      status: 'CONFIRMED',
      items: [{ productId: product.id, quantity: 2, unitPrice: '10.00' }],
    });
    await db.product.update({ where: { id: product.id }, data: { isActive: false } });

    const response = await shipRoute(shipRequest(order.id, { token }), order.id);

    expect(response.status).toBe(200);
    expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: 'SHIPPED' });
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({
      isActive: false,
      stock: 6,
    });
    expect(await db.stockMovement.count()).toBe(0);
  });

  it('rejects missing and non-confirmed orders without changing state', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db);
    const pending = await createTestOrder(db, admin.id, {
      status: 'PENDING',
      items: [{ productId: product.id, quantity: 1, unitPrice: '10.00' }],
    });
    const shipped = await createTestOrder(db, admin.id, {
      status: 'SHIPPED',
      items: [{ productId: product.id, quantity: 1, unitPrice: '10.00' }],
    });
    const cancelled = await createTestOrder(db, admin.id, {
      status: 'CANCELLED',
      items: [{ productId: product.id, quantity: 1, unitPrice: '10.00' }],
    });

    const missing = await shipRoute(
      shipRequest('00000000-0000-4000-8000-000000000001', { token }),
      '00000000-0000-4000-8000-000000000001',
    );
    const responses = await Promise.all([
      shipRoute(shipRequest(pending.id, { token }), pending.id),
      shipRoute(shipRequest(shipped.id, { token }), shipped.id),
      shipRoute(shipRequest(cancelled.id, { token }), cancelled.id),
    ]);

    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe('RESOURCE_NOT_FOUND');
    for (const response of responses) {
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe('ORDER_CONFLICT');
    }
    expect(await db.order.findUniqueOrThrow({ where: { id: pending.id } })).toMatchObject({ status: 'PENDING' });
    expect(await db.order.findUniqueOrThrow({ where: { id: cancelled.id } })).toMatchObject({
      status: 'CANCELLED',
    });
    expect(await db.orderStatusHistory.count()).toBe(0);
  });

  it('requires an ADMIN session, allowed origin, and a valid order ID', async () => {
    const { admin, token } = await adminToken();
    const staff = await adminToken('STAFF');
    const order = await createTestOrder(db, admin.id, {
      status: 'CONFIRMED',
      items: [{ productId: (await createTestProduct(db)).id, quantity: 1, unitPrice: '10.00' }],
    });

    const unauthenticated = await shipRoute(shipRequest(order.id), order.id);
    const forbidden = await shipRoute(shipRequest(order.id, { token: staff.token }), order.id);
    const badOrigin = await shipRoute(
      shipRequest(order.id, { token, origin: 'https://evil.example' }),
      order.id,
    );
    const badId = await shipRoute(shipRequest('not-a-uuid', { token }), 'not-a-uuid');

    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(badOrigin.status).toBe(403);
    expect(badId.status).toBe(400);
    expect((await badId.json()).error.code).toBe('VALIDATION_ERROR');
    expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
      status: 'CONFIRMED',
    });
  });

  it('ships only once when two shipments race', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { stock: 6 });
    const order = await createTestOrder(db, admin.id, {
      status: 'CONFIRMED',
      items: [{ productId: product.id, quantity: 2, unitPrice: '10.00' }],
    });

    const [first, second] = await Promise.all([
      shipRoute(shipRequest(order.id, { token }), order.id),
      shipRoute(shipRequest(order.id, { token }), order.id),
    ]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([200, 409]);
    expect(await db.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(1);
    expect(await db.stockMovement.count()).toBe(0);
  });
});
