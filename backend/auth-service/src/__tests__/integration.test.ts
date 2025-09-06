import request from 'supertest';
import app from '../index';

// Mock the database connection for integration tests
const mockUser = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
  prototype: {
    save: jest.fn(),
    comparePassword: jest.fn()
  }
};

jest.mock('shared', () => ({
  dbConnection: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', message: 'Database connection is healthy' })
  },
  User: mockUser,
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Auth Service Integration Tests', () => {
  beforeAll(() => {
    process.env['JWT_SECRET'] = 'test-jwt-secret-key';
    process.env['JWT_EXPIRATION'] = '1h';
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'auth-service',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Authentication Endpoints', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'John',
      lastName: 'Doe'
    };

    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        // Mock user doesn't exist
        mockUser.findByEmail.mockResolvedValue(null);
        
        // Mock successful user creation
        const mockUserInstance = {
          _id: 'mock-user-id',
          ...testUser,
          role: 'customer',
          createdAt: new Date(),
          save: jest.fn().mockResolvedValue(true)
        };
        
        // Mock the User constructor
        const { User } = require('shared');
        const OriginalUser = User;
        User.constructor = jest.fn().mockImplementation(() => mockUserInstance);
        Object.setPrototypeOf(User, function() { return mockUserInstance; });

        const response = await request(app)
          .post('/api/auth/register')
          .send(testUser)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(testUser.email);
        expect(response.body.data.token).toBeDefined();
      });

      it('should reject registration with invalid data', async () => {
        const invalidUser = { ...testUser, email: 'invalid-email' };

        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidUser)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('valid email');
      });

      it('should reject registration for existing user', async () => {
        // Mock user already exists
        mockUser.findByEmail.mockResolvedValue({ email: testUser.email });

        const response = await request(app)
          .post('/api/auth/register')
          .send(testUser)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('already exists');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login user with valid credentials', async () => {
        const mockUserInstance = {
          _id: 'mock-user-id',
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          role: 'customer',
          address: undefined,
          comparePassword: jest.fn().mockResolvedValue(true)
        };

        mockUser.findByEmail.mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUserInstance)
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(testUser.email);
        expect(response.body.data.token).toBeDefined();
      });

      it('should reject login with invalid credentials', async () => {
        // Mock user not found
        mockUser.findByEmail.mockReturnValue({
          select: jest.fn().mockResolvedValue(null)
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'wrong-password'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Invalid email or password');
      });
    });

    describe('Protected Routes', () => {
      let authToken: string;

      beforeEach(() => {
        const jwt = require('jsonwebtoken');
        authToken = jwt.sign(
          {
            id: 'mock-user-id',
            email: testUser.email,
            role: 'customer'
          },
          process.env['JWT_SECRET'],
          {
            expiresIn: '1h',
            issuer: 'ecommerce-auth-service',
            audience: 'ecommerce-app'
          }
        );
      });

      describe('GET /api/auth/profile', () => {
        it('should get user profile with valid token', async () => {
          const mockUserInstance = {
            _id: 'mock-user-id',
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            role: 'customer',
            address: undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          mockUser.findById.mockResolvedValue(mockUserInstance);

          const response = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.user.email).toBe(testUser.email);
        });

        it('should reject request without token', async () => {
          const response = await request(app)
            .get('/api/auth/profile')
            .expect(401);

          expect(response.body.success).toBe(false);
          expect(response.body.error.message).toContain('Access token required');
        });
      });

      describe('PUT /api/auth/profile', () => {
        it('should update user profile with valid data', async () => {
          const mockUserInstance = {
            _id: 'mock-user-id',
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            role: 'customer',
            address: undefined,
            updatedAt: new Date(),
            save: jest.fn().mockResolvedValue(true)
          };

          mockUser.findById.mockResolvedValue(mockUserInstance);

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

          const response = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.user.firstName).toBe(updateData.firstName);
          expect(mockUserInstance.save).toHaveBeenCalled();
        });
      });
    });
  });
});