import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as stockMovementsRoute } from '../../app/api/inventory/[productId]/movements/route';
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

function request(productId: string, query = '', token?: string) {
  const headers = new Headers();
  if (token) headers.set('cookie', `stockflow_session=${encodeURIComponent(token)}`);
  return new Request(`${ORIGIN}/api/inventory/${productId}/movements${query}`, { headers });
}

describe('GET /api/inventory/:productId/movements', () => {
  it('returns movements newest first with contract fields and pagination metadata', async () => {
    const admin = await createTestAdmin(db);
    const token = (await createSession(db, admin.id)).token;
    const product = await createTestProduct(db, { stock: 3 });
    const older = new Date('2026-11-17T08:00:00.000Z');
    const newer = new Date('2026-11-17T09:00:00.000Z');
    await db.stockMovement.create({ data: {
      productId: product.id, performedBy: admin.id, movementType: 'INITIAL_STOCK',
      quantityDelta: 5, quantityBefore: 0, quantityAfter: 5, createdAt: older,
    } });
    await db.stockMovement.create({ data: {
      productId: product.id, performedBy: admin.id, movementType: 'ADJUSTMENT_OUT',
      quantityDelta: -2, quantityBefore: 5, quantityAfter: 3, reason: 'cycle count', createdAt: newer,
    } });

    const response = await stockMovementsRoute(request(product.id, '', token), { params: Promise.resolve({ productId: product.id }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((movement: { movementType: string }) => movement.movementType)).toEqual(['ADJUSTMENT_OUT', 'INITIAL_STOCK']);
    expect(body.data[0]).toEqual({
      id: expect.any(String), productId: product.id, movementType: 'ADJUSTMENT_OUT',
      quantityDelta: -2, quantityBefore: 5, quantityAfter: 3, orderId: null,
      reason: 'cycle count', createdAt: newer.toISOString(),
    });
    expect(body.meta).toEqual({ page: 1, limit: 10, totalItems: 2, totalPages: 1 });
  });

  it('filters by movement type and paginates deterministically', async () => {
    const admin = await createTestAdmin(db);
    const token = (await createSession(db, admin.id)).token;
    const product = await createTestProduct(db, { stock: 3 });
    for (const [movementType, delta, before, after] of [
      ['INITIAL_STOCK', 1, 0, 1],
      ['ADJUSTMENT_IN', 1, 1, 2],
      ['ADJUSTMENT_IN', 1, 2, 3],
    ] as const) {
      await db.stockMovement.create({ data: {
        productId: product.id, performedBy: admin.id, movementType,
        quantityDelta: delta, quantityBefore: before, quantityAfter: after,
        ...(movementType === 'ADJUSTMENT_IN' ? { reason: 'received' } : {}),
      } });
    }

    const response = await stockMovementsRoute(request(product.id, '?movementType=ADJUSTMENT_IN&page=1&limit=1', token), {
      params: Promise.resolve({ productId: product.id }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].movementType).toBe('ADJUSTMENT_IN');
    expect(body.meta).toEqual({ page: 1, limit: 1, totalItems: 2, totalPages: 2 });
  });

  it('rejects invalid UUID and unknown product', async () => {
    const token = await adminToken();
    const invalid = await stockMovementsRoute(request('nope', '', token), { params: Promise.resolve({ productId: 'nope' }) });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe('VALIDATION_ERROR');

    const missing = await stockMovementsRoute(request('550e8400-e29b-41d4-a716-446655440000', '', token), {
      params: Promise.resolve({ productId: '550e8400-e29b-41d4-a716-446655440000' }),
    });
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('rejects invalid movement type and requires ADMIN', async () => {
    const product = await createTestProduct(db);
    const token = await adminToken();
    const invalidType = await stockMovementsRoute(request(product.id, '?movementType=OTHER', token), {
      params: Promise.resolve({ productId: product.id }),
    });
    expect(invalidType.status).toBe(400);
    expect((await invalidType.json()).error.code).toBe('VALIDATION_ERROR');
    expect((await stockMovementsRoute(request(product.id), { params: Promise.resolve({ productId: product.id }) })).status).toBe(401);
    expect((await stockMovementsRoute(request(product.id, '', await adminToken('STAFF')), {
      params: Promise.resolve({ productId: product.id }),
    })).status).toBe(403);
  });
});
