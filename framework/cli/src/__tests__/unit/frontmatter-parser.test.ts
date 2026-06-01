import { describe, it, expect } from '@jest/globals';
import { parseFrontmatter } from '../../lib/backlog/frontmatter-parser.js';

describe('parseFrontmatter', () => {
  it('should parse basic frontmatter', () => {
    const content = '---\ntitle: My Title\ndocumentType: story\n---\n\n# Body';
    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter.title).toBe('My Title');
    expect(frontmatter.documentType).toBe('story');
    expect(body).toContain('# Body');
  });

  it('should strip quotes from values', () => {
    const content = '---\njira-url: "https://test.atlassian.net/browse/PROJ-100"\n---\n';
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter['jira-url']).toBe('https://test.atlassian.net/browse/PROJ-100');
  });

  it('should handle null values', () => {
    const content = '---\njira-ticketId: null\nexportedDate:\n---\n';
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter['jira-ticketId']).toBeNull();
    expect(frontmatter.exportedDate).toBeNull();
  });

  it('should handle timestamps with colons', () => {
    const content = '---\nexportedDate: 2026-03-28T14:00:00Z\n---\n';
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter.exportedDate).toBe('2026-03-28T14:00:00Z');
  });

  it('should handle arrays', () => {
    const content = '---\nlabels: ["frontend", "urgent"]\n---\n';
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter.labels).toEqual(['frontend', 'urgent']);
  });

  it('should handle booleans', () => {
    const content = '---\nactive: true\narchived: false\n---\n';
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter.active).toBe(true);
    expect(frontmatter.archived).toBe(false);
  });

  it('should return empty frontmatter for files without frontmatter', () => {
    const content = 'Just a plain markdown file';
    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter).toEqual({});
    expect(body).toBe('Just a plain markdown file');
  });
});
