import { env } from './env';

/**
 * Deterministic date formatting.
 *
 * Uses an explicit IANA timezone (from the `TZ` env var, default
 * Asia/Jakarta) so the rendered string is identical on the server and on the
 * first client paint — no hydration mismatch, no setTimeout flicker.
 *
 * `value` may be an ISO string, a Date, or a number (epoch ms).
 */
export function formatDate(value: string | Date | number, tz?: string): string {
  const zone = tz ?? env.TZ;
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  // Intl.DateTimeFormat with a fixed timeZone is deterministic across Node and
  // the browser (both use the ICU data bundled with the runtime), so the
  // server-rendered string matches the first client paint exactly.
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: zone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
