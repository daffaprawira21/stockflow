# Next.js 16 API Surface (App Router) — Primary-Source Research Note

Applies to: **next@16.4.6** (verified in `node_modules/next/package.json` `"version": "16.4.6"`; `package.json` dependency range is `"next": "^16.4.6"`).

All citations below point at the docs bundled inside the installed package (`node_modules/next/dist/docs/`), which match 16.4.6 exactly, or at type definitions in `node_modules/next/dist/`. Where the website was used it is stated explicitly.

---

## Summary

The 8 differences that actually change how this app (App Router, TS, `route.ts` API layer, Prisma/Postgres, Zod) must be written versus 13/14/15 habits:

1. **`params` is a Promise and sync access is gone.** `cookies()`, `headers()`, `draftMode()`, and `params` in `layout/page/route/default/opengraph-image/icon` are async-only; the Next 15 synchronous compatibility layer was removed in 16 (not just deprecated). Route handlers: `{ params }: { params: Promise<{ id: string }> }` then `await params` ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
2. **`revalidateTag` now requires a second argument.** `revalidateTag(tag, profile)`; single-arg form is deprecated and is a TypeScript error against the shipped types. Use `'max'` for stale-while-revalidate or `{ expire: 0 }` for immediate ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md), [source: node_modules/next/dist/server/web/spec-extension/revalidate.d.ts](node_modules/next/dist/server/web/spec-extension/revalidate.d.ts)).
3. **`updateTag` and `refresh` are new** (`next/cache`). `updateTag(tag)` is Server-Actions-only and gives read-your-writes; `refresh()` re-renders the client router from an action ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md)).
4. **`middleware.ts` is deprecated → `proxy.ts`** with an exported `proxy` function; the proxy runtime is Node.js only and `export const runtime` throws in that file. Edge middleware must stay on `middleware` ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)).
5. **`use cache` / `use cache: private` / `use cache: remote` are stable but gated behind `cacheComponents: true`.** With it enabled, `dynamic`, `dynamicParams`, `revalidate`, `fetchCache` segment configs are *removed* and PPR becomes the default ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md)).
6. **`fetch` is uncached by default** (`auto no cache`) and `cache: 'force-cache'` is the opt-in; this is unchanged from 15 but is the opposite of the Next 13/14 "extended fetch caches by default" model ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md)).
7. **Turbopack is the default bundler** for both `next dev` and `next build`; a custom `webpack` config makes `next build` *fail* unless you pass `--webpack` ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
8. **Prisma needs no bundler config**: `@prisma/client`, `prisma`, and `pg` are already in the built-in `serverExternalPackages` opt-out list ([source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md](node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md)).

---

## Route handlers (`app/**/route.ts`)

**Supported method exports:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. An unsupported verb yields `405 Method Not Allowed`; if `OPTIONS` is not exported, Next.js implements it and sets the `Allow` header ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md), [source: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md](node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md)).

**`params` is a Promise.** The second argument is a context object whose `params` is `Promise<{...}>`:

```ts
// app/api/orders/[id]/route.ts
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return Response.json({ id })
}
```

`app/orders/[id]/route.ts` → `/orders/1` gives `Promise<{ id: '1' }>` ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md)).

**`searchParams` is NOT part of the handler context.** Read the query string from `request.nextUrl.searchParams` (`NextRequest`), because the request object is a `NextRequest` instance ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md)):

```ts
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') // sync — request props are not Promises
}
```

**Typed context helper (preferred over hand-written generics).** `RouteContext<'/users/[id]'>` is globally available after `next dev`, `next build`, or `next typegen`; it needs no import ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md)):

```ts
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/orders/[id]'>) {
  const { id } = await ctx.params
  return Response.json({ id })
}
```

