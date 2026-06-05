/**
 * Tests for Markdown Link Validator
 *
 * Uses TDD approach - tests written before implementation
 * Tests the Python link_validator.py algorithm in TypeScript
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MarkdownLinkValidator, type LinkValidationResult, type BrokenLink, type AntiPattern } from '../link-validator';

// Test fixture directory
const TEST_DIR = path.join(__dirname, '__fixtures__', 'link-validator');

describe('MarkdownLinkValidator', () => {
  let validator: MarkdownLinkValidator;
  let testRoot: string;

  beforeEach(async () => {
    // Create temporary test directory
    testRoot = path.join(TEST_DIR, `test-${Date.now()}`);
    await fs.mkdir(testRoot, { recursive: true });
    validator = new MarkdownLinkValidator(testRoot);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Link Detection', () => {
    it('should detect standard markdown links', async () => {
      const content = `# Test\n\nSee [documentation](docs/guide.md) for details.`;
      const links = validator.findMarkdownLinks(content);

      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        text: 'documentation',
        target: 'docs/guide.md',
        line: 3
      });
    });

    it('should detect links with anchors', async () => {
      const content = `See [section](file.md#anchor) for details.`;
      const links = validator.findMarkdownLinks(content);

      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        text: 'section',
        target: 'file.md#anchor',
        line: 1
      });
    });

    it('should detect image links', async () => {
      const content = `![diagram](images/architecture.png)`;
      const links = validator.findMarkdownLinks(content);

      // Images should be detected but skipped in validation
      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('images/architecture.png');
    });

    it('should skip HTTP/HTTPS URLs', async () => {
      const content = `See [docs](https://example.com) and [API](http://api.example.com)`;
      const links = validator.findMarkdownLinks(content);

      // URLs should be detected but marked as external
      const fileLinks = links.filter(l => !validator.isExternalUrl(l.target));
      expect(fileLinks).toHaveLength(0);
    });

    it('should skip anchor-only links', async () => {
      const content = `Jump to [section](#overview)`;
      const links = validator.findMarkdownLinks(content);

      const fileLinks = links.filter(l => !l.target.startsWith('#'));
      expect(fileLinks).toHaveLength(0);
    });

    it('should skip placeholder paths', async () => {
      const content = `Link to [file](path) or [resource](url)`;
      const links = validator.findMarkdownLinks(content);

      const realLinks = links.filter(l => !validator.isPlaceholder(l.target));
      expect(realLinks).toHaveLength(0);
    });

    it('should detect multiple links on same line', async () => {
      const content = `See [doc1](file1.md) and [doc2](file2.md)`;
      const links = validator.findMarkdownLinks(content);

      expect(links).toHaveLength(2);
      expect(links[0].target).toBe('file1.md');
      expect(links[1].target).toBe('file2.md');
    });
  });

  describe('Broken Link Detection', () => {
    it('should validate existing file links', async () => {
      // Create test files
      const sourceFile = path.join(testRoot, 'source.md');
      const targetFile = path.join(testRoot, 'target.md');

      await fs.writeFile(targetFile, '# Target');
      await fs.writeFile(sourceFile, '[target file](target.md)');

      const result = await validator.validateFile(sourceFile);

      expect(result.brokenLinks).toHaveLength(0);
    });

    it('should detect missing file links', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      await fs.writeFile(sourceFile, '[missing file](missing.md)');

      const result = await validator.validateFile(sourceFile);

      expect(result.brokenLinks).toHaveLength(1);
      expect(result.brokenLinks[0]).toMatchObject({
        linkText: 'missing file',
        target: 'missing.md',
        reason: expect.stringContaining('not found')
      });
    });

    it('should handle relative paths correctly', async () => {
      // Create directory structure
      const docsDir = path.join(testRoot, 'docs');
      await fs.mkdir(docsDir);

      const sourceFile = path.join(testRoot, 'source.md');
      const targetFile = path.join(docsDir, 'guide.md');

      await fs.writeFile(targetFile, '# Guide');
      await fs.writeFile(sourceFile, '[guide](docs/guide.md)');

      const result = await validator.validateFile(sourceFile);

      expect(result.brokenLinks).toHaveLength(0);
    });

    it('should handle parent directory references', async () => {
      // Create directory structure
      const docsDir = path.join(testRoot, 'docs');
      await fs.mkdir(docsDir);

      const sourceFile = path.join(docsDir, 'guide.md');
      const targetFile = path.join(testRoot, 'readme.md');

      await fs.writeFile(targetFile, '# README');
      await fs.writeFile(sourceFile, '[readme](../readme.md)');

      const result = await validator.validateFile(sourceFile);

      expect(result.brokenLinks).toHaveLength(0);
    });

    it('should handle absolute paths from project root', async () => {
      const docsDir = path.join(testRoot, 'docs');
      await fs.mkdir(docsDir);

      const sourceFile = path.join(testRoot, 'source.md');
      const targetFile = path.join(docsDir, 'guide.md');

      await fs.writeFile(targetFile, '# Guide');
      await fs.writeFile(sourceFile, '[guide](/docs/guide.md)');

      const result = await validator.validateFile(sourceFile);

      expect(result.brokenLinks).toHaveLength(0);
    });

    it('should strip anchors before checking file existence', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      const targetFile = path.join(testRoot, 'target.md');

      await fs.writeFile(targetFile, '# Target\n\n## Section');
      await fs.writeFile(sourceFile, '[link](target.md#section)');

      const result = await validator.validateFile(sourceFile);

      // File exists, so no broken link (anchor validation is optional for MVP)
      expect(result.brokenLinks).toHaveLength(0);
    });

    it('should skip image files from broken link detection', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      await fs.writeFile(sourceFile, '![image](missing.png)');

      const result = await validator.validateFile(sourceFile);

      // Images are not validated (MVP)
      expect(result.brokenLinks).toHaveLength(0);
    });
  });

  describe('Anti-Pattern Detection', () => {
    it('should detect backticked paths', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      const content = 'See `ai/agents/architect.md` for details.';
      await fs.writeFile(sourceFile, content);

      const result = await validator.validateFile(sourceFile);

      expect(result.antiPatterns).toHaveLength(1);
      expect(result.antiPatterns[0]).toMatchObject({
        patternType: 'backticked_path',
        line: 1,
        suggestion: expect.stringContaining('[ai/agents/architect.md](ai/agents/architect.md)')
      });
    });

    it('should not flag bare backticked filenames without a separator', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      const content = 'Files include `SKILL.md`, `EXAMPLES.md`, and `PATTERNS.md`.';
      await fs.writeFile(sourceFile, content);

      const result = await validator.validateFile(sourceFile);

      expect(result.antiPatterns).toHaveLength(0);
    });

    it('should skip template patterns in backticks', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      const content = 'Create files like `STORY-123.md` or `TASK-456.md`.';
      await fs.writeFile(sourceFile, content);

      const result = await validator.validateFile(sourceFile);

      // Template patterns should be excluded
      expect(result.antiPatterns).toHaveLength(0);
    });

    it('should detect unlinked "See:" references', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      const content = 'See: docs/guide.md';
      await fs.writeFile(sourceFile, content);

      const result = await validator.validateFile(sourceFile);

      expect(result.antiPatterns).toHaveLength(1);
      expect(result.antiPatterns[0]).toMatchObject({
        patternType: 'unlinked_reference',
        line: 1,
        suggestion: expect.stringContaining('See: [docs/guide.md](docs/guide.md)')
      });
    });

    it('should detect plain paths in workflow sections', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      const content = '→ ai/agents/architect.md →';
      await fs.writeFile(sourceFile, content);

      const result = await validator.validateFile(sourceFile);

      expect(result.antiPatterns).toHaveLength(1);
      expect(result.antiPatterns[0]).toMatchObject({
        patternType: 'plain_path_in_workflow',
        line: 1,
        suggestion: expect.stringContaining('[ai/agents/architect.md](ai/agents/architect.md)')
      });
    });

    it('should skip anti-patterns in code blocks', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      const content = '```\nSee `ai/agents/file.md` and ai/agents/other.md\n```';
      await fs.writeFile(sourceFile, content);

      const result = await validator.validateFile(sourceFile);

      // Code blocks should be skipped
      expect(result.antiPatterns).toHaveLength(0);
    });

    it('should detect multiple anti-patterns on same line', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      const content = 'See `dir/file1.md` and `other/file2.md`';
      await fs.writeFile(sourceFile, content);

      const result = await validator.validateFile(sourceFile);

      expect(result.antiPatterns.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Two-Tier Strictness', () => {
    it('should identify framework core files', async () => {
      const commandsDir = path.join(testRoot, '.claude', 'commands');
      await fs.mkdir(commandsDir, { recursive: true });

      const frameworkFile = path.join(commandsDir, 'architect.md');
      await fs.writeFile(frameworkFile, '# Architect');

      expect(validator.isFrameworkFile(frameworkFile)).toBe(true);
    });

    it('should identify framework root files', async () => {
      const claudeFile = path.join(testRoot, 'CLAUDE.md');
      await fs.writeFile(claudeFile, '# Framework');

      expect(validator.isFrameworkFile(claudeFile)).toBe(true);
    });

    it('should identify content files as non-framework', async () => {
      const backlogDir = path.join(testRoot, 'backlog', 'tickets');
      await fs.mkdir(backlogDir, { recursive: true });

      const contentFile = path.join(backlogDir, 'ticket-001.md');
      await fs.writeFile(contentFile, '# Ticket');

      expect(validator.isFrameworkFile(contentFile)).toBe(false);
    });

    it('should return different exit codes for framework vs content files', async () => {
      // Framework file with error
      const commandsDir = path.join(testRoot, '.claude', 'commands');
      await fs.mkdir(commandsDir, { recursive: true });
      const frameworkFile = path.join(commandsDir, 'test.md');
      await fs.writeFile(frameworkFile, '[broken](missing.md)');

      // Content file with error
      const backlogDir = path.join(testRoot, 'backlog', 'tickets');
      await fs.mkdir(backlogDir, { recursive: true });
      const contentFile = path.join(backlogDir, 'test.md');
      await fs.writeFile(contentFile, '[broken](missing.md)');

      const frameworkResult = await validator.validateFile(frameworkFile);
      const contentResult = await validator.validateFile(contentFile);

      expect(frameworkResult.isFrameworkFile).toBe(true);
      expect(contentResult.isFrameworkFile).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files', async () => {
      const sourceFile = path.join(testRoot, 'empty.md');
      await fs.writeFile(sourceFile, '');

      const result = await validator.validateFile(sourceFile);

      expect(result.valid).toBe(true);
      expect(result.brokenLinks).toHaveLength(0);
      expect(result.antiPatterns).toHaveLength(0);
    });

    it('should handle files with no markdown links', async () => {
      const sourceFile = path.join(testRoot, 'plain.md');
      await fs.writeFile(sourceFile, '# Title\n\nJust some text without links.');

      const result = await validator.validateFile(sourceFile);

      expect(result.valid).toBe(true);
      expect(result.brokenLinks).toHaveLength(0);
    });

    it('should handle malformed markdown gracefully', async () => {
      const sourceFile = path.join(testRoot, 'malformed.md');
      await fs.writeFile(sourceFile, '[unclosed link](file.md\n[missing](');

      const result = await validator.validateFile(sourceFile);

      // Should not throw, may find some valid links
      expect(result).toBeDefined();
    });

    it('should handle non-existent source file', async () => {
      const sourceFile = path.join(testRoot, 'nonexistent.md');

      await expect(validator.validateFile(sourceFile)).rejects.toThrow();
    });

    it('should handle files with unicode characters', async () => {
      const sourceFile = path.join(testRoot, 'unicode.md');
      const targetFile = path.join(testRoot, 'target.md');

      await fs.writeFile(targetFile, '# Target');
      await fs.writeFile(sourceFile, '[документация](target.md)');

      const result = await validator.validateFile(sourceFile);

      expect(result.brokenLinks).toHaveLength(0);
    });

    it('should handle very long file paths', async () => {
      const deepDir = path.join(testRoot, 'a', 'b', 'c', 'd', 'e');
      await fs.mkdir(deepDir, { recursive: true });

      const sourceFile = path.join(deepDir, 'source.md');
      const targetFile = path.join(testRoot, 'target.md');

      await fs.writeFile(targetFile, '# Target');
      await fs.writeFile(sourceFile, '[link](../../../../../target.md)');

      const result = await validator.validateFile(sourceFile);

      expect(result.brokenLinks).toHaveLength(0);
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple files', async () => {
      const file1 = path.join(testRoot, 'file1.md');
      const file2 = path.join(testRoot, 'file2.md');

      await fs.writeFile(file1, '[valid](file2.md)');
      await fs.writeFile(file2, '[broken](missing.md)');

      const result = await validator.validateMarkdownLinks([file1, file2]);

      expect(result.filesChecked).toBe(2);
      expect(result.linksChecked).toBeGreaterThanOrEqual(2);
      expect(result.brokenLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('should aggregate statistics correctly', async () => {
      const file1 = path.join(testRoot, 'file1.md');
      const file2 = path.join(testRoot, 'file2.md');
      const file3 = path.join(testRoot, 'file3.md');

      await fs.writeFile(file3, '# Target');
      await fs.writeFile(file1, '[link](file3.md)');
      await fs.writeFile(file2, '[broken](missing.md)');

      const result = await validator.validateMarkdownLinks([file1, file2]);

      expect(result.filesChecked).toBe(2);
      expect(result.valid).toBe(false);
      expect(result.brokenLinks.length).toBe(1);
    });

    it('should handle empty file list', async () => {
      const result = await validator.validateMarkdownLinks([]);

      expect(result.filesChecked).toBe(0);
      expect(result.valid).toBe(true);
      expect(result.brokenLinks).toHaveLength(0);
    });
  });

  describe('Link Statistics', () => {
    it('should count links correctly', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      const targetFile = path.join(testRoot, 'target.md');

      await fs.writeFile(targetFile, '# Target');
      await fs.writeFile(sourceFile, `
# Test
[link1](target.md)
[link2](target.md#section)
[external](https://example.com)
      `.trim());

      const result = await validator.validateFile(sourceFile);

      expect(result.linksChecked).toBeGreaterThanOrEqual(2); // file links only
    });

    it('should provide comprehensive validation results', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      await fs.writeFile(sourceFile, `
# Test
[broken](missing.md)
See \`ai/agents/file.md\` for details.
      `.trim());

      // Use validateMarkdownLinks for comprehensive results
      const result = await validator.validateMarkdownLinks([sourceFile]);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('brokenLinks');
      expect(result).toHaveProperty('antiPatterns');
      expect(result).toHaveProperty('filesChecked');
      expect(result).toHaveProperty('linksChecked');

      expect(result.valid).toBe(false);
      expect(result.brokenLinks.length).toBeGreaterThan(0);
      expect(result.antiPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Path Resolution Edge Cases', () => {
    it('should handle paths with spaces', async () => {
      const dirWithSpaces = path.join(testRoot, 'my docs');
      await fs.mkdir(dirWithSpaces);

      const sourceFile = path.join(testRoot, 'source.md');
      const targetFile = path.join(dirWithSpaces, 'guide.md');

      await fs.writeFile(targetFile, '# Guide');
      await fs.writeFile(sourceFile, '[guide](my%20docs/guide.md)'); // URL-encoded

      const result = await validator.validateFile(sourceFile);

      // Should handle URL-encoded spaces
      expect(result.brokenLinks.length).toBe(0);
    });

    it('should handle case-sensitive filesystems', async () => {
      const sourceFile = path.join(testRoot, 'source.md');
      const targetFile = path.join(testRoot, 'Target.md');

      await fs.writeFile(targetFile, '# Target');
      await fs.writeFile(sourceFile, '[target file](target.md)'); // lowercase

      const result = await validator.validateFile(sourceFile);

      // On case-insensitive systems (macOS), this passes
      // On case-sensitive systems (Linux), this fails
      // Test should adapt to system
      const isCaseSensitive = process.platform === 'linux';
      if (isCaseSensitive) {
        expect(result.brokenLinks.length).toBe(1);
      }
    });
  });

  describe('Anti-Pattern Template Exclusions', () => {
    const templatePatterns = [
      'STORY-123.md',
      'TASK-456.md',
      'BUG-789.md',
      'SPIKE-001.md',
      'EPIC-001.md',
      '0001-ticket.md',
      'YYYY-WNN.md',
      'DAPM-XXXX.md',
      '[TYPE]-description.md',
      '{placeholder}.md',
      'executive-summary-template.md',
      'DEVELOPMENT-GUIDE.md',
      'report-2025-10.md',
      'status-2025W43.md',
      'README.md'
    ];

    templatePatterns.forEach(pattern => {
      it(`should skip template pattern: ${pattern}`, async () => {
        const sourceFile = path.join(testRoot, 'source.md');
        const content = `See \`${pattern}\` for details.`;
        await fs.writeFile(sourceFile, content);

        const result = await validator.validateFile(sourceFile);

        expect(result.antiPatterns).toHaveLength(0);
      });
    });
  });
});
