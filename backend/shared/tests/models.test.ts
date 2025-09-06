import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User, Product, Order, UserInteraction } from '../models';

describe('Database Models', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await UserInteraction.deleteMany({});
  });

  describe('User Model', () => {
    it('should create a valid user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'customer' as const
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should compare passwords correctly', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      const isMatch = await savedUser.comparePassword('Password123!');
      expect(isMatch).toBe(true);

      const isNotMatch = await savedUser.comparePassword('WrongPassword');
      expect(isNotMatch).toBe(false);
    });
  });

  describe('Product Model', () => {
    it('should create a valid product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product with a detailed description.',
        price: 29.99,
        category: 'electronics',
        images: ['https://example.com/image1.jpg'],
        inventory: 10,
        tags: ['test', 'electronics']
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.name).toBe(productData.name);
      expect(savedProduct.price).toBe(productData.price);
      expect(savedProduct.category).toBe(productData.category);
      expect(savedProduct.inventory).toBe(productData.inventory);
      expect(savedProduct.isActive).toBe(true); // Default value
    });

    it('should validate price is positive', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product.',
        price: -10,
        category: 'electronics',
        images: ['https://example.com/image1.jpg'],
        inventory: 10
      };

      const product = new Product(productData);
      await expect(product.save()).rejects.toThrow();
    });

    it('should check inventory availability', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product.',
        price: 29.99,
        category: 'electronics',
        images: ['https://example.com/image1.jpg'],
        inventory: 5
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.isInStock(3)).toBe(true);
      expect(savedProduct.isInStock(5)).toBe(true);
      expect(savedProduct.isInStock(6)).toBe(false);
    });
  });

  describe('Order Model', () => {
    let user: any;
    let product: any;

    beforeEach(async () => {
      // Create test user
      user = new User({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zipCode: '90210',
          country: 'United States'
        }
      });
      await user.save();

      // Create test product
      product = new Product({
        name: 'Test Product',
        description: 'This is a test product.',
        price: 29.99,
        category: 'electronics',
        images: ['https://example.com/image1.jpg'],
        inventory: 10
      });
      await product.save();
    });

    it('should create a valid order', async () => {
      const orderData = {
        userId: user._id,
        items: [{
          productId: product._id,
          quantity: 2,
          price: product.price,
          name: product.name
        }],
        totalAmount: product.price * 2,
        shippingAddress: user.address,
        paymentMethod: 'credit_card'
      };

      const order = new Order(orderData);
      const savedOrder = await order.save();

      expect(savedOrder.userId.toString()).toBe(user._id.toString());
      expect(savedOrder.items).toHaveLength(1);
      expect(savedOrder.totalAmount).toBe(orderData.totalAmount);
      expect(savedOrder.status).toBe('pending'); // Default value
    });

    it('should validate total amount matches items', async () => {
      const orderData = {
        userId: user._id,
        items: [{
          productId: product._id,
          quantity: 2,
          price: product.price,
          name: product.name
        }],
        totalAmount: 100, // Wrong total
        shippingAddress: user.address,
        paymentMethod: 'credit_card'
      };

      const order = new Order(orderData);
      await expect(order.save()).rejects.toThrow();
    });
  });

  describe('UserInteraction Model', () => {
    let user: any;
    let product: any;

    beforeEach(async () => {
      user = new User({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      });
      await user.save();

      product = new Product({
        name: 'Test Product',
        description: 'This is a test product.',
        price: 29.99,
        category: 'electronics',
        images: ['https://example.com/image1.jpg'],
        inventory: 10
      });
      await product.save();
    });

    it('should create a valid user interaction', async () => {
      const interactionData = {
        userId: user._id,
        productId: product._id,
        interactionType: 'view' as const,
        sessionId: 'test-session-123',
        metadata: {
          duration: 60
        }
      };

      const interaction = new UserInteraction(interactionData);
      const savedInteraction = await interaction.save();

      expect(savedInteraction.userId.toString()).toBe(user._id.toString());
      expect(savedInteraction.productId.toString()).toBe(product._id.toString());
      expect(savedInteraction.interactionType).toBe('view');
      expect(savedInteraction.metadata?.duration).toBe(60);
    });

    it('should require quantity for cart_add interactions', async () => {
      const interactionData = {
        userId: user._id,
        productId: product._id,
        interactionType: 'cart_add' as const,
        sessionId: 'test-session-123'
        // Missing metadata.quantity
      };

      const interaction = new UserInteraction(interactionData);
      await expect(interaction.save()).rejects.toThrow();
    });
  });
});