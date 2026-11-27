# Requirements Traceability Matrix

Maps every approved SRS requirement (FR-01…FR-48, BR-01…BR-26, NFR-01…NFR-21) to the automated test that verifies it. Maintained per `docs/testing/testing-strategy.md` §13.

**Status values:** `PASS` (verified in the most recent test run), `NOT COVERED` (no automated test yet).

---

## 1. Functional Requirements

### 1.1 Authentication (FR-01…FR-07)

| Requirement | Description (SRS §4.1) | Test level | Test file & case | Status |
| --- | --- | --- | --- | --- |
| FR-01 | Allow an administrator to log in | E2E | `tests/auth.spec.ts` — "administrator signs in, sees the account, and signs out"; integration `tests/integration/auth-api.test.ts` ("POST /api/auth/login") | PASS |
| FR-02 | Allow an authenticated administrator to log out | E2E + Integration | `tests/auth.spec.ts` (sign-out link); `tests/integration/auth-api.test.ts` ("POST /api/auth/logout") | PASS |
| FR-03 | Provide information about the current authenticated administrator | Integration | `tests/integration/auth-api.test.ts` ("GET /api/auth/me") | PASS |
| FR-04 | Protect business operations from unauthenticated access | Integration | `tests/integration/auth-api.test.ts` (401 without session); unit `tests/unit/guard.test.ts` | PASS |
| FR-05 | Sessions persisted server-side with 12-hour expiration | Unit + Integration | `tests/unit/session.test.ts`; `tests/integration/session.test.ts` ("session persistence") | PASS |
| FR-06 | Logout revokes the active session | Integration | `tests/integration/auth-api.test.ts` ("POST /api/auth/logout") | PASS |
| FR-07 | Expired sessions removed after a successful login | Integration | `tests/integration/session.test.ts` ("session persistence") | PASS |

### 1.2 Product management (FR-08…FR-13)

| Requirement | Description (SRS §4.2) | Test level | Test file & case | Status |
| --- | --- | --- | --- | --- |
| FR-08 | Create products | E2E + Integration | `tests/products.spec.ts` — "administrator creates a product, edits it, deactivates it…"; `tests/integration/products-api.test.ts` | PASS |
| FR-09 | View product lists and details | E2E + Integration | `tests/products.spec.ts` (list/detail views); `tests/integration/products-list-api.test.ts` ("GET /api/products"), `tests/integration/product-detail-api.test.ts` ("GET /api/products/:id") | PASS |
| FR-10 | Update name/description/price; SKU immutable | Integration | `tests/integration/product-update-api.test.ts` ("PATCH /api/products/:id") | PASS |
| FR-11 | Deactivate products | E2E + Integration | `tests/products.spec.ts` — deactivation flow; `tests/integration/product-deactivate-api.test.ts` ("PATCH /api/products/:id/deactivate") | PASS |
| FR-12 | Display current stock quantities | Integration | `tests/integration/inventory-list-api.test.ts` ("GET /api/inventory") | PASS |
| FR-13 | No permanent deletion of referenced products | Integration | `tests/integration/product-deactivate-api.test.ts` — deactivate instead of delete | PASS |

### 1.3 Inventory management (FR-14…FR-20)

| Requirement | Description (SRS §4.3) | Test level | Test file & case | Status |
| --- | --- | --- | --- | --- |
| FR-14 | Positive initial stock records INITIAL_STOCK movement | Integration | `tests/integration/inventory-adjustments-api.test.ts` ("POST /api/inventory/adjustments") | PASS |
| FR-15 | Manual stock increase | E2E | `tests/inventory.spec.ts` — "administrator adjusts stock with a reason and sees the movement in history" | PASS |
| FR-16 | Manual stock decrease | E2E | `tests/inventory.spec.ts` | PASS |
| FR-17 | Adjustments require a non-empty reason | E2E + Integration | `tests/inventory.spec.ts` — "adjustment without a reason is rejected client-side"; `tests/integration/inventory-adjustments-api.test.ts` | PASS |
| FR-18 | Adjustments allowed on inactive products | Integration | `tests/integration/inventory-adjustments-api.test.ts` | PASS |
| FR-19 | Every stock change recorded in stock_movements | Integration | `tests/integration/stock-movements-api.test.ts` ("GET /api/inventory/:productId/movements") | PASS |
| FR-20 | View stock movement history | E2E + Integration | `tests/inventory.spec.ts`; `tests/integration/stock-movements-api.test.ts` | PASS |

