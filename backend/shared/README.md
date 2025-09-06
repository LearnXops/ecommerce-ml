# Shared Database Models and Utilities

This package contains shared database models, types, and utilities for the ecommerce microservices architecture.

## Features

- **MongoDB Connection Management**: Robust connection handling with retry logic and health checks
- **Data Models**: Comprehensive Mongoose schemas for User, Product, Order, and UserInteraction
- **TypeScript Types**: Strongly typed interfaces for all data models
- **Database Seeding**: Scripts to populate the database with sample data
- **Logging**: Centralized logging utilities
- **Testing**: Unit tests for all models with in-memory MongoDB

## Installation

```bash
npm install
```

## Usage

### Connecting to Database

```typescript
import { dbConnection } from '@ecommerce/shared';

// Connect to database
await dbConnection.connect();

// Check connection health
const health = await dbConnection.healthCheck();
console.log(health);

// Disconnect when done
await dbConnection.disconnect();
```

### Using Models

```typescript
import { User, Product, Order, UserInteraction } from '@ecommerce/shared';

// Create a new user
const user = new User({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  firstName: 'John',
  lastName: 'Doe',
  role: 'customer'
});
await user.save();

// Find products
const products = await Product.find({ category: 'electronics' });

// Create an order
const order = new Order({
  userId: user._id,
  items: [{
    productId: products[0]._id,
    quantity: 2,
    price: products[0].price,
    name: products[0].name
  }],
  totalAmount: products[0].price * 2,
  shippingAddress: user.address,
  paymentMethod: 'credit_card'
});
await order.save();
```

### Database Seeding

```bash
# Seed all data
npm run seed

# Clear existing data and seed
npm run seed:clear

# Seed specific data types
npm run seed:users
npm run seed:products

# Using the CLI script
npm run seed -- --help
```

## Models

### User Model
- Email/password authentication with bcrypt hashing
- Role-based access (customer/admin)
- Address information
- Built-in password comparison methods

### Product Model
- Product information with categories and tags
- Inventory management
- Image handling
- Search functionality with text indexing
- Stock status tracking

### Order Model
- Order lifecycle management
- Payment status tracking
- Shipping address handling
- Order item management
- Status transition validation

### UserInteraction Model
- ML recommendation system support
- Interaction tracking (view, cart_add, purchase, wishlist_add)
- Session management
- Metadata for different interaction types

## Environment Variables

```bash
MONGODB_URI=mongodb://localhost:27017/ecommerce
NODE_ENV=development
LOG_LEVEL=info
SERVICE_NAME=your-service-name
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Scripts

- `npm run build` - Compile TypeScript
- `npm run dev` - Watch mode compilation
- `npm run seed` - Seed database with sample data
- `npm run seed:clear` - Clear and seed database
- `npm test` - Run tests

## Integration with Services

To use this shared package in your microservices:

1. **Import the models and utilities:**
```typescript
import { dbConnection, User, Product, logger } from '../shared';
```

2. **Initialize database connection in your service:**
```typescript
import { dbConnection } from '../shared';

async function startService() {
  await dbConnection.connect();
  // Start your service...
}
```

3. **Use models in your routes:**
```typescript
import { User } from '../shared';

app.post('/users', async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.json(user);
});
```

## Error Handling

All models include comprehensive validation and error handling:

- Input validation with custom error messages
- Database connection retry logic
- Graceful error handling in seeders
- Type-safe error responses

## Performance Considerations

- Database indexes on frequently queried fields
- Connection pooling and retry logic
- Efficient aggregation queries for ML data
- TTL indexes for automatic data cleanup

## Contributing

When adding new models or modifying existing ones:

1. Update TypeScript interfaces in `types/index.ts`
2. Create/modify Mongoose schemas with proper validation
3. Add comprehensive tests
4. Update seeding scripts if needed
5. Document any breaking changes