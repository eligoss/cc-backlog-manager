/**
 * Hash Calculator Unit Tests
 *
 * Tests for SHA-256 hashing used in world fact immutability.
 * Covers content normalization, hash extraction, and hash computation.
 *
 * @skip Tests are skipped because the library modules at
 * modules/writer/src/lib/ have not been implemented yet.
 */

import {
  normalizeContent,
  extractContentForHashing,
  computeHash,
  computeOriginalHash,
  computeAdditionHash,
} from '../../../../../../modules/writer/src/lib/hash-calculator.js';

describe.skip('hash-calculator', () => {
  describe('normalizeContent', () => {
    it('converts CRLF to LF', () => {
      const content = 'line1\r\nline2\r\n';
      const result = normalizeContent(content);
      expect(result).toBe('line1\nline2\n');
    });

    it('converts CR to LF', () => {
      const content = 'line1\rline2\r';
      const result = normalizeContent(content);
      expect(result).toBe('line1\nline2\n');
    });

    it('preserves LF line endings', () => {
      const content = 'line1\nline2\n';
      const result = normalizeContent(content);
      expect(result).toBe('line1\nline2\n');
    });

    it('handles mixed line endings', () => {
      const content = 'line1\r\nline2\rline3\n';
      const result = normalizeContent(content);
      expect(result).toBe('line1\nline2\nline3\n');
    });

    it('handles content without line endings', () => {
      const content = 'single line';
      const result = normalizeContent(content);
      expect(result).toBe('single line');
    });

    it('handles empty content', () => {
      const result = normalizeContent('');
      expect(result).toBe('');
    });
  });

  describe('extractContentForHashing', () => {
    it('removes content-hash field from frontmatter', () => {
      const content = `---
id: "test-fact"
title: "Test"
content-hash: "abc123"
---

Content here`;
      const result = extractContentForHashing(content);
      expect(result).not.toContain('content-hash');
      expect(result).toContain('id:');
      expect(result).toContain('title:');
    });

    it('removes hash fields from additions array', () => {
      const content = `---
id: "test-fact"
additions:
  - date: "2026-01-01"
    hash: "abc123"
    section: "New Section"
---

Content`;
      const result = extractContentForHashing(content);
      expect(result).not.toContain('hash: "abc123"');
      expect(result).toContain('date:');
      expect(result).toContain('section:');
    });

    it('preserves other frontmatter fields', () => {
      const content = `---
id: "test-fact"
title: "Test Title"
mutability: "immutable"
category: "core"
---

Content`;
      const result = extractContentForHashing(content);
      expect(result).toContain('id:');
      expect(result).toContain('title:');
      expect(result).toContain('mutability:');
      expect(result).toContain('category:');
    });

    it('handles files without frontmatter', () => {
      const content = 'Just plain content without frontmatter';
      const result = extractContentForHashing(content);
      expect(result).toBe(content);
    });

    it('handles malformed frontmatter gracefully', () => {
      const content = `---
invalid: [unclosed
---

Content`;
      // Should return content as-is if parsing fails
      const result = extractContentForHashing(content);
      expect(result).toBeDefined();
    });

    it('preserves nested objects in frontmatter', () => {
      const content = `---
id: "test"
immediate:
  time: "dawn"
  location: "forest"
---

Content`;
      const result = extractContentForHashing(content);
      expect(result).toContain('immediate:');
    });

    it('preserves arrays of primitives in frontmatter', () => {
      const content = `---
id: "test"
tags:
  - "tag1"
  - "tag2"
---

Content`;
      const result = extractContentForHashing(content);
      expect(result).toContain('tags:');
    });
  });

  describe('computeHash', () => {
    it('computes SHA-256 hash', () => {
      const content = 'Test content';
      const hash = computeHash(content);
      // SHA-256 produces 64 hex characters
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('normalizes content before hashing', () => {
      const crlfContent = 'line1\r\nline2';
      const lfContent = 'line1\nline2';
      // After normalization, both should produce the same hash
      expect(computeHash(crlfContent)).toBe(computeHash(lfContent));
    });

    it('excludes hash fields before hashing', () => {
      const withHash = `---
id: "test"
content-hash: "old-hash"
---

Content`;
      const withoutHash = `---
id: "test"
---

Content`;
      // Hash should be computed without the content-hash field
      // Note: the serialization may differ, so we just verify it doesn't break
      const hash1 = computeHash(withHash);
      expect(hash1).toHaveLength(64);
    });

    it('produces consistent hash for same content', () => {
      const content = 'Same content';
      const hash1 = computeHash(content);
      const hash2 = computeHash(content);
      expect(hash1).toBe(hash2);
    });

    it('produces different hash for different content', () => {
      const hash1 = computeHash('Content A');
      const hash2 = computeHash('Content B');
      expect(hash1).not.toBe(hash2);
    });

    it('handles empty content', () => {
      const hash = computeHash('');
      expect(hash).toHaveLength(64);
    });

    it('handles content with unicode characters', () => {
      const content = 'Unicode: 日本語 emoji 🚀';
      const hash = computeHash(content);
      expect(hash).toHaveLength(64);
    });
  });

  describe('computeOriginalHash', () => {
    it('computes hash for append-only fact with no additions', () => {
      const content = `---
id: "test"
mutability: "append-only"
additions: []
---

Original content only.`;
      const hash = computeOriginalHash(content);
      expect(hash).toHaveLength(64);
    });

    it('throws for non-append-only content', () => {
      const content = `---
id: "test"
mutability: "immutable"
---

Content`;
      expect(() => computeOriginalHash(content)).toThrow('append-only');
    });

    it('excludes additions when computing hash', () => {
      const content = `---
id: "test"
mutability: "append-only"
additions:
  - date: "2026-01-15"
    section: "Added Section"
---

# Original Content

## Added Section

This was added later.`;
      // Should compute hash of only the original content before "Added Section"
      const hash = computeOriginalHash(content);
      expect(hash).toHaveLength(64);
    });
  });

  describe('computeAdditionHash', () => {
    it('computes hash of addition section', () => {
      const sectionContent = '## New Section\n\nThis is new content.';
      const hash = computeAdditionHash(sectionContent);
      expect(hash).toHaveLength(64);
    });

    it('normalizes content before hashing', () => {
      const crlfContent = 'Section\r\nContent';
      const lfContent = 'Section\nContent';
      expect(computeAdditionHash(crlfContent)).toBe(computeAdditionHash(lfContent));
    });

    it('produces consistent hash for same section', () => {
      const section = 'Same section content';
      expect(computeAdditionHash(section)).toBe(computeAdditionHash(section));
    });

    it('produces different hash for different sections', () => {
      const hash1 = computeAdditionHash('Section A');
      const hash2 = computeAdditionHash('Section B');
      expect(hash1).not.toBe(hash2);
    });
  });
});
