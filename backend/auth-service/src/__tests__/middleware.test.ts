import { Response, NextFunction } from 'express';
import { requireRole, requireAdmin, AuthRequest } from '../middleware/auth';

// Set up test environment
process.env['JWT_SECRET'] = 'test-jwt-secret-key';

describe('Authentication Middleware', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  // Note: authenticateToken tests are skipped as they require database mocking
  // These would be covered in integration tests

  describe('requireRole', () => {
    beforeEach(() => {
      req.user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'customer'
      };
    });

    it('should allow access for correct role', () => {
      const middleware = requireRole('customer');
      middleware(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow access for multiple roles', () => {
      const middleware = requireRole(['customer', 'admin']);
      middleware(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access for incorrect role', () => {
      const middleware = requireRole('admin');
      middleware(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions',
          statusCode: 403
        })
      );
    });

    it('should deny access without authentication', () => {
      delete req.user;
      const middleware = requireRole('customer');
      middleware(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          statusCode: 401
        })
      );
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin user', () => {
      req.user = {
        id: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        role: 'admin'
      };

      requireAdmin(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access for customer user', () => {
      req.user = {
        id: '507f1f77bcf86cd799439011',
        email: 'customer@example.com',
        role: 'customer'
      };

      requireAdmin(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions',
          statusCode: 403
        })
      );
    });
  });
});