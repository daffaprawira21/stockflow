# 12: Integration tests for authentication and database constraints

**What to build:** Database-backed tests that prove authentication flows and inventory integrity constraints behave correctly.

**Blocked by:** 05, 09.

**Status:** ready-for-agent

- [ ] Login with valid credentials creates a session row and returns the user without exposing the password hash.
- [ ] Login with a wrong password and with an unknown email both return 401 and set no cookie.
- [ ] An expired session is rejected with 401 `UNAUTHENTICATED`.
- [ ] Logout deletes the session row and clears the cookie.
- [ ] Login cleanup deletes expired sessions and preserves unexpired ones.
- [ ] `GET /api/auth/me` returns the administrator for a valid session and 401 without one.
- [ ] Inserting `products.stock < 0` and `products.price < 0` fails at the database.
- [ ] Inserting an `order_items.quantity <= 0` fails at the database.
- [ ] Inserting a stock movement with the wrong sign for its `movement_type` fails at the database.
- [ ] Inserting a stock movement where `quantity_after <> quantity_before + quantity_delta` fails at the database.
- [ ] Inserting a manual adjustment without a reason fails at the database.
- [ ] `npm run test:integration` passes against `stockflow_test`.
