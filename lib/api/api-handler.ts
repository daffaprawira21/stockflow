import { ApiError } from './errors';
import { requireAdmin } from './guard';
import { isOriginAllowed } from './origin';
import { jsonFromError, jsonPaginated, jsonSuccess, type PaginationMeta } from './response';
import prisma from '../db';
import { allowedOrigins } from '../env';
import { validationDetails } from './validation';
import type { PublicUser } from '../../modules/auth/service';
import type { z } from 'zod';

export type ApiHandlerContext = {
  admin: PublicUser | null;
  body: unknown;
  query: Record<string, string> | undefined;
  headers: Record<string, string> | undefined;
};

export type ApiHandlerResult = {
  data: unknown;
  meta?: PaginationMeta;
  status?: number;
};

export type ApiHandlerConfig = {
  /** Optional: reject a non-matching HTTP method early (405). */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Run the origin check + admin guard before `run`. */
  auth?: boolean;
  /** Zod schema for the JSON body. Parsed + validated before `run`. */
  body?: z.ZodType;
  /** Zod schema for the URL query string. Parsed + validated before `run`. */
  query?: z.ZodType;
  /** Zod schema for a subset of request headers (lower-cased keys). */
  headers?: z.ZodType;
  /** Route logic. Receives the validated context + the original Request. */
  run: (ctx: ApiHandlerContext, request: Request) => Promise<Response | ApiHandlerResult>;
};

/**
 * The deep route pipeline. One object in, one Response out.
 *
 * Owns, in order: origin check, admin guard, JSON body parse, Zod validation of
 * body/query/headers, and uniform response/error mapping. A route body reduces
 * to `apiHandler({ ... })`.
 *
 * The pipeline does NOT inject the Prisma client: `run` gets only the validated
 * context, and domain modules import `lib/db` themselves.
 */
export function apiHandler(config: ApiHandlerConfig): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      if (config.method && request.method.toUpperCase() !== config.method.toUpperCase()) {
        throw new ApiError('VALIDATION_ERROR', `Method ${request.method} not allowed`, undefined);
      }

      if (!isOriginAllowed(request, allowedOrigins)) {
        throw new ApiError('FORBIDDEN', undefined, [{ origin: request.headers.get('origin') }]);
      }

      let admin: PublicUser | null = null;
      if (config.auth) {
        admin = await requireAdmin(prisma, request);
      }

      let headers: Record<string, string> | undefined;
      if (config.headers) {
        const raw: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          raw[key.toLowerCase()] = value;
        });
        const parsed = config.headers.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError('VALIDATION_ERROR', 'Request header validation failed', validationDetails(parsed.error));
        }
        headers = parsed.data as Record<string, string>;
      }

      let query: Record<string, string> | undefined;
      if (config.query) {
        const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries());
        const parsed = config.query.safeParse(rawQuery);
        if (!parsed.success) {
          throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
        }
        query = parsed.data as Record<string, string>;
      }

      let body: unknown;
      if (config.body) {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          throw new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON');
        }
        const parsed = config.body.safeParse(payload);
        if (!parsed.success) {
          throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
        }
        body = parsed.data;
      }

      const result = await config.run({ admin, body, query, headers }, request);

      if (result instanceof Response) {
        return result;
      }
      if (result.meta) {
        return jsonPaginated(result.data as never[], result.meta, { status: result.status });
      }
      return jsonSuccess(result.data, { status: result.status });
    } catch (error) {
      return jsonFromError(error);
    }
  };
}
