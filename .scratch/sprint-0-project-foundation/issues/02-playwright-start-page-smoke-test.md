# 02: Verify Starting Page with Playwright

**What to build:** A developer can run a repeatable end-to-end smoke test that starts StockFlow without a database, loads its starting page, and confirms the application responds and displays its identity.

**Blocked by:** 01: Set Up Runnable StockFlow Application.

**Status:** ready-for-agent

- [ ] A Playwright end-to-end smoke test launches the application without a database and loads the starting page.
- [ ] The test verifies a successful response and visible StockFlow identity through the application interface.
- [ ] The repository documents how to run the application and smoke test using the configured package manager.
- [ ] The smoke test checks observable behavior rather than internal implementation details.
