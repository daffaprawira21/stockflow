# 06: Deactivate product

**What to build:** An administrator can retire a product through `PATCH /api/products/:id/deactivate` without deleting its history. The operation is safe to retry, so a repeated request or a refreshed page never produces an error.

**Blocked by:** 04: Product detail

**Status:** resolved

**Implemented in:** Sprint 2 product-management implementation merged by `389cb30`.

- [x] Deactivating an active product returns 200 with the full product representation showing it inactive, and the row still exists afterwards.
- [x] Deactivating an already inactive product returns 200 again with the same representation.
- [x] Stock, price, SKU, and description are unaffected by deactivation.
- [x] An unknown product returns 404 and a malformed identifier returns 400.
- [x] Unauthenticated calls return 401, non-ADMIN calls return 403, and disallowed origins return 403.
- [x] Integration tests cover each case above, including the repeated request.
