export type ApiErrorBody = {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      origin?: string;
      productId?: string;
      requestedQuantity?: number;
      availableQuantity?: number;
      message?: string;
    }>;
  };
};

/**
 * Maps the shared, cross-domain error cases. Callers that need domain-specific
 * codes (SKU_ALREADY_EXISTS, IDEMPOTENCY_*, ORDER_CONFLICT, etc.) wrap this:
 * their switch handles the domain cases, then falls back to `sharedErrorMessage`.
 */
export function sharedErrorMessage(body: ApiErrorBody | null): string {
  if (!body || body.success) return 'Something went wrong. Please try again.';

  switch (body.error?.code) {
    case 'VALIDATION_ERROR': {
      const details = body.error.details ?? [];
      if (details.length > 0) {
        const first = details[0];
        if (first.message) return first.message;
        if (first.field) return `Invalid ${first.field}`;
      }
      return 'Please fix the validation errors and try again.';
    }
    case 'PRODUCT_INACTIVE':
      return 'One or more products is inactive and cannot be used for this operation.';
    case 'INSUFFICIENT_STOCK': {
      const detail = body.error.details?.[0];
      if (detail?.availableQuantity !== undefined) {
        return `Insufficient stock: ${detail.availableQuantity} available, ${detail.requestedQuantity} requested.`;
      }
      return 'Insufficient stock for one or more items.';
    }
    case 'FORBIDDEN':
      return 'You are not authorized to perform this action.';
    case 'UNAUTHENTICATED':
      return 'Your session has expired. Please sign in again.';
    default:
      return body.error?.message ?? 'Something went wrong. Please try again.';
  }
}
