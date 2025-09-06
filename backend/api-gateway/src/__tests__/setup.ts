import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | undefined;

beforeAll(async () => {
  // Set test environment
  process.env['NODE_ENV'] = 'test';
  process.env['JWT_SECRET'] = 'test-secret-key';
  process.env['LOG_LEVEL'] = 'error'; // Reduce log noise during tests
});

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};