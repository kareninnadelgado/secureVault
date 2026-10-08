function formatValidationError(result) {
  return {
    statusCode: 400,
    message: 'Invalid request data',
    details: result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(formatValidationError(result));
    }

    req.body = result.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return next(formatValidationError(result));
    }

    req.params = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(formatValidationError(result));
    }

    // Express 5 no permite reasignar req.query.
    // Guardamos el resultado validado aquí.
    res.locals.validatedQuery = result.data;

    next();
  };
}
