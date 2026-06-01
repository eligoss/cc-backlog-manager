import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from './test-utils';
import { VersionValidator } from '../version-validator';

describe('VersionValidator', () => {
  let sandbox: TestSandbox;
  let fixturesDir: string;
  let validator: VersionValidator;

  beforeAll(async () => {
    sandbox = await createSandbox('version-validator');
    fixturesDir = sandbox.path;
  });

  afterAll(async () => {
    await sandbox.cleanup();
  });

  describe('Version Extraction', () => {
    describe('CLAUDE.md extraction', () => {
      it('should extract version from CLAUDE.md with v prefix', async () => {
        const testDir = path.join(fixturesDir, 'claude-v-prefix');
        await fs.ensureDir(testDir);
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          '# Framework\n\nFramework Version: **v1.2.3** | Architecture: **Modular**\n\n## Details\n'
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractClaudeMdVersion();

        expect(version).toBe('1.2.3');
      });

      it('should extract version from CLAUDE.md without v prefix', async () => {
        const testDir = path.join(fixturesDir, 'claude-no-prefix');
        await fs.ensureDir(testDir);
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          '# Framework\n\nFramework Version: **1.2.3** | Architecture: **Modular**\n\n## Details\n'
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractClaudeMdVersion();

        expect(version).toBe('1.2.3');
      });

      it('should handle multiple version mentions and take the first', async () => {
        const testDir = path.join(fixturesDir, 'claude-multiple');
        await fs.ensureDir(testDir);
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          '# Framework\n\nFramework Version: **v1.2.3** | Architecture\n\nAnother Version: **v2.0.0**\n'
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractClaudeMdVersion();

        expect(version).toBe('1.2.3');
      });

      it('should return null if CLAUDE.md does not exist', async () => {
        const testDir = path.join(fixturesDir, 'claude-missing');
        await fs.ensureDir(testDir);

        validator = new VersionValidator(testDir);
        const version = await validator.extractClaudeMdVersion();

        expect(version).toBeNull();
      });

      it('should return null if version pattern not found', async () => {
        const testDir = path.join(fixturesDir, 'claude-no-pattern');
        await fs.ensureDir(testDir);
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          '# Framework\n\nNo version here!\n'
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractClaudeMdVersion();

        expect(version).toBeNull();
      });

      it('should return null for empty CLAUDE.md', async () => {
        const testDir = path.join(fixturesDir, 'claude-empty');
        await fs.ensureDir(testDir);
        await fs.writeFile(path.join(testDir, 'CLAUDE.md'), '');

        validator = new VersionValidator(testDir);
        const version = await validator.extractClaudeMdVersion();

        expect(version).toBeNull();
      });

      it('should reject malformed version strings', async () => {
        const testDir = path.join(fixturesDir, 'claude-malformed');
        await fs.ensureDir(testDir);
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          '# Framework\n\nFramework Version: **vXYZ** | Architecture\n'
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractClaudeMdVersion();

        expect(version).toBeNull();
      });
    });

    describe('README.md extraction', () => {
      it('should extract version from README.md', async () => {
        const testDir = path.join(fixturesDir, 'readme-standard');
        await fs.ensureDir(testDir);
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '# Project\n\n**Version:** 1.2.3\n**Author:** Team\n'
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractReadmeVersion();

        expect(version).toBe('1.2.3');
      });

      it('should handle version with v prefix in README.md', async () => {
        const testDir = path.join(fixturesDir, 'readme-v-prefix');
        await fs.ensureDir(testDir);
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '# Project\n\n**Version:** v1.2.3\n'
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractReadmeVersion();

        expect(version).toBe('1.2.3');
      });

      it('should handle multiple version mentions and take the first', async () => {
        const testDir = path.join(fixturesDir, 'readme-multiple');
        await fs.ensureDir(testDir);
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '# Project\n\n**Version:** 1.2.3\n\nOld **Version:** 1.0.0\n'
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractReadmeVersion();

        expect(version).toBe('1.2.3');
      });

      it('should return null if README.md does not exist', async () => {
        const testDir = path.join(fixturesDir, 'readme-missing');
        await fs.ensureDir(testDir);

        validator = new VersionValidator(testDir);
        const version = await validator.extractReadmeVersion();

        expect(version).toBeNull();
      });

      it('should return null if version pattern not found', async () => {
        const testDir = path.join(fixturesDir, 'readme-no-pattern');
        await fs.ensureDir(testDir);
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '# Project\n\nNo version info\n'
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractReadmeVersion();

        expect(version).toBeNull();
      });

      it('should return null for empty README.md', async () => {
        const testDir = path.join(fixturesDir, 'readme-empty');
        await fs.ensureDir(testDir);
        await fs.writeFile(path.join(testDir, 'README.md'), '');

        validator = new VersionValidator(testDir);
        const version = await validator.extractReadmeVersion();

        expect(version).toBeNull();
      });
    });

    describe('package.json extraction', () => {
      it('should extract version from framework/cli/package.json', async () => {
        const testDir = path.join(fixturesDir, 'package-standard');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ name: 'test', version: '1.2.3' }, null, 2)
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractPackageJsonVersion();

        expect(version).toBe('1.2.3');
      });

      it('should return null if framework/cli/package.json does not exist', async () => {
        const testDir = path.join(fixturesDir, 'package-missing');
        await fs.ensureDir(testDir);

        validator = new VersionValidator(testDir);
        const version = await validator.extractPackageJsonVersion();

        expect(version).toBeNull();
      });

      it('should return null if package.json has no version field', async () => {
        const testDir = path.join(fixturesDir, 'package-no-version');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ name: 'test' }, null, 2)
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractPackageJsonVersion();

        expect(version).toBeNull();
      });

      it('should return null for malformed package.json', async () => {
        const testDir = path.join(fixturesDir, 'package-malformed');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          '{ invalid json'
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractPackageJsonVersion();

        expect(version).toBeNull();
      });

      it('should return null for empty package.json', async () => {
        const testDir = path.join(fixturesDir, 'package-empty');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          ''
        );

        validator = new VersionValidator(testDir);
        const version = await validator.extractPackageJsonVersion();

        expect(version).toBeNull();
      });
    });
  });

  describe('Version Validation', () => {
    describe('Successful validation', () => {
      it('should validate when all versions match', async () => {
        const testDir = path.join(fixturesDir, 'valid-all-match');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          'Framework Version: **v1.2.3** | Architecture'
        );
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** 1.2.3'
        );
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ version: '1.2.3' })
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(true);
        expect(result.sources).toHaveLength(3);
        expect(result.sources[0].version).toBe('1.2.3');
        expect(result.sources[1].version).toBe('1.2.3');
        expect(result.sources[2].version).toBe('1.2.3');
        expect(result.mismatches).toBeUndefined();
        expect(result.errors).toBeUndefined();
      });

      it('should normalize versions with and without v prefix', async () => {
        const testDir = path.join(fixturesDir, 'valid-v-prefix-mix');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          'Framework Version: **v1.2.3**'
        );
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** v1.2.3'
        );
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ version: '1.2.3' })
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(true);
        expect(result.sources.every(s => s.version === '1.2.3')).toBe(true);
      });
    });

    describe('Version mismatches', () => {
      it('should detect mismatches between CLAUDE.md and README.md', async () => {
        const testDir = path.join(fixturesDir, 'mismatch-claude-readme');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          'Framework Version: **v1.2.3**'
        );
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** 1.3.0'
        );
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ version: '1.2.3' })
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(false);
        expect(result.mismatches).toBeDefined();
        expect(result.mismatches!.length).toBeGreaterThan(0);
        expect(result.mismatches!.some(m => m.includes('README.md'))).toBe(true);
      });

      it('should detect mismatches between all three files', async () => {
        const testDir = path.join(fixturesDir, 'mismatch-all-different');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          'Framework Version: **v1.0.0**'
        );
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** 2.0.0'
        );
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ version: '3.0.0' })
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(false);
        expect(result.mismatches).toBeDefined();
        expect(result.mismatches!.length).toBeGreaterThan(0);
      });

      it('should detect mismatch in package.json only', async () => {
        const testDir = path.join(fixturesDir, 'mismatch-package-only');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          'Framework Version: **v1.2.3**'
        );
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** 1.2.3'
        );
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ version: '2.0.0' })
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(false);
        expect(result.mismatches!.some(m => m.includes('framework/cli/package.json'))).toBe(true);
      });
    });

    describe('Missing files', () => {
      it('should report errors when CLAUDE.md is missing', async () => {
        const testDir = path.join(fixturesDir, 'missing-claude');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** 1.2.3'
        );
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ version: '1.2.3' })
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.some(e => e.includes('CLAUDE.md'))).toBe(true);
      });

      it('should report errors when README.md is missing', async () => {
        const testDir = path.join(fixturesDir, 'missing-readme');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          'Framework Version: **v1.2.3**'
        );
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ version: '1.2.3' })
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(false);
        expect(result.errors!.some(e => e.includes('README.md'))).toBe(true);
      });

      it('should report errors when package.json is missing', async () => {
        const testDir = path.join(fixturesDir, 'missing-package');
        await fs.ensureDir(testDir);
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          'Framework Version: **v1.2.3**'
        );
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** 1.2.3'
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(false);
        expect(result.errors!.some(e => e.includes('framework/cli/package.json'))).toBe(true);
      });

      it('should report errors when all files are missing', async () => {
        const testDir = path.join(fixturesDir, 'missing-all');
        await fs.ensureDir(testDir);

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBe(3);
      });
    });

    describe('Edge cases', () => {
      it('should handle versions with pre-release tags', async () => {
        const testDir = path.join(fixturesDir, 'edge-prerelease');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          'Framework Version: **v1.2.3-beta.1**'
        );
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** 1.2.3-beta.1'
        );
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ version: '1.2.3-beta.1' })
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(true);
        expect(result.sources.every(s => s.version === '1.2.3-beta.1')).toBe(true);
      });

      it('should handle versions with build metadata', async () => {
        const testDir = path.join(fixturesDir, 'edge-build-metadata');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          'Framework Version: **v1.2.3+20231215**'
        );
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** 1.2.3+20231215'
        );
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ version: '1.2.3+20231215' })
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.valid).toBe(true);
      });

      it('should provide detailed source information', async () => {
        const testDir = path.join(fixturesDir, 'edge-source-info');
        await fs.ensureDir(path.join(testDir, 'framework', 'cli'));
        await fs.writeFile(
          path.join(testDir, 'CLAUDE.md'),
          'Framework Version: **v1.2.3**'
        );
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** 1.2.3'
        );
        await fs.writeFile(
          path.join(testDir, 'framework', 'cli', 'package.json'),
          JSON.stringify({ version: '1.2.3' })
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.sources).toHaveLength(3);
        expect(result.sources[0].file).toBe('CLAUDE.md');
        expect(result.sources[1].file).toBe('README.md');
        expect(result.sources[2].file).toBe('framework/cli/package.json');
        expect(result.sources.every(s => !s.error)).toBe(true);
      });

      it('should include error details in sources when extraction fails', async () => {
        const testDir = path.join(fixturesDir, 'edge-error-details');
        await fs.ensureDir(testDir);
        // Only create README.md
        await fs.writeFile(
          path.join(testDir, 'README.md'),
          '**Version:** 1.2.3'
        );

        validator = new VersionValidator(testDir);
        const result = await validator.validateConsistency();

        expect(result.sources).toHaveLength(3);
        const claudeSource = result.sources.find(s => s.file === 'CLAUDE.md');
        const packageSource = result.sources.find(s => s.file === 'framework/cli/package.json');

        expect(claudeSource?.error).toBeDefined();
        expect(packageSource?.error).toBeDefined();
      });
    });
  });

  describe('Real framework validation', () => {
    it('should extract versions from actual framework files', async () => {
      // Use the repo root (5 levels up from __tests__)
      // __tests__ -> lib -> src -> cli -> framework -> repo root
      const frameworkRoot = path.resolve(__dirname, '../../../../..');
      validator = new VersionValidator(frameworkRoot);

      const result = await validator.validateConsistency();

      // Log result for debugging
      console.log('Framework version validation:', JSON.stringify(result, null, 2));

      // We expect all sources to be checked
      expect(result.sources).toHaveLength(3);

      // At least CLAUDE.md and package.json should have versions
      const claudeSource = result.sources.find(s => s.file === 'CLAUDE.md');
      const packageSource = result.sources.find(s => s.file === 'framework/cli/package.json');

      expect(claudeSource?.version).toBeTruthy();
      expect(packageSource?.version).toBeTruthy();

      // Note: README.md might not have the version pattern, which is OK for this test
      // The actual validation would catch this as an inconsistency
    });
  });
});
