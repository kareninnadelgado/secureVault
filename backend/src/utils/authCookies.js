import {
  parseCookie,
  stringifySetCookie,
} from 'cookie';

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
} from './security.constants.js';

import {
  createCsrfToken,
} from '../services/csrf.service.js';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
  };
}

export function setAuthCookies(
  res,
  {
    accessToken,
    refreshToken,
  }
) {
  const accessCookie = stringifySetCookie({
    name: ACCESS_TOKEN_COOKIE,
    value: accessToken,
    ...baseCookieOptions(),
    path: '/',
    maxAge: 15 * 60,
  });

  const refreshCookie = stringifySetCookie({
    name: REFRESH_TOKEN_COOKIE,
    value: refreshToken,
    ...baseCookieOptions(),
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60,
  });

  const csrfCookie = stringifySetCookie({
    name: CSRF_TOKEN_COOKIE,
    value: createCsrfToken(refreshToken),
    httpOnly: false,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/api',
    maxAge: 7 * 24 * 60 * 60,
  });

  res.setHeader('Set-Cookie', [
    accessCookie,
    refreshCookie,
    csrfCookie,
  ]);
}

export function clearAuthCookies(res) {
  const common = baseCookieOptions();

  res.setHeader('Set-Cookie', [
    stringifySetCookie({
      name: ACCESS_TOKEN_COOKIE,
      value: '',
      ...common,
      path: '/',
      maxAge: 0,
    }),

    stringifySetCookie({
      name: REFRESH_TOKEN_COOKIE,
      value: '',
      ...common,
      path: '/api/auth',
      maxAge: 0,
    }),

    stringifySetCookie({
      name: CSRF_TOKEN_COOKIE,
      value: '',
      httpOnly: false,
      secure: isProduction(),
      sameSite: 'lax',
      path: '/api',
      maxAge: 0,
    }),
  ]);
}

export function getRefreshTokenFromRequest(req) {
  const cookies = parseCookie(req.headers.cookie || '');

  return cookies[REFRESH_TOKEN_COOKIE] || null;
}

export function getCsrfTokenFromRequest(req) {
  const cookies = parseCookie(req.headers.cookie || '');

  return cookies[CSRF_TOKEN_COOKIE] || null;
}