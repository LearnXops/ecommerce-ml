import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import productRoutes from '../routes/productRoutes';
import { errorHandler } from '../middleware/errorHandler';
import { Product } from '@ecommerce/shared/models/Product';
import { User } from '@ecommerce/shared/models/User';
import jwt from 'jsonwebtoken';

describe('Product Controller', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let customerToken: string;
  let adminUser: any;
  let customerUser: any;
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
    app.use(errorHandler);

    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-secret-key';

    // Create test users
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'hashedpassword',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    customerUser = await User.create({
      email: 'customer@test.com',
      password: 'hashedpassword',
      firstName: 'Customer',
      lastName: 'User',
      role: 'customer'
    });

    // Generate JWT tokens
    adminToken = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { id: customerUser._id, email: customerUser.email, role: customerUser.role },
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
    // Clear products collection before each test
    await Product.deleteMany({});
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      // Create test products
      await Product.create([
        {
          name: 'Test Product 1',
          description: 'This is a test product description',
          price: 29.99,
          category: 'electronics',
          images: ['https://example.com/image1.jpg'],
          inventory: 10,
          tags: ['test', 'electronics']
        },
        {
          name: 'Test Product 2',
          description: 'Another test product description',
          price: 49.99,
          category: 'clothing',
          images: ['https://example.com/image2.jpg'],
          inventory: 5,
          tags: ['test', 'clothing']
        },
        {
          name: 'Out of Stock Product',
          description: 'This product is out of stock',
          price: 19.99,
          category: 'books',
          images: ['https://example.com/image3.jpg'],
          inventory: 0,
          tags: ['test', 'books']
        }
      ]);
    });

    it('should return all active products with pagination', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(3);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products?category=electronics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].category).toBe('electronics');
    });

    it('should filter products by price range', async () => {
      const response = await request(app)
        .get('/api/products?minPrice=30&maxPrice=50')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].price).toBe(49.99);
    });

    it('should filter products by stock availability', async () => {
      const response = await request(app)
        .get('/api/products?inStock=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      response.body.data.data.forEach((product: any) => {
        expect(product.inventory).toBeGreaterThan(0);
      });
    });

    it('should search products by text', async () => {
      const response = await request(app)
        .get('/api/products?search=electronics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination.hasNext).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'This is a test product description',
        price: 29.99,
        category: 'electronics',
        images: ['https://example.com/image1.jpg'],
        inventory: 10,
        tags: ['test']
      });
      productId = product._id.toString();
    });

    it('should return product by ID', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(productId);
      expect(response.body.data.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should return 400 for invalid product ID', async () => {
      const response = await request(app)
        .get('/api/products/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });

  describe('POST /api/products', () => {
    const validProduct = {
      name: 'New Test Product',
      description: 'This is a new test product description',
      price: 39.99,
      category: 'electronics',
      images: ['https://example.com/image1.jpg'],
      inventory: 15,
      tags: ['new', 'test']
    };

    it('should create product with admin token', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validProduct)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(validProduct.name);
      expect(response.body.data.price).toBe(validProduct.price);
    });

    it('should reject creation without admin token', async () => {
      const response = await request(app)
        .post('/api/products')
        .send(validProduct)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should reject creation with customer token', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validProduct)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate required fields', async () => {
      const invalidProduct = { name: 'Test' }; // Missing required fields

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProduct)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate product names', async () => {
      // Create first product
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validProduct)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validProduct)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_EXISTS');
    });
  });

  describe('PUT /api/products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'This is a test product description',
        price: 29.99,
        category: 'electronics',
        images: ['https://example.com/image1.jpg'],
        inventory: 10,
        tags: ['test']
      });
      productId = product._id.toString();
    });

    it('should update product with admin token', async () => {
      const updateData = {
        name: 'Updated Product Name',
        price: 49.99
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.price).toBe(updateData.price);
    });

    it('should reject update without admin token', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .send({ name: 'Updated Name' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'This is a test product description',
        price: 29.99,
        category: 'electronics',
        images: ['https://example.com/image1.jpg'],
        inventory: 10,
        tags: ['test']
      });
      productId = product._id.toString();
    });

    it('should soft delete product with admin token', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify product is soft deleted
      const product = await Product.findById(productId);
      expect(product?.isActive).toBe(false);
    });

    it('should reject deletion without admin token', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/products/categories', () => {
    beforeEach(async () => {
      await Product.create([
        {
          name: 'Electronics Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          images: ['https://example.com/image1.jpg'],
          inventory: 10
        },
        {
          name: 'Clothing Product',
          description: 'Test description',
          price: 39.99,
          category: 'clothing',
          images: ['https://example.com/image2.jpg'],
          inventory: 5
        }
      ]);
    });

    it('should return list of categories', async () => {
      const response = await request(app)
        .get('/api/products/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toContain('electronics');
      expect(response.body.data).toContain('clothing');
      expect(response.body.data).toEqual(expect.arrayContaining(['electronics', 'clothing']));
    });
  });

  describe('GET /api/products/search', () => {
    beforeEach(async () => {
      await Product.create({
        name: 'Smartphone',
        description: 'Latest smartphone with advanced features',
        price: 599.99,
        category: 'electronics',
        images: ['https://example.com/phone.jpg'],
        inventory: 20,
        tags: ['phone', 'mobile', 'technology']
      });
    });

    it('should search products by query', async () => {
      const response = await request(app)
        .get('/api/products/search?q=smartphone')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toContain('Smartphone');
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should limit search results', async () => {
      const response = await request(app)
        .get('/api/products/search?q=test&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });
});