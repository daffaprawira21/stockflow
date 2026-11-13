# 03: Define the eight-entity Prisma schema

**What to build:** Translate `docs/database/database-design.md` into Prisma models for `users`, `sessions`, `products`, `orders`, `order_items`, `stock_movements`, `order_status_history`, and `idempotency_records`.

**Blocked by:** 02.

**Status:** ready-for-agent

- [x] Every table uses `@@map` with the snake_case name from the design document; every multi-word column uses `@map`.
- [x] Native types match the design: `@db.Uuid`, `@db.Decimal(15, 2)`, `@db.Timestamptz(3)`, and `@db.VarChar(n)` where lengths are specified.
- [x] Primary keys use `@default(uuid(7)) @db.Uuid`.
- [x] Nullability and defaults match the design (for example `products.stock` defaults to 0, `products.is_active` defaults to true, `orders.status` has no default).
- [x] Relations use `onDelete: Restrict` and match the documented cardinalities.
- [x] Unique constraints exist for `users.email`, `products.sku`, `orders.order_number`, `sessions.token_hash`, `order_items(order_id, product_id)`, `idempotency_records(user_id, operation, idempotency_key)`, and `stock_movements(order_id, product_id, movement_type)`.
- [x] Indexes from design §7 are declared, including `products(is_active)`, `products(name)`, `orders(status, created_at)`, `orders(created_by, created_at)`, `order_items(product_id)`, `stock_movements(product_id, created_at)`, `stock_movements(order_id)`, `stock_movements(performed_by, created_at)`, `order_status_history(order_id, created_at)`, `idempotency_records(resource_id)`, and `sessions(expires_at)`.
- [x] `npx prisma@7.10.1 validate` passes.

## Comments

2026-11-13 — Implemented all eight models. Verified `prisma format`, `prisma validate`, `prisma generate`, `npm run typecheck`, `npm run lint`, and `npm run build`.

Generated SQL was inspected with `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` and confirms `UUID` columns, `DECIMAL(15,2)` for money, `TIMESTAMPTZ(3)` for every timestamp, and all unique/composite indexes.

Two deliberate deviations from a literal reading of design §7:

- `idempotency_records.resource_id` has a unique index only. Design §6 already makes it `UNIQUE`, which creates the btree index §7 asks for; adding `@@index` would duplicate it.
- `sessions.token_hash` likewise relies on its unique index for lookup, and `sessions(expires_at)` is a separate index for cleanup.

`@@unique([orderId, productId, movementType])` keeps `orderId` nullable; PostgreSQL treats NULLs as distinct, so manual adjustments without an order do not collide.

Migration and CHECK constraints remain for issue 04.
