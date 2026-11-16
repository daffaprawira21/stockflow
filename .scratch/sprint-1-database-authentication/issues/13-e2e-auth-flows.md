# 13: End-to-end authentication flows

**What to build:** Playwright tests for the administrator's authentication journey.

**Blocked by:** 05, 10.

**Status:** ready-for-agent

- [x] An unauthenticated visit to a protected page redirects to `/login`.
- [x] Logging in with seeded credentials reaches the authenticated page and shows the administrator's email.
- [x] Logging in with invalid credentials stays on `/login` and shows a generic error.
- [x] Logging out returns to `/login`.
- [x] After logout, revisiting the protected page redirects to `/login`.
- [x] The suite uses the dedicated PostgreSQL test database and a seeded administrator.
- [x] `npm run test:e2e` passes.

## Comments

2026-11-13 — Added `tests/auth.spec.ts` (2 tests) alongside the existing redirect test, plus `scripts/start-e2e-server.mjs`.

Isolation: the Playwright `webServer` runs that script, which refuses a `TEST_DATABASE_URL` that is missing, is not `stockflow_test`, or equals `DATABASE_URL`; applies migrations with `prisma@7.10.1 migrate deploy`; runs `prisma/seed.ts`; then starts `next dev` with `DATABASE_URL` pointed at the test database. `reuseExistingServer` is `false`, so a stray dev server on port 3000 cannot leak the development database into E2E.

Two adjustments were needed after the first run:

- The default 5s expect timeout was too short because `next dev` compiles the login route on its first request. `expect.timeout` is now 15s.
- `getByRole('alert')` also matched Next's route announcer, so the invalid-credentials assertion now uses `getByText('Invalid email or password')`.

Result: 3 E2E tests pass — unauth redirect, full sign-in/see-account/sign-out, and invalid credentials. Port 3000 was confirmed free afterwards, and the development database was never touched by the E2E run.
