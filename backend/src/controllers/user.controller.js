import {
  getUsers as getUsersService,
  getUserById as getUserByIdService,
  createUser as createUserService,
  updateUser as updateUserService,
  deactivateUser as deactivateUserService,
  assignUserRole as assignUserRoleService,
  activateUser as activateUserService,
} from '../services/user.service.js';

import { getRequestInfo } from '../utils/requestInfo.js';

export async function listUsers(req, res, next) {
  try {
    const result = await getUsersService(
      res.locals.validatedQuery
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await getUserByIdService(req.params.id);

    return res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { ipAddress, userAgent } = getRequestInfo(req);

    const user = await createUserService({
      data: req.body,
      actorUserId: req.user.id,
      ipAddress,
      userAgent,
    });

    return res.status(201).json({
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateExistingUser(req, res, next) {
  try {
    const { ipAddress, userAgent } = getRequestInfo(req);

    const user = await updateUserService({
      userId: req.params.id,
      data: req.body,
      actorUserId: req.user.id,
      ipAddress,
      userAgent,
    });

    return res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function deactivateExistingUser(
  req,
  res,
  next
) {
  try {
    const { ipAddress, userAgent } = getRequestInfo(req);

    const user = await deactivateUserService({
      userId: req.params.id,
      actorUserId: req.user.id,
      ipAddress,
      userAgent,
    });

    return res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function assignRole(req, res, next) {
  try {
    const { ipAddress, userAgent } = getRequestInfo(req);

    const user = await assignUserRoleService({
      userId: req.params.id,
      roleName: req.body.role,
      actorUserId: req.user.id,
      ipAddress,
      userAgent,
    });

    return res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function activateExistingUser(
  req,
  res,
  next
) {
  try {
    const { ipAddress, userAgent } =
      getRequestInfo(req);

    const user =
      await activateUserService({
        userId: req.params.id,
        actorUserId: req.user.id,
        ipAddress,
        userAgent,
      });

    return res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
}