import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrismaClient, truncateAll } from '../helpers/db';
import { createTestAdmin, createTestProduct } from '../helpers/factories';

const db = createTestPrismaClient();

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.$disconnect();
});

describe('product constraints', () => {
  it('rejects a negative price', async () => {
    await expect(
      db.product.create({
        data: { sku: 'NEG-PRICE', name: 'Invalid', price: '-0.01' },
      }),
    ).rejects.toThrow();
  });

  it('rejects negative stock', async () => {
    await expect(
      db.product.create({
        data: { sku: 'NEG-STOCK', name: 'Invalid', price: '1.00', stock: -1 },
      }),
    ).rejects.toThrow();
  });
});

describe('order item constraints', () => {
  it('rejects a non-positive quantity', async () => {
    const admin = await createTestAdmin(db);
    const product = await createTestProduct(db);
    const order = await createOrder(admin.id);

    await expect(
      db.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: 0,
          unitPrice: '1.00',
          subtotal: '0.00',
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a negative unit price', async () => {
    const admin = await createTestAdmin(db);
    const product = await createTestProduct(db);
    const order = await createOrder(admin.id);

    await expect(
      db.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: 1,
          unitPrice: '-1.00',
          subtotal: '-1.00',
        },
      }),
    ).rejects.toThrow();
  });
});

describe('stock movement constraints', () => {
  it('rejects a positive delta for ORDER_CONFIRMED', async () => {
    const { admin, product } = await movementFixture();

    await expect(
      db.stockMovement.create({
        data: {
          productId: product.id,
          performedBy: admin.id,
          movementType: 'ORDER_CONFIRMED',
          quantityDelta: 5,
          quantityBefore: 0,
          quantityAfter: 5,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a negative delta for INITIAL_STOCK', async () => {
    const { admin, product } = await movementFixture();

    await expect(
      db.stockMovement.create({
        data: {
          productId: product.id,
          performedBy: admin.id,
          movementType: 'INITIAL_STOCK',
          quantityDelta: -1,
          quantityBefore: 1,
          quantityAfter: 0,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects an inconsistent balance', async () => {
    const { admin, product } = await movementFixture();

    await expect(
      db.stockMovement.create({
        data: {
          productId: product.id,
          performedBy: admin.id,
          movementType: 'ADJUSTMENT_IN',
          quantityDelta: 2,
          quantityBefore: 0,
          quantityAfter: 5,
          reason: 'Stock received',
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a zero quantity delta', async () => {
    const { admin, product } = await movementFixture();

    await expect(
      db.stockMovement.create({
        data: {
          productId: product.id,
          performedBy: admin.id,
          movementType: 'ADJUSTMENT_IN',
          quantityDelta: 0,
          quantityBefore: 5,
          quantityAfter: 5,
          reason: 'No change',
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a manual adjustment without a reason', async () => {
    const { admin, product } = await movementFixture();

    await expect(
      db.stockMovement.create({
        data: {
          productId: product.id,
          performedBy: admin.id,
          movementType: 'ADJUSTMENT_OUT',
          quantityDelta: -1,
          quantityBefore: 5,
          quantityAfter: 4,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a manual adjustment with a blank reason', async () => {
    const { admin, product } = await movementFixture();

    await expect(
      db.stockMovement.create({
        data: {
          productId: product.id,
          performedBy: admin.id,
          movementType: 'ADJUSTMENT_OUT',
          quantityDelta: -1,
          quantityBefore: 5,
          quantityAfter: 4,
          reason: '   ',
        },
      }),
    ).rejects.toThrow();
  });

  it('accepts a valid movement', async () => {
    const { admin, product } = await movementFixture();

    const movement = await db.stockMovement.create({
      data: {
        productId: product.id,
        performedBy: admin.id,
        movementType: 'ADJUSTMENT_IN',
        quantityDelta: 5,
        quantityBefore: 0,
        quantityAfter: 5,
        reason: 'Stock received',
      },
    });

    expect(movement.quantityAfter).toBe(5);
  });
});

describe('order constraints', () => {
  it('rejects an unknown status', async () => {
    const admin = await createTestAdmin(db);

    await expect(
      db.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}-UNKNOWN`,
          status: 'UNKNOWN',
          totalAmount: '0.00',
          createdBy: admin.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a negative total', async () => {
    const admin = await createTestAdmin(db);

    await expect(
      db.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}-NEGATIVE`,
          status: 'PENDING',
          totalAmount: '-1.00',
          createdBy: admin.id,
        },
      }),
    ).rejects.toThrow();
  });
});

async function createOrder(createdBy: string) {
  return db.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      status: 'PENDING',
      totalAmount: '0.00',
      createdBy,
    },
  });
}

async function movementFixture() {
  const admin = await createTestAdmin(db);
  const product = await createTestProduct(db, { stock: 0 });

  return { admin, product };
}
