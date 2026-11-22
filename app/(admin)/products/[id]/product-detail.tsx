'use client';

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
    case 'RESOURCE_NOT_FOUND':
      return 'Product not found.';
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

type ProductDetailProps = {
  id: string;
  isActive: boolean;
};

export function ProductDetail({ id, isActive }: ProductDetailProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeactivate() {
    if (!isActive) return;

    const confirmed = window.confirm(
      'Deactivate this product? It will no longer be available for new orders.',
    );
    if (!confirmed) return;

    setDeactivating(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${id}/deactivate`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(errorMessage(body));
        return;
      }

      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDeactivating(false);
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, string> = {};
      if (name.trim()) payload.name = name.trim();
      if (description !== '') payload.description = description;
      if (price.trim()) payload.price = price.trim();

      if (Object.keys(payload).length === 0) {
        setError('No changes to save.');
        setSaving(false);
        return;
      }

      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(errorMessage(body));
        return;
      }

      setEditMode(false);
      setName('');
      setDescription('');
      setPrice('');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0 }}>Actions</h2>

      {error ? <div className="form-error">{error}</div> : null}

      {editMode ? (
        <form onSubmit={handleEdit} noValidate>
          <div className="field">
            <label htmlFor="edit-name">Name</label>
            <input
              id="edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New name"
            />
          </div>
          <div className="field">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="New description"
            />
          </div>
          <div className="field">
            <label htmlFor="edit-price">Price (IDR)</label>
            <input
              id="edit-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="New price"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditMode(false);
                setName('');
                setDescription('');
                setPrice('');
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => setEditMode(true)}>
            Edit
          </button>
          {isActive ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeactivate}
              disabled={deactivating}
            >
              {deactivating ? 'Deactivating…' : 'Deactivate'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
