# 08: Implement server-side session management

**What to build:** Session creation, validation, revocation, and expired-session cleanup backed by the `sessions` table.

**Blocked by:** 03, 07.

**Status:** ready-for-agent

- [ ] A session token is 32 random bytes encoded as base64url and is only ever sent to the client in the cookie.
- [ ] Only the SHA-256 hex digest of the token is stored in `sessions.token_hash`.
- [ ] Sessions expire exactly 12 hours after creation and are not extended by activity.
- [ ] `createSession` deletes expired sessions globally (`expiresAt < now`) and inserts the new session in one transaction.
- [ ] Cleanup never removes unexpired sessions.
- [ ] `validateSession` rejects missing, unknown, or expired tokens and returns the associated user.
- [ ] `revokeSession` deletes the session record immediately.
- [ ] Cookie helpers set `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, and `Max-Age=43200`, using the configured cookie name.
- [ ] Unit tests cover token hashing, expiry boundary behaviour, and cookie option construction.
