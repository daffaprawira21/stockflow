Status: ready-for-agent

# Sprint 4 — Order Management

## Problem Statement

Sprint 3 established atomic inventory adjustments and movement auditing. Administrators still cannot create, inspect, confirm, cancel, or ship orders through the API. Order operations must preserve price history, inventory integrity, status audit history, and idempotency guarantees.

## Solution

Implement the Order REST endpoints from `docs/api/api-contract.md` §8 as small backend-only tickets. Reuse the Orders read foundation committed in `f501d4b`, then add creation, confirmation, cancellation, shipment, and final verification work in dependency order.

## User Stories

1. As an administrator, I want to list and inspect orders, so that I can review their contents and history.
2. As an administrator, I want to create an idempotent pending order, so that repeated requests do not duplicate orders.
3. As an administrator, I want to confirm an order only when all products are active and sufficiently stocked.
4. As an administrator, I want to cancel eligible orders with a reason, so that order history and stock stay accurate.
5. As an administrator, I want to ship confirmed orders without changing inventory.
6. As a developer, I want order changes and audit records to be transactional and concurrency-safe.

## Implementation Decisions

### API and module scope

Implement `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders`, `POST /api/orders/:id/confirm`, `POST /api/orders/:id/cancel`, and `POST /api/orders/:id/ship`. Keep routes thin: origin validation for POST, `requireAdmin`, Zod validation, Orders service call, and standard response/error envelopes.

### Read foundation

- `search` matches `orderNumber` only, case-insensitively.
- `status` is strict: `PENDING`, `CONFIRMED`, `SHIPPED`, or `CANCELLED`.
- List defaults to `createdAt DESC`, then `id ASC`; users may sort by `createdAt` or `orderNumber`.
- Detail includes stored item price snapshots and status history ordered `createdAt ASC`, then `id ASC`.
- PostgreSQL sequence `order_number_sequence` starts at 1, is global, and may have gaps. Ticket 2 formats values as `ORD-<UTC-year>-<6-digit>`.

### Order creation

- Require `Idempotency-Key`; scope idempotency by authenticated user, operation, and key.
- Consolidate duplicate product IDs, require active existing products, snapshot price, calculate decimal-safe subtotal and total, create a `PENDING` order plus initial history, and do not change stock.
- Persist order result and idempotency record atomically. Completed same-payload replay returns original result; different payload and in-progress requests return the documented 409 errors.

### State transitions

- Confirm only `PENDING` orders. Lock product rows in a consistent order, validate active products and current stock, deduct stock, create `ORDER_CONFIRMED` movements, set status/`confirmedAt`, and create history atomically.
- Cancel `PENDING` or `CONFIRMED` orders only with a trimmed non-empty reason. Cancelling `CONFIRMED` restores stock and creates `ORDER_CANCELLED` movements; cancelling `PENDING` does not change stock.
- Ship only `CONFIRMED` orders. Set status/`shippedAt` and record history without inventory changes. Deactivated products do not block shipping an already confirmed order.

## Testing Decisions

- Use Vitest unit tests for validation, serialization, service decisions, and error mapping.
- Use PostgreSQL integration tests for every endpoint, auth/authorization, origin checks, database constraints, transactions, idempotency, and concurrent order confirmation.
- Include deterministic ordering tie-break tests and regression coverage for price snapshots, idempotency replays/conflicts/in-progress requests, inactive products, insufficient stock, rollback, cancellation reasons, and shipment without inventory mutation.
- No new Playwright test until an order UI exists; existing E2E suite remains part of verification.
- Maintain the existing 80% coverage threshold without lowering thresholds or excluding source files.

## Out of Scope

- Order UI, customer-facing order flows, partial fulfilment, returns, refunds, bulk operations, new roles, reporting, idempotency cleanup, schema changes beyond already committed order-number sequence, new dependencies, and edits to approved `docs/` sources.

## Definition of Done

- All API contract §8 endpoints are implemented with documented envelopes, validation, status codes, authorization, and errors.
- Creation is idempotent, snapshots prices, calculates decimal-safe totals, and leaves stock unchanged.
- Confirmation, cancellation, and shipment obey allowed transitions and inventory rules atomically.
- Every order status transition has correct history; every stock-changing transition has correct movement records.
- Required unit, integration, coverage, and existing E2E checks are run and their results recorded.
- No unapproved dependencies, approved-document edits, or out-of-scope feature additions.

## Issue Breakdown

| Issue | Title | Blocked by |
| ----- | ----- | ---------- |
| `01` | Order number sequence and read foundations | — |
| `02` | Idempotent order creation | `01` |
| `03` | Atomic order confirmation | `02` |
| `04` | Order cancellation | `03` |
| `05` | Order shipment | `03` |
| `06` | Coverage, E2E verification, and Sprint documentation | `02`, `03`, `04`, `05` |

Recommended order: `01` → `02` → `03` → `04` → `05` → `06`.

## Source of Truth

- `docs/api/api-contract.md` §2, §4, §8, §13.4–§13.6.
- `docs/requirements/srs.md` FR-21…FR-46, §7–§8.
- `docs/architecture/architecture.md` §5–§7.
- `docs/database/database-design.md` §4.4–§4.8, §8–§10.
- `docs/testing/testing-strategy.md` §2–§3, §4.5–§4.6, §8–§10.

If implementation uncovers a conflict with approved documents, stop and report the discrepancy before changing this spec or choosing a resolution.
