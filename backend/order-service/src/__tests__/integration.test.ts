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

describe('Order Service Integration Tests', () => {
  let authToken: string;
  let adminToken: string;
  let userId: string;
  let adminId: string;
  let productId: string;
  let orderId: string;

  beforeEach(() => {
    userId = new mongoose.Types.ObjectId().toString();
    adminId = new mongoose.Types.ObjectId().toString();
    productId = new mongoose.Types.ObjectId().toString();
    orderId = new mongoose.Types.ObjectId().toString();
    
    authToken = jwt.sign(
      { id: userId, email: 'customer@example.com', role: 'customer' },
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
        email: id === userId ? 'customer@example.com' : 'admin@example.com',
        role: id === userId ? 'customer' : 'admin'
      })
    }));
  });

  describe('Complete Order Workflow', () => {
    it('should handle complete order creation and payment flow', async () => {
      // Setup mock product
      const mockProduct = {
        _id: productId,
        name: 'Test Product',
        price: 29.99,
        inventory: 10,
        images: ['image1.jpg'],
        isActive: true
      };

      // Setup mock order
      const mockOrder = {
        _id: orderId,
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
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'United States'
        },
        orderDate: new Date(),
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock database operations for order creation
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

      // Step 1: Create order
      const orderData = {
        items: [{ productId, quantity: 2 }],
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'United States'
        }
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.totalAmount).toBe(59.98);

      // Step 2: Process payment
      MockedOrder.findOne = jest.fn().mockResolvedValue({
        ...mockOrder,
        paymentStatus: PaymentStatus.PENDING
      });

      MockedOrder.findByIdAndUpdate = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          ...mockOrder,
          paymentStatus: PaymentStatus.COMPLETED,
          status: OrderStatus.CONFIRMED
        })
      }));

      const paymentResponse = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentMethodId: 'pm_test_123' });

      expect(paymentResponse.status).toBe(200);
      expect(paymentResponse.body.success).toBe(true);

      // Step 3: Admin updates order status
      MockedOrder.findById = jest.fn().mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED
      });

      MockedOrder.findByIdAndUpdate = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.SHIPPED,
          trackingNumber: 'TRACK123456'
        })
      }));

      const updateResponse = await request(app)
        .put(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          status: OrderStatus.SHIPPED,
          trackingNumber: 'TRACK123456'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);

      // Step 4: Customer views order
      MockedOrder.findOne = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.SHIPPED,
          trackingNumber: 'TRACK123456'
        })
      }));

      const viewResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(viewResponse.status).toBe(200);
      expect(viewResponse.body.success).toBe(true);
      expect(viewResponse.body.data.status).toBe(OrderStatus.SHIPPED);
    });

    it('should handle order cancellation workflow', async () => {
      const mockOrder = {
        _id: orderId,
        userId,
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentIntentId: 'pi_test_123',
        items: [
          { productId, quantity: 2 }
        ],
        totalAmount: 59.98,
        save: jest.fn().mockImplementation(function() {
          this.status = OrderStatus.CANCELLED;
          this.cancelledAt = new Date();
          return Promise.resolve(this);
        })
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
      expect(mockOrder.cancelledAt).toBeDefined();
    });

    it('should handle inventory validation during order creation', async () => {
      const mockProduct = {
        _id: productId,
        name: 'Test Product',
        price: 29.99,
        inventory: 1, // Only 1 in stock
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

      const orderData = {
        items: [{ productId, quantity: 5 }], // Requesting more than available
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_INVENTORY');
    });

    it('should handle payment failure gracefully', async () => {
      const mockOrder = {
        _id: orderId,
        userId,
        paymentStatus: PaymentStatus.PENDING,
        paymentIntentId: 'pi_test_123',
        totalAmount: 59.98
      };

      MockedOrder.findOne = jest.fn().mockResolvedValue(mockOrder);

      // Mock Stripe payment failure
      const mockStripe = require('stripe');
      mockStripe().paymentIntents.confirm.mockRejectedValueOnce(
        new Error('Your card was declined.')
      );

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentMethodId: 'pm_test_declined' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_FAILED');
    });
  });

  describe('Admin Order Management', () => {
    it('should allow admin to view all orders with filters', async () => {
      const mockOrders = [
        {
          _id: '1',
          userId: 'user1',
          totalAmount: 59.98,
          status: OrderStatus.CONFIRMED,
          orderDate: new Date()
        },
        {
          _id: '2',
          userId: 'user2',
          totalAmount: 39.99,
          status: OrderStatus.SHIPPED,
          orderDate: new Date()
        }
      ];

      MockedOrder.find = jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockOrders)
      }));

      MockedOrder.countDocuments = jest.fn().mockResolvedValue(2);

      const response = await request(app)
        .get('/api/orders?status=confirmed&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should allow admin to update order status with tracking', async () => {
      const mockOrder = {
        _id: orderId,
        status: OrderStatus.CONFIRMED
      };

      MockedOrder.findById = jest.fn().mockResolvedValue(mockOrder);
      MockedOrder.findByIdAndUpdate = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.SHIPPED,
          trackingNumber: 'TRACK123456',
          estimatedDelivery: new Date('2024-01-15')
        })
      }));

      const updateData = {
        status: OrderStatus.SHIPPED,
        trackingNumber: 'TRACK123456',
        estimatedDelivery: '2024-01-15'
      };

      const response = await request(app)
        .put(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(OrderStatus.SHIPPED);
      expect(response.body.data.trackingNumber).toBe('TRACK123456');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      MockedProduct.find = jest.fn().mockImplementation(() => ({
        session: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      }));

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);

      const orderData = {
        items: [{ productId, quantity: 1 }],
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should handle expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { id: userId, email: 'test@example.com', role: 'customer' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Performance and Pagination', () => {
    it('should handle large order lists with proper pagination', async () => {
      const mockOrders = Array(20).fill(null).map((_, index) => ({
        _id: `order_${index}`,
        userId,
        totalAmount: 29.99 * (index + 1),
        status: OrderStatus.CONFIRMED,
        orderDate: new Date()
      }));

      MockedOrder.find = jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockOrders)
      }));

      MockedOrder.countDocuments = jest.fn().mockResolvedValue(100);

      const response = await request(app)
        .get('/api/orders/my-orders?page=2&limit=20')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(20);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.totalPages).toBe(5);
      expect(response.body.data.pagination.hasNext).toBe(true);
      expect(response.body.data.pagination.hasPrev).toBe(true);
    });

    it('should handle sorting and filtering combinations', async () => {
      MockedOrder.find = jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([])
      }));

      MockedOrder.countDocuments = jest.fn().mockResolvedValue(0);

      const response = await request(app)
        .get('/api/orders/my-orders?status=confirmed&sortBy=totalAmount&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(MockedOrder.find).toHaveBeenCalledWith({
        userId,
        status: OrderStatus.CONFIRMED
      });
    });
  });
});