import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger, performanceLogger } from './middleware/logger';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Request logging and performance monitoring
app.use(requestLogger);
app.use(performanceLogger);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Service endpoints configuration
const services = {
  auth: process.env['AUTH_SERVICE_URL'] || 'http://localhost:3001',
  products: process.env['PRODUCT_SERVICE_URL'] || 'http://localhost:3002',
  cart: process.env['CART_SERVICE_URL'] || 'http://localhost:3003',
  orders: process.env['ORDER_SERVICE_URL'] || 'http://localhost:3004',
  recommendations: process.env['ML_SERVICE_URL'] || 'http://localhost:3005'
};

// Authentication routes (public)
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': ''
  }
}));

// Protected routes - require authentication
app.use('/api/products', authMiddleware, createProxyMiddleware({
  target: services.products,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': ''
  }
}));

app.use('/api/cart', authMiddleware, createProxyMiddleware({
  target: services.cart,
  changeOrigin: true,
  pathRewrite: {
    '^/api/cart': ''
  }
}));

app.use('/api/orders', authMiddleware, createProxyMiddleware({
  target: services.orders,
  changeOrigin: true,
  pathRewrite: {
    '^/api/orders': ''
  }
}));

app.use('/api/recommendations', authMiddleware, createProxyMiddleware({
  target: services.recommendations,
  changeOrigin: true,
  pathRewrite: {
    '^/api/recommendations': ''
  }
}));

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Service endpoints:', services);
});

export default app;