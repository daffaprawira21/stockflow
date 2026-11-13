# 11: Unit tests for authentication modules

**What to build:** Vitest coverage for the pure and near-pure authentication logic.

**Blocked by:** 06, 07, 08.

**Status:** ready-for-agent

- [x] Password hashing and verification, including the unknown-user dummy-hash path.
- [x] Session token hashing is deterministic and never stores the raw token.
- [x] Session expiry boundary: valid before `expiresAt`, invalid at and after it.
- [x] Login request schema rejects missing email, malformed email, and empty password.
- [x] Origin validation accepts the configured origin and rejects foreign or missing origins as designed.
- [x] Response envelope and error mapping produce the exact contract shapes.
- [x] Tests run without a database connection.
- [x] `npm test` passes.

## Comments

2026-11-13 — Added `tests/unit/auth-schemas.test.ts` (7 tests) and `tests/unit/guard.test.ts` (7 tests), complementing the existing password, session, origin, and envelope suites.

- Login schema: valid input, casing/whitespace normalization, missing email, malformed email, empty password, non-string password, and `validationDetails` mapping.
- Guard parsing: token extraction among unrelated cookies, missing header, absent cookie, percent-decoding, trailing `=`, custom `SESSION_COOKIE_NAME`, and malformed segments.

The email field now trims and lowercases before validation (`z.preprocess` around `z.email()`), because `z.email()` rejects surrounding whitespace before any transform would run.

`modules/auth/service.ts` remains covered by integration tests rather than unit tests, because its behaviour is database-driven.

`npm test` — 51 tests pass across 7 files, with no database connection. `npm run typecheck` and `npm run lint` pass.