**Caching of `GET`: uncached by default.** "Route Handlers are not cached by default. You can, however, opt into caching for `GET` methods… use a route config option such as `export const dynamic = 'force-static'`." Non-GET methods are never cached, even when co-located with a cached `GET` ([source: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md](node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md)). The static→dynamic default flip happened in `v15.0.0-RC`, per the file's version history ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md)).

**With `cacheComponents: true`**, `GET` handlers follow the UI-route model: request-time by default, prerendered when they touch no uncached/runtime data, and `use cache` (in a helper function, not in the handler body) folds DB work into the prerendered response ([source: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md](node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md)):

```ts
// app/api/products/route.ts — 'use cache' cannot go in the handler body
export async function GET() {
  return Response.json(await getProducts())
}

async function getProducts() {
  'use cache'
  cacheLife('hours')
  return db.product.findMany()
}
```

**Segment config available to route handlers** (previous caching model): `dynamic`, `dynamicParams`, `revalidate`, `fetchCache`, `runtime`, `preferredRegion` (deprecated) ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md)). `runtime` accepts `'nodejs'` (default) only — `'edge'` is deprecated — and cannot be exported at all when `cacheComponents` is on ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md), [source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md](node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md)).

**Streaming** is plain Web API: build a `ReadableStream` and return `new Response(stream)` ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md)). Routing constraint to remember: a `route.ts` may not sit at the same segment as a `page.tsx` ([source: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md](node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md)). `fetch` memoization does **not** apply inside route handlers, because they are not part of the React component tree ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md)).

**Security framing for this app's API layer:** route handlers are public HTTP endpoints — "Any client can access them"; catch throws, return generic errors, and do authn/authz yourself ([source: node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md](node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md)).

---

## Server Actions and the `'use server'` directive

**Rules.** `'use server'` at file top marks every export as a Server Function; inline at the top of a function marks just that one. It is a React feature; Server Functions must be `async`. A shared file needs `'use server'` at the top for Client Component imports ([source: node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md](node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md)). Proxy does not apply directive transforms, so `'use server'` has no effect in `proxy.ts` ([source: node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md](node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md)).

**They are public POST endpoints.** "A Server Action runs as a POST request against the page that invokes it… Treat every action as an untrusted entry point." Framework protections: `Origin`/`Host` CSRF check (`serverActions.allowedOrigins` for proxies/CDNs), 1 MB body limit (`serverActions.bodySizeLimit`), encrypted action IDs, dead-code elimination of unused actions, and encrypted closure variables (set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for multi-instance/self-hosted) ([source: node_modules/next/dist/docs/01-app/02-guides/server-actions.md](node_modules/next/dist/docs/01-app/02-guides/server-actions.md)).

**Zod does not solve ownership.** "Schema validation (zod or similar) only checks the *shape* of the input. A well-formed `Item` object can still refer to a row the caller does not own." Take an ID plus the change, re-read the row from the session's authority ([source: node_modules/next/dist/docs/01-app/02-guides/server-actions.md](node_modules/next/dist/docs/01-app/02-guides/server-actions.md)).

**Dispatch semantics.** Next.js dispatches actions one at a time per client — do not use `Promise.all` to parallelize actions from the client ([source: node_modules/next/dist/docs/01-app/02-guides/server-actions.md](node_modules/next/dist/docs/01-app/02-guides/server-actions.md)).

**Revalidation hooks that produce a same-response re-render:** `updateTag`, `revalidatePath`, `refresh`, cookie mutation via `cookies()`, and `redirect`. `revalidateTag` with an SWR profile is the exception — it does **not** re-render the current route in the action response ([source: node_modules/next/dist/docs/01-app/02-guides/server-actions.md](node_modules/next/dist/docs/01-app/02-guides/server-actions.md)).

**Proxy matchers and actions.** Server Functions are POSTs to the page that uses them, so a matcher that excludes a path also skips actions on that path — verify auth inside each action rather than relying on proxy ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)).

---

## Caching and revalidation

