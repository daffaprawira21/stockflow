Status: ready-for-agent

# Sprint 5 — Frontend and Dashboard

## Problem Statement

Sprints 1–4 delivered a complete REST API with auth, product CRUD, inventory adjustments, order lifecycle, and audit history. The application still has no user interface beyond login/logout; administrators cannot manage products, inventory, or orders through the browser, nor can they view dashboard summaries. This sprint closes that gap with a minimal but complete admin UI built as Next.js App Router pages, styled with Tailwind CSS and a thin global stylesheet.

## Solution

Add:
- Tailwind CSS (v4) wired through `postcss.config.mjs` and imported in `app/globals.css`, plus a small set of component classes on top so pages read as readable JSX, not a soup of arbitrary utility strings.
- A dashboard backend: `modules/dashboard/service.ts` + `GET /api/dashboard/summary` (contract §9.1), with unit/integration tests and a coverage threshold entry.
- Route groups: `app/(auth)/login/page.tsx` (moved from `app/login/page.tsx`) and `app/(admin)/…` with a shell layout (left sidebar nav + user email + sign-out link) wrapping products, inventory, orders, and dashboard pages.
- Admin pages: dashboard (numeric summary cards), products (list + create + detail/edit/deactivate), inventory (list + adjust + per-product movement history), orders (list + detail + create + confirm/cancel/ship actions).

All data access goes through the existing REST API (cookie sessions are browser-native). Lists/details are server components calling the API via `fetch` with request cookies; mutation forms are client components using `fetch` + `router.refresh()` for read-your-writes. No client-side state library, no component library.

## User Stories

1. As an administrator, I want a protected shell with navigation, so that I can reach every module without re-authenticating.
2. As an administrator, I want to list, create, edit, and deactivate products in the browser, so that data entry does not require raw API calls.
3. As an administrator, I want to view stock levels, adjust stock with a reason, and review movement history, so that quantities stay accurate.
4. As an administrator, I want to create, list, inspect, confirm, cancel, and ship orders, so that the full lifecycle is usable without tooling.
5. As an administrator, I want a dashboard with product/order/stock summaries, so that I get an operational overview on landing.

## Implementation Decisions

### Styling: Tailwind CSS v4 + thin component layer

`tailwindcss@4.3.5` and `@tailwindcss/postcss@4.3.5` are installed as direct dependencies; `postcss.config.mjs` wires the plugin. `app/globals.css` (imported in `app/layout.tsx`) opens with `@import "tailwindcss";` and layers a small set of design tokens (CSS custom properties on `:root` with `@media (prefers-color-scheme: dark)` overrides guarded by `:root:not([data-theme="light"])`, plus a repeat under `:root[data-theme="dark"]`) and a handful of component classes (`.card`, `.btn`, `.field`, `.table`, `.badge-*`, `.shell`/`.sidebar`/`.main` layout). Pages prefer Tailwind utilities for one-off styling and the component classes for recurring patterns (buttons, form fields, badges, tables, cards, layout) so JSX stays readable.

- Money display: format decimal strings with `Intl.NumberFormat` in one shared helper; never parse to `number` (API already returns decimal strings per contract §1.3).
- Date display: `Intl.DateTimeFormat` UTC.
- Status badges: fixed class per status — `badge-pending` (amber), `badge-confirmed` (blue), `badge-shipped` (green), `badge-cancelled` (red).

### Route structure and auth

