const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});

// Service endpoints
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  products: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002',
  cart: process.env.CART_SERVICE_URL || 'http://cart-service:3003',
  orders: process.env.ORDER_SERVICE_URL || 'http://order-service:3004',
  recommendations: process.env.ML_SERVICE_URL || 'http://ml-service:3005'
};

// Proxy middleware with error handling
const createProxy = (target, pathRewrite = {}) => createProxyMiddleware({
  target,
  changeOrigin: true,
  timeout: 10000,
  pathRewrite,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to ${target}`);
    // Fix for body parsing issues
    if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    console.error(`Proxy error for ${target}:`, err.message);
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' }
      });
    }
  }
});

// Routes
app.use('/api/auth', createProxy(services.auth, { '^/api/auth': '' }));
app.use('/api/products', createProxy(services.products, { '^/api/products': '' }));
app.use('/api/cart', createProxy(services.cart, { '^/api/cart': '' }));
app.use('/api/orders', createProxy(services.orders, { '^/api/orders': '' }));
app.use('/api/recommendations', createProxy(services.recommendations, { '^/api/recommendations': '' }));

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

module.exports = app;
