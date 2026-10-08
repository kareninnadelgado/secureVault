import { Router } from 'express';

import {
  listUsers,
  getUser,
  createUser,
  updateExistingUser,
  deactivateExistingUser,
  activateExistingUser,
  assignRole,
} from '../controllers/user.controller.js';

import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';

import {
  validate,
  validateParams,
  validateQuery,
} from '../middleware/validate.middleware.js';

import {
  createUserSchema,
  updateUserSchema,
  userIdParamsSchema,
  roleAssignmentSchema,
  usersQuerySchema,
} from '../validators/user.validator.js';

import { PERMISSIONS } from '../utils/permissions.js';

import { verifyOrigin } from '../middleware/origin.middleware.js';
import { csrfProtection } from '../middleware/csrf.middleware.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(PERMISSIONS.USER_READ),
  validateQuery(usersQuerySchema),
  listUsers
);

router.get(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.USER_READ),
  validateParams(userIdParamsSchema),
  getUser
);

router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.USER_CREATE),
  verifyOrigin,
  csrfProtection,
  validate(createUserSchema),
  createUser
);

router.patch(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.USER_UPDATE),
  verifyOrigin,
  csrfProtection,
  validateParams(userIdParamsSchema),
  validate(updateUserSchema),
  updateExistingUser
);

router.patch(
  '/:id/deactivate',
  authenticate,
  authorize(PERMISSIONS.USER_DEACTIVATE),
  verifyOrigin,
  csrfProtection,
  validateParams(userIdParamsSchema),
  deactivateExistingUser
);

router.patch(
  '/:id/activate',
  authenticate,
  authorize(PERMISSIONS.USER_DEACTIVATE),
  verifyOrigin,
  csrfProtection,
  validateParams(userIdParamsSchema),
  activateExistingUser
);

router.patch(
  '/:id/role',
  authenticate,
  authorize(PERMISSIONS.ROLE_ASSIGN),
  verifyOrigin,
  csrfProtection,
  validateParams(userIdParamsSchema),
  validate(roleAssignmentSchema),
  assignRole
);

export default router;