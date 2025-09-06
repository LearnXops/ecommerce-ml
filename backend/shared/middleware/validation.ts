import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export interface ValidationError extends Error {
  statusCode: number;
  details: any[];
}

export const createValidationError = (message: string, details: any[]): ValidationError => {
  const error = new Error(message) as ValidationError;
  error.name = 'ValidationError';
  error.statusCode = 400;
  error.details = details;
  return error;
};

export const validateRequest = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      const validationError = createValidationError(
        'Validation failed',
        details
      );

      return next(validationError);
    }

    // Replace the request property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

export const validateBody = (schema: Joi.ObjectSchema) => validateRequest(schema, 'body');
export const validateQuery = (schema: Joi.ObjectSchema) => validateRequest(schema, 'query');
export const validateParams = (schema: Joi.ObjectSchema) => validateRequest(schema, 'params');

// Common validation schemas
export const mongoIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid ID format',
      'any.required': 'ID is required'
    })
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Rate limiting validation
export const rateLimitSchema = Joi.object({
  windowMs: Joi.number().integer().min(1000).default(900000), // 15 minutes
  max: Joi.number().integer().min(1).default(100), // 100 requests per window
  message: Joi.string().default('Too many requests, please try again later')
});