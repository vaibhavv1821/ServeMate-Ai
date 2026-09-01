import { catchAsync } from '../../utils/catchAsync.js';
import { env } from '../../config/env.js';

export const getHealth = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'ServMate API is healthy and operational',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});
