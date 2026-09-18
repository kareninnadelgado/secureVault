import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

import { db } from '../prisma/db.ts';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN_MS,
} from '../utils/security.constants.js';

function getJwtSecret() {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error('ACCESS_TOKEN_SECRET is not configured');
  }

  return new TextEncoder().encode(secret);
}

function getJwtIssuer() {
  return process.env.JWT_ISSUER || 'securevault-api';
}

function getJwtAudience() {
  return process.env.JWT_AUDIENCE || 'securevault-client';
}

export async function createAccessToken(userId) {
  return new SignJWT({
    tokenType: 'access',
  })
    .setProtectedHeader({
      alg: 'HS256',
      typ: 'JWT',
    })
    .setSubject(String(userId))
    .setIssuer(getJwtIssuer())
    .setAudience(getJwtAudience())
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(
    token,
    getJwtSecret(),
    {
      algorithms: ['HS256'],
      issuer: getJwtIssuer(),
      audience: getJwtAudience(),
    }
  );

  if (
    payload.tokenType !== 'access' ||
    typeof payload.sub !== 'string'
  ) {
    throw new Error('Invalid access token');
  }

  return payload;
}

function hashRefreshToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

export async function rotateRefreshToken({
  rawToken,
  ipAddress = null,
}) {
  const tokenHash = hashRefreshToken(rawToken);

  const storedToken = await db.orm.public.RefreshToken
    .where({ tokenHash })
    .first();

  if (!storedToken) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  const now = new Date();

  if (storedToken.revokedAt) {
    await db.orm.public.RefreshToken
      .where({ userId: storedToken.userId })
      .updateAll({
        revokedAt: now.toISOString(),
      });

    throw new Error('REFRESH_TOKEN_REUSE');
  }

  if (new Date(storedToken.expiresAt) <= now) {
    await db.orm.public.RefreshToken
      .where({ id: storedToken.id })
      .update({
        revokedAt: now.toISOString(),
      });

    throw new Error('EXPIRED_REFRESH_TOKEN');
  }

  const newRawToken = crypto.randomBytes(64).toString('base64url');

  const newTokenHash = hashRefreshToken(newRawToken);

  const newExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS
  ).toISOString();

  await db.transaction(async (tx) => {
    await tx.orm.public.RefreshToken
      .where({ id: storedToken.id })
      .update({
        revokedAt: now.toISOString(),
      });

    await tx.orm.public.RefreshToken.create({
      userId: storedToken.userId,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
      ipAddress,
    });
  });

  return {
    userId: storedToken.userId,
    refreshToken: newRawToken,
  };
}

export async function createRefreshToken({
  userId,
  ipAddress = null,
}) {
  const rawToken = crypto.randomBytes(64).toString('base64url');

  const tokenHash = hashRefreshToken(rawToken);

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS
  ).toISOString();

  await db.orm.public.RefreshToken.create({
    userId,
    tokenHash,
    expiresAt,
    ipAddress,
  });

  return rawToken;
}

export function hashStoredRefreshToken(token) {
  return hashRefreshToken(token);
}