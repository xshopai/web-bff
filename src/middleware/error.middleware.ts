import { Response, NextFunction } from 'express';
import logger from '../core/logger';
import { RequestWithTraceContext } from './traceContext.middleware';

export const errorMiddleware = (
  err: Error,
  req: RequestWithTraceContext,
  res: Response,
  _next: NextFunction
) => {
  const { traceId, spanId } = req;

  logger.error('Request error', {
    traceId,
    spanId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Check if headers already sent
  if (res.headersSent) {
    return;
  }

  // Default error response
  interface ErrorWithStatusCode extends Error {
    statusCode?: number;
  }
  const statusCode = (err as ErrorWithStatusCode).statusCode || 500;

  // For client errors (4xx), pass through the actual message
  // Only mask server errors (5xx) in production
  const shouldMaskError = statusCode >= 500 && config.env === 'production';
  const message = shouldMaskError ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      traceId,
      spanId,
      ...(config.env !== 'production' && { stack: err.stack }),
    },
  });
};

import config from '@/core/config';
