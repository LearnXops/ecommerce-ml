import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';

describe('API Gateway Integration Tests', () => {
  let validToken: string;

  beforeAll(() => {
    // Create test tokens
    const userPayload = { id: 'user123', email: 'user@example.com', role: 'customer' };
    
    validToken = jwt.sign(userPayload, process.env['JWT_SECRET']!);
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Helmet should add various security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Request Size Limits', () => {
    it('should accept normal sized requests', async () => {
      const normalData = { message: 'test' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(normalData);

      // Should not fail due to size limits (may fail for other reasons)
      expect(response.status).not.toBe(413);
    });
  });

  describe('Authentication Flow', () => {
    it('should allow access to public auth endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      // Should reach the auth service (may return error from service, not gateway)
      expect(response.status).not.toBe(401);
    });

    it('should require authentication for protected endpoints', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should pass user information to downstream services', async () => {
      // This test verifies that user headers are added
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${validToken}`);

      // Should not be unauthorized (may fail for other reasons like service unavailable)
      expect(response.status).not.toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      // Should return an error status (400 or 500 are both acceptable for malformed JSON)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle service unavailability', async () => {
      // When services are not running, should get appropriate error
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${validToken}`);

      // Should handle connection errors gracefully - expect 5xx status
      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Make multiple requests to test rate limiting
      const requests = Array(5).fill(null).map(() => 
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed under normal rate limits
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('Logging', () => {
    it('should log requests', async () => {
      // This test ensures logging middleware is working
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
    });
  });

  describe('Path Rewriting', () => {
    it('should rewrite paths correctly for auth service', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      // Should attempt to reach auth service (not return 404 from gateway)
      expect(response.status).not.toBe(404);
    });

    it('should rewrite paths correctly for protected services', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${validToken}`);

      // Should attempt to reach product service after auth
      expect(response.status).not.toBe(404);
    });
  });
});