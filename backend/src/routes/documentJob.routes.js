import { Router } from 'express';

import {
  createArchiveJob,
  getJobStatus,
  downloadCompletedJob,
} from '../controllers/documentJob.controller.js';

import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { verifyOrigin } from '../middleware/origin.middleware.js';
import { csrfProtection } from '../middleware/csrf.middleware.js';

import {
  validate,
  validateParams,
} from '../middleware/validate.middleware.js';

import {
  createArchiveJobSchema,
  jobIdParamsSchema,
} from '../validators/documentJob.validator.js';

import { PERMISSIONS } from '../utils/permissions.js';

const router = Router();

router.post(
  '/archive',
  authenticate,
  authorize(PERMISSIONS.DOCUMENT_DOWNLOAD),
  verifyOrigin,
  csrfProtection,
  validate(createArchiveJobSchema),
  createArchiveJob
);

router.get(
  '/:id',
  authenticate,
  validateParams(jobIdParamsSchema),
  getJobStatus
);

router.get(
  '/:id/download',
  authenticate,
  authorize(PERMISSIONS.DOCUMENT_DOWNLOAD),
  validateParams(jobIdParamsSchema),
  downloadCompletedJob
);

export default router;