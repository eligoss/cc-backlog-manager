#!/usr/bin/env node
/**
 * Cleanup Build Artifacts
 *
 * Removes the framework/ directory after it's no longer needed.
 * This directory is created by prepare-publish.js for npm packaging.
 *
 * Called from:
 * - postpublish: After npm publish completes (directory no longer needed)
 * - jest.teardown.js: After tests complete (cleanup test environment)
 *
 * NOT called from postbuild because framework/ must exist for npm to package it.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cliRoot = path.resolve(__dirname, '..');
const frameworkDir = path.join(cliRoot, 'framework');

async function cleanupBuild() {
  // Clean up framework bundle
  if (await fs.pathExists(frameworkDir)) {
    console.log('\n🧹 Cleaning up build artifacts...');
    await fs.remove(frameworkDir);
    console.log('  ✓ Removed framework/ directory');
    console.log('  (Framework bundle only needed during publishing)\n');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupBuild().catch((error) => {
    console.error('\n❌ Error cleaning up build artifacts:\n');
    console.error(error);
    // Don't exit with error - cleanup failures shouldn't break the workflow
  });
}

export { cleanupBuild };
