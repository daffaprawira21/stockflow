import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { env } from '@/lib/env';
import { validateSession } from './session';

export type CurrentUser = {
  id: string;
  email: string;
  role: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const validated = await validateSession(prisma, token);

  if (!validated) {
    return null;
  }

  return {
    id: validated.user.id,
    email: validated.user.email,
    role: validated.user.role,
  };
}
