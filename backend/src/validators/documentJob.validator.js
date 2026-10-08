import * as z from 'zod';

export const createArchiveJobSchema = z
  .object({
    documentIds: z
      .array(
        z.coerce.number().int().positive()
      )
      .min(1, 'At least one document is required')
      .max(20, 'You can process up to 20 documents at once'),
  })
  .strict()
  .refine(
    (data) =>
      new Set(data.documentIds).size ===
      data.documentIds.length,
    {
      message: 'Document IDs must be unique',
      path: ['documentIds'],
    }
  );

export const jobIdParamsSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
  })
  .strict();