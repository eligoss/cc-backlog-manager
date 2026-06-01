import path from 'path';
import fs from 'fs-extra';
import {
  createSandbox,
  TestSandbox,
  getSandboxConfig,
  cleanupOrphanedSandboxes,
} from './sandbox';

describe('TestSandbox', () => {
  let sandbox: TestSandbox | undefined;

  afterEach(async () => {
    if (sandbox) {
      // Force cleanup even if marked failed
      await fs.remove(sandbox.path);
      sandbox = undefined;
    }
  });

  describe('createSandbox', () => {
    it('should create sandbox in configured root directory', async () => {
      sandbox = await createSandbox('test-create');

      const config = getSandboxConfig();
      expect(sandbox.path).toContain(config.root);
      expect(await fs.pathExists(sandbox.path)).toBe(true);
    });

    it('should create unique directories for each call', async () => {
      const sandbox1 = await createSandbox('test-unique');
      const sandbox2 = await createSandbox('test-unique');

      try {
        expect(sandbox1.path).not.toBe(sandbox2.path);
      } finally {
        await fs.remove(sandbox1.path);
        await fs.remove(sandbox2.path);
      }
    });

    it('should sanitize test names with special characters', async () => {
      sandbox = await createSandbox('test/with:special*chars');

      // Path should not contain special characters
      const dirname = path.basename(sandbox.path);
      expect(dirname).not.toContain('/');
      expect(dirname).not.toContain(':');
      expect(dirname).not.toContain('*');
    });

    it('should truncate long test names', async () => {
      const longName = 'a'.repeat(100);
      sandbox = await createSandbox(longName);

      const dirname = path.basename(sandbox.path);
      // Name should be truncated to 50 chars + suffix from mkdtemp
      expect(dirname.length).toBeLessThan(100);
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      sandbox = await createSandbox('file-ops');
    });

    it('should create files with content', async () => {
      const filePath = await sandbox!.createFile('test.txt', 'hello world');

      expect(await fs.pathExists(filePath)).toBe(true);
      expect(await fs.readFile(filePath, 'utf-8')).toBe('hello world');
    });

    it('should create files in nested directories', async () => {
      const filePath = await sandbox!.createFile('a/b/c/test.txt', 'nested');

      expect(await fs.pathExists(filePath)).toBe(true);
      expect(await fs.readFile(filePath, 'utf-8')).toBe('nested');
    });

    it('should create directories', async () => {
      const dirPath = await sandbox!.createDir('my-dir');

      expect(await fs.pathExists(dirPath)).toBe(true);
      expect((await fs.stat(dirPath)).isDirectory()).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = await sandbox!.createDir('a/b/c/my-dir');

      expect(await fs.pathExists(dirPath)).toBe(true);
      expect((await fs.stat(dirPath)).isDirectory()).toBe(true);
    });

    it('should create JSON files', async () => {
      const filePath = await sandbox!.createJson('config.json', { key: 'value', nested: { a: 1 } });

      const content = await fs.readJson(filePath);
      expect(content).toEqual({ key: 'value', nested: { a: 1 } });
    });

    it('should read files', async () => {
      await sandbox!.createFile('read-test.txt', 'read me');

      const content = await sandbox!.readFile('read-test.txt');
      expect(content).toBe('read me');
    });

    it('should read JSON files', async () => {
      await sandbox!.createJson('data.json', { foo: 'bar' });

      const content = await sandbox!.readJson<{ foo: string }>('data.json');
      expect(content).toEqual({ foo: 'bar' });
    });

    it('should check file existence', async () => {
      await sandbox!.createFile('exists.txt', '');

      expect(await sandbox!.exists('exists.txt')).toBe(true);
      expect(await sandbox!.exists('not-exists.txt')).toBe(false);
    });

    it('should resolve paths', () => {
      const resolved = sandbox!.resolve('a', 'b', 'c.txt');

      expect(resolved).toBe(path.join(sandbox!.path, 'a', 'b', 'c.txt'));
    });
  });

  describe('cleanup', () => {
    it('should remove sandbox directory on cleanup', async () => {
      sandbox = await createSandbox('cleanup-test');
      const sandboxPath = sandbox.path;

      await sandbox.cleanup();

      expect(await fs.pathExists(sandboxPath)).toBe(false);
      sandbox = undefined; // Prevent double cleanup
    });

    it('should preserve sandbox when marked failed and TEST_KEEP_ON_FAILURE is true', async () => {
      const originalEnv = process.env.TEST_KEEP_ON_FAILURE;
      process.env.TEST_KEEP_ON_FAILURE = 'true';

      try {
        sandbox = await createSandbox('failure-preserve');
        sandbox.markFailed();

        const sandboxPath = sandbox.path;
        await sandbox.cleanup();

        expect(await fs.pathExists(sandboxPath)).toBe(true);
      } finally {
        process.env.TEST_KEEP_ON_FAILURE = originalEnv;
      }
    });

    it('should not preserve sandbox when not marked failed even with TEST_KEEP_ON_FAILURE', async () => {
      const originalEnv = process.env.TEST_KEEP_ON_FAILURE;
      process.env.TEST_KEEP_ON_FAILURE = 'true';

      try {
        sandbox = await createSandbox('no-failure');
        const sandboxPath = sandbox.path;

        await sandbox.cleanup();

        expect(await fs.pathExists(sandboxPath)).toBe(false);
        sandbox = undefined;
      } finally {
        process.env.TEST_KEEP_ON_FAILURE = originalEnv;
      }
    });

    it('should report shouldPreserve correctly', async () => {
      const originalEnv = process.env.TEST_KEEP_ON_FAILURE;

      try {
        // Without env var
        process.env.TEST_KEEP_ON_FAILURE = 'false';
        sandbox = await createSandbox('preserve-check');
        sandbox.markFailed();
        expect(sandbox.shouldPreserve).toBe(false);
        await sandbox.cleanup();

        // With env var
        process.env.TEST_KEEP_ON_FAILURE = 'true';
        sandbox = await createSandbox('preserve-check-2');
        expect(sandbox.shouldPreserve).toBe(false); // Not marked failed yet
        sandbox.markFailed();
        expect(sandbox.shouldPreserve).toBe(true);
      } finally {
        process.env.TEST_KEEP_ON_FAILURE = originalEnv;
      }
    });
  });

  describe('cleanupOrphanedSandboxes', () => {
    it('should remove old sandbox directories', async () => {
      sandbox = await createSandbox('orphan-test');
      const sandboxPath = sandbox.path;

      // Create a marker file
      await sandbox.createFile('marker.txt', 'test');

      // Set mtime to 2 hours ago
      const oldTime = Date.now() - 2 * 3600 * 1000;
      await fs.utimes(sandboxPath, oldTime / 1000, oldTime / 1000);

      // Run cleanup with 1 hour max age
      await cleanupOrphanedSandboxes(3600000);

      expect(await fs.pathExists(sandboxPath)).toBe(false);
      sandbox = undefined;
    });

    it('should not remove recent sandbox directories', async () => {
      sandbox = await createSandbox('recent-test');

      // Run cleanup with 1 hour max age (sandbox is new)
      await cleanupOrphanedSandboxes(3600000);

      expect(await fs.pathExists(sandbox.path)).toBe(true);
    });

    it('should handle non-existent root directory', async () => {
      const originalEnv = process.env.TEST_SANDBOX_ROOT;
      process.env.TEST_SANDBOX_ROOT = '/non/existent/path';

      try {
        // Should not throw
        await cleanupOrphanedSandboxes();
      } finally {
        process.env.TEST_SANDBOX_ROOT = originalEnv;
      }
    });
  });
});
