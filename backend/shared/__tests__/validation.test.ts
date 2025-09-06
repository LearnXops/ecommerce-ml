import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { 
  validateRequest, 
  validateBody, 
  validateQuery, 
  validateParams,
  createValidationError,
  mongoIdSchema,
  paginationSchema
} from '../middleware/validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {}
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('createValidationError', () => {
    it('should create validation error with correct properties', () => {
      const details = [{ field: 'email', message: 'Email is required' }];
      const error = createValidationError('Validation failed', details);

      expect(error.name).toBe('ValidationError');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
      expect(error.message).toBe('Validation failed');
    });
  });

  describe('validateRequest', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0)
    });

    it('should pass validation with valid data', () => {
      mockRequest.body = { name: 'John', age: 25 };
      
      const middleware = validateRequest(testSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: 'John', age: 25 });
    });

    it('should fail validation with invalid data', () => {
      mockRequest.body = { age: -5 }; // Missing required name, invalid age
      
      const middleware = validateRequest(testSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          statusCode: 400,
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: expect.stringContaining('required')
            }),
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('greater than or equal to 0')
            })
          ])
        })
      );
    });

    it('should strip unknown fields', () => {
      mockRequest.body = { 
        name: 'John', 
        age: 25, 
        unknownField: 'should be removed' 
      };
      
      const middleware = validateRequest(testSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: 'John', age: 25 });
      expect(mockRequest.body).not.toHaveProperty('unknownField');
    });

    it('should convert types when possible', () => {
      mockRequest.body = { name: 'John', age: '25' }; // age as string
      
      const middleware = validateRequest(testSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body.age).toBe(25); // Converted to number
    });
  });

  describe('validateBody', () => {
    it('should validate request body', () => {
      const schema = Joi.object({ name: Joi.string().required() });
      mockRequest.body = { name: 'John' };
      
      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters', () => {
      const schema = Joi.object({ page: Joi.number().min(1) });
      mockRequest.query = { page: '2' };
      
      const middleware = validateQuery(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query.page).toBe(2);
    });
  });

  describe('validateParams', () => {
    it('should validate route parameters', () => {
      const schema = Joi.object({ id: Joi.string().required() });
      mockRequest.params = { id: '123' };
      
      const middleware = validateParams(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('mongoIdSchema', () => {
    it('should validate valid MongoDB ObjectId', () => {
      const validId = '507f1f77bcf86cd799439011';
      const { error, value } = mongoIdSchema.validate({ id: validId });

      expect(error).toBeUndefined();
      expect(value.id).toBe(validId);
    });

    it('should reject invalid MongoDB ObjectId', () => {
      const invalidId = 'invalid-id';
      const { error } = mongoIdSchema.validate({ id: invalidId });

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Invalid ID format');
    });

    it('should require id field', () => {
      const { error } = mongoIdSchema.validate({});

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('ID is required');
    });
  });

  describe('paginationSchema', () => {
    it('should validate valid pagination parameters', () => {
      const { error, value } = paginationSchema.validate({
        page: 2,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc'
      });

      expect(error).toBeUndefined();
      expect(value).toEqual({
        page: 2,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc'
      });
    });

    it('should apply default values', () => {
      const { error, value } = paginationSchema.validate({});

      expect(error).toBeUndefined();
      expect(value).toEqual({
        page: 1,
        limit: 20,
        sortOrder: 'desc'
      });
    });

    it('should reject invalid page number', () => {
      const { error } = paginationSchema.validate({ page: 0 });

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('greater than or equal to 1');
    });

    it('should reject limit exceeding maximum', () => {
      const { error } = paginationSchema.validate({ limit: 101 });

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('less than or equal to 100');
    });

    it('should reject invalid sort order', () => {
      const { error } = paginationSchema.validate({ sortOrder: 'invalid' });

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be one of [asc, desc]');
    });
  });
});