import AppError from '../utils/AppError.js';

const stateChangingMethods = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

export function verifyOrigin(req, _res, next) {
  if (!stateChangingMethods.has(req.method)) {
    return next();
  }

  const origin = req.get('origin');

  if (!origin) {
    if (process.env.NODE_ENV === 'production') {
      return next(
        new AppError('Invalid request origin', 403)
      );
    }

    return next();
  }

  const allowedOrigin =
    process.env.FRONTEND_URL || 'http://localhost:5173';

  if (origin !== allowedOrigin) {
    return next(
      new AppError('Invalid request origin', 403)
    );
  }

  next();
}