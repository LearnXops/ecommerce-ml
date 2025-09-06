# API Gateway

The API Gateway serves as the single entry point for all client requests to the ecommerce microservices. It handles request routing, authentication, rate limiting, and provides centralized logging and error handling.

## Features

- **Request Routing**: Routes requests to appropriate microservices based on URL patterns
- **Authentication**: JWT-based authentication middleware for protected routes
- **Rate Limiting**: Prevents abuse with configurable rate limits
- **CORS Support**: Configured for frontend integration
- **Security Headers**: Helmet.js for security best practices
- **Request/Response Logging**: Comprehensive logging with Winston
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Health Checks**: Health endpoint for monitoring

## Architecture

The gateway routes requests to the following services:

- **Auth Service** (port 3001): `/api/auth/*` - Public routes for authentication
- **Product Service** (port 3002): `/api/products/*` - Protected routes for product management
- **Cart Service** (port 3003): `/api/cart/*` - Protected routes for cart operations
- **Order Service** (port 3004): `/api/orders/*` - Protected routes for order management
- **ML Service** (port 3005): `/api/recommendations/*` - Protected routes for recommendations

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key-here

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Microservice URLs
AUTH_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
CART_SERVICE_URL=http://localhost:3003
ORDER_SERVICE_URL=http://localhost:3004
ML_SERVICE_URL=http://localhost:3005

# Logging
LOG_LEVEL=info
```

## API Routes

### Public Routes
- `GET /health` - Health check endpoint
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Protected Routes (require JWT token)
- `GET /api/products` - List products
- `POST /api/products` - Create product (admin only)
- `GET /api/cart/:userId` - Get user cart
- `POST /api/cart/:userId/items` - Add item to cart
- `POST /api/orders` - Create order
- `GET /api/orders/:userId` - Get user orders
- `GET /api/recommendations/:userId` - Get recommendations

## Authentication

Protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

The gateway validates the token and forwards user information to downstream services via headers:
- `x-user-id`: User ID
- `x-user-email`: User email
- `x-user-role`: User role (customer/admin)

## Rate Limiting

Default rate limiting configuration:
- Window: 15 minutes
- Max requests: 100 per IP per window

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // Optional, only in development
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## Development

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
npm start
```

## Docker

Build and run with Docker:

```bash
docker build -t api-gateway .
docker run -p 3000:3000 api-gateway
```

## Monitoring

The gateway provides comprehensive logging:
- Request/response logging
- Error logging with stack traces
- Performance monitoring for slow requests (>2s)
- Health check endpoint for uptime monitoring

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output in development mode

## Security Features

- **Helmet.js**: Security headers (XSS protection, content type sniffing prevention, etc.)
- **CORS**: Configured for specific frontend origins
- **Rate Limiting**: Prevents abuse and DoS attacks
- **JWT Validation**: Secure token-based authentication
- **Input Validation**: JSON parsing with size limits
- **Error Sanitization**: Sensitive information hidden in production

## Testing

The test suite includes:
- Unit tests for middleware functions
- Integration tests for routing and authentication
- Error handling tests
- Security header tests
- Rate limiting tests

Run tests with coverage:
```bash
npm test -- --coverage
```