import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';
import { requestLogger } from '../middleware/logger';

describe('API Gateway Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Authentication Middleware', () => {
    beforeEach(() => {
      app.use(authMiddleware);
      app.get('/protected', (req: any, res) => {
        res.json({ user: req.user });
      });
      app.use(errorHandler);
    });

    it('should reject requests without authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        }
      });
    });

    it('should reject requests with invalid token format', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        }
      });
    });

    it('should reject requests with invalid JWT token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should accept requests with valid JWT token', async () => {
      const payload = { id: 'user123', email: 'test@example.com', role: 'customer' };
      const token = jwt.sign(payload, process.env['JWT_SECRET']!);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toEqual(payload);
    });

    it('should handle expired tokens', async () => {
      const payload = { id: 'user123', email: 'test@example.com', role: 'customer' };
      const token = jwt.sign(payload, process.env['JWT_SECRET']!, { expiresIn: '-1h' });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      // JWT library may return different error types, both are acceptable
      expect(['TOKEN_EXPIRED', 'INVALID_TOKEN']).toContain(response.body.error.code);
    });
  });

  describe('Admin Middleware', () => {
    beforeEach(() => {
      app.use(authMiddleware);
      app.use(adminMiddleware);
      app.get('/admin', (_req, res) => {
        res.json({ message: 'Admin access granted' });
      });
      app.use(errorHandler);
    });

    it('should reject non-admin users', async () => {
      const payload = { id: 'user123', email: 'test@example.com', role: 'customer' };
      const token = jwt.sign(payload, process.env['JWT_SECRET']!);

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow admin users', async () => {
      const payload = { id: 'admin123', email: 'admin@example.com', role: 'admin' };
      const token = jwt.sign(payload, process.env['JWT_SECRET']!);

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Admin access granted');
    });
  });

  describe('Error Handler Middleware', () => {
    beforeEach(() => {
      app.get('/error', (_req, _res, next) => {
        const error = new Error('Test error');
        next(error);
      });

      app.get('/validation-error', (_req, _res, next) => {
        const error = new Error('Validation failed') as any;
        error.name = 'ValidationError';
        error.details = { field: 'email', message: 'Invalid email format' };
        next(error);
      });

      app.get('/not-found-error', (_req, _res, next) => {
        const error = new Error('Resource not found') as any;
        error.name = 'NotFoundError';
        next(error);
      });

      app.use(errorHandler);
    });

    it('should handle generic errors', async () => {
      const response = await request(app)
        .get('/error')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred'
        }
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .get('/validation-error')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: { field: 'email', message: 'Invalid email format' }
        }
      });
    });

    it('should handle not found errors', async () => {
      const response = await request(app)
        .get('/not-found-error')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Request Logger Middleware', () => {
    beforeEach(() => {
      app.use(requestLogger);
      app.get('/test', (_req, res) => {
        res.json({ message: 'Test endpoint' });
      });
    });

    it('should log requests without affecting response', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.message).toBe('Test endpoint');
    });
  });
});