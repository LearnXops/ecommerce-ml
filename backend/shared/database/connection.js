"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConnection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
class DatabaseConnection {
    constructor() {
        this.isConnected = false;
        this.connectionString = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/ecommerce';
        this.options = {
            maxRetries: 5,
            retryDelay: 5000,
            timeout: 30000
        };
    }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    async connect() {
        if (this.isConnected) {
            logger_1.logger.info('Database already connected');
            return;
        }
        let retries = 0;
        const { maxRetries, retryDelay, timeout } = this.options;
        while (retries < maxRetries) {
            try {
                logger_1.logger.info(`Attempting to connect to MongoDB (attempt ${retries + 1}/${maxRetries})`);
                await mongoose_1.default.connect(this.connectionString, {
                    serverSelectionTimeoutMS: timeout,
                    socketTimeoutMS: timeout,
                    family: 4,
                });
                this.isConnected = true;
                logger_1.logger.info('Successfully connected to MongoDB');
                mongoose_1.default.connection.on('error', (error) => {
                    logger_1.logger.error('MongoDB connection error:', error);
                    this.isConnected = false;
                });
                mongoose_1.default.connection.on('disconnected', () => {
                    logger_1.logger.warn('MongoDB disconnected');
                    this.isConnected = false;
                });
                mongoose_1.default.connection.on('reconnected', () => {
                    logger_1.logger.info('MongoDB reconnected');
                    this.isConnected = true;
                });
                return;
            }
            catch (error) {
                retries++;
                logger_1.logger.error(`MongoDB connection attempt ${retries} failed:`, error);
                if (retries >= maxRetries) {
                    logger_1.logger.error('Max connection retries reached. Exiting...');
                    throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
                }
                logger_1.logger.info(`Retrying in ${retryDelay / 1000} seconds...`);
                await this.delay(retryDelay);
            }
        }
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        try {
            await mongoose_1.default.disconnect();
            this.isConnected = false;
            logger_1.logger.info('Disconnected from MongoDB');
        }
        catch (error) {
            logger_1.logger.error('Error disconnecting from MongoDB:', error);
            throw error;
        }
    }
    getConnectionStatus() {
        return this.isConnected && mongoose_1.default.connection.readyState === 1;
    }
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'error', message: 'Database not connected' };
            }
            await mongoose_1.default.connection.db.admin().ping();
            return { status: 'healthy', message: 'Database connection is healthy' };
        }
        catch (error) {
            return {
                status: 'error',
                message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.dbConnection = DatabaseConnection.getInstance();
exports.default = exports.dbConnection;
//# sourceMappingURL=connection.js.map