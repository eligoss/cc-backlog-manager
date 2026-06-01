/**
 * Milestone Sanitizer Tests
 *
 * Ported from Python: modules/backlog/src/backlog/milestone_sanitizer.py
 * Tests the milestone name sanitization algorithm that converts Jira milestone
 * names to filesystem-safe filenames.
 *
 * Algorithm:
 * 1. Normalize unicode characters (NFKD → ASCII)
 * 2. Convert to lowercase
 * 3. Remove filesystem-unsafe characters: /\:*?"<>|,&.
 * 4. Replace spaces with hyphens
 * 5. Remove parentheses (keep content)
 * 6. Collapse consecutive hyphens
 * 7. Remove leading/trailing hyphens
 * 8. Handle empty → "untitled"
 * 9. Limit to 200 characters
 * 10. Add .md extension
 */

import { sanitizeMilestoneName, validateMilestoneFilename } from '../milestone-sanitizer';

describe('sanitizeMilestoneName', () => {
  describe('Standard Jira milestone names', () => {
    it('should sanitize "APM-R: App: January 2026 (W51, W1, W3)" to "apm-r-app-january-2026-w51-w1-w3.md"', () => {
      expect(sanitizeMilestoneName('APM-R: App: January 2026 (W51, W1, W3)'))
        .toBe('apm-r-app-january-2026-w51-w1-w3.md');
    });

    it('should sanitize "UC1-MVP" to "uc1-mvp.md"', () => {
      expect(sanitizeMilestoneName('UC1-MVP')).toBe('uc1-mvp.md');
    });

    it('should sanitize "UC2" to "uc2.md"', () => {
      expect(sanitizeMilestoneName('UC2')).toBe('uc2.md');
    });

    it('should sanitize "Demo" to "demo.md"', () => {
      expect(sanitizeMilestoneName('Demo')).toBe('demo.md');
    });

    it('should sanitize "Post-UC2" to "post-uc2.md"', () => {
      expect(sanitizeMilestoneName('Post-UC2')).toBe('post-uc2.md');
    });
  });

  describe('Special characters', () => {
    it('should handle colons and ampersands: "Q1 2026: Planning & Design" → "q1-2026-planning-design.md"', () => {
      expect(sanitizeMilestoneName('Q1 2026: Planning & Design'))
        .toBe('q1-2026-planning-design.md');
    });

    it('should handle colons and parentheses: "APM-R: Performance (Q1)" → "apm-r-performance-q1.md"', () => {
      expect(sanitizeMilestoneName('APM-R: Performance (Q1)'))
        .toBe('apm-r-performance-q1.md');
    });

    it('should handle colons, dots and parentheses: "Release: Version 2.0 (Final)" → "release-version-20-final.md"', () => {
      expect(sanitizeMilestoneName('Release: Version 2.0 (Final)'))
        .toBe('release-version-20-final.md');
    });

    it('should handle parentheses: "Fix bugs (urgent)" → "fix-bugs-urgent.md"', () => {
      expect(sanitizeMilestoneName('Fix bugs (urgent)'))
        .toBe('fix-bugs-urgent.md');
    });

    it('should handle slashes: "Feature: Email/SMS Notifications" → "feature-emailsms-notifications.md"', () => {
      expect(sanitizeMilestoneName('Feature: Email/SMS Notifications'))
        .toBe('feature-emailsms-notifications.md');
    });

    it('should handle backslashes: "Bugfix: Path traversal \\.. issue" → "bugfix-path-traversal-issue.md"', () => {
      expect(sanitizeMilestoneName('Bugfix: Path traversal \\.. issue'))
        .toBe('bugfix-path-traversal-issue.md');
    });

    it('should handle asterisks: "Data * Migration" → "data-migration.md"', () => {
      expect(sanitizeMilestoneName('Data * Migration'))
        .toBe('data-migration.md');
    });
  });

  describe('Whitespace handling', () => {
    it('should collapse multiple spaces: "Multiple   Spaces   Between" → "multiple-spaces-between.md"', () => {
      expect(sanitizeMilestoneName('Multiple   Spaces   Between'))
        .toBe('multiple-spaces-between.md');
    });

    it('should trim leading and trailing whitespace: "  Leading and trailing  " → "leading-and-trailing.md"', () => {
      expect(sanitizeMilestoneName('  Leading and trailing  '))
        .toBe('leading-and-trailing.md');
    });

    it('should handle tabs: "Tab\\tseparated\\tvalues" → "tab-separated-values.md"', () => {
      expect(sanitizeMilestoneName('Tab\tseparated\tvalues'))
        .toBe('tab-separated-values.md');
    });
  });

  describe('Edge cases', () => {
    it('should allow numeric start: "123 Numeric Start" → "123-numeric-start.md"', () => {
      expect(sanitizeMilestoneName('123 Numeric Start'))
        .toBe('123-numeric-start.md');
    });

    it('should handle single uppercase letter: "ONE" → "one.md"', () => {
      expect(sanitizeMilestoneName('ONE')).toBe('one.md');
    });

    it('should handle single letter: "A" → "a.md"', () => {
      expect(sanitizeMilestoneName('A')).toBe('a.md');
    });

    it('should return "untitled.md" for empty string', () => {
      expect(sanitizeMilestoneName('')).toBe('untitled.md');
    });

    it('should return "untitled.md" for whitespace-only string', () => {
      expect(sanitizeMilestoneName('   ')).toBe('untitled.md');
    });

    it('should return "untitled.md" for null', () => {
      expect(sanitizeMilestoneName(null as any)).toBe('untitled.md');
    });

    it('should return "untitled.md" for undefined', () => {
      expect(sanitizeMilestoneName(undefined as any)).toBe('untitled.md');
    });

    it('should truncate names over 200 characters', () => {
      const longName = 'a'.repeat(250);
      const result = sanitizeMilestoneName(longName);
      // Should be exactly 200 chars + ".md" = 203 chars total
      expect(result.length).toBe(203);
      expect(result.endsWith('.md')).toBe(true);
      expect(result.slice(0, -3).length).toBe(200);
    });

    it('should remove trailing hyphens after truncation', () => {
      // Create a string that ends with a hyphen after truncation at 200 chars
      const name = 'a'.repeat(199) + '-' + 'b'.repeat(50);
      const result = sanitizeMilestoneName(name);
      expect(result.endsWith('.md')).toBe(true);
      expect(result.slice(0, -3).endsWith('-')).toBe(false);
    });
  });

  describe('Unicode normalization', () => {
    it('should normalize accented characters: "Café" → "cafe.md"', () => {
      expect(sanitizeMilestoneName('Café')).toBe('cafe.md');
    });

    it('should normalize unicode: "Naïve résumé" → "naive-resume.md"', () => {
      expect(sanitizeMilestoneName('Naïve résumé')).toBe('naive-resume.md');
    });
  });
});