**`fetch` defaults (unchanged in 16, still opposite to 13/14).** `auto no cache` is the default; `cache: 'no-store'` forces per-request; `cache: 'force-cache'` opts into the server cache (only `200` responses stored; also caches `POST` and requests carrying `authorization`/`cookie` when explicitly forced). `next.revalidate` is `false | 0 | number`; `next.tags` caps at 256 chars per tag and 128 tags ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md)).

**Route segment config for the non-Cache-Components model.** `dynamic = 'auto' | 'force-dynamic' | 'error' | 'force-static'`, `revalidate = false | 0 | number` (must be statically analyzable: `600` ok, `60 * 10` not), `fetchCache` ([source: node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md](node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md)). Under `cacheComponents: true`, `dynamic`, `dynamicParams`, `revalidate`, and `fetchCache` are **removed** ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md)).

**`use cache` (stable in 16, requires `cacheComponents: true`).** Function-, component-, or file-level directive; every covered function must be `async`. Cache key = build/deployment ID + function ID hash + serialized args (closure captures are bound as args). Args/returns must be serializable (no class instances, functions, symbols, `URL`). No request-time APIs (`cookies`, `headers`, `searchParams`) inside the scope, and the restriction follows the call stack ([source: node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md](node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md)).

```ts
// lib/orders.ts
export async function getOrders(accountId: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(`orders-${accountId}`)
  return db.order.findMany({ where: { accountId } })
}
```

Default `cacheLife` profile when omitted: stale 5 min (client), revalidate 15 min (server), never expires by time ([source: node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md](node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md)). Server storage is in-memory by default; entries do not survive a new deploy because the build ID is in the key ([source: node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md](node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md)).

**`use cache: private`** — the escape hatch that *may* read `cookies()`, `headers()`, `searchParams`. In production it reuses results only within one request (no cross-request server cache); it can never be used with a custom cache handler; `connection()` is forbidden in both `use cache` and `use cache: private` ([source: node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-private.md](node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-private.md)).

**`use cache: remote`** — durable, shared-across-instances entry via the `cacheHandlers` config; still does not survive deploys. Nesting: remote-in-remote and remote-in-`use cache` are valid; remote-in-private and private-in-remote are errors ([source: node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-remote.md](node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-remote.md)).

**Invalidation APIs.**

```ts
revalidateTag(tag: string, profile: string | { expire?: number }): undefined
updateTag(tag: string): undefined   // Server Actions only
revalidatePath(path: string, type?: 'page' | 'layout'): undefined
```

`'max'` = ~1 year SWR window (recommended); `{ expire: 0 }` = block on next request; the deprecated no-second-arg form behaves like `{ expire: 0 }`. `revalidateTag` works in Server Functions and Route Handlers but not in Client Components or Proxy ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md)). `updateTag` cannot be called from a Route Handler — from a webhook use `revalidateTag(tag, { expire: 0 })` ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md)). `revalidatePath` from a Route Handler only marks the path; revalidation happens on the next visit ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md)).

**`cacheLife` / `cacheTag` are stable** — drop the `unstable_` prefix from Next 15 aliased imports — but they only do anything inside a `use cache` scope, i.e. still require `cacheComponents` ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md), [source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheTag.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheTag.md)).

**PPR.** `experimental.ppr` and the `experimental_ppr` segment config are removed; PPR is what `cacheComponents: true` turns on ([source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md](node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md)).

---

## `next.config.ts` options that matter here

