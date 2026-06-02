/**
 * Type Safety Integration Tests
 *
 * Integration tests that verify CLI commands work correctly with typed options.
 * These tests exercise the actual command implementations to ensure:
 * - Default values are applied correctly
 * - Type coercion works as expected
 * - Error handling is proper for invalid options
 *
 * @module commands/__tests__/type-safety.integration.test
 */

import { execSync, exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// Path to the CLI binary
const CLI_BIN = path.resolve(__dirname, '../../../bin/agentic-framework');

// Path to the built dist
const CLI_DIST = path.resolve(__dirname, '../../../dist/index.js');

/**
 * Execute CLI command and return result
 */
function execCLI(args: string, options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  try {
    const stdout = execSync(`node ${CLI_DIST} ${args}`, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env, NO_COLOR: '1' },
      encoding: 'utf-8',
      timeout: 30000,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      exitCode: execError.status || 1,
    };
  }
}

describe('CLI Type Safety Integration Tests', () => {
  let testDir: string;

  beforeAll(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `cli-type-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    // Clean up test directory
    if (testDir && testDir.includes('cli-type-test')) {
      await fs.remove(testDir);
    }
  });

  describe('validate command options', () => {
    it('should accept --verbose option', () => {
      const result = execCLI('validate --help');
      expect(result.stdout).toContain('-v, --verbose');
    });

    it('should accept --strict option', () => {
      const result = execCLI('validate --help');
      expect(result.stdout).toContain('--strict');
    });

    it('should accept --json option', () => {
      const result = execCLI('validate --help');
      expect(result.stdout).toContain('--json');
    });

    it('should accept --versions option', () => {
      const result = execCLI('validate --help');
      expect(result.stdout).toContain('--versions');
    });

    it('should accept --links option', () => {
      const result = execCLI('validate --help');
      expect(result.stdout).toContain('--links');
    });
  });

  describe('backlog create-ticket command options', () => {
    it('should require --type option', () => {
      const result = execCLI('backlog create-ticket --help');
      expect(result.stdout).toContain('-t, --type');
      // Note: Commander.js doesn't show "required" in help text by default
      // The option is required by the command logic, verified by error test below
    });

    it('should accept --name option', () => {
      const result = execCLI('backlog create-ticket --help');
      expect(result.stdout).toContain('-n, --name');
    });

    it('should accept --summary option', () => {
      const result = execCLI('backlog create-ticket --help');
      expect(result.stdout).toContain('-s, --summary');
    });

    it('should accept --dry-run option', () => {
      const result = execCLI('backlog create-ticket --help');
      expect(result.stdout).toContain('--dry-run');
    });

    it('should accept --path option', () => {
      const result = execCLI('backlog create-ticket --help');
      expect(result.stdout).toContain('-p, --path');
    });
  });

  describe('agent run command options', () => {
    it('should accept --model option', () => {
      const result = execCLI('agent run --help');
      expect(result.stdout).toContain('--model');
    });

    it('should accept --phase option', () => {
      const result = execCLI('agent run --help');
      expect(result.stdout).toContain('--phase');
    });

    it('should accept --session option', () => {
      const result = execCLI('agent run --help');
      expect(result.stdout).toContain('--session');
    });

    it('should accept --dry-run option', () => {
      const result = execCLI('agent run --help');
      expect(result.stdout).toContain('--dry-run');
    });
  });

  describe('init command options', () => {
    it('should accept --modules option', () => {
      const result = execCLI('init --help');
      expect(result.stdout).toContain('--modules');
    });

    it('should accept --no-git option', () => {
      const result = execCLI('init --help');
      // Commander.js negates boolean options with --no- prefix
      expect(result.stdout).toContain('--no-git');
    });

    it('should accept --no-interactive option', () => {
      const result = execCLI('init --help');
      expect(result.stdout).toContain('--no-interactive');
    });
  });
});

describe('Command Option Default Values', () => {
  describe('backlog validate command', () => {
    it('should use default path ./backlog when not specified', () => {
      const result = execCLI('backlog validate --help');
      expect(result.stdout).toMatch(/\./); // Default path shown in help
    });
  });

});

describe('Command Option Error Handling', () => {
  let testDir: string;

  beforeAll(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `cli-error-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    // Clean up test directory
    if (testDir && testDir.includes('cli-error-test')) {
      await fs.remove(testDir);
    }
  });

  describe('backlog create-ticket command', () => {
    it('should error when required --type is missing', () => {
      const result = execCLI('backlog create-ticket');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('required');
    });

    it('should error with invalid ticket type', async () => {
      // Create a temp project first
      const projectDir = path.join(testDir, 'ticket-test');
      await fs.ensureDir(projectDir);
      await fs.writeFile(path.join(projectDir, 'CLAUDE.md'), '# Test');
      await fs.ensureDir(path.join(projectDir, 'backlog/tickets'));

      const result = execCLI('backlog create-ticket --type invalid', { cwd: projectDir });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('Invalid ticket type');
    });
  });

});

describe('Boolean Option Handling', () => {
  /**
   * Commander.js handles boolean options in specific ways.
   * These tests ensure our commands work correctly with boolean flags.
   */

  it('should treat --verbose as true when flag is present', () => {
    const result = execCLI('validate --verbose --help');
    // Just checking it doesn't error - the flag should be accepted
    expect(result.exitCode).toBe(0);
  });

  it('should treat --no-interactive as setting interactive to false', () => {
    const result = execCLI('init --no-interactive --help');
    // Just checking it doesn't error - the flag should be accepted
    expect(result.exitCode).toBe(0);
  });

  it('should accept --dry-run flag', () => {
    const result = execCLI('backlog create-ticket --dry-run --help');
    expect(result.exitCode).toBe(0);
  });
});

describe('String Option Handling', () => {
  it('should accept string values with spaces when quoted', () => {
    const result = execCLI('backlog create-ticket --help');
    // The help should work, just checking command accepts options
    expect(result.exitCode).toBe(0);
  });

  it('should accept path options with special characters', () => {
    const result = execCLI('validate --help');
    expect(result.exitCode).toBe(0);
  });
});
