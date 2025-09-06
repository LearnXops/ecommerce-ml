import request from 'supertest';
import app from '../index';
import { User } from 'shared';
import { generateToken } from '../utils/jwt';
import mongoose from 'mongoose';

// Set up test environment
process.env['JWT_SECRET'] = 'test-jwt-secret-key';
process.env['JWT_EXPIRATION'] = '1h';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/ecommerce_auth_test';

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env['MONGODB_URI']!);
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

describe('Admin Endpoints', () => {
  let adminToken: string;
  let customerToken: string;
  let adminUser: any;
  let customerUser: any;

  beforeAll(async () => {
    await connectDB();
    
    // Create admin user
    adminUser = new User({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });
    await adminUser.save();
    
    // Create customer user
    customerUser = new User({
      email: 'customer@test.com',
      password: 'password123',
      firstName: 'Customer',
      lastName: 'User',
      role: 'customer'
    });
    await customerUser.save();
    
    // Generate tokens
    adminToken = generateToken({
      id: adminUser._id.toString(),
      email: adminUser.email,
      role: adminUser.role
    });
    
    customerToken = generateToken({
      id: customerUser._id.toString(),
      email: customerUser.email,
      role: customerUser.role
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await disconnectDB();
  });

  describe('GET /auth/users', () => {
    it('should allow admin to get all users', async () => {
      const response = await request(app)
        .get('/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/auth/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Insufficient permissions');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/auth/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Access token required');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/auth/users?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it('should support role filtering', async () => {
      const response = await request(app)
        .get('/auth/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].role).toBe('admin');
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/auth/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /auth/users/stats', () => {
    it('should return user statistics for admin', async () => {
      const response = await request(app)
        .get('/auth/users/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('adminUsers');
      expect(response.body.data).toHaveProperty('customerUsers');
      expect(response.body.data).toHaveProperty('recentRegistrations');
      expect(response.body.data).toHaveProperty('recentUsers');
      expect(response.body.data.totalUsers).toBe(2);
      expect(response.body.data.adminUsers).toBe(1);
      expect(response.body.data.customerUsers).toBe(1);
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/auth/users/stats')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/users/:id', () => {
    it('should allow admin to get user by ID', async () => {
      const response = await request(app)
        .get(`/auth/users/${customerUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user._id).toBe(customerUser._id.toString());
      expect(response.body.data.user.email).toBe(customerUser.email);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/auth/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('User not found');
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get(`/auth/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /auth/users/:id/role', () => {
    it('should allow admin to update user role', async () => {
      const response = await request(app)
        .put(`/auth/users/${customerUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('admin');

      // Verify the change in database
      const updatedUser = await User.findById(customerUser._id);
      expect(updatedUser?.role).toBe('admin');

      // Reset for other tests
      await User.findByIdAndUpdate(customerUser._id, { role: 'customer' });
    });

    it('should prevent admin from changing their own role', async () => {
      const response = await request(app)
        .put(`/auth/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'customer' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Cannot change your own role');
    });

    it('should validate role values', async () => {
      const response = await request(app)
        .put(`/auth/users/${customerUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid role. Must be customer or admin');
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .put(`/auth/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ role: 'customer' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/auth/users/${fakeId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('User not found');
    });
  });
});