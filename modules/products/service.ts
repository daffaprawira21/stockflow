import { Prisma } from '../../lib/generated/prisma/client';
import { ApiError } from '../../lib/api/errors';
import { toMoneyString } from '../../lib/money';
import { recordInitialStock } from '../inventory/service';
import type { CreateProductInput } from './schemas';

type ProductTransaction = Prisma.TransactionClient;
type ProductClient = Pick<Prisma.TransactionClient, 'product'> & {
  $transaction<T>(callback: (tx: ProductTransaction) => Promise<T>): Promise<T>;
};

export type CreatedProduct = {
  id: string;
  sku: string;
  name: string;
  price: string;
  stock: number;
  isActive: boolean;
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
