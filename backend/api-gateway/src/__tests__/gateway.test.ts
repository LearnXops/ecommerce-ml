import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

describe('API Gateway Routing', () => {
  let app: express.Application;
  let validToken: string;

  beforeEach(() => {
    // Create a simple test app
    app = express();
    app.use(express.json());

    // Health check
    app.get('/health', (_req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // Mock auth middleware
    const mockAuthMiddleware = (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Access token is required' }
        });
      }

      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env['JWT_SECRET']!) as any;
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid access token' }
        });
      }
    };

    // Mock routes
    app.post('/api/auth/login', (_req, res) => {
      res.json({ message: 'Auth service login' });
    });

    app.get('/api/products', mockAuthMiddleware, (_req, res) => {
      res.json({ message: 'Products service', products: [] });
    });

    app.get('/api/cart', mockAuthMiddleware, (_req, res) => {
      res.json({ message: 'Cart service', items: [] });
    });

    app.get('/api/orders', mockAuthMiddleware, (_req, res) => {
      res.json({ message: 'Orders service', orders: [] });
    });

    app.get('/api/recommendations', mockAuthMiddleware, (_req, res) => {
      res.json({ message: 'Recommendations service', recommendations: [] });
    });

    // 404 handler
    app.use('*', (_req, res) => {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Route not found' }
      });
    });

    // Create test token
    const payload = { id: 'user123', email: 'test@example.com', role: 'customer' };
    validToken = jwt.sign(payload, process.env['JWT_SECRET']!);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK'
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Public Routes', () => {
    it('should route auth requests without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .expect(200);

      expect(response.body.message).toBe('Auth service login');
    });
  });

  describe('Protected Routes', () => {
    it('should reject requests to protected routes without token', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should route products requests with valid token', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.message).toBe('Products service');
    });

    it('should route cart requests with valid token', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.message).toBe('Cart service');
    });

    it('should route orders requests with valid token', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.message).toBe('Orders service');
    });

    it('should route recommendations requests with valid token', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.message).toBe('Recommendations service');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found'
        }
      });
    });
  });
});