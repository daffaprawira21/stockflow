import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validationDetails } from '../../lib/api/validation';

const schema = z.object({
  email: z.email('Email must be valid'),
  password: z.string().min(1, 'Password must not be empty'),
});

describe('validationDetails', () => {
  it('maps each Zod issue to its path and message', () => {
    const result = schema.safeParse({ email: 'bad', password: '' });

    if (result.success) {
      throw new Error('expected validation to fail');
    }

    expect(validationDetails(result.error)).toEqual([
      { path: 'email', message: 'Email must be valid' },
      { path: 'password', message: 'Password must not be empty' },
    ]);
  });

  it('joins nested paths with dots', () => {
    const nested = z.object({
      items: z.array(z.object({ quantity: z.number().int() })),
    });
    const result = nested.safeParse({ items: [{ quantity: 'two' }] });

    if (result.success) {
      throw new Error('expected validation to fail');
    }

    expect(validationDetails(result.error)[0]?.path).toBe('items.0.quantity');
  });
});
