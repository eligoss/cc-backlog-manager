import { describe, it, expect } from '@jest/globals';
import { convertJiraWikiToMarkdown } from '../../lib/jira/wiki-converter.js';

describe('convertJiraWikiToMarkdown', () => {
  it('should convert headings', () => {
    expect(convertJiraWikiToMarkdown('h1. Title')).toBe('# Title');
    expect(convertJiraWikiToMarkdown('h2. Section')).toBe('## Section');
    expect(convertJiraWikiToMarkdown('h3. Sub')).toBe('### Sub');
  });

  it('should convert bold', () => {
    expect(convertJiraWikiToMarkdown('This is *bold* text')).toBe('This is **bold** text');
  });

  it('should convert italic', () => {
    expect(convertJiraWikiToMarkdown('This is _italic_ text')).toBe('This is *italic* text');
  });

  it('should convert inline code', () => {
    expect(convertJiraWikiToMarkdown('Use {{myFunction}} here')).toBe('Use `myFunction` here');
  });

  it('should convert code blocks', () => {
    const wiki = '{code:javascript}\nconst x = 1;\n{code}';
    const expected = '```javascript\nconst x = 1;\n```';
    expect(convertJiraWikiToMarkdown(wiki)).toBe(expected);
  });

  it('should convert code blocks without language', () => {
    const wiki = '{code}\nsome code\n{code}';
    const expected = '```\nsome code\n```';
    expect(convertJiraWikiToMarkdown(wiki)).toBe(expected);
  });

  it('should convert unordered lists', () => {
    const wiki = '* Item one\n* Item two\n** Nested item';
    const expected = '- Item one\n- Item two\n  - Nested item';
    expect(convertJiraWikiToMarkdown(wiki)).toBe(expected);
  });

  it('should convert ordered lists', () => {
    const wiki = '# First\n# Second\n## Nested';
    const expected = '1. First\n2. Second\n   1. Nested';
    expect(convertJiraWikiToMarkdown(wiki)).toBe(expected);
  });

  it('should convert links', () => {
    expect(convertJiraWikiToMarkdown('[Example|https://example.com]'))
      .toBe('[Example](https://example.com)');
  });

  it('should convert simple links without label', () => {
    expect(convertJiraWikiToMarkdown('[https://example.com]'))
      .toBe('[https://example.com](https://example.com)');
  });

  it('should convert tables', () => {
    const wiki = '||Header 1||Header 2||\n|Cell 1|Cell 2|';
    const expected = '| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |';
    expect(convertJiraWikiToMarkdown(wiki)).toBe(expected);
  });

  it('should convert noformat blocks to fenced code', () => {
    const wiki = '{noformat}\nplain text\n{noformat}';
    const expected = '```\nplain text\n```';
    expect(convertJiraWikiToMarkdown(wiki)).toBe(expected);
  });

  it('should handle panel blocks', () => {
    const wiki = '{panel:title=Note}\nSome content\n{panel}';
    const expected = '> **Note**\n> Some content';
    expect(convertJiraWikiToMarkdown(wiki)).toBe(expected);
  });

  it('should handle mixed content', () => {
    const wiki = 'h2. Overview\n\nThis has *bold* and _italic_ with {{code}}.\n\n* List item\n* Another';
    const result = convertJiraWikiToMarkdown(wiki);
    expect(result).toContain('## Overview');
    expect(result).toContain('**bold**');
    expect(result).toContain('*italic*');
    expect(result).toContain('`code`');
    expect(result).toContain('- List item');
  });

  it('should return empty string for empty input', () => {
    expect(convertJiraWikiToMarkdown('')).toBe('');
  });

  it('should pass through plain text unchanged', () => {
    expect(convertJiraWikiToMarkdown('Just plain text')).toBe('Just plain text');
  });

  it('should not convert formatting inside code blocks', () => {
    const wiki = '{code}\n*not bold* and _not italic_\n{code}';
    const result = convertJiraWikiToMarkdown(wiki);
    expect(result).toContain('*not bold*');
    expect(result).not.toContain('**not bold**');
  });

  it('should reset nested ordered list counters', () => {
    const wiki = '# First\n## Sub A\n## Sub B\n# Second\n## Sub C';
    const expected = '1. First\n   1. Sub A\n   2. Sub B\n2. Second\n   1. Sub C';
    expect(convertJiraWikiToMarkdown(wiki)).toBe(expected);
  });
});
