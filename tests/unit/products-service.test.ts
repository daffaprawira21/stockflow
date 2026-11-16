import { Prisma } from '../../lib/generated/prisma/client';
import { describe, expect, it } from 'vitest';
import { createProduct } from '../../modules/products/service';
import type { CreateProductInput } from '../../modules/products/schemas';

const input: CreateProductInput = {
  sku: 'PRD-001',
  name: 'Wireless Mouse',
  price: '150000.00',
  initialStock: 50,
};

function transactionClient(productCreate: () => Promise<unknown>, movementCreate: () => Promise<unknown>) {
  return {
    product: { create: productCreate },
    stockMovement: { create: movementCreate },
  };
}

describe('createProduct', () => {
  it('creates active product and records initial stock in one transaction', async () => {
    let committed = false;
    const product = {
      id: 'product-id',
      sku: 'PRD-001',
      name: 'Wireless Mouse',
      price: new Prisma.Decimal('150000.00'),
      stock: 50,
      isActive: true,
    };
    const calls: string[] = [];
    const tx = transactionClient(
      async () => {
        calls.push('product');
        return product;
      },
      async () => {
        calls.push('movement');
        return {};
      },
    );
    const client = {
      product: tx.product,
      async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>) {
        const result = await callback(tx);
        committed = true;
        return result;
      },
    };

    await expect(createProduct(client as never, 'admin-id', input)).resolves.toEqual({
      id: 'product-id',
      sku: 'PRD-001',
      name: 'Wireless Mouse',
      price: '150000.00',
      stock: 50,
      isActive: true,
    });
    expect(calls).toEqual(['product', 'movement']);
    expect(committed).toBe(true);
  });

  it('does not record a zero-quantity movement', async () => {
    let movementCalls = 0;
    const tx = transactionClient(
      async () => ({
        id: 'product-id',
        sku: 'PRD-001',
        name: 'Wireless Mouse',
        price: new Prisma.Decimal('0.00'),
        stock: 0,
        isActive: true,
      }),
      async () => {
        movementCalls++;
        return {};
      },
    );
    const client = {
      product: tx.product,
      $transaction: <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
    };

    await createProduct(client as never, 'admin-id', { ...input, price: '0', initialStock: 0 });
    expect(movementCalls).toBe(0);
  });
});
