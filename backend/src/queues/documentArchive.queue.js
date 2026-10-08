import { Queue } from 'bullmq';

import { redisConnection } from '../config/redis.js';

export const documentArchiveQueue = new Queue(
  'securevault-document-archives',
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 1000,
      },
    },
  }
);