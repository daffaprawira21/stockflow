'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { sharedErrorMessage, type ApiErrorBody } from '@/lib/api-error';

export type MutationOptions<TSuccess = unknown> = {
  url?: string;
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * Extract a user-facing message from a failed response body. Defaults to
   * `sharedErrorMessage` (generic handling); forms with domain-specific
   * switches pass their own function.
   */
  errorMessage?: (body: ApiErrorBody | null) => string;
  onSuccess?: (data: TSuccess) => void;
  /**
   * Call `router.refresh()` on success (default `true`). Set `false` when the
   * form navigates away instead (e.g. create-order pushes to the new order,
   * so the list refresh is redundant and the old form never called it).
   */
  refresh?: boolean;
};

export type MutationResult<TSuccess = unknown> = {
  ok: boolean;
  data: TSuccess | null;
  error: string | null;
};

/**
 * Pure mutation execution runner, testable without React DOM harness.
 */
export async function executeApiMutation<TSuccess = unknown>(
  options: MutationOptions<TSuccess>,
  router?: { refresh: () => void },
): Promise<MutationResult<TSuccess>> {
  const {
    url,
    method = 'POST',
    body,
    headers,
    errorMessage = sharedErrorMessage,
    onSuccess,
    refresh = true,
  } = options;

  if (!url) {
    throw new Error('useApiMutation: URL must be specified');
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const resBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
      const message = errorMessage(resBody);
      return { ok: false, data: null, error: message };
    }

    const data = (await response.json().catch(() => null)) as { success: boolean; data?: TSuccess };
    if (!data || !data.success) {
      const message = 'Something went wrong. Please try again.';
      return { ok: false, data: null, error: message };
    }

    const resultData = (data.data ?? null) as TSuccess;
    onSuccess?.(resultData);
    if (refresh) {
      router?.refresh();
    }

    return { ok: true, data: resultData, error: null };
  } catch {
    const message = 'Network error. Please try again.';
    return { ok: false, data: null, error: message };
  }
}

/**
 * Shared mutation mechanics for the admin client forms: pending state, fetch,
 * error parsing, and router cache refresh.
 *
 * Config can be passed at hook declaration, or per-call via `mutate(override)`.
 * The two lazy product-list loaders (create-order, adjust-stock) stay inline
 * per the ticket's YAGNI note — this hook only handles the submit path.
 */
export function useApiMutation<TSuccess = unknown>(
  initialOptions: MutationOptions<TSuccess> = {},
): {
  mutate: (override?: MutationOptions<TSuccess>) => Promise<MutationResult<TSuccess>>;
  pending: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
} {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(initialOptions);
  optionsRef.current = initialOptions;

  const mutate = useCallback(
    async (override?: MutationOptions<TSuccess>): Promise<MutationResult<TSuccess>> => {
      const base = optionsRef.current;
      const merged: MutationOptions<TSuccess> = {
        ...base,
        ...override,
        headers: { ...base.headers, ...override?.headers },
        body: override?.body !== undefined ? override.body : base.body,
      };

      setPending(true);
      setError(null);

      const result = await executeApiMutation(merged, router);

      if (!result.ok) {
        setError(result.error);
      }
      setPending(false);
      return result;
    },
    [router],
  );

  return { mutate, pending, error, setError };
}
