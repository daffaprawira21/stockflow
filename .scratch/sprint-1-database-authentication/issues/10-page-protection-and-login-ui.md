# 10: Protect application pages and add the login interface

**What to build:** Page-level protection through `proxy.ts` and a working login/logout UI.

**Blocked by:** 09.

**Status:** ready-for-agent

- [x] `proxy.ts` sits at the project root and exports a `proxy` function.
- [x] Unauthenticated page requests redirect to `/login`; authenticated requests continue.
- [x] The matcher excludes `/api/*`, `/login`, and Next.js static/image assets.
- [x] `/api/*` is not handled by the proxy; API protection stays in the handler guard.
- [x] `app/login/page.tsx` provides an accessible form that posts to `/api/auth/login` and displays a generic error on failure.
- [x] The authenticated page shows the signed-in administrator's email and a logout control that calls `/api/auth/logout`.
- [x] After logout, navigating back to a protected page redirects to `/login`.
- [x] No Edge-runtime-specific code is introduced; the proxy runs on the Node.js runtime.

## Comments

2026-11-13 — Implemented `proxy.ts`, `modules/auth/current-user.ts`, `app/login/page.tsx`, `app/logout-button.tsx`, and the protected `app/page.tsx`.

- `proxy.ts` only checks for the presence of the session cookie and redirects to `/login`. It is a fast UX path; the source of truth is `getCurrentUser`, which validates the session against PostgreSQL inside the server component.
- Matcher: `/((?!api|_next/static|_next/image|favicon.ico|login).*)`, so API routes, the login page, and static assets never pass through the proxy.
- The login form posts to `/api/auth/login` and always shows the same generic error; it does not call a Server Action.
- `typecheck` now runs `next typegen && tsc --noEmit` because `typedRoutes` needs freshly generated route types after adding `/login`.

Verified with `npm run build` (routes: `ƒ /`, `○ /login`, `ƒ Proxy (Middleware)`), `npm run test:e2e` (the updated smoke test now asserts the redirect), and a live curl run:

| Scenario | Result |
| --- | --- |
| `GET /` without a cookie | 307 to `/login` |
| `GET /` with a valid session | 200, HTML contains "Signed in as admin@example.com" and a "Sign out" button |
| `POST /api/auth/logout` | 200 |
| `GET /` after logout | 307 to `/login` |

The old Sprint 0 smoke test asserted the public starting page; it was replaced with the redirect assertion. Its database-free nature is preserved because the redirect happens in the proxy. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` pass.
