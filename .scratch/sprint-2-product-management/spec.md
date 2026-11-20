Status: resolved

**Implementation:** merged by `389cb30` (includes `47dc09e` completion/verification work). Current local Sprint 2 branch includes later commit `14645d4 refactor: split agent instructions for progressive disclosure`; that commit is unrelated to product feature scope.

# Sprint 2 — Product Management

## Problem Statement

Sprint 1 delivered the approved schema, its integrity constraints, and administrator authentication. The `products` table, its indexes, and its CHECK constraints already exist, but nothing above the database exposes them: there is no Products module, no product endpoint, and no way for an administrator to manage the catalogue.

Every later sprint depends on this lifecycle. Inventory (Sprint 3) adjusts stock of products, Orders (Sprint 4) validates that products exist and are active, and the Dashboard (Sprint 5) counts them. Building those against an unimplemented product layer would repeat product validation and SKU rules in each module.

## Solution

Implement the Products module and the five REST endpoints defined in `docs/api/api-contract.md` §6, including the atomic `INITIAL_STOCK` movement required by product creation. The Inventory module is introduced in the smallest possible form: one function that participates in a caller-owned transaction, per `docs/architecture/architecture.md` §6 and §7.4.

This sprint is **API-only**. Product pages belong to Sprint 5 ("Frontend and Dashboard") in the README roadmap; the approved roadmap is not changed here.

## User Stories

1. As an administrator, I want to create a product with SKU, name, description, price, and initial stock, so that it can be ordered later.
2. As an administrator, I want initial stock above zero recorded as an `INITIAL_STOCK` movement, so that stock history explains where the quantity came from.
3. As an administrator, I want to search, filter, sort, and paginate the product list, so that I can find a product without reading the whole catalogue.
4. As an administrator, I want to view a product's detail, so that I can confirm its current data and stock.
5. As an administrator, I want to update name, description, and price, so that corrections are possible without touching SKU or stock.
6. As an administrator, I want to deactivate a product instead of deleting it, so that historical order and movement records stay intact.
7. As a developer, I want product creation and its initial movement to commit or roll back together, so that a failure never leaves a product without its audit record.
8. As a developer, I want every endpoint guarded by session authentication, ADMIN authorization, and origin validation, so that protection is consistent with Sprint 1.
9. As a developer, I want unit and integration tests plus an 80% coverage gate for the new modules, so that later sprints can build on verified behavior.

## Implementation Decisions

### Application structure

```text
lib/api/validation.ts                      # shared Zod error details (moved)
lib/money.ts                               # shared decimal serialization
modules/products/schemas.ts                # create / update / list-query schemas
modules/products/serializer.ts             # product → API DTO
modules/products/service.ts                # application service
modules/inventory/stock-movement.ts        # recordInitialStock participant
app/api/products/route.ts                  # GET list, POST create
app/api/products/[id]/route.ts             # GET detail, PATCH update
app/api/products/[id]/deactivate/route.ts  # PATCH deactivate
```

Route handlers stay thin, matching Sprint 1: origin check for state-changing methods, `requireAdmin`, Zod parse, service call, `jsonSuccess`/`jsonPaginated`/`jsonFromError`. Dynamic handlers use the Next.js 16 signature `{ params }: { params: Promise<{ id: string }> }` with `await params`.

No new runtime or development dependencies are added.

### Shared helpers (issue 01)

- `validationDetails()` and the `ValidationDetail` type move from `modules/auth/schemas.ts` to `lib/api/validation.ts`. `modules/auth/schemas.ts` keeps `loginSchema` only; `app/api/auth/login/route.ts` and `tests/unit/auth-schemas.test.ts` import from the new location. No re-export shim is left behind.
- `lib/money.ts` exports `toMoneyString(value: Decimal): string` implemented with `Decimal.toFixed(2)`. Values never pass through `number`. This helper is shared because Inventory, Orders, and Dashboard will need it.

### Product input validation (issue 03 and 05)

