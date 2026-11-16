import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PATCH as updateProductRoute } from '../../app/api/products/[id]/route';
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

function request(id: string, body: string, options: { token?: string; origin?: string | null } = {}): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (options.origin !== null) headers.set('origin', options.origin ?? ORIGIN);
  if (options.token) headers.set('cookie', `stockflow_session=${encodeURIComponent(options.token)}`);
  return new Request(`${ORIGIN}/api/products/${id}`, { method: 'PATCH', headers, body });
}

describe('PATCH /api/products/:id', () => {
  it('updates only provided fields for an inactive product', async () => {
    const token = await tokenFor();
    const product = await createTestProduct(db, {
      sku: 'PRD-001', name: 'Old name', description: 'Old description', price: '10.00', stock: 9, isActive: false,
    });
    const previousUpdatedAt = new Date('2020-01-01T00:00:00.000Z');
    await db.product.update({
      where: { id: product.id },
      data: { createdAt: previousUpdatedAt, updatedAt: previousUpdatedAt },
    });
    const response = await updateProductRoute(
      request(product.id, JSON.stringify({ name: ' New name ', price: '25.50' }), { token }),
      { params: Promise.resolve({ id: product.id }) },
    );
    const saved = await db.product.findUniqueOrThrow({ where: { id: product.id } });

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ name: 'New name', price: '25.50', stock: 9, isActive: false });
    expect(saved.sku).toBe('PRD-001');
    expect(saved.stock).toBe(9);
    expect(saved.createdAt).toEqual(previousUpdatedAt);
    expect(saved.updatedAt.getTime()).toBeGreaterThan(previousUpdatedAt.getTime());
  });

  it('clears a nullable description', async () => {
    const token = await tokenFor();
    const product = await createTestProduct(db, { description: 'To clear' });
    const response = await updateProductRoute(
      request(product.id, JSON.stringify({ description: null }), { token }),
      { params: Promise.resolve({ id: product.id }) },
    );

    expect(response.status).toBe(200);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).description).toBeNull();
  });

  it.each([
    ['sku', { sku: 'CHANGED' }],
    ['stock', { stock: 100 }],
    ['activity', { isActive: true }],
    ['unknown field', { unexpected: true }],
    ['empty body', {}],
  ])('rejects %s changes', async (_caseName, payload) => {
    const token = await tokenFor();
    const product = await createTestProduct(db);
    const response = await updateProductRoute(
      request(product.id, JSON.stringify(payload), { token }),
      { params: Promise.resolve({ id: product.id }) },
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns expected errors for missing product, malformed ID, and malformed JSON', async () => {
    const token = await tokenFor();
    const missing = await updateProductRoute(
      request('00000000-0000-4000-8000-000000000001', JSON.stringify({ name: 'X' }), { token }),
      { params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }) },
    );
    const malformedId = await updateProductRoute(
      request('bad-id', JSON.stringify({ name: 'X' }), { token }),
      { params: Promise.resolve({ id: 'bad-id' }) },
    );
    const product = await createTestProduct(db);
    const malformedJson = await updateProductRoute(
      request(product.id, '{bad json', { token }),
      { params: Promise.resolve({ id: product.id }) },
    );

    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe('RESOURCE_NOT_FOUND');
    expect(malformedId.status).toBe(400);
    expect((await malformedId.json()).error.code).toBe('VALIDATION_ERROR');
    expect(malformedJson.status).toBe(400);
  });

  it('enforces authentication, role, and origin', async () => {
    const product = await createTestProduct(db);
    const id = product.id;
    const noAuth = await updateProductRoute(request(id, JSON.stringify({ name: 'X' })), { params: Promise.resolve({ id }) });
    const staff = await tokenFor('STAFF');
    const forbiddenRole = await updateProductRoute(request(id, JSON.stringify({ name: 'X' }), { token: staff }), { params: Promise.resolve({ id }) });
    const admin = await tokenFor();
    const forbiddenOrigin = await updateProductRoute(request(id, JSON.stringify({ name: 'X' }), { token: admin, origin: 'https://evil.example' }), { params: Promise.resolve({ id }) });

    expect(noAuth.status).toBe(401);
    expect(forbiddenRole.status).toBe(403);
    expect(forbiddenOrigin.status).toBe(403);
  });
});
