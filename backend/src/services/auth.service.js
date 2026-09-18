import { db } from '../prisma/db.ts';
import { comparePassword } from './password.service.js';
import { createAuditLog } from './audit.service.js';
import { AUDIT_ACTIONS } from '../utils/auditActions.js';
import AppError from '../utils/AppError.js';

export async function authenticateUser({
  username,
  password,
  ipAddress = null,
  userAgent = null,
}) {
  const user = await db.orm.public.User
    .where({ username })
    .include('role')
    .first();

  if (!user) {
    await createAuditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      ipAddress,
      userAgent,
      metadata: {
        username,
        reason: 'invalid_credentials',
      },
    });

    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    await createAuditLog({
      userId: user.id,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      ipAddress,
      userAgent,
      metadata: {
        reason: 'inactive_user',
      },
    });

    throw new AppError('Invalid credentials', 401);
  }

  const passwordValid = await comparePassword(
    password,
    user.passwordHash
  );

  if (!passwordValid) {
    await createAuditLog({
      userId: user.id,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      ipAddress,
      userAgent,
      metadata: {
        reason: 'invalid_credentials',
      },
    });

    throw new AppError('Invalid credentials', 401);
  }

  await db.orm.public.User
    .where({ id: user.id })
    .update({
      lastLoginAt: new Date().toISOString(),
    });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
  };
}