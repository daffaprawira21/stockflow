import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from '../../lib/api/errors';
import { apiHandler, type ApiHandlerConfig } from '../../lib/api/api-handler';
import type { PublicUser } from '../../modules/auth/service';

vi.mock('../../lib/env', () => ({
  allowedOrigins: ['http://127.0.0.1:3000'],
}));
vi.mock('../../lib/db', () => ({
  default: {},
}));

type Guard = (request: Request) => Promise<PublicUser>;

const defaultGuard: Guard = async () => ({ id: 'u1', email: 'a@b.c', role: 'ADMIN' });
const unauthGuard: Guard = async () => {
  throw new ApiError('UNAUTHENTICATED');
};

function makeRequest(init: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
} = {}) {
  const url = init.url ?? 'http://127.0.0.1:3000/api/test';
  const headers: Record<string, string> = {
    origin: 'http://127.0.0.1:3000', // same-origin: lets state-changing methods pass
    ...init.headers,
  };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  return new Request(url, {
    method: (init.method ?? 'POST') as RequestInit['method'],
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers,
  });
}

type ResponseBody = {
  success: boolean;
  data: {
    echo?: string;
    raw?: boolean;
    ok?: boolean;
    id?: string;
  } | { id: string }[] | null;
  meta: { totalItems?: number } | null;
  error: { code: string; details: Array<{ path?: string }> };
};

