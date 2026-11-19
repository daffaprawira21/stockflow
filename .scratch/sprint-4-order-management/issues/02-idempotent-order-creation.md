# 02: Idempotent order creation

**What to build:** `POST /api/orders` creates a PENDING order with consolidated items, price snapshots, decimal-safe totals, initial history, PostgreSQL-generated order number, and atomic idempotency behavior.

**Blocked by:** 01: Order number sequence and read foundations

**Status:** claimed

- [x] Require a non-empty `Idempotency-Key` header and validate request items, UUID product IDs, and positive integer quantities.
- [x] Consolidate duplicate product IDs before product lookup and persistence.
- [x] Reject missing or inactive products with documented errors.
- [x] Obtain a value from `order_number_sequence` and format `ORD-<UTC-year>-<6-digit>`.
- [x] Snapshot current product prices; calculate item subtotals and total with decimal-safe arithmetic.
- [x] Create PENDING order, order items, initial `NULL → PENDING` status history, and idempotency record atomically; stock remains unchanged.
- [x] Implement completed same-payload replay, same-key different-payload conflict, and in-progress conflict.
- [x] Test authentication, origin, validation, consolidation, price snapshots, idempotency, transactions, and concurrent same-key requests.
