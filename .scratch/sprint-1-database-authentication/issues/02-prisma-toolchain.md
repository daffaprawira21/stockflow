# 02: Set up the Prisma 7.10.1 toolchain

**What to build:** Install pinned Prisma 7 packages, configure the CLI through `prisma7.config.ts`, generate the client into `lib/generated/prisma`, and expose a singleton client using the PostgreSQL driver adapter.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] `prisma@7.10.1` (dev), `@prisma/client@7.10.1`, `@prisma/adapter-pg@7.10.1`, and `pg` are installed with exact pins where specified; `package-lock.json` is updated.
- [ ] `prisma7.config.ts` imports `dotenv/config`, sets `schema`, `migrations.path`, `migrations.seed` (`tsx prisma/seed.ts`), and `datasource.url` from `DATABASE_URL`.
- [ ] `schema.prisma` declares `datasource` with `provider = "postgresql"` only and a `prisma-client` generator with `output = "../lib/generated/prisma"`.
- [ ] `lib/db.ts` builds a `PrismaPg` adapter and a `globalThis`-cached `PrismaClient`; it never calls `$disconnect()`.
- [ ] `lib/generated/prisma/` is gitignored and excluded from lint/typecheck noise.
- [ ] `postinstall` and `prebuild` scripts run `prisma generate`.
- [ ] All Prisma CLI usage is pinned as `npx prisma@7.10.1`.
- [ ] `npx prisma@7.10.1 validate` and `npx prisma@7.10.1 generate` succeed.
