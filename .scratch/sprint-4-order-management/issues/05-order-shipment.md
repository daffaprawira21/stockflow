# 05: Order shipment

**What to build:** `POST /api/orders/:id/ship` marks a CONFIRMED order as SHIPPED and records history without modifying inventory.

**Blocked by:** 03: Atomic order confirmation

**Status:** claimed

- [x] Validate order ID, ADMIN authentication, and allowed origin.
- [x] Allow only CONFIRMED → SHIPPED; reject missing orders and all other source states with documented errors.
- [x] Update status and `shippedAt`, then write `CONFIRMED → SHIPPED` history with authenticated actor.
- [x] Do not change stock or create stock movements.
- [x] Allow shipment of an already CONFIRMED order even after its products are deactivated.
- [x] Test transition, timestamps, history, no inventory changes, inactive products, invalid transitions, authorization, and origin errors.
