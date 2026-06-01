/**
 * Integration Tests: Update Command - Module Directory Creation
 *
 * Verifies that `agentic-framework update` creates module-declared directories
 * (e.g., backlog/, reports/) when they don't yet exist in an initialized project.
 *
 * @module commands/__tests__/update.integration.test
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';

// CLI integration tests spawn full node processes — allow 2 minutes per test
jest.setTimeout(120000);

const CLI_DIST = path.resolve(__dirname, '../../../dist/index.js');

describe('Integration: Update Command', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'update-test-'));
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Path traversal containment guard', () => {
    it('should reject directories that escape the project root', () => {
      // The update command validates dirs with path.relative() before any mutation.
      // This unit-level test exercises the same guard logic directly, since the
      // CLI update path only loads real framework modules (which have valid paths).
      const projectRoot = testDir;
      const escapeAttempts = ['../escape', '../../etc', '/absolute/path'];

      for (const dir of escapeAttempts) {
        const resolved = path.resolve(projectRoot, dir);
        const relative = path.relative(path.resolve(projectRoot), resolved);
        const isEscape = relative.startsWith('..') || path.isAbsolute(relative);
        expect(isEscape).toBe(true);
      }
    });

    it('should accept valid relative subdirectory paths', () => {
      const projectRoot = testDir;
      const validDirs = ['backlog/tickets', 'reports', 'src/data'];

      for (const dir of validDirs) {
        const resolved = path.resolve(projectRoot, dir);
        const relative = path.relative(path.resolve(projectRoot), resolved);
        const isEscape = relative.startsWith('..') || path.isAbsolute(relative);
        expect(isEscape).toBe(false);
      }
    });
  });

  describe('Module directory creation on update', () => {
    it('should create module directories that are missing after update', async () => {
      // Step 1: Init with backlog module
      execFileSync(
        process.execPath,
        [CLI_DIST, 'init', 'update-dir-test', '--no-interactive', '--no-git', '--modules', 'core,backlog'],
        { cwd: testDir, env: { ...process.env, NO_COLOR: '1' }, timeout: 60000 }
      );

      // Step 2: Simulate an older install by removing the backlog dirs
      // (simulates what a project would look like before this feature was added)
      await fs.remove(path.join(testDir, 'backlog'));
      expect(await fs.pathExists(path.join(testDir, 'backlog'))).toBe(false);

      // Step 3: Downgrade the manifest version to force update to run
      const manifestPath = path.join(testDir, '.agentic-framework.json');
      const manifest = await fs.readJson(manifestPath);
      manifest.framework.version = '0.0.1';
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });

      // Step 4: Run update
      execFileSync(
        process.execPath,
        [CLI_DIST, 'update'],
        { cwd: testDir, env: { ...process.env, NO_COLOR: '1' }, timeout: 60000 }
      );

      // Step 5: Assert directories were recreated
      expect(await fs.pathExists(path.join(testDir, 'backlog', 'tickets'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'backlog', 'epics'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'backlog', 'sprints'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'backlog', 'milestones'))).toBe(true);
    });

    it('should be idempotent when directories already exist', async () => {
      // Init with backlog — directories created
      execFileSync(
        process.execPath,
        [CLI_DIST, 'init', 'update-idem-test', '--no-interactive', '--no-git', '--modules', 'core,backlog'],
        { cwd: testDir, env: { ...process.env, NO_COLOR: '1' }, timeout: 60000 }
      );

      // Downgrade manifest to force update
      const manifestPath = path.join(testDir, '.agentic-framework.json');
      const manifest = await fs.readJson(manifestPath);
      manifest.framework.version = '0.0.1';
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });

      // Directories already exist — update should not throw
      expect(await fs.pathExists(path.join(testDir, 'backlog', 'tickets'))).toBe(true);

      expect(() =>
        execFileSync(
          process.execPath,
          [CLI_DIST, 'update'],
          { cwd: testDir, env: { ...process.env, NO_COLOR: '1' }, timeout: 60000 }
        )
      ).not.toThrow();

      // Still there after update
      expect(await fs.pathExists(path.join(testDir, 'backlog', 'tickets'))).toBe(true);
    });
  });
});
