# 09: Add the authentication API endpoints and request guard

**What to build:** `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`, plus the shared guard and origin check they rely on.

**Blocked by:** 06, 07, 08.

**Status:** ready-for-agent

- [x] `POST /api/auth/login` validates the body with Zod, verifies credentials, creates a session, and sets the cookie.
- [x] Unknown email and wrong password both return HTTP 401 `UNAUTHENTICATED` with an identical message and no cookie.
- [x] Successful login returns `{ success: true, data: { user: { id, email, role } }, meta: null }`.
- [x] `POST /api/auth/logout` requires a session, deletes the record, clears the cookie, and returns the documented success envelope.
- [x] `GET /api/auth/me` returns the authenticated administrator or 401 `UNAUTHENTICATED`.
- [x] `lib/api/guard.ts` exposes a `requireAdmin` helper that reads the cookie, validates the session, and returns a typed result instead of throwing into the handler.
- [x] `lib/api/origin.ts` rejects `POST`/`PATCH`/`DELETE` requests whose `Origin` is not allowed, returning 403 `FORBIDDEN`.
- [x] Handlers never leak database errors; unexpected failures return 500 `INTERNAL_SERVER_ERROR`.
- [x] No business logic lives in the route handlers; they delegate to `modules/auth/service.ts`.

## Comments

2026-11-13 — Implemented `modules/auth/schemas.ts`, `modules/auth/service.ts`, `lib/api/origin.ts`, `lib/api/guard.ts`, and the three route handlers. Added `tests/unit/origin.test.ts` (13 tests) and a cookie serialization test.

Route handlers stay thin: parse and validate, call the service, map errors through `jsonFromError`. `requireAdmin` returns a typed `PublicUser` rather than throwing into the handler, and `getSessionToken` parses the cookie header manually so the guard is testable without `NextRequest`.

Verified against a running dev server with curl (Origin header included, since state-changing requests require it):

| Scenario | Result |
| --- | --- |
| `POST /api/auth/login`, correct credentials | 200, `Set-Cookie: stockflow_session=…; Path=/; Max-Age=43200; HttpOnly; SameSite=Lax` |
| `POST /api/auth/login`, wrong password | 401 `UNAUTHENTICATED`, "Invalid email or password", no cookie |
| `GET /api/auth/me`, with cookie | 200, `{ id, email, role }` |
| `GET /api/auth/me`, no cookie | 401 `UNAUTHENTICATED` |
| `POST /api/auth/login`, no `Origin` | 403 `FORBIDDEN` |
| `POST /api/auth/logout` | 200, `Set-Cookie` with `Max-Age=0` |
| `GET /api/auth/me` after logout | 401, because the session row was deleted |

`npm test` (37), `npm run typecheck`, and `npm run lint` pass. The dev server was stopped afterwards.

`npm run build` also passes: `/api/auth/login`, `/api/auth/logout`, and `/api/auth/me` are emitted as dynamic server-rendered routes.

Integration coverage for these flows remains in issue 12.
