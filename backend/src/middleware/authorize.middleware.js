import { db } from '../prisma/db.ts';

import { createAuditLog } from '../services/audit.service.js';

import { AUDIT_ACTIONS } from '../utils/auditActions.js';

import { getRequestInfo } from '../utils/requestInfo.js';

import AppError from '../utils/AppError.js';

export function authorize(...requiredPermissions) {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        return next(
          new AppError('Authentication required', 401)
        );
      }

      if (requiredPermissions.length === 0) {
        return next();
      }

      const role = await db.orm.public.Role
        .where({ name: req.user.role })
        .first();

      if (!role) {
        return next(
          new AppError('Access denied', 403)
        );
      }

      const rolePermissions =
        await db.orm.public.RolePermission
          .where({ roleId: role.id })
          .include('permission')
          .all();

      const grantedPermissions = new Set(
        rolePermissions.map(
          (item) => item.permission.name
        )
      );

      const hasAllPermissions =
        requiredPermissions.every(
          (permission) =>
            grantedPermissions.has(permission)
        );

      if (!hasAllPermissions) {
        const { ipAddress, userAgent } =
          getRequestInfo(req);

        await createAuditLog({
          userId: req.user.id,
          action: AUDIT_ACTIONS.ACCESS_DENIED,
          ipAddress,
          userAgent,
          metadata: {
            requiredPermissions,
            role: req.user.role,
            resource: req.originalUrl,
            method: req.method,
          },
        });

        return next(
          new AppError('Access denied', 403)
        );
      }

      req.permissions = [...grantedPermissions];

      next();
    } catch (error) {
      next(error);
    }
  };
}