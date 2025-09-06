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
  requestId?: string;
}

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || 
                   Math.random().toString(36).substring(2, 15);

  // Log the error with context
  logger.error('API Gateway Error:', {
    requestId,
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params,
    statusCode: error.statusCode,
    errorCode: error.code,
    isOperational: error.isOperational
  });

  // Default error response
  let statusCode = error.statusCode || 500;
  let errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An internal server error occurred'
    },
    timestamp: new Date().toISOString(),
    requestId
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: error.details
    };
  } else if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse.error = {
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    };
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse.error = {
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired'
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
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    errorResponse.error = {
      code: 'CONFLICT',
      message: 'Resource conflict'
    };
  } else if (error.name === 'TooManyRequestsError') {
    statusCode = 429;
    errorResponse.error = {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
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
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    statusCode = 500;
    errorResponse.error = {
      code: 'DATABASE_ERROR',
      message: 'Database operation failed'
    };
  }

  // Add error details for development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = {
      stack: error.stack,
      ...error.details
    };
  } else {
    // Don't expose internal error details in production
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