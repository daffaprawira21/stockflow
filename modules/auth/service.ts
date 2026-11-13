import { ApiError } from '../../lib/api/errors';
import type { PrismaClient } from '../../lib/generated/prisma/client';
import { verifyPassword } from './password';
import type { LoginInput } from './schemas';
import { createSession, revokeSession } from './session';

export type AuthPrismaClient = Pick<PrismaClient, 'user' | 'session' | '$transaction'>;

export type PublicUser = {
  id: string;
  email: string;
  role: string;
};

export function toPublicUser(user: PublicUser): PublicUser {
  return { id: user.id, email: user.email, role: user.role };
}

export async function login(prisma: AuthPrismaClient, input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordMatches = await verifyPassword(input.password, user?.passwordHash);

  if (!user || !passwordMatches) {
    throw new ApiError('UNAUTHENTICATED', 'Invalid email or password');
  }

  const { token, expiresAt } = await createSession(prisma, user.id);

  return { user: toPublicUser(user), token, expiresAt };
}

export async function logout(prisma: AuthPrismaClient, token: string): Promise<void> {
  await revokeSession(prisma, token);
}
