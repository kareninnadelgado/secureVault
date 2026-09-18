import { Router } from 'express';

import {
  csrfToken,
  login,
  refresh,
  logout,
  me,
} from '../controllers/auth.controller.js';

import { authenticate } from '../middleware/authenticate.middleware.js';

import { validate } from '../middleware/validate.middleware.js';

import { loginSchema } from '../validators/auth.validator.js';

import { authRateLimiter } from '../middleware/rateLimit.middleware.js';

import { verifyOrigin } from '../middleware/origin.middleware.js';

import { csrfProtection } from '../middleware/csrf.middleware.js';

const router = Router();

router.post(
  '/login',
  verifyOrigin,
  authRateLimiter,
  validate(loginSchema),
  login
);

router.post(
  '/refresh',
  verifyOrigin,
  authRateLimiter,
  csrfProtection,
  refresh
);

router.post(
  '/logout',
  verifyOrigin,
  csrfProtection,
  logout
);

router.get(
  '/me',
  authenticate,
  me
);

router.get(
  '/csrf',
  authenticate,
  csrfToken
);


export default router;