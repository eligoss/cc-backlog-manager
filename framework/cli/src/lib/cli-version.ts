import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the CLI package version from package.json
 * This function works from compiled code by navigating relative to the compiled output
 * @returns The version string from package.json
 */
export async function getCliVersion(): Promise<string> {
  try {
    // Get the directory of this compiled file
    // In production: dist/lib/cli-version.js
    // We need to go up to the package root: dist/lib/ -> dist/ -> root/
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDirPath = path.dirname(currentFilePath);

    // Navigate from dist/lib/ -> dist/ -> root/ -> package.json
    const packageJsonPath = path.join(currentDirPath, '..', '..', 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      return packageJson.version || 'unknown';
    }

    // Fallback: unable to determine version
    return 'unknown';
  } catch (_error) {
    // If we can't read the version, return unknown rather than throwing
    return 'unknown';
  }
}
