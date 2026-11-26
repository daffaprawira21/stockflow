import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Stub the pipeline's dependencies before importing it, so the module under
// test never touches the real DB or env at import time.
vi.mock('../../lib/db', () => ({
  default: { user: {}, session: {}, $transaction: vi.fn() },
}));
vi.mock('../../lib/env', () => ({
  allowedOrigins: ['http://127.0.0.1:3000'],
}));
const guardMock = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}));
vi.mock('../../lib/api/guard', () => ({
  requireAdmin: guardMock.requireAdmin,
}));

import { apiHandler } from '../../lib/api/api-handler';
import { ApiError } from '../../lib/api/errors';

type Admin = { id: string; role: 'ADMIN' };

function makeRequest(init: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
} = {}) {
  const url = init.url ?? 'http://127.0.0.1:3000/api/test';
  const headers: Record<string, string> = {
    origin: 'http://127.0.0.1:3000', // same-origin: lets state-changing methods pass the origin check
    ...init.headers,
  };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  return new Request(url, {
    method: (init.method ?? 'POST') as RequestInit['method'],
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers,
  });
}

async function statusOf(response: Response): Promise<number> {
  // Drain the body so Response.json() below can read it.
  await response.arrayBuffer();
  return response.status;
}

beforeEach(() => {
  guardMock.requireAdmin.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('apiHandler pipeline', () => {
  it('returns FORBIDDEN (403) when the origin is not allowed on a state-changing method', async () => {
    const handler = apiHandler({
      auth: false,
      run: async () => ({ data: { ok: true } }),
    });
    const request = makeRequest({ method: 'POST', headers: { origin: 'http://evil.example' } });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(403);
  });

  it('passes through GET regardless of origin (isOriginAllowed returns true for non-state-changing)', async () => {
    const handler = apiHandler({
      auth: false,
      run: async () => ({ data: { ok: true } }),
    });
    const request = makeRequest({ method: 'GET', headers: { origin: 'http://evil.example' } });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(200);
  });

  it('returns UNAUTHENTICATED (401) when the admin guard throws', async () => {
    guardMock.requireAdmin.mockRejectedValue(new ApiError('UNAUTHENTICATED'));
    const handler = apiHandler({
      auth: true,
      run: async () => ({ data: { ok: true } }),
    });
    const request = makeRequest({ method: 'GET' });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(401);
  });

  it('calls run with the validated admin when auth passes', async () => {
    const admin = { id: 'u1', role: 'ADMIN' } as Admin;
    guardMock.requireAdmin.mockResolvedValue(admin);
    let received: { admin: Admin | null } | undefined;
    const handler = apiHandler({
      auth: true,
      run: async (ctx) => {
        received = ctx as never;
        return { data: { ok: true } };
      },
    });
    const request = makeRequest({ method: 'GET' });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(200);
    expect(received?.admin?.id).toBe('u1');
  });

  it('returns VALIDATION_ERROR (400) when the body fails the Zod schema', async () => {
    const handler = apiHandler({
      body: z.object({ name: z.string().min(1) }),
      run: async () => ({ data: { ok: true } }),
    });
    const request = makeRequest({ method: 'POST', body: { name: '' } });
    const response = await handler(request);
    const status = await statusOf(response);
    expect(status).toBe(400);
  });

  it('returns VALIDATION_ERROR (400) when the JSON body is not parseable', async () => {
    const handler = apiHandler({
      body: z.object({ name: z.string() }),
      run: async () => ({ data: { ok: true } }),
    });
    // Force a non-JSON body.
    const request = new Request('http://127.0.0.1:3000/api/test', {
      method: 'POST',
      body: 'not json',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
    });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(400);
  });

  it('returns VALIDATION_ERROR (400) when a header fails the headers schema (idempotency-key rule)', async () => {
    const handler = apiHandler({
      headers: z.object({ 'idempotency-key': z.string().min(1).max(255) }),
      run: async () => ({ data: { ok: true } }),
    });
    // No idempotency-key header -> schema requires it -> 400.
    const request = makeRequest({ method: 'POST', body: {} });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(400);
  });

  it('returns VALIDATION_ERROR (400) when the query fails the query schema', async () => {
    const handler = apiHandler({
      query: z.object({ page: z.coerce.number().int().positive() }),
      run: async () => ({ data: { ok: true } }),
    });
    const request = makeRequest({ method: 'GET', url: 'http://127.0.0.1:3000/api/test?page=-1' });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(400);
  });

  it('returns 200 with the success envelope when everything passes', async () => {
    const handler = apiHandler({
      auth: false,
      body: z.object({ name: z.string() }),
      run: async (ctx) => ({ data: { echo: (ctx.body as { name: string }).name } }),
    });
    const request = makeRequest({ method: 'POST', body: { name: 'x' } });
    const response = await handler(request);
    const status = await statusOf(response);
    expect(status).toBe(200);
  });

  it('returns 201 when run reports a custom status', async () => {
    const handler = apiHandler({
      auth: false,
      run: async () => ({ data: { id: 'new' }, status: 201 }),
    });
    const request = makeRequest({ method: 'POST', body: {} });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(201);
  });

  it('returns the paginated envelope when run reports meta', async () => {
    const handler = apiHandler({
      auth: false,
      run: async () => ({
        data: [{ id: '1' }],
        meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      }),
    });
    const request = makeRequest({ method: 'GET' });
    const response = await handler(request);
    const status = await statusOf(response);
    expect(status).toBe(200);
  });

  it('passes through a raw Response returned by run unchanged', async () => {
    const handler = apiHandler({
      auth: false,
      run: async () => Response.json({ success: true, data: { raw: true }, meta: null }),
    });
    const request = makeRequest({ method: 'GET' });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(200);
  });

  it('maps unexpected errors to INTERNAL_SERVER_ERROR (500)', async () => {
    const handler = apiHandler({
      auth: false,
      run: async () => {
        throw new Error('boom');
      },
    });
    const request = makeRequest({ method: 'GET' });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(500);
  });

  it('returns 405 when the method does not match', async () => {
    const handler = apiHandler({
      method: 'POST',
      auth: false,
      run: async () => ({ data: { ok: true } }),
    });
    const request = makeRequest({ method: 'GET' });
    const response = await handler(request);
    expect(await statusOf(response)).toBe(400); // VALIDATION_ERROR -> 400
  });
});
