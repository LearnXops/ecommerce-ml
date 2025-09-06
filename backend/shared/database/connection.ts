import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { withDatabaseRetry } from '../utils/retry';

interface ConnectionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;
  private connectionString: string;
  private options: ConnectionOptions;

  private constructor() {
    this.connectionString = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/ecommerce';
    this.options = {
      maxRetries: 5,
      retryDelay: 5000,
      timeout: 30000
    };
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    let retries = 0;
    const { maxRetries, retryDelay, timeout } = this.options;

    while (retries < maxRetries!) {
      try {
        logger.info(`Attempting to connect to MongoDB (attempt ${retries + 1}/${maxRetries})`);
        
        await mongoose.connect(this.connectionString, {
          serverSelectionTimeoutMS: timeout!,
          socketTimeoutMS: timeout!,
          family: 4, // Use IPv4, skip trying IPv6
        });

        this.isConnected = true;
        logger.info('Successfully connected to MongoDB');
        
        // Handle connection events
        mongoose.connection.on('error', (error) => {
          logger.error('MongoDB connection error:', error);
          this.isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
          logger.warn('MongoDB disconnected');
          this.isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
          logger.info('MongoDB reconnected');
          this.isConnected = true;
        });

        return;
      } catch (error) {
        retries++;
        logger.error(`MongoDB connection attempt ${retries} failed:`, error);
        
        if (retries >= maxRetries!) {
          logger.error('Max connection retries reached. Exiting...');
          throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
        }
        
        logger.info(`Retrying in ${retryDelay! / 1000} seconds...`);
        await this.delay(retryDelay!);
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      if (!this.isConnected) {
        return { status: 'error', message: 'Database not connected' };
      }

      // Ping the database with retry logic
      await withDatabaseRetry(async () => {
        await mongoose.connection.db.admin().ping();
      });
      
      return { status: 'healthy', message: 'Database connection is healthy' };
    } catch (error) {
      return { 
        status: 'error', 
        message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Helper method to execute database operations with retry
  public async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    return withDatabaseRetry(operation);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const dbConnection = DatabaseConnection.getInstance();
export default dbConnection;