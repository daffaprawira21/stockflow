# 04: Atomic manual stock adjustments

**What to build:** An administrator can increase or decrease stock through `POST /api/inventory/adjustments`; each valid adjustment changes the balance and records an auditable movement atomically, including under concurrent requests.

**Blocked by:** 01: Inventory query schemas and serializers

**Status:** ready-for-agent

- [ ] Valid request creates either `ADJUSTMENT_IN` with positive delta or `ADJUSTMENT_OUT` with negative delta and returns HTTP 201 with exactly contract §7.3 fields.
- [ ] Reason is trimmed and non-empty; invalid body returns 400 `VALIDATION_ERROR`.
- [ ] Active and inactive products can be adjusted; missing product returns 404 `RESOURCE_NOT_FOUND`.
- [ ] Resulting negative balance or balance above 2147483647 returns 422 `INVALID_ADJUSTMENT`.
- [ ] Product balance update and exactly one movement insert occur in one Inventory Application Service-owned transaction; failures roll back both.
- [ ] Movement `quantityBefore`, `quantityAfter`, `quantityDelta`, `orderId`, `performedBy`, and reason satisfy database constraints; `performedBy` comes from the authenticated administrator's session, never client input.
- [ ] Integration test verifies the movement actor matches the authenticated administrator.
- [ ] Concurrent adjustments preserve balance/movement consistency and never allow negative stock; integration tests cover parallel increases and conflicting decreases.
- [ ] Unauthenticated calls return 401; authenticated non-ADMIN calls return 403; disallowed/missing origin returns 403.
- [ ] No schema, migration, dependency, or approved `docs/` changes.
