# 03: Stock movement history

**What to build:** An administrator can inspect a product's movement history through `GET /api/inventory/:productId/movements`, filter by supported movement type, and page newest-first.

**Blocked by:** 01: Inventory query schemas and serializers

**Status:** ready-for-agent

- [ ] Valid product UUID returns movement records with contract §7.2 fields and standard pagination metadata.
- [ ] Invalid UUID returns 400 `VALIDATION_ERROR`; nonexistent product returns 404 `RESOURCE_NOT_FOUND`.
- [ ] Optional `movementType` accepts only `INITIAL_STOCK`, `ORDER_CONFIRMED`, `ORDER_CANCELLED`, `ADJUSTMENT_IN`, or `ADJUSTMENT_OUT`; invalid values return 400 `VALIDATION_ERROR`.
- [ ] Pagination defaults/bounds match API contract; unknown query parameters are ignored.
- [ ] Results order by `createdAt DESC`, then `id ASC` for deterministic newest-first pagination.
- [ ] Unauthenticated calls return 401; authenticated non-ADMIN calls return 403.
- [ ] Integration tests cover type filtering, pagination, invalid/missing product, and access control.
- [ ] No schema, migration, dependency, or approved `docs/` changes.
