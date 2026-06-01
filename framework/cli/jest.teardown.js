/**
 * Jest Global Teardown
 *
 * Cleans up directories created during test runs
 */

const fs = require('fs-extra');
const path = require('path');

module.exports = async function globalTeardown() {
  console.log('\n🧹 Cleaning up test artifacts...');
  let cleanedCount = 0;

  // Remove framework directory if it was created during build/tests
  const frameworkDir = path.join(__dirname, 'framework');
  if (await fs.pathExists(frameworkDir)) {
    await fs.remove(frameworkDir);
    console.log('  ✓ Removed framework/ directory');
    cleanedCount++;
  }

  // Remove telemetry directory if wrongly created in CLI directory
  // (Should only exist in project root, not in framework/cli/)
  const telemetryDir = path.join(__dirname, '.claude/telemetry');
  if (await fs.pathExists(telemetryDir)) {
    await fs.remove(telemetryDir);
    console.log('  ✓ Removed .claude/telemetry/ directory (wrong location)');
    cleanedCount++;
  }

  if (cleanedCount > 0) {
    console.log('');
  }
};
