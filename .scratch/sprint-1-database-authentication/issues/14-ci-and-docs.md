# 14: CI workflow and documentation updates

**What to build:** A GitHub Actions workflow that runs the sprint's required checks, and documentation that lets a new developer set up the project.

**Blocked by:** 12, 13.

**Status:** ready-for-agent

- [x] `.github/workflows/ci.yml` runs on pull requests and pushes.
- [x] The workflow starts a PostgreSQL service container and provisions the test database.
- [x] It applies migrations with `npx prisma@7.10.1 migrate deploy`.
- [x] It runs `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:integration`.
- [x] E2E may be a separate job that installs Chromium and runs `npm run test:e2e`.
- [x] The workflow uses a supported Node version and caches npm dependencies.
- [x] `README.md` documents PostgreSQL setup, `.env` variables, migration, seed, and test commands.
- [x] `.env.example` matches `lib/env.ts` exactly.
- [x] The pinned Prisma version and the `npx prisma@7.10.1` rule are documented so the v8 RC footgun is not reintroduced.

## Comments

2026-11-13 — Added `.github/workflows/ci.yml`, `vitest.coverage.config.ts`, and `scripts/run-coverage.mjs`; installed `@vitest/coverage-v8`.

**CI** runs on pushes to `main` and on pull requests, with npm caching and Node 24:

- `checks`: PostgreSQL 17 service container, creates `stockflow` and `stockflow_test`, `npm ci`, `migrate deploy` against the test database, then `typecheck`, `lint`, `test`, `test:integration`, and `test:coverage`.
- `e2e`: its own PostgreSQL container plus `npx playwright install --with-deps chromium`, then `test:e2e`. The E2E server script provisions and seeds the test database itself.

The two databases are separate because the test runners refuse a `TEST_DATABASE_URL` that equals `DATABASE_URL`.

**Coverage** is measured across unit and integration tests with a hard threshold of 80% for `modules/auth`:

| Metric | Result |
| --- | --- |
| Statements | 84% |
| Branches | 80.64% |
| Functions | 95% |
| Lines | 83.67% |

`current-user.ts` is 0% because it depends on `next/headers` and is exercised only by E2E; `password.ts`, `schemas.ts`, and `service.ts` are at 100%.

**Docs**: `README.md` now documents PostgreSQL startup, `.env` setup, migration/seed/reset commands, every test command including coverage, the CI jobs, and the pinned Prisma rule. The status block and roadmap mark Sprint 0 and Sprint 1 as completed. `.env.example` lists every variable `lib/env.ts` validates.

Final verification: `typecheck`, `lint`, `npm test` (51), `test:integration` (34), `test:coverage` (85, thresholds pass), `test:e2e` (3), and `npm run build` all pass.
