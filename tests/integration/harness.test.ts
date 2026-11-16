import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPrismaClient, truncateAll } from '../helpers/db';
import { createTestAdmin, createTestProduct } from '../helpers/factories';

const prisma = createTestPrismaClient();

beforeAll(async () => {
  await truncateAll(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('integration test harness', () => {
  it('connects to the dedicated test database', async () => {
    const result = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;

    expect(result[0]?.current_database).toBe('stockflow_test');
  });

  it('creates admins and products through the factories', async () => {
    const admin = await createTestAdmin(prisma);
    const product = await createTestProduct(prisma, { stock: 10 });

    expect(admin.role).toBe('ADMIN');
    expect(product.stock).toBe(10);
  });

  it('truncates every table between runs', async () => {
    await truncateAll(prisma);

    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.product.count()).toBe(0);
    expect(await prisma.order.count()).toBe(0);
  });
});
