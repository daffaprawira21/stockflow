'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { sharedErrorMessage, type ApiErrorBody } from '@/lib/api-error';
import { AlertIcon, PlusIcon, SpinnerIcon, XIcon } from '@/components/ui/Icons';

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

function errorMessage(body: ApiErrorBody | null): string {
  switch (body?.error?.code) {
    case 'IDEMPOTENCY_CONFLICT':
      return 'This order was already submitted with different items. Retry with the same items.';
    case 'IDEMPOTENCY_REQUEST_IN_PROGRESS':
      return 'Your previous submission is still being processed. Wait a moment, then retry with the same items.';
    default:
      return sharedErrorMessage(body);
  }
}

type Row = { productId: string; quantity: string };

export function CreateOrderForm() {
  const router = useRouter();
  const id = useId();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([{ productId: '', quantity: '' }]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function loadProducts() {
    if (products || productsLoading) return;

    setProductsLoading(true);
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
      })
      .finally(() => {
        setProductsLoading(false);
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
    for (const row of rows) {
      if (!row.productId) {
        return 'Every item needs a product.';
      }
      const parsed = Number(row.quantity);
      if (row.quantity === '' || !Number.isInteger(parsed) || parsed <= 0) {
        return 'Every item needs a positive whole quantity.';
      }
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
      {validationError ? (
        <div className="form-error" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
          <span>{validationError}</span>
        </div>
      ) : null}
      {error ? (
        <div className="form-error" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      ) : null}

      {productsError ? (
        <div className="form-error">{productsError}</div>
      ) : null}

      <div>
        <h2 className="section-title">Items</h2>

        {rows.map((row, index) => (
          <div
            key={index}
            className="order-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px auto',
              gap: 12,
              marginBottom: 12,
              alignItems: 'end',
            }}
          >
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor={`${id}-product-${index}`}>Product</label>
              <select
                id={`${id}-product-${index}`}
                value={row.productId}
                onChange={(event) => updateRow(index, { productId: event.target.value })}
                onBlur={loadProducts}
                onFocus={loadProducts}
                required
              >
                <option value="" disabled>
                  {productsLoading ? 'Loading products…' : 'Select a product…'}
                </option>
                {(products ?? []).map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.sku} — {product.productName} (stock {product.stock}
                    {product.isActive ? '' : ', inactive'})
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor={`${id}-quantity-${index}`}>Quantity</label>
              <input
                id={`${id}-quantity-${index}`}
                type="number"
                min="1"
                step="1"
                value={row.quantity}
                onChange={(event) => updateRow(index, { quantity: event.target.value })}
                required
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
            {rows.length > 1 ? (
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                onClick={() => removeRow(index)}
                aria-label="Remove item"
              >
                <XIcon style={{ width: 14, height: 14 }} />
                Remove
              </button>
            ) : null}
          </div>
        ))}

        <button type="button" className="btn" onClick={addRow}>
          <PlusIcon style={{ width: 14, height: 14 }} />
          Add item
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? (
            <>
              <SpinnerIcon style={{ width: 14, height: 14 }} className="animate-spin" />
              Creating…
            </>
          ) : (
            'Create order'
          )}
        </button>
        <Link href="/orders" className="btn">
          <XIcon style={{ width: 14, height: 14 }} />
          Cancel
        </Link>
      </div>
    </form>
  );
}
