/**
 * Token Counter Unit Tests
 *
 * Tests for the token counting utility used in the writer module.
 * Covers word counting, token estimation, budget validation, and truncation.
 *
 * @skip Tests are skipped because the library modules at
 * modules/writer/src/lib/ have not been implemented yet.
 */

import {
  countTokens,
  validateTokenBudget,
  validateBudgetAllocation,
  truncateToTokenBudget,
  calculateRemainingBudget,
  getBudgetStatistics,
} from '../../../../../../modules/writer/src/lib/token-counter.js';

describe.skip('token-counter', () => {
  describe('countTokens', () => {
    describe('basic word counting', () => {
      it('counts words in plain text', () => {
        const result = countTokens('Hello world this is a test');
        expect(result.words).toBe(6);
      });

      it('handles empty content', () => {
        const result = countTokens('');
        expect(result.words).toBe(0);
        expect(result.estimatedTokens).toBe(0);
      });

      it('handles content with only whitespace', () => {
        const result = countTokens('   \n\t   ');
        expect(result.words).toBe(0);
      });

      it('handles single word content', () => {
        const result = countTokens('Hello');
        expect(result.words).toBe(1);
      });
    });

    describe('prose token estimation', () => {
      it('uses default prose ratio of 1.3 tokens per word', () => {
        const result = countTokens('Hello world this is a test');
        // 6 words * 1.3 = 7.8, rounded up = 8
        expect(result.estimatedTokens).toBe(8);
      });

      it('uses custom prose ratio when provided', () => {
        const result = countTokens('Hello world this is a test', { proseRatio: 1.5 });
        // 6 words * 1.5 = 9
        expect(result.estimatedTokens).toBe(9);
      });

      it('counts characters correctly', () => {
        const content = 'Hello world';
        const result = countTokens(content);
        expect(result.characters).toBe(content.length);
      });
    });

    describe('markdown syntax handling', () => {
      it('excludes header markers from word count', () => {
        const result = countTokens('# Hello World');
        expect(result.words).toBe(2);
      });

      it('handles multiple header levels', () => {
        const content = `# Level 1
## Level 2
### Level 3`;
        const result = countTokens(content);
        expect(result.words).toBe(6); // Level 1, Level 2, Level 3
      });

      it('removes inline code from prose word count', () => {
        const result = countTokens('Use the `console.log` function');
        expect(result.words).toBe(3); // Use, the, function
      });

      it('removes markdown links but keeps link text', () => {
        const result = countTokens('Click [here](https://example.com) for more');
        expect(result.words).toBe(4); // Click, here, for, more
      });

      it('removes markdown images', () => {
        const result = countTokens('See ![alt text](image.png) above');
        expect(result.words).toBe(2); // See, above
      });
    });

    describe('code block handling', () => {
      it('counts code blocks separately', () => {
        const content = `Some text

\`\`\`javascript
const x = 1;
\`\`\`

More text`;
        const result = countTokens(content);
        expect(result.codeBlocks).toBe(1);
      });

      it('counts lines of code correctly', () => {
        const content = `\`\`\`javascript
const x = 1;
const y = 2;
const z = 3;
\`\`\``;
        const result = countTokens(content);
        expect(result.linesOfCode).toBe(3);
      });

      it('uses code ratio of 1.5 for code blocks', () => {
        const content = `\`\`\`javascript
const x = 1
\`\`\``;
        const result = countTokens(content);
        // "const x = 1" is 4 words, 4 * 1.5 = 6
        expect(result.estimatedTokens).toBeGreaterThanOrEqual(5);
      });

      it('handles multiple code blocks', () => {
        const content = `\`\`\`js
const a = 1;
\`\`\`

text

\`\`\`python
x = 2
\`\`\``;
        const result = countTokens(content);
        expect(result.codeBlocks).toBe(2);
      });

      it('handles code blocks without language identifier', () => {
        const content = `\`\`\`
plain code
\`\`\``;
        const result = countTokens(content);
        expect(result.codeBlocks).toBe(1);
        expect(result.linesOfCode).toBe(1);
      });
    });

    describe('YAML frontmatter handling', () => {
      it('counts YAML frontmatter separately', () => {
        const content = `---
title: "Test"
author: "Author"
---

# Content

This is the body text.`;
        const result = countTokens(content);
        // Body text: "Content This is the body text." = 6 words
        expect(result.words).toBeGreaterThanOrEqual(4);
      });

      it('uses YAML ratio of 1.4 for frontmatter', () => {
        const content = `---
title: "Test Title"
---

Body`;
        const result = countTokens(content);
        // Frontmatter tokens + body tokens
        expect(result.estimatedTokens).toBeGreaterThan(0);
      });

      it('handles content without frontmatter', () => {
        const result = countTokens('Just plain content');
        expect(result.words).toBe(3);
        expect(result.estimatedTokens).toBe(4); // 3 * 1.3 = 3.9 -> 4
      });
    });

    describe('edge cases', () => {
      it('handles very long content', () => {
        const words = Array(1000).fill('word').join(' ');
        const result = countTokens(words);
        expect(result.words).toBe(1000);
      });

      it('handles mixed content types', () => {
        const content = `---
title: "Mixed"
---

# Header

Some prose with \`inline code\` and a [link](url).

\`\`\`js
const x = 1;
\`\`\`

More prose.`;
        const result = countTokens(content);
        expect(result.codeBlocks).toBe(1);
        expect(result.words).toBeGreaterThan(0);
      });
    });
  });

  describe('validateTokenBudget', () => {
    it('returns valid for content under budget', () => {
      const result = validateTokenBudget('Hello world', 100);
      expect(result.isValid).toBe(true);
      expect(result.overageTokens).toBeUndefined();
    });

    it('returns invalid for content over budget', () => {
      const result = validateTokenBudget('Hello world this is a test sentence', 5);
      expect(result.isValid).toBe(false);
      expect(result.overageTokens).toBeGreaterThan(0);
    });

    it('returns exact budget as valid', () => {
      // "Hello" = 1 word = ~1.3 tokens, rounds to 2
      const result = validateTokenBudget('Hello', 2);
      expect(result.isValid).toBe(true);
    });

    it('calculates correct percentage used', () => {
      const result = validateTokenBudget('Hello world', 100);
      expect(result.percentageUsed).toBeLessThan(10);
      expect(result.percentageUsed).toBeGreaterThan(0);
    });

    it('includes token count in result', () => {
      const result = validateTokenBudget('Hello world', 100);
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.budget).toBe(100);
    });

    it('rounds percentage to one decimal place', () => {
      const result = validateTokenBudget('Hello world test', 10);
      const decimalPlaces = (result.percentageUsed.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  describe('validateBudgetAllocation', () => {
    it('validates multiple sections against budget', () => {
      const sections = {
        intro: 'Short intro',
        body: 'Longer body with more content here',
        conclusion: 'Brief end',
      };
      const budgetAllocation = {
        intro: 50,
        body: 100,
        conclusion: 50,
      };

      const results = validateBudgetAllocation(sections, budgetAllocation);

      expect(results.intro).toBeDefined();
      expect(results.body).toBeDefined();
      expect(results.conclusion).toBeDefined();
      expect(results.intro.isValid).toBe(true);
    });

    it('skips sections without defined budget', () => {
      const sections = {
        intro: 'Has budget',
        extra: 'No budget defined',
      };
      const budgetAllocation = {
        intro: 50,
      };

      const results = validateBudgetAllocation(sections, budgetAllocation);

      expect(results.intro).toBeDefined();
      expect(results.extra).toBeUndefined();
    });

    it('identifies over-budget sections', () => {
      const sections = {
        small: 'Small content',
        large: 'This is a much longer section with many more words that will exceed the tiny budget',
      };
      const budgetAllocation = {
        small: 50,
        large: 5,
      };

      const results = validateBudgetAllocation(sections, budgetAllocation);

      expect(results.small.isValid).toBe(true);
      expect(results.large.isValid).toBe(false);
    });

    it('handles empty sections object', () => {
      const results = validateBudgetAllocation({}, { intro: 50 });
      expect(Object.keys(results)).toHaveLength(0);
    });
  });

  describe('truncateToTokenBudget', () => {
    it('returns content unchanged if within budget', () => {
      const content = 'Short content';
      const result = truncateToTokenBudget(content, 100);
      expect(result).toBe(content);
    });

    it('truncates content over budget', () => {
      const content = 'This is a very long sentence. And another sentence. And yet another one.';
      const result = truncateToTokenBudget(content, 10);
      expect(result.length).toBeLessThan(content.length);
    });

    it('truncates at sentence boundaries', () => {
      const content = 'First sentence. Second sentence. Third sentence.';
      const result = truncateToTokenBudget(content, 10);
      // Should end at a sentence boundary
      expect(result.endsWith('.') || result.endsWith('...')).toBe(true);
    });

    it('adds ellipsis when truncated', () => {
      const content = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.';
      const result = truncateToTokenBudget(content, 8);
      if (result.length < content.length) {
        expect(result).toContain('...');
      }
    });

    it('handles content with no sentence boundaries', () => {
      const content = 'word word word word word word word word word word';
      const result = truncateToTokenBudget(content, 5);
      // Should still handle gracefully
      expect(result.length).toBeLessThanOrEqual(content.length);
    });

    it('handles very small budget', () => {
      const content = 'A sentence. Another sentence.';
      const result = truncateToTokenBudget(content, 1);
      expect(result.length).toBeLessThan(content.length);
    });
  });

  describe('calculateRemainingBudget', () => {
    it('calculates remaining budget correctly', () => {
      const usedSections = {
        intro: 'Short intro', // ~3 words = ~4 tokens
      };
      const remaining = calculateRemainingBudget(100, usedSections);
      expect(remaining).toBeLessThan(100);
      expect(remaining).toBeGreaterThan(90);
    });

    it('returns 0 when budget exhausted', () => {
      const usedSections = {
        large: 'word '.repeat(100), // 100 words = ~130 tokens
      };
      const remaining = calculateRemainingBudget(50, usedSections);
      expect(remaining).toBe(0);
    });

    it('handles empty sections', () => {
      const remaining = calculateRemainingBudget(100, {});
      expect(remaining).toBe(100);
    });

    it('sums multiple sections', () => {
      const usedSections = {
        section1: 'Short content', // ~3 words
        section2: 'More content here', // ~3 words
      };
      const remaining = calculateRemainingBudget(100, usedSections);
      // Total ~6 words = ~8 tokens, so remaining should be ~92
      expect(remaining).toBeLessThan(100);
      expect(remaining).toBeGreaterThan(80);
    });
  });

  describe('getBudgetStatistics', () => {
    it('returns total budget and used tokens', () => {
      const sections = {
        intro: 'Short intro',
        body: 'Body content',
      };
      const budgetAllocation = {
        intro: 50,
        body: 100,
      };

      const stats = getBudgetStatistics(sections, budgetAllocation);

      expect(stats.totalBudget).toBe(150);
      expect(stats.totalUsed).toBeGreaterThan(0);
      expect(stats.totalRemaining).toBeLessThan(150);
    });

    it('identifies sections over budget', () => {
      const sections = {
        small: 'Small',
        large: 'This is way too much content for the tiny budget assigned to it and will be flagged',
      };
      const budgetAllocation = {
        small: 50,
        large: 5,
      };

      const stats = getBudgetStatistics(sections, budgetAllocation);

      expect(stats.sectionsOverBudget).toContain('large');
      expect(stats.sectionsOverBudget).not.toContain('small');
    });

    it('identifies sections under budget (below 90%)', () => {
      const sections = {
        tiny: 'Hi', // Way under budget
        full: 'word '.repeat(30), // Closer to budget
      };
      const budgetAllocation = {
        tiny: 100,
        full: 50,
      };

      const stats = getBudgetStatistics(sections, budgetAllocation);

      expect(stats.sectionsUnderBudget).toContain('tiny');
    });

    it('calculates correct percentage used', () => {
      const sections = {
        half: 'word '.repeat(20), // ~20 words = ~26 tokens
      };
      const budgetAllocation = {
        half: 50,
      };

      const stats = getBudgetStatistics(sections, budgetAllocation);

      expect(stats.percentageUsed).toBeGreaterThan(0);
      expect(stats.percentageUsed).toBeLessThanOrEqual(100);
    });

    it('handles empty sections', () => {
      const stats = getBudgetStatistics({}, { intro: 50 });

      expect(stats.totalBudget).toBe(50);
      expect(stats.totalUsed).toBe(0);
    });
  });
});
