export function errorHandler(err, _req, res, _next) {
  console.error(err);

  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    return res.status(500).json({
      error: 'Internal server error',
    });
  }

  const response = {
    error: err.message,
  };

  if (err.details) {
    response.details = err.details;
  }

  return res.status(statusCode).json(response);
}