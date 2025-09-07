import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_products';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
    throw error;
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (error: any) => {
  logger.error('Mongoose connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.info('Mongoose disconnected from MongoDB');
});