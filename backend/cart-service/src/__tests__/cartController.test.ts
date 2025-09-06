import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from 'redis';
import { Product } from 'shared/models/Product';
import { User } from 'shared/models/User';
import cartRoutes from '../routes/cartRoutes';
import { errorHandler } from '../middleware/errorHandler';
import jwt from 'jsonwebtoken';

describe('Cart Controller', () => {
  let mongoServer: MongoMemoryServer;
  let redisClient: any;
  let userToken: string;
  let userId: string;
  let app: express.Application;
  let testProduct: any;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Redis client for testing (using real Redis or mock)
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    try {
      await redisClient.connect();
    } catch (error) {
      // If Redis is not available, skip Redis-dependent tests
      console.warn('Redis not available for testing, some tests may be skipped');
    }

    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-secret-key';

    // Create test app
    app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use('/api/cart', cartRoutes);
    app.use(errorHandler);

    // Create test user
    const user = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer'
    });

    userId = user._id.toString();

    // Generate JWT token
    userToken = jwt.sign(
      { id: userId, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'This is a test product for cart testing',
      price: 29.99,
      category: 'electronics',
      images: ['https://example.com/image1.jpg'],
      inventory: 10,
      tags: ['test']
    });
  });

  afterAll(async () => {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
    }
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear Redis cart data before each test
    if (redisClient && redisClient.isOpen) {
      try {
        const keys = await redisClient.keys('cart:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } catch (error) {
        // Ignore Redis errors in tests
      }
    }
  });

  describe('GET /api/cart', () => {
    it('should return empty cart for new user', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toEqual([]);
      expect(response.body.data.totalAmount).toBe(0);
      expect(response.body.data.userId).toBe(userId);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/cart')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('POST /api/cart/items', () => {
    it('should add item to cart', async () => {
      const cartItem = {
        productId: testProduct._id.toString(),
        quantity: 2
      };

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send(cartItem)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].productId).toBe(testProduct._id.toString());
      expect(response.body.data.items[0].quantity).toBe(2);
      expect(response.body.data.items[0].price).toBe(testProduct.price);
      expect(response.body.data.totalAmount).toBe(testProduct.price * 2);
    });

    it('should validate cart item data', async () => {
      const invalidItem = {
        productId: 'invalid-id',
        quantity: 0
      };

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidItem)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should check product existence', async () => {
      const nonExistentProduct = {
        productId: new mongoose.Types.ObjectId().toString(),
        quantity: 1
      };

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send(nonExistentProduct)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should check inventory availability', async () => {
      const excessiveQuantity = {
        productId: testProduct._id.toString(),
        quantity: 20 // More than available inventory (10)
      };

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send(excessiveQuantity)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_INVENTORY');
    });

    it('should require authentication', async () => {
      const cartItem = {
        productId: testProduct._id.toString(),
        quantity: 1
      };

      const response = await request(app)
        .post('/api/cart/items')
        .send(cartItem)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('PUT /api/cart/items/:productId', () => {
    beforeEach(async () => {
      // Add an item to cart first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        });
    });

    it('should update item quantity', async () => {
      const updateData = { quantity: 5 };

      const response = await request(app)
        .put(`/api/cart/items/${testProduct._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0].quantity).toBe(5);
      expect(response.body.data.totalAmount).toBe(testProduct.price * 5);
    });

    it('should remove item when quantity is 0', async () => {
      const updateData = { quantity: 0 };

      const response = await request(app)
        .put(`/api/cart/items/${testProduct._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.totalAmount).toBe(0);
    });

    it('should validate quantity', async () => {
      const invalidUpdate = { quantity: -1 };

      const response = await request(app)
        .put(`/api/cart/items/${testProduct._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should check inventory when updating', async () => {
      const excessiveUpdate = { quantity: 20 };

      const response = await request(app)
        .put(`/api/cart/items/${testProduct._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(excessiveUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_INVENTORY');
    });
  });

  describe('DELETE /api/cart/items/:productId', () => {
    beforeEach(async () => {
      // Add an item to cart first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        });
    });

    it('should remove item from cart', async () => {
      const response = await request(app)
        .delete(`/api/cart/items/${testProduct._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.totalAmount).toBe(0);
    });

    it('should return 404 for non-existent item', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/cart/items/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });

  describe('DELETE /api/cart', () => {
    beforeEach(async () => {
      // Add items to cart first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        });
    });

    it('should clear entire cart', async () => {
      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Cart cleared successfully');

      // Verify cart is empty
      const getResponse = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(getResponse.body.data.items).toHaveLength(0);
    });
  });

  describe('POST /api/cart/sync', () => {
    beforeEach(async () => {
      // Add an item to cart first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        });
    });

    it('should sync cart with current product data', async () => {
      // Update product price
      await Product.findByIdAndUpdate(testProduct._id, { price: 39.99 });

      const response = await request(app)
        .post('/api/cart/sync')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items[0].price).toBe(39.99);
      expect(response.body.data.cart.totalAmount).toBe(39.99 * 2);
    });

    it('should return 404 for empty cart', async () => {
      // Clear cart first
      await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      const response = await request(app)
        .post('/api/cart/sync')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CART_EMPTY');
    });
  });
});