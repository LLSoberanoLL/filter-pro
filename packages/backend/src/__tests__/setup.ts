// Setup file for Jest tests
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Mock MongoDB connection
jest.mock('../models', () => ({
  connectDb: jest.fn().mockResolvedValue(undefined),
}));

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
