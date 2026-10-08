import { db } from '../prisma/db.ts';

import { hashPassword } from './password.service.js';
import { createAuditLog } from './audit.service.js';

import { AUDIT_ACTIONS } from '../utils/auditActions.js';
import { ROLES } from '../utils/roles.js';
import AppError from '../utils/AppError.js';

function normalizeName(value) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role?.name || null,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getUsers({
  page = 1,
  limit = 20,
} = {}) {
  const skip = (page - 1) * limit;

  const users = await db.orm.public.User
    .include('role')
    .orderBy((user) => user.createdAt.desc())
    .limit(limit)
    .offset(skip)
    .all();

  return {
    users: users.map(toPublicUser),
    page,
    limit,
    hasNextPage: users.length === limit,
  };
}

export async function getUserById(userId) {
  const user = await db.orm.public.User
    .where({ id: userId })
    .include('role')
    .first();

  if (!user) {
    throw new AppError(
      'Usuario no encontrado.',
      404
    );
  }

  return toPublicUser(user);
}

export async function createUser({
  data,
  actorUserId,
  ipAddress = null,
  userAgent = null,
}) {
  const normalizedUsername =
    normalizeName(data.username);

  const normalizedEmail =
    normalizeEmail(data.email);

  const normalizedFirstName =
    normalizeName(data.firstName);

  const normalizedLastName =
    normalizeName(data.lastName);

  const passwordHash =
    await hashPassword(data.password);

  const result = await db.transaction(
    async (tx) => {
      const existingUsername =
        await tx.orm.public.User
          .where({
            username: normalizedUsername,
          })
          .first();

      if (existingUsername) {
        throw new AppError(
          'El nombre de usuario ya existe.',
          409
        );
      }

      const existingEmail =
        await tx.orm.public.User
          .where({
            email: normalizedEmail,
          })
          .first();

      if (existingEmail) {
        throw new AppError(
          'El correo electrónico ya existe.',
          409
        );
      }

      const existingFullName =
  await tx.orm.public.User
    .where({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
    })
    .first();

if (existingFullName) {
  throw new AppError(
    'Ya existe un usuario con el mismo nombre y apellidos.',
    409
  );
}

      const employeeRole =
        await tx.orm.public.Role
          .where({
            name: ROLES.EMPLOYEE,
          })
          .first();

      if (!employeeRole) {
        throw new AppError(
          'El rol de empleado no está configurado.',
          500
        );
      }

      const user =
        await tx.orm.public.User.create({
          username: normalizedUsername,
          email: normalizedEmail,
          passwordHash,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          roleId: employeeRole.id,
          isActive: true,
        });

      await createAuditLog(
        {
          userId: actorUserId,
          action:
            AUDIT_ACTIONS.USER_CREATED,
          resourceType: 'USER',
          resourceId: user.id,
          ipAddress,
          userAgent,
          metadata: {
            createdUserId: user.id,
            username: user.username,
            role: ROLES.EMPLOYEE,
          },
        },
        tx
      );

      return user;
    }
  );

  return getUserById(result.id);
}

export async function updateUser({
  userId,
  data,
  actorUserId,
  ipAddress = null,
  userAgent = null,
}) {
  const result = await db.transaction(
    async (tx) => {
      const existingUser =
        await tx.orm.public.User
          .where({ id: userId })
          .include('role')
          .first();

      if (!existingUser) {
        throw new AppError(
          'Usuario no encontrado.',
          404
        );
      }

      const normalizedData = {
        ...data,
      };

      if (data.username) {
        normalizedData.username =
          normalizeName(data.username);
      }

      if (data.email) {
        normalizedData.email =
          normalizeEmail(data.email);
      }

      if (data.firstName) {
        normalizedData.firstName =
          normalizeName(data.firstName);
      }

      if (data.lastName) {
        normalizedData.lastName =
          normalizeName(data.lastName);
      }

      if (
        normalizedData.username &&
        normalizedData.username !==
          existingUser.username
      ) {
        const duplicate =
          await tx.orm.public.User
            .where({
              username:
                normalizedData.username,
            })
            .first();

        if (duplicate) {
          throw new AppError(
            'El nombre de usuario ya existe.',
            409
          );
        }
      }

      if (
        normalizedData.email &&
        normalizedData.email !==
          existingUser.email
      ) {
        const duplicate =
          await tx.orm.public.User
            .where({
              email:
                normalizedData.email,
            })
            .first();

        if (duplicate) {
          throw new AppError(
            'El correo electrónico ya existe.',
            409
          );
        }
      }

      if (
  normalizedData.firstName ||
  normalizedData.lastName
) {
  const newFirstName =
    normalizedData.firstName ??
    existingUser.firstName;

  const newLastName =
    normalizedData.lastName ??
    existingUser.lastName;

  const duplicateFullName =
    await tx.orm.public.User
      .where({
        firstName: newFirstName,
        lastName: newLastName,
      })
      .first();

  if (
    duplicateFullName &&
    duplicateFullName.id !== userId
  ) {
    throw new AppError(
      'Ya existe un usuario con el mismo nombre y apellidos.',
      409
    );
  }
}

      const updatedUser =
        await tx.orm.public.User
          .where({ id: userId })
          .update(normalizedData);

      await createAuditLog(
        {
          userId: actorUserId,
          action:
            AUDIT_ACTIONS.USER_UPDATED,
          resourceType: 'USER',
          resourceId: userId,
          ipAddress,
          userAgent,
          metadata: {
            changedFields:
              Object.keys(normalizedData),
          },
        },
        tx
      );

      return updatedUser;
    }
  );

  return getUserById(result.id);
}

