/**
 * Unit Tests for RoutesValidator
 *
 * Tests routes.yml parsing, filesystem scanning, and validation.
 */

import fs from 'fs-extra';
import { RoutesValidator } from '../routes-validator.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('RoutesValidator', () => {
  let validator: RoutesValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new RoutesValidator('/test/project');
  });

  describe('constructor', () => {
    it('should set frameworkRoot and routesFile path', () => {
      expect(validator.frameworkRoot).toBe('/test/project');
    });
  });

  describe('scanFilesystem', () => {
    it('should return empty array when no directories exist', async () => {
      mockedFs.readdir.mockResolvedValue([]);

      const paths = await validator.scanFilesystem();

      expect(paths).toEqual([]);
    });

    it('should scan directories recursively', async () => {
      // First call: root directory
      mockedFs.readdir
        .mockResolvedValueOnce([
          { name: 'src', isDirectory: () => true },
          { name: 'docs', isDirectory: () => true },
        ] as any)
        // Second call: src directory (check if meaningful)
        .mockResolvedValueOnce(['index.ts'])
        // Third call: src subdirectories scan
        .mockResolvedValueOnce([])
        // Fourth call: docs directory (check if meaningful)
        .mockResolvedValueOnce(['README.md'])
        // Fifth call: docs subdirectories scan
        .mockResolvedValueOnce([]);

      mockedFs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any);

      const paths = await validator.scanFilesystem();

      expect(paths).toContain('src');
      expect(paths).toContain('docs');
    });

    it('should exclude hidden directories', async () => {
      mockedFs.readdir.mockResolvedValue([
        { name: '.git', isDirectory: () => true },
        { name: '.vscode', isDirectory: () => true },
        { name: 'src', isDirectory: () => true },
      ] as any);

      mockedFs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any);

      const paths = await validator.scanFilesystem();

      expect(paths).not.toContain('.git');
      expect(paths).not.toContain('.vscode');
    });

    it('should exclude node_modules', async () => {
      mockedFs.readdir.mockResolvedValue([
        { name: 'node_modules', isDirectory: () => true },
        { name: 'src', isDirectory: () => true },
      ] as any);

      mockedFs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any);

      const paths = await validator.scanFilesystem();

      expect(paths).not.toContain('node_modules');
    });

    it('should handle read errors gracefully', async () => {
      mockedFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const paths = await validator.scanFilesystem();

      expect(paths).toEqual([]);
    });

    it('should skip files (only process directories)', async () => {
      mockedFs.readdir.mockResolvedValue([
        { name: 'package.json', isDirectory: () => false },
        { name: 'README.md', isDirectory: () => false },
      ] as any);

      const paths = await validator.scanFilesystem();

      expect(paths).toEqual([]);
    });
  });

  describe('parseRoutesYml', () => {
    it('should throw error when routes.yml does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(validator.parseRoutesYml()).rejects.toThrow('routes.yml not found');
    });

    it('should parse valid routes.yml', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(`
paths:
  source:
    root: src/
    lib: src/lib/
  docs:
    root: docs/
` as any);

      const entries = await validator.parseRoutesYml();

      expect(entries.length).toBeGreaterThan(0);
      expect(entries.map(e => e.path)).toContain('src');
      expect(entries.map(e => e.path)).toContain('src/lib');
      expect(entries.map(e => e.path)).toContain('docs');
    });

    it('should return empty array when paths section is missing', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue('meta:\n  version: 1.0\n' as any);

      const entries = await validator.parseRoutesYml();

      expect(entries).toEqual([]);
    });

    it('should normalize paths by removing trailing slashes', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(`
paths:
  source:
    root: src/
    lib: src/lib/
` as any);

      const entries = await validator.parseRoutesYml();

      expect(entries.some(e => e.path === 'src')).toBe(true);
      expect(entries.some(e => e.path === 'src/')).toBe(false);
    });

    it('should check if paths exist on filesystem', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // routes.yml exists
        .mockResolvedValueOnce(true) // src exists
        .mockResolvedValueOnce(false); // docs does not exist

      mockedFs.readFile.mockResolvedValue(`
paths:
  source:
    root: src/
  docs:
    root: docs/
` as any);

      const entries = await validator.parseRoutesYml();

      const srcEntry = entries.find(e => e.path === 'src');
      const docsEntry = entries.find(e => e.path === 'docs');

      expect(srcEntry?.exists).toBe(true);
      expect(docsEntry?.exists).toBe(false);
    });

    it('should skip empty paths', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(`
paths:
  source:
    empty: ""
    root: src/
` as any);

      const entries = await validator.parseRoutesYml();

      expect(entries.some(e => e.path === '')).toBe(false);
    });

    it('should deduplicate paths', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(`
paths:
  source:
    root: src/
    duplicate: src/
` as any);

      const entries = await validator.parseRoutesYml();

      const srcEntries = entries.filter(e => e.path === 'src');
      expect(srcEntries.length).toBe(1);
    });
  });

  describe('validateRoutes', () => {
    it('should return valid when routes match filesystem', async () => {
      // Mock filesystem scan - need to mock all readdir calls
      mockedFs.readdir
        .mockResolvedValueOnce([
          { name: 'src', isDirectory: () => true },
        ] as any)
        .mockResolvedValueOnce(['index.ts']) // src contains file
        .mockResolvedValueOnce([]); // src has no subdirs

      mockedFs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any);

      // Mock routes.yml
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(`
paths:
  source:
    root: src/
` as any);

      const result = await validator.validateRoutes();

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.undefined).toEqual([]);
      expect(result.synced).toContain('src');
    });

    it('should detect missing directories', async () => {
      // Mock empty filesystem
      mockedFs.readdir.mockResolvedValue([]);

      // Mock routes.yml with paths
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // routes.yml exists
        .mockResolvedValueOnce(false); // src does not exist

      mockedFs.readFile.mockResolvedValue(`
paths:
  source:
    root: src/
` as any);

      const result = await validator.validateRoutes();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('src');
    });

    it('should detect undefined directories', async () => {
      // Mock filesystem with directory not in routes
      mockedFs.readdir
        .mockResolvedValueOnce([
          { name: 'src', isDirectory: () => true },
          { name: 'extra', isDirectory: () => true },
        ] as any)
        .mockResolvedValueOnce(['file.ts']) // src has file
        .mockResolvedValueOnce([]) // src subdirs scan
        .mockResolvedValueOnce(['file.ts']) // extra has file
        .mockResolvedValueOnce([]); // extra subdirs scan

      mockedFs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any);

      // Mock routes.yml with only src
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(`
paths:
  source:
    root: src/
` as any);

      const result = await validator.validateRoutes();

      expect(result.valid).toBe(false);
      expect(result.undefined).toContain('extra');
    });

    it('should skip planned directories', async () => {
      // Mock empty filesystem
      mockedFs.readdir.mockResolvedValue([]);

      // Mock routes.yml with planned directory
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // routes.yml exists
        .mockResolvedValueOnce(false); // confluence/published does not exist

      mockedFs.readFile.mockResolvedValue(`
paths:
  confluence:
    published: confluence/published/
` as any);

      const result = await validator.validateRoutes();

      // Planned directories should not appear in missing
      expect(result.missing).not.toContain('confluence/published');
    });
  });

  describe('generateRoutesYml', () => {
    it('should generate routes from filesystem', async () => {
      // Mock filesystem
      mockedFs.readdir
        .mockResolvedValueOnce([
          { name: 'src', isDirectory: () => true },
          { name: 'docs', isDirectory: () => true },
        ] as any)
        .mockResolvedValueOnce(['index.ts']) // src has file
        .mockResolvedValueOnce([]) // src subdirs
        .mockResolvedValueOnce(['README.md']) // docs has file
        .mockResolvedValueOnce([]); // docs subdirs

      mockedFs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any);

      // Mock existing routes.yml
      mockedFs.readFile.mockResolvedValue('meta:\n  version: 1.0\n' as any);

      const content = await validator.generateRoutesYml();

      expect(content).toContain('paths:');
      expect(content).toContain('src');
      expect(content).toContain('docs');
    });

    it('should preserve existing metadata', async () => {
      mockedFs.readdir.mockResolvedValue([]);
      mockedFs.readFile.mockResolvedValue(`
meta:
  version: "1.0"
  author: test
` as any);

      const content = await validator.generateRoutesYml();

      expect(content).toContain('version:');
      expect(content).toContain('author: test');
    });

    it('should handle missing routes.yml gracefully', async () => {
      mockedFs.readdir.mockResolvedValue([]);
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const content = await validator.generateRoutesYml();

      expect(content).toContain('meta:');
      expect(content).toContain('last-updated:');
    });

    it('should update sync-status in meta', async () => {
      mockedFs.readdir.mockResolvedValue([]);
      mockedFs.readFile.mockResolvedValue('meta:\n  version: 1.0\n' as any);

      const content = await validator.generateRoutesYml();

      expect(content).toContain('sync-status: synchronized');
    });
  });

  describe('applyFix', () => {
    it('should write updated routes.yml', async () => {
      mockedFs.readdir.mockResolvedValue([]);
      mockedFs.readFile.mockResolvedValue('meta:\n  version: 1.0\n' as any);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await validator.applyFix();

      expect(result).toBe(true);
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });

    it('should return false on write error', async () => {
      mockedFs.readdir.mockResolvedValue([]);
      mockedFs.readFile.mockResolvedValue('meta:\n  version: 1.0\n' as any);
      mockedFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const result = await validator.applyFix();

      expect(result).toBe(false);
    });
  });
});