### 1.4 Order management (FR-21…FR-29)

| Requirement | Description (SRS §4.4) | Test level | Test file & case | Status |
| --- | --- | --- | --- | --- |
| FR-21 | Create orders | E2E | `tests/orders.spec.ts` — "administrator creates an order, confirms it, and ships it" | PASS |
| FR-22 | New orders are PENDING | Unit + Integration | `tests/unit/order-transitions.test.ts`; `tests/integration/orders-create-api.test.ts` | PASS |
| FR-23 | Order creation does not deduct stock | Integration | `tests/integration/orders-create-api.test.ts` | PASS |
| FR-24 | Duplicate product IDs consolidated (summed) | Unit | `tests/unit/order-consolidate.test.ts` (`consolidateStockItems`) | PASS |
| FR-25 | Product prices read from the database | Integration | `tests/integration/orders-create-api.test.ts` | PASS |
| FR-26 | Price snapshot preserved at creation | Integration | `tests/integration/orders-create-api.test.ts` | PASS |
| FR-27 | Order totals calculated on the server | Integration | `tests/integration/orders-create-api.test.ts` | PASS |
| FR-28 | Idempotency keys for order creation | Unit + Integration | `tests/unit/api-validation.test.ts` (header rule); `tests/integration/orders-idempotency.test.ts` | PASS |
| FR-29 | View order lists and details | E2E | `tests/orders.spec.ts` | PASS |

### 1.5 Order confirmation (FR-30…FR-36)

| Requirement | Description (SRS §4.5) | Test level | Test file & case | Status |
| --- | --- | --- | --- | --- |
| FR-30 | Confirm a PENDING order | E2E + Integration | `tests/orders.spec.ts`; `tests/integration/orders-confirm-api.test.ts` ("POST /api/orders/:id/confirm") | PASS |
| FR-31 | Every product in the order must be active | Integration | `tests/integration/orders-confirm-api.test.ts` — PRODUCT_INACTIVE rejection | PASS |
| FR-32 | Sufficient current stock for every item | Integration | `tests/integration/orders-confirm-api.test.ts` — INSUFFICIENT_STOCK rejection | PASS |
| FR-33 | Stock deducted only on successful confirmation | Integration | `tests/integration/orders-confirm-api.test.ts` | PASS |
| FR-34 | Deduction + movement + status change atomic | Integration | `tests/integration/orders-confirm-api.test.ts` | PASS |
| FR-35 | Failed confirmation leaves no partial changes | Integration | `tests/integration/orders-confirm-api.test.ts` | PASS |
| FR-36 | No double-deduction on duplicate confirmation | Integration | `tests/integration/orders-confirm-api.test.ts` | PASS |

### 1.6 Cancellation and shipping (FR-37…FR-43)

| Requirement | Description (SRS §4.6) | Test level | Test file & case | Status |
| --- | --- | --- | --- | --- |
| FR-37 | Cancel PENDING without stock change; reason required | Integration | `tests/integration/orders-cancel-api.test.ts` | PASS |
| FR-38 | Cancel CONFIRMED before shipment; reason required | Integration | `tests/integration/orders-cancel-api.test.ts` | PASS |
| FR-39 | Cancellation restores reserved stock | Integration | `tests/integration/orders-cancel-api.test.ts` | PASS |
| FR-40 | Restoration + status change atomic | Integration | `tests/integration/orders-cancel-api.test.ts` | PASS |
| FR-41 | Mark CONFIRMED order as SHIPPED | E2E + Integration | `tests/orders.spec.ts`; `tests/integration/orders-ship-api.test.ts` | PASS |
| FR-42 | SHIPPED orders cannot be cancelled | Integration | `tests/integration/orders-cancel-api.test.ts` | PASS |
| FR-43 | Deactivated product does not block shipping | Integration | `tests/integration/orders-ship-api.test.ts` | PASS |

### 1.7 Audit history (FR-44…FR-46)

