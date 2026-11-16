import { z } from 'zod';

const MAX_PRICE_CENTS = 999_999_999_999_999n;

function isValidPrice(value: string): boolean {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return false;
  }

  const [whole, fraction = ''] = value.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));

  return cents <= MAX_PRICE_CENTS;
}

export const createProductSchema = z.object({
  sku: z.string().trim().min(1).max(100).transform((sku) => sku.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  description: z.string().optional(),
  price: z.string().refine(isValidPrice, 'Price must be a nonnegative decimal with at most two decimal places'),
  initialStock: z.number().int().nonnegative(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  price: z.string().refine(isValidPrice, 'Price must be a nonnegative decimal with at most two decimal places').optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
