import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PATCH as deactivateProductRoute } from '../../app/api/products/[id]/deactivate/route';
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

function request(id: string, options: { token?: string; origin?: string | null } = {}): Request {
  const headers = new Headers();
  if (options.origin !== null) headers.set('origin', options.origin ?? ORIGIN);
  if (options.token) headers.set('cookie', `stockflow_session=${encodeURIComponent(options.token)}`);
  return new Request(`${ORIGIN}/api/products/${id}/deactivate`, { method: 'PATCH', headers });
}

function route(requestValue: Request) {
  return deactivateProductRoute(requestValue, {
    params: Promise.resolve({ id: requestValue.url.split('/').at(-2) ?? '' }),
  });
}

describe('PATCH /api/products/:id/deactivate', () => {
  it('deactivates product and safely returns same representation on retry', async () => {
    const token = await tokenFor();
    const product = await createTestProduct(db, {
      sku: 'PRD-001', name: 'Wireless Mouse', description: 'Details',
      price: '150000.00', stock: 7, isActive: true,
    });

    const first = await route(request(product.id, { token }));
    const second = await route(request(product.id, { token }));
    const body = await first.json();
    const retryBody = await second.json();
    const saved = await db.product.findUniqueOrThrow({ where: { id: product.id } });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(body).toEqual(retryBody);
    expect(body.data).toMatchObject({
      id: product.id,
      sku: 'PRD-001',
      name: 'Wireless Mouse',
      description: 'Details',
      price: '150000.00',
      stock: 7,
      isActive: false,
    });
    expect(body.data.createdAt).toBe(product.createdAt.toISOString());
    expect(body.data.updatedAt).toBe(saved.updatedAt.toISOString());
    expect(saved).toMatchObject({
      sku: product.sku,
      name: product.name,
      description: product.description,
      stock: product.stock,
      isActive: false,
    });
    expect(saved.price.toFixed(2)).toBe(product.price.toFixed(2));
    expect(await db.product.count()).toBe(1);
  });

  it('returns not found for unknown product and validation error for malformed ID', async () => {
    const token = await tokenFor();
    const unknown = await route(request('00000000-0000-4000-8000-000000000001', { token }));
    const malformed = await route(request('bad-id', { token }));

    expect(unknown.status).toBe(404);
    expect((await unknown.json()).error.code).toBe('RESOURCE_NOT_FOUND');
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('enforces authentication, role, and origin', async () => {
    const product = await createTestProduct(db);
    expect((await route(request(product.id))).status).toBe(401);
    const staff = await tokenFor('STAFF');
    expect((await route(request(product.id, { token: staff }))).status).toBe(403);
    const admin = await tokenFor();
    expect((await route(request(product.id, { token: admin, origin: 'https://evil.example' }))).status).toBe(403);
  });
});
