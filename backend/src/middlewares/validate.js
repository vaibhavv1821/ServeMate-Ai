export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const issue = error.errors[0];
        return res.status(400).json({
          status: 'error',
          message: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid request payload',
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};
