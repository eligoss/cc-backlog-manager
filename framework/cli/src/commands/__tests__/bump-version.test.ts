import path from 'path';
import fs from 'fs-extra';
import { bumpVersion, BumpVersionOptions, parseVersion, incrementVersion, validateVersionFormat } from '../bump-version.js';

describe('bump-version', () => {
  const FIXTURES_DIR = path.join(__dirname, '__fixtures__', 'bump-version');

  // Suppress console output during tests
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(async () => {
    await fs.ensureDir(FIXTURES_DIR);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterAll(async () => {
    await fs.remove(FIXTURES_DIR);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('parseVersion', () => {
    it('should parse valid semantic version X.Y.Z', () => {
      const result = parseVersion('1.2.3');
      expect(result).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('should parse version with major and minor only (X.Y)', () => {
      const result = parseVersion('1.2');
      expect(result).toEqual({ major: 1, minor: 2, patch: 0 });
    });

    it('should parse version with major only', () => {
      const result = parseVersion('1');
      expect(result).toEqual({ major: 1, minor: 0, patch: 0 });
    });

    it('should throw error for invalid version format', () => {
      expect(() => parseVersion('abc')).toThrow('Invalid version format');
    });

    it('should throw error for negative numbers', () => {
      expect(() => parseVersion('-1.0.0')).toThrow('Invalid version format');
    });

    it('should throw error for empty string', () => {
      expect(() => parseVersion('')).toThrow('Invalid version format');
    });
  });

  describe('validateVersionFormat', () => {
    it('should validate correct semantic version', () => {
      expect(validateVersionFormat('1.2.3')).toBe(true);
    });

    it('should validate version with pre-release tag', () => {
      expect(validateVersionFormat('1.2.3-beta.1')).toBe(true);
    });

    it('should validate version with build metadata', () => {
      expect(validateVersionFormat('1.2.3+20231215')).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(validateVersionFormat('1.2')).toBe(false);
    });

    it('should reject version with text', () => {
      expect(validateVersionFormat('v1.2.3')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateVersionFormat('')).toBe(false);
    });
  });

  describe('incrementVersion', () => {
    it('should increment major version (1.2.3 -> 2.0.0)', () => {
      const result = incrementVersion('1.2.3', 'major');
      expect(result).toBe('2.0.0');
    });

    it('should increment minor version (1.2.3 -> 1.3.0)', () => {
      const result = incrementVersion('1.2.3', 'minor');
      expect(result).toBe('1.3.0');
    });

    it('should increment patch version (1.2.3 -> 1.2.4)', () => {
      const result = incrementVersion('1.2.3', 'patch');
      expect(result).toBe('1.2.4');
    });

    it('should handle version 0.0.0', () => {
      expect(incrementVersion('0.0.0', 'major')).toBe('1.0.0');
      expect(incrementVersion('0.0.0', 'minor')).toBe('0.1.0');
      expect(incrementVersion('0.0.0', 'patch')).toBe('0.0.1');
    });

    it('should throw error for invalid bump type', () => {
      expect(() => incrementVersion('1.0.0', 'invalid' as any)).toThrow('Invalid bump type');
    });
  });

  describe('bumpVersion - dry-run mode', () => {
    it('should not modify files in dry-run mode', async () => {
      const testDir = path.join(FIXTURES_DIR, 'dry-run-test');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
      await fs.ensureDir(path.join(testDir, 'modules', 'core'));

      // Create initial files
      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
      );
      await fs.writeFile(
        path.join(testDir, 'modules', 'core', 'module.json'),
        JSON.stringify({ id: 'core', version: '1.0.0' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'patch',
        dryRun: true
      };

      const result = await bumpVersion(options);

      // Files should not be modified
      const packageJson = await fs.readJson(path.join(testDir, 'framework', 'cli', 'package.json'));
      expect(packageJson.version).toBe('1.0.0');

      const moduleJson = await fs.readJson(path.join(testDir, 'modules', 'core', 'module.json'));
      expect(moduleJson.version).toBe('1.0.0');

      // Result should show what would happen
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('1.0.1');
      // In dry-run mode, we still count files that would be updated
      expect(result.filesUpdated).toBeGreaterThan(0);
      expect(result.dryRun).toBe(true);
    });

    it('should preview changes correctly in dry-run mode', async () => {
      const testDir = path.join(FIXTURES_DIR, 'dry-run-preview');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'major',
        dryRun: true
      };

      const result = await bumpVersion(options);

      expect(result.currentVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('2.0.0');
      expect(result.dryRun).toBe(true);
    });
  });

  describe('bumpVersion - major version bump', () => {
    it('should bump major version correctly (1.0.0 -> 2.0.0)', async () => {
      const testDir = path.join(FIXTURES_DIR, 'major-bump');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
      await fs.ensureDir(path.join(testDir, 'modules', 'core'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
      );
      await fs.writeFile(
        path.join(testDir, 'modules', 'core', 'module.json'),
        JSON.stringify({ id: 'core', version: '1.0.0' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'major',
        dryRun: false
      };

      const result = await bumpVersion(options);

      expect(result.currentVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('2.0.0');
      expect(result.filesUpdated).toBeGreaterThan(0);

      // Verify files were updated
      const packageJson = await fs.readJson(path.join(testDir, 'framework', 'cli', 'package.json'));
      expect(packageJson.version).toBe('2.0.0');

      const moduleJson = await fs.readJson(path.join(testDir, 'modules', 'core', 'module.json'));
      expect(moduleJson.version).toBe('2.0.0');
    });
  });

  describe('bumpVersion - minor version bump', () => {
    it('should bump minor version correctly (1.0.0 -> 1.1.0)', async () => {
      const testDir = path.join(FIXTURES_DIR, 'minor-bump');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
      await fs.ensureDir(path.join(testDir, 'modules', 'core'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
      );
      await fs.writeFile(
        path.join(testDir, 'modules', 'core', 'module.json'),
        JSON.stringify({ id: 'core', version: '1.0.0' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'minor',
        dryRun: false
      };

      const result = await bumpVersion(options);

      expect(result.currentVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('1.1.0');

      const packageJson = await fs.readJson(path.join(testDir, 'framework', 'cli', 'package.json'));
      expect(packageJson.version).toBe('1.1.0');
    });
  });

  describe('bumpVersion - patch version bump', () => {
    it('should bump patch version correctly (1.0.0 -> 1.0.1)', async () => {
      const testDir = path.join(FIXTURES_DIR, 'patch-bump');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
      await fs.ensureDir(path.join(testDir, 'modules', 'core'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
      );
      await fs.writeFile(
        path.join(testDir, 'modules', 'core', 'module.json'),
        JSON.stringify({ id: 'core', version: '1.0.0' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'patch',
        dryRun: false
      };

      const result = await bumpVersion(options);

      expect(result.currentVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('1.0.1');

      const packageJson = await fs.readJson(path.join(testDir, 'framework', 'cli', 'package.json'));
      expect(packageJson.version).toBe('1.0.1');
    });
  });

  describe('bumpVersion - custom version', () => {
    it('should set specific version when --version is provided', async () => {
      const testDir = path.join(FIXTURES_DIR, 'custom-version');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
      await fs.ensureDir(path.join(testDir, 'modules', 'core'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
      );
      await fs.writeFile(
        path.join(testDir, 'modules', 'core', 'module.json'),
        JSON.stringify({ id: 'core', version: '1.0.0' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        version: '2.5.0',
        dryRun: false
      };

      const result = await bumpVersion(options);

      expect(result.currentVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('2.5.0');

      const packageJson = await fs.readJson(path.join(testDir, 'framework', 'cli', 'package.json'));
      expect(packageJson.version).toBe('2.5.0');

      const moduleJson = await fs.readJson(path.join(testDir, 'modules', 'core', 'module.json'));
      expect(moduleJson.version).toBe('2.5.0');
    });

    it('should reject invalid custom version format', async () => {
      const testDir = path.join(FIXTURES_DIR, 'invalid-custom-version');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        version: '1.2',
        dryRun: false
      };

      await expect(bumpVersion(options)).rejects.toThrow('Invalid version format');
    });
  });

  describe('bumpVersion - multiple files', () => {
    it('should update all version files', async () => {
      const testDir = path.join(FIXTURES_DIR, 'multiple-files');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
      await fs.ensureDir(path.join(testDir, 'modules', 'core'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
      );
      await fs.writeFile(
        path.join(testDir, 'modules', 'core', 'module.json'),
        JSON.stringify({ id: 'core', version: '1.0.0' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'patch',
        dryRun: false
      };

      const result = await bumpVersion(options);

      expect(result.filesUpdated).toBeGreaterThanOrEqual(2);

      // Verify all files
      const packageJson = await fs.readJson(path.join(testDir, 'framework', 'cli', 'package.json'));
      expect(packageJson.version).toBe('1.0.1');

      const moduleJson = await fs.readJson(path.join(testDir, 'modules', 'core', 'module.json'));
      expect(moduleJson.version).toBe('1.0.1');
    });
  });

  describe('bumpVersion - current version detection', () => {
    it('should detect current version from cli/package.json', async () => {
      const testDir = path.join(FIXTURES_DIR, 'version-detection');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test', version: '3.2.1' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'patch',
        dryRun: true
      };

      const result = await bumpVersion(options);

      expect(result.currentVersion).toBe('3.2.1');
      expect(result.newVersion).toBe('3.2.2');
    });

    it('should throw error if package.json not found', async () => {
      const testDir = path.join(FIXTURES_DIR, 'no-package-json');
      await fs.ensureDir(testDir);

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'patch',
        dryRun: false
      };

      await expect(bumpVersion(options)).rejects.toThrow();
    });

    it('should throw error if package.json has no version', async () => {
      const testDir = path.join(FIXTURES_DIR, 'no-version-field');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'patch',
        dryRun: false
      };

      await expect(bumpVersion(options)).rejects.toThrow();
    });
  });

  describe('bumpVersion - edge cases', () => {
    it('should handle missing module.json gracefully', async () => {
      const testDir = path.join(FIXTURES_DIR, 'missing-module-json');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'patch',
        dryRun: false
      };

      const result = await bumpVersion(options);

      expect(result.currentVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('1.0.1');
      // Should still update package.json
      expect(result.filesUpdated).toBeGreaterThanOrEqual(1);
    });

    it('should preserve JSON formatting when updating files', async () => {
      const testDir = path.join(FIXTURES_DIR, 'preserve-formatting');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));

      const originalContent = {
        name: 'test',
        version: '1.0.0',
        description: 'Test package',
        keywords: ['test']
      };

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify(originalContent, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'patch',
        dryRun: false
      };

      await bumpVersion(options);

      const updated = await fs.readJson(path.join(testDir, 'framework', 'cli', 'package.json'));
      expect(updated.name).toBe('test');
      expect(updated.description).toBe('Test package');
      expect(updated.keywords).toEqual(['test']);
      expect(updated.version).toBe('1.0.1');
    });

    it('should handle nested module.json files', async () => {
      const testDir = path.join(FIXTURES_DIR, 'nested-modules');
      await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
      await fs.ensureDir(path.join(testDir, 'modules', 'core'));
      await fs.ensureDir(path.join(testDir, 'modules', 'backlog'));
      await fs.ensureDir(path.join(testDir, 'modules', 'planning'));

      await fs.writeFile(
        path.join(testDir, 'framework', 'cli', 'package.json'),
        JSON.stringify({ version: '1.0.0' }, null, 2)
      );
      await fs.writeFile(
        path.join(testDir, 'modules', 'core', 'module.json'),
        JSON.stringify({ id: 'core', version: '1.0.0' }, null, 2)
      );
      await fs.writeFile(
        path.join(testDir, 'modules', 'backlog', 'module.json'),
        JSON.stringify({ id: 'backlog', version: '1.0.0' }, null, 2)
      );
      await fs.writeFile(
        path.join(testDir, 'modules', 'planning', 'module.json'),
        JSON.stringify({ id: 'planning', version: '1.0.0' }, null, 2)
      );

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'minor',
        dryRun: false
      };

      const result = await bumpVersion(options);

      expect(result.newVersion).toBe('1.1.0');

      // Verify all module.json files updated
      const coreModule = await fs.readJson(path.join(testDir, 'modules', 'core', 'module.json'));
      const backlogModule = await fs.readJson(path.join(testDir, 'modules', 'backlog', 'module.json'));
      const planningModule = await fs.readJson(path.join(testDir, 'modules', 'planning', 'module.json'));

      expect(coreModule.version).toBe('1.1.0');
      expect(backlogModule.version).toBe('1.1.0');
      expect(planningModule.version).toBe('1.1.0');
    });
  });

  describe('bumpVersion - error handling', () => {
    it('should throw error when neither type nor version is provided', async () => {
      const testDir = path.join(FIXTURES_DIR, 'no-type-or-version');
      await fs.ensureDir(testDir);

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        dryRun: false
      };

      await expect(bumpVersion(options)).rejects.toThrow();
    });

    it('should throw error when both type and version are provided', async () => {
      const testDir = path.join(FIXTURES_DIR, 'both-type-and-version');
      await fs.ensureDir(testDir);

      const options: BumpVersionOptions = {
        projectRoot: testDir,
        type: 'patch',
        version: '2.0.0',
        dryRun: false
      };

      await expect(bumpVersion(options)).rejects.toThrow();
    });
  });
});
