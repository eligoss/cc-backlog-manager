import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';
import {
  safeRead,
  safeWrite,
  ensureDirectory,
  fileExists,
  isDirectory,
  isFile,
} from '../file-utils';

describe('file-utils', () => {
  let sandbox: TestSandbox;
  let testDir: string;

  beforeEach(async () => {
    sandbox = await createSandbox('file-utils-test');
    testDir = sandbox.path;
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('safeRead', () => {
    it('should read file contents with default encoding', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';
      await fs.writeFile(filePath, content, 'utf-8');

      const result = await safeRead(filePath);

      expect(result).toBe(content);
    });

    it('should read file contents with specified encoding', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Test content';
      await fs.writeFile(filePath, content, 'utf-8');

      const result = await safeRead(filePath, 'utf-8');

      expect(result).toBe(content);
    });

    it('should throw error if file does not exist', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      await expect(safeRead(filePath))
        .rejects
        .toThrow();
    });

    it('should handle empty files', async () => {
      const filePath = path.join(testDir, 'empty.txt');
      await fs.writeFile(filePath, '', 'utf-8');

      const result = await safeRead(filePath);

      expect(result).toBe('');
    });

    it('should handle files with special characters', async () => {
      const filePath = path.join(testDir, 'special.txt');
      const content = 'Special chars: é, ñ, 中文, 🚀';
      await fs.writeFile(filePath, content, 'utf-8');

      const result = await safeRead(filePath);

      expect(result).toBe(content);
    });

    it('should handle large files', async () => {
      const filePath = path.join(testDir, 'large.txt');
      const content = 'x'.repeat(100000);
      await fs.writeFile(filePath, content, 'utf-8');

      const result = await safeRead(filePath);

      expect(result).toBe(content);
      expect(result.length).toBe(100000);
    });
  });

  describe('safeWrite', () => {
    it('should write file contents with default encoding', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';

      await safeWrite(filePath, content);

      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(content);
    });

    it('should write file contents with specified encoding', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Test content';

      await safeWrite(filePath, content, 'utf-8');

      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(content);
    });

    it('should create parent directories if they do not exist', async () => {
      const filePath = path.join(testDir, 'nested', 'deep', 'test.txt');
      const content = 'Nested content';

      await safeWrite(filePath, content);

      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(content);
      expect(await fs.pathExists(path.join(testDir, 'nested', 'deep'))).toBe(true);
    });

    it('should overwrite existing files', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'Original', 'utf-8');

      await safeWrite(filePath, 'Updated');

      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe('Updated');
    });

    it('should handle empty content', async () => {
      const filePath = path.join(testDir, 'empty.txt');

      await safeWrite(filePath, '');

      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe('');
    });

    it('should handle special characters', async () => {
      const filePath = path.join(testDir, 'special.txt');
      const content = 'Special chars: é, ñ, 中文, 🚀';

      await safeWrite(filePath, content);

      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(content);
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', async () => {
      const dirPath = path.join(testDir, 'new-dir');

      await ensureDirectory(dirPath);

      expect(await fs.pathExists(dirPath)).toBe(true);
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(testDir, 'level1', 'level2', 'level3');

      await ensureDirectory(dirPath);

      expect(await fs.pathExists(dirPath)).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'level1'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'level1', 'level2'))).toBe(true);
    });

    it('should not throw error if directory already exists', async () => {
      const dirPath = path.join(testDir, 'existing-dir');
      await fs.ensureDir(dirPath);

      await expect(ensureDirectory(dirPath)).resolves.not.toThrow();

      expect(await fs.pathExists(dirPath)).toBe(true);
    });

    it('should handle root directory', async () => {
      await expect(ensureDirectory(testDir)).resolves.not.toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      const filePath = path.join(testDir, 'exists.txt');
      await fs.writeFile(filePath, 'content', 'utf-8');

      const result = await fileExists(filePath);

      expect(result).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      const result = await fileExists(filePath);

      expect(result).toBe(false);
    });

    it('should return true if directory exists', async () => {
      const dirPath = path.join(testDir, 'existing-dir');
      await fs.ensureDir(dirPath);

      const result = await fileExists(dirPath);

      expect(result).toBe(true);
    });
  });

  describe('isDirectory', () => {
    it('should return true for directories', async () => {
      const dirPath = path.join(testDir, 'directory');
      await fs.ensureDir(dirPath);

      const result = await isDirectory(dirPath);

      expect(result).toBe(true);
    });

    it('should return false for files', async () => {
      const filePath = path.join(testDir, 'file.txt');
      await fs.writeFile(filePath, 'content', 'utf-8');

      const result = await isDirectory(filePath);

      expect(result).toBe(false);
    });

    it('should return false for nonexistent paths', async () => {
      const nonexistentPath = path.join(testDir, 'nonexistent');

      const result = await isDirectory(nonexistentPath);

      expect(result).toBe(false);
    });
  });

  describe('isFile', () => {
    it('should return true for files', async () => {
      const filePath = path.join(testDir, 'file.txt');
      await fs.writeFile(filePath, 'content', 'utf-8');

      const result = await isFile(filePath);

      expect(result).toBe(true);
    });

    it('should return false for directories', async () => {
      const dirPath = path.join(testDir, 'directory');
      await fs.ensureDir(dirPath);

      const result = await isFile(dirPath);

      expect(result).toBe(false);
    });

    it('should return false for nonexistent paths', async () => {
      const nonexistentPath = path.join(testDir, 'nonexistent.txt');

      const result = await isFile(nonexistentPath);

      expect(result).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete read/write cycle', async () => {
      const filePath = path.join(testDir, 'cycle.txt');
      const content = 'Test content for cycle';

      await safeWrite(filePath, content);
      const readContent = await safeRead(filePath);

      expect(readContent).toBe(content);
    });

    it('should handle write to nested path that needs creation', async () => {
      const filePath = path.join(testDir, 'a', 'b', 'c', 'file.txt');
      const content = 'Deep nested content';

      await safeWrite(filePath, content);
      const readContent = await safeRead(filePath);

      expect(readContent).toBe(content);
      expect(await isDirectory(path.join(testDir, 'a', 'b', 'c'))).toBe(true);
    });

    it('should handle multiple files in same directory', async () => {
      const dir = path.join(testDir, 'multi');
      await ensureDirectory(dir);

      const file1 = path.join(dir, 'file1.txt');
      const file2 = path.join(dir, 'file2.txt');

      await safeWrite(file1, 'Content 1');
      await safeWrite(file2, 'Content 2');

      expect(await safeRead(file1)).toBe('Content 1');
      expect(await safeRead(file2)).toBe('Content 2');
      expect(await fileExists(file1)).toBe(true);
      expect(await fileExists(file2)).toBe(true);
    });
  });
});
