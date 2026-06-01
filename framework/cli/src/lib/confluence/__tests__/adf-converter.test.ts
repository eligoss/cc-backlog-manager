import { adfToMarkdown, markdownToAdf } from '../adf-converter';

describe('AdfConverter', () => {
  describe('adfToMarkdown', () => {
    it('should convert headings', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Heading 1' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Heading 2' }],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Heading 3' }],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('# Heading 1\n## Heading 2\n### Heading 3');
    });

    it('should convert paragraphs', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'First paragraph' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Second paragraph' }],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('First paragraph\nSecond paragraph');
    });

    it('should convert bullet lists', () => {
      const adf = {
        type: 'doc',
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
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Item 3' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('- Item 1\n- Item 2\n- Item 3');
    });

    it('should convert ordered lists', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'First' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Second' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Third' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('1. First\n2. Second\n3. Third');
    });

    it('should convert code blocks', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            attrs: { language: 'javascript' },
            content: [
              {
                type: 'text',
                text: 'function hello() {\n  console.log("Hello");\n}',
              },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe(
        '```javascript\nfunction hello() {\n  console.log("Hello");\n}\n```'
      );
    });

    it('should convert code blocks without language', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'plain text code' }],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('```\nplain text code\n```');
    });

    it('should convert tables', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Header 1' }],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Header 2' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Cell 1' }],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Cell 2' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe(
        '\n| Header 1 | Header 2 |\n|---|---|\n| Cell 1 | Cell 2 |\n'
      );
    });

    it('should handle nested content', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is ' },
              { type: 'text', text: 'bold', marks: [{ type: 'strong' }] },
              { type: 'text', text: ' and ' },
              { type: 'text', text: 'italic', marks: [{ type: 'em' }] },
              { type: 'text', text: ' text.' },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('# Title\nThis is **bold** and *italic* text.');
    });

    it('should handle inline code marks', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Use ' },
              { type: 'text', text: 'console.log()', marks: [{ type: 'code' }] },
              { type: 'text', text: ' for debugging.' },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('Use `console.log()` for debugging.');
    });

    it('should handle links', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Visit ' },
              {
                type: 'text',
                text: 'example.com',
                marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
              },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('Visit [example.com](https://example.com)');
    });

    it('should handle strikethrough', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is ' },
              { type: 'text', text: 'deleted', marks: [{ type: 'strike' }] },
              { type: 'text', text: ' text.' },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('This is ~~deleted~~ text.');
    });

    it('should handle blockquotes', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'This is a quote' }],
              },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('> This is a quote');
    });

    it('should handle horizontal rules', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Before' }],
          },
          { type: 'rule' },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'After' }],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('Before\n---\nAfter');
    });

    it('should handle nested lists', () => {
      const adf = {
        type: 'doc',
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
                  {
                    type: 'bulletList',
                    content: [
                      {
                        type: 'listItem',
                        content: [
                          {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'Nested 1' }],
                          },
                        ],
                      },
                      {
                        type: 'listItem',
                        content: [
                          {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'Nested 2' }],
                          },
                        ],
                      },
                    ],
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
      expect(markdown).toBe('- Item 1\n  - Nested 1\n  - Nested 2\n- Item 2');
    });

    it('should handle empty paragraphs', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('');
    });

    it('should handle combined text marks', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'bold and italic',
                marks: [{ type: 'strong' }, { type: 'em' }],
              },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(adf);
      expect(markdown).toBe('***bold and italic***');
    });
  });

  describe('markdownToAdf', () => {
    it('should convert # headers', () => {
      const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
      const adf = markdownToAdf(markdown);

      expect(adf.type).toBe('doc');
      expect(adf.version).toBe(1);
      expect(adf.content).toHaveLength(3);
      expect(adf.content[0]).toMatchObject({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Heading 1' }],
      });
      expect(adf.content[1]).toMatchObject({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Heading 2' }],
      });
      expect(adf.content[2]).toMatchObject({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Heading 3' }],
      });
    });

    it('should convert paragraphs', () => {
      const markdown = 'First paragraph\n\nSecond paragraph';
      const adf = markdownToAdf(markdown);

      expect(adf.content).toHaveLength(2);
      expect(adf.content[0]).toMatchObject({
        type: 'paragraph',
        content: [{ type: 'text', text: 'First paragraph' }],
      });
      expect(adf.content[1]).toMatchObject({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Second paragraph' }],
      });
    });

    it('should convert - lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const adf = markdownToAdf(markdown);

      expect(adf.content).toHaveLength(1);
      expect(adf.content[0].type).toBe('bulletList');
      expect(adf.content[0].content).toHaveLength(3);
      expect(adf.content[0].content[0]).toMatchObject({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Item 1' }],
          },
        ],
      });
    });

    it('should convert numbered lists', () => {
      const markdown = '1. First\n2. Second\n3. Third';
      const adf = markdownToAdf(markdown);

      expect(adf.content).toHaveLength(1);
      expect(adf.content[0].type).toBe('orderedList');
      expect(adf.content[0].content).toHaveLength(3);
    });

    it('should convert code blocks', () => {
      const markdown = '```javascript\nfunction test() {}\n```';
      const adf = markdownToAdf(markdown);

      expect(adf.content).toHaveLength(1);
      expect(adf.content[0]).toMatchObject({
        type: 'codeBlock',
        attrs: { language: 'javascript' },
        content: [{ type: 'text', text: 'function test() {}' }],
      });
    });

    it('should convert code blocks without language', () => {
      const markdown = '```\nplain code\n```';
      const adf = markdownToAdf(markdown);

      expect(adf.content).toHaveLength(1);
      expect(adf.content[0].type).toBe('codeBlock');
      expect(adf.content[0].content[0].text).toBe('plain code');
    });

    it('should convert bold text', () => {
      const markdown = 'This is **bold** text';
      const adf = markdownToAdf(markdown);

      expect(adf.content[0].content).toHaveLength(3);
      expect(adf.content[0].content[1]).toMatchObject({
        type: 'text',
        text: 'bold',
        marks: [{ type: 'strong' }],
      });
    });

    it('should convert italic text', () => {
      const markdown = 'This is *italic* text';
      const adf = markdownToAdf(markdown);

      expect(adf.content[0].content[1]).toMatchObject({
        type: 'text',
        text: 'italic',
        marks: [{ type: 'em' }],
      });
    });

    it('should convert inline code', () => {
      const markdown = 'Use `console.log()` for debugging';
      const adf = markdownToAdf(markdown);

      expect(adf.content[0].content[1]).toMatchObject({
        type: 'text',
        text: 'console.log()',
        marks: [{ type: 'code' }],
      });
    });

    it('should convert links', () => {
      const markdown = 'Visit [example](https://example.com)';
      const adf = markdownToAdf(markdown);

      expect(adf.content[0].content[1]).toMatchObject({
        type: 'text',
        text: 'example',
        marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
      });
    });

    it('should convert strikethrough', () => {
      const markdown = 'This is ~~deleted~~ text';
      const adf = markdownToAdf(markdown);

      expect(adf.content[0].content[1]).toMatchObject({
        type: 'text',
        text: 'deleted',
        marks: [{ type: 'strike' }],
      });
    });

    it('should convert blockquotes', () => {
      const markdown = '> This is a quote';
      const adf = markdownToAdf(markdown);

      expect(adf.content[0]).toMatchObject({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'This is a quote' }],
          },
        ],
      });
    });

    it('should convert horizontal rules', () => {
      const markdown = 'Before\n\n---\n\nAfter';
      const adf = markdownToAdf(markdown);

      expect(adf.content).toHaveLength(3);
      expect(adf.content[1]).toMatchObject({ type: 'rule' });
    });

    it('should convert tables', () => {
      const markdown = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
      const adf = markdownToAdf(markdown);

      expect(adf.content[0].type).toBe('table');
      expect(adf.content[0].content).toHaveLength(2); // header row + data row
      expect(adf.content[0].content[0].content[0].type).toBe('tableHeader');
      expect(adf.content[0].content[1].content[0].type).toBe('tableCell');
    });
  });

  describe('roundTrip', () => {
    it('should preserve content after ADF → MD → ADF', () => {
      const originalAdf = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is ' },
              { type: 'text', text: 'bold', marks: [{ type: 'strong' }] },
              { type: 'text', text: ' text.' },
            ],
          },
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

      // ADF to Markdown
      const markdown = adfToMarkdown(originalAdf);

      // Markdown back to ADF
      const resultAdf = markdownToAdf(markdown);

      // Verify structure is preserved
      expect(resultAdf.type).toBe('doc');
      expect(resultAdf.content).toHaveLength(3);
      expect(resultAdf.content[0].type).toBe('heading');
      expect(resultAdf.content[0].attrs.level).toBe(1);
      expect(resultAdf.content[1].type).toBe('paragraph');
      expect(resultAdf.content[2].type).toBe('bulletList');
    });

    it('should preserve code blocks in round trip', () => {
      const originalAdf = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'codeBlock',
            attrs: { language: 'python' },
            content: [{ type: 'text', text: 'def hello():\n    print("Hi")' }],
          },
        ],
      };

      const markdown = adfToMarkdown(originalAdf);
      const resultAdf = markdownToAdf(markdown);

      expect(resultAdf.content[0].type).toBe('codeBlock');
      expect(resultAdf.content[0].attrs?.language).toBe('python');
      expect(resultAdf.content[0].content[0].text).toBe('def hello():\n    print("Hi")');
    });

    it('should preserve tables in round trip', () => {
      const originalAdf = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Col1' }],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Col2' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'A' }],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'B' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const markdown = adfToMarkdown(originalAdf);
      const resultAdf = markdownToAdf(markdown);

      expect(resultAdf.content[0].type).toBe('table');
      expect(resultAdf.content[0].content).toHaveLength(2);
    });
  });
});
