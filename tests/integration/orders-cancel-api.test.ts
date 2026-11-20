import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as cancelOrderRoute } from '../../app/api/orders/[id]/cancel/route';
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

function cancelRequest(
  orderId: string,
  body: string,
  options: { token?: string; origin?: string | null } = {},
): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (options.origin !== null) headers.set('origin', options.origin ?? ORIGIN);
  if (options.token) headers.set('cookie', `stockflow_session=${encodeURIComponent(options.token)}`);

  return new Request(`${ORIGIN}/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers,
    body,
  });
}

function cancelRoute(request: Request, orderId: string) {
  return cancelOrderRoute(request, { params: Promise.resolve({ id: orderId }) });
}

const REASON = JSON.stringify({ reason: 'Customer requested cancellation' });

describe('POST /api/orders/:id/cancel', () => {
  it('cancels a pending order without touching stock and records the reason', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { stock: 10 });
    const order = await createTestOrder(db, admin.id, {
      items: [{ productId: product.id, quantity: 3, unitPrice: '10.00' }],
    });

    const response = await cancelRoute(cancelRequest(order.id, REASON, { token }), order.id);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ orderId: order.id, status: 'CANCELLED' });
    expect(body.data.cancelledAt).toBeTruthy();
    expect(body.meta).toBeNull();

    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe('CANCELLED');
    expect(saved.cancelledAt).not.toBeNull();
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ stock: 10 });
    expect(await db.stockMovement.count()).toBe(0);
    expect(await db.orderStatusHistory.findMany({ where: { orderId: order.id } })).toMatchObject([
      {
        changedBy: admin.id,
        fromStatus: 'PENDING',
        toStatus: 'CANCELLED',
        reason: 'Customer requested cancellation',
      },
    ]);
  });

  it('restores stock exactly once when cancelling a confirmed order', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { stock: 4 });
    const order = await createTestOrder(db, admin.id, {
      status: 'CONFIRMED',
      items: [{ productId: product.id, quantity: 3, unitPrice: '10.00' }],
    });
    await db.order.update({ where: { id: order.id }, data: { confirmedAt: new Date() } });

    const response = await cancelRoute(cancelRequest(order.id, REASON, { token }), order.id);

    expect(response.status).toBe(200);
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ stock: 7 });
    expect(await db.stockMovement.findMany({ where: { orderId: order.id } })).toMatchObject([
      {
        productId: product.id,
        performedBy: admin.id,
        movementType: 'ORDER_CANCELLED',
        quantityDelta: 3,
        quantityBefore: 4,
        quantityAfter: 7,
      },
    ]);
    expect(await db.orderStatusHistory.findMany({ where: { orderId: order.id } })).toMatchObject([
      { fromStatus: 'CONFIRMED', toStatus: 'CANCELLED', reason: 'Customer requested cancellation' },
    ]);
  });

  it('rejects cancelling shipped and already-cancelled orders', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db);
    const shipped = await createTestOrder(db, admin.id, {
      status: 'SHIPPED',
      items: [{ productId: product.id, quantity: 1, unitPrice: '10.00' }],
    });
    const cancelled = await createTestOrder(db, admin.id, {
      status: 'CANCELLED',
      items: [{ productId: product.id, quantity: 1, unitPrice: '10.00' }],
    });

    const shippedResponse = await cancelRoute(cancelRequest(shipped.id, REASON, { token }), shipped.id);
    const cancelledResponse = await cancelRoute(
      cancelRequest(cancelled.id, REASON, { token }),
      cancelled.id,
    );
    const missing = await cancelRoute(
      cancelRequest('00000000-0000-4000-8000-000000000001', REASON, { token }),
      '00000000-0000-4000-8000-000000000001',
    );

    expect(shippedResponse.status).toBe(409);
    expect((await shippedResponse.json()).error.code).toBe('ORDER_CONFLICT');
    expect(cancelledResponse.status).toBe(409);
    expect((await cancelledResponse.json()).error.code).toBe('ORDER_CONFLICT');
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('requires a usable reason, authentication, allowed origin, and valid order ID', async () => {
    const { admin, token } = await adminToken();
    const staff = await adminToken('STAFF');
    const order = await createTestOrder(db, admin.id, {
      items: [{ productId: (await createTestProduct(db)).id, quantity: 1, unitPrice: '10.00' }],
    });

    const emptyReason = await cancelRoute(cancelRequest(order.id, JSON.stringify({ reason: '  ' }), { token }), order.id);
    const missingReason = await cancelRoute(cancelRequest(order.id, JSON.stringify({}), { token }), order.id);
    const malformed = await cancelRoute(cancelRequest(order.id, '{bad json', { token }), order.id);
    const unauthenticated = await cancelRoute(cancelRequest(order.id, REASON), order.id);
    const forbidden = await cancelRoute(cancelRequest(order.id, REASON, { token: staff.token }), order.id);
    const badOrigin = await cancelRoute(
      cancelRequest(order.id, REASON, { token, origin: 'https://evil.example' }),
      order.id,
    );
    const badId = await cancelRoute(cancelRequest('not-a-uuid', REASON, { token }), 'not-a-uuid');

    for (const response of [emptyReason, missingReason, malformed, badId]) {
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    }
    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(badOrigin.status).toBe(403);
  });

  it('rolls back the stock restoration when the movement cannot be written', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { stock: 4 });
    const order = await createTestOrder(db, admin.id, {
      status: 'CONFIRMED',
      items: [{ productId: product.id, quantity: 3, unitPrice: '10.00' }],
    });
    await db.$executeRaw`
      ALTER TABLE stock_movements
      ADD CONSTRAINT fail_order_cancelled CHECK (movement_type <> 'ORDER_CANCELLED')
    `;

    try {
      const response = await cancelRoute(cancelRequest(order.id, REASON, { token }), order.id);

      expect(response.status).toBe(500);
      expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ stock: 4 });
      expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
        status: 'CONFIRMED',
        cancelledAt: null,
      });
      expect(await db.stockMovement.count()).toBe(0);
      expect(await db.orderStatusHistory.count()).toBe(0);
    } finally {
      await db.$executeRaw`ALTER TABLE stock_movements DROP CONSTRAINT fail_order_cancelled`;
    }
  });

  it('restores stock only once when two cancellations race', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { stock: 4 });
    const order = await createTestOrder(db, admin.id, {
      status: 'CONFIRMED',
      items: [{ productId: product.id, quantity: 3, unitPrice: '10.00' }],
    });

    const [first, second] = await Promise.all([
      cancelRoute(cancelRequest(order.id, REASON, { token }), order.id),
      cancelRoute(cancelRequest(order.id, REASON, { token }), order.id),
    ]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([200, 409]);
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ stock: 7 });
    expect(await db.stockMovement.count({ where: { orderId: order.id } })).toBe(1);
    expect(await db.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(1);
  });
});
