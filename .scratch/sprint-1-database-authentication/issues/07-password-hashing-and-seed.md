# 07: Implement password hashing and the admin seed

**What to build:** Password hashing and verification for administrators, plus a deterministic seed script.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] `modules/auth/password.ts` hashes with bcryptjs at cost 12.
- [ ] `verifyPassword` always performs a bcrypt comparison, using a fixed dummy hash when the user does not exist.
- [ ] `prisma/seed.ts` upserts an administrator from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- [ ] The seed rejects passwords shorter than 12 characters.
- [ ] The seed refuses to run when `NODE_ENV=production` unless `ALLOW_SEED=true`.
- [ ] Re-running the seed updates the password hash and does not create a duplicate user.
- [ ] The seed disconnects the Prisma client and pool when finished.
- [ ] `npm run db:seed` runs the seed through the configured `migrations.seed` command.
- [ ] Unit tests cover hashing, successful verification, failed verification, and the unknown-user path.
