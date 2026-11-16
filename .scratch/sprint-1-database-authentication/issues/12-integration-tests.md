# 12: Integration tests for authentication and database constraints

**What to build:** Database-backed tests that prove authentication flows and inventory integrity constraints behave correctly.

**Blocked by:** 05, 09.

**Status:** ready-for-agent

- [x] Login with valid credentials creates a session row and returns the user without exposing the password hash.
- [x] Login with a wrong password and with an unknown email both return 401 and set no cookie.
- [x] An expired session is rejected with 401 `UNAUTHENTICATED`.
- [x] Logout deletes the session row and clears the cookie.
- [x] Login cleanup deletes expired sessions and preserves unexpired ones.
- [x] `GET /api/auth/me` returns the administrator for a valid session and 401 without one.
- [x] Inserting `products.stock < 0` and `products.price < 0` fails at the database.
- [x] Inserting an `order_items.quantity <= 0` fails at the database.
- [x] Inserting a stock movement with the wrong sign for its `movement_type` fails at the database.
- [x] Inserting a stock movement where `quantity_after <> quantity_before + quantity_delta` fails at the database.
- [x] Inserting a manual adjustment without a reason fails at the database.
- [x] `npm run test:integration` passes against `stockflow_test`.

## Comments

2026-11-13 — Added `tests/integration/auth-api.test.ts` (12 tests) and `tests/integration/constraints.test.ts` (13 tests). The existing harness (3) and session (6) suites remain, for 34 integration tests in total.

Route handlers are invoked directly with Web `Request` objects, so the tests exercise the real handlers, Zod validation, guard, and Prisma without starting a server.

Verified behaviour:

- Successful login returns the documented envelope, persists a session whose `token_hash` matches the SHA-256 of the returned cookie, and never echoes the password hash.
- Wrong password and unknown email produce byte-identical 401 bodies and no `Set-Cookie`.
- Invalid payload returns 400 with validation details; a missing `Origin` returns 403.
- Login removes expired sessions while keeping live ones.
- `me` succeeds with a live session and returns 401 for missing, expired, and unknown sessions.
- Logout deletes the session row, returns `Max-Age=0`, and makes the old token unusable.
- The database rejects negative price, negative stock, non-positive quantity, negative unit price, wrong movement-type sign, zero delta, inconsistent balance, missing/blank adjustment reason, unknown order status, and negative order total. A valid movement is accepted as a control.

`npm run test:integration` (34 tests), `npm test` (51 tests), `npm run typecheck`, and `npm run lint` pass.
