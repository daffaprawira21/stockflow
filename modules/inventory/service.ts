import { Prisma, type PrismaClient } from '../../lib/generated/prisma/client';
import { ApiError } from '../../lib/api/errors';
import { paginationMeta } from '../../lib/api/response';
import type { AdjustInventoryInput, InventoryListQuery, StockMovementQuery } from './schemas';
import { serializeInventoryItem, serializeStockAdjustment, serializeStockMovement } from './serializer';

type InventoryTransaction = Pick<Prisma.TransactionClient, 'stockMovement'>;

type InitialStockMovement = {
  productId: string;
  performedBy: string;
  quantity: number;
};

type InventoryListClient = Pick<PrismaClient, 'product' | '$transaction'>;
type StockMovementListClient = Pick<PrismaClient, 'product' | 'stockMovement' | '$transaction'>;
type InventoryAdjustmentClient = Pick<PrismaClient, '$transaction'>;

export async function listInventory(
  prisma: InventoryListClient,
  query: InventoryListQuery,
) {
  const where: Prisma.ProductWhereInput = {
    ...(query.search ? {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(query.lowStock === undefined ? {} : { stock: { lte: query.lowStock } }),
  };
  const skip = (query.page - 1) * query.limit;

  const [products, totalItems] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: [{ sku: 'asc' }, { id: 'asc' }],
      skip,
      take: query.limit,
      select: { id: true, sku: true, name: true, stock: true, isActive: true },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map(serializeInventoryItem),
    meta: paginationMeta(query.page, query.limit, totalItems),
  };
}

export async function listStockMovements(
  prisma: StockMovementListClient,
  productId: string,
  query: StockMovementQuery,
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new ApiError('RESOURCE_NOT_FOUND');
  }

  const where: Prisma.StockMovementWhereInput = {
    productId,
    ...(query.movementType === undefined ? {} : { movementType: query.movementType }),
  };
  const skip = (query.page - 1) * query.limit;

  const [movements, totalItems] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip,
      take: query.limit,
      select: {
        id: true,
        productId: true,
        movementType: true,
        quantityDelta: true,
        quantityBefore: true,
        quantityAfter: true,
        orderId: true,
        reason: true,
        createdAt: true,
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    data: movements.map(serializeStockMovement),
    meta: paginationMeta(query.page, query.limit, totalItems),
  };
}

export async function adjustInventory(
  prisma: InventoryAdjustmentClient,
  performedBy: string,
  input: AdjustInventoryInput,
) {
  return prisma.$transaction(async (tx) => {
    const lockedProducts = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM products WHERE id = ${input.productId}::uuid FOR UPDATE
    `;
    if (lockedProducts.length === 0) {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }

    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, stock: true },
    });
    if (!product) {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }

    const delta = input.type === 'ADJUSTMENT_IN' ? input.quantity : -input.quantity;
    const quantityAfter = product.stock + delta;
    if (quantityAfter < 0 || quantityAfter > 2_147_483_647) {
      throw new ApiError('INVALID_ADJUSTMENT');
    }

    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { stock: quantityAfter },
      select: { stock: true },
    });
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        performedBy,
        movementType: input.type,
        quantityDelta: delta,
        quantityBefore: product.stock,
        quantityAfter: updatedProduct.stock,
        orderId: null,
        reason: input.reason,
      },
    });

    return serializeStockAdjustment({
      productId: product.id,
      movementType: input.type,
      quantityDelta: delta,
      quantityBefore: product.stock,
      quantityAfter: updatedProduct.stock,
      performedBy,
    });
  });
}

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
