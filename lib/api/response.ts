import {
  ApiError,
  DEFAULT_ERROR_MESSAGES,
  ERROR_STATUS,
  isApiError,
  type ApiErrorDetail,
  type ErrorCode,
} from './errors';

export type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: null;
};

export type ApiPaginated<T> = {
  success: true;
  data: T[];
  meta: PaginationMeta;
};

export type ApiErrorBody = {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details: ApiErrorDetail[];
  };
};

export function successBody<T>(data: T): ApiSuccess<T> {
  return { success: true, data, meta: null };
}

export function paginatedBody<T>(data: T[], meta: PaginationMeta): ApiPaginated<T> {
  return { success: true, data, meta };
}

export function paginationMeta(page: number, limit: number, totalItems: number): PaginationMeta {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
  };
}

export function errorBody(
  code: ErrorCode,
  message?: string,
  details: ApiErrorDetail[] = [],
): ApiErrorBody {
  return {
    success: false,
    error: {
      code,
      message: message ?? DEFAULT_ERROR_MESSAGES[code],
      details,
    },
  };
}

export function jsonSuccess<T>(data: T, init?: ResponseInit): Response {
  return Response.json(successBody(data), init);
}

export function jsonPaginated<T>(
  data: T[],
  meta: PaginationMeta,
  init?: ResponseInit,
): Response {
  return Response.json(paginatedBody(data, meta), init);
}

export function jsonError(
  code: ErrorCode,
  options: { message?: string; details?: ApiErrorDetail[]; status?: number } = {},
): Response {
  return Response.json(
    errorBody(code, options.message, options.details ?? []),
    { status: options.status ?? ERROR_STATUS[code] },
  );
}

export function jsonFromError(error: unknown): Response {
  if (isApiError(error)) {
    return Response.json(errorBody(error.code, error.message, error.details), {
      status: error.status,
    });
  }

  return jsonError('INTERNAL_SERVER_ERROR');
}

export { ApiError };
