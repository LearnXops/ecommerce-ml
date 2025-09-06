#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { dbConnection } from '../database/connection';
import { databaseSeeder } from '../database/seeders';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Parse command line arguments
    const options = {
      clearExisting: args.includes('--clear') || args.includes('-c'),
      usersOnly: args.includes('--users-only') || args.includes('-u'),
      productsOnly: args.includes('--products-only') || args.includes('-p'),
      ordersOnly: args.includes('--orders-only') || args.includes('-o'),
      interactionsOnly: args.includes('--interactions-only') || args.includes('-i'),
      help: args.includes('--help') || args.includes('-h')
    };

    if (options.help) {
      console.log(`
Database Seeding Script

Usage: npm run seed [options]

Options:
  --clear, -c              Clear existing data before seeding
  --users-only, -u         Seed only users
  --products-only, -p      Seed only products
  --orders-only, -o        Seed only orders
  --interactions-only, -i  Seed only user interactions
  --help, -h               Show this help message

Examples:
  npm run seed                    # Seed all data
  npm run seed --clear            # Clear and seed all data
  npm run seed --users-only       # Seed only users
  npm run seed --clear --users-only  # Clear and seed only users
      `);
      process.exit(0);
    }

    logger.info('Starting database seeding...');
    
    // Connect to database
    await dbConnection.connect();
    
    // Determine what to seed
    let seedOptions: any = { clearExisting: options.clearExisting };
    
    if (options.usersOnly) {
      seedOptions = { ...seedOptions, users: true, products: false, orders: false, interactions: false };
    } else if (options.productsOnly) {
      seedOptions = { ...seedOptions, users: false, products: true, orders: false, interactions: false };
    } else if (options.ordersOnly) {
      seedOptions = { ...seedOptions, users: false, products: false, orders: true, interactions: false };
    } else if (options.interactionsOnly) {
      seedOptions = { ...seedOptions, users: false, products: false, orders: false, interactions: true };
    }
    // If no specific option is provided, seed everything (default behavior)
    
    // Run seeding
    await databaseSeeder.seedAll(seedOptions);
    
    logger.info('Database seeding completed successfully!');
    
    // Show summary
    const { User, Product, Order, UserInteraction } = await import('../models');
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    const interactionCount = await UserInteraction.countDocuments();
    
    console.log('\n=== Database Summary ===');
    console.log(`Users: ${userCount}`);
    console.log(`Products: ${productCount}`);
    console.log(`Orders: ${orderCount}`);
    console.log(`User Interactions: ${interactionCount}`);
    console.log('========================\n');
    
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connection...');
  await dbConnection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connection...');
  await dbConnection.disconnect();
  process.exit(0);
});

// Run the script
main();