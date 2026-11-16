import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../lib/generated/prisma/client';

type AdminOverrides = {
  email?: string;
  passwordHash?: string;
  role?: string;
};

export async function createTestAdmin(prisma: PrismaClient, overrides: AdminOverrides = {}) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `admin-${randomUUID()}@example.com`,
      passwordHash: overrides.passwordHash ?? 'test-password-hash',
      role: overrides.role ?? 'ADMIN',
    },
  });
}

type ProductOverrides = {
  sku?: string;
  name?: string;
  description?: string;
  price?: string;
  stock?: number;
  isActive?: boolean;
};

export async function createTestProduct(prisma: PrismaClient, overrides: ProductOverrides = {}) {
  return prisma.product.create({
    data: {
      sku: overrides.sku ?? `SKU-${randomUUID()}`,
      name: overrides.name ?? 'Test product',
      description: overrides.description ?? null,
      price: overrides.price ?? '100.00',
      stock: overrides.stock ?? 0,
      isActive: overrides.isActive ?? true,
    },
  });
}

type OrderItemInput = {
  productId: string;
  quantity: number;
  unitPrice: string;
};

type OrderOverrides = {
  orderNumber?: string;
  status?: string;
  items: OrderItemInput[];
};

export async function createTestOrder(
  prisma: PrismaClient,
  createdById: string,
  overrides: OrderOverrides,
) {
  const items = overrides.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: (Number(item.unitPrice) * item.quantity).toFixed(2),
  }));

  const totalAmount = items
    .reduce((total, item) => total + Number(item.subtotal), 0)
    .toFixed(2);

  return prisma.order.create({
    data: {
      orderNumber: overrides.orderNumber ?? `ORD-TEST-${randomUUID()}`,
      status: overrides.status ?? 'PENDING',
      totalAmount,
      createdBy: createdById,
      items: { create: items },
    },
  });
}
