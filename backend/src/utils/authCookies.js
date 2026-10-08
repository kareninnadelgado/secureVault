import { stringifySetCookie } from 'cookie';

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
} from './security.constants.js';

import { createCsrfToken } from '../services/csrf.service.js';

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

function getCookieFromRequest(req, cookieName) {
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

export function getCsrfTokenFromRequest(req) {
  return getCookieFromRequest(req, CSRF_TOKEN_COOKIE);
}

export function getRefreshTokenFromRequest(req) {
  return getCookieFromRequest(req, REFRESH_TOKEN_COOKIE);
}

function createCsrfCookie(accessToken) {
  return stringifySetCookie({
    name: CSRF_TOKEN_COOKIE,
    value: createCsrfToken(accessToken),
    httpOnly: false,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

function clearLegacyCsrfCookie() {
  return stringifySetCookie({
    name: CSRF_TOKEN_COOKIE,
    value: '',
    httpOnly: false,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/api',
    maxAge: 0,
  });
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
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

  const csrfCookie = createCsrfCookie(accessToken);

  res.setHeader('Set-Cookie', [
    clearLegacyCsrfCookie(),
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
      path: '/',
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