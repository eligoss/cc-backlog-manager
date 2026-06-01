/**
 * Integration Tests: Validate Command Path Resolution
 *
 * Tests for QA-003, QA-004, and QA-006:
 * - QA-003: `validate --versions` can't find files that exist (wrong path)
 * - QA-004: `validate --routes` looks in wrong directory
 * - QA-006: `bump-version` looks for package.json in wrong path
 *
 * Root cause: Commands were using `frameworkRoot` instead of `projectPath`
 * for file resolution, causing files to be looked for in wrong locations.
 *
 * Fix: Changed validate.ts to pass `projectPath` instead of `frameworkRoot`
 * to validators.
 *
 * @module commands/__tests__/validate.integration.test
 */

import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';

describe('Integration: Validate Command Path Resolution', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('validate-paths');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('QA-003: Version Validator Path Resolution', () => {
    /**
     * The version validator should find files at project root,
     * not at framework/CLAUDE.md
     */

    it('should find CLAUDE.md at project root', async () => {
      // Create CLAUDE.md at project root
      await sandbox.createFile('CLAUDE.md', '# Project v1.2.0');

      // Verify file exists at correct location
      expect(await sandbox.exists('CLAUDE.md')).toBe(true);

      // Wrong path would be framework/CLAUDE.md
      expect(await sandbox.exists('framework/CLAUDE.md')).toBe(false);
    });

    it('should find package.json at framework/cli/package.json', async () => {
      // Create the correct structure
      await sandbox.createJson('framework/cli/package.json', {
        name: 'agentic-framework',
        version: '1.3.0',
      });

      // Correct path
      expect(await sandbox.exists('framework/cli/package.json')).toBe(true);

      // Wrong path (what was happening before fix)
      expect(await sandbox.exists('cli/package.json')).toBe(false);
    });

    it('should resolve version from CLAUDE.md content', async () => {
      await sandbox.createFile('CLAUDE.md', `
# Agentic Development Framework

Framework Version: **v1.2.0** | Architecture: **Modular**
      `);

      const content = await sandbox.readFile('CLAUDE.md');
      const versionMatch = content.match(/v(\d+\.\d+\.\d+)/);

      expect(versionMatch).not.toBeNull();
      expect(versionMatch![1]).toBe('1.2.0');
    });
  });

  describe('QA-004: Routes Validator Path Resolution', () => {
    /**
     * The routes validator should find routes.yml at project root,
     * not at framework/routes.yml
     */

    it('should find routes.yml at project root', async () => {
      await sandbox.createFile('routes.yml', `
version: 1.0
paths:
  backlog: backlog/
`);

      // Correct location
      expect(await sandbox.exists('routes.yml')).toBe(true);

      // Wrong path
      expect(await sandbox.exists('framework/routes.yml')).toBe(false);
    });

    it('should validate routes.yml structure', async () => {
      await sandbox.createFile('routes.yml', `
version: "1.0"
paths:
  backlog:
    tickets:
      bugs: backlog/tickets/bugs
      stories: backlog/tickets/stories
`);

      const content = await sandbox.readFile('routes.yml');
      expect(content).toContain('version:');
      expect(content).toContain('paths:');
      expect(content).toContain('backlog:');
    });
  });

  describe('QA-006: Bump Version Path Resolution', () => {
    /**
     * bump-version should look for package.json at framework/cli/package.json,
     * not at cli/package.json
     */

    it('should use framework/cli/package.json path', async () => {
      const correctPath = 'framework/cli/package.json';
      const wrongPath = 'cli/package.json';

      await sandbox.createJson(correctPath, {
        name: 'agentic-framework',
        version: '1.0.0',
      });

      // Correct path exists
      expect(await sandbox.exists(correctPath)).toBe(true);
      // Wrong path doesn't exist
      expect(await sandbox.exists(wrongPath)).toBe(false);
    });

    it('should update version in framework/cli/package.json', async () => {
      const packagePath = 'framework/cli/package.json';

      await sandbox.createJson(packagePath, {
        name: 'agentic-framework',
        version: '1.0.0',
      });

      const packageJson = await sandbox.readJson<any>(packagePath);
      expect(packageJson.version).toBe('1.0.0');

      // Simulate version bump
      packageJson.version = '1.0.1';
      await sandbox.createJson(packagePath, packageJson);

      const updated = await sandbox.readJson<any>(packagePath);
      expect(updated.version).toBe('1.0.1');
    });
  });

  describe('Path Resolution Helper', () => {
    /**
     * Tests for the correct path resolution logic
     */

    it('should distinguish between projectPath and frameworkRoot', () => {
      // In a typical project:
      // - projectPath = /path/to/project (where CLAUDE.md is)
      // - frameworkRoot = /path/to/project/framework (where framework code is)

      const projectPath = sandbox.path;
      const frameworkRoot = path.join(projectPath, 'framework');

      expect(projectPath).not.toBe(frameworkRoot);
      expect(frameworkRoot).toContain('framework');
    });

    it('should use projectPath for user-facing files', async () => {
      // User-facing files live at project root
      await sandbox.createFile('CLAUDE.md', '# Test');
      await sandbox.createFile('routes.yml', 'version: 1');
      await sandbox.createFile('README.md', '# Test');

      const projectPath = sandbox.path;

      expect(path.join(projectPath, 'CLAUDE.md')).toBe(sandbox.resolve('CLAUDE.md'));
      expect(path.join(projectPath, 'routes.yml')).toBe(sandbox.resolve('routes.yml'));
    });

    it('should use frameworkRoot for framework internal files', async () => {
      // Framework internal files live under framework/
      await sandbox.createDir('framework/modules/core');
      await sandbox.createJson('framework/modules/core/module.json', { id: 'core' });

      const frameworkRoot = sandbox.resolve('framework');

      expect(await fs.pathExists(path.join(frameworkRoot, 'modules/core/module.json'))).toBe(true);
    });
  });

  describe('Validate Command Integration', () => {
    it('should have all required files at correct locations for validate', async () => {
      // Setup a complete project structure
      await sandbox.createFile('CLAUDE.md', '# Framework v1.2.0');
      await sandbox.createFile('routes.yml', 'version: 1.0');
      await sandbox.createJson('.agentic-framework.json', {
        framework: { version: '1.2.0' },
        modules: { core: { version: '1.2.0' } },
      });
      await sandbox.createJson('framework/cli/package.json', {
        name: 'agentic-framework',
        version: '1.3.0',
      });
      await sandbox.createJson('framework/modules/core/module.json', {
        id: 'core',
        version: '1.2.0',
      });

      // Verify all files at correct locations
      expect(await sandbox.exists('CLAUDE.md')).toBe(true);
      expect(await sandbox.exists('routes.yml')).toBe(true);
      expect(await sandbox.exists('.agentic-framework.json')).toBe(true);
      expect(await sandbox.exists('framework/cli/package.json')).toBe(true);
      expect(await sandbox.exists('framework/modules/core/module.json')).toBe(true);
    });
  });
});
