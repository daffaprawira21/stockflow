import type { Prisma } from './generated/prisma/client';

export function toMoneyString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}
