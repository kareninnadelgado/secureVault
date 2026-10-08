import * as z from 'zod';

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must contain at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    'Username contains invalid characters'
  );

const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .max(254, 'Email must not exceed 254 characters');

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(80, 'Name must not exceed 80 characters');

const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 8 characters')
  .max(72, 'Password must not exceed 72 characters')
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must not exceed 72 bytes'
  );

export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
}).strict();

export const updateUserSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided'
  );

export const userIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const roleAssignmentSchema = z.object({
  role: z.enum(['ADMIN', 'EMPLOYEE']),
}).strict();

export const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();