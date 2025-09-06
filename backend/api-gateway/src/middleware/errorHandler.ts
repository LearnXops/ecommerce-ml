import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log the error
  logger.error('API Gateway Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error response
  let statusCode = 500;
  let errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred'
    },
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: error.details
    };
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse.error = {
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    };
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorResponse.error = {
      code: 'FORBIDDEN',
      message: 'Access denied'
    };
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorResponse.error = {
      code: 'NOT_FOUND',
      message: 'Resource not found'
    };
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorResponse.error = {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service temporarily unavailable'
    };
  } else if (error.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorResponse.error = {
      code: 'GATEWAY_TIMEOUT',
      message: 'Service request timeout'
    };
  }

  // Don't expose internal error details in production
  if (process.env['NODE_ENV'] === 'production') {
    delete errorResponse.error.details;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};