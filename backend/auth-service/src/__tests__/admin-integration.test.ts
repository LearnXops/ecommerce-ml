import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { User } from '@ecommerce/shared/models/User';
import { generateToken } from '../utils/jwt';
import mongoose from 'mongoose';

// Set up test environment
process.env['JWT_SECRET'] = 'test-jwt-secret-key';
process.env['JWT_EXPIRATION'] = '1h';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/ecommerce_auth_test';

describe('Admin Functionality Integration', () => {
  let adminUser: any;
  let customerUser: any;
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env['MONGODB_URI']!);
    }
    
    // Clean up any existing test data
    await User.deleteMany({});
    
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
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should create admin and customer users with correct roles', async () => {
    expect(adminUser.role).toBe('admin');
    expect(customerUser.role).toBe('customer');
    expect(adminUser.email).toBe('admin@test.com');
    expect(customerUser.email).toBe('customer@test.com');
  });

  it('should generate valid JWT tokens for both users', () => {
    expect(typeof adminToken).toBe('string');
    expect(typeof customerToken).toBe('string');
    expect(adminToken.split('.')).toHaveLength(3);
    expect(customerToken.split('.')).toHaveLength(3);
  });

  it('should be able to query users from database', async () => {
    const users = await User.find({});
    expect(users).toHaveLength(2);
    
    const admin = users.find(u => u.role === 'admin');
    const customer = users.find(u => u.role === 'customer');
    
    expect(admin).toBeDefined();
    expect(customer).toBeDefined();
    expect(admin?.email).toBe('admin@test.com');
    expect(customer?.email).toBe('customer@test.com');
  });

  it('should be able to update user roles', async () => {
    // Change customer to admin
    customerUser.role = 'admin';
    await customerUser.save();
    
    const updatedUser = await User.findById(customerUser._id);
    expect(updatedUser?.role).toBe('admin');
    
    // Change back to customer
    customerUser.role = 'customer';
    await customerUser.save();
    
    const revertedUser = await User.findById(customerUser._id);
    expect(revertedUser?.role).toBe('customer');
  });

  it('should validate user data correctly', async () => {
    // Test invalid email
    const invalidUser = new User({
      email: 'invalid-email',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer'
    });
    
    await expect(invalidUser.save()).rejects.toThrow();
  });

  it('should hash passwords correctly', async () => {
    const testUser = new User({
      email: 'test@example.com',
      password: 'plaintext123',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer'
    });
    
    await testUser.save();
    
    // Password should be hashed
    const savedUser = await User.findById(testUser._id).select('+password');
    expect(savedUser?.password).not.toBe('plaintext123');
    expect(savedUser?.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    
    // Clean up
    await User.findByIdAndDelete(testUser._id);
  });
});