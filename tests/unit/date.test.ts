import { afterEach, describe, expect, it, vi } from 'vitest';

// Force a fixed TZ so the test is deterministic regardless of the host machine.
vi.mock('../../lib/env', () => ({
  env: { TZ: 'Asia/Jakarta' },
}));

import { formatDate } from '../../lib/date';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('formatDate', () => {
  it('is deterministic for the same instant and timezone', () => {
    const instant = '2026-01-15T09:30:00.000Z';
    const a = formatDate(instant);
    const b = formatDate(instant);
    expect(a).toBe(b);
  });

  it('renders the expected Asia/Jakarta (WIB, UTC+7) wall-clock time', () => {
    // 2026-01-15T09:30:00Z -> 16.30 WIB (id-ID uses a dot time separator)
    const rendered = formatDate('2026-01-15T09:30:00.000Z', 'Asia/Jakarta');
    expect(rendered).toContain('16.30');
  });

  it('honours an explicit tz argument over the env default', () => {
    // 2026-01-15T09:30:00Z -> 04.30 in America/New_York (EST, UTC-5)
    const rendered = formatDate('2026-01-15T09:30:00.000Z', 'America/New_York');
    expect(rendered).toContain('04.30');
  });

  it('accepts a Date object and an epoch-ms number', () => {
    const date = new Date('2026-06-01T00:00:00.000Z');
    const fromDate = formatDate(date, 'UTC');
    const fromMs = formatDate(date.getTime(), 'UTC');
    expect(fromDate).toBe(fromMs);
    expect(fromDate).toContain('2026');
  });

  it('falls back to the raw value when the input is not a valid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});
