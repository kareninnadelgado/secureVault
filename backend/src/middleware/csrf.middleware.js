import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
} from '../utils/security.constants.js';

import { verifyCsrfToken } from '../services/csrf.service.js';
import AppError from '../utils/AppError.js';

function getCookie(req, cookieName) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=');

    if (name === cookieName) {
      return valueParts.join('=') || null;
    }
  }

  return null;
}

export function csrfProtection(req, _res, next) {
  const accessToken = getCookie(req, ACCESS_TOKEN_COOKIE);
  const csrfCookie = getCookie(req, CSRF_TOKEN_COOKIE);
  const csrfHeader = req.get('X-CSRF-Token');

  if (
    !accessToken ||
    !csrfCookie ||
    !csrfHeader ||
    csrfCookie !== csrfHeader ||
    !verifyCsrfToken(accessToken, csrfHeader)
  ) {
    return next(new AppError('CSRF validation failed', 403));
  }

  next();
}