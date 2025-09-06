import { 
  validateCartItem, 
  validateCartUpdate, 
  validateBulkCartOperation, 
  validateCartMerge 
} from '../validation/cartValidation';

describe('Cart Validation', () => {
  describe('validateCartItem', () => {
    const validCartItem = {
      productId: '507f1f77bcf86cd799439011',
      quantity: 2
    };

    it('should validate a correct cart item', () => {
      const { error, value } = validateCartItem(validCartItem);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(validCartItem);
    });

    it('should require productId field', () => {
      const item = { ...validCartItem };
      delete (item as any).productId;
      
      const { error } = validateCartItem(item);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('is required');
    });

    it('should validate productId format', () => {
      const invalidId = { ...validCartItem, productId: 'invalid-id' };
      const { error } = validateCartItem(invalidId);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid MongoDB ObjectId');
    });

    it('should require quantity field', () => {
      const item = { ...validCartItem };
      delete (item as any).quantity;
      
      const { error } = validateCartItem(item);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('is required');
    });

    it('should validate quantity is positive integer', () => {
      const zeroQuantity = { ...validCartItem, quantity: 0 };
      const { error: zeroError } = validateCartItem(zeroQuantity);
      expect(zeroError).toBeDefined();
      expect(zeroError?.details[0].message).toContain('at least 1');

      const negativeQuantity = { ...validCartItem, quantity: -1 };
      const { error: negativeError } = validateCartItem(negativeQuantity);
      expect(negativeError).toBeDefined();
      expect(negativeError?.details[0].message).toContain('at least 1');

      const floatQuantity = { ...validCartItem, quantity: 2.5 };
      const { error: floatError } = validateCartItem(floatQuantity);
      expect(floatError).toBeDefined();
      expect(floatError?.details[0].message).toContain('integer');
    });

    it('should validate quantity maximum', () => {
      const highQuantity = { ...validCartItem, quantity: 101 };
      const { error } = validateCartItem(highQuantity);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('cannot exceed 100');
    });
  });

  describe('validateCartUpdate', () => {
    it('should validate quantity update', () => {
      const updateData = { quantity: 5 };
      const { error, value } = validateCartUpdate(updateData);
      expect(error).toBeUndefined();
      expect(value.quantity).toBe(5);
    });

    it('should allow zero quantity for removal', () => {
      const updateData = { quantity: 0 };
      const { error, value } = validateCartUpdate(updateData);
      expect(error).toBeUndefined();
      expect(value.quantity).toBe(0);
    });

    it('should require quantity field', () => {
      const { error } = validateCartUpdate({});
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('is required');
    });

    it('should validate quantity constraints', () => {
      const negativeQuantity = { quantity: -1 };
      const { error: negativeError } = validateCartUpdate(negativeQuantity);
      expect(negativeError).toBeDefined();
      expect(negativeError?.details[0].message).toContain('at least 0');

      const highQuantity = { quantity: 101 };
      const { error: highError } = validateCartUpdate(highQuantity);
      expect(highError).toBeDefined();
      expect(highError?.details[0].message).toContain('cannot exceed 100');
    });
  });

  describe('validateBulkCartOperation', () => {
    const validBulkOperation = {
      items: [
        { productId: '507f1f77bcf86cd799439011', quantity: 2 },
        { productId: '507f1f77bcf86cd799439012', quantity: 1 }
      ]
    };

    it('should validate bulk cart operation', () => {
      const { error, value } = validateBulkCartOperation(validBulkOperation);
      expect(error).toBeUndefined();
      expect(value.items).toHaveLength(2);
    });

    it('should require items array', () => {
      const { error } = validateBulkCartOperation({});
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('is required');
    });

    it('should require at least one item', () => {
      const emptyItems = { items: [] };
      const { error } = validateBulkCartOperation(emptyItems);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('At least one item');
    });

    it('should limit maximum items', () => {
      const tooManyItems = {
        items: Array(51).fill({ productId: '507f1f77bcf86cd799439011', quantity: 1 })
      };
      const { error } = validateBulkCartOperation(tooManyItems);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('more than 50 items');
    });

    it('should validate individual items in bulk operation', () => {
      const invalidItems = {
        items: [
          { productId: 'invalid-id', quantity: 2 }
        ]
      };
      const { error } = validateBulkCartOperation(invalidItems);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid MongoDB ObjectId');
    });
  });

  describe('validateCartMerge', () => {
    it('should validate cart merge with default values', () => {
      const { error, value } = validateCartMerge({});
      expect(error).toBeUndefined();
      expect(value.guestCartItems).toEqual([]);
      expect(value.mergeStrategy).toBe('add');
    });

    it('should validate cart merge with guest items', () => {
      const mergeData = {
        guestCartItems: [
          { productId: '507f1f77bcf86cd799439011', quantity: 2 }
        ],
        mergeStrategy: 'replace'
      };

      const { error, value } = validateCartMerge(mergeData);
      expect(error).toBeUndefined();
      expect(value.guestCartItems).toHaveLength(1);
      expect(value.mergeStrategy).toBe('replace');
    });

    it('should validate merge strategy values', () => {
      const validStrategies = ['replace', 'add', 'keep_existing'];
      
      validStrategies.forEach(strategy => {
        const { error } = validateCartMerge({ mergeStrategy: strategy });
        expect(error).toBeUndefined();
      });

      const { error } = validateCartMerge({ mergeStrategy: 'invalid' });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be one of');
    });

    it('should limit guest cart items', () => {
      const tooManyItems = {
        guestCartItems: Array(51).fill({ productId: '507f1f77bcf86cd799439011', quantity: 1 })
      };
      const { error } = validateCartMerge(tooManyItems);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('more than 50 items');
    });

    it('should validate guest cart item format', () => {
      const invalidGuestItems = {
        guestCartItems: [
          { productId: 'invalid-id', quantity: 2 }
        ]
      };
      const { error } = validateCartMerge(invalidGuestItems);
      expect(error).toBeDefined();
    });
  });
});