| Requirement | Description (SRS §4.7) | Test level | Test file & case | Status |
| --- | --- | --- | --- | --- |
| FR-44 | Order transitions recorded in order_status_history | Integration | `tests/integration/orders-read-api.test.ts` (order detail includes status history) | PASS |
| FR-45 | Actor + timestamp recorded for stock changes | Integration | `tests/integration/stock-movements-api.test.ts` | PASS |
| FR-46 | Historical records not editable | Integration | `tests/integration/stock-movements-api.test.ts` + `tests/integration/orders-read-api.test.ts` — no mutation endpoints exist for these records (verified via absence + constraints test `tests/integration/constraints.test.ts`) | PASS |

### 1.8 Dashboard (FR-47…FR-48)

| Requirement | Description (SRS §4.8) | Test level | Test file & case | Status |
| --- | --- | --- | --- | --- |
| FR-47 | Inventory and order summaries displayed | E2E + Unit | `tests/dashboard.spec.ts` — "login lands on the dashboard with summary cards"; `tests/unit/dashboard-service.test.ts` | PASS |
| FR-48 | Dashboard derived from persisted data | Integration | `tests/integration/dashboard-summary-api.test.ts` | PASS |

---

## 2. Business Rules (BR-01…BR-26)

| Requirement | Description (SRS §5) | Test level | Test file & case | Status |
| --- | --- | --- | --- | --- |
| BR-01 | SKU unique | Integration | `tests/integration/constraints.test.ts` ("product constraints") — duplicate SKU rejected | PASS |
| BR-02 | Deactivate rather than delete | Integration | `tests/integration/product-deactivate-api.test.ts` | PASS |
| BR-03 | Prices non-negative | Unit | `tests/unit/product-schemas.test.ts` | PASS |
| BR-04 | Stock never negative | Integration | `tests/integration/inventory-adjustments-api.test.ts` — adjustment below zero rejected | PASS |
| BR-05 | Only ADMIN creates orders | Integration | `tests/integration/orders-create-api.test.ts` — guard path | PASS |
| BR-06 | New order starts PENDING | Unit | `tests/unit/order-transitions.test.ts` | PASS |
| BR-07 | Creation does not deduct stock | Integration | `tests/integration/orders-create-api.test.ts` | PASS |
| BR-08 | Deduct only after successful confirmation | Integration | `tests/integration/orders-confirm-api.test.ts` | PASS |
| BR-09 | Confirmation validates stock for all items | Integration | `tests/integration/orders-confirm-api.test.ts` | PASS |
| BR-10 | Confirmation atomic | Integration | `tests/integration/orders-confirm-api.test.ts` | PASS |
| BR-11 | Order item prices are snapshots | Integration | `tests/integration/orders-create-api.test.ts` | PASS |
| BR-12 | Pending cancellation: no restoration, reason required | Integration | `tests/integration/orders-cancel-api.test.ts` | PASS |
| BR-13 | Confirmed cancellation: atomic restoration, reason required | Integration | `tests/integration/orders-cancel-api.test.ts` | PASS |
| BR-14 | Shipped orders cannot be cancelled | Integration | `tests/integration/orders-cancel-api.test.ts` | PASS |
| BR-15 | Inactive products blocked from new orders/confirmation | Integration | `tests/integration/orders-confirm-api.test.ts` | PASS |
| BR-16 | Every stock change produces a movement | Integration | `tests/integration/stock-movements-api.test.ts` | PASS |
| BR-17 | Every status transition recorded | Integration | `tests/integration/orders-read-api.test.ts` (status history) | PASS |
| BR-18 | Initial stock > 0 produces INITIAL_STOCK | Integration | `tests/integration/inventory-adjustments-api.test.ts` | PASS |
| BR-19 | Zero initial stock produces no movement | Integration | `tests/integration/inventory-adjustments-api.test.ts` | PASS |
| BR-20 | Manual adjustments require a reason | E2E + Unit | `tests/inventory.spec.ts`; `tests/unit/inventory-schemas.test.ts` | PASS |
| BR-21 | Duplicate products consolidated by summing | Unit | `tests/unit/order-consolidate.test.ts` | PASS |
| BR-22 | Deactivated product does not block shipping | Integration | `tests/integration/orders-ship-api.test.ts` | PASS |
| BR-23 | Same key + payload ⇒ no duplicate order | Integration | `tests/integration/orders-create-api.test.ts` (idempotency section) | PASS |
| BR-24 | Same key + different payload ⇒ conflict | Integration | `tests/integration/orders-create-api.test.ts` (idempotency section) | PASS |
| BR-25 | Confirmed order cancel/ship valid once only | Unit + Integration | `tests/unit/order-transitions.test.ts`; `tests/integration/orders-cancel-api.test.ts` | PASS |
| BR-26 | Adjustments allowed on inactive products | Integration | `tests/integration/inventory-adjustments-api.test.ts` | PASS |

