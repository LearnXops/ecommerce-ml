import { validateProduct, validateProductUpdate, validateProductQuery } from '../validation/productValidation';

describe('Product Validation', () => {
  describe('validateProduct', () => {
    const validProduct = {
      name: 'Test Product',
      description: 'This is a test product with a detailed description',
      price: 29.99,
      category: 'electronics',
      images: ['https://example.com/image1.jpg'],
      inventory: 10,
      tags: ['test', 'electronics']
    };

    it('should validate a correct product', () => {
      const { error, value } = validateProduct(validProduct);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(validProduct);
    });

    it('should require name field', () => {
      const product = { ...validProduct };
      delete (product as any).name;
      
      const { error } = validateProduct(product);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('is required');
    });

    it('should validate name length', () => {
      const shortName = { ...validProduct, name: 'A' };
      const { error: shortError } = validateProduct(shortName);
      expect(shortError).toBeDefined();
      expect(shortError?.details[0].message).toContain('at least 2 characters');

      const longName = { ...validProduct, name: 'A'.repeat(201) };
      const { error: longError } = validateProduct(longName);
      expect(longError).toBeDefined();
      expect(longError?.details[0].message).toContain('cannot exceed 200 characters');
    });

    it('should require description field', () => {
      const product = { ...validProduct };
      delete (product as any).description;
      
      const { error } = validateProduct(product);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('is required');
    });

    it('should validate description length', () => {
      const shortDesc = { ...validProduct, description: 'Short' };
      const { error: shortError } = validateProduct(shortDesc);
      expect(shortError).toBeDefined();
      expect(shortError?.details[0].message).toContain('at least 10 characters');

      const longDesc = { ...validProduct, description: 'A'.repeat(2001) };
      const { error: longError } = validateProduct(longDesc);
      expect(longError).toBeDefined();
      expect(longError?.details[0].message).toContain('cannot exceed 2000 characters');
    });

    it('should require price field', () => {
      const product = { ...validProduct };
      delete (product as any).price;
      
      const { error } = validateProduct(product);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('price is required');
    });

    it('should validate price is positive', () => {
      const negativePrice = { ...validProduct, price: -10 };
      const { error } = validateProduct(negativePrice);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('positive');
    });

    it('should validate price maximum', () => {
      const highPrice = { ...validProduct, price: 1000000 };
      const { error } = validateProduct(highPrice);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('999,999.99');
    });

    it('should require category field', () => {
      const product = { ...validProduct };
      delete (product as any).category;
      
      const { error } = validateProduct(product);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('category is required');
    });

    it('should validate category values', () => {
      const invalidCategory = { ...validProduct, category: 'invalid-category' };
      const { error } = validateProduct(invalidCategory);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be one of');
    });

    it('should require images field', () => {
      const product = { ...validProduct };
      delete (product as any).images;
      
      const { error } = validateProduct(product);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('images are required');
    });

    it('should validate images array length', () => {
      const noImages = { ...validProduct, images: [] };
      const { error: noImagesError } = validateProduct(noImages);
      expect(noImagesError).toBeDefined();
      expect(noImagesError?.details[0].message).toContain('at least 1 image');

      const tooManyImages = { ...validProduct, images: Array(11).fill('https://example.com/image.jpg') };
      const { error: tooManyError } = validateProduct(tooManyImages);
      expect(tooManyError).toBeDefined();
      expect(tooManyError?.details[0].message).toContain('more than 10 images');
    });

    it('should validate image URLs', () => {
      const invalidUrl = { ...validProduct, images: ['not-a-url'] };
      const { error } = validateProduct(invalidUrl);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid URL');
    });

    it('should require inventory field', () => {
      const product = { ...validProduct };
      delete (product as any).inventory;
      
      const { error } = validateProduct(product);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Inventory count is required');
    });

    it('should validate inventory is non-negative integer', () => {
      const negativeInventory = { ...validProduct, inventory: -1 };
      const { error: negativeError } = validateProduct(negativeInventory);
      expect(negativeError).toBeDefined();
      expect(negativeError?.details[0].message).toContain('cannot be negative');

      const floatInventory = { ...validProduct, inventory: 10.5 };
      const { error: floatError } = validateProduct(floatInventory);
      expect(floatError).toBeDefined();
      expect(floatError?.details[0].message).toContain('integer');
    });

    it('should validate tags array', () => {
      const tooManyTags = { ...validProduct, tags: Array(21).fill('tag') };
      const { error } = validateProduct(tooManyTags);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('more than 20 tags');
    });

    it('should set default values', () => {
      const productWithoutOptional = {
        name: 'Test Product',
        description: 'This is a test product with a detailed description',
        price: 29.99,
        category: 'electronics',
        images: ['https://example.com/image1.jpg'],
        inventory: 10
      };

      const { error, value } = validateProduct(productWithoutOptional);
      expect(error).toBeUndefined();
      expect(value.tags).toEqual([]);
      expect(value.isActive).toBe(true);
    });
  });

  describe('validateProductUpdate', () => {
    it('should validate partial updates', () => {
      const updateData = {
        name: 'Updated Product Name',
        price: 49.99
      };

      const { error, value } = validateProductUpdate(updateData);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(updateData);
    });

    it('should require at least one field', () => {
      const { error } = validateProductUpdate({});
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('At least one field must be provided');
    });

    it('should validate individual fields when provided', () => {
      const invalidUpdate = { price: -10 };
      const { error } = validateProductUpdate(invalidUpdate);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('positive');
    });

    it('should allow partial field updates', () => {
      const validUpdates = [
        { name: 'New Name' },
        { price: 99.99 },
        { inventory: 50 },
        { category: 'clothing' },
        { tags: ['new', 'updated'] }
      ];

      validUpdates.forEach(update => {
        const { error } = validateProductUpdate(update);
        expect(error).toBeUndefined();
      });
    });
  });

  describe('validateProductQuery', () => {
    it('should validate query parameters with defaults', () => {
      const { error, value } = validateProductQuery({});
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
      expect(value.sortBy).toBe('createdAt');
      expect(value.sortOrder).toBe('desc');
    });

    it('should validate pagination parameters', () => {
      const validQuery = { page: 2, limit: 10 };
      const { error, value } = validateProductQuery(validQuery);
      expect(error).toBeUndefined();
      expect(value.page).toBe(2);
      expect(value.limit).toBe(10);
    });

    it('should validate page minimum', () => {
      const { error } = validateProductQuery({ page: 0 });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('greater than or equal to 1');
    });

    it('should validate limit maximum', () => {
      const { error } = validateProductQuery({ limit: 101 });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('less than or equal to 100');
    });

    it('should validate sortBy values', () => {
      const validSortBy = ['name', 'price', 'createdAt', 'inventory', 'category'];
      
      validSortBy.forEach(sortBy => {
        const { error } = validateProductQuery({ sortBy });
        expect(error).toBeUndefined();
      });

      const { error } = validateProductQuery({ sortBy: 'invalid' });
      expect(error).toBeDefined();
    });

    it('should validate sortOrder values', () => {
      const { error: ascError } = validateProductQuery({ sortOrder: 'asc' });
      expect(ascError).toBeUndefined();

      const { error: descError } = validateProductQuery({ sortOrder: 'desc' });
      expect(descError).toBeUndefined();

      const { error: invalidError } = validateProductQuery({ sortOrder: 'invalid' });
      expect(invalidError).toBeDefined();
    });

    it('should validate price range', () => {
      const validRange = { minPrice: 10, maxPrice: 100 };
      const { error } = validateProductQuery(validRange);
      expect(error).toBeUndefined();

      const invalidRange = { minPrice: 100, maxPrice: 10 };
      const { error: rangeError } = validateProductQuery(invalidRange);
      expect(rangeError).toBeDefined();
      expect(rangeError?.details[0].message).toContain('Minimum price cannot be greater than maximum price');
    });

    it('should validate category', () => {
      const { error } = validateProductQuery({ category: 'electronics' });
      expect(error).toBeUndefined();

      const { error: invalidError } = validateProductQuery({ category: 'invalid-category' });
      expect(invalidError).toBeDefined();
    });

    it('should handle tags as string or array', () => {
      const stringTags = { tags: 'electronics' };
      const { error: stringError, value: stringValue } = validateProductQuery(stringTags);
      expect(stringError).toBeUndefined();
      expect(stringValue.tags).toEqual(['electronics']);

      const arrayTags = { tags: ['electronics', 'gadgets'] };
      const { error: arrayError, value: arrayValue } = validateProductQuery(arrayTags);
      expect(arrayError).toBeUndefined();
      expect(arrayValue.tags).toEqual(['electronics', 'gadgets']);
    });

    it('should validate search parameter', () => {
      const { error } = validateProductQuery({ search: 'smartphone' });
      expect(error).toBeUndefined();

      const { error: emptyError } = validateProductQuery({ search: '' });
      expect(emptyError).toBeDefined();

      const { error: longError } = validateProductQuery({ search: 'A'.repeat(101) });
      expect(longError).toBeDefined();
    });

    it('should validate inStock parameter', () => {
      const { error: trueError } = validateProductQuery({ inStock: true });
      expect(trueError).toBeUndefined();

      const { error: falseError } = validateProductQuery({ inStock: false });
      expect(falseError).toBeUndefined();

      // Note: Joi may coerce string 'true' to boolean true, so this test checks for non-boolean values
      const { error: stringError } = validateProductQuery({ inStock: 'invalid' as any });
      expect(stringError).toBeDefined();
    });
  });
});