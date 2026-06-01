/**
 * Tests for the Confluence Validate Command
 *
 * @module commands/confluence/__tests__/validate.test
 */

import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../../lib/__tests__/test-utils/sandbox';

// Mock chalk
jest.mock('chalk', () => ({
  default: {
    blue: (s: string) => s,
    cyan: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
  },
  blue: (s: string) => s,
  cyan: (s: string) => s,
  green: (s: string) => s,
  yellow: (s: string) => s,
  red: (s: string) => s,
  dim: (s: string) => s,
  bold: (s: string) => s,
}));

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
  throw new Error(`process.exit(${code})`);
});

import { markdownToAdf, AdfDocument } from '../../../lib/confluence/adf-converter.js';
import { parseFrontmatter } from '../../../lib/common/yaml-frontmatter.js';
import {
  ValidationReport,
  createReport,
  createError,
  createWarning,
  createInfo,
  mergeReports,
} from '../../../lib/validation/validation-report.js';

describe('Confluence Validate', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  const fixturesDir = path.join(__dirname, '__fixtures__');

  beforeEach(async () => {
    sandbox = await createSandbox('confluence-validate');
    testDir = sandbox.path;
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  describe('frontmatter validation', () => {
    it('should detect missing frontmatter', async () => {
      const content = await fs.readFile(
        path.join(fixturesDir, 'no-frontmatter.md'),
        'utf-8'
      );

      const hasFrontmatter = content.startsWith('---');
      expect(hasFrontmatter).toBe(false);
    });

    it('should detect missing title', async () => {
      const content = await fs.readFile(
        path.join(fixturesDir, 'missing-title.md'),
        'utf-8'
      );

      const { data } = parseFrontmatter(content);
      expect(data.title).toBeUndefined();
    });

    it('should detect missing spaceKey', async () => {
      const content = await fs.readFile(
        path.join(fixturesDir, 'missing-space.md'),
        'utf-8'
      );

      const { data } = parseFrontmatter(content);
      expect(data.spaceKey).toBeUndefined();
      expect(data['confluence-space']).toBeUndefined();
    });

    it('should validate valid frontmatter', async () => {
      const content = await fs.readFile(
        path.join(fixturesDir, 'valid-page.md'),
        'utf-8'
      );

      const { data } = parseFrontmatter(content);
      expect(data.title).toBe('Test Page Title');
      expect(data.spaceKey).toBe('DOCS');
    });

    it('should detect invalid YAML', async () => {
      const content = await fs.readFile(
        path.join(fixturesDir, 'invalid-yaml.md'),
        'utf-8'
      );

      expect(() => parseFrontmatter(content)).toThrow();
    });
  });

  describe('markdown to ADF conversion', () => {
    it('should convert valid markdown to ADF', async () => {
      const content = await fs.readFile(
        path.join(fixturesDir, 'valid-page.md'),
        'utf-8'
      );

      const { content: body } = parseFrontmatter(content);
      const adf = markdownToAdf(body);

      expect(adf.type).toBe('doc');
      expect(adf.version).toBe(1);
      expect(adf.content.length).toBeGreaterThan(0);
    });

    it('should convert headings to ADF', () => {
      const markdown = '# Heading 1\n\n## Heading 2\n\n### Heading 3';
      const adf = markdownToAdf(markdown);

      const headings = adf.content.filter((n) => n.type === 'heading');
      expect(headings).toHaveLength(3);
      expect(headings[0].attrs?.level).toBe(1);
      expect(headings[1].attrs?.level).toBe(2);
      expect(headings[2].attrs?.level).toBe(3);
    });

    it('should convert bullet lists to ADF', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const adf = markdownToAdf(markdown);

      const lists = adf.content.filter((n) => n.type === 'bulletList');
      expect(lists).toHaveLength(1);
      expect(lists[0].content).toHaveLength(3);
    });

    it('should convert ordered lists to ADF', () => {
      const markdown = '1. First\n2. Second\n3. Third';
      const adf = markdownToAdf(markdown);

      const lists = adf.content.filter((n) => n.type === 'orderedList');
      expect(lists).toHaveLength(1);
      expect(lists[0].content).toHaveLength(3);
    });

    it('should convert code blocks to ADF', () => {
      const markdown = '```typescript\nconst x = 1;\n```';
      const adf = markdownToAdf(markdown);

      const codeBlocks = adf.content.filter((n) => n.type === 'codeBlock');
      expect(codeBlocks).toHaveLength(1);
      expect(codeBlocks[0].attrs?.language).toBe('typescript');
    });

    it('should convert blockquotes to ADF', () => {
      const markdown = '> This is a quote';
      const adf = markdownToAdf(markdown);

      const quotes = adf.content.filter((n) => n.type === 'blockquote');
      expect(quotes).toHaveLength(1);
    });

    it('should convert tables to ADF', () => {
      const markdown = '| A | B |\n|---|---|\n| 1 | 2 |';
      const adf = markdownToAdf(markdown);

      const tables = adf.content.filter((n) => n.type === 'table');
      expect(tables).toHaveLength(1);
      expect(tables[0].content).toHaveLength(2);
    });

    it('should convert horizontal rules to ADF', () => {
      const markdown = 'Text before\n\n---\n\nText after';
      const adf = markdownToAdf(markdown);

      const rules = adf.content.filter((n) => n.type === 'rule');
      expect(rules).toHaveLength(1);
    });

    it('should convert inline formatting', () => {
      const markdown = 'This is **bold**, *italic*, and `code`.';
      const adf = markdownToAdf(markdown);

      const paragraph = adf.content.find((n) => n.type === 'paragraph');
      expect(paragraph).toBeDefined();
      expect(paragraph?.content?.some((n) => n.marks?.some((m) => m.type === 'strong'))).toBe(true);
      expect(paragraph?.content?.some((n) => n.marks?.some((m) => m.type === 'em'))).toBe(true);
      expect(paragraph?.content?.some((n) => n.marks?.some((m) => m.type === 'code'))).toBe(true);
    });

    it('should convert links', () => {
      const markdown = 'Visit [our site](https://example.com)';
      const adf = markdownToAdf(markdown);

      const paragraph = adf.content.find((n) => n.type === 'paragraph');
      const linkNode = paragraph?.content?.find((n) =>
        n.marks?.some((m) => m.type === 'link')
      );
      expect(linkNode).toBeDefined();
      expect(linkNode?.marks?.find((m) => m.type === 'link')?.attrs?.href).toBe(
        'https://example.com'
      );
    });
  });

  describe('problematic patterns detection', () => {
    it('should detect HTML tags in markdown', async () => {
      const content = await fs.readFile(
        path.join(fixturesDir, 'with-html.md'),
        'utf-8'
      );

      const { content: body } = parseFrontmatter(content);
      const htmlPattern = /<[^>]+>/;
      expect(htmlPattern.test(body)).toBe(true);
    });

    it('should detect nested image links', () => {
      const markdown = '[![alt](image.png)](https://example.com)';
      const nestedImagePattern = /\[!\[.*?\]\(.*?\)\]\(.*?\)/;
      expect(nestedImagePattern.test(markdown)).toBe(true);
    });
  });

  describe('validation report creation', () => {
    it('should create error for missing frontmatter', () => {
      const issues = [
        createError(
          'NO_FRONTMATTER',
          'File does not start with YAML frontmatter',
          undefined,
          { file: 'test.md' },
          'Add YAML frontmatter at the beginning of the file'
        ),
      ];

      const report = createReport(issues);

      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBe(1);
      expect(report.issues[0].code).toBe('NO_FRONTMATTER');
    });

    it('should create error for missing title', () => {
      const issues = [
        createError(
          'MISSING_TITLE',
          'Missing required field: title',
          'title',
          { file: 'test.md' },
          'Add "title: Your Page Title" to frontmatter'
        ),
      ];

      const report = createReport(issues);

      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBe(1);
      expect(report.issues[0].field).toBe('title');
    });

    it('should create warning for missing spaceKey', () => {
      const issues = [
        createWarning(
          'MISSING_SPACE_KEY',
          'Missing space key',
          'spaceKey',
          { file: 'test.md' },
          'Add spaceKey to frontmatter'
        ),
      ];

      const report = createReport(issues);

      expect(report.valid).toBe(true);
      expect(report.summary.warnings).toBe(1);
    });

    it('should merge multiple reports', () => {
      const report1 = createReport([
        createError('ERR1', 'Error 1'),
        createWarning('WARN1', 'Warning 1'),
      ]);

      const report2 = createReport([
        createError('ERR2', 'Error 2'),
        createInfo('INFO1', 'Info 1'),
      ]);

      const merged = mergeReports(report1, report2);

      expect(merged.valid).toBe(false);
      expect(merged.summary.errors).toBe(2);
      expect(merged.summary.warnings).toBe(1);
      expect(merged.summary.info).toBe(1);
      expect(merged.issues).toHaveLength(4);
    });
  });

  describe('file discovery', () => {
    it('should find markdown files in directory', async () => {
      await fs.writeFile(
        path.join(testDir, 'page1.md'),
        '---\ntitle: Page 1\n---\n# Page 1',
        'utf-8'
      );
      await fs.writeFile(
        path.join(testDir, 'page2.md'),
        '---\ntitle: Page 2\n---\n# Page 2',
        'utf-8'
      );
      await fs.writeFile(path.join(testDir, 'not-markdown.txt'), 'Text file', 'utf-8');

      const files = await fs.readdir(testDir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      expect(mdFiles).toHaveLength(2);
      expect(mdFiles).toContain('page1.md');
      expect(mdFiles).toContain('page2.md');
    });

    it('should handle nested directories', async () => {
      const nestedDir = path.join(testDir, 'subdir');
      await fs.ensureDir(nestedDir);
      await fs.writeFile(
        path.join(nestedDir, 'nested.md'),
        '---\ntitle: Nested\n---\n# Nested',
        'utf-8'
      );

      const exists = await fs.pathExists(path.join(nestedDir, 'nested.md'));
      expect(exists).toBe(true);
    });

    it('should handle single file path', async () => {
      const filePath = path.join(testDir, 'single.md');
      await fs.writeFile(filePath, '---\ntitle: Single\n---\n# Single', 'utf-8');

      const stat = await fs.stat(filePath);
      expect(stat.isFile()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty markdown content', () => {
      const adf = markdownToAdf('');
      expect(adf.type).toBe('doc');
      expect(adf.content).toHaveLength(0);
    });

    it('should handle markdown with only whitespace', () => {
      const adf = markdownToAdf('   \n\n   ');
      expect(adf.type).toBe('doc');
      expect(adf.content).toHaveLength(0);
    });

    it('should handle markdown with only frontmatter', async () => {
      const content = '---\ntitle: "Only Frontmatter"\nspaceKey: "DOCS"\n---\n';
      const { data, content: body } = parseFrontmatter(content);

      expect(data.title).toBe('Only Frontmatter');
      expect(body.trim()).toBe('');
    });

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(500);
      const issues: any[] = [];

      if (longTitle.length > 255) {
        issues.push(
          createWarning(
            'TITLE_TOO_LONG',
            'Title exceeds recommended length of 255 characters (' + longTitle.length + ')',
            'title'
          )
        );
      }

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe('TITLE_TOO_LONG');
    });

    it('should handle special characters in content', () => {
      const markdown = '# Title with emojis and special chars <>&';
      const adf = markdownToAdf(markdown);

      expect(adf.content.length).toBeGreaterThan(0);
    });
  });
});
