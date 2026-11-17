import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as listInventoryRoute } from '../../app/api/inventory/route';
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

function request(query: string, token?: string) {
  const headers = new Headers();
  if (token) headers.set('cookie', `stockflow_session=${encodeURIComponent(token)}`);
  return new Request(`${ORIGIN}/api/inventory${query}`, { headers });
}

describe('GET /api/inventory', () => {
  it('lists active and inactive products by SKU and returns contract fields', async () => {
    const token = await adminToken();
    await createTestProduct(db, { sku: 'SKU-B', name: 'Beta', stock: 4 });
    await createTestProduct(db, { sku: 'SKU-A', name: 'Alpha', stock: 0, isActive: false });

    const response = await listInventoryRoute(request('', token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      { productId: expect.any(String), sku: 'SKU-A', productName: 'Alpha', stock: 0, isActive: false },
      { productId: expect.any(String), sku: 'SKU-B', productName: 'Beta', stock: 4, isActive: true },
    ]);
    expect(body.meta).toEqual({ page: 1, limit: 10, totalItems: 2, totalPages: 1 });
  });

  it('filters by case-insensitive name or SKU and low stock', async () => {
    const token = await adminToken();
    await createTestProduct(db, { sku: 'MOUSE-1', name: 'Wireless Mouse', stock: 0 });
    await createTestProduct(db, { sku: 'KB-1', name: 'Mechanical Keyboard', stock: 0 });
    await createTestProduct(db, { sku: 'MOUSE-2', name: 'Wired Mouse', stock: 5 });

    const byName = await listInventoryRoute(request('?search=MOUSE&lowStock=0', token));
    expect((await byName.json()).data.map((row: { sku: string }) => row.sku)).toEqual(['MOUSE-1']);
    const bySku = await listInventoryRoute(request('?search=mouse-2', token));
    expect((await bySku.json()).data.map((row: { sku: string }) => row.sku)).toEqual(['MOUSE-2']);
    const emptySearch = await listInventoryRoute(request('?search=%20%20', token));
    expect((await emptySearch.json()).meta.totalItems).toBe(3);
  });

  it('paginates without overlap and reports matching metadata', async () => {
    const token = await adminToken();
    for (const sku of ['SKU-A', 'SKU-B', 'SKU-C']) await createTestProduct(db, { sku });

    const page1 = await listInventoryRoute(request('?page=1&limit=2', token));
    const page2 = await listInventoryRoute(request('?page=2&limit=2', token));
    const first = await page1.json();
    const second = await page2.json();

    expect(first.data.map((row: { sku: string }) => row.sku)).toEqual(['SKU-A', 'SKU-B']);
    expect(second.data.map((row: { sku: string }) => row.sku)).toEqual(['SKU-C']);
    expect(first.meta).toEqual({ page: 1, limit: 2, totalItems: 3, totalPages: 2 });
    expect(second.meta).toEqual({ page: 2, limit: 2, totalItems: 3, totalPages: 2 });
  });

  it('rejects invalid filters and requires ADMIN session', async () => {
    const token = await adminToken();
    for (const query of ['?page=0', '?limit=101', '?lowStock=2147483648']) {
      const response = await listInventoryRoute(request(query, token));
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    }
    expect((await listInventoryRoute(request(''))).status).toBe(401);
    expect((await listInventoryRoute(request('', await adminToken('STAFF')))).status).toBe(403);
  });
});
