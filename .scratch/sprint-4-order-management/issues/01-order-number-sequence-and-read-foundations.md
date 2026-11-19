# 01: Order number sequence and read foundations

**What to build:** PostgreSQL order-number sequence plus read-only Orders module and `GET /api/orders`, `GET /api/orders/:id` endpoints.

**Blocked by:** —

**Status:** ready-for-agent

**Completed by:** `f501d4b feat: add order read foundations`

- [x] Migration creates global `order_number_sequence` with `START WITH 1`; sequence gaps are allowed.
- [x] List query accepts strict order statuses, order-number-only search, pagination, and documented sorting.
- [x] List uses `createdAt DESC`, then `id ASC` by default and returns contract fields plus pagination metadata.
- [x] Detail returns stored item price snapshots and status history in `createdAt ASC`, then `id ASC` order.
- [x] Both endpoints require ADMIN authentication and return standard validation, not-found, and authorization errors.
- [x] Unit and PostgreSQL integration tests cover schemas, serialization, query construction, sequence availability, read endpoints, authentication, and authorization.
- [x] Code-review follow-up closed: test sequence configuration and deterministic ordering tie-breaks before Ticket 2.
