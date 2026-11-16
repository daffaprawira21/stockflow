import type { Prisma } from '../../lib/generated/prisma/client';

type InventoryTransaction = Pick<Prisma.TransactionClient, 'stockMovement'>;

type InitialStockMovement = {
  productId: string;
  performedBy: string;
  quantity: number;
};

export async function recordInitialStock(
  tx: InventoryTransaction,
  movement: InitialStockMovement,
): Promise<void> {
  await tx.stockMovement.create({
    data: {
      productId: movement.productId,
      performedBy: movement.performedBy,
      movementType: 'INITIAL_STOCK',
      quantityDelta: movement.quantity,
      quantityBefore: 0,
      quantityAfter: movement.quantity,
    },
  });
}
