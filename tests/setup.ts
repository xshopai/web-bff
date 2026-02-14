/**
 * Test setup file for web-bff
 * Runs before all tests
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NAME = 'web-bff';
process.env.VERSION = '1.0.0';
process.env.PORT = '8014';
process.env.HOST = 'localhost';
process.env.LOG_LEVEL = 'error';
process.env.LOG_FORMAT = 'json';
process.env.DAPR_ENABLED = 'false';
process.env.DAPR_HOST = 'localhost';
process.env.DAPR_HTTP_PORT = '3500';
process.env.DAPR_GRPC_PORT = '50001';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

// Suppress console output during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
