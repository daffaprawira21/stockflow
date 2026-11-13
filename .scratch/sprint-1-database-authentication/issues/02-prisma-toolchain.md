# 02: Set up the Prisma 7.10.1 toolchain

**What to build:** Install pinned Prisma 7 packages, configure the CLI through `prisma7.config.ts`, generate the client into `lib/generated/prisma`, and expose a singleton client using the PostgreSQL driver adapter.

**Blocked by:** 01.

**Status:** ready-for-agent

- [x] `prisma@7.10.1` (dev), `@prisma/client@7.10.1`, `@prisma/adapter-pg@7.10.1`, and `pg` are installed with exact pins where specified; `package-lock.json` is updated.
- [x] `prisma7.config.ts` imports `dotenv/config`, sets `schema`, `migrations.path`, `migrations.seed` (`tsx prisma/seed.ts`), and `datasource.url` from `DATABASE_URL`.
- [x] `schema.prisma` declares `datasource` with `provider = "postgresql"` only and a `prisma-client` generator with `output = "../lib/generated/prisma"`.
- [x] `lib/db.ts` builds a `PrismaPg` adapter and a `globalThis`-cached `PrismaClient`; it never calls `$disconnect()`.
- [x] `lib/generated/prisma/` is gitignored and excluded from lint/typecheck noise.
- [x] `postinstall` and `prebuild` scripts run `prisma generate`.
- [x] All Prisma CLI usage is pinned as `npx prisma@7.10.1`.
- [x] `npx prisma@7.10.1 validate` and `npx prisma@7.10.1 generate` succeed.

## Comments

2026-11-13 — Implemented. `validate` reports the schema is valid and `generate` writes the client to `lib/generated/prisma`. `npm run typecheck`, `npm run lint`, and `npm run build` pass; the `prebuild` hook regenerates the client.

Notes for later work:

- `prisma generate` prints an "Update available 7.10.1 -> 8.0.0-rc.33" banner. This is the v8 release candidate published under the `latest` dist-tag. It must be ignored; upgrading would replace the CLI with one that has no `migrate`/`generate` commands.
- `prisma7.config.ts` falls back to a placeholder connection string when `DATABASE_URL` is absent so that `generate` works before PostgreSQL exists. Migrations still fail clearly if the URL is unreachable.
- `allowScripts` now includes `prisma@7.10.1` and `@prisma/engines@7.10.1` so npm does not block their install scripts on a fresh install.
- ESLint ignores `lib/generated/**`.
