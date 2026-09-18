import { verifyAccessToken } from '../services/token.service.js';
import { db } from '../prisma/db.ts';
import AppError from '../utils/AppError.js';

export async function authenticate(req, _res, next) {
  try {
    const cookieHeader = req.headers.cookie || '';

    const accessCookie = cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('access_token='));

    if (!accessCookie) {
      throw new AppError('Authentication required', 401);
    }

    const token = decodeURIComponent(
      accessCookie.substring('access_token='.length)
    );

    const payload = await verifyAccessToken(token);

    const userId = Number(payload.sub);

    if (!Number.isInteger(userId)) {
      throw new AppError('Invalid authentication token', 401);
    }

    const user = await db.orm.public.User
      .where({ id: userId })
      .include('role')
      .first();

    if (!user || !user.isActive) {
      throw new AppError('Authentication required', 401);
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(new AppError('Authentication required', 401));
  }
}