| Option | Status in 16.4.6 | Relevance |
| --- | --- | --- |
| `typedRoutes` | stable, top-level (not `experimental.typedRoutes`) | typed `href`s for order/inventory links ([source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/typedRoutes.md](node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/typedRoutes.md)) |
| `serverExternalPackages` | stable, renamed from `serverComponentsExternalPackages` in 15 | `@prisma/client`, `prisma`, `pg` already default-external ([source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md](node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md)) |
| `cacheComponents` | stable top-level (was `experimental.cacheComponents`) | turns on `use cache` + PPR; replaces `ppr`/`useCache`/`dynamicIO` ([source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md](node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md)) |
| `partialPrefetching` | new, set explicitly alongside `cacheComponents` | leaving it unset logs a warning ([source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md](node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md)) |
| `turbopack` | top-level (`experimental.turbopack` is gone) | loaders/aliases if native Prisma engines need them ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)) |
| `eslint` | **removed** | `next build` no longer lints ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)) |
| `serverRuntimeConfig` / `publicRuntimeConfig` | **removed** | use `process.env` (+ `connection()` for runtime reads) ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)) |
| `skipMiddlewareUrlNormalize` | renamed → `skipProxyUrlNormalize` | — ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)) |

```ts
// next.config.ts — shape for this project
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: true,
  // @prisma/client, prisma and pg are external by default; add others if a
  // native-binding package breaks bundling:
  // serverExternalPackages: ['@prisma/adapter-pg'],
}

export default nextConfig
```

No Prisma-specific bundler configuration is required by the docs; the external-package list is the only Prisma/Node-API hook documented in the shipped config reference ([source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md](node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md)).

**Observation about the repo's current `next.config.ts`:** it exports `nextConfig` (empty object) via `export default` *and* then assigns an unrelated `module.exports = { allowedDevOrigins: [...] }`. The config docs only document a default export (`.mjs`/`.ts`-style) or `module.exports` for the CJS `.js` form, never both in one file ([source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/index.md](node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/index.md)). Whether the trailing `module.exports` is ignored in a `.ts` config is **not stated by the docs** — see Gaps.

---

## Middleware → Proxy

- `middleware.js` is **deprecated and renamed** to `proxy.js`; all functionality is the same but the export is `proxy` (default export or named), and only one proxy function per file is supported ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md), [source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)).
- **Runtime is Node.js and not configurable.** "The `edge` runtime is **NOT** supported in `proxy`… If you want to continue using the `edge` runtime, keep using `middleware`" ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)). Setting `export const runtime` in a proxy file throws ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)).
- File location: project root (or `src/`), at the same level as `app/`. Signature `(request: NextRequest, event: NextFetchEvent)`; `NextProxy` type is exported from `next/server` for inference ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md), [source: node_modules/next/server.d.ts](node_modules/next/server.d.ts)).
- Without a `matcher`, proxy runs on **every** request including `_next/static`, `_next/image`, and `public/`. `_next/data` is still matched even when excluded by a negative pattern — intentional, to avoid protecting a page but not its data ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)).

```ts
// proxy.ts
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (!request.cookies.has('session')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = { matcher: ['/inventory/:path*', '/orders/:path*'] }
```

---

## Request / response helpers

| Helper | 16.4.6 reality |
| --- | --- |
| `cookies()` — `next/headers` | **async**; `await cookies()`; `.set`/`.delete` only in Server Functions or Route Handlers ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md)) |
| `headers()` — `next/headers` | **async**, read-only ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/headers.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/headers.md)) |
| `draftMode()` | **async**; `enable()`/`disable()` only in Route Handlers or Server Actions ([source: node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md](node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md)) |
| `NextRequest` | sync props: `.cookies.get/set/delete/has/clear`, `.nextUrl` (URL + `searchParams`) ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-request.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-request.md)) |
| `NextResponse` | `redirect`, `rewrite`, `json`, `next()` ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)) |
| `after(cb)` — `next/server` | stable since 15.1; runs after the response. In Route Handlers/Server Functions you *can* call `cookies()`/`headers()` inside the callback; in Server Components you **cannot** — read them during render and close over the values ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md)) |
| `connection()` — `next/server` | exported from `next/server`; prohibited in both `use cache` and `'use cache: private'` because connection-specific information cannot be cached ([source: node_modules/next/server.d.ts](node_modules/next/server.d.ts), [source: node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-private.md](node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-private.md)) |

