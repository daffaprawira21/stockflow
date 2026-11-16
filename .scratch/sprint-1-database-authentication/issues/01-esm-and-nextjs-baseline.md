# 01: Establish the ESM and Next.js baseline

**What to build:** Make the project an ESM project with a single, correct Next.js configuration, and install the dependencies this sprint needs.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] `package.json` declares `"type": "module"`.
- [x] `tsconfig.json` uses `target: "ES2023"`, `module: "ESNext"`, `moduleResolution: "bundler"`, and keeps `strict: true`.
- [x] `next.config.ts` exports exactly one config via `export default`; the trailing `module.exports` block is removed.
- [x] `typedRoutes: true` is enabled and `cacheComponents` is not enabled.
- [x] `zod@4.6.7`, `bcryptjs@3.0.3`, `tsx`, and `dotenv` are installed; `package-lock.json` is updated.
- [x] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` still pass.
- [x] `npm run build` succeeds under the default Turbopack bundler.
- [x] No application behavior changes beyond configuration.

## Comments

2026-11-13 — Implemented. Verified `npm run typecheck`, `npm run lint`, `npm test` (1 passed), `npm run build` (Turbopack, 3 static routes), and `npm run test:e2e` (1 passed). Installed `zod@4.6.7` and `bcryptjs@3.0.3` as dependencies, `tsx` and `dotenv` as dev dependencies. `bcryptjs@3` bundles its own type definitions, so `@types/bcryptjs` is not needed.
