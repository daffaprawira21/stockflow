# 05: Provision the PostgreSQL test database harness

**What to build:** A repeatable test database setup so integration and concurrency tests run against a real PostgreSQL instance.

**Blocked by:** 04.

**Status:** ready-for-agent

- [x] `stockflow_test` is created locally and documented in `README.md`.
- [x] `TEST_DATABASE_URL` drives test connections; tests never read `DATABASE_URL`.
- [x] A global setup applies migrations with `npx prisma@7.10.1 migrate deploy`.
- [x] A truncation helper clears tables between tests without deleting schema or migrations.
- [x] Test data factories exist for `createTestAdmin`, `createTestProduct`, and `createTestOrder`, per the testing strategy.
- [x] A dedicated reset script sets `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` only for the test database and refuses to run against other databases.
- [x] Concurrency tests can create independent clients and transactions.
- [x] `npm run test:integration` runs the suite against `stockflow_test`.

## Comments

2026-11-13 — Implemented:

- `scripts/run-integration-tests.mjs` loads `.env`, refuses a `TEST_DATABASE_URL` that does not contain `stockflow_test` or that equals `DATABASE_URL`, then runs Vitest with `DATABASE_URL` set to the test URL because the Prisma CLI only reads `DATABASE_URL`.
- `vitest.integration.config.ts` runs `tests/integration/**`, applies migrations through `tests/integration/global-setup.ts`, disables file parallelism, and uses 30s timeouts.
- `tests/helpers/db.ts` exposes `createTestPrismaClient` (prefers `TEST_DATABASE_URL`) and `truncateAll` (single `TRUNCATE ... RESTART IDENTITY CASCADE`).
- `tests/helpers/factories.ts` provides `createTestAdmin`, `createTestProduct`, and `createTestOrder`.
- `scripts/reset-test-db.mjs` sets `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` only for the guarded test database.
- Unit tests exclude `tests/integration/**`, so `npm test` stays database-free.

Verified `npm run test:integration` (3 harness tests, migrations applied), `npm run db:reset:test`, `npm test`, `npm run typecheck`, and `npm run lint`.

Note: the Prisma CLI has no `TEST_DATABASE_URL` concept, so the runner maps it onto `DATABASE_URL` for the migration step; application-side test helpers read `TEST_DATABASE_URL` first and still guard on the database name.
