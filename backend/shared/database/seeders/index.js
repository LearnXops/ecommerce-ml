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
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseSeeder = exports.DatabaseSeeder = void 0;
const connection_1 = require("../connection");
const userSeeder_1 = require("./userSeeder");
const productSeeder_1 = require("./productSeeder");
const orderSeeder_1 = require("./orderSeeder");
const userInteractionSeeder_1 = require("./userInteractionSeeder");
const logger_1 = require("../../utils/logger");
class DatabaseSeeder {
    constructor() { }
    static getInstance() {
        if (!DatabaseSeeder.instance) {
            DatabaseSeeder.instance = new DatabaseSeeder();
        }
        return DatabaseSeeder.instance;
    }
    async seedAll(options = {}) {
        const { users = true, products = true, orders = true, interactions = true, clearExisting = false } = options;
        try {
            logger_1.logger.info('Starting database seeding process...');
            if (!connection_1.dbConnection.getConnectionStatus()) {
                await connection_1.dbConnection.connect();
            }
            if (clearExisting) {
                await this.clearDatabase();
            }
            let seededUsers = [];
            let seededProducts = [];
            let seededOrders = [];
            if (users) {
                logger_1.logger.info('Seeding users...');
                seededUsers = await (0, userSeeder_1.seedUsers)();
                logger_1.logger.info(`Seeded ${seededUsers.length} users`);
            }
            if (products) {
                logger_1.logger.info('Seeding products...');
                seededProducts = await (0, productSeeder_1.seedProducts)();
                logger_1.logger.info(`Seeded ${seededProducts.length} products`);
            }
            if (orders && seededUsers.length > 0 && seededProducts.length > 0) {
                logger_1.logger.info('Seeding orders...');
                seededOrders = await (0, orderSeeder_1.seedOrders)(seededUsers, seededProducts);
                logger_1.logger.info(`Seeded ${seededOrders.length} orders`);
            }
            if (interactions && seededUsers.length > 0 && seededProducts.length > 0) {
                logger_1.logger.info('Seeding user interactions...');
                const seededInteractions = await (0, userInteractionSeeder_1.seedUserInteractions)(seededUsers, seededProducts);
                logger_1.logger.info(`Seeded ${seededInteractions.length} user interactions`);
            }
            logger_1.logger.info('Database seeding completed successfully!');
        }
        catch (error) {
            logger_1.logger.error('Database seeding failed:', error);
            throw error;
        }
    }
    async clearDatabase() {
        try {
            logger_1.logger.info('Clearing existing database data...');
            const { User, Product, Order, UserInteraction } = await Promise.resolve().then(() => __importStar(require('../../models')));
            await Promise.all([
                UserInteraction.deleteMany({}),
                Order.deleteMany({}),
                Product.deleteMany({}),
                User.deleteMany({})
            ]);
            logger_1.logger.info('Database cleared successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to clear database:', error);
            throw error;
        }
    }
    async seedUsers() {
        return await (0, userSeeder_1.seedUsers)();
    }
    async seedProducts() {
        return await (0, productSeeder_1.seedProducts)();
    }
    async seedOrders(users, products) {
        return await (0, orderSeeder_1.seedOrders)(users, products);
    }
    async seedUserInteractions(users, products) {
        return await (0, userInteractionSeeder_1.seedUserInteractions)(users, products);
    }
}
exports.DatabaseSeeder = DatabaseSeeder;
exports.databaseSeeder = DatabaseSeeder.getInstance();
if (require.main === module) {
    const args = process.argv.slice(2);
    const clearExisting = args.includes('--clear');
    const usersOnly = args.includes('--users-only');
    const productsOnly = args.includes('--products-only');
    let options = { clearExisting };
    if (usersOnly) {
        options = { ...options, users: true, products: false, orders: false, interactions: false };
    }
    else if (productsOnly) {
        options = { ...options, users: false, products: true, orders: false, interactions: false };
    }
    exports.databaseSeeder.seedAll(options)
        .then(() => {
        logger_1.logger.info('Seeding completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error('Seeding failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map