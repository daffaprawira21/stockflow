import { ApiError } from '../../lib/api/errors';

export type ConsolidatedStockItem = {
  productId: string;
  quantity: number;
};

const MAX_POSTGRES_INTEGER = 2_147_483_647;

/**
 * Consolidate stock items by product: sum quantities for each product and
 * return them sorted by productId. Enforces the Postgres integer bound on
 * each consolidated quantity — a consolidated value that overflows throws a
 * VALIDATION_ERROR before any stock is touched.
 *
 * Shared by the inventory stock operations (deduct/restore) and the orders
 * create path, so the bound is enforced in exactly one place.
 */
export function consolidateStockItems(
  items: ConsolidatedStockItem[],
): ConsolidatedStockItem[] {
  const quantities = new Map<string, number>();
  for (const item of items) {
    const quantity = (quantities.get(item.productId) ?? 0) + item.quantity;
    if (quantity > MAX_POSTGRES_INTEGER) {
      throw new ApiError('VALIDATION_ERROR', 'Consolidated item quantity exceeds the allowed maximum');
    }
    quantities.set(item.productId, quantity);
  }
  return [...quantities.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((left, right) => left.productId.localeCompare(right.productId));
}