- `sku`: trimmed, uppercased, then matched against `^[A-Z0-9][A-Z0-9_-]{0,99}$`. Uniqueness therefore stays case-sensitive at the database while duplicates differing only by case are rejected.
- `name`: trimmed, 1–255 characters.
- `description`: optional and nullable, trimmed, at most 2000 characters. This length cap is an implementation decision; the column is unbounded text.
- `price`: a **string** matching `^\d{1,13}(\.\d{1,2})?$`, stored as `Decimal(15, 2)`. JSON numbers, negative values, and more than two decimals are rejected.
- `initialStock`: **required**, integer, `0`–`2147483647`.
- Update body: strict object with at least one of `name`, `description`, `price`. `sku`, `stock`, `isActive`, or any other field is rejected with 400 `VALIDATION_ERROR`; they are not silently ignored. An empty object is rejected the same way.
- Product activity does not restrict updates: price and name may be changed while inactive, because the contract only restricts new orders and confirmation.

### Response shapes

- `POST /api/products` returns HTTP 201 with exactly the fields shown in contract §6.2: `id`, `sku`, `name`, `price`, `stock`, `isActive`.
- List, detail, update, and deactivate responses return the full product object: `id`, `sku`, `name`, `description`, `price`, `stock`, `isActive`, `createdAt`, `updatedAt`.
- `price` is serialized with `toMoneyString()`; timestamps use `Date.toISOString()`; single resources use `meta: null`.

### Product creation and initial stock (issues 02 and 03)

- `createProduct(prisma, input, actorId)` follows the auth service convention of receiving the client as its first argument. The client type is `Pick<PrismaClient, 'product' | 'stockMovement' | '$transaction'>`.
- One `prisma.$transaction` creates the product (with `stock = initialStock`) and, when `initialStock > 0`, calls `recordInitialStock(tx, …)` with the transaction client.
- `modules/inventory/stock-movement.ts` exports `recordInitialStock(tx, { productId, performedBy, quantity })`, accepting `Pick<PrismaClient, 'stockMovement'>`. It writes `movementType = 'INITIAL_STOCK'`, `quantityDelta = +quantity`, `quantityBefore = 0`, `quantityAfter = quantity`, `orderId = null`, `reason = null`. It never opens or ends a transaction itself.
- `initialStock = 0` creates no movement, because `quantity_delta <> 0` is a database constraint and the contract forbids zero-quantity movements.
- Duplicate SKU is detected through the unique constraint, not through a pre-insert lookup: `P2002` on `products_sku_key` is caught and rethrown as `ApiError('SKU_ALREADY_EXISTS')` (409).

### List endpoint (issue 04)

- Query schema: `page` default 1 (≥ 1), `limit` default 10 (1–100), `sortBy` one of `name`, `sku`, `price`, `stock`, `createdAt` (default `createdAt`), `sortOrder` `asc`/`desc` (default `desc`), `isActive` accepting only the strings `"true"`/`"false"`, `search` trimmed and ignored when empty.
- Unknown query parameters are ignored; invalid values produce 400 `VALIDATION_ERROR`.
- With no `isActive` parameter, both active and inactive products are returned.
- `search` filters `name` OR `sku` with case-insensitive `contains`.
- Ordering is `orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }]` so pagination is deterministic.
- `findMany` and `count` run in one `$transaction` array so `meta` matches the returned page. Pagination metadata uses the existing `paginationMeta()` helper.

### Update and deactivate (issue 05)

- Invalid UUID in the path → 400 `VALIDATION_ERROR`; unknown product → 404 `RESOURCE_NOT_FOUND`.
- Update changes only the provided fields and never touches `stock`, `sku`, or existing order item snapshots.
- Deactivate sets `isActive = false`, returns the full product, and is idempotent: deactivating an already inactive product still returns 200. Products are never deleted.

### Database and seed

- No changes to `prisma/schema.prisma`, no new migration, and no seed changes. Existing CHECK constraints must remain intact; no migration means none can be dropped accidentally.
- No sample product data is seeded; tests use the existing factories.

## Testing Decisions

