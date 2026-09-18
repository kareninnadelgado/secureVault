import * as z from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must contain at least 3 characters')
    .max(30, 'Username must not exceed 30 characters'),

  password: z
    .string()
    .min(8, 'Password must contain at least 8 characters')
    .max(72, 'Password must not exceed 72 characters')
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 72,
      'Password must not exceed 72 bytes'
    ),
}).strict();