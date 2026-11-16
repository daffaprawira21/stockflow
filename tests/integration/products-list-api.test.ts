import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as listProductsRoute } from '../../app/api/products/route';
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
  return (await createSession(db, admin.id)).token;
}

function request(query: string, token?: string): Request {
  const headers = new Headers();
  if (token) headers.set('cookie', `stockflow_session=${encodeURIComponent(token)}`);
  return new Request(`${ORIGIN}/api/products${query}`, { headers });
}

function product(overrides: Parameters<typeof createTestProduct>[1] = {}) {
  return createTestProduct(db, overrides);
}

describe('GET /api/products', () => {
  it('searches name and SKU case-insensitively and ignores empty search', async () => {
    const token = await adminToken();
    await product({ sku: 'AB-100', name: 'Wireless Mouse' });
    await product({ sku: 'KB-200', name: 'Mechanical Keyboard' });

    const byName = await listProductsRoute(request('?search=MOUSE', token));
    expect((await byName.json()).data.map((item: { sku: string }) => item.sku)).toEqual(['AB-100']);

    const bySku = await listProductsRoute(request('?search=ab-1', token));
    expect((await bySku.json()).data.map((item: { sku: string }) => item.sku)).toEqual(['AB-100']);

    const emptySearch = await listProductsRoute(request('?search=', token));
    expect((await emptySearch.json()).data).toHaveLength(2);
  });

  it('filters active and inactive products only when requested', async () => {
    const token = await adminToken();
    await product({ sku: 'ACTIVE', isActive: true });
    await product({ sku: 'INACTIVE', isActive: false });

    const active = await listProductsRoute(request('?isActive=true', token));
    expect((await active.json()).data.map((item: { sku: string }) => item.sku)).toEqual(['ACTIVE']);
    const inactive = await listProductsRoute(request('?isActive=false', token));
    expect((await inactive.json()).data.map((item: { sku: string }) => item.sku)).toEqual(['INACTIVE']);
    const all = await listProductsRoute(request('', token));
    expect((await all.json()).data).toHaveLength(2);
  });

  it('sorts by each allowed field in either direction', async () => {
    const token = await adminToken();
    const newer = await product({ sku: 'SKU-B', name: 'Beta', price: '20.00', stock: 2 });
    const older = await product({ sku: 'SKU-A', name: 'Alpha', price: '10.00', stock: 1 });
    await db.product.update({
      where: { id: newer.id },
      data: { createdAt: new Date('2026-01-02T00:00:00.000Z') },
    });
    await db.product.update({
      where: { id: older.id },
      data: { createdAt: new Date('2026-01-01T00:00:00.000Z') },
    });

    const expectedAscending: Record<string, string[]> = {
      name: ['SKU-A', 'SKU-B'],
      sku: ['SKU-A', 'SKU-B'],
      price: ['SKU-A', 'SKU-B'],
      stock: ['SKU-A', 'SKU-B'],
      createdAt: ['SKU-A', 'SKU-B'],
    };

    for (const [sortBy, ascending] of Object.entries(expectedAscending)) {
      for (const [sortOrder, expected] of [
        ['asc', ascending],
        ['desc', [...ascending].reverse()],
      ] as const) {
        const response = await listProductsRoute(request(`?sortBy=${sortBy}&sortOrder=${sortOrder}`, token));
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body.data.map((item: { sku: string }) => item.sku)).toEqual(expected);
      }
    }
  });

  it('uses stable ordering for ties and returns consistent pagination metadata', async () => {
    const token = await adminToken();
    await product({ sku: 'TIE-B', name: 'Same', price: '10.00' });
    await product({ sku: 'TIE-A', name: 'Same', price: '10.00' });
    await product({ sku: 'TIE-C', name: 'Same', price: '10.00' });

    const pageOne = await listProductsRoute(request('?sortBy=name&sortOrder=asc&page=1&limit=2', token));
    const pageTwo = await listProductsRoute(request('?sortBy=name&sortOrder=asc&page=2&limit=2', token));
    const first = await pageOne.json();
    const second = await pageTwo.json();

    expect(first.data.map((item: { id: string }) => item.id)).toEqual(
      [...first.data.map((item: { id: string }) => item.id)].sort(),
    );
    expect(first.data.map((item: { id: string }) => item.id).filter((id: string) =>
      second.data.some((item: { id: string }) => item.id === id),
    )).toEqual([]);
    expect(first.meta).toEqual({ page: 1, limit: 2, totalItems: 3, totalPages: 2 });
    expect(second.meta).toEqual({ page: 2, limit: 2, totalItems: 3, totalPages: 2 });
  });

  it.each(['?page=0', '?limit=101', '?sortBy=id', '?sortOrder=up', '?isActive=yes'])(
    'rejects invalid query %s',
    async (query) => {
      const token = await adminToken();
      const response = await listProductsRoute(request(query, token));
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('requires an ADMIN session', async () => {
    expect((await listProductsRoute(request(''))).status).toBe(401);
    const staff = await adminToken('STAFF');
    expect((await listProductsRoute(request('', staff))).status).toBe(403);
  });
});
