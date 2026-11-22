# 06: E2E specs for the new UI flows

**What to build:** Playwright end-to-end coverage for the admin UI added in tickets 02–05, satisfying the Sprint 4 deferred condition ("no new order E2E specs until an order UI exists").

**Blocked by:** 02: Products pages; 03: Inventory pages; 04: Orders pages; 05: Dashboard page and home wiring

**Status:** unclaimed

- [ ] Add `tests/dashboard.spec.ts` — login lands on dashboard summary cards; unauthenticated visit to an admin page redirects to `/login`.
- [ ] Add `tests/products.spec.ts` — create a product (visible in list), edit it, deactivate it; duplicate SKU surfaces the mapped inline error.
- [ ] Add `tests/inventory.spec.ts` — adjust stock in/out with reason; the movement history row appears; adjustment without a reason is rejected.
- [ ] Add `tests/orders.spec.ts` — create an order, confirm it, cancel or ship it; an invalid transition surfaces the mapped error.
- [ ] Reuse the existing harness (`scripts/start-e2e-server.mjs`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `tests/helpers/factories.ts`); specs live under `tests/` matching the `**/*.spec.ts` testMatch.
- [ ] Existing `auth.spec.ts` and `home.spec.ts` keep passing; update `home.spec.ts` assertions only if it referenced the moved `/login` path (URL is unchanged).
- [ ] No new dependencies; no changes to the existing API or backend behavior.
