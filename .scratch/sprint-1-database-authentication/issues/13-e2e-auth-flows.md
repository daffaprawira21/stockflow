# 13: End-to-end authentication flows

**What to build:** Playwright tests for the administrator's authentication journey.

**Blocked by:** 05, 10.

**Status:** ready-for-agent

- [ ] An unauthenticated visit to a protected page redirects to `/login`.
- [ ] Logging in with seeded credentials reaches the authenticated page and shows the administrator's email.
- [ ] Logging in with invalid credentials stays on `/login` and shows a generic error.
- [ ] Logging out returns to `/login`.
- [ ] After logout, revisiting the protected page redirects to `/login`.
- [ ] The suite uses the dedicated PostgreSQL test database and a seeded administrator.
- [ ] `npm run test:e2e` passes.
