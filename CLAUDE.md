# StockFlow

StockFlow is an inventory and order management application built as a Modular Monolith, with an ADMIN-only MVP.

## Project Context

The approved technology stack is:

- Next.js and TypeScript
- PostgreSQL and Prisma
- Zod
- Vitest and Playwright
- GitHub Actions

The package manager and development commands must be identified from the actual repository configuration when available. Do not assume or invent them.

## Communication

- Communicate with the developer in Indonesian.
- Write documentation, code identifiers, and technical artifacts in English unless requested otherwise.
- The developer is learning software development. Explain technical concepts clearly and guide work in small, manageable steps.

## Source of Truth

Approved project requirements and decisions are documented in:

- `docs/requirements/srs.md`
- `docs/architecture/architecture.md`
- `docs/database/database-design.md`
- `docs/api/api-contract.md`
- `docs/testing/testing-strategy.md`

Read the relevant documents before working on a task. Do not duplicate their detailed contents in this file.

Treat approved documentation as the source of truth. If documents conflict, or implementation appears inconsistent with an approved decision:

- Stop and report the discrepancy.
- Cite the relevant document sections.
- Explain the potential impact.
- Do not choose a resolution or change approved decisions without the developer's approval.

## Scope and Approval

- Work only on the task explicitly requested by the developer.
- Do not introduce unapproved features, business rules, dependencies, or architectural changes.
- Do not move to another roadmap phase merely because the previous task is complete.
- Do not create additional project documents, including a PRD, unless requested or explicitly approved.
- Read-only inspection and audits may proceed when requested.
- Before making non-trivial file changes, explain the proposed changes and wait for approval.

## Working with the Developer

- Inspect the relevant repository files before making assumptions.
- Check `git status` before modifying files.
- Make small, focused changes and avoid unrelated refactoring.
- Explain commands before asking the developer to run them.
- Prefer one logical step at a time.
- Report changed files and verification results.
- Never claim a command, test, commit, or deployment succeeded unless its result has actually been verified.

## Git Safety

The developer normally manages Git operations manually. They may delegate specific Git operations explicitly in a request.

- Do not commit or push unless explicitly requested or explicitly delegated for the current task.
- Never run destructive Git commands such as reset, clean, or force-push without explicit approval.
- Preserve existing developer changes; stage and commit only files in the delegated task scope.
- Explain the purpose of suggested Git commands.

## Task Completion

At the end of each task, summarize:

- What was completed.
- Which files changed, if any.
- What was verified and what remains unverified.
- Any unresolved issue or decision requiring approval.

Stop after completing the requested task. Do not automatically begin another task.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. See `docs/agents/domain.md`.
