import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, JWTPayload } from '../utils/jwt';

// Set up test environment
process.env['JWT_SECRET'] = 'test-jwt-secret-key';
process.env['JWT_EXPIRATION'] = '1h';

describe('JWT Utils', () => {
  const testPayload: JWTPayload = {
    id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    role: 'customer'
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testPayload);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
      
      // Verify the token can be decoded
      const decoded = jwt.verify(token, process.env['JWT_SECRET']!) as any;
      expect(decoded.id).toBe(testPayload.id);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.iss).toBe('ecommerce-auth-service');
      expect(decoded.aud).toBe('ecommerce-app');
    });

    it('should throw error when JWT_SECRET is not set', () => {
      const originalSecret = process.env['JWT_SECRET'];
      delete process.env['JWT_SECRET'];

      expect(() => generateToken(testPayload)).toThrow('JWT secret not configured');

      process.env['JWT_SECRET'] = originalSecret;
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(testPayload);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(testPayload.id);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      // Create a token that's expired but has correct issuer/audience
      const expiredToken = jwt.sign(
        testPayload,
        process.env['JWT_SECRET']!,
        { 
          expiresIn: '-1h',
          issuer: 'ecommerce-auth-service',
          audience: 'ecommerce-app'
        }
      );

      expect(() => verifyToken(expiredToken)).toThrow('Token expired');
    });

    it('should throw error for token with wrong issuer', () => {
      const wrongIssuerToken = jwt.sign(
        testPayload,
        process.env['JWT_SECRET']!,
        { 
          issuer: 'wrong-issuer',
          audience: 'ecommerce-app'
        }
      );

      expect(() => verifyToken(wrongIssuerToken)).toThrow('Invalid token');
    });

    it('should throw error for token with wrong audience', () => {
      const wrongAudienceToken = jwt.sign(
        testPayload,
        process.env['JWT_SECRET']!,
        { 
          issuer: 'ecommerce-auth-service',
          audience: 'wrong-audience'
        }
      );

      expect(() => verifyToken(wrongAudienceToken)).toThrow('Invalid token');
    });

    it('should throw error when JWT_SECRET is not set', () => {
      const originalSecret = process.env['JWT_SECRET'];
      delete process.env['JWT_SECRET'];

      const token = jwt.sign(testPayload, 'some-secret');
      expect(() => verifyToken(token)).toThrow('JWT secret not configured');

      process.env['JWT_SECRET'] = originalSecret;
    });
  });
});