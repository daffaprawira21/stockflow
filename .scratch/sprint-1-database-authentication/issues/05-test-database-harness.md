# 05: Provision the PostgreSQL test database harness

**What to build:** A repeatable test database setup so integration and concurrency tests run against a real PostgreSQL instance.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] `stockflow_test` is created locally and documented in `README.md`.
- [ ] `TEST_DATABASE_URL` drives test connections; tests never read `DATABASE_URL`.
- [ ] A global setup applies migrations with `npx prisma@7.10.1 migrate deploy`.
- [ ] A truncation helper clears tables between tests without deleting schema or migrations.
- [ ] Test data factories exist for `createTestAdmin`, `createTestProduct`, and `createTestOrder`, per the testing strategy.
- [ ] A dedicated reset script sets `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` only for the test database and refuses to run against other databases.
- [ ] Concurrency tests can create independent clients and transactions.
- [ ] `npm run test:integration` runs the suite against `stockflow_test`.