- Unit tests (Vitest, database-free): SKU normalization and rejection, price string rules, update strictness and minimum-field rule, list query defaults and rejection, `toMoneyString()`, and the product serializer.
- Integration tests (Vitest + `stockflow_test`): every scenario in `docs/api/api-contract.md` §13.2, plus authentication (401), authorization (403 for non-ADMIN), origin rejection for POST/PATCH, malformed JSON, invalid path UUID, and unknown product.
- Atomicity is tested explicitly: a successful create with positive initial stock yields exactly one `INITIAL_STOCK` movement with `quantityBefore = 0`, `quantityAfter = initialStock`, and `performedBy` set to the administrator; a create that fails on duplicate SKU leaves neither product nor movement rows.
- `vitest.coverage.config.ts` coverage `include` becomes `modules/auth/**/*.ts`, `modules/products/**/*.ts`, `modules/inventory/**/*.ts`, keeping the existing 80% thresholds. CI already runs `test:coverage`, so no workflow change is required.
- No new Playwright specs: this sprint adds no UI. Existing E2E specs must keep passing.
- Test data uses the existing `createTestAdmin` / `createTestProduct` factories and the `stockflow_test` harness; `prisma migrate reset` remains restricted to the guarded test script.

## Out of Scope

- Any product page, form, navigation, or dashboard UI (Sprint 5).
- Inventory endpoints from contract §7: inventory list, movement history, manual adjustments.
- Orders, order numbers, idempotency, and order status history.
- Reactivating a product. The contract provides no reactivation endpoint and `PATCH` does not accept `isActive`, so deactivation is effectively permanent in the MVP. This limitation was raised during planning and accepted.
- Permanent product deletion, SKU changes, image uploads, categories, or stock changes through the product API.
- Schema changes, new migrations, seed data changes, new dependencies, and edits to the approved documents under `docs/`.
- Advancing into Sprint 3.

## Definition of Done

All of the following must be true before the sprint is considered complete:

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run test:coverage`, and `npm run test:e2e` pass.
- The five endpoints in contract §6 exist and match the envelopes, status codes, and error codes in that document and in this spec.
- Creating a product with positive initial stock writes exactly one `INITIAL_STOCK` movement atomically; a failed create leaves no partial rows.
- Duplicate SKU, including a case-only difference, returns 409 `SKU_ALREADY_EXISTS`.
- Update cannot modify SKU or stock; deactivate never deletes a row and is idempotent.
- Unauthenticated calls return 401, non-ADMIN calls return 403, and state-changing calls without an allowed origin return 403.
- Coverage for `modules/products` and `modules/inventory` meets the 80% thresholds alongside `modules/auth`.
- No new migration was added and the existing constraint tests still pass.
- `README.md` status block and roadmap row mark Sprint 2 complete; no approved document under `docs/` was modified.

## Issue Breakdown

| Issue | Title | Blocked by |
| ----- | ----- | ---------- |
| `01` | Shared validation and money helpers | — |
| `02` | Create product with initial stock | `01` |
| `03` | List products | `02` |
| `04` | Product detail | `02` |
| `05` | Update product | `04` |
| `06` | Deactivate product | `04` |
| `07` | Coverage gate and sprint documentation | `02`, `03`, `04`, `05`, `06` |

Each issue is a vertical slice that ships with its own tests; there is no separate test-only issue at the end. The Inventory initial-stock participant is delivered inside `02`, because it produces no independently verifiable behavior on its own. Recommended working order: `01` → `02` → `04` → `03` → `05` → `06` → `07`.

## Further Notes

- The decisions above were settled during a grilling session on 2026-11-15. Implementation should follow them rather than re-litigate them.
- Source of truth: `docs/api/api-contract.md` §2, §4, §6, §10–13; `docs/requirements/srs.md` FR-08…FR-14, FR-19, BR-01/BR-02; `docs/architecture/architecture.md` §5–§7; `docs/database/database-design.md` §6–§8.
- Sprint 1's working tree was cleaned up before this sprint was planned: commit `7967b38` covers the session cookie `Secure` override and login error reporting, and `docs/research/nextjs-16-api-surface.md` was restored because this spec still relies on those Next.js 16 behaviors.
- Where this spec adds a detail the approved documents leave open (SKU normalization, the 2000-character description cap, idempotent deactivate, list defaults), the detail is recorded here and in the relevant issue. Any conflict discovered during implementation must be reported instead of silently resolved.
- The repository's issue tracker is local Markdown under `.scratch/`; this spec and its issues follow that convention.
