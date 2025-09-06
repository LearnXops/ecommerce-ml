# Testing Guide

This guide covers all aspects of testing in the ecommerce application, including unit tests, integration tests, end-to-end tests, performance tests, and CI/CD pipeline testing.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Performance Testing](#performance-testing)
6. [Load Testing](#load-testing)
7. [Security Testing](#security-testing)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Test Data Management](#test-data-management)
10. [Best Practices](#best-practices)

## Testing Strategy

### Testing Pyramid

Our testing strategy follows the testing pyramid approach:

```
    /\
   /  \     E2E Tests (Few)
  /____\    
 /      \   Integration Tests (Some)
/__________\ Unit Tests (Many)
```

- **Unit Tests (70%)**: Fast, isolated tests for individual functions and components
- **Integration Tests (20%)**: Tests for API endpoints and service interactions
- **End-to-End Tests (10%)**: Full user workflow tests through the UI

### Test Coverage Goals

- **Unit Tests**: Minimum 80% code coverage
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: Critical user journeys covered
- **Performance Tests**: All major endpoints tested

## Unit Testing

### Backend Services (Jest + TypeScript)

#### Configuration

Each backend service uses Jest with TypeScript:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
};
```

#### Example Unit Test

```typescript
// backend/auth-service/src/__tests__/authController.test.ts
import { Request, Response } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/authService';

jest.mock('../services/authService');

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    authController = new AuthController(mockAuthService);
    
    mockRequest = {
      body: {},
      params: {},
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };
      
      mockRequest.body = userData;
      mockAuthService.register.mockResolvedValue({
        user: { ...userData, _id: 'user123' },
        token: 'jwt-token',
      });

      // Act
      await authController.register(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith(userData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({ email: userData.email }),
          token: 'jwt-token',
        }),
      });
    });

    it('should handle validation errors', async () => {
      // Arrange
      mockRequest.body = { email: 'invalid-email' };
      mockAuthService.register.mockRejectedValue(new Error('Invalid email'));

      // Act
      await authController.register(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Invalid email',
        }),
      });
    });
  });
});
```

#### Running Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests for specific service
cd backend/auth-service && npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test file
npm test -- authController.test.ts
```

### Frontend Testing (Vitest + React Testing Library)

#### Configuration

```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

#### Example Component Test

```typescript
// frontend/src/components/__tests__/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

const mockProduct = {
  _id: '1',
  name: 'Test Product',
  price: 99.99,
  description: 'Test description',
  images: ['test-image.jpg'],
  category: 'electronics',
  inventory: 10,
};

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('calls onAddToCart when add to cart button is clicked', () => {
    const mockOnAddToCart = jest.fn();
    
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);
    
    const addButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addButton);
    
    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct._id);
  });

  it('shows out of stock when inventory is 0', () => {
    const outOfStockProduct = { ...mockProduct, inventory: 0 };
    
    render(<ProductCard product={outOfStockProduct} />);
    
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
  });
});
```

### ML Service Testing (pytest)

#### Configuration

```ini
# ml-service/pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --verbose
    --tb=short
    --cov=src
    --cov-report=html
    --cov-report=xml
    --cov-report=term-missing
```

#### Example ML Test

```python
# ml-service/tests/test_collaborative_filtering.py
import pytest
import numpy as np
from src.algorithms.collaborative_filtering import CollaborativeFiltering

class TestCollaborativeFiltering:
    def setup_method(self):
        self.cf = CollaborativeFiltering()
        
        # Sample user-item interaction matrix
        self.interactions = np.array([
            [5, 3, 0, 1],
            [4, 0, 0, 1],
            [1, 1, 0, 5],
            [1, 0, 0, 4],
            [0, 1, 5, 4],
        ])
        
        self.user_ids = ['user1', 'user2', 'user3', 'user4', 'user5']
        self.item_ids = ['item1', 'item2', 'item3', 'item4']

    def test_fit_model(self):
        """Test that the model can be fitted with interaction data."""
        self.cf.fit(self.interactions, self.user_ids, self.item_ids)
        
        assert self.cf.is_fitted
        assert self.cf.n_users == 5
        assert self.cf.n_items == 4

    def test_predict_for_user(self):
        """Test prediction for a specific user."""
        self.cf.fit(self.interactions, self.user_ids, self.item_ids)
        
        predictions = self.cf.predict_for_user('user1', n_recommendations=2)
        
        assert len(predictions) == 2
        assert all(isinstance(pred, dict) for pred in predictions)
        assert all('item_id' in pred and 'score' in pred for pred in predictions)

    def test_predict_for_new_user(self):
        """Test prediction for a user not in training data."""
        self.cf.fit(self.interactions, self.user_ids, self.item_ids)
        
        predictions = self.cf.predict_for_user('new_user', n_recommendations=2)
        
        # Should return popular items for new users
        assert len(predictions) <= 2

    def test_empty_interactions(self):
        """Test handling of empty interaction matrix."""
        empty_interactions = np.array([]).reshape(0, 4)
        
        with pytest.raises(ValueError):
            self.cf.fit(empty_interactions, [], self.item_ids)
