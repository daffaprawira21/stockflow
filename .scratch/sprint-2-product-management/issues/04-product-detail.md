# 04: Product detail

**What to build:** An administrator can open one product through `GET /api/products/:id` and see its complete current state, including description and timestamps. This is also the read path used to verify what creation and later updates actually persisted.

**Blocked by:** 02: Create product with initial stock

**Status:** resolved

**Implemented in:** Sprint 2 product-management implementation merged by `389cb30`.

- [x] A known product returns 200 with the full product representation, including description, two-decimal price string, current stock, activity flag, and both timestamps.
- [x] An unknown product identifier returns 404 `RESOURCE_NOT_FOUND`.
- [x] A malformed identifier returns 400 `VALIDATION_ERROR` instead of a database error.
- [x] Inactive products remain readable through this endpoint.
- [x] Unauthenticated calls return 401 and non-ADMIN calls return 403.
- [x] Integration tests cover each case above.
