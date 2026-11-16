import { describe, expect, it } from 'vitest';
import { Prisma } from '../../lib/generated/prisma/client';
import { toMoneyString } from '../../lib/money';

describe('toMoneyString', () => {
  it('formats a whole value with two decimals', () => {
    expect(toMoneyString(new Prisma.Decimal('150000'))).toBe('150000.00');
  });

  it('keeps an existing two-decimal value unchanged', () => {
    expect(toMoneyString(new Prisma.Decimal('150000.50'))).toBe('150000.50');
  });

  it('pads a single decimal place', () => {
    expect(toMoneyString(new Prisma.Decimal('0.5'))).toBe('0.50');
  });

  it('formats zero', () => {
    expect(toMoneyString(new Prisma.Decimal(0))).toBe('0.00');
  });

  it('stays exact at the Decimal(15, 2) limit', () => {
    expect(toMoneyString(new Prisma.Decimal('9999999999999.99'))).toBe('9999999999999.99');
  });

  it('does not lose precision beyond the float range', () => {
    expect(toMoneyString(new Prisma.Decimal('9007199254740.93'))).toBe('9007199254740.93');
  });
});
