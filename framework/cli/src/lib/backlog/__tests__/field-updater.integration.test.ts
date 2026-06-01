/**
 * Field Updater Tests
 *
 * Ported from Python:
 * - modules/backlog/src/backlog/update_milestones_remove_field.py
 * - modules/backlog/src/backlog/update_tickets_remove_milestone_field.py
 *
 * Tests the field update utilities that add/remove/update frontmatter fields
 * in markdown files with YAML frontmatter.
 *
 * Capabilities:
 * 1. Remove fields from frontmatter
 * 2. Add fields to frontmatter
 * 3. Update existing fields
 * 4. Bulk operations with dry-run support
 * 5. Preserve file content and other frontmatter
 */

import { removeField, addField, updateField, bulkUpdateFiles, FieldUpdateResult } from '../field-updater';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';

describe('Field Updater', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    // Create a temporary directory for test files
    sandbox = await createSandbox('field-updater-test');
  });

  afterEach(async () => {
    // Clean up temporary directory
    await sandbox.cleanup();
  });

  describe('removeField', () => {
    it('should remove field from frontmatter', () => {
      const content = `---
title: Test Document
milestone: UC1-MVP
status: active
---
# Content here`;

      const result = removeField(content, 'milestone');

      expect(result.modified).toBe(true);
      expect(result.content).toContain('title: Test Document');
      expect(result.content).toContain('status: active');
      expect(result.content).not.toContain('milestone:');
      expect(result.content).toContain('# Content here');
    });

    it('should preserve other fields when removing', () => {
      const content = `---
title: Test
tags:
  - tag1
  - tag2
milestone: UC1
version: 1.0
---
Content`;

      const result = removeField(content, 'milestone');

      expect(result.modified).toBe(true);
      expect(result.content).toContain('title: Test');
      expect(result.content).toContain('tags:');
      expect(result.content).toContain('- tag1');
      expect(result.content).toContain('- tag2');
      expect(result.content).toMatch(/version:\s+(1\.0|1)/); // gray-matter may convert to number
      expect(result.content).not.toContain('milestone:');
    });

    it('should handle missing field gracefully', () => {
      const content = `---
title: Test
status: active
---
Content`;

      const result = removeField(content, 'milestone');

      expect(result.modified).toBe(false);
      expect(result.content).toBe(content);
    });

    it('should preserve markdown content after frontmatter', () => {
      const content = `---
title: Test
milestone: UC1
---
# Heading

Some **bold** text and [links](http://example.com).

- List item 1
- List item 2`;

      const result = removeField(content, 'milestone');

      expect(result.modified).toBe(true);
      expect(result.content).toContain('# Heading');
      expect(result.content).toContain('Some **bold** text');
      expect(result.content).toContain('- List item 1');
    });

    it('should handle files without frontmatter', () => {
      const content = `# Just Content

No frontmatter here.`;

      const result = removeField(content, 'milestone');

      expect(result.modified).toBe(false);
      expect(result.content).toBe(content);
    });

    it('should handle empty string', () => {
      const result = removeField('', 'milestone');

      expect(result.modified).toBe(false);
      expect(result.content).toBe('');
    });
  });

  describe('addField', () => {
    it('should add new field to frontmatter', () => {
      const content = `---
title: Test
---
Content`;

      const result = addField(content, 'status', 'active');

      expect(result.modified).toBe(true);
      expect(result.content).toContain('title: Test');
      expect(result.content).toContain('status: active');
      expect(result.content).toContain('Content');
    });

    it('should not overwrite existing field by default', () => {
      const content = `---
title: Test
status: pending
---
Content`;

      const result = addField(content, 'status', 'active');

      expect(result.modified).toBe(false);
      expect(result.content).toContain('status: pending');
      expect(result.content).not.toContain('status: active');
    });

    it('should overwrite existing field when force is true', () => {
      const content = `---
title: Test
status: pending
---
Content`;

      const result = addField(content, 'status', 'active', true);

      expect(result.modified).toBe(true);
      expect(result.content).toContain('status: active');
      expect(result.content).not.toContain('status: pending');
    });

    it('should create frontmatter if missing', () => {
      const content = `# Just Content

No frontmatter.`;

      const result = addField(content, 'status', 'active');

      expect(result.modified).toBe(true);
      expect(result.content).toContain('---');
      expect(result.content).toContain('status: active');
      expect(result.content).toContain('# Just Content');
    });

    it('should handle complex field values', () => {
      const content = `---
title: Test
---
Content`;

      const result = addField(content, 'tags', ['tag1', 'tag2']);

      expect(result.modified).toBe(true);
      expect(result.content).toContain('tags:');
      expect(result.content).toContain('- tag1');
      expect(result.content).toContain('- tag2');
    });

    it('should handle null and undefined values', () => {
      const content = `---
title: Test
---
Content`;

      const result = addField(content, 'optional', null);

      expect(result.modified).toBe(true);
      expect(result.content).toContain('optional: null');
    });
  });

  describe('updateField', () => {
    it('should update existing field', () => {
      const content = `---
title: Test
status: pending
---
Content`;

      const result = updateField(content, 'status', 'active');

      expect(result.modified).toBe(true);
      expect(result.content).toContain('status: active');
      expect(result.content).not.toContain('status: pending');
    });

    it('should add field if not exists', () => {
      const content = `---
title: Test
---
Content`;

      const result = updateField(content, 'status', 'active');

      expect(result.modified).toBe(true);
      expect(result.content).toContain('status: active');
    });

    it('should preserve other fields', () => {
      const content = `---
title: Test
version: 1.0
status: pending
tags:
  - one
  - two
---
Content`;

      const result = updateField(content, 'status', 'active');

      expect(result.modified).toBe(true);
      expect(result.content).toContain('title: Test');
      expect(result.content).toMatch(/version:\s+(1\.0|1)/); // gray-matter may convert to number
      expect(result.content).toContain('tags:');
      expect(result.content).toContain('- one');
      expect(result.content).toContain('status: active');
    });
  });

  describe('bulkUpdateFiles', () => {
    it('should update all matching files', async () => {
      // Create test files
      const file1 = path.join(sandbox.path, 'test1.md');
      const file2 = path.join(sandbox.path, 'test2.md');
      const file3 = path.join(sandbox.path, 'test3.md');

      await fs.writeFile(file1, `---
title: Test 1
milestone: UC1
---
Content 1`);

      await fs.writeFile(file2, `---
title: Test 2
milestone: UC2
---
Content 2`);

      await fs.writeFile(file3, `---
title: Test 3
status: active
---
Content 3`);

      const results = await bulkUpdateFiles(
        [file1, file2, file3],
        { remove: ['milestone'] },
        { dryRun: false }
      );

      expect(results.totalFiles).toBe(3);
      expect(results.modifiedFiles).toBe(2);
      expect(results.skippedFiles).toBe(1);
      expect(results.errors).toHaveLength(0);

      // Verify files were updated
      const content1 = await fs.readFile(file1, 'utf-8');
      const content2 = await fs.readFile(file2, 'utf-8');
      const content3 = await fs.readFile(file3, 'utf-8');

      expect(content1).not.toContain('milestone:');
      expect(content2).not.toContain('milestone:');
      expect(content3).toContain('status: active');
    });

    it('should support dry-run mode', async () => {
      const file1 = path.join(sandbox.path, 'test1.md');
      const originalContent = `---
title: Test
milestone: UC1
---
Content`;

      await fs.writeFile(file1, originalContent);

      const results = await bulkUpdateFiles(
        [file1],
        { remove: ['milestone'] },
        { dryRun: true }
      );

      expect(results.totalFiles).toBe(1);
      expect(results.modifiedFiles).toBe(1);
      expect(results.errors).toHaveLength(0);

      // Verify file was NOT modified
      const content = await fs.readFile(file1, 'utf-8');
      expect(content).toBe(originalContent);
    });

    it('should report changes made', async () => {
      const file1 = path.join(sandbox.path, 'test1.md');
      await fs.writeFile(file1, `---
title: Test
milestone: UC1
---
Content`);

      const results = await bulkUpdateFiles(
        [file1],
        { remove: ['milestone'] },
        { dryRun: false }
      );

      expect(results.changes).toHaveLength(1);
      expect(results.changes[0].file).toBe(file1);
      expect(results.changes[0].modified).toBe(true);
      expect(results.changes[0].operations).toContain('remove:milestone');
    });

    it('should handle multiple operations', async () => {
      const file1 = path.join(sandbox.path, 'test1.md');
      await fs.writeFile(file1, `---
title: Test
milestone: UC1
---
Content`);

      const results = await bulkUpdateFiles(
        [file1],
        {
          remove: ['milestone'],
          add: { status: 'active' },
          update: { version: '2.0' }
        },
        { dryRun: false }
      );

      expect(results.modifiedFiles).toBe(1);

      const content = await fs.readFile(file1, 'utf-8');
      expect(content).not.toContain('milestone:');
      expect(content).toContain('status: active');
      // gray-matter uses single quotes for strings
      expect(content).toMatch(/version:\s+['"]2\.0['"]/);
    });

    it('should handle errors gracefully', async () => {
      const nonExistentFile = path.join(sandbox.path, 'missing.md');

      const results = await bulkUpdateFiles(
        [nonExistentFile],
        { remove: ['milestone'] },
        { dryRun: false }
      );

      expect(results.totalFiles).toBe(1);
      expect(results.modifiedFiles).toBe(0);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain('missing.md');
    });

    it('should skip files with no changes needed', async () => {
      const file1 = path.join(sandbox.path, 'test1.md');
      await fs.writeFile(file1, `---
title: Test
status: active
---
Content`);

      const results = await bulkUpdateFiles(
        [file1],
        { remove: ['milestone'] },
        { dryRun: false }
      );

      expect(results.totalFiles).toBe(1);
      expect(results.modifiedFiles).toBe(0);
      expect(results.skippedFiles).toBe(1);
    });

    it('should support glob patterns', async () => {
      // Create nested directory structure
      const ticketsDir = path.join(sandbox.path, 'tickets');
      const featuresDir = path.join(ticketsDir, 'features');
      const bugsDir = path.join(ticketsDir, 'bugs');

      await fs.ensureDir(featuresDir);
      await fs.ensureDir(bugsDir);

      await fs.writeFile(path.join(featuresDir, 'feature1.md'), `---
title: Feature 1
milestone: UC1
---
Content`);

      await fs.writeFile(path.join(bugsDir, 'bug1.md'), `---
title: Bug 1
milestone: UC1
---
Content`);

      const glob = require('fast-glob');
      const files = await glob('**/*.md', { cwd: sandbox.path, absolute: true });

      const results = await bulkUpdateFiles(
        files,
        { remove: ['milestone'] },
        { dryRun: false }
      );

      expect(results.totalFiles).toBe(2);
      expect(results.modifiedFiles).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle CRLF line endings', () => {
      const content = `---\r\ntitle: Test\r\nmilestone: UC1\r\n---\r\nContent`;

      const result = removeField(content, 'milestone');

      expect(result.modified).toBe(true);
      expect(result.content).not.toContain('milestone:');
    });

    it('should handle files with only frontmatter', () => {
      const content = `---
title: Test
milestone: UC1
---`;

      const result = removeField(content, 'milestone');

      expect(result.modified).toBe(true);
      expect(result.content).toContain('title: Test');
      expect(result.content).not.toContain('milestone:');
    });

    it('should handle malformed frontmatter gracefully', () => {
      const content = `---
title: Test
milestone UC1 (missing colon)
---
Content`;

      // Should not crash, just return unmodified
      const result = removeField(content, 'milestone');

      // gray-matter is forgiving and should still parse this
      expect(result.modified).toBe(false);
    });
  });
});
