import { describe, expect, it } from 'vitest';
import {
  serializeInventoryItem,
  serializeStockMovement,
  serializeStockAdjustment,
} from '../../modules/inventory/serializer';

describe('inventory serializers', () => {
  it('maps product inventory to the contract DTO', () => {
    expect(serializeInventoryItem({
      id: 'product-1', sku: 'PRD-001', name: 'Mouse', stock: 0, isActive: false,
    })).toEqual({
      productId: 'product-1', sku: 'PRD-001', productName: 'Mouse', stock: 0, isActive: false,
    });
  });

  it('preserves movement audit fields and serializes createdAt as ISO', () => {
    expect(serializeStockMovement({
      id: 'movement-1', productId: 'product-1', movementType: 'ADJUSTMENT_OUT',
      quantityDelta: -2, quantityBefore: 5, quantityAfter: 3, orderId: null,
      reason: 'cycle count', createdAt: new Date('2026-11-17T08:30:00.000Z'),
    })).toEqual({
      id: 'movement-1', productId: 'product-1', movementType: 'ADJUSTMENT_OUT',
      quantityDelta: -2, quantityBefore: 5, quantityAfter: 3, orderId: null,
      reason: 'cycle count', createdAt: '2026-11-17T08:30:00.000Z',
    });
  });

  it('maps an adjustment result to contract fields only', () => {
    expect(serializeStockAdjustment({
      productId: 'product-1', movementType: 'ADJUSTMENT_IN', quantityDelta: 3,
      quantityBefore: 4, quantityAfter: 7, performedBy: 'admin-1',
    })).toEqual({
      productId: 'product-1', movementType: 'ADJUSTMENT_IN', quantityDelta: 3,
      quantityBefore: 4, quantityAfter: 7,
    });
  });
});