```

## Integration Testing

### API Integration Tests

Integration tests verify that different services work together correctly.

#### Setup

```typescript
// backend/integration-tests/setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createClient } from 'redis';

let mongoServer: MongoMemoryServer;
let redisClient: any;

beforeAll(async () => {
  // Setup in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Setup Redis
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  await redisClient.connect();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await redisClient.quit();
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  
  // Clear Redis
  await redisClient.flushAll();
});
```

#### Example Integration Test

```typescript
// backend/integration-tests/user-workflows.test.ts
import request from 'supertest';
import { app } from '../api-gateway/src/index';

describe('User Registration and Login Flow', () => {
  it('should complete full user registration and login workflow', async () => {
    // 1. Register user
    const registrationData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(registrationData)
      .expect(201);

    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.user.email).toBe(registrationData.email);

    // 2. Login with registered user
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: registrationData.email,
        password: registrationData.password,
      })
      .expect(200);

    const token = loginResponse.body.data.token;
    expect(token).toBeDefined();

    // 3. Access protected route
    const profileResponse = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(profileResponse.body.data.user.email).toBe(registrationData.email);
  });
});
```

#### Running Integration Tests

```bash
# Start test databases
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Clean up test environment
docker-compose -f docker-compose.test.yml down -v
```

## End-to-End Testing

### Cypress Configuration

```typescript
// frontend/cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
```

### Example E2E Test

```typescript
// frontend/cypress/e2e/checkout-workflow.cy.ts
describe('Checkout Workflow', () => {
  beforeEach(() => {
    // Setup test data
    cy.task('seedDatabase');
    cy.visit('/');
  });

  it('should complete full checkout process', () => {
    // 1. Browse products
    cy.get('[data-testid="product-list"]').should('be.visible');
    cy.get('[data-testid="product-card"]').first().click();

    // 2. Add product to cart
    cy.get('[data-testid="add-to-cart-btn"]').click();
    cy.get('[data-testid="cart-notification"]').should('contain', 'Added to cart');

    // 3. Go to cart
    cy.get('[data-testid="cart-icon"]').click();
    cy.url().should('include', '/cart');
    cy.get('[data-testid="cart-item"]').should('have.length', 1);

    // 4. Proceed to checkout
    cy.get('[data-testid="checkout-btn"]').click();
    cy.url().should('include', '/checkout');

    // 5. Fill shipping information
    cy.get('[data-testid="shipping-form"]').within(() => {
      cy.get('input[name="street"]').type('123 Test St');
      cy.get('input[name="city"]').type('Test City');
      cy.get('input[name="state"]').type('TS');
      cy.get('input[name="zipCode"]').type('12345');
      cy.get('select[name="country"]').select('US');
    });

    // 6. Fill payment information
    cy.get('[data-testid="payment-form"]').within(() => {
      cy.get('input[name="cardNumber"]').type('4242424242424242');
      cy.get('input[name="expiryDate"]').type('12/25');
      cy.get('input[name="cvv"]').type('123');
      cy.get('input[name="cardholderName"]').type('John Doe');
    });

    // 7. Place order
    cy.get('[data-testid="place-order-btn"]').click();

    // 8. Verify order confirmation
    cy.url().should('include', '/order-confirmation');
    cy.get('[data-testid="order-success"]').should('contain', 'Order placed successfully');
    cy.get('[data-testid="order-number"]').should('be.visible');
  });

  it('should handle payment failures gracefully', () => {
    // Add product to cart
    cy.get('[data-testid="product-card"]').first().click();
    cy.get('[data-testid="add-to-cart-btn"]').click();
    cy.get('[data-testid="cart-icon"]').click();
    cy.get('[data-testid="checkout-btn"]').click();

    // Fill forms with invalid payment info
    cy.fillShippingForm();
    cy.get('[data-testid="payment-form"]').within(() => {
      cy.get('input[name="cardNumber"]').type('4000000000000002'); // Declined card
      cy.get('input[name="expiryDate"]').type('12/25');
      cy.get('input[name="cvv"]').type('123');
      cy.get('input[name="cardholderName"]').type('John Doe');
    });

    cy.get('[data-testid="place-order-btn"]').click();

    // Verify error handling
    cy.get('[data-testid="payment-error"]').should('contain', 'Payment failed');
    cy.url().should('include', '/checkout'); // Should stay on checkout page
  });
});
```

### Custom Cypress Commands

```typescript
// frontend/cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      fillShippingForm(): Chainable<void>;
      addProductToCart(productId: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('fillShippingForm', () => {
  cy.get('[data-testid="shipping-form"]').within(() => {
    cy.get('input[name="street"]').type('123 Test St');
    cy.get('input[name="city"]').type('Test City');
    cy.get('input[name="state"]').type('TS');
    cy.get('input[name="zipCode"]').type('12345');
    cy.get('select[name="country"]').select('US');
  });
});

Cypress.Commands.add('addProductToCart', (productId: string) => {
  cy.request('POST', `/api/cart/test-user/items`, {
    productId,
    quantity: 1,
  });
});
```

### Running E2E Tests

```bash
# Start application
docker-compose up -d

# Run E2E tests (interactive)
npm run test:e2e

# Run E2E tests (headless)
npm run test:e2e:headless

# Run specific test file
npx cypress run --spec "cypress/e2e/checkout-workflow.cy.ts"
```

## Performance Testing

### Load Testing with Custom Framework

Our load testing framework supports multiple scenarios:

```typescript
// scripts/load-test-scenarios.ts
import { LoadTestScenarios } from './load-test-scenarios';

const scenarios = new LoadTestScenarios('http://localhost:4000');

// Run all scenarios
scenarios.runAllScenarios()
  .then(results => {
    scenarios.generateReport(results);
    process.exit(results.some(r => !r.passed) ? 1 : 0);
  });
```

### Performance Test Scenarios

1. **Normal Traffic**: 50 concurrent users, 5 minutes
2. **Black Friday**: 500 concurrent users, 5 minutes
3. **Flash Sale**: 300 concurrent users, 2 minutes
4. **Product Launch**: 200 concurrent users, 3 minutes
5. **Search Heavy**: 100 concurrent users, 4 minutes

### Running Performance Tests

```bash
# Run all performance tests
npm run test:performance

# Run specific load test scenarios
npm run test:load

# Run with custom parameters
API_BASE_URL=http://localhost:4000 \
CONCURRENT_USERS=100 \
TEST_DURATION=300 \
./scripts/run-performance-tests.sh
```

## Security Testing

### Automated Security Scans

Our CI/CD pipeline includes multiple security scanning tools:

1. **npm audit**: Dependency vulnerability scanning
2. **Bandit**: Python security linting
3. **Trivy**: Container vulnerability scanning
4. **TruffleHog**: Secret detection

### Manual Security Testing

```bash
# Run security audit
npm audit --audit-level=high

# Python security check
cd ml-service
safety check -r requirements.txt
bandit -r src/

# Container security scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image your-image:latest
```

## CI/CD Pipeline

### GitHub Actions Workflows

Our CI/CD pipeline includes:

1. **Code Quality**: ESLint, Prettier, TypeScript checking
2. **Unit Tests**: All services tested in parallel
3. **Integration Tests**: API endpoint testing
4. **E2E Tests**: Critical user workflows
5. **Performance Tests**: Load testing on main branch
6. **Security Scans**: Vulnerability and secret scanning
7. **Build & Deploy**: Automated deployment to staging/production

### Pipeline Stages

```yaml
# .github/workflows/ci-cd.yml
jobs:
  code-quality:     # Linting, formatting, type checking
  unit-tests:       # Jest tests for all services
  frontend-tests:   # React component tests
  ml-tests:         # Python ML service tests
  integration-tests: # API integration tests
  e2e-tests:        # Cypress E2E tests
  performance-tests: # Load testing (main branch only)
  build-images:     # Docker image building
  security-scan:    # Container vulnerability scanning
  deploy-staging:   # Staging deployment (develop branch)
  deploy-production: # Production deployment (main branch)
```

### Running CI Pipeline Locally

```bash
# Run the full validation pipeline
npm run validate

# Run CI-equivalent commands
npm run ci
```

## Test Data Management

### Database Seeding

```typescript
// backend/shared/database/seeders/index.ts
export class DatabaseSeeder {
  async seed() {
    await this.seedUsers();
    await this.seedProducts();
    await this.seedOrders();
    await this.seedInteractions();
  }

  private async seedUsers() {
    const users = [
      {
        email: 'admin@example.com',
        password: 'hashed-password',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
      },
      {
        email: 'customer@example.com',
        password: 'hashed-password',
        role: 'customer',
        firstName: 'John',
        lastName: 'Doe',
      },
    ];

    await User.insertMany(users);
  }
}
```

### Test Fixtures

```typescript
// backend/shared/test-fixtures/products.ts
export const productFixtures = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Laptop',
    price: 999.99,
    category: 'electronics',
    inventory: 50,
  },
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Phone',
    price: 699.99,
    category: 'electronics',
    inventory: 100,
  },
];
```

### Running Seed Scripts

```bash
# Seed development database
npm run seed