```ts
// after() in a route handler — request APIs are allowed here
import { after } from 'next/server'
import { cookies, headers } from 'next/headers'

export async function POST(request: Request) {
  after(async () => {
    const ua = (await headers()).get('user-agent') ?? 'unknown'
    const sid = (await cookies()).get('session')?.value ?? 'anon'
    await auditLog({ ua, sid })
  })
  return Response.json({ ok: true })
}
```

`next/server` in 16.4.6 exports `NextRequest`, `NextResponse`, `NextFetchEvent`, `NextProxy`/`ProxyConfig`, `ImageResponse`, `after`, `connection`, `userAgent`, `URLPattern` ([source: node_modules/next/server.d.ts](node_modules/next/server.d.ts)).

---

## Breaking changes from the v16 upgrade guide (that this app can trip over)

- **Async request APIs enforced.** Sync `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` access is fully removed ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
- **`opengraph-image`/`icon` `params` and `id` are Promises; `sitemap`'s `id` is a Promise**; `generateImageMetadata` still gets sync `params` ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
- **`revalidateTag` second argument required** (TypeScript error otherwise) ([source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md)).
- **Parallel route slots require an explicit `default.js`** — builds fail without one ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
- **`next lint` removed**; `next build` no longer lints; the `eslint` config option is gone. `eslint-config-next@16` needs ESLint ≥ 9 ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
- **`serverRuntimeConfig`/`publicRuntimeConfig` removed** ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
- **Turbopack default; custom `webpack` config fails `next build`** — use `--webpack` or migrate ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
- **`next dev` writes to `.next/dev`** and a lockfile blocks two concurrent `next dev`/`next build` runs on one project ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
- **Config file is loaded once in dev**: `process.argv.includes('dev')` is now `false` inside `next.config.ts`; use `NODE_ENV` or `phase` ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
- **`images` defaults changed**: `minimumCacheTTL` 60s→4h, `qualities` limited to `[75]`, `16` removed from `imageSizes`, `maximumRedirects` 3, local IP optimization blocked, local `src` with query strings needs `images.localPatterns.search`; `images.domains` deprecated ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
- **Scroll behavior**: Next.js no longer overrides global `scroll-behavior: smooth` during navigation unless `<html data-scroll-behavior="smooth">` ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).
- **Node 20.9+/TS 5.1+** minimums; AMP removed; `unstable_rootParams` removed (use `next/root-params`); `experimental.viewTransition` removed in 16.3.0; `experimental.appNewScrollHandler` removed in 16.4.0 ([source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md](node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)).

---

## Testing notes (shipped Vitest guide)

