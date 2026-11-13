# 11: Unit tests for authentication modules

**What to build:** Vitest coverage for the pure and near-pure authentication logic.

**Blocked by:** 06, 07, 08.

**Status:** ready-for-agent

- [ ] Password hashing and verification, including the unknown-user dummy-hash path.
- [ ] Session token hashing is deterministic and never stores the raw token.
- [ ] Session expiry boundary: valid before `expiresAt`, invalid at and after it.
- [ ] Login request schema rejects missing email, malformed email, and empty password.
- [ ] Origin validation accepts the configured origin and rejects foreign or missing origins as designed.
- [ ] Response envelope and error mapping produce the exact contract shapes.
- [ ] Tests run without a database connection.
- [ ] `npm test` passes.
