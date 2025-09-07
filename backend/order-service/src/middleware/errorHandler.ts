import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Order service error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Default error response
  let statusCode = error.statusCode || 500;
  let code = error.code || 'INTERNAL_SERVER_ERROR';
  let message = error.message || 'An unexpected error occurred';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid input data';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format';
  } else if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ERROR';
    message = 'Resource already exists';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(error.details && { details: error.details })
    },
    timestamp: new Date().toISOString()
  });
};

export const createError = (statusCode: number, code: string, message: string, details?: any): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};