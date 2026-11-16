# 08: Implement server-side session management

**What to build:** Session creation, validation, revocation, and expired-session cleanup backed by the `sessions` table.

**Blocked by:** 03, 07.

**Status:** ready-for-agent

- [x] A session token is 32 random bytes encoded as base64url and is only ever sent to the client in the cookie.
- [x] Only the SHA-256 hex digest of the token is stored in `sessions.token_hash`.
- [x] Sessions expire exactly 12 hours after creation and are not extended by activity.
- [x] `createSession` deletes expired sessions globally (`expiresAt < now`) and inserts the new session in one transaction.
- [x] Cleanup never removes unexpired sessions.
- [x] `validateSession` rejects missing, unknown, or expired tokens and returns the associated user.
- [x] `revokeSession` deletes the session record immediately.
- [x] Cookie helpers set `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, and `Max-Age=43200`, using the configured cookie name.
- [x] Unit tests cover token hashing, expiry boundary behaviour, and cookie option construction.

## Comments

2026-11-13 — Implemented `modules/auth/session.ts`:

- `generateSessionToken` returns 32 random bytes as base64url; `hashSessionToken` returns a SHA-256 hex digest.
- `createSession` runs expired-session cleanup (`expiresAt <= now`) and the insert inside one `$transaction`, and uses a fixed 12-hour lifetime.
- `validateSession` looks up by token hash, includes the user, and rejects at or after `expiresAt`.
- `revokeSession` deletes by token hash and is a no-op for unknown tokens.
- `buildSessionCookie` / `buildClearedSessionCookie` produce `HttpOnly`, `SameSite=Lax`, `Path=/`, 12-hour `Max-Age`, and `Secure` in production, using `SESSION_COOKIE_NAME` or its default.

Verified with `tests/unit/session.test.ts` (10 tests) and `tests/integration/session.test.ts` (6 tests against `stockflow_test`): exact 12-hour expiry, hash-only storage, live validation, unknown-token rejection, expiry boundary, cleanup that preserves live sessions, immediate revocation, and no-op revocation.

`npm test` (23), `npm run test:integration` (9), `npm run typecheck`, and `npm run lint` pass.
