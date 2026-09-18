import { db } from '../prisma/db.ts';

export async function createAuditLog({
  userId = null,
  action,
  resourceType = null,
  resourceId = null,
  ipAddress = null,
  userAgent = null,
  metadata = null,
}) {
  return db.orm.public.AuditLog.create({
    userId,
    action,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}