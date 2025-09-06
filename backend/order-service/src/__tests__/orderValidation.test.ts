import {
  validateOrder,
  validateOrderUpdate,
  validateOrderQuery,
  validatePayment,
  validateRefund
} from '../validation/orderValidation';
import { OrderStatus, PaymentStatus } from 'shared/types';
import mongoose from 'mongoose';

describe('Order Validation', () => {
  describe('validateOrder', () => {
    const validOrderData = {
      items: [
        {
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 2
        }
      ],
      shippingAddress: {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'California',
        zipCode: '12345',
        country: 'United States'
      }
    };

    it('should validate correct order data', () => {
      const { error, value } = validateOrder(validOrderData);
      
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
      expect(value.items).toHaveLength(1);
      expect(value.shippingAddress.country).toBe('United States');
    });

    it('should require items array', () => {
      const invalidData: any = { ...validOrderData };
      delete invalidData.items;
      
      const { error } = validateOrder(invalidData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('required');
    });

    it('should require at least one item', () => {
      const invalidData = {
        ...validOrderData,
        items: []
      };
      
      const { error } = validateOrder(invalidData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('at least 1 item');
    });

    it('should limit maximum items', () => {
      const invalidData = {
        ...validOrderData,
        items: Array(51).fill({
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 1
        })
      };
      
      const { error } = validateOrder(invalidData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('more than 50 items');
    });

    it('should validate product ID format', () => {
      const invalidData = {
        ...validOrderData,
        items: [
          {
            productId: 'invalid-id',
            quantity: 1
          }
        ]
      };
      
      const { error } = validateOrder(invalidData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('valid MongoDB ObjectId');
    });

    it('should validate quantity range', () => {
      const invalidData = {
        ...validOrderData,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toString(),
            quantity: 0
          }
        ]
      };
      
      const { error } = validateOrder(invalidData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('at least 1');
    });

    it('should limit maximum quantity', () => {
      const invalidData = {
        ...validOrderData,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toString(),
            quantity: 101
          }
        ]
      };
      
      const { error } = validateOrder(invalidData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('cannot exceed 100');
    });

    it('should require shipping address', () => {
      const invalidData: any = { ...validOrderData };
      delete invalidData.shippingAddress;
      
      const { error } = validateOrder(invalidData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('required');
    });

    it('should validate street address', () => {
      const invalidData = {
        ...validOrderData,
        shippingAddress: {
          ...validOrderData.shippingAddress,
          street: 'abc' // Too short
        }
      };
      
      const { error } = validateOrder(invalidData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('at least 5 characters');
    });

    it('should validate ZIP code format', () => {
      const invalidData = {
        ...validOrderData,
        shippingAddress: {
          ...validOrderData.shippingAddress,
          zipCode: '1234' // Invalid format
        }
      };
      
      const { error } = validateOrder(invalidData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('12345 or 12345-6789');
    });

    it('should accept extended ZIP code format', () => {
      const validData = {
        ...validOrderData,
        shippingAddress: {
          ...validOrderData.shippingAddress,
          zipCode: '12345-6789'
        }
      };
      
      const { error } = validateOrder(validData);
      
      expect(error).toBeUndefined();
    });

    it('should set default country', () => {
      const dataWithoutCountry = {
        ...validOrderData,
        shippingAddress: {
          street: '123 Main Street',
          city: 'Anytown',
          state: 'California',
          zipCode: '12345'
        }
      };
      
      const { error, value } = validateOrder(dataWithoutCountry);
      
      expect(error).toBeUndefined();
      expect(value.shippingAddress.country).toBe('United States');
    });

    it('should validate optional payment method ID', () => {
      const validData = {
        ...validOrderData,
        paymentMethodId: 'pm_test_123'
      };
      
      const { error } = validateOrder(validData);
      
      expect(error).toBeUndefined();
    });

    it('should validate optional notes', () => {
      const validData = {
        ...validOrderData,
        notes: 'Please deliver to back door'
      };
      
      const { error } = validateOrder(validData);
      
      expect(error).toBeUndefined();
    });

    it('should limit notes length', () => {
      const invalidData = {
        ...validOrderData,
        notes: 'a'.repeat(501) // Too long
      };
      
      const { error } = validateOrder(invalidData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('cannot exceed 500 characters');
    });
  });

  describe('validateOrderUpdate', () => {
    it('should validate status update', () => {
      const updateData = {
        status: OrderStatus.SHIPPED
      };
      
      const { error } = validateOrderUpdate(updateData);
      
      expect(error).toBeUndefined();
    });

    it('should validate payment status update', () => {
      const updateData = {
        paymentStatus: PaymentStatus.COMPLETED
      };
      
      const { error } = validateOrderUpdate(updateData);
      
      expect(error).toBeUndefined();
    });

    it('should validate tracking number', () => {
      const updateData = {
        trackingNumber: 'TRACK123456'
      };
      
      const { error } = validateOrderUpdate(updateData);
      
      expect(error).toBeUndefined();
    });

    it('should reject invalid status', () => {
      const updateData = {
        status: 'invalid-status'
      };
      
      const { error } = validateOrderUpdate(updateData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('must be one of');
    });

    it('should reject short tracking number', () => {
      const updateData = {
        trackingNumber: '123' // Too short
      };
      
      const { error } = validateOrderUpdate(updateData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('at least 5 characters');
    });

    it('should validate estimated delivery date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const updateData = {
        estimatedDelivery: futureDate
      };
      
      const { error } = validateOrderUpdate(updateData);
      
      expect(error).toBeUndefined();
    });

    it('should reject past estimated delivery date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const updateData = {
        estimatedDelivery: pastDate
      };
      
      const { error } = validateOrderUpdate(updateData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('cannot be in the past');
    });

    it('should require at least one field', () => {
      const updateData = {};
      
      const { error } = validateOrderUpdate(updateData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('At least one field must be provided');
    });
  });

  describe('validateOrderQuery', () => {
    it('should validate default query parameters', () => {
      const { error, value } = validateOrderQuery({});
      
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
      expect(value.sortBy).toBe('orderDate');
      expect(value.sortOrder).toBe('desc');
    });

    it('should validate custom pagination', () => {
      const queryData = {
        page: '2',
        limit: '10'
      };
      
      const { error, value } = validateOrderQuery(queryData);
      
      expect(error).toBeUndefined();
      expect(value.page).toBe(2);
      expect(value.limit).toBe(10);
    });

    it('should validate status filter', () => {
      const queryData = {
        status: OrderStatus.CONFIRMED
      };
      
      const { error, value } = validateOrderQuery(queryData);
      
      expect(error).toBeUndefined();
      expect(value.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should validate payment status filter', () => {
      const queryData = {
        paymentStatus: PaymentStatus.COMPLETED
      };
      
      const { error, value } = validateOrderQuery(queryData);
      
      expect(error).toBeUndefined();
      expect(value.paymentStatus).toBe(PaymentStatus.COMPLETED);
    });

    it('should validate user ID filter', () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const queryData = {
        userId
      };
      
      const { error, value } = validateOrderQuery(queryData);
      
      expect(error).toBeUndefined();
      expect(value.userId).toBe(userId);
    });

    it('should validate date range', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      
      const queryData = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
      
      const { error, value } = validateOrderQuery(queryData);
      
      expect(error).toBeUndefined();
      expect(value.startDate).toEqual(startDate);
      expect(value.endDate).toEqual(endDate);
    });

    it('should validate amount range', () => {
      const queryData = {
        minAmount: '10',
        maxAmount: '100'
      };
      
      const { error, value } = validateOrderQuery(queryData);
      
      expect(error).toBeUndefined();
      expect(value.minAmount).toBe(10);
      expect(value.maxAmount).toBe(100);
    });

    it('should reject invalid sort field', () => {
      const queryData = {
        sortBy: 'invalidField'
      };
      
      const { error } = validateOrderQuery(queryData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('must be one of');
    });

    it('should reject end date before start date', () => {
      const startDate = new Date('2023-12-31');
      const endDate = new Date('2023-01-01');
      
      const queryData = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
      
      const { error } = validateOrderQuery(queryData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('after start date');
    });

    it('should reject max amount less than min amount', () => {
      const queryData = {
        minAmount: '100',
        maxAmount: '50'
      };
      
      const { error } = validateOrderQuery(queryData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('greater than minimum amount');
    });
  });

  describe('validatePayment', () => {
    it('should validate payment method ID', () => {
      const paymentData = {
        paymentMethodId: 'pm_test_123'
      };
      
      const { error } = validatePayment(paymentData);
      
      expect(error).toBeUndefined();
    });

    it('should require payment method ID', () => {
      const paymentData = {};
      
      const { error } = validatePayment(paymentData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('required');
    });

    it('should reject empty payment method ID', () => {
      const paymentData = {
        paymentMethodId: ''
      };
      
      const { error } = validatePayment(paymentData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('required');
    });
  });

  describe('validateRefund', () => {
    it('should validate refund with amount', () => {
      const refundData = {
        amount: 50.00,
        reason: 'requested_by_customer',
        notes: 'Customer requested refund'
      };
      
      const { error } = validateRefund(refundData);
      
      expect(error).toBeUndefined();
    });

    it('should validate refund without amount (full refund)', () => {
      const refundData = {
        reason: 'duplicate'
      };
      
      const { error, value } = validateRefund(refundData);
      
      expect(error).toBeUndefined();
      expect(value.reason).toBe('duplicate');
    });

    it('should set default reason', () => {
      const refundData = {};
      
      const { error, value } = validateRefund(refundData);
      
      expect(error).toBeUndefined();
      expect(value.reason).toBe('requested_by_customer');
    });

    it('should reject negative amount', () => {
      const refundData = {
        amount: -10
      };
      
      const { error } = validateRefund(refundData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('positive');
    });

    it('should reject invalid reason', () => {
      const refundData = {
        reason: 'invalid_reason'
      };
      
      const { error } = validateRefund(refundData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('must be one of');
    });

    it('should limit notes length', () => {
      const refundData = {
        notes: 'a'.repeat(501)
      };
      
      const { error } = validateRefund(refundData);
      
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('cannot exceed 500 characters');
    });
  });
});