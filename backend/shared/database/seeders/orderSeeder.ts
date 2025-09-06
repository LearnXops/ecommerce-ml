import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { Product } from '../../models/Product';
import { logger } from '../../utils/logger';

export async function seedOrders(users?: any[], products?: any[]): Promise<any[]> {
  try {
    // Check if orders already exist
    const existingOrdersCount = await Order.countDocuments();
    if (existingOrdersCount > 0) {
      logger.info(`Found ${existingOrdersCount} existing orders, skipping order seeding`);
      return await Order.find().lean();
    }

    // Get users and products if not provided
    if (!users) {
      users = await User.find({ role: 'customer' }).lean();
    }
    if (!products) {
      products = await Product.find({ isActive: true }).lean();
    }

    if (users.length === 0 || products.length === 0) {
      logger.warn('No users or products found, skipping order seeding');
      return [];
    }

    logger.info('Creating sample orders...');
    const createdOrders = [];

    // Create orders for different scenarios
    const orderScenarios = [
      {
        status: 'delivered' as const,
        paymentStatus: 'completed' as const,
        itemCount: 2,
        daysAgo: 30
      },
      {
        status: 'delivered' as const,
        paymentStatus: 'completed' as const,
        itemCount: 1,
        daysAgo: 25
      },
      {
        status: 'shipped' as const,
        paymentStatus: 'completed' as const,
        itemCount: 3,
        daysAgo: 5
      },
      {
        status: 'processing' as const,
        paymentStatus: 'completed' as const,
        itemCount: 1,
        daysAgo: 2
      },
      {
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        itemCount: 2,
        daysAgo: 1
      },
      {
        status: 'delivered' as const,
        paymentStatus: 'completed' as const,
        itemCount: 4,
        daysAgo: 15
      },
      {
        status: 'cancelled' as const,
        paymentStatus: 'refunded' as const,
        itemCount: 1,
        daysAgo: 10
      },
      {
        status: 'delivered' as const,
        paymentStatus: 'completed' as const,
        itemCount: 2,
        daysAgo: 45
      }
    ];

    const paymentMethods = ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'];

    for (let i = 0; i < orderScenarios.length && i < users.length; i++) {
      try {
        const scenario = orderScenarios[i];
        const user = users[i];
        
        // Select random products for this order
        const selectedProducts = getRandomProducts(products, scenario.itemCount);
        
        // Create order items
        const orderItems = selectedProducts.map(product => ({
          productId: product._id,
          quantity: Math.floor(Math.random() * 3) + 1, // 1-3 items
          price: product.price,
          name: product.name
        }));

        // Calculate total
        const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);

        // Create order date
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - scenario.daysAgo);

        const orderData = {
          userId: user._id,
          items: orderItems,
          totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
          status: scenario.status,
          paymentStatus: scenario.paymentStatus,
          shippingAddress: user.address || {
            street: '123 Default Street',
            city: 'Default City',
            state: 'CA',
            zipCode: '90210',
            country: 'United States'
          },
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          createdAt: orderDate,
          updatedAt: orderDate
        };

        // Add tracking number for shipped/delivered orders
        if (['shipped', 'delivered'].includes(scenario.status)) {
          orderData['trackingNumber'] = `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        }

        // Add notes for some orders
        if (Math.random() > 0.7) {
          const notes = [
            'Please leave at front door',
            'Call before delivery',
            'Gift wrapping requested',
            'Expedited shipping',
            'Customer requested specific delivery time'
          ];
          orderData['notes'] = notes[Math.floor(Math.random() * notes.length)];
        }

        const order = new Order(orderData);
        const savedOrder = await order.save();
        createdOrders.push(savedOrder);
        
        logger.info(`Created order: ${savedOrder._id} for user ${user.email} (${scenario.status})`);
      } catch (error) {
        logger.error(`Failed to create order ${i + 1}:`, error);
        // Continue with other orders even if one fails
      }
    }

    // Create additional random orders for remaining users
    const remainingUsers = users.slice(orderScenarios.length);
    for (const user of remainingUsers.slice(0, 5)) { // Limit to 5 additional orders
      try {
        const randomProducts = getRandomProducts(products, Math.floor(Math.random() * 3) + 1);
        const orderItems = randomProducts.map(product => ({
          productId: product._id,
          quantity: Math.floor(Math.random() * 2) + 1,
          price: product.price,
          name: product.name
        }));

        const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        const daysAgo = Math.floor(Math.random() * 60) + 1; // 1-60 days ago
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - daysAgo);

        const orderData = {
          userId: user._id,
          items: orderItems,
          totalAmount: Math.round(totalAmount * 100) / 100,
          status: 'delivered' as const,
          paymentStatus: 'completed' as const,
          shippingAddress: user.address || {
            street: '123 Default Street',
            city: 'Default City',
            state: 'CA',
            zipCode: '90210',
            country: 'United States'
          },
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          createdAt: orderDate,
          updatedAt: orderDate,
          trackingNumber: `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        };

        const order = new Order(orderData);
        const savedOrder = await order.save();
        createdOrders.push(savedOrder);
        
        logger.info(`Created additional order: ${savedOrder._id} for user ${user.email}`);
      } catch (error) {
        logger.error(`Failed to create additional order for user ${user.email}:`, error);
      }
    }

    logger.info(`Successfully created ${createdOrders.length} orders`);
    return createdOrders;
  } catch (error) {
    logger.error('Failed to seed orders:', error);
    throw error;
  }
}

function getRandomProducts(products: any[], count: number): any[] {
  const shuffled = [...products].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, products.length));
}

export async function createTestOrder(userId: string, productIds: string[], overrides: Partial<any> = {}): Promise<any> {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length === 0) {
      throw new Error('No products found');
    }

    const orderItems = products.map(product => ({
      productId: product._id,
      quantity: 1,
      price: product.price,
      name: product.name
    }));

    const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    const orderData = {
      userId: user._id,
      items: orderItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: 'pending' as const,
      paymentStatus: 'pending' as const,
      shippingAddress: user.address || {
        street: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        zipCode: '90210',
        country: 'United States'
      },
      paymentMethod: 'credit_card',
      ...overrides
    };

    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    logger.info(`Created test order: ${savedOrder._id} for user ${user.email}`);
    return savedOrder;
  } catch (error) {
    logger.error('Failed to create test order:', error);
    throw error;
  }
}