# 01: Inventory query schemas and serializers

**What to build:** Shared Inventory input schemas and response mapping for inventory list, movement history, and manual adjustment endpoints, matching Sprint 3 spec and API contract §7.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] List query validates `page` (default 1, >= 1), `limit` (default 10, 1–100), optional trimmed `search`, and optional integer `lowStock` from 0 through 2147483647.
- [ ] Movement query validates pagination and optional `movementType` against `INITIAL_STOCK`, `ORDER_CONFIRMED`, `ORDER_CANCELLED`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`.
- [ ] Adjustment body requires UUID `productId`, `ADJUSTMENT_IN` or `ADJUSTMENT_OUT`, positive integer quantity, and trimmed non-empty reason.
- [ ] Unknown query parameters are ignored; invalid values produce standard `400 VALIDATION_ERROR` details.
- [ ] Response mapping preserves exact contract fields, integer values, nullable orderId/reason, and ISO timestamps where applicable.
- [ ] Unit tests cover defaults, valid/invalid boundaries, trimming, type values, and serialization.
- [ ] No schema, migration, dependency, or approved `docs/` changes.
