import path from 'node:path';
import { access } from 'node:fs/promises';
import { createReadStream } from 'node:fs';

import { db } from '../prisma/db.ts';
import AppError from '../utils/AppError.js';
import { createAuditLog } from './audit.service.js';
import { AUDIT_ACTIONS } from '../utils/auditActions.js';
import { canUserAccessDocument } from './documentPermission.service.js';

const STORAGE_ROOT = path.resolve(
  process.cwd(),
  'storage'
);

function getAbsoluteDocumentPath(filePath) {
  const absolutePath = path.resolve(STORAGE_ROOT, filePath);

  if (
    absolutePath !== STORAGE_ROOT &&
    !absolutePath.startsWith(`${STORAGE_ROOT}${path.sep}`)
  ) {
    throw new AppError('Invalid document path', 500);
  }

  return absolutePath;
}

async function getAuthorizedDocument({
  documentId,
  userId,
  userRole,
  action,
  ipAddress,
  userAgent,
}) {
  const document = await db.orm.public.Document
    .where({ id: documentId })
    .first();

  if (!document || !document.isActive) {
    throw new AppError('Document not found', 404);
  }

  const hasAccess = await canUserAccessDocument({
    document,
    user: {
      id: userId,
      isActive: true,
      role: userRole,
    },
    action,
  });

  if (!hasAccess) {
    await createAuditLog({
      userId,
      action: AUDIT_ACTIONS.ACCESS_DENIED,
      resourceType: 'DOCUMENT',
      resourceId: documentId,
      ipAddress,
      userAgent,
      metadata: {
        attemptedAction: action,
      },
    });

    throw new AppError('Access denied', 403);
  }

  return document;
}

export async function prepareDocumentView({
  documentId,
  userId,
  userRole,
  ipAddress = null,
  userAgent = null,
}) {
  const document = await getAuthorizedDocument({
    documentId,
    userId,
    userRole,
    action: 'view',
    ipAddress,
    userAgent,
  });

  const absolutePath = getAbsoluteDocumentPath(document.filePath);

  try {
    await access(absolutePath);
  } catch {
    throw new AppError('Document file not found', 404);
  }

  await createAuditLog({
    userId,
    action: AUDIT_ACTIONS.DOCUMENT_VIEW,
    resourceType: 'DOCUMENT',
    resourceId: document.id,
    ipAddress,
    userAgent,
  });

  return {
    document,
    absolutePath,
  };
}

export async function prepareDocumentDownload({
  documentId,
  userId,
  userRole,
  ipAddress = null,
  userAgent = null,
}) {
  const document = await getAuthorizedDocument({
    documentId,
    userId,
    userRole,
    action: 'download',
    ipAddress,
    userAgent,
  });

  const absolutePath = getAbsoluteDocumentPath(document.filePath);

  try {
    await access(absolutePath);
  } catch {
    throw new AppError('Document file not found', 404);
  }

  await createAuditLog({
    userId,
    action: AUDIT_ACTIONS.DOCUMENT_DOWNLOAD,
    resourceType: 'DOCUMENT',
    resourceId: document.id,
    ipAddress,
    userAgent,
  });

  return {
    document,
    absolutePath,
  };
}