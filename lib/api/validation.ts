import { z } from 'zod';

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
