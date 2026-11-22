# 07: Coverage gate, full verification, and sprint documentation

**What to build:** The coverage configuration now measures the new dashboard module alongside the four existing modules at the unchanged 80% thresholds, and the README/spec record the actual results of every verification command.

**Blocked by:** 02: Products pages; 03: Inventory pages; 04: Orders pages; 05: Dashboard page and home wiring; 06: E2E specs

**Status:** unclaimed

- [ ] Confirm `vitest.coverage.config.ts` includes `modules/dashboard/**/*.ts` at the same 80% thresholds as the other modules, with no threshold lowered and no source file excluded.
- [ ] Close any coverage gap with real tests, not exclusions.
- [ ] Run and record: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run test:coverage`, `npm run test:e2e`, `npm run perf:budget`.
- [ ] Update the README status block ("Sprint 5 complete") and the roadmap row (Sprint 5 → Completed, Sprint 6 → Planned), stating the admin UI and dashboard are now available.
- [ ] Set this spec's `Status:` to `done` and append the verification results with commit references.
- [ ] No new dependencies, no `docs/` edits, no migration changes.
