import { authenticateUser } from '../services/auth.service.js';
import {
  createAccessToken,
  createRefreshToken,
  rotateRefreshToken,
} from '../services/token.service.js';

import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromRequest,
  getCsrfTokenFromRequest,
} from '../utils/authCookies.js';

import {
  createAuditLog,
} from '../services/audit.service.js';

import {
  AUDIT_ACTIONS,
} from '../utils/auditActions.js';

import {
  getRequestInfo,
} from '../utils/requestInfo.js';

import { db } from '../prisma/db.ts';

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const { ipAddress, userAgent } = getRequestInfo(req);

    const user = await authenticateUser({
      username,
      password,
      ipAddress,
      userAgent,
    });

    const accessToken = await createAccessToken(user.id);

    const refreshToken = await createRefreshToken({
      userId: user.id,
      ipAddress,
    });

    setAuthCookies(res, {
      accessToken,
      refreshToken,
    });

    await createAuditLog({
      userId: user.id,
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      ipAddress,
      userAgent,
      metadata: {
        role: user.role,
      },
    });

    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const rawToken = getRefreshTokenFromRequest(req);

    if (!rawToken) {
      clearAuthCookies(res);

      return res.status(401).json({
        error: 'Invalid session',
      });
    }

    const { ipAddress, userAgent } = getRequestInfo(req);

    let rotation;

    try {
      rotation = await rotateRefreshToken({
        rawToken,
        ipAddress,
      });
    } catch (error) {
      if (error.message === 'REFRESH_TOKEN_REUSE') {
        await createAuditLog({
          action: AUDIT_ACTIONS.REFRESH_TOKEN_REUSE,
          ipAddress,
          userAgent,
          metadata: {
            reason: 'revoked_refresh_token_reused',
          },
        });
      }

      clearAuthCookies(res);

      return res.status(401).json({
        error: 'Invalid session',
      });
    }

    const user = await db.orm.public.User
      .where({ id: rotation.userId })
      .include('role')
      .first();

    if (!user || !user.isActive) {
      clearAuthCookies(res);

      return res.status(401).json({
        error: 'Invalid session',
      });
    }

    const accessToken = await createAccessToken(user.id);

    setAuthCookies(res, {
      accessToken,
      refreshToken: rotation.refreshToken,
    });

    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const rawToken = getRefreshTokenFromRequest(req);
    const { ipAddress, userAgent } = getRequestInfo(req);

    if (rawToken) {
      const { hashStoredRefreshToken } = await import(
        '../services/token.service.js'
      );

      const tokenHash = hashStoredRefreshToken(rawToken);

      const storedToken = await db.orm.public.RefreshToken
        .where({ tokenHash })
        .first();

      if (storedToken && !storedToken.revokedAt) {
        await db.orm.public.RefreshToken
          .where({ id: storedToken.id })
          .update({
            revokedAt: new Date().toISOString(),
          });

        await createAuditLog({
          userId: storedToken.userId,
          action: AUDIT_ACTIONS.LOGOUT,
          ipAddress,
          userAgent,
        });
      }
    }

    clearAuthCookies(res);

    res.setHeader('Cache-Control', 'no-store');

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  return res.status(200).json({
    user: req.user,
  });
}

export async function csrfToken(req, res) {
  const csrfToken = req.headers.cookie
    ? getCsrfTokenFromRequest(req)
    : null;

  if (!csrfToken) {
    return res.status(403).json({
      error: 'CSRF token unavailable',
    });
  }

  res.setHeader('Cache-Control', 'no-store');

  return res.status(200).json({
    csrfToken,
  });
}