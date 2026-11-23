# 05: Dashboard page, home wiring, and logout relocation

**What to build:** The landing dashboard page consuming `GET /api/dashboard/summary`, with the home route wired into the admin shell so authenticated admins land on it.

**Blocked by:** 01: Global stylesheet, route groups, admin shell, and dashboard backend

**Status:** unclaimed

- [ ] `app/(admin)/page.tsx` — dashboard page (server component) fetching `/api/dashboard/summary` with request cookies; render numeric summary cards: total/active products, total orders, pending/confirmed/shipped/cancelled order counts, total inventory units; link cards to the relevant list pages.
- [ ] Update `app/page.tsx` (or replace it with a redirect) so unauthenticated visitors are sent to `/login` and authenticated admins land on the dashboard.
- [ ] Confirm `proxy.ts` matcher still covers the new admin paths without change.
- [ ] No new dependencies beyond the Tailwind packages added in 01; reuse global CSS classes (Tailwind utilities + component classes).
