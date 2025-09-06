import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/ecommerce-test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Increase timeout for integration tests
jest.setTimeout(30000);