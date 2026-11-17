# 02: List inventory

**What to build:** An administrator can browse current inventory through `GET /api/inventory`, filter by product text and stock threshold, and page deterministically through active and inactive products.

**Blocked by:** 01: Inventory query schemas and serializers

**Status:** ready-for-agent

- [ ] Returns fields `productId`, `sku`, `productName`, `stock`, `isActive` for active and inactive products.
- [ ] Search matches product name or SKU case-insensitively; empty trimmed search applies no filter.
- [ ] `lowStock=N` accepts integer 0–2147483647 and includes products whose stock is <= N; `lowStock=0` includes zero-stock products; omission disables threshold filtering.
- [ ] Results order by `sku ASC` with deterministic pagination; count and page metadata match returned results.
- [ ] Invalid `page`, `limit`, or `lowStock` returns 400 `VALIDATION_ERROR`; unknown query parameters are ignored.
- [ ] Unauthenticated calls return 401; authenticated non-ADMIN calls return 403.
- [ ] Integration tests cover filtering, pagination, empty results, and access control.
- [ ] No schema, migration, dependency, or approved `docs/` changes.
