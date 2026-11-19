# 04: Order cancellation

**What to build:** `POST /api/orders/:id/cancel` cancels PENDING or CONFIRMED orders with a non-empty reason; confirmed cancellation restores stock atomically.

**Blocked by:** 03: Atomic order confirmation

**Status:** ready-for-agent

- [ ] Validate order ID, ADMIN authentication, allowed origin, and a trimmed non-empty cancellation reason.
- [ ] Cancel PENDING order without changing product stock or creating stock movements.
- [ ] Cancel CONFIRMED order in one transaction: restore stock, create `ORDER_CANCELLED` movements, set status/`cancelledAt`, and write history with reason.
- [ ] Reject missing, SHIPPED, CANCELLED, and any otherwise invalid transition with documented errors.
- [ ] Test both eligible source states, required reason, inventory restoration exactly once, rollback, history reason, and authorization/origin errors.
