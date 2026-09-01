import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    status = 'fail';
    message = 'Validation Error';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Handle Prisma Database Known Errors
  if (err.code && err.code.startsWith('P')) {
    statusCode = 400;
    status = 'fail';
    if (err.code === 'P2002') {
      message = `Duplicate field value: ${err.meta?.target || 'unique constraint failed'}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found in database';
    } else {
      message = `Database Error (${err.code})`;
    }
  }

  const responsePayload = {
    status,
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(responsePayload);
};
