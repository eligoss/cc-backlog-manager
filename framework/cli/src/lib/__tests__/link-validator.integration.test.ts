/**
 * Integration tests for Markdown Link Validator CLI
 *
 * Tests the full CLI integration including command-line arguments and exit codes
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createSandbox, TestSandbox } from './test-utils';
import { MarkdownLinkValidator } from '../link-validator';

describe('MarkdownLinkValidator - Integration', () => {
  let sandbox: TestSandbox;
  let testRoot: string;

  beforeEach(async () => {
    sandbox = await createSandbox('link-validator-integration');
    testRoot = sandbox.path;
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('Full Framework Validation', () => {
    it('should validate a complete framework directory structure', async () => {
      // Create framework structure - using .claude/ paths per new architecture
      const claudeDir = path.join(testRoot, '.claude', 'commands');
      const docsDir = path.join(testRoot, 'docs');

      await fs.mkdir(claudeDir, { recursive: true });
      await fs.mkdir(docsDir, { recursive: true });

      // Framework file (critical) - now in .claude/commands
      const frameworkFile = path.join(claudeDir, 'architect.md');
      await fs.writeFile(frameworkFile, `
# Architect Agent

See [context](../context/technical.md) for setup.
See [missing-guide](../../docs/missing-guide.md) for usage.
      `.trim());

      // Content file (non-critical)
      const docsFile = path.join(docsDir, 'guide.md');
      await fs.writeFile(docsFile, `
# User Guide

See [architect](../.claude/commands/architect.md) for details.
See [missing](../missing.md) for broken link.
      `.trim());

      // Create context file (makes first framework link valid)
      const contextDir = path.join(testRoot, '.claude', 'context');
      await fs.mkdir(contextDir, { recursive: true });
      await fs.writeFile(path.join(contextDir, 'technical.md'), '# Technical Context');

      const validator = new MarkdownLinkValidator(testRoot);

      // Validate framework file
      const frameworkResult = await validator.validateFile(frameworkFile);
      expect(frameworkResult.isFrameworkFile).toBe(true);
      expect(frameworkResult.brokenLinks).toHaveLength(1); // missing-guide.md doesn't exist

      // Validate content file
      const contentResult = await validator.validateFile(docsFile);
      expect(contentResult.isFrameworkFile).toBe(false);
      expect(contentResult.brokenLinks).toHaveLength(1); // missing.md doesn't exist
    });

    it('should handle large-scale validation efficiently', async () => {
      // Create 50 markdown files
      const files: string[] = [];

      for (let i = 0; i < 50; i++) {
        const dir = path.join(testRoot, `dir${i}`);
        await fs.mkdir(dir, { recursive: true });

        const file = path.join(dir, `file${i}.md`);
        await fs.writeFile(file, `# File ${i}\n\n[link](../dir${(i + 1) % 50}/file${(i + 1) % 50}.md)`);
        files.push(file);
      }

      const validator = new MarkdownLinkValidator(testRoot);
      const startTime = Date.now();

      const result = await validator.validateMarkdownLinks(files);

      const duration = Date.now() - startTime;

      expect(result.filesChecked).toBe(50);
      expect(result.valid).toBe(true); // All links should be valid (circular references)
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should correctly identify two-tier strictness levels', async () => {
      const validator = new MarkdownLinkValidator(testRoot);

      // Framework core paths - updated for .claude/ architecture
      const frameworkPaths = [
        path.join(testRoot, '.claude', 'commands', 'test.md'),
        path.join(testRoot, '.claude', 'context', 'test.md'),
        path.join(testRoot, '.claude', 'skills', 'test.md'),
        path.join(testRoot, 'core', 'test.md'),
        path.join(testRoot, 'cli', 'src', 'test.md'),
        path.join(testRoot, 'CLAUDE.md'),
        path.join(testRoot, 'README.md')
      ];

      for (const fwPath of frameworkPaths) {
        expect(validator.isFrameworkFile(fwPath)).toBe(true);
      }

      // Content paths
      const contentPaths = [
        path.join(testRoot, 'backlog', 'tickets', 'test.md'),
        path.join(testRoot, 'docs', 'guide.md'),
        path.join(testRoot, 'confluence', 'spaces', 'test.md')
      ];

      for (const contentPath of contentPaths) {
        expect(validator.isFrameworkFile(contentPath)).toBe(false);
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle complex markdown with mixed content', async () => {
      const complexFile = path.join(testRoot, 'complex.md');

      await fs.writeFile(complexFile, `
# Complex Document

## Code Examples

\`\`\`markdown
[example](path/to/example.md)
\`\`\`

## Valid Links

- [Local file](./local.md)
- [External](https://example.com)
- [Anchor](#section)

## Invalid Patterns

See \`framework/agents/file.md\` for details.
→ framework/skills/flow.md →

## Broken Links

[missing](./missing.md)
      `.trim());

      // Create local.md
      await fs.writeFile(path.join(testRoot, 'local.md'), '# Local');

      const validator = new MarkdownLinkValidator(testRoot);
      const result = await validator.validateFile(complexFile);

      // Should find 1 broken link (missing.md)
      expect(result.brokenLinks).toHaveLength(1);
      expect(result.brokenLinks[0].target).toBe('./missing.md');

      // Should find 2 anti-patterns (backticked path and workflow path)
      expect(result.antiPatterns).toHaveLength(2);
      expect(result.antiPatterns.some(ap => ap.patternType === 'backticked_path')).toBe(true);
      expect(result.antiPatterns.some(ap => ap.patternType === 'plain_path_in_workflow')).toBe(true);
    });

    it('should provide accurate statistics for reporting', async () => {
      const dir = path.join(testRoot, 'stats-test');
      await fs.mkdir(dir, { recursive: true });

      const file1 = path.join(dir, 'file1.md');
      const file2 = path.join(dir, 'file2.md');
      const target = path.join(dir, 'target.md');

      await fs.writeFile(target, '# Target');
      await fs.writeFile(file1, `
[valid1](target.md)
[valid2](target.md#section)
[broken1](missing1.md)
      `.trim());

      await fs.writeFile(file2, `
[valid3](target.md)
[broken2](missing2.md)
[broken3](missing3.md)
      `.trim());

      const validator = new MarkdownLinkValidator(testRoot);
      const result = await validator.validateMarkdownLinks([file1, file2]);

      expect(result.filesChecked).toBe(2);
      expect(result.linksChecked).toBeGreaterThanOrEqual(5); // 3 valid + 3 broken (anchors stripped)
      expect(result.brokenLinks).toHaveLength(3);
      expect(result.valid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle permission errors gracefully', async () => {
      const validator = new MarkdownLinkValidator(testRoot);
      const nonExistentDir = path.join(testRoot, 'nonexistent', 'file.md');

      await expect(validator.validateFile(nonExistentDir)).rejects.toThrow('File not found');
    });

    it('should continue validation even with some file errors', async () => {
      const dir = path.join(testRoot, 'error-test');
      await fs.mkdir(dir, { recursive: true });

      const validFile = path.join(dir, 'valid.md');
      await fs.writeFile(validFile, '[link](target.md)');

      const validator = new MarkdownLinkValidator(testRoot);

      // Validate with one valid and one missing file
      const result = await validator.validateMarkdownLinks([
        validFile,
        path.join(dir, 'nonexistent.md')
      ]);

      // Should process the valid file despite the error
      expect(result.filesChecked).toBe(1);
    });
  });
});
