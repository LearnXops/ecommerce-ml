import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/ecommerce';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export const dbConnection = connectDB;
export default connectDB;