import { WikiConverter } from '../wiki-converter';

describe('WikiConverter', () => {
  let converter: WikiConverter;

  beforeEach(() => {
    converter = new WikiConverter();
  });

  describe('convertHeaders', () => {
    it('should convert # to h1.', () => {
      const input = '# Heading 1';
      const expected = 'h1. Heading 1';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should convert ## to h2.', () => {
      const input = '## Heading 2';
      const expected = 'h2. Heading 2';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should convert ### to h3.', () => {
      const input = '### Heading 3';
      const expected = 'h3. Heading 3';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle multiple headers', () => {
      const input = `# H1
## H2
### H3`;
      const expected = `h1. H1
h2. H2
h3. H3`;
      expect(converter.convert(input)).toBe(expected);
    });

    it('should preserve text after headers', () => {
      const input = '# Header\nSome text';
      const expected = 'h1. Header\nSome text';
      expect(converter.convert(input)).toBe(expected);
    });
  });

  describe('convertFormatting', () => {
    it('should convert **bold** to *bold*', () => {
      const input = 'This is **bold** text';
      const expected = 'This is *bold* text';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should convert multiple bold sections', () => {
      const input = '**First** and **second** bold';
      const expected = '*First* and *second* bold';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should preserve _italic_ as _italic_', () => {
      const input = 'This is _italic_ text';
      const expected = 'This is _italic_ text';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should convert `code` to {{code}}', () => {
      const input = 'This is `inline code` here';
      const expected = 'This is {{inline code}} here';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should convert multiple inline code sections', () => {
      const input = 'Use `foo` and `bar` functions';
      const expected = 'Use {{foo}} and {{bar}} functions';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle mixed formatting', () => {
      const input = '**Bold** and `code` and _italic_';
      const expected = '*Bold* and {{code}} and _italic_';
      expect(converter.convert(input)).toBe(expected);
    });
  });

  describe('convertCodeBlocks', () => {
    it('should convert fenced code blocks', () => {
      const input = '```\ncode here\n```';
      const expected = '{code}\ncode here\n{code}';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should convert code blocks with language hints', () => {
      const input = '```javascript\nconsole.log("test");\n```';
      const expected = '{code:javascript}\nconsole.log("test");\n{code}';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle multiple code blocks', () => {
      const input = '```python\nprint("hi")\n```\n\nText\n\n```typescript\nconst x = 1;\n```';
      const expected = '{code:python}\nprint("hi")\n{code}\n\nText\n\n{code:typescript}\nconst x = 1;\n{code}';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should preserve code block content', () => {
      const input = '```\nfunction test() {\n  return true;\n}\n```';
      const expected = '{code}\nfunction test() {\n  return true;\n}\n{code}';
      expect(converter.convert(input)).toBe(expected);
    });
  });

  describe('convertLinks', () => {
    it('should convert markdown links to wiki format', () => {
      const input = '[text](http://example.com)';
      const expected = '[text|http://example.com]';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle multiple links', () => {
      const input = '[First](http://one.com) and [Second](http://two.com)';
      const expected = '[First|http://one.com] and [Second|http://two.com]';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle links with special characters', () => {
      const input = '[API Docs](https://example.com/api?v=2&format=json)';
      const expected = '[API Docs|https://example.com/api?v=2&format=json]';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle relative links', () => {
      const input = '[Local](./path/to/file.md)';
      const expected = '[Local|./path/to/file.md]';
      expect(converter.convert(input)).toBe(expected);
    });
  });

  describe('convertLists', () => {
    it('should convert unordered lists (- to *)', () => {
      const input = '- Item 1\n- Item 2\n- Item 3';
      const expected = '* Item 1\n* Item 2\n* Item 3';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should convert ordered lists (1. to #)', () => {
      const input = '1. First\n2. Second\n3. Third';
      const expected = '# First\n# Second\n# Third';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle nested lists with indentation', () => {
      const input = '- Item 1\n  - Nested 1\n  - Nested 2\n- Item 2';
      const expected = '* Item 1\n  * Nested 1\n  * Nested 2\n* Item 2';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle mixed list types', () => {
      const input = '- Unordered\n1. Ordered';
      const expected = '* Unordered\n# Ordered';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should preserve list item content', () => {
      const input = '- **Bold** item with `code`';
      const expected = '* *Bold* item with {{code}}';
      expect(converter.convert(input)).toBe(expected);
    });
  });

  describe('complex conversions', () => {
    it('should handle document with multiple elements', () => {
      const input = `# Main Title

This is **bold** and this is \`code\`.

## Section

- Item 1
- Item 2

[Link](http://example.com)

\`\`\`javascript
const x = 1;
\`\`\``;

      const expected = `h1. Main Title

This is *bold* and this is {{code}}.

h2. Section

* Item 1
* Item 2

[Link|http://example.com]

{code:javascript}
const x = 1;
{code}`;

      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle edge cases with formatting', () => {
      const input = '**`Bold code`** or `**code bold**`';
      const expected = '*{{Bold code}}* or {{*code bold*}}';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle empty strings', () => {
      expect(converter.convert('')).toBe('');
    });

    it('should handle strings with no markdown', () => {
      const input = 'Just plain text';
      expect(converter.convert(input)).toBe('Just plain text');
    });

    it('should not double-convert already converted text', () => {
      const input = 'h1. Already Jira';
      expect(converter.convert(input)).toBe('h1. Already Jira');
    });
  });

  describe('section cleanup (from Python implementation)', () => {
    it('should remove title (first h1)', () => {
      const input = '# Title to Remove\n\nContent here';
      const expected = 'Content here';
      expect(converter.convert(input, { removeTitle: true })).toBe(expected);
    });

    it('should remove horizontal rules', () => {
      const input = 'Text\n---\nMore text';
      const expected = 'Text\nMore text';
      expect(converter.convert(input, { removeHorizontalRules: true })).toBe(expected);
    });

    it('should convert bold labels to h3 headings', () => {
      const input = '**Context:**\nSome context';
      const expected = 'h3. Context\nSome context';
      expect(converter.convert(input, { convertBoldLabelsToHeadings: true })).toBe(expected);
    });

    it('should handle full cleanup workflow', () => {
      const input = `# Title

**Type:** Story

---

## Description

**Context:**
Some context

**Requirements:**
- Feature 1
- Feature 2`;

      const expected = `h2. Description

h3. Context
Some context

h3. Requirements
* Feature 1
* Feature 2`;

      expect(converter.convert(input, {
        removeTitle: true,
        removeHorizontalRules: true,
        removeMetadataLine: true,
        convertBoldLabelsToHeadings: true
      })).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should handle headers at start of line only', () => {
      const input = 'This is not # a header';
      expect(converter.convert(input)).toBe('This is not # a header');
    });

    it('should handle multiple asterisks correctly', () => {
      const input = '***text***';
      const expected = '*text*';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle backticks in code blocks', () => {
      const input = '```\nUse `backticks` here\n```';
      const expected = '{code}\nUse `backticks` here\n{code}';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should handle links with brackets in text', () => {
      const input = '[[nested]](http://example.com)';
      const expected = '[[nested]|http://example.com]';
      expect(converter.convert(input)).toBe(expected);
    });

    it('should preserve whitespace correctly', () => {
      const input = '  - Indented item';
      const expected = '  * Indented item';
      expect(converter.convert(input)).toBe(expected);
    });
  });
});
