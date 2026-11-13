# 10: Protect application pages and add the login interface

**What to build:** Page-level protection through `proxy.ts` and a working login/logout UI.

**Blocked by:** 09.

**Status:** ready-for-agent

- [ ] `proxy.ts` sits at the project root and exports a `proxy` function.
- [ ] Unauthenticated page requests redirect to `/login`; authenticated requests continue.
- [ ] The matcher excludes `/api/*`, `/login`, and Next.js static/image assets.
- [ ] `/api/*` is not handled by the proxy; API protection stays in the handler guard.
- [ ] `app/login/page.tsx` provides an accessible form that posts to `/api/auth/login` and displays a generic error on failure.
- [ ] The authenticated page shows the signed-in administrator's email and a logout control that calls `/api/auth/logout`.
- [ ] After logout, navigating back to a protected page redirects to `/login`.
- [ ] No Edge-runtime-specific code is introduced; the proxy runs on the Node.js runtime.
