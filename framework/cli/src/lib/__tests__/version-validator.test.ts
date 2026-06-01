/**
 * Unit Tests for VersionValidator
 *
 * Tests version extraction and consistency validation across framework files.
 */

import fs from 'fs-extra';
import { VersionValidator } from '../version-validator.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('VersionValidator', () => {
  let validator: VersionValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new VersionValidator('/test/framework');
  });

  describe('extractClaudeMdVersion', () => {
    it('should extract version from CLAUDE.md with v prefix', async () => {
      mockedFs.readFile.mockResolvedValue(
        '# Framework\n\nFramework Version: **v1.2.3**\n\nSome content' as any
      );

      const version = await validator.extractClaudeMdVersion();

      expect(version).toBe('1.2.3');
    });

    it('should extract version from CLAUDE.md without v prefix', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Framework Version: **1.0.0**' as any
      );

      const version = await validator.extractClaudeMdVersion();

      expect(version).toBe('1.0.0');
    });

    it('should extract version with prerelease tag', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Framework Version: **v2.0.0-beta.1**' as any
      );

      const version = await validator.extractClaudeMdVersion();

      expect(version).toBe('2.0.0-beta.1');
    });

    it('should extract version with build metadata', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Framework Version: **1.0.0+build.123**' as any
      );

      const version = await validator.extractClaudeMdVersion();

      expect(version).toBe('1.0.0+build.123');
    });

    it('should return null when file does not exist', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const version = await validator.extractClaudeMdVersion();

      expect(version).toBeNull();
    });

    it('should return null when version pattern not found', async () => {
      mockedFs.readFile.mockResolvedValue('# Framework\n\nNo version here' as any);

      const version = await validator.extractClaudeMdVersion();

      expect(version).toBeNull();
    });
  });

  describe('extractReadmeVersion', () => {
    it('should extract version from README.md with v prefix', async () => {
      mockedFs.readFile.mockResolvedValue(
        '# README\n\n**Version:** v3.2.1\n\nContent' as any
      );

      const version = await validator.extractReadmeVersion();

      expect(version).toBe('3.2.1');
    });

    it('should extract version from README.md without v prefix', async () => {
      mockedFs.readFile.mockResolvedValue('**Version:** 1.0.0' as any);

      const version = await validator.extractReadmeVersion();

      expect(version).toBe('1.0.0');
    });

    it('should extract version with prerelease', async () => {
      mockedFs.readFile.mockResolvedValue('**Version:** 2.0.0-alpha.1' as any);

      const version = await validator.extractReadmeVersion();

      expect(version).toBe('2.0.0-alpha.1');
    });

    it('should return null when file does not exist', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const version = await validator.extractReadmeVersion();

      expect(version).toBeNull();
    });

    it('should return null when version pattern not found', async () => {
      mockedFs.readFile.mockResolvedValue('# README\n\nNo version' as any);

      const version = await validator.extractReadmeVersion();

      expect(version).toBeNull();
    });
  });

  describe('extractPackageJsonVersion', () => {
    it('should extract version from package.json', async () => {
      mockedFs.readFile.mockResolvedValue(
        JSON.stringify({ name: 'cli', version: '1.0.0' }) as any
      );

      const version = await validator.extractPackageJsonVersion();

      expect(version).toBe('1.0.0');
    });

    it('should return null when file does not exist', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const version = await validator.extractPackageJsonVersion();

      expect(version).toBeNull();
    });

    it('should return null when file is empty', async () => {
      mockedFs.readFile.mockResolvedValue('   ' as any);

      const version = await validator.extractPackageJsonVersion();

      expect(version).toBeNull();
    });

    it('should return null when JSON is invalid', async () => {
      mockedFs.readFile.mockResolvedValue('{ invalid json' as any);

      const version = await validator.extractPackageJsonVersion();

      expect(version).toBeNull();
    });

    it('should return null when version field is missing', async () => {
      mockedFs.readFile.mockResolvedValue(
        JSON.stringify({ name: 'cli' }) as any
      );

      const version = await validator.extractPackageJsonVersion();

      expect(version).toBeNull();
    });

    it('should return null when version is not a string', async () => {
      mockedFs.readFile.mockResolvedValue(
        JSON.stringify({ name: 'cli', version: 123 }) as any
      );

      const version = await validator.extractPackageJsonVersion();

      expect(version).toBeNull();
    });
  });

  describe('validateConsistency', () => {
    it('should return valid when all versions match', async () => {
      mockedFs.readFile
        .mockResolvedValueOnce('Framework Version: **v1.0.0**' as any) // CLAUDE.md
        .mockResolvedValueOnce('**Version:** 1.0.0' as any) // README.md
        .mockResolvedValueOnce(JSON.stringify({ version: '1.0.0' }) as any); // package.json

      const result = await validator.validateConsistency();

      expect(result.valid).toBe(true);
      expect(result.sources).toHaveLength(3);
      expect(result.mismatches).toBeUndefined();
      expect(result.errors).toBeUndefined();
    });

    it('should return invalid with errors when sources are missing', async () => {
      mockedFs.readFile
        .mockResolvedValueOnce('Framework Version: **v1.0.0**' as any) // CLAUDE.md
        .mockRejectedValueOnce(new Error('ENOENT')) // README.md missing
        .mockResolvedValueOnce(JSON.stringify({ version: '1.0.0' }) as any); // package.json

      const result = await validator.validateConsistency();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toContain('README.md');
    });

    it('should return invalid with mismatches when versions differ', async () => {
      mockedFs.readFile
        .mockResolvedValueOnce('Framework Version: **v1.0.0**' as any) // CLAUDE.md
        .mockResolvedValueOnce('**Version:** 2.0.0' as any) // README.md has different version
        .mockResolvedValueOnce(JSON.stringify({ version: '1.0.0' }) as any); // package.json

      const result = await validator.validateConsistency();

      expect(result.valid).toBe(false);
      expect(result.mismatches).toBeDefined();
      expect(result.mismatches!.length).toBeGreaterThan(0);
      expect(result.mismatches![0]).toContain('README.md');
      expect(result.mismatches![0]).toContain('2.0.0');
    });

    it('should report multiple mismatches', async () => {
      mockedFs.readFile
        .mockResolvedValueOnce('Framework Version: **v1.0.0**' as any) // CLAUDE.md
        .mockResolvedValueOnce('**Version:** 2.0.0' as any) // README.md different
        .mockResolvedValueOnce(JSON.stringify({ version: '3.0.0' }) as any); // package.json different

      const result = await validator.validateConsistency();

      expect(result.valid).toBe(false);
      expect(result.mismatches).toBeDefined();
      expect(result.mismatches!.length).toBe(2);
    });

    it('should handle all files missing', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await validator.validateConsistency();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('should include source details in result', async () => {
      mockedFs.readFile
        .mockResolvedValueOnce('Framework Version: **v1.2.3**' as any)
        .mockResolvedValueOnce('**Version:** 1.2.3' as any)
        .mockResolvedValueOnce(JSON.stringify({ version: '1.2.3' }) as any);

      const result = await validator.validateConsistency();

      expect(result.sources).toHaveLength(3);
      expect(result.sources[0].file).toBe('CLAUDE.md');
      expect(result.sources[0].version).toBe('1.2.3');
      expect(result.sources[1].file).toBe('README.md');
      expect(result.sources[1].version).toBe('1.2.3');
      expect(result.sources[2].file).toBe('framework/cli/package.json');
      expect(result.sources[2].version).toBe('1.2.3');
    });

    it('should add error details for missing versions', async () => {
      mockedFs.readFile
        .mockResolvedValueOnce('No version here' as any) // CLAUDE.md without version
        .mockResolvedValueOnce('**Version:** 1.0.0' as any)
        .mockResolvedValueOnce(JSON.stringify({ version: '1.0.0' }) as any);

      const result = await validator.validateConsistency();

      expect(result.valid).toBe(false);
      expect(result.sources[0].error).toBeDefined();
      expect(result.sources[0].error).toContain('not found');
    });
  });
});
