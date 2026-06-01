/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Parallel execution settings
  maxWorkers: '50%', // Use 50% of CPU cores for optimal performance

  // Disable telemetry during tests
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Clean up test artifacts after all tests complete
  globalTeardown: '<rootDir>/jest.teardown.js',

  // Ignore dist directory to prevent loading compiled ESM files
  // (mocks in dist/ are ESM and would cause parsing errors)
  modulePathIgnorePatterns: ['<rootDir>/dist/'],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^chalk$': '<rootDir>/src/__mocks__/chalk.ts',
    '^ora$': '<rootDir>/src/__mocks__/ora.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
        },
        // isolatedModules is now set in tsconfig.json (required by ts-jest v30+)
        // Handle import.meta.url in ESM files when transforming to CommonJS
        diagnostics: {
          ignoreCodes: [1343], // Required for ts-jest-mock-import-meta
        },
        astTransformers: {
          before: [
            {
              path: 'ts-jest-mock-import-meta',
              options: {
                metaObjectReplacement: {
                  // Provide a mock URL that will be transformed to proper path
                  // The actual path resolution will use __dirname in the transformed code
                  url: 'file:///mock/path/for/jest',
                },
              },
            },
          ],
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Exclude integration and e2e tests from default run (unit tests only)
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.integration\\.test\\.ts$',
    '\\.e2e\\.test\\.ts$',
    '/__tests__/e2e/',
    // Writer module lib tests - modules/writer/src/lib/ not yet implemented
    '/commands/writer/__tests__/immutability/',
    '/commands/writer/__tests__/context/',
    '/commands/writer/__tests__/hashing/',
    '/commands/writer/__tests__/token-counting/',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
