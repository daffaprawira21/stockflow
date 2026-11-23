# 03: Inventory pages — list, adjust, movement history

**What to build:** Admin inventory UI under `app/(admin)/inventory/` consuming the inventory API: list with `lowStock` filter, a manual adjustment form, and per-product movement history.

**Blocked by:** 01: Global stylesheet, route groups, admin shell, and dashboard backend

**Status:** unclaimed

- [ ] `app/(admin)/inventory/page.tsx` — server component fetching `GET /api/inventory`; table (product, SKU, stock, active) with `search`/`lowStock` filter controls; row link to movement history; "Adjust stock" entry point.
- [ ] `app/(admin)/inventory/adjust/page.tsx` — client form for `POST /api/inventory/adjustments` (product select, ADJUSTMENT_IN/ADJUSTMENT_OUT, positive integer quantity, non-empty reason); validate reason client-side before submit; map `INVALID_ADJUSTMENT` / negative-stock errors; `router.refresh()` on success.
- [ ] `app/(admin)/inventory/[productId]/movements/page.tsx` — server component (awaited `params`) fetching `GET /api/inventory/[productId]/movements` with optional `movementType` filter; table: date, type, delta, before/after, reason, order reference.
- [ ] Inactive products must remain adjustable in the UI (BR-26); do not gate the form on `isActive`.
- [ ] No new dependencies beyond the Tailwind packages added in 01; reuse global CSS classes (Tailwind utilities + component classes).