async function run(
  config: ApiHandlerConfig,
  request: Request,
  guard?: Guard,
  params?: Promise<Record<string, string>>,
): Promise<{ status: number; body: ResponseBody }> {
  const full: ApiHandlerConfig = { ...config };
  const { createHandler } = apiHandler(full, guard ?? defaultGuard);
  const response = await createHandler(request, params);
  const status = response.status;
  const text = await response.text();
  let body: ResponseBody;
  try {
    body = JSON.parse(text) as ResponseBody;
  } catch {
    body = text as unknown as ResponseBody;
  }
  return { status, body };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('apiHandler pipeline', () => {
  it('returns FORBIDDEN (403) when the origin is not allowed on a state-changing method', async () => {
    const { status } = await run(
      { auth: false, run: async () => ({ data: { ok: true } }) },
      makeRequest({ method: 'POST', headers: { origin: 'http://evil.example' } }),
    );
    expect(status).toBe(403);
  });

  it('passes through GET regardless of origin (non-state-changing)', async () => {
    const { status } = await run(
      { auth: false, run: async () => ({ data: { ok: true } }) },
      makeRequest({ method: 'GET', headers: { origin: 'http://evil.example' } }),
    );
    expect(status).toBe(200);
  });

  it('returns UNAUTHENTICATED (401) when the admin guard rejects', async () => {
    const { status } = await run(
      { auth: true, run: async () => ({ data: { ok: true } }) },
      makeRequest({ method: 'GET' }),
      unauthGuard,
    );
    expect(status).toBe(401);
  });

  it('calls run with the validated admin when auth passes', async () => {
    let received: { admin: PublicUser | null } | undefined;
    const { status } = await run(
      {
        auth: true,
        run: async (ctx) => {
          received = ctx;
          return { data: { ok: true } };
        },
      },
      makeRequest({ method: 'GET' }),
    );
    expect(status).toBe(200);
    expect(received?.admin?.id).toBe('u1');
  });

  it('returns VALIDATION_ERROR (400) with details when the body fails the Zod schema', async () => {
    const { status, body } = await run(
      { body: z.object({ name: z.string().min(1) }), run: async () => ({ data: { ok: true } }) },
      makeRequest({ method: 'POST', body: { name: '' } }),
    );
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toHaveLength(1);
    expect(body.error.details[0].path).toBe('name');
  });

  it('returns VALIDATION_ERROR (400) when the JSON body is not parseable', async () => {
    const { status } = await run(
      { body: z.object({ name: z.string() }), run: async () => ({ data: { ok: true } }) },
      new Request('http://127.0.0.1:3000/api/test', {
        method: 'POST',
        body: 'not json',
        headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
      }),
    );
    expect(status).toBe(400);
  });

  it('returns VALIDATION_ERROR (400) when a required header is missing (idempotency-key rule)', async () => {
    const { status } = await run(
      {
        headers: z.object({ 'idempotency-key': z.string().min(1).max(255) }),
        run: async () => ({ data: { ok: true } }),
      },
      makeRequest({ method: 'POST', body: {} }),
    );
    expect(status).toBe(400);
  });

  it('passes the validated headers through to run (idempotency-key available to the route)', async () => {
    let received: { headers: unknown } | undefined;
    const { status } = await run(
      {
        headers: z.object({ 'idempotency-key': z.string().min(1).max(255) }),
        run: async (ctx) => {
          received = { headers: ctx.headers };
          return { data: { ok: true } };
        },
      },
      makeRequest({ method: 'POST', body: {}, headers: { 'idempotency-key': 'key-123' } }),
    );
    expect(status).toBe(200);
    expect((received?.headers as { 'idempotency-key': string })['idempotency-key']).toBe('key-123');
  });

  it('returns VALIDATION_ERROR (400) when the query fails the query schema', async () => {
    const { status } = await run(
      { query: z.object({ page: z.coerce.number().int().positive() }), run: async () => ({ data: { ok: true } }) },
      makeRequest({ method: 'GET', url: 'http://127.0.0.1:3000/api/test?page=-1' }),
    );
    expect(status).toBe(400);
  });

  it('returns 200 with the success envelope when everything passes', async () => {
    const { status, body } = await run(
      {
        auth: false,
        body: z.object({ name: z.string() }),
        run: async (ctx) => ({ data: { echo: (ctx.body as { name: string }).name } }),
      },
      makeRequest({ method: 'POST', body: { name: 'x' } }),
    );
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect((body.data as { echo: string }).echo).toBe('x');
  });

  it('returns 201 when run reports a custom status', async () => {
    const { status } = await run(
      { auth: false, run: async () => ({ data: { id: 'new' }, status: 201 }) },
      makeRequest({ method: 'POST', body: {} }),
    );
    expect(status).toBe(201);
  });

  it('returns the paginated envelope when run reports meta', async () => {
    const { status, body } = await run(
      {
        auth: false,
        run: async () => ({
          data: [{ id: '1' }],
          meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
        }),
      },
      makeRequest({ method: 'GET' }),
    );
    expect(status).toBe(200);
    expect(body.data).toEqual([{ id: '1' }]);
    expect(body.meta!.totalItems).toBe(1);
  });

  it('passes through a raw Response returned by run unchanged', async () => {
    const { status, body } = await run(
      { auth: false, run: async () => Response.json({ success: true, data: { raw: true }, meta: null }) },
      makeRequest({ method: 'GET' }),
    );
    expect(status).toBe(200);
    expect((body.data as { raw: boolean }).raw).toBe(true);
  });

  it('maps unexpected errors to INTERNAL_SERVER_ERROR (500)', async () => {
    const { status } = await run(
      { auth: false, run: async () => {
        throw new Error('boom');
      } },
      makeRequest({ method: 'GET' }),
    );
    expect(status).toBe(500);
  });

  it('returns 400 when the method does not match (VALIDATION_ERROR, not 405)', async () => {
    const { status } = await run(
      { method: 'POST', auth: false, run: async () => ({ data: { ok: true } }) },
      makeRequest({ method: 'GET' }),
    );
    expect(status).toBe(400);
  });

  it('validates a route param and passes the parsed value to run', async () => {
    let received: { param?: unknown } | undefined;
    const { status } = await run(
      {
        auth: false,
        param: { name: 'id', schema: z.uuid() },
        run: async (ctx) => {
          received = ctx;
          return { data: { ok: true } };
        },
      },
      makeRequest({ method: 'GET' }),
      undefined,
      Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }),
    );
    expect(status).toBe(200);
    expect(received?.param).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('returns 400 when the route param fails the param schema', async () => {
    const { status } = await run(
      {
        auth: false,
        param: { name: 'id', schema: z.uuid() },
        run: async () => ({ data: { ok: true } }),
      },
      makeRequest({ method: 'GET' }),
      undefined,
      Promise.resolve({ id: 'not-a-uuid' }),
    );
    expect(status).toBe(400);
  });

  it('returns 500 when a declared param has no params promise (pipeline contract)', async () => {
    const { status } = await run(
      {
        auth: false,
        param: { name: 'id', schema: z.uuid() },
        run: async () => ({ data: { ok: true } }),
      },
      makeRequest({ method: 'GET' }),
      undefined,
      undefined, // no params promise despite declaring `param`
    );
    expect(status).toBe(500);
  });

  it('rejects a header longer than 255 chars even when it trims shorter (idempotency-key edge)', async () => {
    // The route's header schema is `z.string().min(1).max(255)` with NO trim
    // before the length check (trim happens only at use, in run). A 256-char
    // raw header is therefore rejected even though it trims to 255 — matching
    // pre-migration behaviour. This mirrors the route's schema exactly.
    const longKey = 'a'.repeat(256); // 256 chars raw
    const { status } = await run(
      {
        auth: false,
        headers: z.object({ 'idempotency-key': z.string().min(1).max(255) }),
        run: async () => ({ data: { ok: true } }),
      },
      makeRequest({ method: 'POST', body: {}, headers: { 'idempotency-key': longKey } }),
    );
    expect(status).toBe(400);
  });
});