export async function deactivateUser({
  userId,
  actorUserId,
  ipAddress = null,
  userAgent = null,
}) {
  const result = await db.transaction(
    async (tx) => {
      const existingUser =
        await tx.orm.public.User
          .where({ id: userId })
          .include('role')
          .first();

      if (!existingUser) {
        throw new AppError(
          'Usuario no encontrado.',
          404
        );
      }

      if (
        existingUser.id === actorUserId
      ) {
        throw new AppError(
          'No puedes desactivar tu propia cuenta.',
          400
        );
      }

      if (!existingUser.isActive) {
        throw new AppError(
          'El usuario ya está inactivo.',
          400
        );
      }

      if (
        existingUser.role.name ===
        ROLES.ADMIN
      ) {
        const adminRole =
          await tx.orm.public.Role
            .where({
              name: ROLES.ADMIN,
            })
            .first();

        const activeAdmins =
          await tx.orm.public.User
            .where({
              roleId: adminRole.id,
              isActive: true,
            })
            .all();

        if (activeAdmins.length <= 1) {
          throw new AppError(
            'No puedes desactivar al último administrador activo.',
            400
          );
        }
      }

      const updatedUser =
        await tx.orm.public.User
          .where({ id: userId })
          .update({
            isActive: false,
          });

      await createAuditLog(
        {
          userId: actorUserId,
          action:
            AUDIT_ACTIONS.USER_DEACTIVATED,
          resourceType: 'USER',
          resourceId: userId,
          ipAddress,
          userAgent,
          metadata: {
            username:
              existingUser.username,
          },
        },
        tx
      );

      return updatedUser;
    }
  );

  return getUserById(result.id);
}

export async function activateUser({
  userId,
  actorUserId,
  ipAddress = null,
  userAgent = null,
}) {
  const result = await db.transaction(
    async (tx) => {
      const existingUser =
        await tx.orm.public.User
          .where({ id: userId })
          .include('role')
          .first();

      if (!existingUser) {
        throw new AppError(
          'Usuario no encontrado.',
          404
        );
      }

      if (existingUser.isActive) {
        throw new AppError(
          'El usuario ya está activo.',
          400
        );
      }

      const updatedUser =
        await tx.orm.public.User
          .where({ id: userId })
          .update({
            isActive: true,
          });

      await createAuditLog(
        {
          userId: actorUserId,
          action:
            AUDIT_ACTIONS.USER_ACTIVATED,
          resourceType: 'USER',
          resourceId: userId,
          ipAddress,
          userAgent,
          metadata: {
            username:
              existingUser.username,
          },
        },
        tx
      );

      return updatedUser;
    }
  );

  return getUserById(result.id);
}

export async function assignUserRole({
  userId,
  roleName,
  actorUserId,
  ipAddress = null,
  userAgent = null,
}) {
  const result = await db.transaction(
    async (tx) => {
      const existingUser =
        await tx.orm.public.User
          .where({ id: userId })
          .include('role')
          .first();

      if (!existingUser) {
        throw new AppError(
          'Usuario no encontrado.',
          404
        );
      }

      const newRole =
        await tx.orm.public.Role
          .where({ name: roleName })
          .first();

      if (!newRole) {
        throw new AppError(
          'Rol no encontrado.',
          404
        );
      }

      if (
        existingUser.role.id ===
        newRole.id
      ) {
        return existingUser;
      }

      if (
        existingUser.role.name ===
          ROLES.ADMIN &&
        newRole.name !== ROLES.ADMIN &&
        existingUser.isActive
      ) {
        const adminRole =
          await tx.orm.public.Role
            .where({
              name: ROLES.ADMIN,
            })
            .first();

        const activeAdmins =
          await tx.orm.public.User
            .where({
              roleId: adminRole.id,
              isActive: true,
            })
            .all();

        if (activeAdmins.length <= 1) {
          throw new AppError(
            'No puedes quitar al último administrador activo.',
            400
          );
        }
      }

      const updatedUser =
        await tx.orm.public.User
          .where({ id: userId })
          .update({
            roleId: newRole.id,
          });

      await createAuditLog(
        {
          userId: actorUserId,
          action:
            AUDIT_ACTIONS.ROLE_ASSIGNED,
          resourceType: 'USER',
          resourceId: userId,
          ipAddress,
          userAgent,
          metadata: {
            previousRole:
              existingUser.role.name,
            newRole: newRole.name,
          },
        },
        tx
      );

      return updatedUser;
    }
  );

  return getUserById(result.id);
}