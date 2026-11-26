'use client';

import { useState, type FormEvent } from 'react';
import { sharedErrorMessage, type ApiErrorBody } from '@/lib/api-error';
import { useApiMutation } from '@/lib/use-api-mutation';
import { AlertIcon, SpinnerIcon } from '@/components/ui/Icons';

function errorMessage(body: ApiErrorBody | null): string {
  if (body?.error?.code === 'RESOURCE_NOT_FOUND') {
    return 'Product not found.';
  }
  return sharedErrorMessage(body);
}

type ProductDetailProps = {
  id: string;
  isActive: boolean;
};

export function ProductDetail({ id, isActive }: ProductDetailProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    mutate: mutateDeactivate,
    pending: deactivating,
    error: deactivateError,
  } = useApiMutation({
    url: `/api/products/${id}/deactivate`,
    method: 'PATCH',
    errorMessage,
  });

  const {
    mutate: mutateEdit,
    pending: saving,
    error: editError,
  } = useApiMutation({
    url: `/api/products/${id}`,
    method: 'PATCH',
    errorMessage,
    onSuccess: () => {
      setEditMode(false);
      setName('');
      setDescription('');
      setPrice('');
      setLocalError(null);
    },
  });

  async function handleDeactivate() {
    if (!isActive) return;

    const confirmed = window.confirm(
      'Deactivate this product? It will no longer be available for new orders.',
    );
    if (!confirmed) return;

    setLocalError(null);
    await mutateDeactivate();
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: Record<string, string> = {};
    if (name.trim()) payload.name = name.trim();
    if (description !== '') payload.description = description;
    if (price.trim()) payload.price = price.trim();

    if (Object.keys(payload).length === 0) {
      setLocalError('No changes to save.');
      return;
    }

    setLocalError(null);
    await mutateEdit({ body: payload });
  }

  const error = localError ?? editError ?? deactivateError;

  return (
    <div>
      <h2 className="section-title">Actions</h2>

      {error ? (
        <div className="form-error" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      ) : null}

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
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <SpinnerIcon style={{ width: 14, height: 14 }} className="animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditMode(false);
                setName('');
                setDescription('');
                setPrice('');
                setLocalError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
              {deactivating ? (
                <>
                  <SpinnerIcon style={{ width: 14, height: 14 }} className="animate-spin" />
                  Deactivating…
                </>
              ) : (
                'Deactivate'
              )}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
