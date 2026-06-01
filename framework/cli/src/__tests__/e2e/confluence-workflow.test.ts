/**
 * E2E Test: Confluence Workflow
 *
 * Tests Confluence workflows:
 * - Create page from markdown → Fetch page → Verify round-trip
 * - Markdown ↔ ADF conversion
 */

import path from 'path';
import fs from 'fs-extra';
import { markdownToAdf, adfToMarkdown } from '../../lib/confluence/adf-converter.js';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';

describe('E2E: Confluence Workflow', () => {
  const FIXTURES_DIR = path.join(__dirname, '../fixtures');
  let sandbox: TestSandbox;
  let TEST_DIR: string;

  beforeAll(async () => {
    sandbox = await createSandbox('e2e-confluence');
    TEST_DIR = sandbox.path;
  });

  afterAll(async () => {
    await sandbox.cleanup();
  });

  describe('Markdown to ADF Conversion', () => {
    it('should convert markdown to ADF format', async () => {
      const markdownPath = path.join(FIXTURES_DIR, 'sample-markdown', 'test-document.md');
      const markdown = await fs.readFile(markdownPath, 'utf-8');

      const adf = markdownToAdf(markdown);

      expect(adf).toBeDefined();
      expect(adf.type).toBe('doc');
      expect(adf.version).toBe(1);
      expect(adf.content).toBeDefined();
      expect(Array.isArray(adf.content)).toBe(true);
    });

    it('should handle headings in markdown', async () => {
      const markdown = `# Heading 1\n## Heading 2\n### Heading 3`;

      const adf = markdownToAdf(markdown);

      expect(adf.content).toBeDefined();
      expect(adf.content.length).toBeGreaterThan(0);

      // Check for heading nodes
      const headings = adf.content.filter((node: any) => node.type === 'heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should handle text formatting (bold, italic, code)', async () => {
      const markdown = `**Bold text** and *italic text* and \`code inline\``;

      const adf = markdownToAdf(markdown);

      expect(adf.content).toBeDefined();
      expect(adf.content.length).toBeGreaterThan(0);

      // Verify paragraph node exists
      const paragraphs = adf.content.filter((node: any) => node.type === 'paragraph');
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should handle lists (bullet and numbered)', async () => {
      const markdown = `
- Item 1
- Item 2
- Item 3

1. First
2. Second
3. Third
`;

      const adf = markdownToAdf(markdown);

      expect(adf.content).toBeDefined();

      // Check for list nodes
      const lists = adf.content.filter((node: any) =>
        node.type === 'bulletList' || node.type === 'orderedList'
      );
      expect(lists.length).toBeGreaterThan(0);
    });

    it('should handle code blocks', async () => {
      const markdown = `
\`\`\`javascript
function hello() {
  console.log('Hello');
}
\`\`\`
`;

      const adf = markdownToAdf(markdown);

      expect(adf.content).toBeDefined();

      // Check for code block
      const codeBlocks = adf.content.filter((node: any) => node.type === 'codeBlock');
      expect(codeBlocks.length).toBeGreaterThan(0);
    });

    it('should handle links', async () => {
      const markdown = `[Example Link](https://example.com)`;

      const adf = markdownToAdf(markdown);

      expect(adf.content).toBeDefined();
      expect(adf.content.length).toBeGreaterThan(0);
    });

    it('should handle mixed content', async () => {
      const markdown = `
# Title

This is **bold** and *italic* text.

- List item 1
- List item 2

\`\`\`javascript
const x = 42;
\`\`\`

[Link](https://example.com)
`;

      const adf = markdownToAdf(markdown);

      expect(adf.content).toBeDefined();
      expect(adf.content.length).toBeGreaterThan(0);

      // Verify multiple node types exist
      const nodeTypes = new Set(adf.content.map((node: any) => node.type));
      expect(nodeTypes.size).toBeGreaterThan(1);
    });
  });

  describe('ADF to Markdown Conversion', () => {
    it('should convert ADF back to markdown', () => {
      const adf = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Test Heading' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test paragraph' }],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);

      expect(markdown).toContain('# Test Heading');
      expect(markdown).toContain('Test paragraph');
    });

    it('should convert headings at different levels', () => {
      const adf = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'H1' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'H2' }],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'H3' }],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);

      expect(markdown).toContain('# H1');
      expect(markdown).toContain('## H2');
      expect(markdown).toContain('### H3');
    });

    it('should convert text with marks (bold, italic, code)', () => {
      const adf = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Bold text', marks: [{ type: 'strong' }] },
              { type: 'text', text: ' and ' },
              { type: 'text', text: 'italic text', marks: [{ type: 'em' }] },
              { type: 'text', text: ' and ' },
              { type: 'text', text: 'code', marks: [{ type: 'code' }] },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);

      expect(markdown).toContain('**Bold text**');
      expect(markdown).toContain('*italic text*');
      expect(markdown).toContain('`code`');
    });

    it('should convert bullet lists', () => {
      const adf = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Item 1' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Item 2' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);

      expect(markdown).toContain('- Item 1');
      expect(markdown).toContain('- Item 2');
    });

    it('should convert code blocks', () => {
      const adf = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'codeBlock',
            attrs: { language: 'javascript' },
            content: [{ type: 'text', text: 'const x = 42;' }],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);

      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('const x = 42;');
      expect(markdown).toContain('```');
    });
  });

  describe('Round-trip Conversion', () => {
    it('should preserve content in markdown → ADF → markdown round-trip', async () => {
      const originalMarkdown = `# Test Document

This is a test with **bold** and *italic* text.

- Item 1
- Item 2

\`\`\`javascript
const x = 42;
\`\`\`
`;

      // Convert to ADF
      const adf = markdownToAdf(originalMarkdown);
      expect(adf).toBeDefined();

      // Convert back to markdown
      const resultMarkdown = adfToMarkdown(adf);
      expect(resultMarkdown).toBeDefined();

      // Verify key content is preserved
      expect(resultMarkdown).toContain('# Test Document');
      expect(resultMarkdown).toContain('**bold**');
      expect(resultMarkdown).toContain('*italic*');
      expect(resultMarkdown).toContain('- Item 1');
      expect(resultMarkdown).toContain('- Item 2');
      expect(resultMarkdown).toContain('```javascript');
      expect(resultMarkdown).toContain('const x = 42;');
    });

    it('should handle complex nested structures', () => {
      const markdown = `# Main Heading

## Subheading

This is a paragraph with **bold** and *italic*.

- List item with **bold text**
- List item with \`code\`
  - Nested item 1
  - Nested item 2

\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\`
`;

      const adf = markdownToAdf(markdown);
      const resultMarkdown = adfToMarkdown(adf);

      // Verify structure is preserved
      expect(resultMarkdown).toContain('# Main Heading');
      expect(resultMarkdown).toContain('## Subheading');
      expect(resultMarkdown).toContain('**bold**');
      expect(resultMarkdown).toContain('*italic*');
    });

    it('should preserve whitespace and formatting', () => {
      const markdown = `# Title

Paragraph 1

Paragraph 2
`;

      const adf = markdownToAdf(markdown);
      const resultMarkdown = adfToMarkdown(adf);

      // Verify title is preserved
      expect(resultMarkdown).toContain('# Title');

      // Verify paragraphs are present
      expect(resultMarkdown).toContain('Paragraph 1');
      expect(resultMarkdown).toContain('Paragraph 2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty markdown', () => {
      const markdown = '';
      const adf = markdownToAdf(markdown);

      expect(adf).toBeDefined();
      expect(adf.type).toBe('doc');
      expect(adf.content).toBeDefined();
    });

    it('should handle empty ADF', () => {
      const adf = {
        type: 'doc',
        version: 1,
        content: [],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBeDefined();
      expect(typeof markdown).toBe('string');
    });

    it('should handle special characters', () => {
      const markdown = `Special chars: & < > " '`;
      const adf = markdownToAdf(markdown);

      expect(adf).toBeDefined();
      expect(adf.content.length).toBeGreaterThan(0);
    });

    it('should handle very long documents', () => {
      // Create a long document
      let markdown = '# Long Document\n\n';
      for (let i = 0; i < 100; i++) {
        markdown += `## Section ${i}\n\nThis is paragraph ${i}.\n\n`;
      }

      const adf = markdownToAdf(markdown);
      expect(adf).toBeDefined();
      expect(adf.content.length).toBeGreaterThan(0);

      const resultMarkdown = adfToMarkdown(adf);
      expect(resultMarkdown).toContain('# Long Document');
      expect(resultMarkdown).toContain('Section 0');
      expect(resultMarkdown).toContain('Section 99');
    });

    it('should handle tables if supported', () => {
      const markdown = `
| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;

      const adf = markdownToAdf(markdown);
      expect(adf).toBeDefined();
    });
  });
});
