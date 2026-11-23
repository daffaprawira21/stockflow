'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { sharedErrorMessage, type ApiErrorBody } from '@/lib/api-error';

type Product = {
  productId: string;
  sku: string;
  productName: string;
  stock: number;
  isActive: boolean;
};

function errorMessage(body: ApiErrorBody | null): string {
  switch (body?.error?.code) {
    case 'INVALID_ADJUSTMENT':
      return 'Adjustment rejected: resulting stock must stay within 0 and 2,147,483,647.';
    case 'RESOURCE_NOT_FOUND':
      return 'Product not found.';
    default:
      return sharedErrorMessage(body);
  }
}

export function AdjustStockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = useId();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productId, setProductId] = useState(searchParams.get('product') ?? '');
  const [type, setType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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

  function validate(): string | null {
    if (!productId) {
      return 'Select a product.';
    }

    const parsed = Number(quantity);
    if (quantity === '' || !Number.isInteger(parsed) || parsed <= 0) {
      return 'Quantity must be a positive whole number.';
    }

    if (reason.trim() === '') {
      return 'Reason is required for manual adjustments.';
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setValidationError(validationError);
      return;
    }

    setValidationError(null);
    setPending(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          type,
          quantity: Number(quantity),
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setSubmitError(errorMessage(body));
        return;
      }

      router.refresh();
      router.push('/inventory');
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {validationError ? <div className="form-error">{validationError}</div> : null}
      {submitError ? <div className="form-error">{submitError}</div> : null}

      <div className="field">
        <label htmlFor={`${id}-productId`}>Product</label>
        <select
          id={`${id}-productId`}
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          onBlur={loadProducts}
          onFocus={loadProducts}
          required
        >
          <option value="">Select a product…</option>
          {(products ?? []).map((product) => (
            <option key={product.productId} value={product.productId}>
              {product.sku} — {product.productName} (stock {product.stock}
              {product.isActive ? '' : ', inactive'})
            </option>
          ))}
        </select>
        {productsError ? <div className="form-error">{productsError}</div> : null}
      </div>

      <div className="field">
        <label htmlFor={`${id}-type`}>Adjustment type</label>
        <select
          id={`${id}-type`}
          value={type}
          onChange={(event) => setType(event.target.value as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT')}
        >
          <option value="ADJUSTMENT_IN">Increase stock (ADJUSTMENT_IN)</option>
          <option value="ADJUSTMENT_OUT">Decrease stock (ADJUSTMENT_OUT)</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${id}-quantity`}>Quantity</label>
        <input
          id={`${id}-quantity`}
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor={`${id}-reason`}>Reason</label>
        <textarea
          id={`${id}-reason`}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          placeholder="e.g. cycle count correction, damaged stock"
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Adjusting…' : 'Adjust stock'}
        </button>
        <Link href="/inventory" className="btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}
