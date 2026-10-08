import { Router } from 'express';

import {
  listAuditLogs,
  getAuditLog,
} from '../controllers/audit.controller.js';

import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';

import {
  validateParams,
  validateQuery,
} from '../middleware/validate.middleware.js';

import {
  auditQuerySchema,
  auditIdParamsSchema,
} from '../validators/audit.validator.js';

import { PERMISSIONS } from '../utils/permissions.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(PERMISSIONS.AUDIT_READ),
  validateQuery(auditQuerySchema),
  listAuditLogs
);

router.get(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.AUDIT_READ),
  validateParams(auditIdParamsSchema),
  getAuditLog
);

export default router;