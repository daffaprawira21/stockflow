# 06: Add environment validation and the API response envelope

**What to build:** Fail-fast environment parsing and the shared response/error helpers that every API route will use.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] `lib/env.ts` parses and validates `DATABASE_URL`, `TEST_DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_COOKIE_NAME`, `ALLOWED_ORIGINS`, and `ALLOW_SEED` with Zod and throws a clear startup error when invalid.
- [ ] `.env.example` documents every variable with safe placeholder values.
- [ ] `lib/api/response.ts` produces the success envelope `{ success, data, meta }` and the paginated metadata shape `{ page, limit, totalItems, totalPages }`.
- [ ] `lib/api/errors.ts` defines every error code from the API contract with its HTTP status.
- [ ] The error envelope matches `{ success: false, error: { code, message, details } }`.
- [ ] Unexpected errors map to `INTERNAL_SERVER_ERROR` without leaking stack traces or database messages.
- [ ] Unit tests cover envelope construction and error mapping.
