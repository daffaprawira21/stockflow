Status: ready-for-agent

## Problem Statement

StockFlow is still in the planning and foundation stage. The repository has approved requirements and technical design documents, but lacks a configured application baseline that can be launched and verified. Without this foundation, future feature work has no consistent project commands, application entry point, or repeatable smoke check.

## Solution

Establish the smallest runnable StockFlow application foundation using the approved technology stack and existing repository conventions. Provide a user-visible starting page and a single end-to-end smoke test that confirms the application launches and displays StockFlow. Record only the project configuration and baseline needed for this stage; defer business features to later roadmap sprints.

## User Stories

1. As a developer, I want a configured application foundation, so that I can build StockFlow features on a consistent baseline.
2. As a developer, I want the application to start with documented repository commands, so that I can run and verify it locally.
3. As an administrator visiting the application before authentication features exist, I want a clear StockFlow starting page, so that I can identify the application.
4. As a developer, I want the application entry point to use the approved Next.js and TypeScript stack, so that implementation follows project decisions.
5. As a developer, I want a repeatable check that launches the application and verifies its starting page, so that foundation regressions are caught early.
6. As a developer, I want the smoke check to exercise the application through its highest practical external interface, so that it verifies observable behavior rather than internal implementation details.
7. As a developer, I want foundation verification to be runnable independently of later database-backed features, so that setup can be validated before Sprint 1.
8. As a developer, I want the foundation to avoid unapproved business behavior, so that implementation remains within the approved MVP scope.
9. As a developer, I want the foundation changes to preserve existing project documentation and local work, so that approved decisions and in-progress changes remain intact.

## Implementation Decisions

- Establish a runnable Next.js application using TypeScript and repository configuration consistent with the approved stack.
- Identify and use the package manager and development commands from the actual repository configuration; do not assume a package manager in advance.
- Provide a minimal, accessible StockFlow starting page as the application entry point. It must identify the product without implying that authentication or business workflows are already available.
- Keep the implementation within the existing Modular Monolith direction. Do not introduce a database, authentication, business modules, deployment infrastructure, or new architectural patterns as part of Sprint 0.
- Add only configuration and application code required to launch the baseline and run its smoke test. Preserve existing developer changes.
- Do not change approved requirements, architecture, database, API, or testing decisions as part of implementation.

## Testing Decisions

- A good test verifies observable behavior through the highest useful seam, avoids assertions about internal implementation details, uses isolated and repeatable setup, and reports failures clearly.
- Use one Playwright end-to-end smoke test as the primary feature seam: launch the application without a database, load its starting page, and assert that the StockFlow identity is visible and the page responds successfully.
- This page-only foundation smoke test is an explicit, narrowly scoped exception to the approved testing strategy's dedicated PostgreSQL requirement for E2E tests. The exception applies only while verifying the database-independent Sprint 0 starting page; E2E tests for application workflows must follow the approved database strategy.
- Use the existing Vitest smoke test for `getWelcomeMessage` as prior art for the current minimal test baseline, but do not treat a unit-only assertion as sufficient verification of the runnable application.
- Verify the documented development and test commands using the package manager actually established by repository configuration.
- Database, authentication, product, inventory, order, dashboard, concurrency, and deployment tests are outside this spec because those capabilities belong to later work.

## Out of Scope

- Administrator authentication, sessions, authorization, and protected routes.
- PostgreSQL setup, Prisma schema, migrations, repositories, or database integration.
- Product, inventory, order, dashboard, and audit functionality.
- API endpoints and business-rule validation.
- CI/CD workflows, cloud deployment, monitoring, or production infrastructure.
- New dependencies or architectural decisions not required by the approved foundation.
- Advancing into Sprint 1 or any later roadmap phase.

## Further Notes

- The user confirmed the Sprint 0 interpretation and the single highest-practical-seam smoke-test approach.
- The README identifies Sprint 0 as Project Foundation and marks it In Progress.
- Existing local changes include approved project documents and a minimal welcome function with a Vitest smoke test. Preserve them; decide during implementation whether they fit the runnable application baseline, without broad unrelated refactoring.
- The current repository does not contain a package manifest, so package manager and commands remain to be established from actual configuration rather than assumed.
