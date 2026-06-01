/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,
  // Override to only match integration tests
  testMatch: ['**/__tests__/**/*.integration.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  // Run sequentially - integration tests use filesystem and may conflict
  maxWorkers: 1,
};
