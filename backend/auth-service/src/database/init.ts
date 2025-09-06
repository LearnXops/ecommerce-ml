import { dbConnection, User, logger } from 'shared';

export async function initializeDatabase(): Promise<void> {
  try {
    // Connect to database
    await dbConnection.connect();
    
    // Check database health
    const healthCheck = await dbConnection.healthCheck();
    logger.info('Database health check:', healthCheck);
    
    // Verify User model is accessible
    const userCount = await User.countDocuments();
    logger.info(`Found ${userCount} users in database`);
    
    logger.info('Database initialization completed successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  try {
    await dbConnection.disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
}