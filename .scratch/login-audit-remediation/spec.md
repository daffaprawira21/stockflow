Status: ready-for-agent

# Login Audit Remediation — Public Metadata and Verified Frontend Behavior

## Problem Statement

An unauthenticated crawler requesting StockFlow's robots resource is redirected to the login page and receives an HTML document instead of crawler directives. Browsers also request a favicon that the application does not provide, producing a 404 and a failing best-practices audit.

The Lighthouse findings also mix application defects with deployment concerns and generated build output. Treating generated JavaScript chunk names as source files, or changing transpilation solely because an audit mentions legacy JavaScript, would add complexity without proving a user-facing improvement. StockFlow needs correct public metadata and a reproducible verification path that preserves authentication and existing frontend performance.

## Solution

Expose a valid, static robots resource through the Next.js metadata convention and allow that specific resource to bypass page authentication. Add a real favicon through the App Router metadata convention so browsers receive an icon and the document head advertises it automatically. Every other protected page and API retains its current authentication behavior.

Verify the result through HTTP requests against the running application: crawlers receive plain text without a session, browsers receive an icon, and existing login, logout, and page-protection journeys remain unchanged. Re-run the established production-bundle budget and Lighthouse checks after the changes. Do not edit generated chunks or introduce legacy-browser build configuration without measurements that justify it.

## User Stories

1. As a search engine crawler, I want to request the robots resource without a session, so that I can discover the site's crawling rules.
2. As a search engine crawler, I want the robots response to have a successful HTTP status, so that I do not treat a redirect or error page as crawler configuration.
3. As a search engine crawler, I want the robots response to use a plain-text content type, so that I can parse it using the Robots Exclusion Standard.
4. As a search engine crawler, I want a wildcard user-agent rule that allows crawling, so that the published policy is unambiguous.
5. As a search engine crawler, I want the robots response to contain directives rather than HTML, so that I do not report unknown directives from the login document.
6. As a maintainer, I want the robots policy to omit a sitemap directive until a sitemap exists, so that crawlers are not sent to another missing resource.
7. As a maintainer, I want the robots policy to avoid disallowing nonexistent application paths, so that the published rules describe the real application.
8. As a browser user, I want the application to serve a favicon successfully, so that the browser tab has an icon and the console does not report a missing asset.
9. As a browser user, I want the login document to advertise its favicon in the document head, so that browsers can discover it without hard-coded markup in individual pages.
10. As an unauthenticated visitor, I want public metadata to remain accessible, so that crawler and browser discovery does not depend on an administrator session.
11. As an administrator, I want protected pages to continue redirecting me to login when I have no session, so that making metadata public does not weaken page protection.
12. As an administrator, I want protected APIs to retain their existing authentication and authorization checks, so that public metadata does not expose application data.
13. As an administrator, I want login and logout to behave exactly as before, so that audit remediation does not regress the authentication journey.
14. As a developer, I want public metadata implemented through framework conventions, so that caching, content types, and document metadata are handled consistently.
15. As a developer, I want generated build chunks left untouched, so that fixes survive subsequent builds and content hashes can change safely.
16. As a maintainer, I want the production client bundle to remain within its established gzip budget, so that metadata fixes do not introduce a performance regression.
17. As an administrator, I want authentication navigation to retain its single RSC fetch per transition, so that the verified removal of duplicate requests is not undone.
18. As a developer, I want performance claims tied to reproducible production-build measurements, so that local development-server audits are not mistaken for production regressions.
19. As a developer, I want no new transpiler or browser-target configuration without before-and-after evidence, so that speculative legacy-JavaScript fixes do not become permanent maintenance costs.
20. As a maintainer, I want regression tests at the external HTTP boundary, so that the original crawler and favicon failures cannot return unnoticed.
21. As a maintainer, I want existing unit, integration, and end-to-end checks to remain authoritative, so that this audit work does not trade correctness for a better report.
22. As a developer, I want deployment-only HTTPS and HTTP/2 findings separated from application work, so that local infrastructure findings are not misrepresented as source-code defects.

## Implementation Decisions

### Public robots metadata

- Use the Next.js App Router robots metadata convention with a statically generated `MetadataRoute.Robots` result. No custom route handler or runtime request processing is needed.
- Publish one wildcard rule: user agent `*`, allow `/`.
- Do not emit a sitemap directive because the application has no sitemap resource.
- Do not copy the audit's example `/private/` disallow rule; that path does not exist in StockFlow.
- Keep the metadata deterministic and statically cacheable. It must not inspect cookies, query the database, or include timestamps.
- The generated response must be successful plain text containing `User-Agent: *` and `Allow: /`, with no HTML document or login content.

### Authentication proxy boundary

- Add the robots resource to the proxy's documented negative matcher exclusions, alongside the existing API, login, static asset, and favicon exclusions.
- Exempt only public metadata. Do not add broad exclusions for page routes, RSC requests, or API routes.
- Preserve the existing behavior in which a request without the session cookie is redirected to login for protected pages.
- Preserve server-side session validation and API guards; the proxy exclusion is not an authorization decision for application data.

### Favicon

- Supply a valid `.ico` image using the App Router's top-level favicon convention. Do not use a text placeholder, a renamed non-image file, or a runtime-generated icon substitute.
- Let Next.js serve the favicon at `/favicon.ico` and inject the appropriate icon link into the document head.
- The favicon must be available with or without a session cookie and must have a non-empty image response.
- Use a simple StockFlow-appropriate icon; a complete brand identity system is not required.

