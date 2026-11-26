import { describe, expect, it, vi, beforeEach } from 'vitest';
import { executeApiMutation } from '../../lib/use-api-mutation';

describe('executeApiMutation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles successful mutation and refreshes router', async () => {
    const refresh = vi.fn();
    const onSuccess = vi.fn();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 'order-123' } }),
      }),
    );

    const result = await executeApiMutation<{ id: string }>(
      {
        url: '/api/orders',
        method: 'POST',
        body: { items: [] },
        onSuccess,
      },
      { refresh },
    );

    expect(result).toEqual({
      ok: true,
      data: { id: 'order-123' },
      error: null,
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledWith({ id: 'order-123' });
  });

  it('extracts error message on non-ok response using domain extractor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'SKU_ALREADY_EXISTS', message: 'sku taken' },
        }),
      }),
    );

    const errorMessage = (body: any) =>
      body?.error?.code === 'SKU_ALREADY_EXISTS'
        ? 'A product with this SKU already exists.'
        : 'fallback';

    const result = await executeApiMutation({
      url: '/api/products',
      errorMessage,
    });

    expect(result).toEqual({
      ok: false,
      data: null,
      error: 'A product with this SKU already exists.',
    });
  });

  it('falls back to sharedErrorMessage when no domain extractor provided', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'FORBIDDEN', message: 'forbidden' },
        }),
      }),
    );

    const result = await executeApiMutation({
      url: '/api/products',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('You are not authorized to perform this action.');
  });

  it('returns network error on rejected fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection lost')));

    const result = await executeApiMutation({
      url: '/api/orders',
    });

    expect(result).toEqual({
      ok: false,
      data: null,
      error: 'Network error. Please try again.',
    });
  });

  it('throws if url is missing', async () => {
    await expect(executeApiMutation({} as any)).rejects.toThrow(
      'useApiMutation: URL must be specified',
    );
  });
});
