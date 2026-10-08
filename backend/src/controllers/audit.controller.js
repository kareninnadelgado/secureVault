import {
  listAuditLogs as listAuditLogsService,
  getAuditLogById as getAuditLogByIdService,
} from '../services/auditQuery.service.js';

export async function listAuditLogs(req, res, next) {
  try {
    const result = await listAuditLogsService(
      res.locals.validatedQuery
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAuditLog(req, res, next) {
  try {
    const result = await getAuditLogByIdService(
      req.params.id
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}