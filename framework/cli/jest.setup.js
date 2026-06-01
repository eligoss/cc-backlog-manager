/**
 * Jest Setup File
 * Runs before all tests to configure the test environment
 */

const path = require('path');
const fs = require('fs-extra');

// Disable telemetry during tests to avoid:
// - Test pollution (telemetry events from tests mixed with real events)
// - File I/O overhead during test runs
// - Race conditions with async telemetry writes
process.env.TELEMETRY_ENABLED = 'false';

// Ensure other telemetry settings are disabled
process.env.TELEMETRY_JSON_ENABLED = 'false';
process.env.TELEMETRY_OTEL_ENABLED = 'false';

// Test Sandbox Configuration
// ---------------------------
// TEST_SANDBOX_ROOT: Override the default sandbox root directory
// Default: .test-sandbox/ in the cli project root
if (!process.env.TEST_SANDBOX_ROOT) {
  process.env.TEST_SANDBOX_ROOT = path.join(__dirname, '.test-sandbox');
}

// TEST_KEEP_ON_FAILURE: Set to 'true' to preserve sandbox directories
// when tests fail, useful for debugging
// Default: false (clean up all sandboxes)

// TEST_VERBOSE: Set to 'true' to enable verbose sandbox logging
// Default: false

// Initialize sandbox root directory
const sandboxRoot = process.env.TEST_SANDBOX_ROOT;
if (sandboxRoot) {
  fs.ensureDirSync(sandboxRoot);
}
