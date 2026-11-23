import { describe, expect, it } from 'vitest';
import { sharedErrorMessage, type ApiErrorBody } from '../../lib/api-error';

function errorBody(code: string, details?: ApiErrorBody['error'] extends infer T
  ? T extends { details?: infer D }
    ? D
    : never
  : never): ApiErrorBody {
  return { success: false, error: { code, message: 'server message', ...(details ? { details } : {}) } };
}

describe('sharedErrorMessage', () => {
  it('returns the generic message when the body is null or successful', () => {
    expect(sharedErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(sharedErrorMessage({ success: true })).toBe('Something went wrong. Please try again.');
  });

  it('maps VALIDATION_ERROR to the first detail message or field', () => {
    expect(
      sharedErrorMessage(errorBody('VALIDATION_ERROR', [{ message: 'reason is required' }])),
    ).toBe('reason is required');
    expect(
      sharedErrorMessage(errorBody('VALIDATION_ERROR', [{ field: 'quantity' }])),
    ).toBe('Invalid quantity');
    expect(sharedErrorMessage(errorBody('VALIDATION_ERROR'))).toBe(
      'Please fix the validation errors and try again.',
    );
  });

  it('maps PRODUCT_INACTIVE and FORBIDDEN / UNAUTHENTICATED', () => {
    expect(sharedErrorMessage(errorBody('PRODUCT_INACTIVE'))).toContain('inactive');
    expect(sharedErrorMessage(errorBody('FORBIDDEN'))).toContain('not authorized');
    expect(sharedErrorMessage(errorBody('UNAUTHENTICATED'))).toContain('session');
  });

  it('maps INSUFFICIENT_STOCK with detail when availableQuantity is present', () => {
    expect(
      sharedErrorMessage(
        errorBody('INSUFFICIENT_STOCK', [{ availableQuantity: 3, requestedQuantity: 10 }]),
      ),
    ).toBe('Insufficient stock: 3 available, 10 requested.');
  });

  it('maps INSUFFICIENT_STOCK without detail to a generic message', () => {
    expect(sharedErrorMessage(errorBody('INSUFFICIENT_STOCK'))).toBe(
      'Insufficient stock for one or more items.',
    );
  });

  it('falls back to the server message for unmapped codes', () => {
    expect(sharedErrorMessage(errorBody('SOME_CODE'))).toBe('server message');
  });
});
