'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

type ApiErrorBody = {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      origin?: string;
      message?: string;
    }>;
  };
};

function errorMessage(body: ApiErrorBody | null): string {
  if (!body || body.success) return 'Something went wrong. Please try again.';

  switch (body.error?.code) {
    case 'SKU_ALREADY_EXISTS':
      return 'A product with this SKU already exists.';
    case 'VALIDATION_ERROR': {
      const details = body.error.details ?? [];
      if (details.length > 0) {
        const first = details[0];
        if (first.message) return first.message;
        if (first.field) return `Invalid ${first.field}`;
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

export function CreateProductForm() {
  const router = useRouter();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          name,
          description: description || undefined,
          price,
          initialStock: Number(initialStock),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(errorMessage(body));
        return;
      }

      router.refresh();
      router.push('/products');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error ? <div className="form-error">{error}</div> : null}

      <div className="field">
        <label htmlFor="sku">SKU</label>
        <input
          id="sku"
          name="sku"
          value={sku}
          onChange={(event) => setSku(event.target.value)}
          required
          placeholder="PRD-001"
        />
      </div>

      <div className="field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="Wireless Mouse"
        />
      </div>

      <div className="field">
        <label htmlFor="description">Description (optional)</label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Product description"
        />
      </div>

      <div className="field">
        <label htmlFor="price">Price (IDR)</label>
        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
          placeholder="150000"
        />
      </div>

      <div className="field">
        <label htmlFor="initialStock">Initial stock</label>
        <input
          id="initialStock"
          name="initialStock"
          type="number"
          step="1"
          min="0"
          value={initialStock}
          onChange={(event) => setInitialStock(event.target.value)}
          required
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Creating…' : 'Create product'}
        </button>
        <Link href="/products" className="btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}
