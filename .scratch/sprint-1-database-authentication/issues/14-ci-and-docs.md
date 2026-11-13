# 14: CI workflow and documentation updates

**What to build:** A GitHub Actions workflow that runs the sprint's required checks, and documentation that lets a new developer set up the project.

**Blocked by:** 12, 13.

**Status:** ready-for-agent

- [ ] `.github/workflows/ci.yml` runs on pull requests and pushes.
- [ ] The workflow starts a PostgreSQL service container and provisions the test database.
- [ ] It applies migrations with `npx prisma@7.10.1 migrate deploy`.
- [ ] It runs `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:integration`.
- [ ] E2E may be a separate job that installs Chromium and runs `npm run test:e2e`.
- [ ] The workflow uses a supported Node version and caches npm dependencies.
- [ ] `README.md` documents PostgreSQL setup, `.env` variables, migration, seed, and test commands.
- [ ] `.env.example` matches `lib/env.ts` exactly.
- [ ] The pinned Prisma version and the `npx prisma@7.10.1` rule are documented so the v8 RC footgun is not reintroduced.
