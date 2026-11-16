import { describe, expect, it } from 'vitest';
import { loginSchema, validationDetails } from '../../modules/auth/schemas';

describe('login schema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@example.com',
      password: 'correct-horse',
    });

    expect(result.success).toBe(true);
  });

  it('normalizes email casing and whitespace', () => {
    const result = loginSchema.parse({
      email: '  Admin@Example.COM ',
      password: 'correct-horse',
    });

    expect(result.email).toBe('admin@example.com');
  });

  it('rejects a missing email', () => {
    const result = loginSchema.safeParse({ password: 'correct-horse' });

    expect(result.success).toBe(false);
  });

  it('rejects a malformed email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'correct-horse',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a non-string password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@example.com',
      password: 12345,
    });

    expect(result.success).toBe(false);
  });

  it('maps Zod issues to validation details', () => {
    const result = loginSchema.safeParse({ email: 'bad', password: '' });

    if (result.success) {
      throw new Error('expected validation to fail');
    }

    const details = validationDetails(result.error);

    expect(details.length).toBeGreaterThanOrEqual(2);
    expect(details.map((detail) => detail.path)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
    expect(details.every((detail) => typeof detail.message === 'string')).toBe(true);
  });
});
