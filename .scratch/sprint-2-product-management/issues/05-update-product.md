# 05: Update product

**What to build:** An administrator can correct a product through `PATCH /api/products/:id` without being able to rewrite its identity or its stock. Only the fields sent are changed, and attempts to change SKU, stock, or activity through this endpoint are rejected loudly rather than ignored.

**Blocked by:** 04: Product detail

**Status:** resolved

**Implemented in:** Sprint 2 product-management implementation merged by `389cb30`.

- [x] Updating name, description, or price changes only the provided fields; SKU, stock, and creation timestamp are untouched, and the update timestamp advances.
- [x] Sending a null description clears it.
- [x] Price and name can be updated while the product is inactive.
- [x] Sending SKU, stock, activity, or any unknown field returns 400 `VALIDATION_ERROR`, and so does an empty body object.
- [x] An unknown product returns 404, a malformed identifier returns 400, and malformed JSON returns 400.
- [x] Unauthenticated calls return 401, non-ADMIN calls return 403, and disallowed origins return 403.
- [x] Unit tests cover update validation strictness; integration tests cover each case above and confirm stock is unchanged by reading the product back.
