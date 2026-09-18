import AppError from '../utils/AppError.js';

import {
  getRefreshTokenFromRequest,
  getCsrfTokenFromRequest,
} from '../utils/authCookies.js';

import {
  verifyCsrfToken,
} from '../services/csrf.service.js';

export function csrfProtection(req, _res, next) {
  const refreshToken = getRefreshTokenFromRequest(req);
  const cookieToken = getCsrfTokenFromRequest(req);
  const headerToken = req.get('X-CSRF-Token');

  if (!refreshToken || !cookieToken || !headerToken) {
    return next(
      new AppError('CSRF validation failed', 403)
    );
  }

  if (cookieToken !== headerToken) {
    return next(
      new AppError('CSRF validation failed', 403)
    );
  }

  const valid = verifyCsrfToken(
    refreshToken,
    headerToken
  );

  if (!valid) {
    return next(
      new AppError('CSRF validation failed', 403)
    );
  }

  next();
}