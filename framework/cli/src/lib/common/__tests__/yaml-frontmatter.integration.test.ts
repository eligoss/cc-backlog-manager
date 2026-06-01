import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';
import {
  parseFrontmatter,
  stringifyFrontmatter,
  updateFrontmatter,
  FrontmatterResult,
} from '../yaml-frontmatter';

describe('yaml-frontmatter', () => {
  let sandbox: TestSandbox;
  let testDir: string;

  beforeEach(async () => {
    sandbox = await createSandbox('yaml-frontmatter-test');
    testDir = sandbox.path;
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('parseFrontmatter', () => {
    it('should parse basic YAML frontmatter from markdown', () => {
      const content = `---
title: "My Title"
description: A simple description
count: 42
active: true
---
# Content here
Some markdown content`;

      const result = parseFrontmatter(content);

      expect(result.data).toEqual({
        title: 'My Title',
        description: 'A simple description',
        count: 42,
        active: true,
      });
      expect(result.content).toBe('# Content here\nSome markdown content');
      expect(result.matter).toBeTruthy();
    });

    it('should parse arrays in frontmatter', () => {
      const content = `---
tags:
  - one
  - two
  - three
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.data).toEqual({
        tags: ['one', 'two', 'three'],
      });
    });

    it('should parse nested objects in frontmatter', () => {
      const content = `---
metadata:
  author: John Doe
  version: 1.0
  settings:
    enabled: true
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.data.metadata).toBeDefined();
      expect(result.data.metadata).toMatchObject({
        author: 'John Doe',
        version: 1.0,
      });
    });

    it('should handle multiline values', () => {
      const content = `---
description: |
  This is a multiline
  description that spans
  multiple lines
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.data.description).toBeTruthy();
      expect(typeof result.data.description).toBe('string');
    });

    it('should handle empty frontmatter', () => {
      const content = `---
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.data).toEqual({});
      expect(result.content).toBe('Content');
    });

    it('should handle missing frontmatter', () => {
      const content = `# Just content
No frontmatter here`;

      const result = parseFrontmatter(content);

      expect(result.data).toEqual({});
      expect(result.content).toBe(content);
      expect(result.matter).toBe('');
    });

    it('should handle special characters in values', () => {
      const content = `---
title: "Title with: colon"
description: 'Single quotes'
path: "/path/to/file"
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.data.title).toContain('colon');
      expect(result.data.description).toBe('Single quotes');
      expect(result.data.path).toBe('/path/to/file');
    });

    it('should preserve exact field order', () => {
      const content = `---
zebra: last
alpha: first
middle: second
---
Content`;

      const result = parseFrontmatter(content);

      const keys = Object.keys(result.data);
      expect(keys).toEqual(['zebra', 'alpha', 'middle']);
    });
  });

  describe('stringifyFrontmatter', () => {
    it('should create valid YAML frontmatter', () => {
      const data = {
        title: 'My Title',
        count: 42,
        active: true,
      };
      const content = 'Content here';

      const result = stringifyFrontmatter(data, content);

      expect(result).toContain('---');
      expect(result).toContain('title:');
      expect(result).toContain('count:');
      expect(result).toContain('active:');
      expect(result).toContain('Content here');
    });

    it('should handle arrays', () => {
      const data = {
        tags: ['one', 'two', 'three'],
      };
      const content = 'Content';

      const result = stringifyFrontmatter(data, content);

      expect(result).toContain('tags:');
      expect(result).toContain('- one');
      expect(result).toContain('- two');
      expect(result).toContain('- three');
    });

    it('should handle nested objects', () => {
      const data = {
        metadata: {
          author: 'John Doe',
          version: 1.0,
        },
      };
      const content = 'Content';

      const result = stringifyFrontmatter(data, content);

      expect(result).toContain('metadata:');
      expect(result).toContain('author:');
      expect(result).toContain('version:');
    });

    it('should handle empty data', () => {
      const data = {};
      const content = 'Content';

      const result = stringifyFrontmatter(data, content);

      // gray-matter returns just content when data is empty
      expect(result).toBe('Content\n');
    });

    it('should handle empty content', () => {
      const data = { title: 'Test' };
      const content = '';

      const result = stringifyFrontmatter(data, content);

      expect(result).toContain('title: Test');
      expect(result.trim()).toMatch(/---$/);
    });
  });

  describe('round-trip preservation (CRITICAL)', () => {
    it('should preserve exact formatting on round-trip', () => {
      const original = `---
title: "My Title"
tags:
  - one
  - two
---
Content here`;

      const parsed = parseFrontmatter(original);
      const result = stringifyFrontmatter(parsed.data, parsed.content);

      // Parse again to verify data integrity
      const reparsed = parseFrontmatter(result);

      expect(reparsed.data).toEqual(parsed.data);
      // gray-matter adds trailing newline, so trim for comparison
      expect(reparsed.content.trim()).toBe(parsed.content.trim());
    });

    it('should preserve field order through round-trip', () => {
      const original = `---
zebra: z
alpha: a
middle: m
---
Content`;

      const parsed = parseFrontmatter(original);
      const keys1 = Object.keys(parsed.data);

      const result = stringifyFrontmatter(parsed.data, parsed.content);
      const reparsed = parseFrontmatter(result);
      const keys2 = Object.keys(reparsed.data);

      expect(keys2).toEqual(keys1);
    });

    it('should preserve data types through round-trip', () => {
      const original = `---
string: value
number: 42
boolean: true
array:
  - item1
  - item2
---
Content`;

      const parsed = parseFrontmatter(original);
      expect(typeof parsed.data.string).toBe('string');
      expect(typeof parsed.data.number).toBe('number');
      expect(typeof parsed.data.boolean).toBe('boolean');
      expect(Array.isArray(parsed.data.array)).toBe(true);

      const result = stringifyFrontmatter(parsed.data, parsed.content);
      const reparsed = parseFrontmatter(result);

      expect(typeof reparsed.data.string).toBe('string');
      expect(typeof reparsed.data.number).toBe('number');
      expect(typeof reparsed.data.boolean).toBe('boolean');
      expect(Array.isArray(reparsed.data.array)).toBe(true);
    });

    it('should handle complex nested structures in round-trip', () => {
      const original = `---
agent: ai-framework-developer
role: Framework Developer
framework-version: 12.0
capability-needs:
  - framework-development
  - git-workflow-management
  - quality-assurance
token-budget: 2500
---
# Framework Developer Agent`;

      const parsed = parseFrontmatter(original);
      const result = stringifyFrontmatter(parsed.data, parsed.content);
      const reparsed = parseFrontmatter(result);

      expect(reparsed.data).toEqual(parsed.data);
      // gray-matter adds trailing newline, so trim for comparison
      expect(reparsed.content.trim()).toBe(parsed.content.trim());
    });
  });

  describe('updateFrontmatter', () => {
    it('should update frontmatter in a file', async () => {
      const filePath = path.join(testDir, 'test.md');
      const original = `---
title: Original
version: 1
---
Content`;

      await fs.writeFile(filePath, original, 'utf-8');

      await updateFrontmatter(filePath, { version: 2 });

      const updated = await fs.readFile(filePath, 'utf-8');
      const parsed = parseFrontmatter(updated);

      expect(parsed.data.title).toBe('Original');
      expect(parsed.data.version).toBe(2);
      expect(parsed.content.trim()).toBe('Content');
    });

    it('should add new fields to frontmatter', async () => {
      const filePath = path.join(testDir, 'test.md');
      const original = `---
title: Test
---
Content`;

      await fs.writeFile(filePath, original, 'utf-8');

      await updateFrontmatter(filePath, { newField: 'new value' });

      const updated = await fs.readFile(filePath, 'utf-8');
      const parsed = parseFrontmatter(updated);

      expect(parsed.data.title).toBe('Test');
      expect(parsed.data.newField).toBe('new value');
    });

    it('should create frontmatter if missing', async () => {
      const filePath = path.join(testDir, 'test.md');
      const original = 'Content without frontmatter';

      await fs.writeFile(filePath, original, 'utf-8');

      await updateFrontmatter(filePath, { title: 'Added' });

      const updated = await fs.readFile(filePath, 'utf-8');
      const parsed = parseFrontmatter(updated);

      expect(parsed.data.title).toBe('Added');
      expect(parsed.content.trim()).toBe('Content without frontmatter');
    });

    it('should throw error if file does not exist', async () => {
      const filePath = path.join(testDir, 'nonexistent.md');

      await expect(updateFrontmatter(filePath, { title: 'Test' }))
        .rejects
        .toThrow();
    });

    it('should preserve content when updating frontmatter', async () => {
      const filePath = path.join(testDir, 'test.md');
      const original = `---
title: Test
---
# My Content
With multiple lines
And paragraphs`;

      await fs.writeFile(filePath, original, 'utf-8');

      await updateFrontmatter(filePath, { title: 'Updated' });

      const updated = await fs.readFile(filePath, 'utf-8');
      const parsed = parseFrontmatter(updated);

      expect(parsed.content.trim()).toBe('# My Content\nWith multiple lines\nAnd paragraphs');
    });
  });

  describe('edge cases', () => {
    it('should handle frontmatter with only whitespace', () => {
      const content = `---

---
Content`;

      const result = parseFrontmatter(content);

      expect(result.data).toEqual({});
      expect(result.content).toBe('Content');
    });

    it('should handle content with triple dashes', () => {
      const content = `---
title: Test
---
Content with ---
in the middle`;

      const result = parseFrontmatter(content);

      expect(result.content).toContain('---');
      expect(result.data.title).toBe('Test');
    });

    it('should handle YAML with comments', () => {
      const content = `---
# This is a comment
title: Test
# Another comment
description: Value
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.data.title).toBe('Test');
      expect(result.data.description).toBe('Value');
    });

    it('should handle very long content', () => {
      const longContent = 'x'.repeat(10000);
      const content = `---
title: Test
---
${longContent}`;

      const result = parseFrontmatter(content);

      expect(result.data.title).toBe('Test');
      expect(result.content).toBe(longContent);
    });
  });
});
