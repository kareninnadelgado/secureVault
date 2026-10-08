import { db } from '../prisma/db.ts';
import { createAuditLog } from './audit.service.js';
import { AUDIT_ACTIONS } from '../utils/auditActions.js';
import AppError from '../utils/AppError.js';
import { ROLES } from '../utils/roles.js';

function toPublicPermission(permission) {
  return {
    documentId: permission.documentId,
    userId: permission.userId,
    canView: permission.canView,
    canDownload: permission.canDownload,
    grantedAt: permission.grantedAt,
    user: permission.user
      ? {
          id: permission.user.id,
          username: permission.user.username,
          firstName: permission.user.firstName,
          lastName: permission.user.lastName,
          isActive: permission.user.isActive,
        }
      : null,
  };
}

export async function listDocumentPermissions(documentId) {
  const document = await db.orm.public.Document
    .where({ id: documentId })
    .first();

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  const permissions = await db.orm.public.DocumentPermission
    .where({ documentId })
    .include('user')
    .all();

  return permissions.map(toPublicPermission);
}

export async function setDocumentPermission({
  documentId,
  targetUserId,
  canView,
  canDownload,
  actorUserId,
  ipAddress = null,
  userAgent = null,
}) {
  const result = await db.transaction(async (tx) => {
    const document = await tx.orm.public.Document
      .where({ id: documentId })
      .first();

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    if (!document.isActive) {
      throw new AppError('Document is inactive', 400);
    }

    const targetUser = await tx.orm.public.User
      .where({ id: targetUserId })
      .first();

    if (!targetUser) {
      throw new AppError('Target user not found', 404);
    }

    if (!targetUser.isActive) {
      throw new AppError('Target user is inactive', 400);
    }

    const existingPermission = await tx.orm.public.DocumentPermission
      .where({
        documentId,
        userId: targetUserId,
      })
      .first();

    let permission;

    if (existingPermission) {
      permission = await tx.orm.public.DocumentPermission
        .where({
          documentId,
          userId: targetUserId,
        })
        .update({
          canView,
          canDownload,
        });
    } else {
      permission = await tx.orm.public.DocumentPermission.create({
        documentId,
        userId: targetUserId,
        canView,
        canDownload,
      });
    }

    await createAuditLog(
      {
        userId: actorUserId,
        action: AUDIT_ACTIONS.DOCUMENT_ACCESS_UPDATED,
        resourceType: 'DOCUMENT',
        resourceId: documentId,
        ipAddress,
        userAgent,
        metadata: {
          documentId,
          targetUserId,
          username: targetUser.username,
          canView,
          canDownload,
        },
      },
      tx
    );

    return permission;
  });

  const permission = await db.orm.public.DocumentPermission
    .where({
      documentId: result.documentId,
      userId: result.userId,
    })
    .include('user')
    .first();

  return toPublicPermission(permission);
}

export async function revokeDocumentPermission({
  documentId,
  targetUserId,
  actorUserId,
  ipAddress = null,
  userAgent = null,
}) {
  return db.transaction(async (tx) => {
    const permission = await tx.orm.public.DocumentPermission
      .where({
        documentId,
        userId: targetUserId,
      })
      .first();

    if (!permission) {
      throw new AppError('Document permission not found', 404);
    }

    await tx.orm.public.DocumentPermission
      .where({
        documentId,
        userId: targetUserId,
      })
      .delete();

    await createAuditLog(
      {
        userId: actorUserId,
        action: AUDIT_ACTIONS.DOCUMENT_ACCESS_REVOKED,
        resourceType: 'DOCUMENT',
        resourceId: documentId,
        ipAddress,
        userAgent,
        metadata: {
          documentId,
          targetUserId,
        },
      },
      tx
    );

    return {
      documentId,
      userId: targetUserId,
      revoked: true,
    };
  });
}

export async function canUserAccessDocument({
  document,
  user,
  action,
}) {
  if (!document || !document.isActive || !user || !user.isActive) {
    return false;
  }

  // Administrators can access documents.
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  const permission = await db.orm.public.DocumentPermission
    .where({
      documentId: document.id,
      userId: user.id,
    })
    .first();

  if (!permission) {
    return false;
  }

  if (action === 'view') {
    return permission.canView;
  }

  if (action === 'download') {
    return permission.canDownload;
  }

  return false;
}