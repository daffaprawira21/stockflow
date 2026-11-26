import { Prisma, type PrismaClient } from '../../lib/generated/prisma/client';
import { ApiError } from '../../lib/api/errors';
import { paginationMeta } from '../../lib/api/response';
import {
  consolidateStockItems,
  MAX_STOCK_QUANTITY,
  type ConsolidatedStockItem,
} from './consolidate';
import type { AdjustInventoryInput, InventoryListQuery, StockMovementQuery } from './schemas';
import { serializeInventoryItem, serializeStockAdjustment, serializeStockMovement } from './serializer';
import type { StockMovementType } from './types';

type InventoryTransaction = Pick<Prisma.TransactionClient, 'stockMovement'>;


type OrderConfirmationTransaction = Pick<
  Prisma.TransactionClient,
  'product' | 'stockMovement' | '$queryRaw'
>;

type InitialStockMovement = {
  productId: string;
  performedBy: string;
  quantity: number;
};

type OrderStockDeduction = {
  orderId: string;
  performedBy: string;
  items: ConsolidatedStockItem[];
};

type LockedProductStock = {
  id: string;
  stock: number;
  isActive: boolean;
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
    if (quantityAfter < 0 || quantityAfter > MAX_STOCK_QUANTITY) {
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

async function lockProductStocks(
  tx: OrderConfirmationTransaction,
  productIds: string[],
): Promise<LockedProductStock[]> {
  const orderedIds = [...new Set(productIds)].sort();

  return tx.$queryRaw<LockedProductStock[]>`
    SELECT id, stock, is_active AS "isActive"
    FROM products
    WHERE id = ANY(${orderedIds}::uuid[])
    ORDER BY id
    FOR UPDATE
  `;
}

export async function restoreStockForOrder(
  tx: OrderConfirmationTransaction,
  restoration: OrderStockDeduction,
): Promise<void> {
  const items = consolidateStockItems(restoration.items);
  const locked = await lockProductStocks(
    tx,
    items.map((item) => item.productId),
  );
  const byId = new Map(locked.map((product) => [product.id, product]));

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }

    const quantityAfter = product.stock + item.quantity;
    if (quantityAfter > MAX_STOCK_QUANTITY) {
      throw new ApiError('INVALID_ORDER_STATE', 'Stock restoration exceeds the allowed maximum');
    }
    await tx.product.update({
      where: { id: product.id },
      data: { stock: quantityAfter },
    });
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        performedBy: restoration.performedBy,
        orderId: restoration.orderId,
        movementType: 'ORDER_CANCELLED' satisfies StockMovementType,
        quantityDelta: item.quantity,
        quantityBefore: product.stock,
        quantityAfter,
      },
    });
  }
}

export async function deductStockForOrder(
  tx: OrderConfirmationTransaction,
  deduction: OrderStockDeduction,
): Promise<void> {
  const items = consolidateStockItems(deduction.items);
  const locked = await lockProductStocks(
    tx,
    items.map((item) => item.productId),
  );
  const byId = new Map(locked.map((product) => [product.id, product]));

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }
    if (!product.isActive) {
      throw new ApiError('PRODUCT_INACTIVE');
    }
    if (product.stock < item.quantity) {
      throw new ApiError('INSUFFICIENT_STOCK', undefined, [{
        productId: product.id,
        requestedQuantity: item.quantity,
        availableQuantity: product.stock,
      }]);
    }
  }

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }

    const quantityAfter = product.stock - item.quantity;
    await tx.product.update({
      where: { id: product.id },
      data: { stock: quantityAfter },
    });
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        performedBy: deduction.performedBy,
        orderId: deduction.orderId,
        movementType: 'ORDER_CONFIRMED' satisfies StockMovementType,
        quantityDelta: -item.quantity,
        quantityBefore: product.stock,
        quantityAfter,
      },
    });
  }
}
