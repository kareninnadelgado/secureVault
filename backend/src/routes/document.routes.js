import { Router } from 'express';

import {
  createDocument,
  listDocuments,
  getDocument,
  listDocumentPermissions,
  setDocumentPermission,
  revokeDocumentPermission,
  viewDocument,
  downloadDocument,
  deactivateDocument,
  activateDocument,
} from '../controllers/document.controller.js';

import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { verifyOrigin } from '../middleware/origin.middleware.js';
import { csrfProtection } from '../middleware/csrf.middleware.js';
import {
  validate,
  validateParams,
} from '../middleware/validate.middleware.js';

import { uploadDocument } from '../middleware/upload.middleware.js';

import {
  createDocumentSchema,
  documentIdParamsSchema,
} from '../validators/document.validator.js';

import {
  documentAndUserParamsSchema,
  documentPermissionSchema,
} from '../validators/documentPermission.validator.js';

import { PERMISSIONS } from '../utils/permissions.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(PERMISSIONS.DOCUMENT_VIEW),
  listDocuments
);
router.get(
  '/:id/permissions',
  authenticate,
  authorize(PERMISSIONS.DOCUMENT_ACCESS_MANAGE),
  validateParams(documentIdParamsSchema),
  listDocumentPermissions
);

router.put(
  '/:id/permissions/:userId',
  authenticate,
  authorize(PERMISSIONS.DOCUMENT_ACCESS_MANAGE),
  verifyOrigin,
  csrfProtection,
  validateParams(documentAndUserParamsSchema),
  validate(documentPermissionSchema),
  setDocumentPermission
);

router.delete(
  '/:id/permissions/:userId',
  authenticate,
  authorize(PERMISSIONS.DOCUMENT_ACCESS_MANAGE),
  verifyOrigin,
  csrfProtection,
  validateParams(documentAndUserParamsSchema),
  revokeDocumentPermission
);

router.get(
  '/:id/view',
  authenticate,
  authorize(PERMISSIONS.DOCUMENT_VIEW),
  validateParams(documentIdParamsSchema),
  viewDocument
);

router.get(
  '/:id/download',
  authenticate,
  authorize(PERMISSIONS.DOCUMENT_DOWNLOAD),
  validateParams(documentIdParamsSchema),
  downloadDocument
);

router.patch(
  '/:id/deactivate',
  authenticate,
  authorize(
    PERMISSIONS.DOCUMENT_DEACTIVATE
  ),
  verifyOrigin,
  csrfProtection,
  validateParams(documentIdParamsSchema),
  deactivateDocument
);

router.patch(
  '/:id/activate',
  authenticate,
  authorize(
    PERMISSIONS.DOCUMENT_DEACTIVATE
  ),
  verifyOrigin,
  csrfProtection,
  validateParams(documentIdParamsSchema),
  activateDocument
);

router.get(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.DOCUMENT_VIEW),
  validateParams(documentIdParamsSchema),
  getDocument
);

router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.DOCUMENT_CREATE),
  verifyOrigin,
  csrfProtection,
  uploadDocument.single('file'),
  validate(createDocumentSchema),
  createDocument
);

export default router;