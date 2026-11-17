Status: ready-for-agent

# Sprint 3 — Inventory Management

## Problem Statement

Sprint 2 delivered product management and the `recordInitialStock()` participant. Stock is stored on `products.stock`, while `stock_movements` provides its audit history. Administrators still cannot query inventory, inspect a product's movements, or make manual stock adjustments through the API. Manual changes must preserve stock balance, movement history, and transactional integrity for Sprint 4 order workflows.

## Solution

Implement the three Inventory REST endpoints in `docs/api/api-contract.md` §7: list inventory, get movements for a product, and create manual adjustments. Follow existing authenticated API conventions and keep the inventory application service as transaction owner for manual adjustments.

This sprint is API-only. Do not add UI, schema changes, migrations, dependencies, or changes to approved documents under `docs/`.

## User Stories

1. As an administrator, I want to list inventory with search and low-stock filters, so that I can find products needing attention.
2. As an administrator, I want to inspect a product's stock movement history, so that I can audit how its balance changed.
3. As an administrator, I want to increase or decrease stock with a reason, so that manual corrections are recorded and explainable.
4. As a developer, I want stock balance updates and movement records to be atomic and concurrency-safe, so that audit history and current stock remain consistent.
5. As a developer, I want endpoint and transaction tests with the existing coverage gate, so that later order workflows can rely on inventory behavior.

## Implementation Decisions

### API and module scope

Implement:

- `GET /api/inventory`
- `GET /api/inventory/:productId/movements`
- `POST /api/inventory/adjustments`

Keep route handlers thin and consistent with existing endpoints: origin validation on POST, `requireAdmin`, Zod validation, service call, standard success/error envelopes. Dynamic route parameters use the repository's Next.js 16 Promise-based params convention.

### Inventory list

- Return both active and inactive products; include `isActive` as specified by the contract.
- Support `page` (default 1, >= 1), `limit` (default 10, 1–100), `search`, and `lowStock` (integer from 0 through 2147483647, matching PostgreSQL `INTEGER`).
- `search` is trimmed, case-insensitive, matches product name or SKU, and is ignored when empty.
- Omitted `lowStock` applies no threshold. Provided `lowStock=N` returns products with stock <= N; zero includes zero-stock products.
- Ignore unknown query parameters, matching existing Products query behavior.
- Order by `sku ASC`, with deterministic pagination.
- Run row retrieval and count consistently in one transaction; use the existing pagination metadata helper.
- Return exactly the inventory fields in API contract §7.1: `productId`, `sku`, `productName`, `stock`, `isActive`.

### Stock movement history

