# 06: Add environment validation and the API response envelope

**What to build:** Fail-fast environment parsing and the shared response/error helpers that every API route will use.

**Blocked by:** 01.

**Status:** ready-for-agent

- [x] `lib/env.ts` parses and validates `DATABASE_URL`, `TEST_DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_COOKIE_NAME`, `ALLOWED_ORIGINS`, and `ALLOW_SEED` with Zod and throws a clear startup error when invalid.
- [x] `.env.example` documents every variable with safe placeholder values.
- [x] `lib/api/response.ts` produces the success envelope `{ success, data, meta }` and the paginated metadata shape `{ page, limit, totalItems, totalPages }`.
- [x] `lib/api/errors.ts` defines every error code from the API contract with its HTTP status.
- [x] The error envelope matches `{ success: false, error: { code, message, details } }`.
- [x] Unexpected errors map to `INTERNAL_SERVER_ERROR` without leaking stack traces or database messages.
- [x] Unit tests cover envelope construction and error mapping.

## Comments

2026-11-13 — Implemented `lib/env.ts`, `lib/api/errors.ts`, and `lib/api/response.ts`, plus `tests/unit/api-response.test.ts` (7 tests).

- `lib/env.ts` validates with Zod and throws one aggregated message listing the invalid variables. Verified manually: without variables it rejects with `Invalid environment configuration: DATABASE_URL`; with `.env` it loads `stockflow_session`, `ALLOW_SEED=false`, and two allowed origins.
- `lib/api/errors.ts` holds `ERROR_STATUS`, default messages, and an `ApiError` class carrying code, status, and details.
- `lib/api/response.ts` returns plain objects and uses the Web `Response.json` API rather than `NextResponse`, so envelopes are testable without Next.js internals. Cookie mutation will use `NextResponse` in the session work.
- Unknown errors map to 500 `INTERNAL_SERVER_ERROR`; the test asserts that neither `ECONNREFUSED` nor a password from the original message appears in the body.

`npm test` (8 tests), `npm run typecheck`, and `npm run lint` pass.
