# 09: Add the authentication API endpoints and request guard

**What to build:** `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`, plus the shared guard and origin check they rely on.

**Blocked by:** 06, 07, 08.

**Status:** ready-for-agent

- [ ] `POST /api/auth/login` validates the body with Zod, verifies credentials, creates a session, and sets the cookie.
- [ ] Unknown email and wrong password both return HTTP 401 `UNAUTHENTICATED` with an identical message and no cookie.
- [ ] Successful login returns `{ success: true, data: { user: { id, email, role } }, meta: null }`.
- [ ] `POST /api/auth/logout` requires a session, deletes the record, clears the cookie, and returns the documented success envelope.
- [ ] `GET /api/auth/me` returns the authenticated administrator or 401 `UNAUTHENTICATED`.
- [ ] `lib/api/guard.ts` exposes a `requireAdmin` helper that reads the cookie, validates the session, and returns a typed result instead of throwing into the handler.
- [ ] `lib/api/origin.ts` rejects `POST`/`PATCH`/`DELETE` requests whose `Origin` is not allowed, returning 403 `FORBIDDEN`.
- [ ] Handlers never leak database errors; unexpected failures return 500 `INTERNAL_SERVER_ERROR`.
- [ ] No business logic lives in the route handlers; they delegate to `modules/auth/service.ts`.
