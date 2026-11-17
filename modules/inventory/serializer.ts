export type InventoryItemSource = {
  id: string;
  sku: string;
  name: string;
  stock: number;
  isActive: boolean;
};

export type InventoryItemDto = {
  productId: string;
  sku: string;
  productName: string;
  stock: number;
  isActive: boolean;
};

export function serializeInventoryItem(item: InventoryItemSource): InventoryItemDto {
  return {
    productId: item.id,
    sku: item.sku,
    productName: item.name,
    stock: item.stock,
    isActive: item.isActive,
  };
}

export type StockMovementSource = {
  id: string;
  productId: string;
  movementType: string;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  orderId: string | null;
  reason: string | null;
  createdAt: Date;
};

export type StockMovementDto = Omit<StockMovementSource, 'createdAt'> & {
  createdAt: string;
};

export function serializeStockMovement(movement: StockMovementSource): StockMovementDto {
  return {
    id: movement.id,
    productId: movement.productId,
    movementType: movement.movementType,
    quantityDelta: movement.quantityDelta,
    quantityBefore: movement.quantityBefore,
    quantityAfter: movement.quantityAfter,
    orderId: movement.orderId,
    reason: movement.reason,
    createdAt: movement.createdAt.toISOString(),
  };
}

export type StockAdjustmentSource = {
  productId: string;
  movementType: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  performedBy: string;
};

export type StockAdjustmentDto = Omit<StockAdjustmentSource, 'performedBy'>;

export function serializeStockAdjustment(adjustment: StockAdjustmentSource): StockAdjustmentDto {
  return {
    productId: adjustment.productId,
    movementType: adjustment.movementType,
    quantityDelta: adjustment.quantityDelta,
    quantityBefore: adjustment.quantityBefore,
    quantityAfter: adjustment.quantityAfter,
  };
}
