import * as z from 'zod';

export const dashboardQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d']).default('24h'),
}).strict();