import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../lib/generated/prisma/client';

const TRUNCATE_ORDER = [
  'idempotency_records',
  'order_status_history',
  'stock_movements',
  'order_items',
  'orders',
  'sessions',
  'products',
  'users',
];

function requireTestDatabaseUrl(): string {
  const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL is not set. Run `npm run test:integration`.');
  }

  if (!connectionString.includes('stockflow_test')) {
    throw new Error('Refusing to run tests against a database that is not stockflow_test.');
  }

  return connectionString;
}

export function createTestPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireTestDatabaseUrl() }),
  });
}

export async function truncateAll(prisma: PrismaClient): Promise<void> {
  const tables = TRUNCATE_ORDER.map((table) => `"${table}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}
