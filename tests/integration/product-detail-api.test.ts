import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as productDetailRoute } from '../../app/api/products/[id]/route';
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

async function tokenFor(role = 'ADMIN') {
  const admin = await createTestAdmin(db, { role });
  return (await createSession(db, admin.id)).token;
}

function request(id: string, token?: string): Request {
  const headers = new Headers();
  if (token) headers.set('cookie', `stockflow_session=${encodeURIComponent(token)}`);
  return new Request(`${ORIGIN}/api/products/${id}`, { headers });
}

function route(requestValue: Request) {
  return productDetailRoute(requestValue, { params: Promise.resolve({ id: requestValue.url.split('/').pop() ?? '' }) });
}

describe('GET /api/products/:id', () => {
  it('returns full product representation for active and inactive products', async () => {
    const token = await tokenFor();
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const product = await createTestProduct(db, {
      sku: 'PRD-001',
      name: 'Wireless Mouse',
      description: 'Wireless computer mouse',
      price: '150000.00',
      stock: 7,
      isActive: false,
    });
    await db.product.update({ where: { id: product.id }, data: { createdAt, updatedAt } });

    const response = await route(request(product.id, token));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        id: product.id,
        sku: 'PRD-001',
        name: 'Wireless Mouse',
        description: 'Wireless computer mouse',
        price: '150000.00',
        stock: 7,
        isActive: false,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
      meta: null,
    });
  });

  it('returns 404 when product does not exist', async () => {
    const token = await tokenFor();
    const response = await route(request('00000000-0000-4000-8000-000000000001', token));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns validation error for malformed identifier', async () => {
    const token = await tokenFor();
    const response = await route(request('not-a-uuid', token));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('requires an ADMIN session', async () => {
    expect((await route(request('00000000-0000-4000-8000-000000000001'))).status).toBe(401);
    const staff = await tokenFor('STAFF');
    expect((await route(request('00000000-0000-4000-8000-000000000001', staff))).status).toBe(403);
  });
});
