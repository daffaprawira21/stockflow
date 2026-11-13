export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  RESOURCE_NOT_FOUND: 404,
  SKU_ALREADY_EXISTS: 409,
  ORDER_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  IDEMPOTENCY_REQUEST_IN_PROGRESS: 409,
  PRODUCT_INACTIVE: 422,
  INSUFFICIENT_STOCK: 422,
  INVALID_ORDER_STATE: 422,
  INVALID_ADJUSTMENT: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Request validation failed',
  UNAUTHENTICATED: 'Authentication required',
  FORBIDDEN: 'You are not allowed to perform this action',
  RESOURCE_NOT_FOUND: 'The requested resource was not found',
  SKU_ALREADY_EXISTS: 'A product with this SKU already exists',
  ORDER_CONFLICT: 'The order is not in a valid state for this operation',
  IDEMPOTENCY_CONFLICT: 'This idempotency key was used with a different payload',
  IDEMPOTENCY_REQUEST_IN_PROGRESS: 'This request is already being processed',
  PRODUCT_INACTIVE: 'One or more products are inactive',
  INSUFFICIENT_STOCK: 'Insufficient stock for one or more products',
  INVALID_ORDER_STATE: 'The requested operation is not allowed for this order state',
  INVALID_ADJUSTMENT: 'The inventory adjustment is invalid',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
};

export type ApiErrorDetail = Record<string, unknown>;

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: ApiErrorDetail[];

  constructor(code: ErrorCode, message?: string, details: ApiErrorDetail[] = []) {
    super(message ?? DEFAULT_ERROR_MESSAGES[code]);
    this.name = 'ApiError';
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
