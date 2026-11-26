'use client';

import { useId, useState, type FormEvent } from 'react';
import { sharedErrorMessage, type ApiErrorBody } from '@/lib/api-error';
import { useApiMutation } from '@/lib/use-api-mutation';
import { AlertIcon, SpinnerIcon } from '@/components/ui/Icons';

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
  const inputId = useId();
  const [cancelReason, setCancelReason] = useState('');

  const canConfirm = status === 'PENDING';
  const canCancel = status === 'PENDING' || status === 'CONFIRMED';
  const canShip = status === 'CONFIRMED';

  const { mutate, pending, error, setError } = useApiMutation({
    errorMessage,
  });

  async function post(path: string, body?: Record<string, string>) {
    await mutate({
      url: `/api/orders/${id}${path}`,
      body,
    });
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
      <h2 className="section-title">Actions</h2>

      {error ? (
        <div className="form-error" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canConfirm || pending}
          onClick={() => void post('/confirm')}
        >
          {pending ? (
            <>
              <SpinnerIcon style={{ width: 14, height: 14 }} className="animate-spin" />
              Confirming…
            </>
          ) : (
            'Confirm'
          )}
        </button>

        {canShip ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={() => void post('/ship')}
          >
            {pending ? (
              <>
                <SpinnerIcon style={{ width: 14, height: 14 }} className="animate-spin" />
                Shipping…
              </>
            ) : (
              'Ship'
            )}
          </button>
        ) : null}
      </div>

      {canCancel ? (
        <form onSubmit={handleCancel} style={{ marginTop: 24 }}>
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
            {pending ? (
              <>
                <SpinnerIcon style={{ width: 14, height: 14 }} className="animate-spin" />
                Cancelling…
              </>
            ) : (
              'Cancel order'
            )}
          </button>
        </form>
      ) : null}
    </div>
  );
}
