import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as adjustInventoryRoute } from '../../app/api/inventory/adjustments/route';
import prisma from '../../lib/db';
import { createSession } from '../../modules/auth/session';
import { createTestPrismaClient, truncateAll } from '../helpers/db';
import { createTestAdmin, createTestProduct } from '../helpers/factories';

const db = createTestPrismaClient();
const ORIGIN = 'http://localhost:3000';

beforeEach(async () => truncateAll(db));
afterAll(async () => {
  await db.$disconnect();
  await prisma.$disconnect();
});

async function adminToken(role = 'ADMIN') {
  const admin = await createTestAdmin(db, { role });
  return (await createSession(db, admin.id)).token;
}

function request(payload: unknown, token?: string, origin: string | null = ORIGIN) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (token) headers.set('cookie', `stockflow_session=${encodeURIComponent(token)}`);
  if (origin) headers.set('origin', origin);
  return new Request(`${ORIGIN}/api/inventory/adjustments`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
}

const adjustment = (productId: string, type = 'ADJUSTMENT_IN', quantity = 3) => ({
  productId, type, quantity, reason: '  cycle count  ', performedBy: 'untrusted-client-value',
});

describe('POST /api/inventory/adjustments', () => {
  it('changes stock and records matching movement with authenticated actor', async () => {
    const admin = await createTestAdmin(db);
    const token = (await createSession(db, admin.id)).token;
    const product = await createTestProduct(db, { stock: 4 });

    const response = await adjustInventoryRoute(request(adjustment(product.id), token));
    const body = await response.json();
    const updated = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    const movements = await db.stockMovement.findMany({ where: { productId: product.id } });

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true, data: {
      productId: product.id, movementType: 'ADJUSTMENT_IN', quantityDelta: 3,
      quantityBefore: 4, quantityAfter: 7,
    }, meta: null });
    expect(updated.stock).toBe(7);
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      performedBy: admin.id, movementType: 'ADJUSTMENT_IN', quantityDelta: 3,
      quantityBefore: 4, quantityAfter: 7, orderId: null, reason: 'cycle count',
    });
  });

  it('allows adjustments to inactive products and rejects negative resulting stock atomically', async () => {
    const token = await adminToken();
    const product = await createTestProduct(db, { stock: 2, isActive: false });
    const accepted = await adjustInventoryRoute(request(adjustment(product.id, 'ADJUSTMENT_OUT', 2), token));
    expect(accepted.status).toBe(201);

    const denied = await adjustInventoryRoute(request(adjustment(product.id, 'ADJUSTMENT_OUT', 1), token));
    expect(denied.status).toBe(422);
    expect((await denied.json()).error.code).toBe('INVALID_ADJUSTMENT');
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(0);
    expect(await db.stockMovement.count({ where: { productId: product.id } })).toBe(1);
  });

  it('rejects integer overflow and missing products without partial writes', async () => {
    const token = await adminToken();
    const product = await createTestProduct(db, { stock: 2_147_483_647 });
    const overflow = await adjustInventoryRoute(request(adjustment(product.id), token));
    expect(overflow.status).toBe(422);
    expect((await overflow.json()).error.code).toBe('INVALID_ADJUSTMENT');
    expect(await db.stockMovement.count({ where: { productId: product.id } })).toBe(0);

    const missingId = '550e8400-e29b-41d4-a716-446655440000';
    const missing = await adjustInventoryRoute(request(adjustment(missingId), token));
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('validates request and enforces ADMIN plus allowed origin', async () => {
    const token = await adminToken();
    const product = await createTestProduct(db);
    for (const payload of [
      adjustment(product.id, 'ADJUSTMENT_IN', 0),
      { ...adjustment(product.id), reason: '   ' },
    ]) {
      const response = await adjustInventoryRoute(request(payload, token));
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    }
    expect((await adjustInventoryRoute(request(adjustment(product.id)))).status).toBe(401);
    expect((await adjustInventoryRoute(request(adjustment(product.id), await adminToken('STAFF')))).status).toBe(403);
    expect((await adjustInventoryRoute(request(adjustment(product.id), token, 'http://evil.example'))).status).toBe(403);
    expect((await adjustInventoryRoute(request(adjustment(product.id), token, null))).status).toBe(403);
  });

  it('preserves balance and movement consistency under concurrent adjustments', async () => {
    const token = await adminToken();
    const product = await createTestProduct(db, { stock: 5 });
    const responses = await Promise.all([
      adjustInventoryRoute(request(adjustment(product.id, 'ADJUSTMENT_OUT', 4), token)),
      adjustInventoryRoute(request(adjustment(product.id, 'ADJUSTMENT_OUT', 4), token)),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 422]);
    const finalProduct = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    const movements = await db.stockMovement.findMany({
      where: { productId: product.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(finalProduct.stock).toBe(1);
    expect(movements).toHaveLength(1);
    expect(movements[0].quantityBefore + movements[0].quantityDelta).toBe(movements[0].quantityAfter);
    expect(movements[0].quantityAfter).toBe(finalProduct.stock);
  });
});
