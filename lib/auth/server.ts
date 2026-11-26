import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/modules/auth/current-user';
import type { z } from 'zod';

/**
 * Server-side auth for page components: validate the session cookie in-process
 * and redirect to /login when the caller is not an authenticated admin.
 *
 * Pages use this instead of fetching their own API over a localhost loopback
 * to read data. The mutation forms and API routes keep the HTTP surface; this
 * helper only replaces the read path.
 */
export async function requireAdmin(): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>> {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/login');
  }

  return user;
}

/**
 * Parse a server-component `searchParams` through a module's query schema.
 *
 * The domain module owns the query shape (page/limit/status/...), and the page
 * only ever needs to know "is this a valid query, and what is it?". An
 * invalid query (bad page, unknown status, ...) is reported rather than thrown,
 * so the page can render its "clear the filters" state instead of a login
 * redirect — matching the pre-migration 400/422 handling.
 */
export function parseSearchQuery<Schema extends z.ZodType>(
  searchParams: Record<string, string | string[] | undefined>,
  schema: Schema,
): { ok: true; query: z.infer<Schema> } | { ok: false } {
  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      raw[key] = value;
    }
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false };
  }
  return { ok: true, query: parsed.data };
}
