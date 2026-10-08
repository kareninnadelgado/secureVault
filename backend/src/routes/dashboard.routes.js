import { Router } from 'express';

import {
  getDashboardSummary,
} from '../controllers/dashboard.controller.js';

import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import {
  validateQuery,
} from '../middleware/validate.middleware.js';

import {
  dashboardQuerySchema,
} from '../validators/dashboard.validator.js';

import { PERMISSIONS } from '../utils/permissions.js';

const router = Router();

router.get(
  '/summary',
  authenticate,
  authorize(PERMISSIONS.DASHBOARD_READ),
  validateQuery(dashboardQuerySchema),
  getDashboardSummary
);

export default router;