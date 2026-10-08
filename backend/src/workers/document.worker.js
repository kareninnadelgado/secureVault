import { Worker } from 'bullmq';
import { ZipArchive } from 'archiver';

import {
  createWriteStream,
} from 'node:fs';

import {
  mkdir,
  access,
} from 'node:fs/promises';

import path from 'node:path';

import { db } from '../prisma/db.ts';

import {
  redisConnection,
} from '../config/redis.js';

import {
  canUserAccessDocument,
} from '../services/documentPermission.service.js';

const QUEUE_NAME =
  'securevault-document-archives';

const STORAGE_ROOT = path.resolve(
  process.cwd(),
  'storage'
);

const JOBS_ROOT = path.resolve(
  STORAGE_ROOT,
  'jobs'
);

function getDocumentPath(filePath) {
  const absolutePath = path.resolve(
    STORAGE_ROOT,
    filePath
  );

  if (
    absolutePath !== STORAGE_ROOT &&
    !absolutePath.startsWith(
      `${STORAGE_ROOT}${path.sep}`
    )
  ) {
    throw new Error('Invalid document path');
  }

  return absolutePath;
}

function sanitizeFileName(name) {
  const baseName = path.basename(name);

  return baseName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .slice(0, 180);
}

async function createArchive(job) {
  const {
    userId,
    documentIds,
  } = job.data;

  const user = await db.orm.public.User
    .where({ id: userId })
    .include('role')
    .first();

  if (!user || !user.isActive) {
    throw new Error(
      'User is no longer active'
    );
  }

  await mkdir(JOBS_ROOT, {
    recursive: true,
  });

  const outputFileName =
    `${String(job.id)}.zip`;

  const outputPath = path.join(
    JOBS_ROOT,
    outputFileName
  );

  const outputRelativePath =
    `jobs/${outputFileName}`;

  const output = createWriteStream(
    outputPath
  );

  const archive = new ZipArchive({
  zlib: {
    level: 9,
  },
});

  archive.pipe(output);

  const closePromise = new Promise(
    (resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);
    }
  );

  let completed = 0;

  for (const documentId of documentIds) {
    const document =
      await db.orm.public.Document
        .where({ id: documentId })
        .first();

    if (!document || !document.isActive) {
      throw new Error(
        `Document ${documentId} is no longer available`
      );
    }

    const allowed =
      await canUserAccessDocument({
        document,
        user: {
          id: user.id,
          isActive: user.isActive,
          role: user.role.name,
        },
        action: 'download',
      });

    if (!allowed) {
      throw new Error(
        `Access to document ${documentId} is no longer available`
      );
    }

    const absolutePath =
      getDocumentPath(document.filePath);

    await access(absolutePath);

    archive.file(absolutePath, {
      name: `${document.id}-${sanitizeFileName(
        document.name
      )}`,
    });

    completed += 1;

    await job.updateProgress(
      Math.round(
        (completed / documentIds.length) * 90
      )
    );
  }

  await archive.finalize();
  await closePromise;

  await job.updateProgress(100);

  return {
    outputPath: outputRelativePath,
    documentCount: documentIds.length,
  };
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(
      `Processing archive job ${job.id}`
    );

    return createArchive(job);
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

worker.on('completed', (job) => {
  console.log(
    `Archive job ${job.id} completed`
  );
});

worker.on('failed', (job, error) => {
  console.error(
    `Archive job ${job?.id} failed:`,
    error.message
  );
});

console.log(
  'SecureVault document archive worker running'
);