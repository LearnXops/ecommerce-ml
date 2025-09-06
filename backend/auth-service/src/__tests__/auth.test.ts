import jwt from 'jsonwebtoken';
import { generateToken, verifyToken } from '../utils/jwt';
import { registerSchema, loginSchema, updateProfileSchema } from '../validation/authValidation';

// Set up test environment
process.env['JWT_SECRET'] = 'test-jwt-secret-key';
process.env['JWT_EXPIRATION'] = '1h';

describe('Authentication Core Functions', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'TestPass123!',
    firstName: 'John',
    lastName: 'Doe'
  };

  describe('JWT Token Generation and Validation', () => {
    it('should generate and verify JWT tokens correctly', () => {
      const payload = {
        id: '507f1f77bcf86cd799439011',
        email: testUser.email,
        role: 'customer' as const
      };

      const token = generateToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = verifyToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should handle expired tokens', () => {
      const payload = {
        id: '507f1f77bcf86cd799439011',
        email: testUser.email,
        role: 'customer' as const
      };

      const expiredToken = jwt.sign(
        payload,
        process.env['JWT_SECRET']!,
        { 
          expiresIn: '-1h',
          issuer: 'ecommerce-auth-service',
          audience: 'ecommerce-app'
        }
      );

      expect(() => verifyToken(expiredToken)).toThrow('Token expired');
    });
  });

  describe('Validation Schemas', () => {
    it('should validate registration data correctly', () => {
      const { error, value } = registerSchema.validate(testUser);
      
      expect(error).toBeUndefined();
      expect(value.email).toBe(testUser.email);
      expect(value.role).toBe('customer');
    });

    it('should reject invalid registration data', () => {
      const invalidUser = { ...testUser, email: 'invalid-email' };
      const { error } = registerSchema.validate(invalidUser);
      
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('valid email');
    });

    it('should validate login data correctly', () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password
      };

      const { error, value } = loginSchema.validate(loginData);
      
      expect(error).toBeUndefined();
      expect(value.email).toBe(loginData.email);
      expect(value.password).toBe(loginData.password);
    });

    it('should validate profile update data correctly', () => {
      const updateData = {
        firstName: 'Jane',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        }
      };

      const { error, value } = updateProfileSchema.validate(updateData);
      
      expect(error).toBeUndefined();
      expect(value.firstName).toBe(updateData.firstName);
      expect(value.address.street).toBe(updateData.address.street);
    });
  });
});