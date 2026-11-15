import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  TEST_DATABASE_URL: z.string().min(1).optional(),
  ADMIN_EMAIL: z.email('ADMIN_EMAIL must be a valid email address'),
  ADMIN_PASSWORD: z
    .string()
    .min(12, 'ADMIN_PASSWORD must be at least 12 characters'),
  SESSION_COOKIE_NAME: z.string().min(1).default('stockflow_session'),
  SESSION_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  ALLOWED_ORIGINS: z.string().optional(),
  ALLOW_SEED: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment configuration: ${problems}`);
  }

  return result.data;
}

export const env = parseEnv();

export const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
