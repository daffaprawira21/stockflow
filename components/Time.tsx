import { formatDate } from '@/lib/date';

/**
 * Non-client date display. Renders a `<time>` element with a
 * server-deterministic formatted string, so there is no hydration mismatch
 * and no flicker.
 *
 * `value` may be an ISO string, a Date, or an epoch-ms number. The
 * machine-readable `dateTime` attribute is only set when the value parses to
 * a valid instant (HTML5 requires a valid date string).
 */
export function Time({ value }: { value: string | Date | number }) {
  const date = value instanceof Date ? value : new Date(value);
  const isValid = !Number.isNaN(date.getTime());
  const dateTime = isValid ? date.toISOString() : undefined;

  return (
    <time dateTime={dateTime}>{formatDate(value)}</time>
  );
}
