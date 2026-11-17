# 05: Coverage gate and Sprint 3 documentation

**What to build:** Inventory code meets the existing 80% business-logic coverage gate alongside auth and products, and README accurately marks Sprint 3 complete only after all implementation and verification criteria pass.

**Blocked by:** 02: List inventory; 03: Stock movement history; 04: Atomic manual stock adjustments

**Status:** ready-for-agent

- [ ] Coverage includes `modules/auth/**/*.ts`, `modules/products/**/*.ts`, and `modules/inventory/**/*.ts`; existing 80% thresholds remain unchanged.
- [ ] Coverage gaps are closed with meaningful tests, not by lowering thresholds or excluding source files.
- [ ] The complete verification set passes: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run test:coverage`, and the existing `npm run test:e2e` suite. Do not add E2E specs for this API-only sprint.
- [ ] README status block and roadmap mark Sprint 3 complete after all other DoD items pass.
- [ ] No new migration, schema, seed, dependency, or approved `docs/` changes; existing integrity constraints remain intact.
