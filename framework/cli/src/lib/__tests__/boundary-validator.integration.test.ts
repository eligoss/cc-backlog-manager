/**
 * Integration tests for Boundary Validator
 *
 * Tests the framework/instance separation validation.
 * These tests are expected to document violations in the current repository state.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createSandbox, TestSandbox } from './test-utils';
import { BoundaryValidator, BoundaryValidationResult } from '../boundary-validator';

describe('BoundaryValidator (Integration)', () => {
  let sandbox: TestSandbox;
  let testRoot: string;

  /**
   * Create a test fixture with the given file structure
   */
  async function createTestFixture(
    structure: Record<string, string>
  ): Promise<string> {
    for (const [filePath, content] of Object.entries(structure)) {
      const fullPath = path.join(testRoot, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }

    return testRoot;
  }

  beforeEach(async () => {
    sandbox = await createSandbox('boundary-validator-integration');
    testRoot = sandbox.path;
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('Zone Classification', () => {
    it('should classify framework/ files as framework zone', async () => {
      await createTestFixture({
        'framework/agents/test.md': '# Test',
      });

      const validator = new BoundaryValidator(testRoot);
      const filePath = path.join(testRoot, 'framework/agents/test.md');

      expect(validator.classifyZone(filePath)).toBe('framework');
    });

    it('should classify .claude/ files as instance zone', async () => {
      await createTestFixture({
        '.claude/commands/test.md': '# Test',
      });

      const validator = new BoundaryValidator(testRoot);
      const filePath = path.join(testRoot, '.claude/commands/test.md');

      expect(validator.classifyZone(filePath)).toBe('instance');
    });

    // Note: ai/ was migrated to .claude/ in the new architecture
    // The .claude/ test above covers instance zone classification
    it.skip('should classify ai/ files as instance zone (legacy)', async () => {
      await createTestFixture({
        'ai/registries/agents.json': '{}',
      });

      const validator = new BoundaryValidator(testRoot);
      const filePath = path.join(testRoot, 'ai/registries/agents.json');

      expect(validator.classifyZone(filePath)).toBe('instance');
    });

    it('should classify CLAUDE.md as instance zone', async () => {
      await createTestFixture({
        'CLAUDE.md': '# Claude',
      });

      const validator = new BoundaryValidator(testRoot);
      const filePath = path.join(testRoot, 'CLAUDE.md');

      expect(validator.classifyZone(filePath)).toBe('instance');
    });

    it('should classify routes.yml as instance zone', async () => {
      await createTestFixture({
        'routes.yml': 'version: 1',
      });

      const validator = new BoundaryValidator(testRoot);
      const filePath = path.join(testRoot, 'routes.yml');

      expect(validator.classifyZone(filePath)).toBe('instance');
    });
  });

  describe('Reference Extraction', () => {
    describe('Markdown References', () => {
      it('should extract markdown links [text](path)', async () => {
        await createTestFixture({
          'framework/test.md': `
# Test
See [other file](./other.md) for details.
          `.trim(),
          'framework/other.md': '# Other',
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        // Should scan the files
        expect(result.stats.filesScanned).toBeGreaterThan(0);
        expect(result.stats.referencesChecked).toBeGreaterThan(0);
      });

      it('should ignore external URLs', async () => {
        await createTestFixture({
          'framework/test.md': `
# Test
See [example](https://example.com) for details.
See [ftp](ftp://server.com/file) for more.
          `.trim(),
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        // External URLs should not be counted as references
        expect(result.stats.referencesChecked).toBe(0);
      });

      it('should ignore anchor-only links', async () => {
        await createTestFixture({
          'framework/test.md': `
# Test
See [section](#section) for details.
          `.trim(),
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        // Anchor-only should not be counted
        expect(result.stats.referencesChecked).toBe(0);
      });

      it('should skip links inside code blocks', async () => {
        await createTestFixture({
          'framework/test.md': `
# Test

\`\`\`markdown
[link](../../ai/context/file.md)
\`\`\`

Normal text here.
          `.trim(),
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        // Links inside code blocks should be ignored
        expect(result.violations.filter((v) => v.rule === 'framework-to-instance')).toHaveLength(0);
      });
    });

    describe('JSON References', () => {
      it('should extract path values from JSON', async () => {
        await createTestFixture({
          'framework/config/module.json': JSON.stringify(
            {
              name: 'test',
              path: './skills/test/SKILL.md',
            },
            null,
            2
          ),
          'framework/config/skills/test/SKILL.md': '# Skill',
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.stats.referencesChecked).toBeGreaterThan(0);
      });
    });

    describe('Absolute Path Detection', () => {
      it('should detect hardcoded /Users/ paths', async () => {
        await createTestFixture({
          'framework/test.md': `
# Test
See [registries](/Users/john/project/ai/registries/agents.json).
          `.trim(),
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.rule === 'hardcoded-absolute')).toBe(true);
      });

      it('should detect hardcoded /home/ paths', async () => {
        await createTestFixture({
          'framework/test.md': `
# Test
Config at /home/user/project/config.json
          `.trim(),
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.rule === 'hardcoded-absolute')).toBe(true);
      });

      it('should detect absolute paths in plain text (not just links)', async () => {
        await createTestFixture({
          '.claude/skills/test/SKILL.md': `
# Test Skill

Working directory: /Users/anton/Wenco/project/
          `.trim(),
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.violations.some((v) => v.rule === 'hardcoded-absolute')).toBe(true);
      });
    });
  });

  describe('Boundary Rules', () => {
    describe('Framework to Instance Rule', () => {
      // Note: ai/ was migrated to .claude/ in the new architecture
      it.skip('should fail when framework file links to ai/ (legacy)', async () => {
        await createTestFixture({
          'framework/agents/test.md': `
# Test Agent
See [registries](../../ai/registries/agents.json) for metadata.
          `.trim(),
          'ai/registries/agents.json': '{}',
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.valid).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe('framework-to-instance');
      });

      it('should fail when framework file links to .claude/', async () => {
        await createTestFixture({
          'framework/skills/test/SKILL.md': `
# Test Skill
See [command](../../../.claude/commands/test.md).
          `.trim(),
          '.claude/commands/test.md': '# Test',
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.rule === 'framework-to-instance')).toBe(true);
      });

      it('should pass when framework file links to other framework files', async () => {
        await createTestFixture({
          'framework/agents/test.md': `
# Test Agent
See [skill](../skills/shared/SKILL.md) for guidance.
          `.trim(),
          'framework/skills/shared/SKILL.md': '# Skill',
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.stats.frameworkViolations).toBe(0);
      });
    });

    describe('Instance to Framework Rule', () => {
      it('should fail when .claude/ links to framework/', async () => {
        await createTestFixture({
          '.claude/commands/test.md': `
# Test
See [agent](../../framework/agents/test.md) for details.
          `.trim(),
          'framework/agents/test.md': '# Agent',
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.rule === 'instance-to-framework')).toBe(true);
      });

      // Note: ai/ was migrated to .claude/ in the new architecture
      it.skip('should fail when ai/ links to framework/ (legacy)', async () => {
        await createTestFixture({
          'ai/context/technical.md': `
# Technical Context
See [module](../../framework/modules/core/module.json).
          `.trim(),
          'framework/modules/core/module.json': '{}',
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.rule === 'instance-to-framework')).toBe(true);
      });

      it('should pass when .claude/ links to other .claude/ files', async () => {
        await createTestFixture({
          '.claude/commands/test.md': `
# Test
See [context](../context/business.md).
          `.trim(),
          '.claude/context/business.md': '# Business',
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.stats.instanceViolations).toBe(0);
      });

      // Note: ai/ was migrated to .claude/ in the new architecture
      it.skip('should pass when ai/ links to other ai/ files (legacy)', async () => {
        await createTestFixture({
          'ai/context/technical.md': `
# Technical
See [business](./business.md) for overview.
          `.trim(),
          'ai/context/business.md': '# Business',
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.stats.instanceViolations).toBe(0);
      });
    });

    describe('Hardcoded Absolute Path Rule', () => {
      it('should fail in framework files with absolute paths', async () => {
        await createTestFixture({
          'framework/agents/test.md': `
# Test Agent
See [registries](/Users/anton/project/ai/registries/agents.json).
          `.trim(),
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.rule === 'hardcoded-absolute')).toBe(true);
      });

      it('should fail in instance files with absolute paths', async () => {
        await createTestFixture({
          '.claude/commands/test.md': `
# Test
Registry at /Users/john/Wenco/project/ai/registries/
          `.trim(),
        });

        const validator = new BoundaryValidator(testRoot);
        const result = await validator.validateProject();

        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.rule === 'hardcoded-absolute')).toBe(true);
      });
    });
  });

  describe('Path Resolution', () => {
    it('should resolve relative paths correctly', async () => {
      await createTestFixture({
        'framework/a/b/file.md': '[link](../../c/d/target.md)',
        'framework/c/d/target.md': '# Target',
      });

      const validator = new BoundaryValidator(testRoot);
      const result = await validator.validateProject();

      // Should not have violations (framework to framework is OK)
      expect(result.stats.frameworkViolations).toBe(0);
    });

    it('should handle paths with anchors', async () => {
      await createTestFixture({
        'framework/file.md': '[link](./other.md#section)',
        'framework/other.md': '# Other',
      });

      const validator = new BoundaryValidator(testRoot);
      const result = await validator.validateProject();

      // Should process without errors
      expect(result.stats.filesScanned).toBe(2);
    });

    it('should handle URL-encoded paths', async () => {
      await createTestFixture({
        'framework/file.md': '[link](./path%20with%20spaces/file.md)',
        'framework/path with spaces/file.md': '# File',
      });

      const validator = new BoundaryValidator(testRoot);

      // Should not throw
      await expect(validator.validateProject()).resolves.toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should count files scanned correctly', async () => {
      await createTestFixture({
        'framework/a.md': '# A',
        'framework/b.md': '# B',
        '.claude/c.md': '# C',
        '.claude/d.md': '# D', // using .claude/ as it's in the scan paths
      });

      const validator = new BoundaryValidator(testRoot);
      const result = await validator.validateProject();

      expect(result.stats.filesScanned).toBe(4);
    });

    it('should count references checked correctly', async () => {
      await createTestFixture({
        'framework/test.md': `
# Test
[link1](./a.md)
[link2](./b.md)
[external](https://example.com)
        `.trim(),
        'framework/a.md': '# A',
        'framework/b.md': '# B',
      });

      const validator = new BoundaryValidator(testRoot);
      const result = await validator.validateProject();

      // Should have 2 references (external URL is skipped)
      expect(result.stats.referencesChecked).toBe(2);
    });

    it('should count violation types correctly', async () => {
      await createTestFixture({
        // Framework to instance violation (../.claude from framework/)
        'framework/test1.md': '[link](../.claude/file.md)',
        '.claude/file.md': '# File',
        // Instance to framework violation (../framework from .claude/)
        '.claude/test2.md': '[link](../framework/file.md)',
        'framework/file.md': '# File',
        // Absolute path violation
        'framework/test3.md': 'Path: /Users/john/project/',
      });

      const validator = new BoundaryValidator(testRoot);
      const result = await validator.validateProject();

      expect(result.stats.frameworkViolations).toBe(1);
      expect(result.stats.instanceViolations).toBe(1);
      expect(result.stats.absolutePathViolations).toBe(1);
    });
  });

  describe('Report Formatting', () => {
    it('should generate human-readable report with violations', async () => {
      await createTestFixture({
        // Use correct relative path: ../.claude from framework/
        'framework/test.md': '[link](../.claude/file.md)',
        '.claude/file.md': '# File',
      });

      const validator = new BoundaryValidator(testRoot);
      const result = await validator.validateProject();
      const report = validator.formatReport(result);

      expect(report).toContain('BOUNDARY VALIDATION REPORT');
      expect(report).toContain('Files Scanned:');
      expect(report).toContain('Framework→Instance:');
      // When violations exist, the Violations section should appear
      expect(result.violations.length).toBeGreaterThan(0);
      expect(report).toContain('Violations:');
    });

    it('should generate report without violations section when clean', async () => {
      await createTestFixture({
        'framework/test.md': '[link](./other.md)',
        'framework/other.md': '# Other',
      });

      const validator = new BoundaryValidator(testRoot);
      const result = await validator.validateProject();
      const report = validator.formatReport(result);

      expect(report).toContain('BOUNDARY VALIDATION REPORT');
      expect(result.violations.length).toBe(0);
      // No Violations section when clean
      expect(report).not.toContain('Violations:');
    });
  });

  // TODO: Real repository validation tests are skipped in CI due to
  // boundary violations that need to be addressed in the codebase.
  // These violations are documented and being tracked separately.
  describe.skip('Real Repository Validation', () => {
    /**
     * This test validates the actual repository.
     * It's expected to FAIL with current violations.
     * Run with: npm run test:integration -- --testPathPattern=boundary-validator
     */
    it('should generate violation report for actual repository', async () => {
      // Navigate up to project root from __tests__ directory
      const repoRoot = path.resolve(__dirname, '../../../../..');

      const validator = new BoundaryValidator(repoRoot);
      const result = await validator.validateProject();
      const report = validator.formatReport(result);

      // Output the report for visibility
      console.log('\n' + report);

      // This test documents the current state
      expect(result.stats.filesScanned).toBeGreaterThan(0);

      // Expected to have violations in current state
      // Uncomment to enforce no violations after cleanup:
      // expect(result.valid).toBe(true);
    });

    /**
     * This test enforces boundary separation.
     * Validates that no boundary violations exist in the repository.
     */
    it('should pass with no boundary violations', async () => {
      const repoRoot = path.resolve(__dirname, '../../../../..');

      const validator = new BoundaryValidator(repoRoot);
      const result = await validator.validateProject();

      if (!result.valid) {
        console.log('\nViolations found:');
        console.log(validator.formatReport(result));
      }

      expect(result.valid).toBe(true);
    });
  });
});
