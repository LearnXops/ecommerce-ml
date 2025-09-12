import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3000;

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});

// Service endpoints
const services = {
  auth: process.env['AUTH_SERVICE_URL'] || 'http://localhost:3001',
  products: process.env['PRODUCT_SERVICE_URL'] || 'http://localhost:3002',
  cart: process.env['CART_SERVICE_URL'] || 'http://localhost:3003',
  orders: process.env['ORDER_SERVICE_URL'] || 'http://localhost:3004',
  recommendations: process.env['ML_SERVICE_URL'] || 'http://localhost:3005'
};

// Proxy middleware
const createProxy = (target: string) => createProxyMiddleware({
  target,
  changeOrigin: true,
  timeout: 30000,
  onError: (err, req, res) => {
    console.error(`Proxy error:`, err.message);
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' }
      });
    }
  }
});

// Routes
app.use('/api/auth', createProxy(services.auth));
app.use('/api/products', createProxy(services.products));
app.use('/api/cart', createProxy(services.cart));
app.use('/api/orders', createProxy(services.orders));
app.use('/api/recommendations', createProxy(services.recommendations));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' }
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Service endpoints:', services);
});

export default app;
