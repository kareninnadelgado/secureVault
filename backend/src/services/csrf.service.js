import crypto from 'node:crypto';

function getCsrfSecret() {
  const secret = process.env.CSRF_SECRET;

  if (!secret) {
    throw new Error('CSRF_SECRET is not configured');
  }

  return secret;
}

export function createCsrfToken(refreshToken) {
  return crypto
    .createHmac('sha256', getCsrfSecret())
    .update(refreshToken)
    .digest('base64url');
}

export function verifyCsrfToken(refreshToken, providedToken) {
  if (!refreshToken || !providedToken) {
    return false;
  }

  const expectedToken = createCsrfToken(refreshToken);

  const expectedBuffer = Buffer.from(expectedToken);
  const providedBuffer = Buffer.from(providedToken);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    providedBuffer
  );
}