import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, 'Password must not be empty'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type ValidationDetail = {
  path: string;
  message: string;
};

export function validationDetails(error: z.ZodError): ValidationDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
