import fs from 'fs-extra';
import path from 'path';

/**
 * Configuration for the test sandbox system
 */
export interface SandboxConfig {
  /** Root directory for all sandboxes (default: .test-sandbox in project) */
  root: string;
  /** Preserve sandboxes on test failure (default: false) */
  keepOnFailure: boolean;
  /** Enable verbose logging (default: false) */
  verbose: boolean;
}

/**
 * Get sandbox configuration from environment variables
 */
export function getSandboxConfig(): SandboxConfig {
  const projectRoot = path.resolve(__dirname, '../../../../..');
  return {
    root: process.env.TEST_SANDBOX_ROOT || path.join(projectRoot, '.test-sandbox'),
    keepOnFailure: process.env.TEST_KEEP_ON_FAILURE === 'true',
    verbose: process.env.TEST_VERBOSE === 'true',
  };
}

/**
 * Test sandbox instance for isolated test file operations
 */
export class TestSandbox {
  private _failed = false;
  private config: SandboxConfig;

  constructor(
    /** The absolute path to this sandbox directory */
    public readonly path: string,
    /** Test identifier for debugging */
    public readonly testName: string,
    config?: Partial<SandboxConfig>
  ) {
    this.config = { ...getSandboxConfig(), ...config };
  }

  /**
   * Create a file in the sandbox with the given content
   */
  async createFile(relativePath: string, content: string): Promise<string> {
    const fullPath = path.join(this.path, relativePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
    if (this.config.verbose) {
      console.log(`[Sandbox] Created file: ${relativePath}`);
    }
    return fullPath;
  }

  /**
   * Create a directory in the sandbox
   */
  async createDir(relativePath: string): Promise<string> {
    const fullPath = path.join(this.path, relativePath);
    await fs.ensureDir(fullPath);
    if (this.config.verbose) {
      console.log(`[Sandbox] Created directory: ${relativePath}`);
    }
    return fullPath;
  }

  /**
   * Create a JSON file in the sandbox
   */
  async createJson(relativePath: string, content: unknown): Promise<string> {
    const fullPath = path.join(this.path, relativePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeJson(fullPath, content, { spaces: 2 });
    if (this.config.verbose) {
      console.log(`[Sandbox] Created JSON file: ${relativePath}`);
    }
    return fullPath;
  }

  /**
   * Read a file from the sandbox
   */
  async readFile(relativePath: string): Promise<string> {
    const fullPath = path.join(this.path, relativePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Read a JSON file from the sandbox
   */
  async readJson<T = unknown>(relativePath: string): Promise<T> {
    const fullPath = path.join(this.path, relativePath);
    return fs.readJson(fullPath);
  }

  /**
   * Check if a file exists in the sandbox
   */
  async exists(relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.path, relativePath);
    return fs.pathExists(fullPath);
  }

  /**
   * Get the absolute path for a relative path in the sandbox
   */
  resolve(...relativePaths: string[]): string {
    return path.join(this.path, ...relativePaths);
  }

  /**
   * Mark the test as failed to preserve the sandbox for debugging
   */
  markFailed(): void {
    this._failed = true;
    if (this.config.verbose) {
      console.log(`[Sandbox] Marked as failed: ${this.testName}`);
    }
  }

  /**
   * Check if this sandbox should be preserved
   */
  get shouldPreserve(): boolean {
    return this._failed && this.config.keepOnFailure;
  }

  /**
   * Clean up the sandbox directory
   * Respects TEST_KEEP_ON_FAILURE when markFailed() was called
   */
  async cleanup(): Promise<void> {
    if (this.shouldPreserve) {
      console.log(`[Sandbox] Preserving failed test sandbox: ${this.path}`);
      return;
    }

    try {
      await fs.remove(this.path);
      if (this.config.verbose) {
        console.log(`[Sandbox] Cleaned up: ${this.path}`);
      }
    } catch (error) {
      console.warn(`[Sandbox] Failed to cleanup ${this.path}:`, error);
    }
  }
}

/**
 * Create a new test sandbox with a unique directory
 *
 * @param testName - Identifier for the test (used in directory naming)
 * @param config - Optional configuration overrides
 * @returns Promise resolving to a TestSandbox instance
 *
 * @example
 * ```typescript
 * let sandbox: TestSandbox;
 *
 * beforeEach(async () => {
 *   sandbox = await createSandbox('my-test');
 * });
 *
 * afterEach(async () => {
 *   await sandbox.cleanup();
 * });
 * ```
 */
export async function createSandbox(
  testName: string,
  config?: Partial<SandboxConfig>
): Promise<TestSandbox> {
  const sandboxConfig = { ...getSandboxConfig(), ...config };

  // Ensure sandbox root exists
  await fs.ensureDir(sandboxConfig.root);

  // Create unique directory using mkdtemp
  // Sanitize testName to be filesystem-safe
  const safeName = testName.replace(/[^a-zA-Z0-9-_]/g, '-').substring(0, 50);
  const prefix = `${safeName}-`;

  const sandboxPath = await fs.mkdtemp(path.join(sandboxConfig.root, prefix));

  if (sandboxConfig.verbose) {
    console.log(`[Sandbox] Created sandbox: ${sandboxPath}`);
  }

  return new TestSandbox(sandboxPath, testName, sandboxConfig);
}

/**
 * Clean up old sandbox directories that may have been left over
 * from previous test runs. Useful for CI/CD cleanup.
 *
 * @param maxAgeMs - Maximum age in milliseconds (default: 1 hour)
 */
export async function cleanupOrphanedSandboxes(maxAgeMs = 3600000): Promise<void> {
  const config = getSandboxConfig();

  if (!(await fs.pathExists(config.root))) {
    return;
  }

  const entries = await fs.readdir(config.root);
  const now = Date.now();

  for (const entry of entries) {
    const entryPath = path.join(config.root, entry);
    try {
      const stats = await fs.stat(entryPath);
      if (stats.isDirectory() && now - stats.mtimeMs > maxAgeMs) {
        await fs.remove(entryPath);
        if (config.verbose) {
          console.log(`[Sandbox] Removed orphaned sandbox: ${entry}`);
        }
      }
    } catch {
      // Ignore errors for individual entries
    }
  }
}
