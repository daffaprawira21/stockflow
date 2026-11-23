# 04: Orders pages — list, create, detail, transitions

**What to build:** Admin order UI under `app/(admin)/orders/` consuming the orders API: list with status/search/sort filters, an order creation form, and a detail page with items, price snapshots, status history, and confirm/cancel/ship actions.

**Blocked by:** 01: Global stylesheet, route groups, admin shell, and dashboard backend

**Status:** unclaimed

- [ ] `app/(admin)/orders/page.tsx` — server component fetching `GET /api/orders`; table (orderNumber, status badge, total, created) with `status`/`search`/`sortBy` controls; "Create order" link.
- [ ] `app/(admin)/orders/create/page.tsx` — client form for `POST /api/orders`: line items (product select + quantity, add/remove rows); sends `Idempotency-Key: crypto.randomUUID()`; map errors (`PRODUCT_INACTIVE`, `IDEMPOTENCY_*`); on success redirect to the new order's detail.
- [ ] `app/(admin)/orders/[id]/page.tsx` — server component (awaited `params`) fetching `GET /api/orders/[id]`; shows items with unit price/subtotal snapshots, total, `statusHistory` timeline, and status badge.
- [ ] `order-actions` client component: Confirm (POST `/confirm`, PENDING only), Cancel (POST `/cancel` with required non-empty reason, PENDING or CONFIRMED), Ship (POST `/ship`, CONFIRMED only); buttons enabled per current status; map `ORDER_CONFLICT` / `INVALID_ORDER_STATE` / `INSUFFICIENT_STOCK` errors; `router.refresh()` on success.
- [ ] Deactivated products do not block the Ship action in the UI (BR-22); do not gate on product `isActive`.
- [ ] No new dependencies beyond the Tailwind packages added in 01; reuse global CSS classes (Tailwind utilities + component classes) and `components/status-badge.tsx`.
