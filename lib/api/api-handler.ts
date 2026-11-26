import { ApiError } from './errors';
import { requireAdmin } from './guard';
import { isOriginAllowed } from './origin';
import { jsonFromError, jsonPaginated, jsonSuccess, type PaginationMeta } from './response';
import prisma from '../db';
import { allowedOrigins } from '../env';
import { validationDetails } from './validation';
import type { PublicUser } from '../../modules/auth/service';
import type { z } from 'zod';

export type ApiHandlerContext<
  B = unknown,
  Q = unknown,
  H = unknown,
  P = unknown,
> = {
  admin: PublicUser | null;
  body: B | undefined;
  query: Q | undefined;
  headers: H | undefined;
  /** The validated route param (when `config.param` is set). */
  param: P | undefined;
};

export type ApiHandlerResult = {
  data: unknown;
  meta?: PaginationMeta;
  status?: number;
};

export type ApiHandlerConfig<
  B extends z.ZodType = z.ZodType,
  Q extends z.ZodType = z.ZodType,
  H extends z.ZodType = z.ZodType,
  P extends z.ZodType = z.ZodType,
> = {
  /** Optional: reject a non-matching HTTP method early (405). */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Run the origin check + admin guard before `run`. */
  auth?: boolean;
  /** Zod schema for the JSON body. Parsed + validated before `run`. */
  body?: B;
  /** Zod schema for the URL query string. Parsed + validated before `run`. */
  query?: Q;
  /** Zod schema for a subset of request headers (lower-cased keys). */
  headers?: H;
  /** Zod schema for a route param (e.g. `id`). Parsed + validated before `run`. */
  param?: { name: string; schema: P };
  /**
   * Route logic. Receives the validated context + the original Request + the
   * unresolved route params (Next 16 passes `context.params` as a promise).
   */
  run: (
    ctx: ApiHandlerContext<z.infer<B>, z.infer<Q>, z.infer<H>, z.infer<P>>,
    request: Request,
    params?: Promise<Record<string, string>>,
  ) => Promise<Response | ApiHandlerResult>;
};

/**
 * The admin guard as a swappable pipeline stage. The default is the real
 * `requireAdmin` (which pulls `lib/db` inside the guard, not the pipeline);
 * tests inject a fake to exercise the auth path without a DB.
 */
type AdminGuard = (request: Request) => Promise<PublicUser>;

const defaultAdminGuard: AdminGuard = (request) => requireAdmin(prisma as never, request);

export type NextRouteContext = {
  params: Promise<Record<string, string>>;
};

/**
 * The deep route pipeline. One object in, one Response out.
 *
 * Owns, in order: the state-changing-origin check, the admin guard, JSON body
 * parse, Zod validation of body/query/headers/param, and uniform response/
 * error mapping. A route body reduces to `export const POST = apiHandler({...})`.
 *
 * The pipeline holds NO Prisma client: the guard is the single seam where the
 * DB enters, and it is injectable so the pipeline itself stays testable.
 *
 * Exported for unit tests: `handler` is the raw `(request, params?) => Promise<Response>`
 * that Next's route handlers delegate to.
 */
export type ApiHandlerInstance = {
  /** The Next-compatible route handler: `(request, context) => Promise<Response>`. */
  handler: (request: Request, context?: NextRouteContext) => Promise<Response>;
  /** The raw pipeline, for tests: `(request, params?) => Promise<Response>`. */
  createHandler: (request: Request, params?: Promise<Record<string, string>>) => Promise<Response>;
};

export function apiHandler<
  B extends z.ZodType,
  Q extends z.ZodType,
  H extends z.ZodType,
  P extends z.ZodType,
>(
  config: ApiHandlerConfig<B, Q, H, P>,
  adminGuard: AdminGuard = defaultAdminGuard,
): ApiHandlerInstance {
  const createHandler = async (
    request: Request,
    params?: Promise<Record<string, string>>,
  ): Promise<Response> => {
    try {
      if (config.method && request.method.toUpperCase() !== config.method.toUpperCase()) {
        throw new ApiError('VALIDATION_ERROR', `Method ${request.method} not allowed`);
      }

      if (!isOriginAllowed(request, allowedOrigins)) {
        throw new ApiError('FORBIDDEN', undefined, [{ origin: request.headers.get('origin') }]);
      }

      let admin: PublicUser | null = null;
      if (config.auth) {
        admin = await adminGuard(request);
      }

      let headers: unknown;
      if (config.headers) {
        const raw: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          raw[key.toLowerCase()] = value;
        });
        const parsed = config.headers.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError('VALIDATION_ERROR', 'Request header validation failed', validationDetails(parsed.error));
        }
        headers = parsed.data;
      }

      let query: unknown;
      if (config.query) {
        const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries());
        const parsed = config.query.safeParse(rawQuery);
        if (!parsed.success) {
          throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
        }
        query = parsed.data;
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

      // Route param validation: `params` is the unresolved Next 16
      // `context.params` promise. The value is read + validated here so the
      // pipeline owns it; `run` receives the validated `param` on ctx.
      let param: unknown;
      if (config.param && params) {
        const resolved = await params;
        const value = resolved[config.param.name];
        const parsed = config.param.schema.safeParse(value);
        if (!parsed.success) {
          throw new ApiError('VALIDATION_ERROR', undefined, validationDetails(parsed.error));
        }
        param = parsed.data;
      }

      const ctx: ApiHandlerContext<z.infer<B>, z.infer<Q>, z.infer<H>, z.infer<P>> = {
        admin,
        body: body as z.infer<B> | undefined,
        query: query as z.infer<Q> | undefined,
        headers: headers as z.infer<H> | undefined,
        param: param as z.infer<P> | undefined,
      };

      const result = await config.run(ctx, request, params);

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

  // Next-compatible route handler: `(request, context) => Promise<Response>`.
  // Next passes `context.params` as the unresolved promise; we forward it.
  const handler = async (
    request: Request,
    context?: NextRouteContext,
  ): Promise<Response> => {
    const params = context?.params;
    return createHandler(request, params);
  };

  return { handler, createHandler };
}