describe('validateMilestoneFilename', () => {
  describe('Valid filenames', () => {
    it('should validate "apm-r-app-january-2026-w51-w1-w3.md"', () => {
      expect(validateMilestoneFilename('apm-r-app-january-2026-w51-w1-w3.md')).toBe(true);
    });

    it('should validate "uc1-mvp.md"', () => {
      expect(validateMilestoneFilename('uc1-mvp.md')).toBe(true);
    });

    it('should validate "demo.md"', () => {
      expect(validateMilestoneFilename('demo.md')).toBe(true);
    });

    it('should validate "123-numeric-start.md"', () => {
      expect(validateMilestoneFilename('123-numeric-start.md')).toBe(true);
    });
  });

  describe('Invalid filenames', () => {
    it('should reject empty string', () => {
      expect(validateMilestoneFilename('')).toBe(false);
    });

    it('should reject missing .md extension', () => {
      expect(validateMilestoneFilename('test')).toBe(false);
    });

    it('should reject uppercase letters', () => {
      expect(validateMilestoneFilename('Test.md')).toBe(false);
    });

    it('should reject consecutive hyphens', () => {
      expect(validateMilestoneFilename('test--file.md')).toBe(false);
    });

    it('should reject leading hyphen', () => {
      expect(validateMilestoneFilename('-test.md')).toBe(false);
    });

    it('should reject trailing hyphen (before .md)', () => {
      expect(validateMilestoneFilename('test-.md')).toBe(false);
    });

    it('should reject slashes', () => {
      expect(validateMilestoneFilename('test/file.md')).toBe(false);
    });

    it('should reject backslashes', () => {
      expect(validateMilestoneFilename('test\\file.md')).toBe(false);
    });

    it('should reject colons', () => {
      expect(validateMilestoneFilename('test:file.md')).toBe(false);
    });

    it('should reject asterisks', () => {
      expect(validateMilestoneFilename('test*file.md')).toBe(false);
    });

    it('should reject question marks', () => {
      expect(validateMilestoneFilename('test?file.md')).toBe(false);
    });

    it('should reject quotes', () => {
      expect(validateMilestoneFilename('test"file.md')).toBe(false);
    });

    it('should reject angle brackets', () => {
      expect(validateMilestoneFilename('test<file>.md')).toBe(false);
    });

    it('should reject pipes', () => {
      expect(validateMilestoneFilename('test|file.md')).toBe(false);
    });

    it('should reject parentheses', () => {
      expect(validateMilestoneFilename('test(file).md')).toBe(false);
    });
  });
});
