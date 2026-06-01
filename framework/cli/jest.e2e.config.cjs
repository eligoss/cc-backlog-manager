/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,
  // Match E2E tests - both in e2e/ directory and with .e2e.test.ts suffix
  testMatch: [
    '**/__tests__/e2e/**/*.test.ts',
    '**/__tests__/**/*.e2e.test.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  // Run sequentially - E2E tests are heavy
  maxWorkers: 1,
  // Longer timeout for complete workflow tests
  testTimeout: 30000,
};
