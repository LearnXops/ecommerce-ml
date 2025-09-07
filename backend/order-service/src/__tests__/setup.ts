// Increase timeout for database operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock environment variables
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret-key';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/ecommerce_test';
process.env['STRIPE_SECRET_KEY'] = 'sk_test_mock_stripe_key';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        amount: 2000,
        currency: 'usd',
        status: 'requires_payment_method'
      }),
      confirm: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded'
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'canceled'
      })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 'ref_test_123',
        amount: 2000,
        status: 'succeeded'
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded'
          }
        }
      })
    }
  }));
});

// Mock shared logger
jest.mock('@ecommerce/shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock database connection
jest.mock('@ecommerce/shared/database/connection', () => ({
  dbConnection: {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    isConnected: jest.fn().mockReturnValue(true)
  }
}));

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
});