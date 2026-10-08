import * as z from 'zod';

export const documentAndUserParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
}).strict();

export const documentPermissionSchema = z.object({
  canView: z.boolean(),
  canDownload: z.boolean(),
}).strict().refine(
  (data) => !data.canDownload || data.canView,
  {
    message: 'Download permission requires view permission',
    path: ['canDownload'],
  }
);