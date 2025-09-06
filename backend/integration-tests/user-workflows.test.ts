import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { app as authApp } from '../auth-service/src/index';
import { app as productApp } from '../product-service/src/index';
import { app as cartApp } from '../cart-service/src/index';
import { app as orderApp } from '../order-service/src/index';
import { app as gatewayApp } from '../api-gateway/src/index';

describe('Complete User Workflows Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let redisClient: any;
  let userToken: string;
  let adminToken: string;
  let productId: string;
  let orderId: string;

  beforeAll(async () => {
    // Setup MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Redis
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    await redisClient.quit();
  });

  beforeEach(async () => {
    // Clear all collections
    await mongoose.connection.db.dropDatabase();
    await redisClient.flushAll();
  });

  describe('Complete Customer Journey', () => {
    test('User registration → Login → Browse products → Add to cart → Checkout → Order tracking', async () => {
      // 1. User Registration
      const registrationData = {
        email: 'customer@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const registerResponse = await request(gatewayApp)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(registrationData.email);

      // 2. User Login
      const loginResponse = await request(gatewayApp)
        .post('/api/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password
        })
        .expect(200);

      userToken = loginResponse.body.data.token;
      expect(userToken).toBeDefined();

      // 3. Browse Products (First create a product as admin)
      // Create admin user first
      const adminData = {
        email: 'admin@test.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      };

      await request(gatewayApp)
        .post('/api/auth/register')
        .send(adminData)
        .expect(201);

      const adminLoginResponse = await request(gatewayApp)
        .post('/api/auth/login')
        .send({
          email: adminData.email,
          password: adminData.password
        })
        .expect(200);

      adminToken = adminLoginResponse.body.data.token;

      // Create a product
      const productData = {
        name: 'Test Product',
        description: 'A test product for integration testing',
        price: 29.99,
        category: 'Electronics',
        inventory: 100,
        images: ['test-image.jpg'],
        tags: ['test', 'electronics']
      };

      const createProductResponse = await request(gatewayApp)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      productId = createProductResponse.body.data._id;

      // Browse products
      const browseResponse = await request(gatewayApp)
        .get('/api/products')
        .expect(200);

      expect(browseResponse.body.data.products).toHaveLength(1);
      expect(browseResponse.body.data.products[0].name).toBe(productData.name);

      // 4. Add to Cart
      const addToCartResponse = await request(gatewayApp)
        .post(`/api/cart/${loginResponse.body.data.user._id}/items`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId,
          quantity: 2
        })
        .expect(200);

      expect(addToCartResponse.body.success).toBe(true);

      // Verify cart contents
      const cartResponse = await request(gatewayApp)
        .get(`/api/cart/${loginResponse.body.data.user._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cartResponse.body.data.items).toHaveLength(1);
      expect(cartResponse.body.data.items[0].quantity).toBe(2);

      // 5. Checkout Process
      const orderData = {
        items: [
          {
            productId: productId,
            quantity: 2,
            price: productData.price
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card'
      };

      const checkoutResponse = await request(gatewayApp)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      orderId = checkoutResponse.body.data._id;
      expect(checkoutResponse.body.data.status).toBe('pending');

      // 6. Order Tracking
      const orderTrackingResponse = await request(gatewayApp)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(orderTrackingResponse.body.data._id).toBe(orderId);
      expect(orderTrackingResponse.body.data.status).toBe('pending');

      // 7. Admin Order Management
      const adminOrdersResponse = await request(gatewayApp)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminOrdersResponse.body.data).toHaveLength(1);

      // Update order status
      const updateStatusResponse = await request(gatewayApp)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'processing' })
        .expect(200);

      expect(updateStatusResponse.body.data.status).toBe('processing');
    });

    test('Product search and filtering workflow', async () => {
      // Setup: Create multiple products
      const products = [
        {
          name: 'iPhone 14',
          description: 'Latest Apple smartphone',
          price: 999.99,
          category: 'Electronics',
          inventory: 50,
          tags: ['apple', 'smartphone', 'ios']
        },
        {
          name: 'Samsung Galaxy S23',
          description: 'Android flagship phone',
          price: 899.99,
          category: 'Electronics',
          inventory: 30,
          tags: ['samsung', 'smartphone', 'android']
        },
        {
          name: 'Nike Air Max',
          description: 'Comfortable running shoes',
          price: 129.99,
          category: 'Footwear',
          inventory: 75,
          tags: ['nike', 'shoes', 'running']
        }
      ];

      // Create admin and login
      const adminData = {
        email: 'admin@test.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      };

      await request(gatewayApp)
        .post('/api/auth/register')
        .send(adminData);

      const adminLogin = await request(gatewayApp)
        .post('/api/auth/login')
        .send({
          email: adminData.email,
          password: adminData.password
        });

      const adminToken = adminLogin.body.data.token;

      // Create products
      for (const product of products) {
        await request(gatewayApp)
          .post('/api/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(product);
      }

      // Test search functionality
      const searchResponse = await request(gatewayApp)
        .get('/api/products?search=smartphone')
        .expect(200);

      expect(searchResponse.body.data.products).toHaveLength(2);

      // Test category filtering
      const categoryResponse = await request(gatewayApp)
        .get('/api/products?category=Electronics')
        .expect(200);

      expect(categoryResponse.body.data.products).toHaveLength(2);

      // Test price range filtering
      const priceResponse = await request(gatewayApp)
        .get('/api/products?minPrice=100&maxPrice=200')
        .expect(200);

      expect(priceResponse.body.data.products).toHaveLength(1);
      expect(priceResponse.body.data.products[0].name).toBe('Nike Air Max');
    });

    test('Cart management workflow', async () => {
      // Setup user and products
      const userData = {
        email: 'user@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await request(gatewayApp)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(gatewayApp)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      const userToken = loginResponse.body.data.token;
      const userId = loginResponse.body.data.user._id;

      // Create admin and product
      const adminData = {
        email: 'admin@test.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      };

      await request(gatewayApp)
        .post('/api/auth/register')
        .send(adminData);

      const adminLogin = await request(gatewayApp)
        .post('/api/auth/login')
        .send({
          email: adminData.email,
          password: adminData.password
        });

      const adminToken = adminLogin.body.data.token;

      const productResponse = await request(gatewayApp)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          description: 'Test description',
          price: 50.00,
          category: 'Test',
          inventory: 100
        });

      const productId = productResponse.body.data._id;

      // Add item to cart
      await request(gatewayApp)
        .post(`/api/cart/${userId}/items`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId,
          quantity: 3
        })
        .expect(200);

      // Update item quantity
      const cartResponse = await request(gatewayApp)
        .get(`/api/cart/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const itemId = cartResponse.body.data.items[0]._id;

      await request(gatewayApp)
        .put(`/api/cart/${userId}/items/${itemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 5 })
        .expect(200);

      // Verify updated quantity
      const updatedCartResponse = await request(gatewayApp)
        .get(`/api/cart/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(updatedCartResponse.body.data.items[0].quantity).toBe(5);

      // Remove item from cart
      await request(gatewayApp)
        .delete(`/api/cart/${userId}/items/${itemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify item removed
      const finalCartResponse = await request(gatewayApp)
        .get(`/api/cart/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(finalCartResponse.body.data.items).toHaveLength(0);
    });
  });

  describe('Error Handling Workflows', () => {
    test('Invalid authentication workflow', async () => {
      // Test invalid login
      await request(gatewayApp)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Test accessing protected route without token
      await request(gatewayApp)
        .get('/api/orders')
        .expect(401);

      // Test accessing protected route with invalid token
      await request(gatewayApp)
        .get('/api/orders')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    test('Product not found workflow', async () => {
      // Test getting non-existent product
      await request(gatewayApp)
        .get('/api/products/507f1f77bcf86cd799439011')
        .expect(404);

      // Test adding non-existent product to cart
      const userData = {
        email: 'user@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      await request(gatewayApp)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(gatewayApp)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      const userToken = loginResponse.body.data.token;
      const userId = loginResponse.body.data.user._id;

      await request(gatewayApp)
        .post(`/api/cart/${userId}/items`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: '507f1f77bcf86cd799439011',
          quantity: 1
        })
        .expect(404);
    });
  });
});