- Move `app/login/page.tsx` → `app/(auth)/login/page.tsx` (same URL, same client component; delete the old file). Relocate `app/logout-button.tsx` under `app/(admin)/` since only the admin shell uses it.
- `app/(admin)/layout.tsx`: server component. `await getCurrentUser()` (`modules/auth/current-user.ts`); if null, `redirect('/login')`. Renders the `.shell`/`.sidebar`/`.main` layout from `app/globals.css`, with sidebar links (Dashboard `/`, Products `/products`, Inventory `/inventory`, Orders `/orders`), user email, and a sign-out link, then `{children}`.
- `app/(admin)/page.tsx`: dashboard page (landing), replacing the current `app/page.tsx` welcome page.
- `proxy.ts` matcher unchanged: it already excludes `api`, `_next/static`, `favicon.ico`, `robots.txt`, and `login`; all admin pages fall under it and are redirected to `/login` when the cookie is absent.
- Next 16 constraints honored everywhere: `params`/`cookies`/`headers` are awaited; page `fetch` uses `cache: 'no-store'` (fetch is uncached by default in 16 anyway); no `middleware.ts` patterns; Turbopack default — `postcss.config.mjs` is picked up automatically by the build pipeline.

### Page pattern

Each admin page = server component that fetches its own API endpoint:

```ts
const res = await fetch('/api/products?page=1', {
  cache: 'no-store',
  headers: { cookie: (await cookies()).toString() },
});
```

On `!res.ok` or 401: `redirect('/login')` (session may have expired server-side while a cookie still exists — the proxy only checks presence). Render the list/table plus form components as children.

List/filter controls are small client components that call `router.push('/products?search=…')` — URL-driven state, no React state store.

### Mutation forms

Client components, one per action, colocated in the same folder (`create-product-form.tsx`, `adjust-stock-form.tsx`, `order-actions.tsx`, `create-order-form.tsx`, etc.):

- `fetch('/api/…', { method, body, headers: { 'Content-Type': 'application/json' } })` — cookies are sent automatically; add `Idempotency-Key: crypto.randomUUID()` only for `POST /api/orders`.
- Success → `router.refresh()` (re-renders the server component that owns the data). Failure → show the API error message inline (read `error.message` / `error.details` from the standard envelope; map `SKU_ALREADY_EXISTS`, `INSUFFICIENT_STOCK`, `INVALID_ORDER_STATE` to readable text via a shared `lib/api-error.ts` message map).
- No optimistic UI, no retries.

### Dashboard backend (contract §9.1)

- `modules/dashboard/service.ts`: `getDashboardSummary(prisma)` returning `{ totalProducts, activeProducts, totalOrders, pendingOrders, confirmedOrders, shippedOrders, cancelledOrders, totalInventoryUnits }` via Prisma `count`/`sum` over `product`, `order` (grouped by status), and `product.stock`.
- `app/api/dashboard/summary/route.ts`: `requireAdmin(prisma, request)` guard, then `jsonSuccess(data)` — same pattern as every other route.
- No new Prisma model, no migration (counts are aggregates over existing tables).
- Tests: `tests/unit/dashboard-service.test.ts` (mock Prisma client, assert query shape) and `tests/integration/dashboard-summary-api.test.ts` (auth required, summary reflects seeded data, per-status counts). Coverage config: add `'modules/dashboard/**/*.ts'` to `include` + 80% thresholds, mirroring the four existing module entries — thresholds unchanged, no file exclusions.

### Shared helpers

- `components/status-badge.tsx` — the only shared component besides `logout-button.tsx`: renders a `<span class="badge badge-{status}">` from an `OrderStatus` (reused for product active/inactive via a `product-badge` variant or a plain prop).
- `lib/api-error.ts` — maps API error codes to user-facing messages (mirrors `lib/api/errors.ts` `DEFAULT_ERROR_MESSAGES`; single source of truth on the server side, duplicated minimally on the client side for offline forms).

### E2E

The Sprint 4 spec deferred order-UI E2E "until an order UI exists" — that condition is now met. This sprint adds Playwright specs (in `tests/`, `*.spec.ts` so the existing testMatch picks them up):

- `dashboard.spec.ts` — login lands on dashboard with summary cards; unauthenticated visit redirects to `/login`.
- `products.spec.ts` — create a product, see it in the list, edit, deactivate; duplicate SKU shows the inline error.
- `inventory.spec.ts` — adjust stock in/out with reason; movement history row appears; adjustment without reason is rejected.
- `orders.spec.ts` — create order (idempotency key exercised), confirm, cancel, ship across a small scripted lifecycle; invalid transition shows the mapped error.

