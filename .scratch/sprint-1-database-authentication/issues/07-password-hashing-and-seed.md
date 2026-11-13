# 07: Implement password hashing and the admin seed

**What to build:** Password hashing and verification for administrators, plus a deterministic seed script.

**Blocked by:** 03.

**Status:** ready-for-agent

- [x] `modules/auth/password.ts` hashes with bcryptjs at cost 12.
- [x] `verifyPassword` always performs a bcrypt comparison, using a fixed dummy hash when the user does not exist.
- [x] `prisma/seed.ts` upserts an administrator from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- [x] The seed rejects passwords shorter than 12 characters.
- [x] The seed refuses to run when `NODE_ENV=production` unless `ALLOW_SEED=true`.
- [x] Re-running the seed updates the password hash and does not create a duplicate user.
- [x] The seed disconnects the Prisma client and pool when finished.
- [x] `npm run db:seed` runs the seed through the configured `migrations.seed` command.
- [x] Unit tests cover hashing, successful verification, failed verification, and the unknown-user path.

## Comments

2026-11-13 — Implemented `modules/auth/password.ts` (bcryptjs, cost 12, static dummy hash) and `prisma/seed.ts` (upsert driven by `lib/env`, explicit `pg` pool closed in `finally`). Added `tests/unit/password.test.ts` (5 tests).

Verified:

- `npm test` — 13 tests pass, including salt uniqueness and the null-hash path.
- `npm run db:seed` twice — one `users` row remains, so the upsert is idempotent.
- Database check: `admin@example.com` / `ADMIN`, hash prefix `$2b$12$`, bcrypt comparison against the env password returns true, and the plaintext password is not stored.
- Guards: `ADMIN_PASSWORD=short` fails at env validation with "must be at least 12 characters"; `NODE_ENV=production` without `ALLOW_SEED` fails with "Refusing to seed in production without ALLOW_SEED=true."
