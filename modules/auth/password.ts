import { compare, hash as bcryptHash } from 'bcryptjs';

export const PASSWORD_HASH_COST = 12;

// Valid bcrypt hash of a value that can never be supplied by a user.
// It keeps verification timing similar when the email is unknown.
const DUMMY_PASSWORD_HASH = '$2b$12$qrvnX1EbuXdjlTOCqHY83uQzRyNkLf1upIggLnRJPePwvN4eXxOya';

export function hashPassword(password: string): Promise<string> {
  return bcryptHash(password, PASSWORD_HASH_COST);
}

export async function verifyPassword(
  password: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  const target = passwordHash ?? DUMMY_PASSWORD_HASH;
  const matches = await compare(password, target);

  return passwordHash ? matches : false;
}
