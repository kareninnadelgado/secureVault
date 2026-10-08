import { db } from '../prisma/db.ts';

import { AUDIT_ACTIONS } from '../utils/auditActions.js';
import { documentArchiveQueue } from '../queues/documentArchive.queue.js';
import { listAuditLogs } from './auditQuery.service.js';

function getPeriodStart(period) {
  const now = Date.now();

  const durations = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  return new Date(now - durations[period]);
}

async function getUserMetrics() {
  const [total, active, inactive] = await Promise.all([
    db.orm.public.User.aggregate((agg) => ({
      total: agg.count(),
    })),

    db.orm.public.User
      .where({ isActive: true })
      .aggregate((agg) => ({
        total: agg.count(),
      })),

    db.orm.public.User
      .where({ isActive: false })
      .aggregate((agg) => ({
        total: agg.count(),
      })),
  ]);

  return {
    total: total.total,
    active: active.total,
    inactive: inactive.total,
  };
}

async function getDocumentMetrics() {
  const [total, active, inactive] = await Promise.all([
    db.orm.public.Document.aggregate((agg) => ({
      total: agg.count(),
    })),

    db.orm.public.Document
      .where({ isActive: true })
      .aggregate((agg) => ({
        total: agg.count(),
      })),

    db.orm.public.Document
      .where({ isActive: false })
      .aggregate((agg) => ({
        total: agg.count(),
      })),
  ]);

  return {
    total: total.total,
    active: active.total,
    inactive: inactive.total,
  };
}

async function countAuditEvents(action, since) {
  return db.orm.public.AuditLog
    .where({ action })
    .where((log) => log.createdAt.gte(since))
    .aggregate((agg) => ({
      total: agg.count(),
    }));
}

async function getSecurityMetrics(since) {
  const [
    loginSuccess,
    loginFailed,
    accessDenied,
    documentViews,
    documentDownloads,
    documentCreated,
    userCreated,
  ] = await Promise.all([
    countAuditEvents(
      AUDIT_ACTIONS.LOGIN_SUCCESS,
      since
    ),

    countAuditEvents(
      AUDIT_ACTIONS.LOGIN_FAILED,
      since
    ),

    countAuditEvents(
      AUDIT_ACTIONS.ACCESS_DENIED,
      since
    ),

    countAuditEvents(
      AUDIT_ACTIONS.DOCUMENT_VIEW,
      since
    ),

    countAuditEvents(
      AUDIT_ACTIONS.DOCUMENT_DOWNLOAD,
      since
    ),

    countAuditEvents(
      AUDIT_ACTIONS.DOCUMENT_CREATED,
      since
    ),

    countAuditEvents(
      AUDIT_ACTIONS.USER_CREATED,
      since
    ),
  ]);

  return {
    loginSuccess: loginSuccess.total,
    loginFailed: loginFailed.total,
    accessDenied: accessDenied.total,
    documentViews: documentViews.total,
    documentDownloads: documentDownloads.total,
    documentCreated: documentCreated.total,
    userCreated: userCreated.total,
  };
}

async function getRecentActivity(since) {
  const result = await listAuditLogs({
    page: 1,
    limit: 10,
    from: since.toISOString(),
  });

  return result.logs;
}

async function getBackgroundJobMetrics() {
  try {
    const counts =
      await documentArchiveQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed'
      );

    return {
      status: 'available',
      queued:
        (counts.waiting || 0) +
        (counts.delayed || 0),
      processing: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  } catch (error) {
    console.error(
      'Failed to read document job metrics:',
      error
    );

    return {
      status: 'unavailable',
      queued: null,
      processing: null,
      completed: null,
      failed: null,
      delayed: null,
    };
  }
}

export async function getDashboardSummary({
  period = '24h',
}) {
  const since = getPeriodStart(period);

  const [
    users,
    documents,
    security,
    recentActivity,
    backgroundJobs,
  ] = await Promise.all([
    getUserMetrics(),
    getDocumentMetrics(),
    getSecurityMetrics(since),
    getRecentActivity(since),
    getBackgroundJobMetrics(),
  ]);

  return {
    period,
    generatedAt: new Date().toISOString(),

    users,
    documents,
    security,

    backgroundJobs,

    recentActivity,
  };
}