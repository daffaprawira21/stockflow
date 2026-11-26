import { formatDate } from '@/lib/date';

/**
 * Non-client date display. Renders a `<time dateTime>` element with a
 * server-deterministic formatted string, so there is no hydration mismatch
 * and no flicker.
 *
 * `value` may be an ISO string, a Date, or an epoch-ms number.
 */
export function Time({
  value,
  tz,
}: {
  value: string | Date | number;
  tz?: string;
}) {
  return (
    <time dateTime={typeof value === 'string' ? value : new Date(value).toISOString()}>
      {formatDate(value, tz)}
    </time>
  );
}
