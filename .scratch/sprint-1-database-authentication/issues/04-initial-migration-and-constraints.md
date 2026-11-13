# 04: Create the initial migration and integrity constraints

**What to build:** Generate the initial migration from the schema, then add, in a second hand-edited migration, every `CHECK` constraint Prisma cannot express.

**Blocked by:** 03.

**Status:** ready-for-agent

- [x] Initial migration is created with `migrate dev --create-only` and reviewed before applying.
- [x] A second migration adds all constraints from design §6.3: non-negative price/stock, allowed order status, positive quantities, non-negative unit price and subtotal, non-zero `quantity_delta`, non-negative before/after quantities, `quantity_after = quantity_before + quantity_delta`, movement-type sign rules, and non-empty reason for manual adjustments.
- [x] Migrations apply cleanly against an empty database with `migrate deploy`.
- [x] Re-running `migrate deploy` is idempotent.
- [x] The order-number sequence is not created in this sprint; `orders.order_number` is unique only.
- [x] A note records that Prisma does not introspect `CHECK` constraints and that later migrations must be reviewed for accidental drops.

## Comments

2026-11-13 — Implemented `20261113010349_init` (generated) and `20261113010600_add_integrity_constraints` (hand-written). Both apply cleanly with `migrate deploy`, and a second run reports "No pending migrations to apply".

Constraint behaviour was verified against the development database inside a rolled-back transaction. PostgreSQL rejected each invalid insert:

- negative `products.price`
- positive `quantity_delta` for `ORDER_CONFIRMED`
- `quantity_after <> quantity_before + quantity_delta`
- `ADJUSTMENT_IN` with a null reason
- an `orders.status` outside the allowed values

Local PostgreSQL provisioning: the machine had no usable installation (only an orphaned `C:\Program Files\PostgreSQL\15\data` directory, no binaries, no service), and the winget installer could not elevate (`0x800704c7`). Portable PostgreSQL 17.12 binaries were installed under `%LOCALAPPDATA%\stockflow\pgsql` with a cluster at `%LOCALAPPDATA%\stockflow\data`, listening on `localhost:5432`, superuser `postgres` / password `postgres`, and databases `stockflow` and `stockflow_test`. Start/stop with `pg_ctl -D %LOCALAPPDATA%\stockflow\data -l %LOCALAPPDATA%\stockflow\log\server.log start|stop`. This must be documented in `README.md` (issue 14) because `psql` is not on `PATH`.
