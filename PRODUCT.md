# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: Super Admin / Operator who manages the entire catalog, stock levels, pricing, and order fulfillment from one place. They work in a desktop web session, scanning lists and taking fast, precise actions.

## Product Purpose

StockFlow is an inventory and order management tool for small-to-mid businesses. It exists to let an operator keep products, physical stock, and customer orders in sync without friction. Success means the operator can do a full day of stock and order work — receiving, adjusting, creating, confirming, shipping, cancelling — quickly, with clear feedback at every step.

## Positioning

Fast & Frictionless Ops. Scan a list in 3 seconds. Native admin patterns. No bloat, no unnecessary decoration. The interface is the tool — it gets out of the way so the operator's hands stay on the work.

## Operating Context

Web admin panel. Core loops: create & edit products, adjust stock (in/out, cycle counts), create orders from catalog, advance orders through PENDING → CONFIRMED → SHIPPED (or CANCELLED). Currency is IDR. Timezone is user-local. Sessions are cookie-based (stockflow_session).

## Capabilities and Constraints

- Next.js 16 App Router, React 19, Tailwind v4, Prisma + SQLite.
- API-first: frontend fetches /api/dashboard/summary, /api/products, /api/inventory, /api/orders, /api/auth/*. Contracts are stable and covered by 7 Playwright suites — UI changes must not regress selectors or text assertions.
- No heavy UI component libraries allowed; build with native Tailwind + inline SVGs.
- Backend code, API routes, Prisma schema, auth, and validators are frozen for this task.

## Brand Commitments

None yet (Greenfield Design). The visual world — palette, typography, iconography — is open. A clean, professional SaaS admin look is the target; no existing logo or brand guidelines to preserve.

## Evidence on Hand

None. No user data, testimonials, or benchmarks. Do not fabricate them.

## Product Principles

1. **Scanability first** — lists and tables are readable in seconds; hierarchy, spacing, and type carry the load.
2. **No friction** — every action has clear feedback; states (loading, empty, error, success) are explicit.
3. **Consistency** — one design system across all screens; tokens, not one-off styles.
4. **Precision** — numeric and currency data align, tabular, unambiguous.
5. **Accessibility** — keyboard and screen-reader safe by default.

## Accessibility & Inclusion

Standard WCAG AA target. The user is a single desktop operator, but keyboard navigation and visible focus must be intact.
