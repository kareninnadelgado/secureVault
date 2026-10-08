import { db } from '../prisma/db.ts';

import { documentArchiveQueue } from '../queues/documentArchive.queue.js';

import {
  canUserAccessDocument,
} from './documentPermission.service.js';

import { createAuditLog } from './audit.service.js';
import { AUDIT_ACTIONS } from '../utils/auditActions.js';
import { ROLES } from '../utils/roles.js';

import AppError from '../utils/AppError.js';

export async function createArchiveJob({
  documentIds,
  userId,
  userRole,
  ipAddress = null,
  userAgent = null,
}) {
  const user = await db.orm.public.User
    .where({ id: userId })
    .include('role')
    .first();

  if (!user || !user.isActive) {
    throw new AppError('Authentication required', 401);
  }

  for (const documentId of documentIds) {
    const document = await db.orm.public.Document
      .where({ id: documentId })
      .first();

    if (!document || !document.isActive) {
      throw new AppError('Document not found', 404);
    }

    const allowed = await canUserAccessDocument({
      document,
      user: {
        id: userId,
        isActive: user.isActive,
        role: userRole,
      },
      action: 'download',
    });

    if (!allowed) {
      await createAuditLog({
        userId,
        action: AUDIT_ACTIONS.ACCESS_DENIED,
        resourceType: 'DOCUMENT',
        resourceId: documentId,
        ipAddress,
        userAgent,
        metadata: {
          attemptedAction: 'DOCUMENT_ARCHIVE',
        },
      });

      throw new AppError('Access denied', 403);
    }
  }

  const job = await documentArchiveQueue.add(
    'create-document-archive',
    {
      userId,
      documentIds,
    }
  );

  return {
    jobId: String(job.id),
    status: 'queued',
    statusUrl: `/api/document-jobs/${job.id}`,
  };
}

function mapJobState(state) {
  switch (state) {
    case 'waiting':
    case 'delayed':
    case 'waiting-children':
      return 'queued';

    case 'active':
      return 'processing';

    case 'completed':
      return 'completed';

    case 'failed':
      return 'failed';

    default:
      return state;
  }
}

function formatTimestamp(timestamp) {
  return timestamp
    ? new Date(timestamp).toISOString()
    : null;
}

export async function getJobStatus({
  jobId,
  userId,
  userRole,
}) {
  const job = await documentArchiveQueue.getJob(jobId);

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  const isOwner =
    String(job.data.userId) === String(userId);

  const isAdmin = userRole === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError('Job not found', 404);
  }

  const state = await job.getState();

  const response = {
    jobId: String(job.id),
    status: mapJobState(state),
    progress:
      typeof job.progress === 'number'
        ? job.progress
        : 0,
    createdAt: formatTimestamp(job.timestamp),
    processedAt: formatTimestamp(job.processedOn),
    finishedAt: formatTimestamp(job.finishedOn),
  };

  if (state === 'failed') {
    response.error = job.failedReason || 'Job failed';
  }

  if (state === 'completed') {
    response.downloadUrl =
      `/api/document-jobs/${job.id}/download`;
  }

  return response;
}

export async function getCompletedJobForDownload({
  jobId,
  userId,
  userRole,
}) {
  const job = await documentArchiveQueue.getJob(jobId);

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  const isOwner =
    String(job.data.userId) === String(userId);

  const isAdmin = userRole === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError('Job not found', 404);
  }

  const state = await job.getState();

  if (state !== 'completed') {
    throw new AppError(
      'Job is not completed yet',
      409
    );
  }

  // Revalidate download permissions at the moment
  // the generated archive is actually requested.
  if (!isAdmin) {
    for (const documentId of job.data.documentIds) {
      const document = await db.orm.public.Document
        .where({ id: documentId })
        .first();

      if (!document || !document.isActive) {
        throw new AppError('Access denied', 403);
      }

      const allowed = await canUserAccessDocument({
        document,
        user: {
          id: userId,
          isActive: true,
          role: userRole,
        },
        action: 'download',
      });

      if (!allowed) {
        throw new AppError('Access denied', 403);
      }
    }
  }

  const result = job.returnvalue;

  if (!result?.outputPath) {
    throw new AppError(
      'Completed job result is unavailable',
      500
    );
  }

  return {
    job,
    outputPath: result.outputPath,
    documentCount: result.documentCount,
  };
}