import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as createProductRoute } from '../../app/api/products/route';
import { createSession } from '../../modules/auth/session';
import prisma from '../../lib/db';
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

function request(body: string, options: { token?: string; origin?: string | null } = {}): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (options.origin !== null) headers.set('origin', options.origin ?? ORIGIN);
  if (options.token) headers.set('cookie', `stockflow_session=${encodeURIComponent(options.token)}`);

  return new Request(`${ORIGIN}/api/products`, { method: 'POST', headers, body });
}

async function createAdmin(role = 'ADMIN') {
  const admin = await createTestAdmin(db, { role });
  const session = await createSession(db, admin.id);
  return { admin, token: session.token };
}

const validProduct = {
  sku: ' prd-001 ',
  name: ' Wireless Mouse ',
  description: 'Wireless computer mouse',
  price: '150000.00',
  initialStock: 5,
};

describe('POST /api/products', () => {
  it('creates an active product and one initial movement atomically', async () => {
    const { admin, token } = await createAdmin();
    const response = await createProductRoute(request(JSON.stringify(validProduct), { token }));
    const body = await response.json();
    const savedProduct = await db.product.findUniqueOrThrow({ where: { sku: 'PRD-001' } });
    const movements = await db.stockMovement.findMany({ where: { productId: savedProduct.id } });

    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      data: {
        id: savedProduct.id,
        sku: 'PRD-001',
        name: 'Wireless Mouse',
        price: '150000.00',
        stock: 5,
        isActive: true,
      },
      meta: null,
    });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      performedBy: admin.id,
      movementType: 'INITIAL_STOCK',
      quantityDelta: 5,
      quantityBefore: 0,
      quantityAfter: 5,
    });
  });

  it('rejects a duplicate SKU regardless of letter case', async () => {
    const { token } = await createAdmin();
    await createTestProduct(db, { sku: 'PRD-001' });
    const response = await createProductRoute(request(JSON.stringify(validProduct), { token }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('SKU_ALREADY_EXISTS');
    expect(await db.product.count()).toBe(1);
  });

  it('creates zero-stock product without a movement', async () => {
    const { token } = await createAdmin();
    const response = await createProductRoute(
      request(JSON.stringify({ ...validProduct, initialStock: 0 }), { token }),
    );

    expect(response.status).toBe(201);
    expect(await db.stockMovement.count()).toBe(0);
  });

  it.each([
    ['negative price', { ...validProduct, price: '-1.00' }],
    ['numeric price', { ...validProduct, price: 1 }],
    ['too many decimals', { ...validProduct, price: '1.001' }],
    ['missing stock', { sku: validProduct.sku, name: validProduct.name, price: validProduct.price }],
    ['negative stock', { ...validProduct, initialStock: -1 }],
    ['fractional stock', { ...validProduct, initialStock: 1.5 }],
    ['empty name', { ...validProduct, name: ' ' }],
  ])('returns validation details for %s', async (_name, payload) => {
    const { token } = await createAdmin();
    const response = await createProductRoute(request(JSON.stringify(payload), { token }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.length).toBeGreaterThan(0);
  });

  it('rejects malformed JSON', async () => {
    const { token } = await createAdmin();
    const response = await createProductRoute(request('{bad json', { token }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('requires an administrator session', async () => {
    const response = await createProductRoute(request(JSON.stringify(validProduct)));

    expect(response.status).toBe(401);
  });

  it('rejects a non-ADMIN session', async () => {
    const { token } = await createAdmin('STAFF');
    const response = await createProductRoute(request(JSON.stringify(validProduct), { token }));

    expect(response.status).toBe(403);
  });

  it('rejects a disallowed origin', async () => {
    const { token } = await createAdmin();
    const response = await createProductRoute(
      request(JSON.stringify(validProduct), { token, origin: 'https://evil.example' }),
    );

    expect(response.status).toBe(403);
  });

  it('rolls back product when initial movement cannot be recorded', async () => {
    const { token } = await createAdmin();
    await db.$executeRaw`ALTER TABLE stock_movements ADD CONSTRAINT fail_initial_stock CHECK (movement_type <> 'INITIAL_STOCK')`;

    try {
      const response = await createProductRoute(request(JSON.stringify(validProduct), { token }));
      expect(response.status).toBe(500);
      expect(await db.product.count()).toBe(0);
      expect(await db.stockMovement.count()).toBe(0);
    } finally {
      await db.$executeRaw`ALTER TABLE stock_movements DROP CONSTRAINT fail_initial_stock`;
    }
  });
});
