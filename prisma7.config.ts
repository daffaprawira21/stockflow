import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// The Prisma CLI loads this config for every command, including `generate`.
// Fall back to a placeholder so generation works before a database exists.
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/stockflow?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
