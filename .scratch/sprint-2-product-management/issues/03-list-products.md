# 03: List products

**What to build:** An administrator can browse the catalogue through `GET /api/products`, narrowing it by text and activity, ordering it, and paging through it without seeing the same product twice or losing one between pages.

**Blocked by:** 02: Create product with initial stock

**Status:** resolved

**Implemented in:** Sprint 2 product-management implementation merged by `389cb30`.

- [x] Search matches product name or SKU case-insensitively, and an empty search term applies no filter.
- [x] The activity filter returns only active or only inactive products when provided; when omitted, both appear.
- [x] Every allowed sort field works in both directions, and the default ordering is newest first.
- [x] Products sharing a sort value appear in a stable order, and paging never duplicates or skips a product.
- [x] Pagination metadata reports page, limit, total items, and total pages consistently with the returned page.
- [x] Invalid page, limit, sort field, sort order, or activity values return 400 `VALIDATION_ERROR`, while unknown query parameters are ignored.
- [x] Unauthenticated calls return 401 and non-ADMIN calls return 403.
- [x] Integration tests cover every product list scenario in the API contract's testing requirements, and unit tests cover query parsing and defaults.
