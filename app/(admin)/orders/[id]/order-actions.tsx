'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { sharedErrorMessage, type ApiErrorBody } from '@/lib/api-error';

function errorMessage(body: ApiErrorBody | null): string {
  switch (body?.error?.code) {
    case 'ORDER_CONFLICT':
      return 'This order is no longer in a state that allows that action.';
    case 'INVALID_ORDER_STATE':
      return 'That action is not allowed for this order\'s current status.';
    default:
      return sharedErrorMessage(body);
  }
}

type OrderActionsProps = {
  id: string;
  status: string;
};

export function OrderActions({ id, status }: OrderActionsProps) {
  const router = useRouter();
  const inputId = useId();
  const [cancelReason, setCancelReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = status === 'PENDING';
  const canCancel = status === 'PENDING' || status === 'CONFIRMED';
  const canShip = status === 'CONFIRMED';

  async function post(path: string, body?: Record<string, string>) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${id}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const parsed = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(errorMessage(parsed));
        return;
      }

      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  function handleCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = cancelReason.trim();
    if (reason === '') {
      setError('A cancellation reason is required.');
      return;
    }
    void post('/cancel', { reason });
  }

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0 }}>Actions</h2>

      {error ? <div className="form-error">{error}</div> : null}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canConfirm || pending}
          onClick={() => void post('/confirm')}
        >
          Confirm
        </button>

        {canShip ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={() => void post('/ship')}
          >
            Ship
          </button>
        ) : null}
      </div>

      {canCancel ? (
        <form onSubmit={handleCancel} style={{ marginTop: '1rem', maxWidth: '28rem' }}>
          <div className="field">
            <label htmlFor={`${inputId}-cancel-reason`}>Cancel order</label>
            <textarea
              id={`${inputId}-cancel-reason`}
              rows={2}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Reason for cancellation"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-danger"
            disabled={pending || cancelReason.trim() === ''}
          >
            {pending ? 'Cancelling…' : 'Cancel order'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
