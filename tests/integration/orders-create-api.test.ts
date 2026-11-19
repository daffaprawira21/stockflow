import { createHash } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as createOrderRoute } from '../../app/api/orders/route';
import prisma from '../../lib/db';
import { createSession } from '../../modules/auth/session';
import { createTestPrismaClient, truncateAll } from '../helpers/db';
import { createTestAdmin, createTestProduct } from '../helpers/factories';

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

function createRequest(
  body: string,
  options: { token?: string; idempotencyKey?: string; origin?: string | null } = {},
): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (options.origin !== null) headers.set('origin', options.origin ?? ORIGIN);
  if (options.token) headers.set('cookie', `stockflow_session=${encodeURIComponent(options.token)}`);
  if (options.idempotencyKey) headers.set('idempotency-key', options.idempotencyKey);

  return new Request(`${ORIGIN}/api/orders`, { method: 'POST', headers, body });
}

describe('POST /api/orders', () => {
  it('creates a pending order with price snapshots, initial history, and unchanged stock', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db, { price: '100.50', stock: 7 });

    const response = await createOrderRoute(createRequest(JSON.stringify({
      items: [{ productId: product.id, quantity: 2 }],
    }), { token, idempotencyKey: 'create-order-1' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      success: true,
      data: {
        status: 'PENDING',
        items: [{ productId: product.id, quantity: 2, unitPrice: '100.50', subtotal: '201.00' }],
        totalAmount: '201.00',
      },
      meta: null,
    });
    expect(body.data.orderNumber).toMatch(
      new RegExp(`^ORD-${new Date().getUTCFullYear()}-\\d{6}$`),
    );
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ stock: 7 });
    expect(await db.orderStatusHistory.findMany({ where: { orderId: body.data.id } })).toMatchObject([
      { changedBy: admin.id, fromStatus: null, toStatus: 'PENDING', reason: null },
    ]);
    expect(await db.idempotencyRecord.findFirstOrThrow({
      where: { userId: admin.id, operation: 'CREATE_ORDER', idempotencyKey: 'create-order-1' },
    })).toMatchObject({ resourceId: body.data.id });
  });

  it('replays a completed matching request without creating another order', async () => {
    const { token } = await adminToken();
    const product = await createTestProduct(db);
    const payload = JSON.stringify({ items: [{ productId: product.id, quantity: 1 }] });

    const initial = await createOrderRoute(createRequest(payload, {
      token,
      idempotencyKey: 'completed-replay',
    }));
    const replay = await createOrderRoute(createRequest(payload, {
      token,
      idempotencyKey: 'completed-replay',
    }));

    expect(initial.status).toBe(201);
    expect(replay.status).toBe(200);
    expect((await replay.json()).data).toEqual((await initial.json()).data);
    expect(await db.order.count()).toBe(1);
  });

  it('rejects a matching idempotency key with a different payload', async () => {
    const { token } = await adminToken();
    const product = await createTestProduct(db);

    await createOrderRoute(createRequest(JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
    }), { token, idempotencyKey: 'payload-conflict' }));
    const response = await createOrderRoute(createRequest(JSON.stringify({
      items: [{ productId: product.id, quantity: 2 }],
    }), { token, idempotencyKey: 'payload-conflict' }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(await db.order.count()).toBe(1);
  });

  it('rejects missing, inactive, and invalid products without creating an order', async () => {
    const { token } = await adminToken();
    const inactive = await createTestProduct(db, { isActive: false });
    const validId = '00000000-0000-4000-8000-000000000001';

    const missing = await createOrderRoute(createRequest(JSON.stringify({
      items: [{ productId: validId, quantity: 1 }],
    }), { token, idempotencyKey: 'missing-product' }));
    const inactiveResponse = await createOrderRoute(createRequest(JSON.stringify({
      items: [{ productId: inactive.id, quantity: 1 }],
    }), { token, idempotencyKey: 'inactive-product' }));

    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe('RESOURCE_NOT_FOUND');
    expect(inactiveResponse.status).toBe(422);
    expect((await inactiveResponse.json()).error.code).toBe('PRODUCT_INACTIVE');
    expect(await db.order.count()).toBe(0);
  });

  it.each([
    ['missing idempotency key', { items: [] }, {}],
    ['empty items', { items: [] }, { idempotencyKey: 'empty-items' }],
    ['invalid product ID', { items: [{ productId: 'bad-id', quantity: 1 }] }, { idempotencyKey: 'bad-id' }],
    ['non-positive quantity', { items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 0 }] }, { idempotencyKey: 'bad-quantity' }],
    ['idempotency key longer than database limit', {
      items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
    }, { idempotencyKey: 'x'.repeat(256) }],
  ])('rejects %s', async (_name, payload, options) => {
    const { token } = await adminToken();
    const response = await createOrderRoute(createRequest(JSON.stringify(payload), { token, ...options }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed JSON, disallowed origin, unauthenticated, and non-ADMIN requests', async () => {
    const { token } = await adminToken();
    const staff = await adminToken('STAFF');

    const malformed = await createOrderRoute(createRequest('{bad json', { token, idempotencyKey: 'malformed' }));
    const origin = await createOrderRoute(createRequest(JSON.stringify({ items: [] }), {
      token,
      idempotencyKey: 'bad-origin',
      origin: 'https://evil.example',
    }));
    const unauthenticated = await createOrderRoute(createRequest(JSON.stringify({ items: [] }), {
      idempotencyKey: 'no-auth',
    }));
    const forbidden = await createOrderRoute(createRequest(JSON.stringify({ items: [] }), {
      token: staff.token,
      idempotencyKey: 'staff',
    }));

    expect(malformed.status).toBe(400);
    expect(origin.status).toBe(403);
    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(403);
  });

  it('replays a semantically identical payload without requiring identical JSON order', async () => {
    const { token } = await adminToken();
    const first = await createTestProduct(db, { price: '10.00' });
    const second = await createTestProduct(db, { price: '20.00' });

    const initial = await createOrderRoute(createRequest(JSON.stringify({
      items: [
        { productId: first.id, quantity: 1 },
        { productId: second.id, quantity: 1 },
        { productId: first.id, quantity: 1 },
      ],
    }), { token, idempotencyKey: 'canonical-replay' }));
    const replay = await createOrderRoute(createRequest(JSON.stringify({
      items: [
        { productId: second.id, quantity: 1 },
        { productId: first.id, quantity: 2 },
      ],
    }), { token, idempotencyKey: 'canonical-replay' }));

    expect(initial.status).toBe(201);
    expect(replay.status).toBe(200);
    expect((await replay.json()).data).toEqual((await initial.json()).data);
    expect(await db.order.count()).toBe(1);
  });

  it('returns in-progress when another transaction holds the same idempotency key', async () => {
    const { admin, token } = await adminToken();
    const product = await createTestProduct(db);
    const idempotencyKey = 'request-in-progress';

    await db.$transaction(async (tx) => {
      const scope = `${admin.id}:CREATE_ORDER:${idempotencyKey}`;
      const samePayload = JSON.stringify({ items: [{ productId: product.id, quantity: 1 }] });
      const sameHash = createHash('sha256')
        .update(JSON.stringify([{ productId: product.id, quantity: 1 }]))
        .digest('hex');
      await tx.$executeRaw`
        SELECT
          pg_advisory_xact_lock(hashtextextended(${scope}, 0)),
          pg_advisory_xact_lock(hashtextextended(${`${scope}:${sameHash}`}, 0))
      `;

      const sameResponse = await createOrderRoute(createRequest(samePayload, { token, idempotencyKey }));
      const differentPayload = await createOrderRoute(createRequest(JSON.stringify({
        items: [{ productId: product.id, quantity: 2 }],
      }), { token, idempotencyKey }));

      expect(sameResponse.status).toBe(409);
      expect((await sameResponse.json()).error.code).toBe('IDEMPOTENCY_REQUEST_IN_PROGRESS');
      expect(differentPayload.status).toBe(409);
      expect((await differentPayload.json()).error.code).toBe('IDEMPOTENCY_CONFLICT');
    });
    expect(await db.order.count()).toBe(0);
  });

  it('creates exactly one order when two same-key requests overlap', async () => {
    const { token } = await adminToken();
    const product = await createTestProduct(db);
    const payload = JSON.stringify({ items: [{ productId: product.id, quantity: 1 }] });

    const [first, second] = await Promise.all([
      createOrderRoute(createRequest(payload, { token, idempotencyKey: 'concurrent-same-key' })),
      createOrderRoute(createRequest(payload, { token, idempotencyKey: 'concurrent-same-key' })),
    ]);
    const responses = [first, second];
    const created = responses.find((response) => response.status === 201);
    const duplicate = responses.find((response) => response.status !== 201);

    expect(created).toBeDefined();
    expect(duplicate).toBeDefined();
    if (!created || !duplicate) {
      throw new Error('Expected one created response and one duplicate response');
    }
    expect([200, 409]).toContain(duplicate.status);
    if (duplicate.status === 409) {
      expect((await duplicate.json()).error.code).toBe('IDEMPOTENCY_REQUEST_IN_PROGRESS');
    }
    expect(await db.order.count()).toBe(1);

    const replay = await createOrderRoute(createRequest(payload, {
      token,
      idempotencyKey: 'concurrent-same-key',
    }));
    expect(replay.status).toBe(200);
    expect((await replay.json()).data).toEqual((await created.json()).data);
  });

  it('rejects a consolidated quantity above the PostgreSQL integer limit', async () => {
    const { token } = await adminToken();
    const product = await createTestProduct(db);

    const response = await createOrderRoute(createRequest(JSON.stringify({
      items: [
        { productId: product.id, quantity: 2_147_483_647 },
        { productId: product.id, quantity: 1 },
      ],
    }), { token, idempotencyKey: 'quantity-overflow' }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    expect(await db.order.count()).toBe(0);
  });

  it('rolls back the order when its idempotency result cannot be persisted', async () => {
    const { token } = await adminToken();
    const product = await createTestProduct(db);
    await db.$executeRaw`
      ALTER TABLE idempotency_records
      ADD CONSTRAINT fail_order_creation CHECK (idempotency_key <> 'rollback-order')
    `;

    try {
      const response = await createOrderRoute(createRequest(JSON.stringify({
        items: [{ productId: product.id, quantity: 1 }],
      }), { token, idempotencyKey: 'rollback-order' }));

      expect(response.status).toBe(500);
      expect(await db.order.count()).toBe(0);
      expect(await db.orderItem.count()).toBe(0);
      expect(await db.orderStatusHistory.count()).toBe(0);
      expect(await db.idempotencyRecord.count()).toBe(0);
    } finally {
      await db.$executeRaw`ALTER TABLE idempotency_records DROP CONSTRAINT fail_order_creation`;
    }
  });

  it('consolidates duplicate product IDs before saving price snapshots', async () => {
    const { token } = await adminToken();
    const product = await createTestProduct(db, { price: '12.50' });

    const response = await createOrderRoute(createRequest(JSON.stringify({
      items: [
        { productId: product.id, quantity: 1 },
        { productId: product.id, quantity: 2 },
      ],
    }), { token, idempotencyKey: 'consolidate-items' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.items).toEqual([
      { productId: product.id, quantity: 3, unitPrice: '12.50', subtotal: '37.50' },
    ]);
    expect(body.data.totalAmount).toBe('37.50');
    expect(await db.orderItem.count()).toBe(1);
  });
});
