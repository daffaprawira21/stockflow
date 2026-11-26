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
  it('is deterministic for the same instant', () => {
    const instant = '2026-01-15T09:30:00.000Z';
    const a = formatDate(instant);
    const b = formatDate(instant);
    expect(a).toBe(b);
  });

  it('consumes the env default TZ (Asia/Jakarta WIB wall-clock)', () => {
    // 2026-01-15T09:30:00Z -> 16.30 WIB. Catches a regression where the env
    // default is no longer consumed.
    const rendered = formatDate('2026-01-15T09:30:00.000Z');
    expect(rendered).toContain('16.30');
  });

  it('accepts a Date object and an epoch-ms number', () => {
    const date = new Date('2026-06-01T00:00:00.000Z');
    const fromDate = formatDate(date);
    const fromMs = formatDate(date.getTime());
    expect(fromDate).toBe(fromMs);
    expect(fromDate).toContain('2026');
  });

  it('falls back to the raw value when the input is not a valid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('does not throw when the configured TZ is not a valid IANA zone', async () => {
    // A bogus TZ must not crash the server page: Intl.DateTimeFormat would
    // otherwise throw a RangeError. formatDate degrades to the runtime zone.
    vi.resetModules();
    vi.doMock('../../lib/env', () => ({
      env: { TZ: 'NotARealZone' },
    }));
    const { formatDate: freshFormat } = await import('../../lib/date');
    expect(() => freshFormat('2026-01-15T09:30:00.000Z')).not.toThrow();
    vi.resetModules();
    vi.doUnmock('../../lib/env');
  });
});
