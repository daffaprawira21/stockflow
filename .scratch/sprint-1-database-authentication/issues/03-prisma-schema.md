# 03: Define the eight-entity Prisma schema

**What to build:** Translate `docs/database/database-design.md` into Prisma models for `users`, `sessions`, `products`, `orders`, `order_items`, `stock_movements`, `order_status_history`, and `idempotency_records`.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] Every table uses `@@map` with the snake_case name from the design document; every multi-word column uses `@map`.
- [ ] Native types match the design: `@db.Uuid`, `@db.Decimal(15, 2)`, `@db.Timestamptz(3)`, and `@db.VarChar(n)` where lengths are specified.
- [ ] Primary keys use `@default(uuid(7)) @db.Uuid`.
- [ ] Nullability and defaults match the design (for example `products.stock` defaults to 0, `products.is_active` defaults to true, `orders.status` has no default).
- [ ] Relations use `onDelete: Restrict` and match the documented cardinalities.
- [ ] Unique constraints exist for `users.email`, `products.sku`, `orders.order_number`, `sessions.token_hash`, `order_items(order_id, product_id)`, `idempotency_records(user_id, operation, idempotency_key)`, and `stock_movements(order_id, product_id, movement_type)`.
- [ ] Indexes from design §7 are declared, including `products(is_active)`, `products(name)`, `orders(status, created_at)`, `orders(created_by, created_at)`, `order_items(product_id)`, `stock_movements(product_id, created_at)`, `stock_movements(order_id)`, `stock_movements(performed_by, created_at)`, `order_status_history(order_id, created_at)`, `idempotency_records(resource_id)`, and `sessions(expires_at)`.
- [ ] `npx prisma@7.10.1 validate` passes.
