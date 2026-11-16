import { z } from 'zod';

export const loginSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.email(),
  ),
  password: z.string().min(1, 'Password must not be empty'),
});

export type LoginInput = z.infer<typeof loginSchema>;
