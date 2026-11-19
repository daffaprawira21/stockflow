# 06: Coverage, E2E verification, and Sprint 4 documentation

**What to build:** Verify Sprint 4 implementation against unit, integration, coverage, and existing E2E checks; update Sprint documentation only after all criteria pass.

**Blocked by:** 02: Idempotent order creation; 03: Atomic order confirmation; 04: Order cancellation; 05: Order shipment

**Status:** ready-for-agent

- [ ] Add meaningful order-module tests needed to meet the existing 80% business-logic threshold without lowering thresholds or excluding source files.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run test:coverage`, and existing `npm run test:e2e`.
- [ ] Record actual results; investigate and resolve any Sprint 4 regression before marking this issue complete.
- [ ] Update README Sprint 4 status and roadmap only when every implementation and verification criterion passes.
- [ ] Do not add new order E2E specs until an order UI exists.
- [ ] Do not change approved `docs/`, dependencies, schema, seed data, or migrations in this ticket.
