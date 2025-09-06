#!/usr/bin/env ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const connection_1 = require("../database/connection");
const seeders_1 = require("../database/seeders");
const logger_1 = require("../utils/logger");
dotenv_1.default.config();
async function main() {
    try {
        const args = process.argv.slice(2);
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
        logger_1.logger.info('Starting database seeding...');
        await connection_1.dbConnection.connect();
        let seedOptions = { clearExisting: options.clearExisting };
        if (options.usersOnly) {
            seedOptions = { ...seedOptions, users: true, products: false, orders: false, interactions: false };
        }
        else if (options.productsOnly) {
            seedOptions = { ...seedOptions, users: false, products: true, orders: false, interactions: false };
        }
        else if (options.ordersOnly) {
            seedOptions = { ...seedOptions, users: false, products: false, orders: true, interactions: false };
        }
        else if (options.interactionsOnly) {
            seedOptions = { ...seedOptions, users: false, products: false, orders: false, interactions: true };
        }
        await seeders_1.databaseSeeder.seedAll(seedOptions);
        logger_1.logger.info('Database seeding completed successfully!');
        const { User, Product, Order, UserInteraction } = await Promise.resolve().then(() => __importStar(require('../models')));
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
    }
    catch (error) {
        logger_1.logger.error('Database seeding failed:', error);
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
process.on('SIGINT', async () => {
    logger_1.logger.info('Received SIGINT, closing database connection...');
    await connection_1.dbConnection.disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger_1.logger.info('Received SIGTERM, closing database connection...');
    await connection_1.dbConnection.disconnect();
    process.exit(0);
});
main();
//# sourceMappingURL=seed-database.js.map