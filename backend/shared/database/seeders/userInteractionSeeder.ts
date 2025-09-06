import { UserInteraction } from '../../models/UserInteraction';
import { User } from '../../models/User';
import { Product } from '../../models/Product';
import { Order } from '../../models/Order';
import { logger } from '../../utils/logger';

export async function seedUserInteractions(users?: any[], products?: any[]): Promise<any[]> {
  try {
    // Check if interactions already exist
    const existingInteractionsCount = await UserInteraction.countDocuments();
    if (existingInteractionsCount > 0) {
      logger.info(`Found ${existingInteractionsCount} existing interactions, skipping interaction seeding`);
      return await UserInteraction.find().lean();
    }

    // Get users and products if not provided
    if (!users) {
      users = await User.find({ role: 'customer' }).lean();
    }
    if (!products) {
      products = await Product.find({ isActive: true }).lean();
    }

    if (users.length === 0 || products.length === 0) {
      logger.warn('No users or products found, skipping interaction seeding');
      return [];
    }

    logger.info('Creating sample user interactions...');
    const createdInteractions = [];

    // Generate interactions for each user
    for (const user of users) {
      try {
        const userInteractions = await generateUserInteractions(user, products);
        createdInteractions.push(...userInteractions);
        
        logger.info(`Created ${userInteractions.length} interactions for user ${user.email}`);
      } catch (error) {
        logger.error(`Failed to create interactions for user ${user.email}:`, error);
        // Continue with other users even if one fails
      }
    }

    // Generate interactions based on existing orders
    const orders = await Order.find().populate('userId').lean();
    for (const order of orders) {
      try {
        const orderInteractions = await generateOrderBasedInteractions(order);
        createdInteractions.push(...orderInteractions);
      } catch (error) {
        logger.error(`Failed to create order-based interactions for order ${order._id}:`, error);
      }
    }

    logger.info(`Successfully created ${createdInteractions.length} user interactions`);
    return createdInteractions;
  } catch (error) {
    logger.error('Failed to seed user interactions:', error);
    throw error;
  }
}

async function generateUserInteractions(user: any, products: any[]): Promise<any[]> {
  const interactions = [];
  const sessionId = generateSessionId();
  
  // Simulate user browsing behavior over the last 30 days
  const daysToSimulate = 30;
  const interactionsPerDay = Math.floor(Math.random() * 10) + 5; // 5-15 interactions per day
  
  for (let day = 0; day < daysToSimulate; day++) {
    const dayInteractions = Math.floor(Math.random() * interactionsPerDay) + 1;
    const currentSessionId = `${sessionId}_day${day}`;
    
    for (let i = 0; i < dayInteractions; i++) {
      const interactionDate = new Date();
      interactionDate.setDate(interactionDate.getDate() - day);
      interactionDate.setHours(
        Math.floor(Math.random() * 16) + 8, // 8 AM to 11 PM
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );

      // Select random product
      const product = products[Math.floor(Math.random() * products.length)];
      
      // Determine interaction type based on probability
      const interactionType = getRandomInteractionType();
      
      const interactionData: any = {
        userId: user._id,
        productId: product._id,
        interactionType,
        timestamp: interactionDate,
        sessionId: currentSessionId
      };

      // Add metadata based on interaction type
      switch (interactionType) {
        case 'view':
          interactionData.metadata = {
            duration: Math.floor(Math.random() * 300) + 10 // 10-310 seconds
          };
          break;
        case 'cart_add':
          interactionData.metadata = {
            quantity: Math.floor(Math.random() * 3) + 1, // 1-3 items
            price: product.price
          };
          break;
        case 'wishlist_add':
          interactionData.metadata = {
            price: product.price
          };
          break;
        case 'purchase':
          interactionData.metadata = {
            quantity: Math.floor(Math.random() * 2) + 1, // 1-2 items
            price: product.price
          };
          break;
      }

      try {
        const interaction = new UserInteraction(interactionData);
        const savedInteraction = await interaction.save();
        interactions.push(savedInteraction);
      } catch (error) {
        logger.error(`Failed to create interaction for user ${user.email}:`, error);
      }
    }
  }

  return interactions;
}

