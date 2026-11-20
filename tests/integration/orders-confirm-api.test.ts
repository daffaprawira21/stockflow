import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as confirmOrderRoute } from '../../app/api/orders/[id]/confirm/route';
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

function confirmRequest(
  orderId: string,
  options: { token?: string; origin?: string | null } = {},
): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (options.origin !== null) headers.set('origin', options.origin ?? ORIGIN);
  if (options.token) headers.set('cookie', `stockflow_session=${encodeURIComponent(options.token)}`);

  return new Request(`${ORIGIN}/api/orders/${orderId}/confirm`, { method: 'POST', headers });
}

function confirmRoute(request: Request, orderId: string) {
  return confirmOrderRoute(request, { params: Promise.resolve({ id: orderId }) });
}

describe('POST /api/orders/:id/confirm', () => {
  it('deducts stock, records movements and history, and confirms the order atomically', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { price: '50.00', stock: 10 });
    const order = await createTestOrder(db, admin.id, {
      orderNumber: 'ORD-2026-000001',
      items: [{ productId: product.id, quantity: 3, unitPrice: '50.00' }],
    });

    const response = await confirmRoute(confirmRequest(order.id, { token }), order.id);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ orderId: order.id, status: 'CONFIRMED' });
    expect(body.data.confirmedAt).toBeTruthy();
    expect(body.meta).toBeNull();

    const savedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(savedOrder.status).toBe('CONFIRMED');
    expect(savedOrder.confirmedAt).not.toBeNull();
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ stock: 7 });
    expect(await db.stockMovement.findMany({ where: { orderId: order.id } })).toMatchObject([
      {
        productId: product.id,
        performedBy: admin.id,
        movementType: 'ORDER_CONFIRMED',
        quantityDelta: -3,
        quantityBefore: 10,
        quantityAfter: 7,
      },
    ]);
    expect(await db.orderStatusHistory.findMany({ where: { orderId: order.id } })).toMatchObject([
      { changedBy: admin.id, fromStatus: 'PENDING', toStatus: 'CONFIRMED' },
    ]);
  });

  it('rejects missing, already-confirmed, inactive-product, and insufficient-stock orders without partial changes', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { stock: 5 });
    const inactive = await createTestProduct(db, { stock: 5, isActive: false });
    const pending = await createTestOrder(db, admin.id, {
      items: [{ productId: product.id, quantity: 2, unitPrice: '10.00' }],
    });
    const confirmed = await createTestOrder(db, admin.id, {
      status: 'CONFIRMED',
      items: [{ productId: product.id, quantity: 1, unitPrice: '10.00' }],
    });
    const inactiveOrder = await createTestOrder(db, admin.id, {
      items: [{ productId: inactive.id, quantity: 1, unitPrice: '10.00' }],
    });
    const shortOrder = await createTestOrder(db, admin.id, {
      items: [{ productId: product.id, quantity: 99, unitPrice: '10.00' }],
    });

    const missing = await confirmRoute(
      confirmRequest('00000000-0000-4000-8000-000000000001', { token }),
      '00000000-0000-4000-8000-000000000001',
    );
    const conflict = await confirmRoute(confirmRequest(confirmed.id, { token }), confirmed.id);
    const inactiveResponse = await confirmRoute(
      confirmRequest(inactiveOrder.id, { token }),
      inactiveOrder.id,
    );
    const insufficient = await confirmRoute(confirmRequest(shortOrder.id, { token }), shortOrder.id);

    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe('RESOURCE_NOT_FOUND');
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error.code).toBe('ORDER_CONFLICT');
    expect(inactiveResponse.status).toBe(422);
    expect((await inactiveResponse.json()).error.code).toBe('PRODUCT_INACTIVE');
    expect(insufficient.status).toBe(422);
    expect((await insufficient.json()).error.code).toBe('INSUFFICIENT_STOCK');

    expect(await db.stockMovement.count()).toBe(0);
    expect(await db.orderStatusHistory.count()).toBe(0);
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ stock: 5 });
    expect(await db.order.findUniqueOrThrow({ where: { id: shortOrder.id } })).toMatchObject({
      status: 'PENDING',
      confirmedAt: null,
    });
    expect(await db.order.findUniqueOrThrow({ where: { id: pending.id } })).toMatchObject({
      status: 'PENDING',
    });
  });

  it('rolls back every product when one item has insufficient stock', async () => {
    const { admin, token } = await adminToken();
    const stocked = await createTestProduct(db, { stock: 100 });
    const scarce = await createTestProduct(db, { stock: 1 });
    const order = await createTestOrder(db, admin.id, {
      items: [
        { productId: stocked.id, quantity: 5, unitPrice: '10.00' },
        { productId: scarce.id, quantity: 5, unitPrice: '10.00' },
      ],
    });

    const response = await confirmRoute(confirmRequest(order.id, { token }), order.id);

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe('INSUFFICIENT_STOCK');
    expect(await db.product.findUniqueOrThrow({ where: { id: stocked.id } })).toMatchObject({ stock: 100 });
    expect(await db.product.findUniqueOrThrow({ where: { id: scarce.id } })).toMatchObject({ stock: 1 });
    expect(await db.stockMovement.count()).toBe(0);
    expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: 'PENDING' });
  });

  it('confirms only one of two concurrent confirmations for the same order', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { stock: 10 });
    const order = await createTestOrder(db, admin.id, {
      items: [{ productId: product.id, quantity: 4, unitPrice: '10.00' }],
    });

    const [first, second] = await Promise.all([
      confirmRoute(confirmRequest(order.id, { token }), order.id),
      confirmRoute(confirmRequest(order.id, { token }), order.id),
    ]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([200, 409]);
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ stock: 6 });
    expect(await db.stockMovement.count({ where: { orderId: order.id } })).toBe(1);
    expect(await db.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('never oversells when two orders compete for the same stock', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { stock: 10 });
    const firstOrder = await createTestOrder(db, admin.id, {
      items: [{ productId: product.id, quantity: 7, unitPrice: '10.00' }],
    });
    const secondOrder = await createTestOrder(db, admin.id, {
      items: [{ productId: product.id, quantity: 7, unitPrice: '10.00' }],
    });

    const responses = await Promise.all([
      confirmRoute(confirmRequest(firstOrder.id, { token }), firstOrder.id),
      confirmRoute(confirmRequest(secondOrder.id, { token }), secondOrder.id),
    ]);
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([200, 422]);
    const stock = (await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock;
    expect(stock).toBe(3);
    expect(stock).toBeGreaterThanOrEqual(0);
    expect(await db.stockMovement.count()).toBe(1);
  });

  it('requires an ADMIN session, allowed origin, and a valid order ID', async () => {
    const { admin, token } = await adminToken();
    const staff = await adminToken('STAFF');
    const order = await createTestOrder(db, admin.id, {
      items: [{ productId: (await createTestProduct(db)).id, quantity: 1, unitPrice: '10.00' }],
    });

    const unauthenticated = await confirmRoute(confirmRequest(order.id), order.id);
    const forbidden = await confirmRoute(confirmRequest(order.id, { token: staff.token }), order.id);
    const badOrigin = await confirmRoute(
      confirmRequest(order.id, { token, origin: 'https://evil.example' }),
      order.id,
    );
    const invalidId = await confirmRoute(confirmRequest('not-a-uuid', { token }), 'not-a-uuid');

    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(badOrigin.status).toBe(403);
    expect(invalidId.status).toBe(400);
    expect((await invalidId.json()).error.code).toBe('VALIDATION_ERROR');
  });
});
