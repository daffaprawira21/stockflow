# 02: Create product with initial stock

**What to build:** An administrator can create a product through `POST /api/products` and immediately trust its stock history. The product is created active, positive initial stock is recorded as a single `INITIAL_STOCK` movement in the same transaction, and duplicate SKUs are rejected instead of creating a second product. This ticket also introduces the Inventory participant that records the movement inside the caller's transaction, without delivering any inventory endpoint.

**Blocked by:** 01: Shared validation and money helpers

**Status:** resolved

**Implemented in:** Sprint 2 product-management implementation merged by `389cb30`.

- [x] Creating a product returns 201 with exactly the fields shown in the API contract for creation, a two-decimal price string, and `isActive` true.
- [x] SKU is trimmed and uppercased before storage, so a case-only difference such as `prd-001` versus `PRD-001` returns 409 `SKU_ALREADY_EXISTS` rather than a second product.
- [x] Positive initial stock produces exactly one `INITIAL_STOCK` movement with quantity before zero, quantity after equal to the initial stock, and the calling administrator recorded as the actor.
- [x] Product and movement commit or roll back together: a failed create leaves neither product nor movement rows.
- [x] Zero initial stock creates no movement.
- [x] Negative price, a numeric instead of string price, more than two decimals, missing initial stock, negative or fractional stock, and an empty name each return 400 `VALIDATION_ERROR` with details.
- [x] Unauthenticated calls return 401, non-ADMIN calls return 403, disallowed origins return 403, and malformed JSON returns 400.
- [x] Unit tests cover input validation and serialization; integration tests cover the scenarios above, including both atomicity cases.
