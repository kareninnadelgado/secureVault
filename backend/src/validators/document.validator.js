import * as z from 'zod';

const documentNameSchema = z
  .string()
  .trim()
  .min(1, 'Document name is required')
  .max(150, 'Document name must not exceed 150 characters');

const descriptionSchema = z
  .string()
  .trim()
  .max(500, 'Description must not exceed 500 characters')
  .optional();

export const createDocumentSchema = z
  .object({
    name: documentNameSchema,
    description: descriptionSchema,
  })
  .strict();

export const documentIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();