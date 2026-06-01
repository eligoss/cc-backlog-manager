/**
 * Tests for CLI Context
 *
 * Tests the unified CLI context API that combines project resolution
 * and path resolution into a single, easy-to-use interface.
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
  CliContext,
  clearProjectCache,
  ProjectNotFoundError,
  isCliContext,
} from '../cli-context';

/**
 * Create an isolated test directory outside the project for tests
 * that need to verify "no project found" behavior.
 */
async function createIsolatedDir(prefix: string): Promise<string> {
  const tmpBase = os.tmpdir();
  return fs.mkdtemp(path.join(tmpBase, `cli-context-${prefix}-`));
}

async function cleanupIsolatedDir(dir: string): Promise<void> {
  try {
    await fs.remove(dir);
  } catch {
    // Ignore cleanup errors
  }
}

describe('CliContext', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('cli-context');
    clearProjectCache();
  });

  afterEach(async () => {
    clearProjectCache();
    await sandbox.cleanup();
  });

  describe('CliContext.create()', () => {
    it('should return valid context for project with manifest', async () => {
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
        },
        projectSkills: [],
        settings: {
          autoSyncSkills: true,
          linkTransformation: true,
        },
      };
      await sandbox.createJson('.agentic-framework.json', manifest);
      await sandbox.createFile('routes.yml', 'paths:\n  backlog:\n    tickets: .claude/backlog/tickets');

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.isInsideProject).toBe(true);
      expect(ctx.projectRoot).toBe(sandbox.path);
      expect(ctx.detectionMethod).toBe('manifest');
      expect(ctx.manifest).not.toBeNull();
      expect(ctx.paths).toBeDefined();
      expect(ctx.paths.projectRoot).toBe(sandbox.path);
    });

    it('should return context with isInsideProject=false when no project found (isolated dir)', async () => {
      // Use isolated directory outside project to test "no project found" behavior
      const isolatedDir = await createIsolatedDir('no-project');
      try {
        const ctx = await CliContext.create({ path: isolatedDir });

        expect(ctx.isInsideProject).toBe(false);
        expect(ctx.projectRoot).toBe(isolatedDir);
        expect(ctx.detectionMethod).toBe('cwd');
        expect(ctx.manifest).toBeNull();
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });

    it('should integrate path resolver correctly', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');
      await sandbox.createFile(
        'routes.yml',
        'paths:\n  backlog:\n    tickets: custom/tickets\n  plans:\n    root: custom/plans'
      );

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.paths.getTicketPath('story')).toBe(
        path.join(sandbox.path, 'custom/tickets/stories')
      );
      expect(ctx.paths.getPlanPath('framework')).toBe(
        path.join(sandbox.path, 'custom/plans/framework')
      );
    });

    it('should use fresh scan when fresh option is true', async () => {
      // First create a project
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      // Create context (which may cache)
      const ctx1 = await CliContext.create({ path: sandbox.path });
      expect(ctx1.isInsideProject).toBe(true);

      // Now test with fresh option
      const ctx2 = await CliContext.create({ path: sandbox.path, fresh: true });
      expect(ctx2.isInsideProject).toBe(true);
    });
  });

  describe('CliContext.require()', () => {
    it('should return context when inside a project', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const ctx = await CliContext.require({ path: sandbox.path });

      expect(ctx.isInsideProject).toBe(true);
      expect(ctx.projectRoot).toBe(sandbox.path);
    });

    it('should throw ProjectNotFoundError when not in project (isolated dir)', async () => {
      const isolatedDir = await createIsolatedDir('require-throw');
      try {
        await expect(CliContext.require({ path: isolatedDir })).rejects.toThrow(
          ProjectNotFoundError
        );
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });

    it('should include project path in error message (isolated dir)', async () => {
      const isolatedDir = await createIsolatedDir('require-error-msg');
      try {
        await CliContext.require({ path: isolatedDir });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ProjectNotFoundError);
        expect((error as Error).message).toContain(isolatedDir);
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });
  });

  describe('CliContext.createSync()', () => {
    it('should work synchronously', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const ctx = CliContext.createSync({ path: sandbox.path });

      expect(ctx.isInsideProject).toBe(true);
      expect(ctx.projectRoot).toBe(sandbox.path);
    });

    it('should integrate path resolver with routes.yml', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');
      await sandbox.createFile('routes.yml', 'paths:\n  backlog:\n    tickets: ai/tickets');

      const ctx = CliContext.createSync({ path: sandbox.path });

      expect(ctx.paths.getTicketPath('bug')).toBe(
        path.join(sandbox.path, 'ai/tickets/bugs')
      );
    });

    it('should return context with isInsideProject=false when no project (isolated dir)', async () => {
      const isolatedDir = await createIsolatedDir('sync-no-project');
      try {
        const ctx = CliContext.createSync({ path: isolatedDir });

        expect(ctx.isInsideProject).toBe(false);
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });
  });

  describe('CliContext.requireSync()', () => {
    it('should return context when inside a project', async () => {
      await sandbox.createFile('routes.yml', 'paths: {}');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const ctx = CliContext.requireSync({ path: sandbox.path });

      expect(ctx.isInsideProject).toBe(true);
    });

    it('should throw ProjectNotFoundError when not in project (isolated dir)', async () => {
      const isolatedDir = await createIsolatedDir('sync-require');
      try {
        expect(() => CliContext.requireSync({ path: isolatedDir })).toThrow(
          ProjectNotFoundError
        );
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });
  });

  describe('hasModule()', () => {
    it('should return true for installed modules', async () => {
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
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      await sandbox.createJson('.agentic-framework.json', manifest);

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.hasModule('core')).toBe(true);
      expect(ctx.hasModule('backlog')).toBe(true);
      expect(ctx.hasModule('planning')).toBe(true);
    });

    it('should return false for non-installed modules', async () => {
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
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      await sandbox.createJson('.agentic-framework.json', manifest);

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.hasModule('jira')).toBe(false);
      expect(ctx.hasModule('confluence')).toBe(false);
      expect(ctx.hasModule('nonexistent')).toBe(false);
    });

    it('should return false when no manifest', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.hasModule('core')).toBe(false);
      expect(ctx.hasModule('backlog')).toBe(false);
    });
  });

  describe('getInstalledModules()', () => {
    it('should return all installed module IDs', async () => {
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
          jira: { version: '1.2.0', installedAt: '2024-12-27T00:00:00Z' },
        },
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      await sandbox.createJson('.agentic-framework.json', manifest);

      const ctx = await CliContext.create({ path: sandbox.path });

      const modules = ctx.getInstalledModules();
      expect(modules).toEqual(['core', 'backlog', 'jira']);
    });

    it('should return empty array when no manifest', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.getInstalledModules()).toEqual([]);
    });

    it('should return empty array when modules is empty', async () => {
      const manifest = {
        version: '1.0.0',
        framework: {
          version: '1.2.0',
          installedAt: '2024-12-27T00:00:00Z',
          updatedAt: '2024-12-27T00:00:00Z',
        },
        modules: {},
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      await sandbox.createJson('.agentic-framework.json', manifest);

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.getInstalledModules()).toEqual([]);
    });
  });

  describe('getModuleVersion()', () => {
    it('should return version for installed module', async () => {
      const manifest = {
        version: '1.0.0',
        framework: {
          version: '1.2.0',
          installedAt: '2024-12-27T00:00:00Z',
          updatedAt: '2024-12-27T00:00:00Z',
        },
        modules: {
          core: { version: '1.2.0', installedAt: '2024-12-27T00:00:00Z' },
          backlog: { version: '1.1.0', installedAt: '2024-12-27T00:00:00Z' },
        },
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      await sandbox.createJson('.agentic-framework.json', manifest);

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.getModuleVersion('core')).toBe('1.2.0');
      expect(ctx.getModuleVersion('backlog')).toBe('1.1.0');
    });

    it('should return null for non-installed module', async () => {
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
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      await sandbox.createJson('.agentic-framework.json', manifest);

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.getModuleVersion('jira')).toBeNull();
    });

    it('should return null when no manifest', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.getModuleVersion('core')).toBeNull();
    });
  });

  describe('getFrameworkVersion()', () => {
    it('should return framework version from manifest', async () => {
      const manifest = {
        version: '1.0.0',
        framework: {
          version: '1.2.0',
          installedAt: '2024-12-27T00:00:00Z',
          updatedAt: '2024-12-27T00:00:00Z',
        },
        modules: {},
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      await sandbox.createJson('.agentic-framework.json', manifest);

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.getFrameworkVersion()).toBe('1.2.0');
    });

    it('should return null when no manifest', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.getFrameworkVersion()).toBeNull();
    });
  });

  describe('explicit path option overrides auto-detection', () => {
    it('should use provided path instead of cwd', async () => {
      // Create a project in a specific directory
      const projectDir = await sandbox.createDir('my-project');
      await sandbox.createFile('my-project/.git/.gitkeep', '');
      await sandbox.createDir('my-project/.git');
      await sandbox.createFile('my-project/CLAUDE.md', '# My Project');

      // Create context with explicit path
      const ctx = await CliContext.create({ path: projectDir });

      expect(ctx.projectRoot).toBe(projectDir);
      expect(ctx.isInsideProject).toBe(true);
    });

    it('should handle relative paths', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      // Use path option
      const ctx = await CliContext.create({ path: sandbox.path });

      expect(path.isAbsolute(ctx.projectRoot)).toBe(true);
    });

    it('should create context for non-project path with isInsideProject=false (isolated dir)', async () => {
      // Use isolated directory to test non-project behavior
      const isolatedDir = await createIsolatedDir('explicit-path');
      const emptyDir = path.join(isolatedDir, 'empty');
      await fs.mkdir(emptyDir);

      try {
        const ctx = await CliContext.create({ path: emptyDir });

        expect(ctx.isInsideProject).toBe(false);
        expect(ctx.projectRoot).toBe(emptyDir);
      } finally {
        await cleanupIsolatedDir(isolatedDir);
      }
    });
  });

  describe('isCliContext type guard', () => {
    it('should return true for CliContext instances', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(isCliContext(ctx)).toBe(true);
    });

    it('should return false for non-CliContext values', () => {
      expect(isCliContext(null)).toBe(false);
      expect(isCliContext(undefined)).toBe(false);
      expect(isCliContext({})).toBe(false);
      expect(isCliContext('string')).toBe(false);
      expect(isCliContext(123)).toBe(false);
      expect(isCliContext({ projectRoot: '/path' })).toBe(false);
    });
  });

  describe('integration with path resolver', () => {
    it('should provide all path resolver methods', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      const ctx = await CliContext.create({ path: sandbox.path });

      // All PathResolver methods should be available
      expect(typeof ctx.paths.resolve).toBe('function');
      expect(typeof ctx.paths.getTicketPath).toBe('function');
      expect(typeof ctx.paths.getPlanPath).toBe('function');
      expect(typeof ctx.paths.getContextPath).toBe('function');
      expect(typeof ctx.paths.getAgentPath).toBe('function');
      expect(typeof ctx.paths.getSkillPath).toBe('function');
      expect(typeof ctx.paths.getRegistryPath).toBe('function');
    });

    it('should use routes.yml config when available', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');
      const routesContent = `
paths:
  backlog:
    tickets: custom/tickets
  context:
    root: custom/context
  agents:
    root: custom/agents
`;
      await sandbox.createFile('routes.yml', routesContent);

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.paths.routesConfig).not.toBeNull();
      expect(ctx.paths.resolve('backlog.tickets')).toBe(
        path.join(sandbox.path, 'custom/tickets')
      );
      expect(ctx.paths.getContextPath()).toBe(path.join(sandbox.path, 'custom/context'));
      expect(ctx.paths.getAgentPath()).toBe(path.join(sandbox.path, 'custom/agents'));
    });

    it('should fallback to defaults when routes.yml is missing', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');
      // No routes.yml

      const ctx = await CliContext.create({ path: sandbox.path });

      expect(ctx.paths.routesConfig).toBeNull();
      // Should still work with defaults
      expect(ctx.paths.getTicketPath('story')).toContain('.claude/backlog/tickets/stories');
      expect(ctx.paths.getPlanPath()).toContain('.claude/plans');
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent create calls', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Project');

      // Create multiple contexts concurrently
      const [ctx1, ctx2, ctx3] = await Promise.all([
        CliContext.create({ path: sandbox.path }),
        CliContext.create({ path: sandbox.path }),
        CliContext.create({ path: sandbox.path }),
      ]);

      expect(ctx1.projectRoot).toBe(ctx2.projectRoot);
      expect(ctx2.projectRoot).toBe(ctx3.projectRoot);
      expect(ctx1.isInsideProject).toBe(true);
      expect(ctx2.isInsideProject).toBe(true);
      expect(ctx3.isInsideProject).toBe(true);
    });

    it('should handle nested project structures', async () => {
      // Create outer project
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Outer');

      // Create inner project with manifest (higher priority)
      const innerProject = await sandbox.createDir('inner');
      await sandbox.createJson('inner/.agentic-framework.json', {
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

      // Create a deep subdirectory in inner project
      const deepDir = await sandbox.createDir('inner/src/components');

      const ctx = await CliContext.create({ path: deepDir });

      expect(ctx.projectRoot).toBe(innerProject);
      expect(ctx.detectionMethod).toBe('manifest');
    });
  });
});
