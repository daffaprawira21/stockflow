# 01: Shared validation and money helpers

**What to build:** Product work needs Zod error details and decimal serialization without reaching into the auth module. This prefactor moves validation details into shared infrastructure and adds money serialization that products, and later inventory and orders, can reuse. Signing in must behave exactly as before.

**Blocked by:** None (can start immediately)

**Status:** resolved

**Implemented in:** Sprint 2 product-management implementation merged by `389cb30`; current branch also contains `1ac7bce refactor: centralize product response mapping` and local commit `14645d4 refactor: split agent instructions for progressive disclosure`.

- [x] Zod validation error details are produced by shared infrastructure, and no module imports them from the auth module.
- [x] Money values serialize to exact two-decimal strings, including whole values and values near the `Decimal(15, 2)` limit, without converting through floating point.
- [x] Unit tests cover money serialization and the shared validation detail mapping.
- [x] Login behavior is unchanged and the existing auth unit and integration tests pass without modification.
