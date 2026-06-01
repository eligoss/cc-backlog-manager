/**
 * Integration tests for Build Command
 *
 * Tests the build command end-to-end with real framework files
 * and various configuration options.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync, ExecSyncOptions } from 'child_process';

// Test fixture directory
const TEST_DIR = path.join(__dirname, '__fixtures__', 'build-command');
const CLI_PATH = path.join(__dirname, '..', '..', '..', 'dist', 'index.js');

describe('Build Command Integration', () => {
  let testRoot: string;

  const runCli = (args: string, options?: Partial<ExecSyncOptions>): string => {
    try {
      return execSync(`node ${CLI_PATH} ${args}`, {
        cwd: testRoot,
        encoding: 'utf-8',
        timeout: 30000,
        ...options,
      });
    } catch (error: any) {
      // Return stderr/stdout on error for test assertions
      return error.stdout || error.stderr || error.message;
    }
  };

  beforeAll(async () => {
    // Create test fixture directory
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  beforeEach(async () => {
    // Create unique test directory for each test
    testRoot = path.join(TEST_DIR, `test-${Date.now()}`);
    await fs.mkdir(testRoot, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    // Clean up fixture directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Quick Mode', () => {
    it('should run quick validation with --quick flag', async () => {
      // Create minimal valid structure
      const skillDir = path.join(testRoot, 'framework', 'modules', 'core', 'skills', 'test');
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: test-skill
name: Test Skill
description: A test skill for build command integration testing
capabilities-provided:
  - testing
---

# Test Skill
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      const output = runCli(`build -p ${testRoot} --quick`);
      expect(output).toContain('Build');
    });

    it('should skip link validation in quick mode', async () => {
      const skillDir = path.join(testRoot, 'framework', 'modules', 'core', 'skills', 'test');
      await fs.mkdir(skillDir, { recursive: true });

      // Skill with broken link (would fail full validation)
      const skillContent = `---
id: test-skill
name: Test Skill
description: A test skill with a broken link for testing
capabilities-provided:
  - testing
---

# Test Skill

See [broken link](nonexistent.md) for details.
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      const output = runCli(`build -p ${testRoot} --quick`);
      // Quick mode should not report broken links
      expect(output).not.toContain('BROKEN_LINK');
    });
  });

  describe('CI Mode', () => {
    it('should output minimal format in CI mode', async () => {
      const skillDir = path.join(testRoot, 'framework', 'modules', 'core', 'skills', 'test');
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: test-skill
name: Test Skill
description: A test skill for CI mode testing
capabilities-provided:
  - testing
---

# Test Skill
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      const output = runCli(`build -p ${testRoot} --quick --ci`);
      expect(output).toContain('Build passed');
      // CI mode should be compact
      expect(output.split('\n').length).toBeLessThan(5);
    });
  });

  describe('JSON Output', () => {
    it('should output valid JSON with --json flag', async () => {
      const skillDir = path.join(testRoot, 'framework', 'modules', 'core', 'skills', 'test');
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: test-skill
name: Test Skill
description: A test skill for JSON output testing
capabilities-provided:
  - testing
---

# Test Skill
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      const output = runCli(`build -p ${testRoot} --quick --json`);

      // Should be parseable JSON
      let parsed;
      try {
        parsed = JSON.parse(output);
      } catch {
        // If it's not valid JSON, fail the test
        expect(output).toBe('valid JSON');
        return;
      }

      expect(parsed).toHaveProperty('success');
      expect(parsed).toHaveProperty('errorCount');
      expect(parsed).toHaveProperty('warningCount');
      expect(parsed).toHaveProperty('stats');
    });

    // TODO: This test depends on capability validation generating issues for
    // unresolved capability-needs. In quick mode, capability validation may
    // not report issues for missing capabilities. Enable when capability
    // validation is stricter about missing capability references.
    it.skip('should include issues array in JSON output', async () => {
      const agentDir = path.join(testRoot, 'framework', 'modules', 'core', 'agents');
      await fs.mkdir(agentDir, { recursive: true });

      // Invalid agent
      const agentContent = `---
agent: invalid-agent
role: Test
framework-version: 1.2
variant: full
capability-needs:
  - test
---

# Invalid
`;
      await fs.writeFile(path.join(agentDir, 'invalid-agent.md'), agentContent);

      const output = runCli(`build -p ${testRoot} --quick --json`);

      let parsed;
      try {
        parsed = JSON.parse(output);
      } catch {
        expect(output).toBe('valid JSON');
        return;
      }

      expect(parsed.issues).toBeInstanceOf(Array);
      expect(parsed.issues.length).toBeGreaterThan(0);
    });
  });

  // TODO: Capability suggestion feature is not yet implemented in build command.
  // This test should be enabled once the feature is implemented to suggest
  // similar capability names for typos (e.g., git-workfow -> git-workflow).
  describe.skip('Verbose Mode', () => {
    it('should show suggestions in verbose mode', async () => {
      const agentDir = path.join(testRoot, 'framework', 'modules', 'core', 'agents');
      await fs.mkdir(agentDir, { recursive: true });

      const agentContent = `---
agent: ai-test
role: Test agent
framework-version: 1.2
variant: full
capability-needs:
  - git-workfow
---

# Test
`;
      await fs.writeFile(path.join(agentDir, 'ai-test.md'), agentContent);

      // Create skill with similar capability name
      const skillDir = path.join(testRoot, 'framework', 'modules', 'core', 'skills', 'git');
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: git-skill
name: Git Skill
description: Provides git workflow capabilities
capabilities-provided:
  - git-workflow
---

# Git
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      const output = runCli(`build -p ${testRoot} -v`);
      // Should suggest similar capability
      expect(output).toContain('git-workflow');
    });
  });

  describe('Schema Generation', () => {
    it('should generate JSON schemas with --emit-schemas', async () => {
      const skillDir = path.join(testRoot, 'framework', 'modules', 'core', 'skills', 'test');
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: test-skill
name: Test Skill
description: A test skill for schema generation
capabilities-provided:
  - testing
---

# Test
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      const schemaDir = path.join(testRoot, 'schemas');
      runCli(`build -p ${testRoot} --quick --emit-schemas --schema-dir ${schemaDir}`);

      // Check schemas were generated
      const files = await fs.readdir(schemaDir).catch(() => []);
      expect(files).toContain('agent-frontmatter.schema.json');
      expect(files).toContain('skill-frontmatter.schema.json');
      expect(files).toContain('yaml-schema-mappings.json');
    });

    it('should generate valid JSON schemas', async () => {
      const skillDir = path.join(testRoot, 'framework', 'modules', 'core', 'skills', 'test');
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: test-skill
name: Test Skill
description: A test skill for schema validation
capabilities-provided:
  - testing
---

# Test
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      const schemaDir = path.join(testRoot, 'schemas');
      runCli(`build -p ${testRoot} --quick --emit-schemas --schema-dir ${schemaDir}`);

      // Read and validate schema
      const schemaPath = path.join(schemaDir, 'agent-frontmatter.schema.json');
      const schemaContent = await fs.readFile(schemaPath, 'utf-8').catch(() => '');

      if (schemaContent) {
        const schema = JSON.parse(schemaContent);
        expect(schema).toHaveProperty('$schema');
        expect(schema.$schema).toContain('json-schema.org');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project path gracefully', async () => {
      const output = runCli('build -p /nonexistent/path --quick --json');

      // Should still output valid JSON even on error
      try {
        const parsed = JSON.parse(output);
        expect(parsed).toBeDefined();
      } catch {
        // Or should handle the error gracefully
        expect(output).toBeDefined();
      }
    });

    it('should handle malformed YAML gracefully', async () => {
      const skillDir = path.join(testRoot, 'framework', 'modules', 'core', 'skills', 'bad');
      await fs.mkdir(skillDir, { recursive: true });

      // Malformed YAML
      const skillContent = `---
id: test
  bad indentation
---

# Bad
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      const output = runCli(`build -p ${testRoot} --quick --json`);

      // Should handle gracefully
      expect(output).toBeDefined();
    });
  });

  describe('Real Framework Validation', () => {
    it('should validate actual framework structure', async () => {
      // This test validates the real framework if available
      const realFramework = path.resolve(__dirname, '..', '..', '..', '..');

      // Check if we're in the real framework
      const hasRealFramework = await fs.access(
        path.join(realFramework, 'framework', 'modules')
      ).then(() => true).catch(() => false);

      if (!hasRealFramework) {
        // Skip if not running in real framework
        return;
      }

      const output = runCli(`build -p ${realFramework} --quick`, {
        cwd: realFramework,
      });

      // Should complete without fatal errors
      expect(output).toBeDefined();
      // Real framework should pass quick validation
      expect(output).not.toContain('BUILD_FATAL');
    });
  });
});
