import { describe, expect, it } from 'vitest';
import { PASSWORD_HASH_COST, hashPassword, verifyPassword } from '../../modules/auth/password';

describe('password hashing', () => {
  it('hashes with bcrypt at cost 12', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');

    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(PASSWORD_HASH_COST).toBe(12);
  });

  it('produces a different hash for the same password', async () => {
    const [first, second] = await Promise.all([
      hashPassword('same-password'),
      hashPassword('same-password'),
    ]);

    expect(first).not.toBe(second);
  });

  it('verifies the correct password', async () => {
    const hash = await hashPassword('valid-password');

    await expect(verifyPassword('valid-password', hash)).resolves.toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('valid-password');

    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('rejects when the account has no password hash', async () => {
    await expect(verifyPassword('anything', null)).resolves.toBe(false);
    await expect(verifyPassword('anything', undefined)).resolves.toBe(false);
  });
});
