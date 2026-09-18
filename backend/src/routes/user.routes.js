import { Router } from 'express';

import { listUsers } from '../controllers/user.controller.js';

import { authenticate } from '../middleware/authenticate.middleware.js';

import { authorize } from '../middleware/authorize.middleware.js';

import { PERMISSIONS } from '../utils/permissions.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(PERMISSIONS.USER_READ),
  listUsers
);

export default router;