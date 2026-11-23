'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';

type Product = {
  productId: string;
  sku: string;
  productName: string;
  stock: number;
  isActive: boolean;
};

type OrderItemInput = {
  productId: string;
  quantity: number;
};

type ApiErrorBody = {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      productId?: string;
      requestedQuantity?: number;
      availableQuantity?: number;
      message?: string;
    }>;
  };
};

function errorMessage(body: ApiErrorBody | null): string {
  if (!body || body.success) return 'Something went wrong. Please try again.';

  switch (body.error?.code) {
    case 'IDEMPOTENCY_CONFLICT':
      return 'This order was already submitted with different items. Retry with the same items.';
    case 'IDEMPOTENCY_REQUEST_IN_PROGRESS':
      return 'Your previous submission is still being processed. Wait a moment, then retry with the same items.';
    case 'PRODUCT_INACTIVE':
      return 'One or more products is inactive and cannot be ordered.';
    case 'INSUFFICIENT_STOCK': {
      const detail = body.error.details?.[0];
      if (detail?.availableQuantity !== undefined) {
        return `Insufficient stock: ${detail.availableQuantity} available, ${detail.requestedQuantity} requested.`;
      }
      return 'Insufficient stock for one or more items.';
    }
    case 'VALIDATION_ERROR': {
      const details = body.error.details ?? [];
      if (details.length > 0) {
        const first = details[0];
        if (first.message) return first.message;
      }
      return 'Please fix the validation errors and try again.';
    }
    case 'FORBIDDEN':
      return 'You are not authorized to perform this action.';
    case 'UNAUTHENTICATED':
      return 'Your session has expired. Please sign in again.';
    default:
      return body.error?.message ?? 'Something went wrong. Please try again.';
  }
}

type Row = { productId: string; quantity: string };

export function CreateOrderForm() {
  const router = useRouter();
  const id = useId();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([{ productId: '', quantity: '' }]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function loadProducts() {
    if (products) return;

    fetch('/api/inventory?limit=100', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          setProductsError('Could not load products. Please try again.');
          return;
        }
        return response.json();
      })
      .then((body: { success: boolean; data: Product[] } | undefined) => {
        if (body?.success) setProducts(body.data);
      })
      .catch(() => {
        setProductsError('Could not load products. Please try again.');
      });
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
  }

  function addRow() {
    setRows((current) => [...current, { productId: '', quantity: '' }]);
  }

  function validate(): string | null {
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.productId) {
        return 'Every item needs a product.';
      }
      const parsed = Number(row.quantity);
      if (row.quantity === '' || !Number.isInteger(parsed) || parsed <= 0) {
        return 'Every item needs a positive whole quantity.';
      }
      if (seen.has(row.productId)) {
        return 'The same product appears more than once. Use one row per product.';
      }
      seen.add(row.productId);
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const localError = validate();
    if (localError) {
      setValidationError(localError);
      return;
    }

    setValidationError(null);
    setError(null);
    setPending(true);

    try {
      const items: OrderItemInput[] = rows.map((row) => ({
        productId: row.productId,
        quantity: Number(row.quantity),
      }));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(errorMessage(body));
        return;
      }

      const created = (await response.json()) as {
        success: boolean;
        data: { id: string };
      };

      if (created.success && created.data?.id) {
        router.push(`/orders/${created.data.id}`);
      } else {
        router.push('/orders');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {validationError ? <div className="form-error">{validationError}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      {productsError ? <div className="form-error">{productsError}</div> : null}

      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Items</h2>

        {rows.map((row, index) => (
          <div
            key={index}
            style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}
          >
            <div className="field" style={{ flex: '2 1 14rem', marginBottom: 0 }}>
              <label htmlFor={`${id}-product-${index}`}>Product</label>
              <select
                id={`${id}-product-${index}`}
                value={row.productId}
                onChange={(event) => updateRow(index, { productId: event.target.value })}
                onBlur={loadProducts}
                onFocus={loadProducts}
                required
              >
                <option value="">Select a product…</option>
                {(products ?? [])
                  .filter((product) => product.isActive)
                  .map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.sku} — {product.productName} (stock {product.stock})
                    </option>
                  ))}
              </select>
            </div>
            <div className="field" style={{ flex: '0 0 8rem', marginBottom: 0 }}>
              <label htmlFor={`${id}-quantity-${index}`}>Quantity</label>
              <input
                id={`${id}-quantity-${index}`}
                type="number"
                min="1"
                step="1"
                value={row.quantity}
                onChange={(event) => updateRow(index, { quantity: event.target.value })}
                required
              />
            </div>
            {rows.length > 1 ? (
              <button
                type="button"
                className="btn"
                onClick={() => removeRow(index)}
                style={{ alignSelf: 'flex-end' }}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}

        <button type="button" className="btn" onClick={addRow}>
          Add item
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Creating…' : 'Create order'}
        </button>
        <Link href="/orders" className="btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}
