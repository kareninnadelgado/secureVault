import { Queue } from 'bullmq';

import { redisConnection } from '../config/redis.js';

export const documentQueue = new Queue('securevault-documents', {
  connection: redisConnection,
});