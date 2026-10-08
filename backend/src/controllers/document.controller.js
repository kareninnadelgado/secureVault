import { extname } from 'node:path';

import {
  createDocument as createDocumentService,
  getDocumentById as getDocumentByIdService,
  getAllDocuments as getAllDocumentsService,
  deactivateDocument as deactivateDocumentService,
  activateDocument as activateDocumentService,
} from '../services/document.service.js';

import {
  listDocumentPermissions as listDocumentPermissionsService,
  setDocumentPermission as setDocumentPermissionService,
  revokeDocumentPermission as revokeDocumentPermissionService,
} from '../services/documentPermission.service.js';

import {
  prepareDocumentView,
  prepareDocumentDownload,
} from '../services/documentFile.service.js';

import { getRequestInfo } from '../utils/requestInfo.js';

import { createReadStream } from 'node:fs';

export async function listDocumentPermissions(req, res, next) {
  try {
    const permissions = await listDocumentPermissionsService(
      req.params.id
    );

    return res.status(200).json({
      permissions,
    });
  } catch (error) {
    next(error);
  }
}

export async function setDocumentPermission(req, res, next) {
  try {
    const { ipAddress, userAgent } = getRequestInfo(req);

    const permission = await setDocumentPermissionService({
      documentId: req.params.id,
      targetUserId: req.params.userId,
      canView: req.body.canView,
      canDownload: req.body.canDownload,
      actorUserId: req.user.id,
      ipAddress,
      userAgent,
    });

    return res.status(200).json(permission);
  } catch (error) {
    next(error);
  }
}

export async function revokeDocumentPermission(req, res, next) {
  try {
    const { ipAddress, userAgent } = getRequestInfo(req);

    const result = await revokeDocumentPermissionService({
      documentId: req.params.id,
      targetUserId: req.params.userId,
      actorUserId: req.user.id,
      ipAddress,
      userAgent,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createDocument(req, res, next) {
  try {
    const { ipAddress, userAgent } = getRequestInfo(req);

    const document = await createDocumentService({
      data: req.body,
      file: req.file,
      actorUserId: req.user.id,
      ipAddress,
      userAgent,
    });

    return res.status(201).json(document);
  } catch (error) {
    next(error);
  }
}

export async function listDocuments(req, res, next) {
  try {
    const documents = await getAllDocumentsService({
  userId: req.user.id,
  userRole: req.user.role,
});

    return res.status(200).json({
      documents,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocument(req, res, next) {
  try {
    const document =
      await getDocumentByIdService({
        documentId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
      });

    return res.status(200).json(document);
  } catch (error) {
    next(error);
  }
}

export async function deactivateDocument(
  req,
  res,
  next
) {
  try {
    const {
      ipAddress,
      userAgent,
    } = getRequestInfo(req);

    await deactivateDocumentService({
      documentId: req.params.id,
      actorUserId: req.user.id,
      ipAddress,
      userAgent,
    });

    return res.status(200).json({
      message:
        'Documento desactivado correctamente.',
    });
  } catch (error) {
    next(error);
  }
}

export async function activateDocument(
  req,
  res,
  next
) {
  try {
    const {
      ipAddress,
      userAgent,
    } = getRequestInfo(req);

    await activateDocumentService({
      documentId: req.params.id,
      actorUserId: req.user.id,
      ipAddress,
      userAgent,
    });

    return res.status(200).json({
      message:
        'Documento activado correctamente.',
    });
  } catch (error) {
    next(error);
  }
}

function getSafeDownloadFilename(
  document,
  absolutePath
) {
  let name =
    document.name?.trim() ||
    'documento';

  name = name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\r\n]/g, '');

  const extension =
    extname(absolutePath).toLowerCase();

  if (
    extension &&
    !name.toLowerCase().endsWith(extension)
  ) {
    name = `${name}${extension}`;
  }

  return name;
}

export async function viewDocument(req, res, next) {
  try {
    const { ipAddress, userAgent } = getRequestInfo(req);

    const { document, absolutePath } = await prepareDocumentView({
      documentId: req.params.id,
      userId: req.user.id,
      userRole: req.user.role,
      ipAddress,
      userAgent,
    });

    res.setHeader(
      'Content-Type', 
      document.mimeType
    );

    res.setHeader(
      'Content-Length',
      String(document.fileSize)
    );
    
    const filename =
  getSafeDownloadFilename(
    document,
    absolutePath
  );

res.setHeader(
  'Content-Disposition',
  `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
);

    const stream = createReadStream(absolutePath);

    stream.on('error', next);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function downloadDocument(req, res, next) {
  try {
    const { ipAddress, userAgent } = getRequestInfo(req);

    const { document, absolutePath } =
      await prepareDocumentDownload({
        documentId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        ipAddress,
        userAgent,
      });

res.setHeader(
  'Content-Type',
  document.mimeType
);
    res.setHeader(
      'Content-Length',
      String(document.fileSize)
    );
    const filename =
  getSafeDownloadFilename(
    document,
    absolutePath
  );

res.setHeader(
  'Content-Disposition',
  `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
);

    const stream = createReadStream(absolutePath);

    stream.on('error', next);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}