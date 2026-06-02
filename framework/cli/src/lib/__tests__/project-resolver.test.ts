/**
 * Tests for Project Resolver
 *
 * Tests project root detection using multiple marker strategies:
 * - manifest: .agentic-framework.json
 * - git+claude: .git + CLAUDE.md
 * - cwd: fallback when no markers found
 *
 * Note: Some tests use /tmp for proper isolation because the test sandbox
 * is inside the project directory, so walking up would find the real project.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { createSandbox, TestSandbox } from './test-utils';
import {
  findProjectRoot,
  requireProjectContext,
  clearProjectCache,
  findProjectRootAsync,
  requireProjectContextAsync,
  getCachedContext,
  ProjectNotFoundError,
  type ProjectContext,
  type DetectionMethod,
} from '../project-resolver';

/**
 * Create an isolated test directory outside the project for tests
 * that need to verify "no project found" behavior.
 */
async function createIsolatedDir(prefix: string): Promise<string> {
  const tmpBase = os.tmpdir();
  return fs.mkdtemp(path.join(tmpBase, `${prefix}-`));
}

async function cleanupIsolatedDir(dir: string): Promise<void> {
  try {
    await fs.remove(dir);
  } catch {
    // Ignore cleanup errors
  }
}

describe('ProjectResolver', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('project-resolver');
    // Always clear cache before each test
    clearProjectCache();
  });

  afterEach(async () => {
    clearProjectCache();
    await sandbox.cleanup();
  });

  describe('findProjectRoot', () => {
    describe('manifest detection', () => {
      it('should detect project by .agentic-framework.json', async () => {
        // Create a valid manifest file
        const manifest = {
          version: '1.0.0',
          framework: {
            version: '1.2.0',
            installedAt: '2024-12-27T00:00:00Z',
            updatedAt: '2024-12-27T00:00:00Z',
          },
          modules: {
            core: { version: '1.2.0', installedAt: '2024-12-27T00:00:00Z' },
          },
          projectSkills: [],
          settings: {
            autoSyncSkills: true,
            linkTransformation: true,
          },
        };
        await sandbox.createJson('.agentic-framework.json', manifest);

        const context = findProjectRoot(sandbox.path);

        expect(context.isInsideProject).toBe(true);
        expect(context.projectRoot).toBe(sandbox.path);
        expect(context.detectionMethod).toBe('manifest');
        expect(context.manifest).not.toBeNull();
        expect(context.manifest?.framework.version).toBe('1.2.0');
      });

      it('should parse manifest with modules correctly', async () => {
        const manifest = {
          version: '1.0.0',
          framework: {
            version: '1.2.0',
            installedAt: '2024-12-27T00:00:00Z',
            updatedAt: '2024-12-27T00:00:00Z',
          },
          modules: {
            core: { version: '1.2.0', installedAt: '2024-12-27T00:00:00Z' },
            backlog: { version: '1.2.0', installedAt: '2024-12-27T00:00:00Z' },
            planning: { version: '1.2.0', installedAt: '2024-12-27T00:00:00Z' },
          },
          projectSkills: [],
          settings: {
            autoSyncSkills: true,
            linkTransformation: true,
          },
        };
        await sandbox.createJson('.agentic-framework.json', manifest);

        const context = findProjectRoot(sandbox.path);

        expect(context.manifest).not.toBeNull();
        expect(Object.keys(context.manifest!.modules)).toEqual([
          'core',
          'backlog',
          'planning',
        ]);
      });

      it('should handle malformed manifest gracefully', async () => {
        // Create an invalid JSON file
        await sandbox.createFile('.agentic-framework.json', '{ invalid json }');

        const context = findProjectRoot(sandbox.path);

        // Should still detect the project (file exists), but manifest is null
        expect(context.isInsideProject).toBe(true);
        expect(context.detectionMethod).toBe('manifest');
        expect(context.manifest).toBeNull();
      });
    });

    describe('git+claude detection', () => {
      it('should detect project by .git + CLAUDE.md', async () => {
        await sandbox.createDir('.git');
        await sandbox.createFile('CLAUDE.md', '# Project');

        const context = findProjectRoot(sandbox.path);

        expect(context.isInsideProject).toBe(true);
        expect(context.projectRoot).toBe(sandbox.path);
        expect(context.detectionMethod).toBe('git+claude');
        expect(context.manifest).toBeNull();
      });

      it('should NOT detect project with only .git (no CLAUDE.md) in isolated dir', async () => {
        // Use isolated directory outside project to test "no project found" behavior
        const isolatedDir = await createIsolatedDir('git-only');
        try {
          await fs.mkdir(path.join(isolatedDir, '.git'));

          const context = findProjectRoot(isolatedDir);

          expect(context.isInsideProject).toBe(false);
          expect(context.detectionMethod).toBe('cwd');
        } finally {
          await cleanupIsolatedDir(isolatedDir);
        }
      });

      it('should NOT detect project with only CLAUDE.md (no .git) in isolated dir', async () => {
        // Use isolated directory outside project to test "no project found" behavior
        const isolatedDir = await createIsolatedDir('claude-only');
        try {
          await fs.writeFile(path.join(isolatedDir, 'CLAUDE.md'), '# Project');

          const context = findProjectRoot(isolatedDir);

          // Should fall through to cwd detection
          expect(context.isInsideProject).toBe(false);
          expect(context.detectionMethod).toBe('cwd');
        } finally {
          await cleanupIsolatedDir(isolatedDir);
        }
      });
    });

    describe('fallback to cwd', () => {
      it('should return cwd with isInsideProject=false when no markers found in isolated dir', async () => {
        // Use isolated directory outside project to test "no project found" behavior
        const isolatedDir = await createIsolatedDir('empty');
        try {
          const context = findProjectRoot(isolatedDir);

          expect(context.isInsideProject).toBe(false);
          expect(context.projectRoot).toBe(isolatedDir);
          expect(context.detectionMethod).toBe('cwd');
          expect(context.manifest).toBeNull();
        } finally {
          await cleanupIsolatedDir(isolatedDir);
        }
      });
    });

    describe('detection priority', () => {
      it('should prefer manifest over git+claude', async () => {
        // Create both markers
        await sandbox.createJson('.agentic-framework.json', {
          version: '1.0.0',
          framework: {
            version: '1.2.0',
            installedAt: '2024-12-27T00:00:00Z',
            updatedAt: '2024-12-27T00:00:00Z',
          },
          modules: {},
          projectSkills: [],
          settings: { autoSyncSkills: true, linkTransformation: true },
        });
        await sandbox.createDir('.git');
        await sandbox.createFile('CLAUDE.md', '# Project');

        const context = findProjectRoot(sandbox.path);

        expect(context.detectionMethod).toBe('manifest');
      });
    });

    describe('walking up from subdirectory', () => {
      it('should find project root in parent directory', async () => {
        // Create project markers in root
        await sandbox.createJson('.agentic-framework.json', {
          version: '1.0.0',
          framework: {
            version: '1.2.0',
            installedAt: '2024-12-27T00:00:00Z',
            updatedAt: '2024-12-27T00:00:00Z',
          },
          modules: {},
          projectSkills: [],
          settings: { autoSyncSkills: true, linkTransformation: true },
        });

        // Create a deep subdirectory
        const deepDir = await sandbox.createDir('src/features/auth');

        const context = findProjectRoot(deepDir);

        expect(context.isInsideProject).toBe(true);
        expect(context.projectRoot).toBe(sandbox.path);
        expect(context.detectionMethod).toBe('manifest');
      });

      it('should find project root several levels up', async () => {
        // Create project markers in root
        await sandbox.createDir('.git');
        await sandbox.createFile('CLAUDE.md', '# Project');

        // Create a very deep subdirectory
        const deepDir = await sandbox.createDir('a/b/c/d/e/f/g');

        const context = findProjectRoot(deepDir);

        expect(context.isInsideProject).toBe(true);
        expect(context.projectRoot).toBe(sandbox.path);
        expect(context.detectionMethod).toBe('git+claude');
      });

      it('should stop at first detected project root', async () => {
        // Create outer project
        await sandbox.createDir('.git');
        await sandbox.createFile('CLAUDE.md', '# Outer Project');

        // Create nested project with manifest
        const innerProject = await sandbox.createDir('projects/inner');
        await sandbox.createJson('projects/inner/.agentic-framework.json', {
          version: '1.0.0',
          framework: {
            version: '1.2.0',
            installedAt: '2024-12-27T00:00:00Z',
            updatedAt: '2024-12-27T00:00:00Z',
          },
          modules: {},
          projectSkills: [],
          settings: { autoSyncSkills: true, linkTransformation: true },
        });

        // Create a subdirectory within inner project
        const innerDeep = await sandbox.createDir('projects/inner/src/utils');

        const context = findProjectRoot(innerDeep);

        expect(context.isInsideProject).toBe(true);
        expect(context.projectRoot).toBe(innerProject);
        expect(context.detectionMethod).toBe('manifest');
      });
    });
  });

  describe('requireProjectContext', () => {
    it('should return context when inside a project', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const context = requireProjectContext(sandbox.path);

      expect(context.isInsideProject).toBe(true);
      expect(context.projectRoot).toBe(sandbox.path);
    });

    it('should throw ProjectNotFoundError when not in project (isolated dir)', async () => {
      // Use isolated directory outside project to test error throwing
      const isolatedDir = await createIsolatedDir('require-test');
      try {
        expect(() => requireProjectContext(isolatedDir)).toThrow(ProjectNotFoundError);
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });

    it('should include helpful error message (isolated dir)', async () => {
      const isolatedDir = await createIsolatedDir('require-error-msg');
      try {
        requireProjectContext(isolatedDir);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ProjectNotFoundError);
        expect((error as Error).message).toContain('Not inside an Agentic Framework project');
        expect((error as Error).message).toContain(isolatedDir);
        expect((error as Error).message).toContain('agentic-framework init');
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });
  });

  describe('clearProjectCache', () => {
    it('should clear cached context', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      // First call without explicit path - should cache the result
      // Note: When using default cwd, the cache is populated
      clearProjectCache(); // Ensure clean state

      // Call without explicit path to trigger caching
      // (Cache only applies when startDir is not provided)
      const originalCwd = process.cwd();
      try {
        process.chdir(sandbox.path);
        const context1 = findProjectRoot();
        expect(context1.isInsideProject).toBe(true);

        // Verify cache is populated
        expect(getCachedContext()).not.toBeNull();

        // Clear cache
        clearProjectCache();

        // Verify cache is empty
        expect(getCachedContext()).toBeNull();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should cause findProjectRoot to rescan after clearing (isolated dir)', async () => {
      // Use isolated directory to test cache behavior
      const isolatedDir = await createIsolatedDir('cache-rescan');
      try {
        clearProjectCache();

        // First call with no markers - should not find project
        const context1 = findProjectRoot(isolatedDir);
        expect(context1.isInsideProject).toBe(false);

        // Now add markers
        await fs.mkdir(path.join(isolatedDir, '.git'));
        await fs.writeFile(path.join(isolatedDir, 'CLAUDE.md'), '# Project');

        // Clear cache (though cache only applies when no startDir)
        clearProjectCache();

        // Now should detect the project
        const context2 = findProjectRoot(isolatedDir);
        expect(context2.isInsideProject).toBe(true);
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });
  });

  describe('async variants', () => {
    it('findProjectRootAsync should detect project', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const context = await findProjectRootAsync(sandbox.path);

      expect(context.isInsideProject).toBe(true);
      expect(context.projectRoot).toBe(sandbox.path);
      expect(context.detectionMethod).toBe('git+claude');
    });

    it('findProjectRootAsync should return cwd when no project (isolated dir)', async () => {
      const isolatedDir = await createIsolatedDir('async-no-project');
      try {
        const context = await findProjectRootAsync(isolatedDir);

        expect(context.isInsideProject).toBe(false);
        expect(context.detectionMethod).toBe('cwd');
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });

    it('requireProjectContextAsync should throw when not in project (isolated dir)', async () => {
      const isolatedDir = await createIsolatedDir('async-require');
      try {
        await expect(requireProjectContextAsync(isolatedDir)).rejects.toThrow(
          ProjectNotFoundError
        );
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });

    it('requireProjectContextAsync should return context when in project', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const context = await requireProjectContextAsync(sandbox.path);

      expect(context.isInsideProject).toBe(true);
      expect(context.detectionMethod).toBe('git+claude');
    });
  });

  describe('edge cases', () => {
    it('should handle absolute paths correctly', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const absolutePath = path.resolve(sandbox.path);
      const context = findProjectRoot(absolutePath);

      expect(context.isInsideProject).toBe(true);
      expect(path.isAbsolute(context.projectRoot)).toBe(true);
    });

    it('should handle paths with trailing slashes', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const pathWithSlash = sandbox.path + '/';
      const context = findProjectRoot(pathWithSlash);

      expect(context.isInsideProject).toBe(true);
    });

    it('should handle empty manifest modules', async () => {
      await sandbox.createJson('.agentic-framework.json', {
        version: '1.0.0',
        framework: {
          version: '1.2.0',
          installedAt: '2024-12-27T00:00:00Z',
          updatedAt: '2024-12-27T00:00:00Z',
        },
        modules: {},
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      });

      const context = findProjectRoot(sandbox.path);

      expect(context.manifest).not.toBeNull();
      expect(Object.keys(context.manifest!.modules)).toEqual([]);
    });
  });
});
