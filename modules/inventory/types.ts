export const stockMovementTypes = [
  'INITIAL_STOCK',
  'ORDER_CONFIRMED',
  'ORDER_CANCELLED',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
] as const;

export type StockMovementType = (typeof stockMovementTypes)[number];
