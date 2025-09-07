import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/database';
import { logger } from './utils/logger';
import orderRoutes from './routes/orderRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3004;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', service: 'order-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/orders', orderRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    logger.info('Connected to MongoDB');
    
    app.listen(PORT, () => {
      logger.info(`Order service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start order service:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

export default app;