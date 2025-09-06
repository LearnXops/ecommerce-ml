import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../index';
import { Order } from 'shared/models/Order';
import { Product } from 'shared/models/Product';
import { User } from 'shared/models/User';
import { OrderStatus, PaymentStatus } from 'shared/types';

// Mock the database models
jest.mock('shared/models/Order');
jest.mock('shared/models/Product');
jest.mock('shared/models/User');

const MockedOrder = Order as jest.Mocked<typeof Order>;
const MockedProduct = Product as jest.Mocked<typeof Product>;
const MockedUser = User as jest.Mocked<typeof User>;

describe('Order Controller', () => {
  let authToken: string;
  let adminToken: string;
  let userId: string;
  let adminId: string;

  beforeEach(() => {
    userId = new mongoose.Types.ObjectId().toString();
    adminId = new mongoose.Types.ObjectId().toString();
    
    authToken = jwt.sign(
      { id: userId, email: 'test@example.com', role: 'customer' },
      process.env.JWT_SECRET!
    );
    
    adminToken = jwt.sign(
      { id: adminId, email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET!
    );

    // Mock user lookup
    MockedUser.findById = jest.fn().mockImplementation((id) => ({
      select: jest.fn().mockResolvedValue({
        _id: id,
        email: id === userId ? 'test@example.com' : 'admin@example.com',
        role: id === userId ? 'customer' : 'admin'
      })
    }));
  });

  describe('POST /api/orders', () => {
    const validOrderData = {
      items: [
        { productId: new mongoose.Types.ObjectId().toString(), quantity: 2 }
      ],
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'United States'
      }
    };

    it('should create order successfully', async () => {
      const productId = validOrderData.items[0].productId;
      const mockProduct = {
        _id: productId,
        name: 'Test Product',
        price: 29.99,
        inventory: 10,
        images: ['image1.jpg'],
        isActive: true
      };

      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        userId,
        items: [{
          productId,
          quantity: 2,
          price: 29.99,
          name: 'Test Product',
          image: 'image1.jpg'
        }],
        totalAmount: 59.98,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentIntentId: 'pi_test_123',
        shippingAddress: validOrderData.shippingAddress,
        orderDate: new Date(),
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock database operations
      MockedProduct.find = jest.fn().mockImplementation(() => ({
        session: jest.fn().mockResolvedValue([mockProduct])
      }));

      MockedProduct.findByIdAndUpdate = jest.fn().mockResolvedValue(mockProduct);

      MockedOrder.prototype.save = jest.fn().mockResolvedValue(mockOrder);
      MockedOrder.findById = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(mockOrder)
      }));

      // Mock mongoose session
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validOrderData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalAmount).toBe(59.98);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send(validOrderData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should return 400 for invalid order data', async () => {
      const invalidData = {
        items: [], // Empty items array
        shippingAddress: validOrderData.shippingAddress
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent product', async () => {
      MockedProduct.find = jest.fn().mockImplementation(() => ({
        session: jest.fn().mockResolvedValue([]) // No products found
      }));

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validOrderData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should return 400 for insufficient inventory', async () => {
      const productId = validOrderData.items[0].productId;
      const mockProduct = {
        _id: productId,
        name: 'Test Product',
        price: 29.99,
        inventory: 1, // Less than requested quantity
        images: ['image1.jpg'],
        isActive: true
      };

      MockedProduct.find = jest.fn().mockImplementation(() => ({
        session: jest.fn().mockResolvedValue([mockProduct])
      }));

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validOrderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_INVENTORY');
    });
  });

  describe('GET /api/orders/my-orders', () => {
    it('should return user orders with pagination', async () => {
      const mockOrders = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId,
          totalAmount: 59.98,
          status: OrderStatus.CONFIRMED,
          orderDate: new Date()
        }
      ];

      MockedOrder.find = jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockOrders)
      }));

      MockedOrder.countDocuments = jest.fn().mockResolvedValue(1);

      const response = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/orders/my-orders');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle query parameters correctly', async () => {
      MockedOrder.find = jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([])
      }));

      MockedOrder.countDocuments = jest.fn().mockResolvedValue(0);

      const response = await request(app)
        .get('/api/orders/my-orders?page=2&limit=10&status=confirmed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(MockedOrder.find).toHaveBeenCalledWith({
        userId,
        status: OrderStatus.CONFIRMED
      });
    });
  });

  describe('GET /api/orders/:id', () => {
    const orderId = new mongoose.Types.ObjectId().toString();

    it('should return order by ID for owner', async () => {
      const mockOrder = {
        _id: orderId,
        userId,
        totalAmount: 59.98,
        status: OrderStatus.CONFIRMED
      };

      MockedOrder.findOne = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(mockOrder)
      }));

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(orderId);
    });

    it('should return order by ID for admin', async () => {
      const mockOrder = {
        _id: orderId,
        userId: 'different-user-id',
        totalAmount: 59.98,
        status: OrderStatus.CONFIRMED
      };

      MockedOrder.findOne = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(mockOrder)
      }));

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent order', async () => {
      MockedOrder.findOne = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(null)
      }));

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    const orderId = new mongoose.Types.ObjectId().toString();

    it('should cancel order successfully', async () => {
      const mockOrder = {
        _id: orderId,
        userId,
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentIntentId: 'pi_test_123',
        items: [
          { productId: 'product1', quantity: 2 }
        ],
        totalAmount: 59.98,
        save: jest.fn().mockResolvedValue(true)
      };

      MockedOrder.findOne = jest.fn().mockImplementation(() => ({
        session: jest.fn().mockResolvedValue(mockOrder)
      }));

      MockedProduct.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);

      const response = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockOrder.status).toBe(OrderStatus.CANCELLED);
    });

    it('should return 400 for already cancelled order', async () => {
      const mockOrder = {
        _id: orderId,
        userId,
        status: OrderStatus.CANCELLED,
        items: []
      };

      MockedOrder.findOne = jest.fn().mockImplementation(() => ({
        session: jest.fn().mockResolvedValue(mockOrder)
      }));

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);

      const response = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ORDER_ALREADY_CANCELLED');
    });

    it('should return 400 for delivered order', async () => {
      const mockOrder = {
        _id: orderId,
        userId,
        status: OrderStatus.DELIVERED,
        items: []
      };

      MockedOrder.findOne = jest.fn().mockImplementation(() => ({
        session: jest.fn().mockResolvedValue(mockOrder)
      }));

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);

      const response = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ORDER_ALREADY_DELIVERED');
    });
  });

  describe('POST /api/orders/:id/payment', () => {
    const orderId = new mongoose.Types.ObjectId().toString();

    it('should process payment successfully', async () => {
      const mockOrder = {
        _id: orderId,
        userId,
        paymentStatus: PaymentStatus.PENDING,
        paymentIntentId: 'pi_test_123',
        totalAmount: 59.98
      };

      MockedOrder.findOne = jest.fn().mockResolvedValue(mockOrder);
      MockedOrder.findByIdAndUpdate = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          ...mockOrder,
          paymentStatus: PaymentStatus.COMPLETED,
          status: OrderStatus.CONFIRMED
        })
      }));

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentMethodId: 'pm_test_123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for missing payment method', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for already completed payment', async () => {
      const mockOrder = {
        _id: orderId,
        userId,
        paymentStatus: PaymentStatus.COMPLETED
      };

      MockedOrder.findOne = jest.fn().mockResolvedValue(mockOrder);

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentMethodId: 'pm_test_123' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('PAYMENT_ALREADY_COMPLETED');
    });
  });

  describe('Admin Routes', () => {
    describe('GET /api/orders (admin)', () => {
      it('should return all orders for admin', async () => {
        const mockOrders = [
          { _id: '1', userId: 'user1', totalAmount: 59.98 },
          { _id: '2', userId: 'user2', totalAmount: 39.99 }
        ];

        MockedOrder.find = jest.fn().mockImplementation(() => ({
          sort: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          select: jest.fn().mockResolvedValue(mockOrders)
        }));

        MockedOrder.countDocuments = jest.fn().mockResolvedValue(2);

        const response = await request(app)
          .get('/api/orders')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toHaveLength(2);
      });

      it('should return 403 for non-admin user', async () => {
        const response = await request(app)
          .get('/api/orders')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });
    });

    describe('PUT /api/orders/:id (admin)', () => {
      const orderId = new mongoose.Types.ObjectId().toString();

      it('should update order status successfully', async () => {
        const mockOrder = {
          _id: orderId,
          status: OrderStatus.PENDING
        };

        MockedOrder.findById = jest.fn().mockResolvedValue(mockOrder);
        MockedOrder.findByIdAndUpdate = jest.fn().mockImplementation(() => ({
          select: jest.fn().mockResolvedValue({
            ...mockOrder,
            status: OrderStatus.SHIPPED
          })
        }));

        const response = await request(app)
          .put(`/api/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: OrderStatus.SHIPPED });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should return 403 for non-admin user', async () => {
        const response = await request(app)
          .put(`/api/orders/${orderId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: OrderStatus.SHIPPED });

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });

      it('should return 404 for non-existent order', async () => {
        MockedOrder.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .put(`/api/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: OrderStatus.SHIPPED });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
      });
    });
  });
});