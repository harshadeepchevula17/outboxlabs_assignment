import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/email.service';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error({ err, path: req.path, method: req.method }, 'Express request error');

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const isDatabaseConnectionError =
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'P1001' ||
    err?.code === 'P2024' ||
    err?.cause?.code === 'ECONNREFUSED' ||
    (typeof err?.message === 'string' && /ECONNREFUSED|database.*(unavailable|down)|could not connect to postgres|connection refused/i.test(err.message));

  if (isDatabaseConnectionError) {
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is unavailable. Please verify PostgreSQL is running.',
      },
    });
    return;
  }

  // Handle Prisma Known Request Errors
  if (err?.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database constraint error occurred',
      },
    });
    return;
  }

  // Fallback for unhandled errors
  const isDev = config.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err?.message || 'An unexpected internal server error occurred',
      ...(isDev ? { debugMessage: err?.message, stack: err?.stack, details: err } : {}),
    },
  });
};
