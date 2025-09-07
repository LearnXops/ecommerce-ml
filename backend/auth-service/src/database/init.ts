import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/ecommerce';

export async function initializeDatabase(): Promise<void> {
  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}