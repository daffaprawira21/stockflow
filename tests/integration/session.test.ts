import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_DURATION_MS,
  createSession,
  hashSessionToken,
  revokeSession,
  validateSession,
} from '../../modules/auth/session';
import { createTestPrismaClient, truncateAll } from '../helpers/db';
import { createTestAdmin } from '../helpers/factories';

const prisma = createTestPrismaClient();

beforeEach(async () => {
  await truncateAll(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('session persistence', () => {
  it('creates a session that expires after exactly 12 hours and stores only the hash', async () => {
    const admin = await createTestAdmin(prisma);
    const now = new Date();

    const { token, expiresAt } = await createSession(prisma, admin.id, now);
    const row = await prisma.session.findFirstOrThrow();

    expect(expiresAt.getTime() - now.getTime()).toBe(SESSION_DURATION_MS);
    expect(row.tokenHash).toBe(hashSessionToken(token));
    expect(row.tokenHash).not.toBe(token);
    expect(row.userId).toBe(admin.id);
  });

  it('validates a live session and rejects unknown tokens', async () => {
    const admin = await createTestAdmin(prisma);
    const { token } = await createSession(prisma, admin.id);

    const validated = await validateSession(prisma, token);

    expect(validated?.user.id).toBe(admin.id);
    await expect(validateSession(prisma, 'not-a-real-token')).resolves.toBeNull();
  });

  it('rejects a session at or after its expiry', async () => {
    const admin = await createTestAdmin(prisma);
    const past = new Date(Date.now() - SESSION_DURATION_MS - 1_000);

    const { token } = await createSession(prisma, admin.id, past);

    await expect(validateSession(prisma, token)).resolves.toBeNull();
  });

  it('removes expired sessions on login without touching live ones', async () => {
    const admin = await createTestAdmin(prisma);
    const expired = await createSession(
      prisma,
      admin.id,
      new Date(Date.now() - SESSION_DURATION_MS - 1_000),
    );
    const live = await createSession(prisma, admin.id);

    await createSession(prisma, admin.id);

    const hashes = (await prisma.session.findMany()).map((row) => row.tokenHash);
    expect(hashes).not.toContain(hashSessionToken(expired.token));
    expect(hashes).toContain(hashSessionToken(live.token));
  });

  it('revokes a session immediately', async () => {
    const admin = await createTestAdmin(prisma);
    const { token } = await createSession(prisma, admin.id);

    await revokeSession(prisma, token);

    await expect(validateSession(prisma, token)).resolves.toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });

  it('treats revoking an unknown token as a no-op', async () => {
    await expect(revokeSession(prisma, 'unknown-token')).resolves.toBeUndefined();
  });
});
