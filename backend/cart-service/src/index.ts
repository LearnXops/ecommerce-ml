import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { redisClient } from './config/redis';
import { connectDatabase, disconnectDatabase } from './config/database';
import cartRoutes from './routes/cartRoutes';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/cart', cartRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    const redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';
    
    // Check MongoDB connection
    const mongoose = require('mongoose');
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
      success: true,
      message: 'Cart service is healthy',
      timestamp: new Date().toISOString(),
      service: 'cart-service',
      version: '1.0.0',
      redis: redisStatus,
      mongodb: mongoStatus
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Cart service is unhealthy',
      timestamp: new Date().toISOString(),
      service: 'cart-service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Start listening
    app.listen(PORT, () => {
      logger.info(`Cart service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start cart service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redisClient.quit();
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redisClient.quit();
  await disconnectDatabase();
  process.exit(0);
});

startServer();

export default app;