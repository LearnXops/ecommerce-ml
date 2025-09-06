import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler, asyncHandler } from '../middleware/errorHandler';

describe('Error Handling Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock logger
    vi.mock('../middleware/logger', () => ({
      logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn()
      }
    }));
  });

  describe('errorHandler', () => {
    it('should handle validation errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        (error as any).details = [
          { field: 'email', message: 'Email is required' }
        ];
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: [{ field: 'email', message: 'Email is required' }]
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle unauthorized errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Unauthorized');
        error.name = 'UnauthorizedError';
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    });

    it('should handle JWT token expired errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        }
      });
    });

    it('should handle forbidden errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Forbidden');
        error.name = 'ForbiddenError';
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    });

    it('should handle not found errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Not found');
        error.name = 'NotFoundError';
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found'
        }
      });
    });

    it('should handle rate limit errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Too many requests');
        error.name = 'TooManyRequestsError';
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(429);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        }
      });
    });

    it('should handle connection refused errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Connection refused');
        (error as any).code = 'ECONNREFUSED';
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable'
        }
      });
    });

    it('should handle timeout errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Timeout');
        (error as any).code = 'ETIMEDOUT';
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(504);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: 'Service request timeout'
        }
      });
    });

    it('should handle database errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Database error');
        error.name = 'MongoError';
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database operation failed'
        }
      });
    });

    it('should handle generic errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Generic error');
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Generic error'
        }
      });
    });

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.get('/test', (req, res, next) => {
        const error = new Error('Test error');
        (error as any).details = { extra: 'info' };
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should exclude error details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test', (req, res, next) => {
        const error = new Error('Test error');
        (error as any).details = { extra: 'info' };
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.body.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should include request ID in response', async () => {
      app.get('/test', (req, res, next) => {
        req.headers['x-request-id'] = 'test-request-id';
        const error = new Error('Test error');
        next(error);
      });
      
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.body.requestId).toBe('test-request-id');
    });
  });

  describe('asyncHandler', () => {
    it('should handle async function success', async () => {
      const asyncFunction = asyncHandler(async (req: any, res: any) => {
        res.json({ success: true });
      });

      app.get('/test', asyncFunction);

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should handle async function errors', async () => {
      const asyncFunction = asyncHandler(async (req: any, res: any, next: any) => {
        throw new Error('Async error');
      });

      app.get('/test', asyncFunction);
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Async error'
        }
      });
    });

    it('should handle promise rejections', async () => {
      const asyncFunction = asyncHandler(async (req: any, res: any, next: any) => {
        return Promise.reject(new Error('Promise rejection'));
      });

      app.get('/test', asyncFunction);
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Promise rejection'
        }
      });
    });
  });
});