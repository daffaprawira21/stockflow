# 05: Order shipment

**What to build:** `POST /api/orders/:id/ship` marks a CONFIRMED order as SHIPPED and records history without modifying inventory.

**Blocked by:** 03: Atomic order confirmation

**Status:** ready-for-agent

- [ ] Validate order ID, ADMIN authentication, and allowed origin.
- [ ] Allow only CONFIRMED → SHIPPED; reject missing orders and all other source states with documented errors.
- [ ] Update status and `shippedAt`, then write `CONFIRMED → SHIPPED` history with authenticated actor.
- [ ] Do not change stock or create stock movements.
- [ ] Allow shipment of an already CONFIRMED order even after its products are deactivated.
- [ ] Test transition, timestamps, history, no inventory changes, inactive products, invalid transitions, authorization, and origin errors.
