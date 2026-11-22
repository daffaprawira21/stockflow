# 01: Tailwind wiring, global stylesheet, route groups, admin shell, and dashboard backend

**What to build:** The shared visual foundation and auth-protected navigation shell every admin page builds on, plus the `GET /api/dashboard/summary` endpoint from contract §9.1 with its service, route handler, unit test, integration test, and coverage-gate entry. Tailwind CSS is introduced as the styling system of record for the admin UI.

**Blocked by:** —

**Status:** resolved

**Implemented in:** Sprint 5 commit `fb58417` on `main`.

- [x] Install Tailwind CSS: `tailwindcss@^4.3.5`, `@tailwindcss/postcss@^4.3.5`, and `postcss@^8.5.33` as direct dependencies in `package.json` (and `package-lock.json`).
- [x] Add `postcss.config.mjs` exporting `{ plugins: { '@tailwindcss/postcss': {} } }`.
- [x] Add `app/globals.css` starting with `@import "tailwindcss";`, then: CSS custom-property design tokens on `:root` (with `@media (prefers-color-scheme: dark)` overrides guarded by `:root:not([data-theme="light"])` and a repeat under `:root[data-theme="dark"]`); component classes `.card`, `.btn` (variants: `-primary`, `-danger`), `.field`, `.table`, `.badge-*` (pending/confirmed/shipped/cancelled/active/inactive); admin shell layout `.shell`, `.sidebar`, `.main`; `.summary-grid`/`.summary-card`; `.form-error`/`.form-success`.
- [x] Import `app/globals.css` from `app/layout.tsx` so every page gets the Tailwind pipeline and component classes.
- [ ] Move `app/login/page.tsx` to `app/(auth)/login/page.tsx` (same URL, same component; delete the old file).
- [ ] Create `app/(admin)/layout.tsx`: server component; `await getCurrentUser()`; redirect to `/login` when null; render the `.shell`/`.sidebar`/`.main` layout with left sidebar (Dashboard `/`, Products `/products`, Inventory `/inventory`, Orders `/orders`), user email, sign-out link; render `{children}`.
- [ ] Relocate `app/logout-button.tsx` under `app/(admin)/` and reference it from the shell.
- [ ] Implement `modules/dashboard/service.ts` (`getDashboardSummary` via Prisma count/sum over products and orders by status) and `app/api/dashboard/summary/route.ts` using the existing `requireAdmin` + `jsonSuccess` pattern.
- [ ] Add `tests/unit/dashboard-service.test.ts` and `tests/integration/dashboard-summary-api.test.ts`.
- [ ] Extend `vitest.coverage.config.ts` with a `modules/dashboard` entry at the existing 80% thresholds; do not change the four existing module entries.
- [ ] No migrations, no `docs/` edits, no `proxy.ts` matcher change. The only dependency additions allowed in this ticket are the three Tailwind packages above.
