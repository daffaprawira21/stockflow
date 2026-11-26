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
export function formatDate(value: string | Date | number): string {
  const zone = env.TZ;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  // Guard: a misconfigured (non-IANA) TZ env var would make Intl.DateTimeFormat
  // throw a RangeError and take down the server page. Fall back to the
  // environment's own zone (no explicit timeZone) rather than crash.
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: zone,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  // Intl.DateTimeFormat with a fixed timeZone is deterministic across Node and
  // the browser (both use the ICU data bundled with the runtime), so the
  // server-rendered string matches the first client paint exactly.
  return formatter.format(date);
}
