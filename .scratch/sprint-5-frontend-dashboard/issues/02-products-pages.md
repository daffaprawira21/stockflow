# 02: Products pages — list, create, detail/edit, deactivate

**What to build:** Admin product management UI under `app/(admin)/products/` consuming the existing product API: list with search/filter/sort/pagination, create form, and a detail page with edit + deactivate actions.

**Blocked by:** 01: Global stylesheet, route groups, admin shell, and dashboard backend

**Status:** unclaimed

- [ ] `app/(admin)/products/page.tsx` — server component fetching `GET /api/products` with request cookies; render table (SKU, name, price, stock, status, updated) + filter controls as client components that push query params (`search`, `isActive`, `sortBy`, `sortOrder`, `page`).
- [ ] `app/(admin)/products/create/page.tsx` — client form posting to `POST /api/products` (fields: sku, name, description, price, initialStock); inline validation + mapped API errors (incl. `SKU_ALREADY_EXISTS`); `router.refresh()` + redirect to list on success.
- [ ] `app/(admin)/products/[id]/page.tsx` — server component for detail (awaited `params`); shows full fields, price/stock, active badge; edit form (PATCH, SKU read-only) and deactivate action (PATCH `/deactivate`, with confirm dialog when active).
- [ ] Money rendered from decimal strings via the shared `Intl.NumberFormat` helper; dates via `Intl.DateTimeFormat` UTC.
- [ ] No new dependencies beyond the Tailwind packages added in 01; reuse `app/globals.css` Tailwind classes and `components/status-badge.tsx`.
