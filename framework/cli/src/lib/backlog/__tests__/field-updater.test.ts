/**
 * Unit Tests for Field Updater
 *
 * Tests frontmatter field operations and bulk updates.
 */

import glob from 'fast-glob';
import { removeField, addField, updateField, bulkUpdateFiles, findFiles } from '../field-updater.js';
import {
  parseFrontmatter,
  stringifyFrontmatter,
} from '../../common/yaml-frontmatter.js';
import { safeRead, safeWrite } from '../../common/file-utils.js';

// Mock dependencies
jest.mock('fast-glob');
jest.mock('../../common/yaml-frontmatter.js');
jest.mock('../../common/file-utils.js');

const mockedGlob = glob as jest.MockedFunction<typeof glob>;
const mockedParseFrontmatter = parseFrontmatter as jest.MockedFunction<
  typeof parseFrontmatter
>;
const mockedStringifyFrontmatter = stringifyFrontmatter as jest.MockedFunction<
  typeof stringifyFrontmatter
>;
const mockedSafeRead = safeRead as jest.MockedFunction<typeof safeRead>;
const mockedSafeWrite = safeWrite as jest.MockedFunction<typeof safeWrite>;

describe('field-updater', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('removeField', () => {
    it('should remove existing field from frontmatter', () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test', milestone: 'UC1', status: 'active' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue(
        '---\ntitle: Test\nstatus: active\n---\n# Content'
      );

      const result = removeField('---\ntitle: Test\nmilestone: UC1\n---\n# Content', 'milestone');

      expect(result.modified).toBe(true);
      expect(mockedStringifyFrontmatter).toHaveBeenCalledWith(
        { title: 'Test', status: 'active' },
        '# Content'
      );
    });

    it('should return unmodified when field does not exist', () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test' },
        content: '# Content',
        matter: '',
      });

      const content = '---\ntitle: Test\n---\n# Content';
      const result = removeField(content, 'nonexistent');

      expect(result.modified).toBe(false);
      expect(result.content).toBe(content);
      expect(mockedStringifyFrontmatter).not.toHaveBeenCalled();
    });

    it('should return unmodified for empty content', () => {
      const result = removeField('', 'field');

      expect(result.modified).toBe(false);
      expect(result.content).toBe('');
    });

    it('should return unmodified for whitespace-only content', () => {
      const result = removeField('   ', 'field');

      expect(result.modified).toBe(false);
    });

    it('should return unmodified when parsing fails', () => {
      mockedParseFrontmatter.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const content = 'invalid content';
      const result = removeField(content, 'field');

      expect(result.modified).toBe(false);
      expect(result.content).toBe(content);
    });
  });

  describe('addField', () => {
    it('should add new field to frontmatter', () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue(
        '---\ntitle: Test\nstatus: active\n---\n# Content'
      );

      const result = addField('---\ntitle: Test\n---\n# Content', 'status', 'active');

      expect(result.modified).toBe(true);
      expect(mockedStringifyFrontmatter).toHaveBeenCalledWith(
        { title: 'Test', status: 'active' },
        '# Content'
      );
    });

    it('should not overwrite existing field by default', () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test', status: 'existing' },
        content: '# Content',
        matter: '',
      });

      const content = '---\ntitle: Test\nstatus: existing\n---\n# Content';
      const result = addField(content, 'status', 'new');

      expect(result.modified).toBe(false);
      expect(result.content).toBe(content);
    });

    it('should overwrite existing field when force=true', () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test', status: 'existing' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue(
        '---\ntitle: Test\nstatus: new\n---\n# Content'
      );

      const result = addField('---\ntitle: Test\nstatus: existing\n---\n# Content', 'status', 'new', true);

      expect(result.modified).toBe(true);
      expect(mockedStringifyFrontmatter).toHaveBeenCalledWith(
        { title: 'Test', status: 'new' },
        '# Content'
      );
    });

    it('should add field with different value types', () => {
      mockedParseFrontmatter.mockReturnValue({
        data: {},
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockImplementation((data, content) => {
        return `---\n${JSON.stringify(data)}\n---\n${content}`;
      });

      // Number value
      addField('---\n---\n# Content', 'count', 42);
      expect(mockedStringifyFrontmatter).toHaveBeenCalledWith({ count: 42 }, '# Content');

      // Array value
      addField('---\n---\n# Content', 'labels', ['a', 'b']);
      expect(mockedStringifyFrontmatter).toHaveBeenCalledWith(
        { labels: ['a', 'b'] },
        '# Content'
      );

      // Object value
      addField('---\n---\n# Content', 'meta', { key: 'value' });
      expect(mockedStringifyFrontmatter).toHaveBeenCalledWith(
        { meta: { key: 'value' } },
        '# Content'
      );
    });

    it('should create frontmatter when none exists', () => {
      mockedParseFrontmatter.mockImplementation(() => {
        throw new Error('No frontmatter');
      });
      mockedStringifyFrontmatter.mockReturnValue('---\nstatus: active\n---\n# Content');

      const result = addField('# Content', 'status', 'active');

      expect(result.modified).toBe(true);
      expect(mockedStringifyFrontmatter).toHaveBeenCalledWith(
        { status: 'active' },
        '# Content'
      );
    });

    it('should return unmodified when both parsing and stringify fail', () => {
      mockedParseFrontmatter.mockImplementation(() => {
        throw new Error('Parse error');
      });
      mockedStringifyFrontmatter.mockImplementation(() => {
        throw new Error('Stringify error');
      });

      const content = 'invalid';
      const result = addField(content, 'field', 'value');

      expect(result.modified).toBe(false);
      expect(result.content).toBe(content);
    });
  });

  describe('updateField', () => {
    it('should update existing field', () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test', status: 'old' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue(
        '---\ntitle: Test\nstatus: new\n---\n# Content'
      );

      const result = updateField('---\ntitle: Test\nstatus: old\n---\n# Content', 'status', 'new');

      expect(result.modified).toBe(true);
    });

    it('should add field if it does not exist', () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue(
        '---\ntitle: Test\nstatus: active\n---\n# Content'
      );

      const result = updateField('---\ntitle: Test\n---\n# Content', 'status', 'active');

      expect(result.modified).toBe(true);
    });
  });

  describe('bulkUpdateFiles', () => {
    beforeEach(() => {
      mockedSafeRead.mockResolvedValue('---\ntitle: Test\n---\n# Content');
      mockedSafeWrite.mockResolvedValue(undefined);
    });

    it('should process multiple files', async () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test', oldField: 'value' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue('---\ntitle: Test\n---\n# Content');

      const results = await bulkUpdateFiles(
        ['/path/file1.md', '/path/file2.md'],
        { remove: ['oldField'] }
      );

      expect(results.totalFiles).toBe(2);
      expect(results.modifiedFiles).toBe(2);
      expect(mockedSafeWrite).toHaveBeenCalledTimes(2);
    });

    it('should apply remove operations', async () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test', fieldToRemove: 'value' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue('---\ntitle: Test\n---\n# Content');

      const results = await bulkUpdateFiles(
        ['/path/file.md'],
        { remove: ['fieldToRemove'] }
      );

      expect(results.changes[0].operations).toContain('remove:fieldToRemove');
    });

    it('should apply add operations', async () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue('---\ntitle: Test\nstatus: active\n---\n# Content');

      const results = await bulkUpdateFiles(
        ['/path/file.md'],
        { add: { status: 'active' } }
      );

      expect(results.changes[0].operations).toContain('add:status');
    });

    it('should apply update operations', async () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test', version: '1.0' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue('---\ntitle: Test\nversion: 2.0\n---\n# Content');

      const results = await bulkUpdateFiles(
        ['/path/file.md'],
        { update: { version: '2.0' } }
      );

      expect(results.changes[0].operations).toContain('update:version');
    });

    it('should skip files when no changes needed', async () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test' },
        content: '# Content',
        matter: '',
      });

      const results = await bulkUpdateFiles(
        ['/path/file.md'],
        { remove: ['nonexistent'] }
      );

      expect(results.skippedFiles).toBe(1);
      expect(results.modifiedFiles).toBe(0);
      expect(mockedSafeWrite).not.toHaveBeenCalled();
    });

    it('should not write files in dry-run mode', async () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test', fieldToRemove: 'value' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue('---\ntitle: Test\n---\n# Content');

      const results = await bulkUpdateFiles(
        ['/path/file.md'],
        { remove: ['fieldToRemove'] },
        { dryRun: true }
      );

      expect(results.modifiedFiles).toBe(1);
      expect(mockedSafeWrite).not.toHaveBeenCalled();
    });

    it('should handle read errors', async () => {
      mockedSafeRead.mockRejectedValue(new Error('File not found'));

      const results = await bulkUpdateFiles(
        ['/path/missing.md'],
        { remove: ['field'] }
      );

      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain('File not found');
      expect(results.changes[0].error).toContain('File not found');
    });

    it('should apply multiple operations in order', async () => {
      let callOrder = 0;
      const operations: string[] = [];

      // Track operation order through mock calls
      mockedParseFrontmatter.mockImplementation(() => {
        return {
          data: { title: 'Test', oldField: 'value' },
          content: '# Content',
          matter: '',
        };
      });

      mockedStringifyFrontmatter.mockImplementation((data) => {
        if (!('oldField' in data)) {
          operations.push(`remove:${callOrder++}`);
        }
        if ('newField' in data) {
          operations.push(`add:${callOrder++}`);
        }
        if ('updatedField' in data) {
          operations.push(`update:${callOrder++}`);
        }
        return '---\nresult\n---\n# Content';
      });

      await bulkUpdateFiles(
        ['/path/file.md'],
        {
          remove: ['oldField'],
          add: { newField: 'value' },
          update: { updatedField: 'value' },
        }
      );

      // Operations should be applied in order: remove, add, update
      expect(operations[0]).toContain('remove');
    });

    it('should return detailed changes per file', async () => {
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test', old: 'value' },
        content: '# Content',
        matter: '',
      });
      mockedStringifyFrontmatter.mockReturnValue('---\nresult\n---\n# Content');

      const results = await bulkUpdateFiles(
        ['/path/file1.md', '/path/file2.md'],
        { remove: ['old'], add: { new: 'value' } }
      );

      expect(results.changes).toHaveLength(2);
      expect(results.changes[0].file).toBe('/path/file1.md');
      expect(results.changes[0].modified).toBe(true);
      expect(results.changes[0].operations).toContain('remove:old');
      expect(results.changes[0].operations).toContain('add:new');
    });
  });

  describe('findFiles', () => {
    it('should find files matching single pattern', async () => {
      mockedGlob.mockResolvedValue(['/path/file1.md', '/path/file2.md']);

      const files = await findFiles('**/*.md');

      expect(mockedGlob).toHaveBeenCalledWith(
        ['**/*.md'],
        expect.objectContaining({
          absolute: true,
          onlyFiles: true,
        })
      );
      expect(files).toEqual(['/path/file1.md', '/path/file2.md']);
    });

    it('should find files matching multiple patterns', async () => {
      mockedGlob.mockResolvedValue(['/path/file1.md', '/path/file2.yaml']);

      const files = await findFiles(['**/*.md', '**/*.yaml']);

      expect(mockedGlob).toHaveBeenCalledWith(
        ['**/*.md', '**/*.yaml'],
        expect.objectContaining({
          absolute: true,
        })
      );
    });

    it('should use custom cwd', async () => {
      mockedGlob.mockResolvedValue([]);

      await findFiles('**/*.md', '/custom/path');

      expect(mockedGlob).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          cwd: '/custom/path',
        })
      );
    });

    it('should return empty array when no matches', async () => {
      mockedGlob.mockResolvedValue([]);

      const files = await findFiles('**/*.nonexistent');

      expect(files).toEqual([]);
    });
  });
});
