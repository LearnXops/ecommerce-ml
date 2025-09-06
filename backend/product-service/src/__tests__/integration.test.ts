import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import productRoutes from '../routes/productRoutes';
import { errorHandler } from '../middleware/errorHandler';
import { Product } from 'shared/models/Product';
import { User } from 'shared/models/User';
import jwt from 'jsonwebtoken';

describe('Product Service Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let app: express.Application;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test app
    app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use('/api/products', productRoutes);
    app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Product service is healthy',
        timestamp: new Date().toISOString(),
        service: 'product-service',
        version: '1.0.0'
      });
    });
    app.use(errorHandler);

    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-secret-key';

    // Create admin user
    const adminUser = await User.create({
      email: 'admin@test.com',
      password: 'hashedpassword',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    // Generate JWT token
    adminToken = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Product.deleteMany({});
  });

  describe('Complete Product Workflow', () => {
    it('should handle complete CRUD operations', async () => {
      // 1. Create a product
      const productData = {
        name: 'Integration Test Product',
        description: 'This is a product created during integration testing',
        price: 99.99,
        category: 'electronics',
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        inventory: 25,
        tags: ['integration', 'test', 'electronics']
      };

      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const productId = createResponse.body.data._id;

      // 2. Get the created product
      const getResponse = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.name).toBe(productData.name);

      // 3. Update the product
      const updateData = {
        name: 'Updated Integration Test Product',
        price: 149.99,
        inventory: 30
      };

      const updateResponse = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.name).toBe(updateData.name);
      expect(updateResponse.body.data.price).toBe(updateData.price);

      // 4. Search for the product
      const searchResponse = await request(app)
        .get('/api/products/search?q=integration')
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);

      // 5. Get products with filters
      const filterResponse = await request(app)
        .get('/api/products?category=electronics&minPrice=100')
        .expect(200);

      expect(filterResponse.body.success).toBe(true);
      expect(filterResponse.body.data.data.length).toBeGreaterThan(0);

      // 6. Delete the product
      const deleteResponse = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // 7. Verify product is no longer accessible
      await request(app)
        .get(`/api/products/${productId}`)
        .expect(404);
    });

    it('should handle product listing with pagination and sorting', async () => {
      // Create multiple products
      const products = [
        {
          name: 'Product A',
          description: 'Description for product A',
          price: 10.00,
          category: 'electronics',
          images: ['https://example.com/a.jpg'],
          inventory: 5
        },
        {
          name: 'Product B',
          description: 'Description for product B',
          price: 20.00,
          category: 'clothing',
          images: ['https://example.com/b.jpg'],
          inventory: 10
        },
        {
          name: 'Product C',
          description: 'Description for product C',
          price: 30.00,
          category: 'electronics',
          images: ['https://example.com/c.jpg'],
          inventory: 15
        }
      ];

      // Create all products
      for (const product of products) {
        await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(product)
          .expect(201);
      }

      // Test pagination
      const page1Response = await request(app)
        .get('/api/products?page=1&limit=2')
        .expect(200);

      expect(page1Response.body.data.data).toHaveLength(2);
      expect(page1Response.body.data.pagination.hasNext).toBe(true);

      // Test sorting by price
      const sortedResponse = await request(app)
        .get('/api/products?sortBy=price&sortOrder=asc')
        .expect(200);

      const prices = sortedResponse.body.data.data.map((p: any) => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));

      // Test category filtering
      const electronicsResponse = await request(app)
        .get('/api/products?category=electronics')
        .expect(200);

      expect(electronicsResponse.body.data.data).toHaveLength(2);
      electronicsResponse.body.data.data.forEach((product: any) => {
        expect(product.category).toBe('electronics');
      });
    });

    it('should handle error cases gracefully', async () => {
      // Test invalid product creation
      const invalidProduct = {
        name: 'A', // Too short
        description: 'Short', // Too short
        price: -10, // Negative
        category: 'invalid-category',
        images: [], // Empty array
        inventory: -5 // Negative
      };

      const errorResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProduct)
        .expect(400);

      expect(errorResponse.body.success).toBe(false);
      expect(errorResponse.body.error.code).toBe('VALIDATION_ERROR');

      // Test unauthorized access
      await request(app)
        .post('/api/products')
        .send({
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          images: ['https://example.com/image.jpg'],
          inventory: 10
        })
        .expect(401);

      // Test non-existent product
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.service).toBe('product-service');
    });
  });
});