- Validate `productId` as UUID; invalid UUID returns 400 `VALIDATION_ERROR`, nonexistent product returns 404 `RESOURCE_NOT_FOUND`.
- Support `page` and `limit` using the common pagination defaults and bounds, plus optional `movementType`.
- `movementType` accepts only database-supported values: `INITIAL_STOCK`, `ORDER_CONFIRMED`, `ORDER_CANCELLED`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`. Invalid values return 400 `VALIDATION_ERROR`.
- Ignore unknown query parameters.
- Order by `createdAt DESC`, then `id ASC` for deterministic pagination and newest-first history.
- Return the fields shown in API contract §7.2, with standard pagination metadata.

### Manual stock adjustment

- Request fields: UUID `productId`, `type` (`ADJUSTMENT_IN` or `ADJUSTMENT_OUT`), positive integer `quantity`, non-empty `reason`.
- Trim `reason`; reject empty or whitespace-only value with 400 `VALIDATION_ERROR`.
- Product must exist; active status does not restrict adjustment. Missing product returns 404 `RESOURCE_NOT_FOUND`.
- Increase by `quantity` for `ADJUSTMENT_IN`; decrease by `quantity` for `ADJUSTMENT_OUT`.
- Reject a resulting balance below zero or above PostgreSQL `INTEGER` maximum (2147483647) with 422 `INVALID_ADJUSTMENT`.
- Inventory Application Service owns the transaction. Update `products.stock` and insert exactly one matching stock movement atomically. Movement fields must satisfy database rules: signed nonzero `quantityDelta`, correct before/after balances, `orderId = null`, `performedBy` from the authenticated administrator's session (never client input), and trimmed reason.
- Concurrent adjustments must preserve a consistent balance and movement chain; tests must exercise concurrent operations. Implementation may choose appropriate database concurrency control without changing approved architecture.
- Return HTTP 201 with exactly the API contract §7.3 adjustment fields: `productId`, `movementType`, `quantityDelta`, `quantityBefore`, `quantityAfter`; standard envelope and `meta: null`.

### Security and errors

- All three endpoints require an authenticated ADMIN session: unauthenticated → 401 `UNAUTHENTICATED`; authenticated non-ADMIN → 403 `FORBIDDEN`.
- POST rejects a disallowed/missing origin per existing API security convention with 403.
- Malformed JSON and invalid input return 400 `VALIDATION_ERROR`.
- Unexpected internal errors use the existing sanitized 500 error mapping.

### Database and dependencies

- No schema changes, migrations, seed changes, new dependencies, or destructive DB operations.
- Preserve existing movement CHECK constraints, including type direction, balance equation, nonnegative balances, and required adjustment reason.

## Testing Decisions

- Unit tests cover query/body schemas, defaults, transformations, movement type set, error mapping, and response serialization.
- PostgreSQL integration tests cover all three endpoints, all filters, pagination, auth/authorization, origin rejection, malformed JSON, invalid UUID, missing product, invalid movement type, both adjustment directions, inactive products, insufficient stock, integer overflow, authenticated `performedBy`, and transactional rollback.
- Concurrency tests verify concurrent adjustments leave `products.stock` equal to the final movement balance and do not lose or duplicate changes; include a conflicting decrement case that cannot make stock negative.
- No new Playwright tests: sprint adds no UI. The existing E2E suite must still pass as part of CI verification.
- Maintain existing 80% coverage thresholds for `modules/auth`, `modules/products`, and `modules/inventory`; close gaps with tests rather than lowering thresholds or excluding files.
- Use the existing guarded PostgreSQL test harness and factories. Do not run destructive database commands outside approved test scripts.

## Out of Scope

- Inventory UI, dashboard, order workflows, warehouse support, and reporting beyond endpoints in API contract §7.
- Product creation or product lifecycle changes.
- Stock adjustments through product endpoints.
- New movement types, reactivation, bulk adjustments, idempotency, or rate limiting.
- Schema/migration changes, seed changes, dependency changes, or edits to approved `docs/` documents.
- E2E browser tests without a UI change.

## Definition of Done

- All three contract §7 endpoints implemented with response envelopes, status codes, fields, validation, and errors specified here.
- Inventory list supports search, lowStock, active and inactive products, deterministic ordering, and correct pagination.
- Movement history validates product and movement type, filters correctly, and returns deterministic newest-first pages.
- Adjustments update balance and record movement atomically, including under concurrent requests; stock never becomes negative or exceeds PostgreSQL `INTEGER` range.
- Adjustment of inactive products works; missing products and invalid requests return specified errors.
- Authentication, ADMIN authorization, and POST origin validation are tested.
- Coverage remains >= 80% for `modules/auth`, `modules/products`, and `modules/inventory`.
- No migration/schema/dependency change and existing database constraints remain intact.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run test:coverage`, and the existing `npm run test:e2e` suite pass. Do not add new E2E specs for this API-only sprint.
- README Sprint 3 status and roadmap row mark Inventory Management complete only after all other DoD items pass.
- No approved document under `docs/` modified.

## Issue Breakdown

| Issue | Title | Blocked by |
| ----- | ----- | ---------- |
| `01` | Inventory query schemas and serializers | — |
| `02` | List inventory | `01` |
| `03` | Stock movement history | `01` |
| `04` | Atomic manual stock adjustments | `01` |
| `05` | Coverage gate and Sprint 3 documentation | `02`, `03`, `04` |

Recommended order: `01` → `02` → `03` → `04` → `05`. Issues `02`, `03`, and `04` are independent after shared validation/serialization work.

## Source of Truth

- `docs/api/api-contract.md` §2, §4, §7, §13.
- `docs/requirements/srs.md` FR-15…FR-20, FR-45, BR-04, BR-16, BR-20, BR-26, NFR-06…NFR-07.
- `docs/architecture/architecture.md` §5–§7, especially §7.3–§7.4.
- `docs/database/database-design.md` §4.3 and §4.6.
- `docs/testing/testing-strategy.md` §2–§3.

If implementation uncovers a conflict with approved documents, stop and report the discrepancy before changing the spec or choosing a resolution.
