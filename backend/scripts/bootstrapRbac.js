import 'dotenv/config';

import { db } from '../src/prisma/db.ts';
import { ROLES } from '../src/utils/roles.js';
import { PERMISSIONS } from '../src/utils/permissions.js';

const permissionDefinitions = [
  {
    name: PERMISSIONS.USER_CREATE,
    description: 'Create users',
  },
  {
    name: PERMISSIONS.USER_READ,
    description: 'View users',
  },
  {
    name: PERMISSIONS.USER_UPDATE,
    description: 'Update users',
  },
  {
    name: PERMISSIONS.USER_DEACTIVATE,
    description: 'Deactivate users',
  },
  {
    name: PERMISSIONS.ROLE_ASSIGN,
    description: 'Assign roles to users',
  },
  {
    name: PERMISSIONS.DOCUMENT_CREATE,
    description: 'Upload documents',
  },
  {
    name: PERMISSIONS.DOCUMENT_VIEW,
    description: 'View permitted documents',
  },
  {
    name: PERMISSIONS.DOCUMENT_DOWNLOAD,
    description: 'Download permitted documents',
  },
  {
    name: PERMISSIONS.DOCUMENT_UPDATE,
    description: 'Update document information',
  },
  {
    name: PERMISSIONS.DOCUMENT_DEACTIVATE,
    description: 'Deactivate documents',
  },
  {
    name: PERMISSIONS.DOCUMENT_ACCESS_MANAGE,
    description: 'Manage document access',
  },
  {
    name: PERMISSIONS.AUDIT_READ,
    description: 'View audit logs',
  },
  {
    name: PERMISSIONS.DASHBOARD_READ,
    description: 'View security dashboard',
  },
];

const adminPermissions = permissionDefinitions.map(
  (permission) => permission.name
);

const employeePermissions = [
  PERMISSIONS.DOCUMENT_CREATE,
  PERMISSIONS.DOCUMENT_VIEW,
  PERMISSIONS.DOCUMENT_DOWNLOAD,
];

async function getOrCreateRole(tx, name, description) {
  let role = await tx.orm.public.Role
    .where({ name })
    .first();

  if (!role) {
    role = await tx.orm.public.Role.create({
      name,
      description,
    });
  }

  return role;
}

async function getOrCreatePermission(tx, definition) {
  let permission = await tx.orm.public.Permission
    .where({ name: definition.name })
    .first();

  if (!permission) {
    permission = await tx.orm.public.Permission.create({
      name: definition.name,
      description: definition.description,
    });
  }

  return permission;
}

async function ensureRolePermission(
  tx,
  roleId,
  permissionId
) {
  const existing = await tx.orm.public.RolePermission
    .where({
      roleId,
      permissionId,
    })
    .first();

  if (!existing) {
    await tx.orm.public.RolePermission.create({
      roleId,
      permissionId,
    });
  }
}

async function bootstrapRbac() {
  try {
    await db.transaction(async (tx) => {
      const adminRole = await getOrCreateRole(
        tx,
        ROLES.ADMIN,
        'System administrator'
      );

      const employeeRole = await getOrCreateRole(
        tx,
        ROLES.EMPLOYEE,
        'Document management employee'
      );

      const permissions = new Map();

      for (const definition of permissionDefinitions) {
        const permission = await getOrCreatePermission(
          tx,
          definition
        );

        permissions.set(
          permission.name,
          permission.id
        );
      }

      for (const permissionName of adminPermissions) {
        await ensureRolePermission(
          tx,
          adminRole.id,
          permissions.get(permissionName)
        );
      }

      for (const permissionName of employeePermissions) {
        await ensureRolePermission(
          tx,
          employeeRole.id,
          permissions.get(permissionName)
        );
      }
    });

    console.log('\nRBAC bootstrap completed successfully.');
  } catch (error) {
    console.error(
      '\nRBAC bootstrap failed:',
      error.message
    );

    process.exitCode = 1;
  }
}

await bootstrapRbac();