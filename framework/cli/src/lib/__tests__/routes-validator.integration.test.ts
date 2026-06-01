import path from 'path';
import fs from 'fs-extra';
import {
  RoutesValidator,
  RoutesEntry,
  RoutesValidationResult,
} from '../routes-validator';
import { createSandbox, TestSandbox } from './test-utils/sandbox';

describe('RoutesValidator', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let validator: RoutesValidator;

  // Create a test fixture with directories and routes.yml
  async function createTestFixture(
    directories: string[],
    routesContent: any = null
  ) {
    sandbox = await createSandbox('routes-validator');
    testDir = sandbox.path;

    // Create directories
    for (const dir of directories) {
      const fullPath = path.join(testDir, dir);
      await fs.ensureDir(fullPath);
      // Add a real file so directory is meaningful
      await fs.writeFile(path.join(fullPath, 'README.md'), '# Test');
    }

    // Create routes.yml if provided
    if (routesContent !== null) {
      const yaml = require('yaml');
      await fs.writeFile(
        path.join(testDir, 'routes.yml'),
        yaml.stringify(routesContent)
      );
    }

    return testDir;
  }

  afterEach(async () => {
    if (sandbox) {
      await sandbox.cleanup();
    }
  });

  describe('constructor', () => {
    it('should create validator with framework root path', () => {
      const validator = new RoutesValidator('/some/path');
      expect(validator).toBeDefined();
    });

    it('should resolve and store absolute path', () => {
      const validator = new RoutesValidator('.');
      expect(validator.frameworkRoot).toBeTruthy();
    });
  });

  describe('scanFilesystem()', () => {
    it('should scan and return all directories', async () => {
      await createTestFixture([
        'core',
        'core/ai',
        'core/ai/agents',
        'modules',
        'modules/planning',
      ]);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).toContain('core');
      expect(dirs).toContain('core/ai');
      expect(dirs).toContain('core/ai/agents');
      expect(dirs).toContain('modules');
      expect(dirs).toContain('modules/planning');
    });

    it('should exclude .git directory', async () => {
      await createTestFixture(['core', '.git', '.git/objects']);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).toContain('core');
      expect(dirs).not.toContain('.git');
      expect(dirs).not.toContain('.git/objects');
    });

    it('should exclude node_modules directory', async () => {
      await createTestFixture(['src', 'node_modules', 'node_modules/package']);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).toContain('src');
      expect(dirs).not.toContain('node_modules');
      expect(dirs).not.toContain('node_modules/package');
    });

    it('should exclude hidden directories', async () => {
      await createTestFixture(['core', '.vscode', '.obsidian', '.DS_Store']);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).toContain('core');
      expect(dirs).not.toContain('.vscode');
      expect(dirs).not.toContain('.obsidian');
      expect(dirs).not.toContain('.DS_Store');
    });

    it('should exclude __pycache__ directory', async () => {
      await createTestFixture(['src', 'src/__pycache__']);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).toContain('src');
      expect(dirs).not.toContain('src/__pycache__');
    });

    it('should exclude .pytest_cache directory', async () => {
      await createTestFixture(['tests', 'tests/.pytest_cache']);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).toContain('tests');
      expect(dirs).not.toContain('tests/.pytest_cache');
    });

    it('should exclude .claude directory', async () => {
      await createTestFixture(['core', '.claude', '.claude/skills']);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).toContain('core');
      expect(dirs).not.toContain('.claude');
      expect(dirs).not.toContain('.claude/skills');
    });

    it('should normalize paths with forward slashes', async () => {
      await createTestFixture(['core/ai/agents']);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      // All paths should use forward slashes
      dirs.forEach(dir => {
        expect(dir).not.toContain('\\');
      });
    });

    it('should handle empty directory structure', async () => {
      await createTestFixture([]);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs.length).toBe(0);
    });

    it('should skip deeply nested directories (>4 levels)', async () => {
      await createTestFixture([
        'level1',
        'level1/level2',
        'level1/level2/level3',
        'level1/level2/level3/level4',
        'level1/level2/level3/level4/level5',
      ]);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).toContain('level1');
      expect(dirs).toContain('level1/level2');
      expect(dirs).toContain('level1/level2/level3');
      expect(dirs).toContain('level1/level2/level3/level4');
      // level5 should be excluded (depth > 4)
      expect(dirs).not.toContain('level1/level2/level3/level4/level5');
    });

    it('should skip directories with only .gitkeep', async () => {
      await createTestFixture(['empty-dir']);

      // Replace README.md with .gitkeep
      await fs.remove(path.join(testDir, 'empty-dir', 'README.md'));
      await fs.writeFile(path.join(testDir, 'empty-dir', '.gitkeep'), '');

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).not.toContain('empty-dir');
    });

    it('should skip directories with only .DS_Store', async () => {
      await createTestFixture(['macos-dir']);

      await fs.remove(path.join(testDir, 'macos-dir', 'README.md'));
      await fs.writeFile(path.join(testDir, 'macos-dir', '.DS_Store'), '');

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).not.toContain('macos-dir');
    });
  });

  describe('parseRoutesYml()', () => {
    it('should parse valid routes.yml', async () => {
      const routesContent = {
        version: '1.0.0',
        paths: {
          core: {
            root: 'core/',
            'ai-agents': 'core/ai/agents/',
          },
          modules: {
            root: 'modules/',
            planning: 'modules/planning/',
          },
        },
      };

      await createTestFixture([], routesContent);

      validator = new RoutesValidator(testDir);
      const entries = await validator.parseRoutesYml();

      expect(entries).toContainEqual(
        expect.objectContaining({ path: 'core', exists: false })
      );
      expect(entries).toContainEqual(
        expect.objectContaining({ path: 'core/ai/agents', exists: false })
      );
      expect(entries).toContainEqual(
        expect.objectContaining({ path: 'modules', exists: false })
      );
      expect(entries).toContainEqual(
        expect.objectContaining({ path: 'modules/planning', exists: false })
      );
    });

    it('should handle missing routes.yml gracefully', async () => {
      await createTestFixture(['core']);

      validator = new RoutesValidator(testDir);
      await expect(validator.parseRoutesYml()).rejects.toThrow(/not found/);
    });

    it('should handle empty routes.yml', async () => {
      await createTestFixture([], {});

      validator = new RoutesValidator(testDir);
      const entries = await validator.parseRoutesYml();

      expect(entries).toEqual([]);
    });

    it('should handle routes.yml without paths section', async () => {
      await createTestFixture([], { version: '1.0.0' });

      validator = new RoutesValidator(testDir);
      const entries = await validator.parseRoutesYml();

      expect(entries).toEqual([]);
    });

    it('should normalize paths by removing trailing slashes', async () => {
      const routesContent = {
        paths: {
          core: {
            root: 'core/',
            src: 'core/src/',
          },
        },
      };

      await createTestFixture([], routesContent);

      validator = new RoutesValidator(testDir);
      const entries = await validator.parseRoutesYml();

      // All paths should be normalized without trailing slashes
      entries.forEach(entry => {
        expect(entry.path).not.toMatch(/\/$/);
      });
    });

    it('should handle malformed YAML gracefully', async () => {
      await createTestFixture([]);
      await fs.writeFile(
        path.join(testDir, 'routes.yml'),
        'invalid: yaml: content: ::::'
      );

      validator = new RoutesValidator(testDir);
      await expect(validator.parseRoutesYml()).rejects.toThrow();
    });

    it('should mark existing paths correctly', async () => {
      const routesContent = {
        paths: {
          core: {
            root: 'core/',
          },
        },
      };

      await createTestFixture(['core'], routesContent);

      validator = new RoutesValidator(testDir);
      const entries = await validator.parseRoutesYml();

      const coreEntry = entries.find(e => e.path === 'core');
      expect(coreEntry?.exists).toBe(true);
    });
  });

  describe('validateRoutes()', () => {
    it('should return valid when routes.yml matches filesystem', async () => {
      const routesContent = {
        paths: {
          core: {
            root: 'core/',
            ai: 'core/ai/',
            'ai-agents': 'core/ai/agents/',
          },
        },
      };

      await createTestFixture(['core', 'core/ai', 'core/ai/agents'], routesContent);

      validator = new RoutesValidator(testDir);
      const result = await validator.validateRoutes();

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.undefined).toEqual([]);
    });

    it('should detect missing directories (in routes.yml but not filesystem)', async () => {
      const routesContent = {
        paths: {
          core: {
            root: 'core/',
          },
          modules: {
            root: 'modules/',
          },
        },
      };

      await createTestFixture(['core'], routesContent);

      validator = new RoutesValidator(testDir);
      const result = await validator.validateRoutes();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('modules');
      expect(result.undefined).toEqual([]);
    });

    it('should detect undefined directories (in filesystem but not routes.yml)', async () => {
      const routesContent = {
        paths: {
          core: {
            root: 'core/',
          },
        },
      };

      await createTestFixture(['core', 'modules', 'modules/planning'], routesContent);

      validator = new RoutesValidator(testDir);
      const result = await validator.validateRoutes();

      expect(result.valid).toBe(false);
      expect(result.undefined).toContain('modules');
      expect(result.undefined).toContain('modules/planning');
      expect(result.missing).toEqual([]);
    });

    it('should detect both missing and undefined directories', async () => {
      const routesContent = {
        paths: {
          core: {
            root: 'core/',
          },
          nonexistent: {
            root: 'nonexistent/',
          },
        },
      };

      await createTestFixture(['core', 'modules'], routesContent);

      validator = new RoutesValidator(testDir);
      const result = await validator.validateRoutes();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('nonexistent');
      expect(result.undefined).toContain('modules');
    });

    it('should include synced directories in result', async () => {
      const routesContent = {
        paths: {
          core: {
            root: 'core/',
          },
        },
      };

      await createTestFixture(['core'], routesContent);

      validator = new RoutesValidator(testDir);
      const result = await validator.validateRoutes();

      expect(result.synced).toContain('core');
    });

    it('should handle planned directories correctly', async () => {
      const routesContent = {
        paths: {
          core: {
            root: 'core/',
          },
          confluence: {
            root: 'confluence/',
            published: 'confluence/published/',
          },
        },
      };

      await createTestFixture(['core'], routesContent);

      validator = new RoutesValidator(testDir);
      const result = await validator.validateRoutes();

      // confluence/published is a planned directory, should not be in missing
      expect(result.missing).not.toContain('confluence/published');
    });
  });

  describe('generateRoutesYml()', () => {
    it('should generate correct routes.yml structure from filesystem', async () => {
      await createTestFixture(['core', 'core/ai', 'modules']);

      validator = new RoutesValidator(testDir);
      const yaml = await validator.generateRoutesYml();

      expect(yaml).toContain('paths:');
      expect(yaml).toContain('core:');
      expect(yaml).toContain('root: core/');
      expect(yaml).toContain('modules:');
    });

    it('should preserve existing descriptions when generating', async () => {
      const routesContent = {
        version: '1.0.0',
        description: 'Framework routes',
        paths: {
          core: {
            root: 'core/',
          },
        },
      };

      await createTestFixture(['core', 'modules'], routesContent);

      validator = new RoutesValidator(testDir);
      const yaml = await validator.generateRoutesYml();

      expect(yaml).toContain('version: 1.0.0');
      expect(yaml).toContain('description: Framework routes');
    });

    it('should add new directories to routes.yml', async () => {
      const routesContent = {
        paths: {
          core: {
            root: 'core/',
          },
        },
      };

      await createTestFixture(['core', 'modules', 'modules/planning'], routesContent);

      validator = new RoutesValidator(testDir);
      const yaml = await validator.generateRoutesYml();

      expect(yaml).toContain('modules:');
      expect(yaml).toContain('planning: modules/planning/');
    });

    it('should remove obsolete entries', async () => {
      const routesContent = {
        paths: {
          core: {
            root: 'core/',
          },
          obsolete: {
            root: 'obsolete/',
          },
        },
      };

      await createTestFixture(['core'], routesContent);

      validator = new RoutesValidator(testDir);
      const yaml = await validator.generateRoutesYml();

      expect(yaml).toContain('core:');
      expect(yaml).not.toContain('obsolete:');
    });

    it('should update meta section with last-updated date', async () => {
      const routesContent = {
        meta: {
          'last-updated': '2024-01-01',
          'sync-status': 'outdated',
        },
        paths: {
          core: {
            root: 'core/',
          },
        },
      };

      await createTestFixture(['core'], routesContent);

      validator = new RoutesValidator(testDir);
      const yaml = await validator.generateRoutesYml();

      expect(yaml).toContain('last-updated:');
      expect(yaml).toContain('sync-status: synchronized');
      // Should have today's date
      const today = new Date().toISOString().split('T')[0];
      expect(yaml).toContain(today);
    });

    it('should organize paths hierarchically', async () => {
      await createTestFixture([
        'core',
        'core/ai',
        'core/ai/agents',
        'core/src',
      ]);

      validator = new RoutesValidator(testDir);
      const yaml = await validator.generateRoutesYml();

      expect(yaml).toContain('core:');
      expect(yaml).toContain('root: core/');
      expect(yaml).toContain('ai: core/ai/');
      expect(yaml).toContain('ai-agents: core/ai/agents/');
      expect(yaml).toContain('src: core/src/');
    });
  });

  describe('applyFix()', () => {
    it('should write updated routes.yml to disk', async () => {
      await createTestFixture(['core', 'modules']);

      // Create a minimal routes.yml
      const yaml = require('yaml');
      await fs.writeFile(
        path.join(testDir, 'routes.yml'),
        yaml.stringify({ paths: { core: { root: 'core/' } } })
      );

      validator = new RoutesValidator(testDir);
      const success = await validator.applyFix();

      expect(success).toBe(true);

      // Verify file was updated
      const updated = await fs.readFile(path.join(testDir, 'routes.yml'), 'utf-8');
      expect(updated).toContain('modules:');
    });

    it('should return true on successful update', async () => {
      await createTestFixture(['core']);
      const yaml = require('yaml');
      await fs.writeFile(
        path.join(testDir, 'routes.yml'),
        yaml.stringify({ paths: {} })
      );

      validator = new RoutesValidator(testDir);
      const success = await validator.applyFix();

      expect(success).toBe(true);
    });

    it('should handle write errors gracefully', async () => {
      await createTestFixture(['core']);
      const yaml = require('yaml');
      await fs.writeFile(
        path.join(testDir, 'routes.yml'),
        yaml.stringify({ paths: {} })
      );

      // Make routes.yml read-only
      await fs.chmod(path.join(testDir, 'routes.yml'), 0o444);

      validator = new RoutesValidator(testDir);
      const success = await validator.applyFix();

      expect(success).toBe(false);

      // Restore permissions for cleanup
      await fs.chmod(path.join(testDir, 'routes.yml'), 0o644);
    });

    it('should preserve YAML formatting', async () => {
      const routesContent = {
        version: '1.0.0',
        paths: {
          core: {
            root: 'core/',
          },
        },
      };

      await createTestFixture(['core'], routesContent);

      validator = new RoutesValidator(testDir);
      await validator.applyFix();

      const updated = await fs.readFile(path.join(testDir, 'routes.yml'), 'utf-8');

      // Should be valid YAML
      const yaml = require('yaml');
      expect(() => yaml.parse(updated)).not.toThrow();

      // Should preserve version
      expect(updated).toContain('version: 1.0.0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle symlinks gracefully', async () => {
      await createTestFixture(['real-dir']);

      // Create a symlink
      const linkPath = path.join(testDir, 'symlink-dir');
      const targetPath = path.join(testDir, 'real-dir');

      try {
        await fs.symlink(targetPath, linkPath, 'dir');

        validator = new RoutesValidator(testDir);
        const dirs = await validator.scanFilesystem();

        // Should handle symlinks without crashing
        expect(dirs).toBeDefined();
      } catch (error: any) {
        // Symlinks might not be supported on all systems
        if (error.code !== 'EPERM' && error.code !== 'ENOSYS') {
          throw error;
        }
      }
    });

    it('should handle special characters in directory names', async () => {
      // Only test if filesystem supports these characters
      const specialDirs = [
        'dir-with-dashes',
        'dir_with_underscores',
        'dir.with.dots',
      ];

      await createTestFixture(specialDirs);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      specialDirs.forEach(dir => {
        expect(dirs).toContain(dir);
      });
    });

    it('should handle routes.yml with extra whitespace', async () => {
      await createTestFixture([]);

      const yamlContent = `
        version:  1.0.0
        paths:
          core:
            root:   core/
      `;

      await fs.writeFile(path.join(testDir, 'routes.yml'), yamlContent);

      validator = new RoutesValidator(testDir);
      const entries = await validator.parseRoutesYml();

      expect(entries).toBeDefined();
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should handle concurrent filesystem modifications', async () => {
      await createTestFixture(['core']);
      const yaml = require('yaml');
      await fs.writeFile(
        path.join(testDir, 'routes.yml'),
        yaml.stringify({ paths: { core: { root: 'core/' } } })
      );

      validator = new RoutesValidator(testDir);

      // Scan filesystem
      const dirs1 = await validator.scanFilesystem();

      // Add new directory
      await fs.ensureDir(path.join(testDir, 'newdir'));
      await fs.writeFile(path.join(testDir, 'newdir', 'file.txt'), 'content');

      // Scan again
      const dirs2 = await validator.scanFilesystem();

      expect(dirs2.length).toBeGreaterThan(dirs1.length);
    });

    it('should handle very long directory paths', async () => {
      const longPath = 'a/b/c/d';
      await createTestFixture([longPath]);

      validator = new RoutesValidator(testDir);
      const dirs = await validator.scanFilesystem();

      expect(dirs).toContain(longPath);
    });
  });

  describe('Planned Directories', () => {
    it('should not report planned directories as missing', async () => {
      const routesContent = {
        paths: {
          confluence: {
            root: 'confluence/',
            published: 'confluence/published/',
            'imports-exports': 'confluence/imports/confluence-exports/',
          },
        },
      };

      await createTestFixture([], routesContent);

      validator = new RoutesValidator(testDir);
      const result = await validator.validateRoutes();

      // These are planned directories
      expect(result.missing).not.toContain('confluence/published');
      expect(result.missing).not.toContain('confluence/imports/confluence-exports');
    });

    it('should handle reports planned directories', async () => {
      const routesContent = {
        paths: {
          reports: {
            root: 'reports/',
            'APM-R-performance': 'reports/APM-R/performance/',
          },
        },
      };

      await createTestFixture([], routesContent);

      validator = new RoutesValidator(testDir);
      const result = await validator.validateRoutes();

      expect(result.missing).not.toContain('reports/APM-R/performance');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full validation workflow', async () => {
      // Create initial structure
      const routesContent = {
        version: '1.0.0',
        paths: {
          core: {
            root: 'core/',
          },
        },
      };

      await createTestFixture(['core', 'modules'], routesContent);

      validator = new RoutesValidator(testDir);

      // Step 1: Scan filesystem
      const dirs = await validator.scanFilesystem();
      expect(dirs).toContain('core');
      expect(dirs).toContain('modules');

      // Step 2: Parse routes
      const entries = await validator.parseRoutesYml();
      expect(entries.length).toBeGreaterThan(0);

      // Step 3: Validate
      const validation = await validator.validateRoutes();
      expect(validation.valid).toBe(false);
      expect(validation.undefined).toContain('modules');

      // Step 4: Generate updated YAML
      const yaml = await validator.generateRoutesYml();
      expect(yaml).toContain('modules:');

      // Step 5: Apply fix
      const success = await validator.applyFix();
      expect(success).toBe(true);

      // Step 6: Validate again (should be synced now)
      const validator2 = new RoutesValidator(testDir);
      const validation2 = await validator2.validateRoutes();
      expect(validation2.valid).toBe(true);
    });

    it('should handle complex directory structure', async () => {
      const dirs = [
        'core',
        'core/ai',
        'core/ai/agents',
        'core/ai/skills',
        'core/src',
        'core/src/framework',
        'modules',
        'modules/planning',
        'modules/planning/ai',
        'modules/coding',
        'cli',
        'cli/src',
      ];

      const routesContent = {
        version: '1.0.0',
        paths: {},
      };

      await createTestFixture(dirs, routesContent);

      validator = new RoutesValidator(testDir);
      const result = await validator.validateRoutes();

      // Should detect all undefined directories
      expect(result.undefined.length).toBe(dirs.length);

      // Apply fix
      await validator.applyFix();

      // Validate again
      const validator2 = new RoutesValidator(testDir);
      const result2 = await validator2.validateRoutes();
      expect(result2.valid).toBe(true);
    });
  });
});
