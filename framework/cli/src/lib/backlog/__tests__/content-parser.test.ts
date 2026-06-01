/**
 * Unit Tests for Content Parser
 *
 * Tests content extraction from Jira descriptions including
 * AS/WANT/SO THAT, context, requirements, and technical notes.
 */

import {
  extractAsWantSoThat,
  extractContext,
  extractRequirements,
  extractTechnicalNotes,
  parseDescriptionSections,
} from '../content-parser.js';

describe('content-parser', () => {
  describe('extractAsWantSoThat', () => {
    it('should extract AS/WANT/SO THAT from Jira wiki bold format', () => {
      // Jira CSV descriptions use Jira wiki markup (*bold*), not markdown (**bold**)
      const description = `*AS* a developer,
*I WANT* to import Jira tickets,
*SO THAT* I can track my work locally.

Some additional context here.`;

      const result = extractAsWantSoThat(description);
      expect(result).toEqual({
        asA: 'a developer',
        iWant: 'to import Jira tickets',
        soThat: 'I can track my work locally',
      });
    });

    it('should extract AS/WANT/SO THAT from plain text format', () => {
      const description = `AS a user,
I WANT to login with SSO,
SO THAT I can access the system securely.`;

      const result = extractAsWantSoThat(description);
      expect(result).toEqual({
        asA: 'a user',
        iWant: 'to login with SSO',
        soThat: 'I can access the system securely',
      });
    });

    it('should extract AS/WANT/SO THAT from Jira wiki markup (asterisks for bold)', () => {
      const description = `*AS* an admin,
*I WANT* to manage users,
*SO THAT* I can control access.`;

      const result = extractAsWantSoThat(description);
      expect(result).toEqual({
        asA: 'an admin',
        iWant: 'to manage users',
        soThat: 'I can control access',
      });
    });

    it('should handle single-line AS/WANT/SO THAT in plain text format', () => {
      // Plain text without bold markers (also valid Jira format)
      const description = `AS a user, I WANT to export data, SO THAT I can analyze it offline.`;

      const result = extractAsWantSoThat(description);
      expect(result).toEqual({
        asA: 'a user',
        iWant: 'to export data',
        soThat: 'I can analyze it offline',
      });
    });

    it('should return null for descriptions without AS/WANT/SO THAT', () => {
      const description = `This is a bug fix for the login page.
It should handle the error properly.`;

      const result = extractAsWantSoThat(description);
      expect(result).toBeNull();
    });

    it('should return null for empty or null input', () => {
      expect(extractAsWantSoThat('')).toBeNull();
      expect(extractAsWantSoThat(null as any)).toBeNull();
      expect(extractAsWantSoThat(undefined as any)).toBeNull();
    });

    it('should handle partial AS/WANT/SO THAT (missing SO THAT)', () => {
      // Jira wiki markup format
      const description = `*AS* a user,
*I WANT* to see my dashboard.`;

      const result = extractAsWantSoThat(description);
      expect(result).toEqual({
        asA: 'a user',
        iWant: 'to see my dashboard',
        soThat: null,
      });
    });

    it('should handle variations with periods and commas', () => {
      // Jira wiki markup format
      const description = `*AS* a developer.
*I WANT* to have good documentation.
*SO THAT* I can understand the codebase.`;

      const result = extractAsWantSoThat(description);
      expect(result).toEqual({
        asA: 'a developer',
        iWant: 'to have good documentation',
        soThat: 'I can understand the codebase',
      });
    });
  });

  describe('extractContext', () => {
    it('should extract prose paragraphs (non-bullet content)', () => {
      const description = `**AS** a user, **I WANT** feature X, **SO THAT** benefit Y.

This feature is needed because of business requirement A.
It will help users accomplish task B more efficiently.

- Requirement 1
- Requirement 2

The implementation should consider performance constraints.`;

      const result = extractContext(description);
      expect(result).toContain('This feature is needed because of business requirement A.');
      expect(result).toContain('It will help users accomplish task B more efficiently.');
      expect(result).toContain('The implementation should consider performance constraints.');
      expect(result).not.toContain('Requirement 1');
      expect(result).not.toContain('Requirement 2');
    });

    it('should exclude AS/WANT/SO THAT from context', () => {
      const description = `**AS** a user,
**I WANT** to do something,
**SO THAT** I get value.

This is the actual context paragraph.`;

      const result = extractContext(description);
      expect(result).toBe('This is the actual context paragraph.');
    });

    it('should return empty string for descriptions with only bullets', () => {
      const description = `- Item 1
- Item 2
* Item 3`;

      const result = extractContext(description);
      expect(result).toBe('');
    });

    it('should handle empty input', () => {
      expect(extractContext('')).toBe('');
      expect(extractContext(null as any)).toBe('');
    });

    it('should preserve paragraph breaks', () => {
      const description = `First paragraph of context.

Second paragraph of context.

- Bullet point`;

      const result = extractContext(description);
      expect(result).toContain('First paragraph of context.');
      expect(result).toContain('Second paragraph of context.');
    });
  });

  describe('extractRequirements', () => {
    it('should extract bullet points as requirements', () => {
      const description = `Some intro text.

- Requirement 1: Must support X
- Requirement 2: Should handle Y
- Requirement 3: Will implement Z

More text here.`;

      const result = extractRequirements(description);
      expect(result).toEqual([
        'Requirement 1: Must support X',
        'Requirement 2: Should handle Y',
        'Requirement 3: Will implement Z',
      ]);
    });

    it('should extract asterisk bullet points', () => {
      const description = `* First requirement
* Second requirement`;

      const result = extractRequirements(description);
      expect(result).toEqual([
        'First requirement',
        'Second requirement',
      ]);
    });

    it('should handle Jira wiki bullet format', () => {
      const description = `Some text
* requirement one
* requirement two`;

      const result = extractRequirements(description);
      expect(result).toEqual([
        'requirement one',
        'requirement two',
      ]);
    });

    it('should return empty array for descriptions without bullets', () => {
      const description = `This is a paragraph.
Another paragraph here.`;

      const result = extractRequirements(description);
      expect(result).toEqual([]);
    });

    it('should handle empty input', () => {
      expect(extractRequirements('')).toEqual([]);
      expect(extractRequirements(null as any)).toEqual([]);
    });

    it('should filter out empty bullets', () => {
      const description = `- Requirement 1
-
- Requirement 2`;

      const result = extractRequirements(description);
      expect(result).toEqual([
        'Requirement 1',
        'Requirement 2',
      ]);
    });

    it('should not include numbered lists as requirements', () => {
      const description = `- Bullet requirement
1. Numbered item
2. Another numbered
- Another bullet`;

      const result = extractRequirements(description);
      expect(result).toEqual([
        'Bullet requirement',
        'Another bullet',
      ]);
    });
  });

  describe('extractTechnicalNotes', () => {
    it('should extract technical notes section', () => {
      const description = `**AS** a user...

Some context.

**Technical Notes:**
- Use MUI Dialog pattern
- Consider caching strategy
- Validate input at API boundary`;

      const result = extractTechnicalNotes(description);
      expect(result).toEqual([
        'Use MUI Dialog pattern',
        'Consider caching strategy',
        'Validate input at API boundary',
      ]);
    });

    it('should extract technical notes with markdown h2 header (via Jira h2 conversion)', () => {
      // Jira "h2. Technical Notes" is the Jira format; test the Jira wiki format
      // that arrives in CSV exports and gets converted to markdown
      const description = `Some description.

h2. Technical Notes

* Note 1
* Note 2`;

      const result = extractTechnicalNotes(description);
      expect(result).toEqual(['Note 1', 'Note 2']);
    });

    it('should extract technical notes with Jira h2 format', () => {
      const description = `Some text.

h2. Technical Notes

* First note
* Second note`;

      const result = extractTechnicalNotes(description);
      expect(result).toEqual(['First note', 'Second note']);
    });

    it('should return empty array if no technical notes section', () => {
      const description = `Just a regular description.
- Some requirement`;

      const result = extractTechnicalNotes(description);
      expect(result).toEqual([]);
    });

    it('should handle empty input', () => {
      expect(extractTechnicalNotes('')).toEqual([]);
      expect(extractTechnicalNotes(null as any)).toEqual([]);
    });

    it('should stop at next section header', () => {
      const description = `**Technical Notes:**
- Tech note 1

**Next Section:**
- Not a tech note`;

      const result = extractTechnicalNotes(description);
      expect(result).toEqual(['Tech note 1']);
    });
  });

  describe('parseDescriptionSections', () => {
    it('should parse full description into structured sections', () => {
      // Jira CSV descriptions use Jira wiki markup (*bold*), not markdown (**bold**)
      const description = `*AS* a developer,
*I WANT* to import Jira tickets,
*SO THAT* I can work offline.

This feature enables offline workflow management.
Users can sync their tickets periodically.

* Must support CSV format
* Should handle large files (1000+ rows)
* Will preserve all metadata

*Technical Notes:*
* Use streaming parser for large files
* Implement progress callback`;

      const result = parseDescriptionSections(description);

      expect(result.asWantSoThat).toEqual({
        asA: 'a developer',
        iWant: 'to import Jira tickets',
        soThat: 'I can work offline',
      });
      expect(result.context).toContain('This feature enables offline workflow management.');
      expect(result.requirements).toContain('Must support CSV format');
      expect(result.technicalNotes).toContain('Use streaming parser for large files');
    });

    it('should handle description with only some sections', () => {
      // Jira wiki markup format
      const description = `*AS* a user, *I WANT* to login, *SO THAT* I can access the app.

* Simple requirement`;

      const result = parseDescriptionSections(description);

      expect(result.asWantSoThat).not.toBeNull();
      expect(result.context).toBe('');
      expect(result.requirements).toEqual(['Simple requirement']);
      expect(result.technicalNotes).toEqual([]);
    });

    it('should handle empty description', () => {
      const result = parseDescriptionSections('');

      expect(result.asWantSoThat).toBeNull();
      expect(result.context).toBe('');
      expect(result.requirements).toEqual([]);
      expect(result.technicalNotes).toEqual([]);
    });
  });
});
