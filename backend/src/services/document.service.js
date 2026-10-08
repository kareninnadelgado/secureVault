import { unlink } from 'node:fs/promises';

import { db } from '../prisma/db.ts';
import { createAuditLog } from './audit.service.js';

import { AUDIT_ACTIONS } from '../utils/auditActions.js';
import { ROLES } from '../utils/roles.js';
import AppError from '../utils/AppError.js';

function toPublicDocument(
  document,
  {
    canView = false,
    canDownload = false,
  } = {}
) {
  return {
    id: document.id,
    name: document.name,
    description: document.description,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    uploadedBy: document.uploadedBy,

    uploader: document.uploader
      ? {
          id: document.uploader.id,
          username: document.uploader.username,
          firstName: document.uploader.firstName,
          lastName: document.uploader.lastName,
        }
      : null,

    isActive: document.isActive,
    canView,
    canDownload,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export async function createDocument({
  data,
  file,
  actorUserId,
  ipAddress = null,
  userAgent = null,
}) {
  if (!file) {
    throw new AppError(
      'El archivo del documento es obligatorio.',
      400
    );
  }

  try {
    const document =
      await db.transaction(
        async (tx) => {
          const createdDocument =
            await tx.orm.public.Document.create({
              name: data.name,
              description:
                data.description || null,
              filePath: `documents/${file.filename}`,
              mimeType: file.mimetype,
              fileSize: file.size,
              uploadedBy: actorUserId,
              isActive: true,
            });

          await tx.orm.public.DocumentPermission.create(
            {
              documentId:
                createdDocument.id,
              userId: actorUserId,
              canView: true,
              canDownload: true,
            }
          );

          await createAuditLog(
            {
              userId: actorUserId,
              action:
                AUDIT_ACTIONS.DOCUMENT_CREATED,
              resourceType: 'DOCUMENT',
              resourceId:
                createdDocument.id,
              ipAddress,
              userAgent,
              metadata: {
                documentId:
                  createdDocument.id,
                name:
                  createdDocument.name,
                mimeType:
                  createdDocument.mimeType,
                fileSize:
                  createdDocument.fileSize,
              },
            },
            tx
          );

          return createdDocument;
        }
      );

    return getDocumentById({
      documentId: document.id,
      userId: actorUserId,
      userRole: ROLES.ADMIN,
    });
  } catch (error) {
    try {
      await unlink(file.path);
    } catch (cleanupError) {
      console.error(
        'No fue posible eliminar el archivo huérfano:',
        cleanupError
      );
    }

    throw error;
  }
}

export async function getDocumentById({
  documentId,
  userId,
  userRole,
}) {
  const document =
    await db.orm.public.Document
      .where({ id: documentId })
      .include('uploader')
      .first();

  if (!document) {
    throw new AppError(
      'Documento no encontrado.',
      404
    );
  }

  if (userRole === ROLES.ADMIN) {
    return toPublicDocument(document, {
      canView: true,
      canDownload: true,
    });
  }

  const permission =
    await db.orm.public.DocumentPermission
      .where({
        documentId,
        userId,
      })
      .first();

  if (!permission?.canView) {
    throw new AppError(
      'No tienes permiso para consultar este documento.',
      403
    );
  }

  return toPublicDocument(document, {
    canView: permission.canView,
    canDownload:
      permission.canDownload,
  });
}

export async function getAllDocuments({
  userId,
  userRole,
}) {
  const documents =
  await db.orm.public.Document
    .include('uploader')
    .orderBy(
      (document) =>
        document.createdAt.desc()
    )
    .limit(100)
    .all();

if (userRole === ROLES.ADMIN) {
  return documents.map((document) =>
    toPublicDocument(document, {
      canView: true,
      canDownload: true,
    })
  );
}

const activeDocuments =
  documents.filter(
    (document) => document.isActive
  );

  const permissions =
    await db.orm.public.DocumentPermission
      .where({ userId })
      .all();

  const permissionsByDocument =
    new Map();

  for (const permission of permissions) {
    permissionsByDocument.set(
      permission.documentId,
      permission
    );
  }

  const visibleDocuments =
    activeDocuments.filter((document) => {
      const permission =
        permissionsByDocument.get(
          document.id
        );

      return Boolean(permission?.canView);
    });

  return visibleDocuments.map(
    (document) => {
      const permission =
        permissionsByDocument.get(
          document.id
        );

      return toPublicDocument(
        document,
        {
          canView:
            permission.canView,
          canDownload:
            permission.canDownload,
        }
      );
    }
  );
}

export async function deactivateDocument({
  documentId,
  actorUserId,
  ipAddress = null,
  userAgent = null,
}) {
  const result =
    await db.transaction(
      async (tx) => {
        const existingDocument =
          await tx.orm.public.Document
            .where({
              id: documentId,
            })
            .first();

        if (!existingDocument) {
          throw new AppError(
            'Documento no encontrado.',
            404
          );
        }

        if (!existingDocument.isActive) {
          throw new AppError(
            'El documento ya está inactivo.',
            400
          );
        }

        const updatedDocument =
          await tx.orm.public.Document
            .where({
              id: documentId,
            })
            .update({
              isActive: false,
            });

        await createAuditLog(
          {
            userId: actorUserId,
            action:
              AUDIT_ACTIONS.DOCUMENT_DEACTIVATED,
            resourceType: 'DOCUMENT',
            resourceId: documentId,
            ipAddress,
            userAgent,
            metadata: {
              documentId,
              name:
                existingDocument.name,
            },
          },
          tx
        );

        return updatedDocument;
      }
    );

  return result;
}

export async function activateDocument({
  documentId,
  actorUserId,
  ipAddress = null,
  userAgent = null,
}) {
  const result =
    await db.transaction(
      async (tx) => {
        const existingDocument =
          await tx.orm.public.Document
            .where({
              id: documentId,
            })
            .first();

        if (!existingDocument) {
          throw new AppError(
            'Documento no encontrado.',
            404
          );
        }

        if (existingDocument.isActive) {
          throw new AppError(
            'El documento ya está activo.',
            400
          );
        }

        const updatedDocument =
          await tx.orm.public.Document
            .where({
              id: documentId,
            })
            .update({
              isActive: true,
            });

        await createAuditLog(
          {
            userId: actorUserId,
            action:
              AUDIT_ACTIONS.DOCUMENT_ACTIVATED,
            resourceType: 'DOCUMENT',
            resourceId: documentId,
            ipAddress,
            userAgent,
            metadata: {
              documentId,
              name:
                existingDocument.name,
            },
          },
          tx
        );

        return updatedDocument;
      }
    );

  return result;
}