Reuse the existing harness: `scripts/start-e2e-server.mjs` against `stockflow_test`, `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars, the factories in `tests/helpers/factories.ts` where applicable.

## Dependencies Added This Sprint

Tailwind CSS v4 is a deliberate new dependency, approved for this sprint:

| Package | Version | Role |
| --- | --- | --- |
| `tailwindcss` | `^4.3.5` | Styling runtime, pulled in via `@import "tailwindcss"` in `app/globals.css` |
| `@tailwindcss/postcss` | `^4.3.5` | PostCSS plugin that compiles Tailwind into the global stylesheet |
| `postcss` | `^8.5.33` | Host runtime for the PostCSS pipeline |

No other dependencies, devDependencies, or `allowScripts` entries are added. No new Prisma migrations, schema changes, or approved-document edits.

## Out of Scope

- Charts/graphs on the dashboard (numeric cards only, per FR-47 "summaries").
- Customer-facing flows, roles other than ADMIN, returns/refunds.
- Bulk operations, import/export.
- New Prisma migrations or schema changes.
- Editing approved `docs/` sources.
- Rate limiting, CSRF tokens (documented MVP limits, contract §3.3/§12).

## Testing Decisions

- Unit: dashboard service (mock client), API error message map.
- Integration: dashboard endpoint (auth + correctness against seeded state); no other new backend behavior.
- Coverage gate: `modules/dashboard` joins the existing per-module 80% thresholds; all four previous module entries untouched.
- E2E: the four new specs above; existing `auth.spec.ts` and `home.spec.ts` must keep passing — note `home.spec.ts` asserts the visitor redirect flow, which survives the login move (`/login` URL unchanged); update its assertions if it referenced the old page path.
- Run full set: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run test:coverage`, `npm run test:e2e`, `npm run perf:budget` (budget covers `/login` only — the new stylesheet is tiny; keep global CSS under the headroom).

## Definition of Done

- `GET /api/dashboard/summary` implemented, tested, and covered by the 80% gate.
- Admin shell with sidebar navigation protects all admin pages via the existing proxy + `getCurrentUser()` redirect.
- Products, inventory, and orders are fully manageable through the UI (list/create/edit/deactivate; adjust/history; create/confirm/cancel/ship).
- Dashboard page renders live summary cards from the API.
- New E2E specs cover the core workflows; all existing specs pass.
- README status block updated to "Sprint 5 complete" and the roadmap row marked completed; this spec's `Status:` line set to `done` with verification results appended.
- No `docs/` edits. The only dependency additions are the Tailwind packages listed above.

## Issue Breakdown

| Issue | Title | Blocked by |
| ----- | ----- | ---------- |
| `01` | Tailwind wiring, global stylesheet, route groups, admin shell, and dashboard backend | — |
| `02` | Products pages (list, create, detail/edit/deactivate) | `01` |
| `03` | Inventory pages (list, adjust, movement history) | `01` |
| `04` | Orders pages (list, detail, create, transitions) | `01` |
| `05` | Dashboard page, home wiring, and logout-button relocation | `01` |
| `06` | E2E specs for the new UI flows | `02`, `03`, `04`, `05` |
| `07` | Coverage gate, full verification, and sprint documentation | `02`, `03`, `04`, `05`, `06` |

Recommended order: `01` → `02` → `03` → `04` → `05` → `06` → `07`.

## Source of Truth

- `docs/api/api-contract.md` §1–§3, §6–§9 (envelopes, auth, products, inventory, orders, dashboard).
- `docs/requirements/srs.md` FR-08…FR-48, §7–§8.
- `docs/research/nextjs-16-api-surface.md` — Next 16 constraints (async `params`/`cookies`, proxy, uncached fetch).
- `docs/testing/testing-strategy.md` §2–§3.
- `.scratch/sprint-4-order-management/spec.md` (deferred order-UI E2E condition now met).

If implementation uncovers a conflict with approved documents, stop and report the discrepancy before changing this spec or choosing a resolution.
