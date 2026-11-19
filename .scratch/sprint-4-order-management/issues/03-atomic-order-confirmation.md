# 03: Atomic order confirmation

**What to build:** `POST /api/orders/:id/confirm` confirms a PENDING order only when all item products are active and sufficiently stocked; it atomically deducts stock, creates audit movements, and records history.

**Blocked by:** 02: Idempotent order creation

**Status:** ready-for-agent

- [ ] Validate order ID and require ADMIN authentication plus allowed origin.
- [ ] Reject missing order, non-PENDING order, inactive product, and insufficient stock using contract errors.
- [ ] Lock all affected product rows in a deterministic order before validation and mutation.
- [ ] In one transaction, deduct each product stock, write `ORDER_CONFIRMED` movements, update order status/`confirmedAt`, and write `PENDING → CONFIRMED` history.
- [ ] Ensure failure rolls back stock, movements, status, timestamp, and history together.
- [ ] Test happy path, each rejection path, rollback, actor audit fields, and concurrent confirmations without negative or oversold inventory.
