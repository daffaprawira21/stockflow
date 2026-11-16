import { Prisma, type PrismaClient } from '../../lib/generated/prisma/client';
import { ApiError } from '../../lib/api/errors';
import { toMoneyString } from '../../lib/money';
import { recordInitialStock } from '../inventory/service';
import type { ProductListQuery } from './list-query';
import type { CreateProductInput, UpdateProductInput } from './schemas';

type ProductTransaction = Prisma.TransactionClient;
type ProductClient = Pick<Prisma.TransactionClient, 'product'> & {
  $transaction<T>(callback: (tx: ProductTransaction) => Promise<T>): Promise<T>;
};
type ProductListClient = Pick<PrismaClient, 'product'>;

export type CreatedProduct = {
  id: string;
  sku: string;
  name: string;
  price: string;
  stock: number;
  isActive: boolean;
};

export type UpdatedProduct = ListedProduct;

export type ListedProduct = CreatedProduct & {
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function createProduct(
  prisma: ProductClient,
  performedBy: string,
  input: CreateProductInput,
): Promise<CreatedProduct> {
  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: input.sku,
          name: input.name,
          description: input.description,
          price: new Prisma.Decimal(input.price),
          stock: input.initialStock,
        },
      });

      if (input.initialStock > 0) {
        await recordInitialStock(tx, {
          productId: product.id,
          performedBy,
          quantity: input.initialStock,
        });
      }

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: toMoneyString(product.price),
        stock: product.stock,
        isActive: product.isActive,
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ApiError('SKU_ALREADY_EXISTS');
    }

    throw error;
  }
}

export async function updateProduct(
  prisma: ProductListClient,
  id: string,
  input: UpdateProductInput,
): Promise<UpdatedProduct> {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.price === undefined ? {} : { price: new Prisma.Decimal(input.price) }),
      },
    });

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: toMoneyString(product.price),
      stock: product.stock,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }

    throw error;
  }
}

export async function getProductById(prisma: ProductListClient, id: string): Promise<ListedProduct> {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new ApiError('RESOURCE_NOT_FOUND');
  }

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    price: toMoneyString(product.price),
    stock: product.stock,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export async function listProducts(prisma: ProductListClient, query: ProductListQuery) {
  const where: Prisma.ProductWhereInput = {
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    ...(query.search ? {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ],
    } : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
    { [query.sortBy]: query.sortOrder },
    { id: 'asc' },
  ];
  const skip = (query.page - 1) * query.limit;

  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip, take: query.limit }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map((product): ListedProduct => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: toMoneyString(product.price),
      stock: product.stock,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    },
  };
}