---

## 3. Non-Functional Requirements (NFR-01…NFR-21)

| Requirement | Description (SRS §6) | Test level | Test file & case | Status |
| --- | --- | --- | --- | --- |
| NFR-01 | Secure password hashing | Unit | `tests/unit/password.test.ts` (bcryptjs assertions) | PASS |
| NFR-02 | Server-side authz on business endpoints | Integration | `tests/integration/auth-api.test.ts` (401/403 paths); `tests/integration/harness.test.ts` | PASS |
| NFR-03 | Secrets not in version control | CI (manual review) | No automated test — `.env*` git-ignored; verified by `.gitignore` + CI lint of tracked files | NOT COVERED |
| NFR-04 | Secure cookies, server-side sessions, 12-hour expiration, logout revocation | Unit + Integration | `tests/unit/session.test.ts`; `tests/integration/session.test.ts` ("session persistence", "session cookie serialization") | PASS |
| NFR-05 | No client-supplied prices/actors trusted | Integration | `tests/integration/orders-create-api.test.ts` — server-side price fetch | PASS |
| NFR-06 | Stock never negative | Integration | `tests/integration/constraints.test.ts` ("product constraints" — rejects negative stock); `tests/integration/inventory-adjustments-api.test.ts` | PASS |
| NFR-07 | DB constraints (unique SKU, valid quantities) | Integration | `tests/integration/constraints.test.ts` ("product constraints", "stock movement constraints", "order constraints") | PASS |
| NFR-08 | Decimal storage for money | Integration | `tests/integration/constraints.test.ts` ("order item constraints" — rejects negative unit price); Prisma schema `Decimal(15,2)` | PASS |
| NFR-09 | Transactions for critical operations | Integration | `tests/integration/orders-confirm-api.test.ts` | PASS |
| NFR-10 | Concurrent inventory consistency | Integration | `tests/integration/orders-confirm-api.test.ts` (concurrent confirmation section); `tests/integration/harness.test.ts` | PASS |
| NFR-11 | Retries do not duplicate business ops | Integration | `tests/integration/orders-create-api.test.ts` (idempotency section) | PASS |
| NFR-12 | Modular monolith | Architecture review | Not a runtime test — structural constraint (`modules/` vs `lib/api/` vs `app/`) | NOT COVERED |
| NFR-13 | Business rules separated from presentation | Architecture review | Not a runtime test — structural constraint | NOT COVERED |
| NFR-14 | Versioned migrations | Integration | `npx prisma@7.10.1 migrate deploy` in CI + `tests/integration/global-setup.ts` | PASS |
| NFR-15 | Documentation maintained with the application | Architecture review | No automated test | NOT COVERED |
| NFR-16 | Automated tests for critical business rules | Test coverage | All BR-xx above mapped to tests; this document is the RTM | PASS |
| NFR-17 | Rollback + concurrency tests for inventory transactions | Integration | `tests/integration/orders-confirm-api.test.ts` (concurrent + rollback sections) | PASS |
| NFR-18 | E2E tests for main administrator workflows | E2E | `tests/auth.spec.ts`, `tests/products.spec.ts`, `tests/inventory.spec.ts`, `tests/orders.spec.ts`, `tests/dashboard.spec.ts` | PASS |
| NFR-19 | Production secrets outside source control | Operational | `docs/deployment/production-deployment.md` runbook; `.env*` git-ignored | NOT COVERED (process, not runtime) |
| NFR-20 | Backup/recovery procedures documented | Operational | `docs/deployment/backup-and-recovery.md` + `scripts/backup-db.sh` | NOT COVERED (process, not runtime) |
| NFR-21 | Errors logged without sensitive data exposure | Unit | `tests/unit/api-handler.test.ts` — "logs unexpected errors without leaking credentials"; `tests/unit/api-response.test.ts` — "logs unexpected errors with credentials redacted" | PASS |
