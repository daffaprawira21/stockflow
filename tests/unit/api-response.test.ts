import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ERROR_STATUS } from '../../lib/api/errors';
import {
  errorBody,
  jsonError,
  jsonFromError,
  jsonPaginated,
  jsonSuccess,
  logUnexpectedError,
  paginatedBody,
  paginationMeta,
  successBody,
} from '../../lib/api/response';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('response envelope', () => {
  it('wraps a single resource with null meta', () => {
    expect(successBody({ id: '1' })).toEqual({
      success: true,
      data: { id: '1' },
      meta: null,
    });
  });

  it('wraps a list with pagination metadata', () => {
    const meta = paginationMeta(2, 10, 25);

    expect(meta).toEqual({ page: 2, limit: 10, totalItems: 25, totalPages: 3 });
    expect(paginatedBody([1, 2], meta)).toEqual({
      success: true,
      data: [1, 2],
      meta: { page: 2, limit: 10, totalItems: 25, totalPages: 3 },
    });
  });

  it('reports zero pages for an empty result', () => {
    expect(paginationMeta(1, 10, 0).totalPages).toBe(0);
  });

  it('builds the documented error envelope', () => {
    expect(errorBody('INSUFFICIENT_STOCK', undefined, [{ productId: 'p1' }])).toEqual({
      success: false,
      error: {
        code: 'INSUFFICIENT_STOCK',
        message: 'Insufficient stock for one or more products',
        details: [{ productId: 'p1' }],
      },
    });
  });

  it('returns HTTP responses with contract status codes', async () => {
    const success = jsonSuccess({ ok: true });
    expect(success.status).toBe(200);
    expect(await success.json()).toEqual({ success: true, data: { ok: true }, meta: null });

    const paginated = jsonPaginated([], paginationMeta(1, 10, 0));
    expect(paginated.status).toBe(200);

    const error = jsonError('VALIDATION_ERROR');
    expect(error.status).toBe(ERROR_STATUS.VALIDATION_ERROR);
    expect(await error.json()).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [],
      },
    });
  });
});

describe('error mapping', () => {
  it('maps an ApiError to its own status and message', async () => {
    const response = jsonFromError(new ApiError('RESOURCE_NOT_FOUND', 'Order not found'));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Order not found',
        details: [],
      },
    });
  });

  it('maps unknown errors to a generic 500 without leaking details', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = jsonFromError(
        new Error('connect ECONNREFUSED postgres://user:secret@localhost'),
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(JSON.stringify(body)).not.toContain('secret');
      expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('logs unexpected errors with credentials redacted from the message', () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let logged: unknown;
    try {
      const err = new Error('connect ECONNREFUSED postgres://user:secret@localhost:5432/db');
      err.stack = 'Error: connect ECONNREFUSED postgres://user:secret@localhost:5432/db\n    at route';
      logUnexpectedError(err, { route: '/api/orders' });
      logged = logSpy.mock.calls[0]?.[0];
    } finally {
      logSpy.mockRestore();
    }

    const json = JSON.parse(logged as string) as {
      kind: string;
      route: string;
      error: { name: string; message: string; stack: string };
      timestamp: string;
    };
    expect(json.kind).toBe('unexpected-error');
    expect(json.route).toBe('/api/orders');
    expect(json.error.name).toBe('Error');
    expect(json.error.message).toContain('postgres://[redacted]@localhost');
    expect(json.error.message).not.toContain('user:secret');
    expect(json.error.stack).not.toContain('user:secret');
    expect(json.timestamp).toBeTruthy();
  });
});