async function generateOrderBasedInteractions(order: any): Promise<any[]> {
  const interactions = [];
  const sessionId = generateSessionId();
  
  // Create interactions for each item in the order
  for (const item of order.items) {
    try {
      // Create view interaction (user viewed product before purchasing)
      const viewInteraction = new UserInteraction({
        userId: order.userId._id || order.userId,
        productId: item.productId,
        interactionType: 'view',
        timestamp: new Date(order.createdAt.getTime() - Math.random() * 3600000), // Up to 1 hour before order
        sessionId: sessionId,
        metadata: {
          duration: Math.floor(Math.random() * 180) + 30 // 30-210 seconds
        }
      });
      const savedViewInteraction = await viewInteraction.save();
      interactions.push(savedViewInteraction);

      // Create cart_add interaction
      const cartAddInteraction = new UserInteraction({
        userId: order.userId._id || order.userId,
        productId: item.productId,
        interactionType: 'cart_add',
        timestamp: new Date(order.createdAt.getTime() - Math.random() * 1800000), // Up to 30 minutes before order
        sessionId: sessionId,
        metadata: {
          quantity: item.quantity,
          price: item.price
        }
      });
      const savedCartAddInteraction = await cartAddInteraction.save();
      interactions.push(savedCartAddInteraction);

      // Create purchase interaction
      const purchaseInteraction = new UserInteraction({
        userId: order.userId._id || order.userId,
        productId: item.productId,
        interactionType: 'purchase',
        timestamp: order.createdAt,
        sessionId: sessionId,
        metadata: {
          quantity: item.quantity,
          price: item.price
        }
      });
      const savedPurchaseInteraction = await purchaseInteraction.save();
      interactions.push(savedPurchaseInteraction);

    } catch (error) {
      logger.error(`Failed to create order-based interaction for product ${item.productId}:`, error);
    }
  }

  return interactions;
}

function getRandomInteractionType(): 'view' | 'cart_add' | 'purchase' | 'wishlist_add' {
  const random = Math.random();
  
  // Weighted probabilities (view is most common, purchase is least common)
  if (random < 0.6) return 'view';           // 60% chance
  if (random < 0.8) return 'cart_add';       // 20% chance
  if (random < 0.95) return 'wishlist_add';  // 15% chance
  return 'purchase';                         // 5% chance
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function createTestInteraction(
  userId: string, 
  productId: string, 
  interactionType: 'view' | 'cart_add' | 'purchase' | 'wishlist_add',
  overrides: Partial<any> = {}
): Promise<any> {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const interactionData: any = {
      userId: user._id,
      productId: product._id,
      interactionType,
      timestamp: new Date(),
      sessionId: generateSessionId(),
      ...overrides
    };

    // Add default metadata based on interaction type
    if (!interactionData.metadata) {
      switch (interactionType) {
        case 'view':
          interactionData.metadata = { duration: 60 };
          break;
        case 'cart_add':
          interactionData.metadata = { quantity: 1, price: product.price };
          break;
        case 'wishlist_add':
          interactionData.metadata = { price: product.price };
          break;
        case 'purchase':
          interactionData.metadata = { quantity: 1, price: product.price };
          break;
      }
    }

    const interaction = new UserInteraction(interactionData);
    const savedInteraction = await interaction.save();
    
    logger.info(`Created test interaction: ${interactionType} for user ${user.email} on product ${product.name}`);
    return savedInteraction;
  } catch (error) {
    logger.error('Failed to create test interaction:', error);
    throw error;
  }
}

export async function generateRecommendationTrainingData(): Promise<any[]> {
  try {
    logger.info('Generating additional training data for ML recommendations...');
    
    const users = await User.find({ role: 'customer' }).lean();
    const products = await Product.find({ isActive: true }).lean();
    
    if (users.length === 0 || products.length === 0) {
      logger.warn('No users or products found for training data generation');
      return [];
    }

    const trainingInteractions = [];
    
    // Create product affinity patterns (users who like similar products)
    const categories = [...new Set(products.map(p => p.category))];
    
    for (const category of categories) {
      const categoryProducts = products.filter(p => p.category === category);
      const interestedUsers = users.slice(0, Math.floor(users.length * 0.3)); // 30% of users interested in each category
      
      for (const user of interestedUsers) {
        const sessionId = generateSessionId();
        
        // Create multiple interactions with products in this category
        for (let i = 0; i < Math.min(3, categoryProducts.length); i++) {
          const product = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
          
          const interaction = new UserInteraction({
            userId: user._id,
            productId: product._id,
            interactionType: Math.random() > 0.7 ? 'cart_add' : 'view',
            timestamp: new Date(Date.now() - Math.random() * 2592000000), // Last 30 days
            sessionId: sessionId,
            metadata: {
              duration: Math.floor(Math.random() * 200) + 30,
              quantity: Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : undefined,
              price: product.price
            }
          });
          
          try {
            const savedInteraction = await interaction.save();
            trainingInteractions.push(savedInteraction);
          } catch (error) {
            logger.error(`Failed to create training interaction:`, error);
          }
        }
      }
    }
    
    logger.info(`Generated ${trainingInteractions.length} additional training interactions`);
    return trainingInteractions;
  } catch (error) {
    logger.error('Failed to generate recommendation training data:', error);
    throw error;
  }
}