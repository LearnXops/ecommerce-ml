import { dbConnection } from '../connection';
import { seedUsers } from './userSeeder';
import { seedProducts } from './productSeeder';
import { seedOrders } from './orderSeeder';
import { seedUserInteractions } from './userInteractionSeeder';
import { logger } from '../../utils/logger';

export interface SeedOptions {
  users?: boolean;
  products?: boolean;
  orders?: boolean;
  interactions?: boolean;
  clearExisting?: boolean;
}

export class DatabaseSeeder {
  private static instance: DatabaseSeeder;

  private constructor() {}

  public static getInstance(): DatabaseSeeder {
    if (!DatabaseSeeder.instance) {
      DatabaseSeeder.instance = new DatabaseSeeder();
    }
    return DatabaseSeeder.instance;
  }

  public async seedAll(options: SeedOptions = {}): Promise<void> {
    const {
      users = true,
      products = true,
      orders = true,
      interactions = true,
      clearExisting = false
    } = options;

    try {
      logger.info('Starting database seeding process...');

      // Ensure database connection
      if (!dbConnection.getConnectionStatus()) {
        await dbConnection.connect();
      }

      // Clear existing data if requested
      if (clearExisting) {
        await this.clearDatabase();
      }

      // Seed in order of dependencies
      let seededUsers: any[] = [];
      let seededProducts: any[] = [];
      let seededOrders: any[] = [];

      if (users) {
        logger.info('Seeding users...');
        seededUsers = await seedUsers();
        logger.info(`Seeded ${seededUsers.length} users`);
      }

      if (products) {
        logger.info('Seeding products...');
        seededProducts = await seedProducts();
        logger.info(`Seeded ${seededProducts.length} products`);
      }

      if (orders && seededUsers.length > 0 && seededProducts.length > 0) {
        logger.info('Seeding orders...');
        seededOrders = await seedOrders(seededUsers, seededProducts);
        logger.info(`Seeded ${seededOrders.length} orders`);
      }

      if (interactions && seededUsers.length > 0 && seededProducts.length > 0) {
        logger.info('Seeding user interactions...');
        const seededInteractions = await seedUserInteractions(seededUsers, seededProducts);
        logger.info(`Seeded ${seededInteractions.length} user interactions`);
      }

      logger.info('Database seeding completed successfully!');
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  public async clearDatabase(): Promise<void> {
    try {
      logger.info('Clearing existing database data...');
      
      const { User, Product, Order, UserInteraction } = await import('../../models');
      
      await Promise.all([
        UserInteraction.deleteMany({}),
        Order.deleteMany({}),
        Product.deleteMany({}),
        User.deleteMany({})
      ]);

      logger.info('Database cleared successfully');
    } catch (error) {
      logger.error('Failed to clear database:', error);
      throw error;
    }
  }

  public async seedUsers(): Promise<any[]> {
    return await seedUsers();
  }

  public async seedProducts(): Promise<any[]> {
    return await seedProducts();
  }

  public async seedOrders(users?: any[], products?: any[]): Promise<any[]> {
    return await seedOrders(users, products);
  }

  public async seedUserInteractions(users?: any[], products?: any[]): Promise<any[]> {
    return await seedUserInteractions(users, products);
  }
}

export const databaseSeeder = DatabaseSeeder.getInstance();

// CLI interface for running seeders
if (require.main === module) {
  const args = process.argv.slice(2);
  const clearExisting = args.includes('--clear');
  const usersOnly = args.includes('--users-only');
  const productsOnly = args.includes('--products-only');

  let options: SeedOptions = { clearExisting };

  if (usersOnly) {
    options = { ...options, users: true, products: false, orders: false, interactions: false };
  } else if (productsOnly) {
    options = { ...options, users: false, products: true, orders: false, interactions: false };
  }

  databaseSeeder.seedAll(options)
    .then(() => {
      logger.info('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}