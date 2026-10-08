import * as z from 'zod';

import { AUDIT_ACTIONS } from '../utils/auditActions.js';

const auditActions = Object.values(AUDIT_ACTIONS);

const dateStringSchema = z
  .string()
  .trim()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'Invalid date'
  );

export const auditQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20),

    action: z
      .enum(auditActions)
      .optional(),

    userId: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    resourceType: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .optional(),

    resourceId: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    from: dateStringSchema.optional(),

    to: dateStringSchema.optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (!data.from || !data.to) {
        return true;
      }

      return new Date(data.from) <= new Date(data.to);
    },
    {
      message: '`from` must be earlier than or equal to `to`',
      path: ['from'],
    }
  );

export const auditIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();