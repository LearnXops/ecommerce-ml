import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger, performanceLogger } from './middleware/logger';
import { logger } from '@ecommerce/shared/utils/logger';
import { 
  compressionMiddleware, 
  responseOptimizationMiddleware,
  requestTimingMiddleware,
  jsonOptimizationMiddleware,
  requestDeduplicationMiddleware,
  requestSizeLimitMiddleware
} from '@ecommerce/shared/middleware/compression';
import { 
  metricsMiddleware, 
  healthCheckMiddleware,
  recordCustomMetric 
} from '@ecommerce/shared/monitoring/metrics';
import { 
  cacheMiddleware, 
  cacheHealthMiddleware,
  productCacheMiddleware,
  searchCacheMiddleware
} from '@ecommerce/shared/middleware/cache';
import { createCacheInstance } from '@ecommerce/shared/cache/redis-cache';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3000;

// Initialize Redis cache
const cache = createCacheInstance({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  password: process.env['REDIS_PASSWORD'],
  keyPrefix: 'gateway:'
});

// Connect to cache (non-blocking)
cache.connect().catch(error => {
  logger.warn('Failed to connect to Redis cache:', error);
});

// Performance middleware (applied early)
app.use(compressionMiddleware());
app.use(responseOptimizationMiddleware());
app.use(requestTimingMiddleware());
app.use(metricsMiddleware());
app.use(jsonOptimizationMiddleware());

// Security middleware with enhanced configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Enhanced rate limiting with different limits for different endpoints
const createRateLimiter = (windowMs: number, max: number, message: string) => 
  rateLimit({
    windowMs,
    max,
    message: { 
      success: false, 
      error: { 
        code: 'RATE_LIMIT_EXCEEDED', 
        message 
      } 
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health' || req.path === '/metrics'
  });

// Different rate limits for different endpoint types
app.use('/api/auth', createRateLimiter(15 * 60 * 1000, 20, 'Too many authentication attempts'));
app.use('/api/orders', createRateLimiter(15 * 60 * 1000, 50, 'Too many order requests'));
app.use(createRateLimiter(15 * 60 * 1000, 200, 'Too many requests from this IP'));

// Request optimization middleware
app.use(requestSizeLimitMiddleware('10mb'));
app.use(requestDeduplicationMiddleware(1000));

// Request logging and performance monitoring
app.use(requestLogger);
app.use(performanceLogger);

// Body parsing with metrics
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    recordCustomMetric('request_size', buf.length);
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check and metrics endpoints
app.use(healthCheckMiddleware());
app.use(cacheHealthMiddleware());

// Enhanced logging middleware
app.use((req, res, next) => {
  const requestLogger = logger.withRequest(req);
  (req as any).logger = requestLogger;
  
  recordCustomMetric('api_request', 1, {
    method: req.method,
    path: req.path,
    service: 'api-gateway'
  });
  
  next();
});

// Service endpoints configuration with timeouts
const services = {
  auth: {
    url: process.env['AUTH_SERVICE_URL'] || 'http://localhost:3001',
    timeout: 10000
  },
  products: {
    url: process.env['PRODUCT_SERVICE_URL'] || 'http://localhost:3002',
    timeout: 15000
  },
  cart: {
    url: process.env['CART_SERVICE_URL'] || 'http://localhost:3003',
    timeout: 10000
  },
  orders: {
    url: process.env['ORDER_SERVICE_URL'] || 'http://localhost:3004',
    timeout: 20000
  },
  recommendations: {
    url: process.env['ML_SERVICE_URL'] || 'http://localhost:3005',
    timeout: 30000
  }
};

// Enhanced proxy middleware factory
const createEnhancedProxy = (serviceName: string, config: any) => {
  return createProxyMiddleware({
    target: config.url,
    changeOrigin: true,
    timeout: config.timeout,
    proxyTimeout: config.timeout,
    pathRewrite: {
      [`^/api/${serviceName}`]: ''
    },
    onError: (err, req, res) => {
      const requestLogger = (req as any).logger || logger;
      requestLogger.error(`Proxy error for ${serviceName}:`, {
        error: err.message,
        target: config.url,
        path: req.path
      });
      
      recordCustomMetric('proxy_error', 1, {
        service: serviceName,
        error: err.message
      });
      
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: `${serviceName} service is currently unavailable`
          }
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('X-Gateway-Request-Id', req.headers['x-request-id'] || 'unknown');
      proxyReq.setHeader('X-Gateway-Timestamp', new Date().toISOString());
    },
    onProxyRes: (proxyRes, req, res) => {
      recordCustomMetric('proxy_response', 1, {
        service: serviceName,
        statusCode: proxyRes.statusCode?.toString(),
        success: (proxyRes.statusCode && proxyRes.statusCode < 400).toString()
      });
    }
  });
};

// Authentication routes (public)
app.use('/api/auth', createEnhancedProxy('auth', services.auth));

// Protected routes with caching where appropriate
app.use('/api/products', 
  authMiddleware, 
  productCacheMiddleware(3600), // Cache for 1 hour
  createEnhancedProxy('products', services.products)
);

app.use('/api/cart', 
  authMiddleware, 
  createEnhancedProxy('cart', services.cart)
);

app.use('/api/orders', 
  authMiddleware, 
  createEnhancedProxy('orders', services.orders)
);

app.use('/api/recommendations', 
  authMiddleware, 
  cacheMiddleware({ ttl: 1800 }), // Cache for 30 minutes
  createEnhancedProxy('recommendations', services.recommendations)
);

// Periodic performance monitoring
setInterval(async () => {
  try {
    if (cache && cache.isHealthy()) {
      const cacheStats = await cache.getStats();
      if (cacheStats?.memory) {
        const memoryLines = cacheStats.memory.split('\r\n');
        const usedMemoryLine = memoryLines.find(line => line.startsWith('used_memory:'));
        if (usedMemoryLine) {
          const usedMemory = parseInt(usedMemoryLine.split(':')[1]);
          recordCustomMetric('cache_memory_usage', usedMemory);
        }
      }
    }
    
    const memUsage = process.memoryUsage();
    recordCustomMetric('memory_heap_used', memUsage.heapUsed);
    recordCustomMetric('memory_heap_total', memUsage.heapTotal);
    recordCustomMetric('memory_rss', memUsage.rss);
    
  } catch (error) {
    logger.error('Error collecting performance metrics:', error);
  }
}, 30000); // Every 30 seconds

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  const requestLogger = (req as any).logger || logger;
  requestLogger.warn('Route not found', { path: req.path, method: req.method });
  
  recordCustomMetric('not_found_requests', 1, {
    path: req.path,
    method: req.method
  });
  
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (cache) {
    await cache.disconnect();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (cache) {
    await cache.disconnect();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    cacheEnabled: cache.isHealthy(),
    services: Object.keys(services)
  });
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Service endpoints:', Object.fromEntries(
    Object.entries(services).map(([key, config]) => [key, config.url])
  ));
});

export default app;