# Order Service

The Order Service handles order management, payment processing, and order lifecycle management for the e-commerce application.

## Features

- **Order Creation**: Create orders with inventory validation and payment processing
- **Payment Integration**: Stripe payment processing with payment intents
- **Order Management**: Full order lifecycle management (pending → confirmed → shipped → delivered)
- **Order Cancellation**: Cancel orders with automatic inventory restoration and refunds
- **Admin Functions**: Administrative order management and status updates
- **Order History**: Retrieve order history with pagination and filtering

## API Endpoints

### Customer Endpoints

#### Create Order
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "60d5ecb74b24a1234567890a",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "123 Main Street",
    "city": "Anytown",
    "state": "California",
    "zipCode": "12345",
    "country": "United States"
  },
  "paymentMethodId": "pm_1234567890abcdef", // Optional
  "notes": "Please deliver to back door" // Optional
}
```

#### Get User Orders
```http
GET /api/orders/my-orders?page=1&limit=20&status=confirmed
Authorization: Bearer <token>
```

#### Get Order by ID
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

#### Cancel Order
```http
POST /api/orders/:id/cancel
Authorization: Bearer <token>
```

#### Process Payment
```http
POST /api/orders/:id/payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethodId": "pm_1234567890abcdef"
}
```

### Admin Endpoints

#### Get All Orders
```http
GET /api/orders?page=1&limit=20&status=confirmed&userId=60d5ecb74b24a1234567890a
Authorization: Bearer <admin-token>
```

#### Update Order Status
```http
PUT /api/orders/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "shipped",
  "trackingNumber": "TRACK123456",
  "estimatedDelivery": "2024-01-15T00:00:00.000Z",
  "notes": "Shipped via FedEx"
}
```

## Order Status Flow

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
    ↓
CANCELLED (can be cancelled from any status except DELIVERED)
```

## Payment Status Flow

```
PENDING → COMPLETED
    ↓
FAILED / REFUNDED
```

## Environment Variables

```env
# Server Configuration
PORT=3004
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ecommerce

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Logging Configuration
LOG_LEVEL=info

# Order Configuration
MAX_ORDER_ITEMS=50
MAX_ITEM_QUANTITY=100
ORDER_TIMEOUT_MINUTES=30
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration values.

4. Build the service:
```bash
npm run build
```

5. Start the service:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Order Processing Flow

### 1. Order Creation
- Validate order data and user authentication
- Check product availability and inventory
- Calculate order total
- Create Stripe payment intent
- Reserve inventory
- Save order to database

### 2. Payment Processing
- Confirm payment intent with Stripe
- Update order status to CONFIRMED
- Handle payment failures gracefully

### 3. Order Fulfillment
- Admin updates order status to PROCESSING
- Add tracking information when shipped
- Update status to SHIPPED with tracking number
- Final status update to DELIVERED

### 4. Order Cancellation
- Validate cancellation eligibility
- Restore reserved inventory
- Process refund if payment was completed
- Update order status to CANCELLED

## Error Handling

The service includes comprehensive error handling for:

- **Validation Errors**: Invalid request data
- **Authentication Errors**: Missing or invalid JWT tokens
- **Authorization Errors**: Insufficient permissions
- **Business Logic Errors**: Insufficient inventory, invalid order states
- **Payment Errors**: Stripe payment processing failures
- **Database Errors**: MongoDB connection and operation failures

## Security Features

- JWT-based authentication
- Role-based authorization (customer/admin)
- Input validation and sanitization
- Rate limiting protection
- Secure payment processing with Stripe
- Transaction-based operations for data consistency

## Monitoring and Logging

- Structured logging with Winston
- Request/response logging
- Error tracking and reporting
- Performance monitoring
- Health check endpoint at `/health`

## Dependencies

### Production Dependencies
- **express**: Web framework
- **mongoose**: MongoDB ODM
- **stripe**: Payment processing
- **jsonwebtoken**: JWT authentication
- **joi**: Input validation
- **winston**: Logging
- **cors**: Cross-origin resource sharing
- **helmet**: Security headers
- **dotenv**: Environment configuration

### Development Dependencies
- **typescript**: Type checking
- **jest**: Testing framework
- **supertest**: HTTP testing
- **nodemon**: Development server
- **ts-node**: TypeScript execution

## Architecture

The order service follows a layered architecture:

```
├── src/
│   ├── controllers/     # Request handlers and business logic
│   ├── middleware/      # Authentication, error handling
│   ├── routes/          # API route definitions
│   ├── validation/      # Input validation schemas
│   ├── config/          # Configuration (Stripe, etc.)
│   └── __tests__/       # Test files
├── dist/                # Compiled JavaScript
└── coverage/            # Test coverage reports
```

## Integration with Other Services

- **Auth Service**: User authentication and authorization
- **Product Service**: Product information and inventory management
- **Cart Service**: Cart data for order creation
- **Shared Package**: Common models, types, and utilities

## Stripe Integration

The service integrates with Stripe for payment processing:

- **Payment Intents**: Secure payment processing
- **Webhooks**: Real-time payment status updates
- **Refunds**: Automatic refund processing for cancellations
- **Error Handling**: Comprehensive Stripe error handling

## Performance Considerations

- Database indexing on frequently queried fields
- Pagination for large result sets
- Transaction-based operations for data consistency
- Efficient inventory management
- Caching strategies for product data

## Deployment

The service can be deployed using Docker:

```bash
# Build Docker image
docker build -t order-service .

# Run container
docker run -p 3004:3004 --env-file .env order-service
```

Or using Docker Compose (see root `docker-compose.yml`).

## Contributing

1. Follow TypeScript and ESLint configurations
2. Write tests for new features
3. Update documentation for API changes
4. Follow conventional commit messages
5. Ensure all tests pass before submitting PRs