- Setup: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`; `vitest.config.mts` with `plugins: [tsconfigPaths(), react()]` and `test.environment: 'jsdom'` ([source: node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md](node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md)).
- **`async` Server Components are not supported by Vitest** — the guide says to use E2E tests for them; unit-test only sync Server/Client Components ([source: node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md](node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md)). Practical consequence for this repo: test Zod schemas, pure Prisma-mapping helpers, and sync components in Vitest; test `route.ts` handlers and async pages with Playwright (already a devDependency).
- The shipped guide contains **no guidance on mocking `next/` modules** (`next/headers`, `next/cache`, `next/navigation`) and no route-handler invocation helper — see Gaps.
- The one documented test helper for framework internals is `next/experimental/testing/server` (since 15.1): `unstable_doesMiddlewareMatch`, `isRewrite`, `getRewrittenUrl` for proxy files ([source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)).

---

## Breaking changes checklist

- [ ] `await` every `params` in `route.ts`, `page.tsx`, `layout.tsx`, `default.tsx`, `generateMetadata`-adjacent image/sitemap functions.
- [ ] `await cookies()` / `await headers()` / `await draftMode()` everywhere (no sync fallback).
- [ ] Route handler context typed as `{ params: Promise<...> }` or `RouteContext<'/path/[id]'>`; query strings read from `request.nextUrl.searchParams`.
- [ ] Every `revalidateTag(tag)` call upgraded to `revalidateTag(tag, 'max')` or `{ expire: 0 }`; read-your-writes paths use `updateTag(tag)` in Server Actions only.
- [ ] Drop `unstable_` prefixes on `cacheLife` / `cacheTag`.
- [ ] Decide on `cacheComponents`: if enabled, delete `dynamic`/`dynamicParams`/`revalidate`/`fetchCache`/`runtime` exports and add `partialPrefetching`.
- [ ] Rename `middleware.ts` → `proxy.ts` and `middleware` → `proxy`; confirm nothing depends on the Edge runtime before renaming.
- [ ] Replace `skipMiddlewareUrlNormalize` with `skipProxyUrlNormalize`.
- [ ] Remove `serverRuntimeConfig`/`publicRuntimeConfig`; use `process.env` (+ `connection()` if it must be read at runtime).
- [ ] Confirm no `eslint` key in `next.config.ts`; lint runs via `eslint .` (already the repo's script).
- [ ] Add `default.tsx` to any parallel route slot (`@modal`, etc.).
- [ ] Remove `experimental.ppr` / `experimental_ppr`.
- [ ] If a `webpack` config appears anywhere (including via a plugin), plan for `next build --webpack`.
- [ ] Re-check `next/image` usage for `qualities`, `minimumCacheTTL`, and local `src` query strings.
- [ ] Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for multi-instance/self-hosted deploys.
- [ ] Authenticate/authorize inside every Server Action; do not rely on proxy matchers.

---

## Gaps and unverified claims

1. **grep tooling note (methodology, not a Next claim):** the repo-wide ripgrep-backed search returned zero matches for known-present strings under `node_modules/next/dist/docs` (paths contain a space), so navigation was done with directory listings, direct reads, and PowerShell `Select-String`. No doc file was skipped as a result, but searches were narrower than ideal.
2. **`dynamic` / `revalidate` / `fetchCache` availability in 16.4.6 without `cacheComponents` is inferred, not stated verbatim.** The route-segment-config index lists only `dynamicParams`, `runtime`, `preferredRegion`, `maxDuration`, `ensureStatic`, and says those four were "removed when Cache Components is enabled"; the previous-model guide still documents them fully ([index.md](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md), [caching-without-cache-components.md](node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md)). I did **not** verify at runtime that a `export const revalidate = 60` export still type-checks and behaves in 16.4.6 without `cacheComponents`.
3. **The repo's `next.config.ts` mixes `export default` with a trailing `module.exports = { allowedDevOrigins: [...] }`.** The docs do not state what Next.js 16 does with the second, unused export in a `.ts` config. Treat "the `allowedDevOrigins` setting is inert" as UNVERIFIED — it needs a runtime check (e.g. `next dev` warning output).
4. **Prisma + Turbopack.** No shipped doc covers Prisma query-engine binaries under Turbopack beyond the automatic `serverExternalPackages` entry. Whether the schema/engine resolution works without extra `turbopack.resolveAlias` config is UNVERIFIED for 16.4.6.
5. **`vitest@5.1.0`** is what this repo installs; the shipped Vitest guide is version-agnostic and does not mention v5. Compatibility of the guide's config with Vitest 5 is UNVERIFIED.
6. **`partialPrefetching`** is documented only as "set it explicitly" alongside `cacheComponents` ([cacheComponents.md](node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md)); the dedicated `partialPrefetching.md` page was not read, so its full option shape is UNVERIFIED here.
7. **No website sources were used.** Every claim above is from `node_modules/next/dist/docs/` or `node_modules/next/**/*.d.ts` matching 16.4.6. No blog posts, StackOverflow, or Medium were consulted.
8. **`use cache` behavior under a serverless host** is described by the docs as provider-dependent ("some do not store `use cache` output at runtime"), so in-memory cache hit rates for this app's deployment target are UNVERIFIED ([use-cache.md](node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md)).