### Frontend performance and generated assets

- Treat all generated chunks and their hashed names as build artifacts. Never edit them directly and never write tests against their filenames.
- Preserve the current production baseline of approximately 132.6 KB gzipped modern JavaScript for the login route and enforce the established 160 KB gzip budget after the changes.
- Preserve the verified single-RSC-fetch behavior after login and logout. Do not reintroduce a navigation refresh immediately after a replacement navigation.
- Do not add Babel, SWC, browserslist, or custom webpack/Turbopack configuration in response to the legacy-JavaScript audit item. Revisit that only with a reproducible measurement showing application-owned code is responsible.
- Do not count the legacy `noModule` polyfill chunk as modern-browser transfer; modern browsers skip it.
- No new runtime dependency is required for this work.

### Deployment findings

- HTTPS, HTTP/2, HTTP/3, TLS certificates, and port 80-to-443 redirects belong to the serving infrastructure, not the Next.js chunk pipeline.
- The audited LAN development URL is not evidence of production transport security. Record these items for the production deployment checklist rather than implementing speculative server infrastructure in this spec.

## Testing Decisions

A good test verifies externally observable behavior through the running application, uses no implementation-only mocks, and does not depend on generated chunk names or internal module structure. The confirmed primary seam is HTTP end-to-end testing through Playwright.

### Public metadata regression coverage

Add Playwright coverage using the existing application server and request/browser fixtures:

- Request the robots resource with no session state. Assert HTTP 200, a `text/plain` content type, and the exact normalized wildcard allow directives. Assert that the final response is not a redirect to login and does not contain an HTML doctype.
- Repeat the robots request with an arbitrary session-cookie value. Assert the same public response, demonstrating that access is deterministic rather than dependent on session validity.
- Request the favicon with no session state. Assert HTTP 200, an image content type, a non-empty body, and no login redirect.
- Load the login page and assert that its document head contains an icon link pointing to the framework-served favicon.
- Retain the existing unauthenticated home-page redirect test and the full administrator sign-in/sign-out journey to prove the proxy boundary was narrowed only for public metadata.

No new unit-test seam is needed for the static robots rule or favicon convention. Unit tests would not catch the proxy redirect that caused the original defect.

### Prior art

- Use the existing Playwright authentication and unauthenticated-page tests as the pattern for browser and request behavior.
- Continue using the dedicated PostgreSQL test environment and existing E2E server lifecycle; the new public metadata assertions themselves require no database fixtures.
- Use the established production performance-budget command as the deterministic bundle regression check. It measures actual modern-browser assets over HTTP and excludes `noModule` resources.

### Verification requirements

- Typecheck and lint must pass.
- Existing unit, integration, and E2E suites must pass in their supported environments; no test may be deleted, skipped, or weakened to accommodate this work.
- The new public metadata E2E cases and the existing authentication E2E cases must pass together.
- After a production build, the performance budget must pass and the measured gzip total must be recorded. A result within ordinary measurement noise is not a performance improvement claim.
- Re-run Lighthouse against the same build mode and URL class used for verification. Confirm that the robots and favicon findings are resolved. Record the environment rather than comparing scores directly with audits taken under different conditions.

## Out of Scope

- Editing, minifying, or splitting generated JavaScript chunks directly.
- Broad framework replacement, App Router removal, React runtime optimization, or speculative bundle refactors.
- New Babel, SWC, browserslist, webpack, or Turbopack configuration.
- HTTPS certificates, HTTP/2 or HTTP/3 setup, reverse-proxy configuration, hosting changes, and production port redirects.
- A sitemap, web app manifest, Apple touch icons, additional icon sizes, or a broader branding exercise.
- Changes to product, inventory, order, dashboard, session, or database business rules.
- Third-party resources that are not emitted by this application's production build, including any externally injected readability script.
- Production real-user monitoring, a Lighthouse-score CI gate, or large-scale load testing.
- Resolving unrelated local Vitest runner/tooling failures as part of the metadata change.

## Further Notes

- The supplied audit reports Performance 92 and TBT 230 ms; the earlier local production baseline measured Performance 83 and TBT 680 ms under different conditions. These figures must not be merged into one trend or used as before/after evidence for the same change.
- The earlier production measurement found approximately 449 KB uncompressed and 132.6 KB gzipped modern JavaScript on the login route. Page-specific code was only about 4.2 KB gzipped; framework script evaluation dominated blocking time.
- The current working state already contains the duplicate-RSC-navigation removal and the 160 KB gzip budget guard. Treat those as baseline behavior to preserve, not as new work to repeat.
- The root cause of the HTML robots response is the authentication proxy redirect. Merely adding a robots metadata file without changing that boundary would leave the defect unresolved.
- HTTPS and modern HTTP protocol findings remain valid deployment checklist items, but they require a production-like serving environment before they can be meaningfully verified.

### Post-remediation verification (2026-11-13)

- Final production build served locally on `127.0.0.1`; `npm run test:e2e` passed all 8 Playwright tests, including 5 public metadata cases and both authentication journeys.
- `npm run perf:budget` measured 132.6 KB gzipped modern JavaScript on `/login` against the 160 KB budget, with 27.4 KB headroom.
- Lighthouse against the final production build reported Performance 92, Accessibility 100, Best Practices 100, and SEO 100. `robots.txt` was valid, the page was crawlable, and no browser console errors were logged.
- This Lighthouse run used a local production build rather than the supplied audit's LAN development URL, so the scores are a verification record, not a like-for-like performance comparison.