# Seed test database
NODE_ENV=test npm run seed

# Clear and reseed
npm run seed:fresh
```

## Best Practices

### Unit Testing Best Practices

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Test One Thing**: Each test should verify one behavior
3. **Use Descriptive Names**: Test names should describe the scenario
4. **Mock External Dependencies**: Isolate the unit under test
5. **Test Edge Cases**: Include boundary conditions and error cases

### Integration Testing Best Practices

1. **Test Real Interactions**: Use actual database and services
2. **Clean State**: Reset database between tests
3. **Test Happy and Sad Paths**: Include error scenarios
4. **Use Test Containers**: Isolate test environment
5. **Verify Side Effects**: Check database changes, external calls

### E2E Testing Best Practices

1. **Test User Journeys**: Focus on complete workflows
2. **Use Page Object Model**: Organize selectors and actions
3. **Minimize Test Data Dependencies**: Create data in tests
4. **Handle Async Operations**: Wait for elements and responses
5. **Test Critical Paths Only**: E2E tests are expensive

### Performance Testing Best Practices

1. **Test Realistic Scenarios**: Use production-like data volumes
2. **Gradual Load Increase**: Ramp up users gradually
3. **Monitor System Resources**: Track CPU, memory, database
4. **Set Performance Budgets**: Define acceptable thresholds
5. **Test Different Load Patterns**: Peak, sustained, spike loads

### General Testing Best Practices

1. **Write Tests First**: TDD approach when possible
2. **Keep Tests Fast**: Optimize test execution time
3. **Maintain Test Code**: Refactor tests like production code
4. **Use Continuous Testing**: Run tests on every commit
5. **Monitor Test Results**: Track test metrics and trends

## Troubleshooting

### Common Issues

#### Test Database Connection

```bash
# Check MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# Check Redis connection
redis-cli ping
```

#### Flaky Tests

```bash
# Run test multiple times to identify flakiness
npm test -- --repeat 10 specific-test.test.ts

# Run tests in random order
npm test -- --randomize
```

#### Performance Test Issues

```bash
# Check system resources
docker stats

# Monitor application logs
docker-compose logs -f api-gateway
```

### Debugging Tests

#### Backend Tests

```bash
# Debug with Node.js inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Enable debug logging
DEBUG=* npm test
```

#### Frontend Tests

```bash
# Debug Cypress tests
npx cypress open

# Debug component tests
npm run test:debug
```

#### Performance Tests

```bash
# Verbose load test output
DEBUG=load-test npm run test:load

# Monitor during tests
watch -n 1 'curl -s http://localhost:4000/metrics | jq .metrics.performance'
```

This comprehensive testing guide ensures that all aspects of the application are thoroughly tested, from individual units to complete user workflows, performance characteristics, and security vulnerabilities.