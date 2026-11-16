import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from '../lib/env';
import { PrismaClient } from '../lib/generated/prisma/client';
import { hashPassword } from '../modules/auth/password';

async function main() {
  if (env.NODE_ENV === 'production' && !env.ALLOW_SEED) {
    throw new Error('Refusing to seed in production without ALLOW_SEED=true.');
  }

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const user = await prisma.user.upsert({
      where: { email: env.ADMIN_EMAIL },
      create: { email: env.ADMIN_EMAIL, passwordHash, role: 'ADMIN' },
      update: { passwordHash, role: 'ADMIN' },
    });

    console.log(`Seeded administrator ${user.email}.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
