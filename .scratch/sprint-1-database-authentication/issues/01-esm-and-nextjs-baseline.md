# 01: Establish the ESM and Next.js baseline

**What to build:** Make the project an ESM project with a single, correct Next.js configuration, and install the dependencies this sprint needs.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `package.json` declares `"type": "module"`.
- [ ] `tsconfig.json` uses `target: "ES2023"`, `module: "ESNext"`, `moduleResolution: "bundler"`, and keeps `strict: true`.
- [ ] `next.config.ts` exports exactly one config via `export default`; the trailing `module.exports` block is removed.
- [ ] `typedRoutes: true` is enabled and `cacheComponents` is not enabled.
- [ ] `zod@4.6.7`, `bcryptjs@3.0.3`, `tsx`, and `dotenv` are installed; `package-lock.json` is updated.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` still pass.
- [ ] `npm run build` succeeds under the default Turbopack bundler.
- [ ] No application behavior changes beyond configuration.
