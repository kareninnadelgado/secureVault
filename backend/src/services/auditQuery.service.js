import { db } from '../prisma/db.ts';
import AppError from '../utils/AppError.js';

function parseMetadata(metadata) {
  if (!metadata) {
    return null;
  }

  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

function toPublicAuditLog(log) {
  return {
    id: log.id,
    user: log.user
      ? {
          id: log.user.id,
          username: log.user.username,
          firstName: log.user.firstName,
          lastName: log.user.lastName,
        }
      : null,

    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    metadata: parseMetadata(log.metadata),
    createdAt: log.createdAt,
  };
}

function applyAuditFilters(query, filters) {
  let result = query;

  if (filters.action) {
    result = result.where({
      action: filters.action,
    });
  }

  if (filters.userId) {
    result = result.where({
      userId: filters.userId,
    });
  }

  if (filters.resourceType) {
    result = result.where({
      resourceType: filters.resourceType,
    });
  }

  if (filters.resourceId) {
    result = result.where({
      resourceId: filters.resourceId,
    });
  }

  if (filters.from) {
    result = result.where(
      (audit) => audit.createdAt.gte(filters.from)
    );
  }

  if (filters.to) {
    result = result.where(
      (audit) => audit.createdAt.lte(filters.to)
    );
  }

  return result;
}

export async function listAuditLogs({
  page = 1,
  limit = 20,
  action,
  userId,
  resourceType,
  resourceId,
  from,
  to,
}) {
  const offset = (page - 1) * limit;

  let query = db.orm.public.AuditLog
    .include('user');

  query = applyAuditFilters(query, {
    action,
    userId,
    resourceType,
    resourceId,
    from,
    to,
  });

  const logs = await query
    .orderBy((audit) => audit.createdAt.desc())
    .limit(limit + 1)
    .offset(offset)
    .all();

  const hasNextPage = logs.length > limit;

  const visibleLogs = hasNextPage
    ? logs.slice(0, limit)
    : logs;

  return {
    logs: visibleLogs.map(toPublicAuditLog),
    page,
    limit,
    hasNextPage,
  };
}

export async function getAuditLogById(auditId) {
  const auditLog = await db.orm.public.AuditLog
    .where({ id: auditId })
    .include('user')
    .first();

  if (!auditLog) {
    throw new AppError('Audit log not found', 404);
  }

  return toPublicAuditLog(auditLog);
}