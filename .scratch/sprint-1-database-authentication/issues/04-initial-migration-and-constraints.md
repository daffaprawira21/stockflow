# 04: Create the initial migration and integrity constraints

**What to build:** Generate the initial migration from the schema, then add, in a second hand-edited migration, every `CHECK` constraint Prisma cannot express.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] Initial migration is created with `migrate dev --create-only` and reviewed before applying.
- [ ] A second migration adds all constraints from design §6.3: non-negative price/stock, allowed order status, positive quantities, non-negative unit price and subtotal, non-zero `quantity_delta`, non-negative before/after quantities, `quantity_after = quantity_before + quantity_delta`, movement-type sign rules, and non-empty reason for manual adjustments.
- [ ] Migrations apply cleanly against an empty database with `migrate deploy`.
- [ ] Re-running `migrate deploy` is idempotent.
- [ ] The order-number sequence is not created in this sprint; `orders.order_number` is unique only.
- [ ] A note records that Prisma does not introspect `CHECK` constraints and that later migrations must be reviewed for accidental drops.
