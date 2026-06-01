/**
 * Summarizer Unit Tests
 *
 * Tests for content summarization utilities.
 * Covers frontmatter extraction, first paragraph fallback, and token truncation.
 *
 * @skip Tests are skipped because the library modules at
 * modules/writer/src/lib/ have not been implemented yet.
 */

import {
  extractSummary,
  extractSummaries,
  combineSummaries,
  extractCharacterState,
  extractActiveTensions,
  extractImmediateContext,
  formatImmediateContext,
  extractPOVState,
} from '../../../../../../modules/writer/src/lib/summarizer.js';

describe.skip('summarizer', () => {
  describe('extractSummary', () => {
    it('extracts summary from frontmatter', () => {
      const content = `---
title: Test Document
summary: This is the frontmatter summary.
---

# Content

Some body text here.`;

      const result = extractSummary(content);

      expect(result.summary).toBe('This is the frontmatter summary.');
      expect(result.source).toBe('frontmatter');
      expect(result.truncated).toBe(false);
    });

    it('falls back to first paragraph when no frontmatter summary', () => {
      const content = `---
title: "Test Document"
---

# Heading

This is the first paragraph that should be extracted as summary.

This is the second paragraph.`;

      const result = extractSummary(content);

      expect(result.summary).toBe('This is the first paragraph that should be extracted as summary.');
      expect(result.source).toBe('first-paragraph');
    });

    it('returns empty when no summary and fallback disabled', () => {
      const content = `---
title: "Test Document"
---

# Heading

Content here.`;

      const result = extractSummary(content, { fallbackToFirstParagraph: false });

      expect(result.summary).toBe('');
      expect(result.source).toBe('none');
    });

    it('handles content without frontmatter', () => {
      const content = `# Heading

This is the first paragraph.

Second paragraph.`;

      const result = extractSummary(content);

      expect(result.summary).toBe('This is the first paragraph.');
      expect(result.source).toBe('first-paragraph');
    });

    it('truncates summary to maxTokens', () => {
      const longSummary = 'word '.repeat(500); // Very long summary
      const content = `---
summary: "${longSummary}"
---

Content.`;

      const result = extractSummary(content, { maxTokens: 50 });

      expect(result.truncated).toBe(true);
      expect(result.source).toBe('truncated');
      expect(result.tokenCount).toBeLessThanOrEqual(50);
    });

    it('includes title when requested', () => {
      const content = `---
title: My Title
summary: This is the summary.
---

Content.`;

      const result = extractSummary(content, { includeTitle: true });

      expect(result.summary).toContain('**My Title**');
      expect(result.summary).toContain('This is the summary.');
    });

    it('extracts title from first header when no frontmatter title', () => {
      const content = `---
summary: "The summary text."
---

# Header Title

Content.`;

      const result = extractSummary(content, { includeTitle: true });

      expect(result.summary).toContain('**Header Title**');
    });

    it('handles empty content', () => {
      const result = extractSummary('');

      expect(result.summary).toBe('');
      expect(result.source).toBe('none');
    });

    it('handles content with only frontmatter', () => {
      const content = `---
title: Only Frontmatter
---

`;

      const result = extractSummary(content);

      // With only frontmatter and no body content, summary should be empty or none
      expect(result.source).toBe('none');
    });

    it('handles multi-line frontmatter values', () => {
      const content = `---
title: "Test"
summary: "First line
second line of summary."
---

Content.`;

      const result = extractSummary(content);

      expect(result.summary).toContain('First line');
      expect(result.summary).toContain('second line');
    });

    it('reports correct token count', () => {
      const content = `---
summary: "This is a short summary."
---

Content.`;

      const result = extractSummary(content);

      expect(result.tokenCount).toBeGreaterThan(0);
      expect(typeof result.tokenCount).toBe('number');
    });

    it('skips headers when extracting first paragraph', () => {
      const content = `---
title: "Test"
---

# Main Heading

## Subheading

This should be the summary paragraph.

Next paragraph.`;

      const result = extractSummary(content);

      expect(result.summary).toBe('This should be the summary paragraph.');
    });
  });

  describe('extractSummaries', () => {
    it('extracts summaries from multiple files', () => {
      const files = {
        'file1.md': `---
summary: Summary of file 1.
---

Content 1.`,
        'file2.md': `---
summary: Summary of file 2.
---

Content 2.`,
      };

      const result = extractSummaries(files);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['file1.md'].summary).toBe('Summary of file 1.');
      expect(result['file2.md'].summary).toBe('Summary of file 2.');
    });

    it('applies options to all files', () => {
      const longSummary = 'word '.repeat(500);
      const files = {
        'file1.md': `---
summary: "${longSummary}"
---

Content.`,
      };

      const result = extractSummaries(files, { maxTokens: 50 });

      expect(result['file1.md'].truncated).toBe(true);
    });

    it('handles empty files map', () => {
      const result = extractSummaries({});

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('combineSummaries', () => {
    it('combines multiple summaries with separator', () => {
      const summaries = [
        'First summary.',
        'Second summary.',
        'Third summary.',
      ];

      const result = combineSummaries(summaries);

      expect(result.summary).toContain('First summary.');
      expect(result.summary).toContain('Second summary.');
      expect(result.summary).toContain('Third summary.');
    });

    it('uses custom separator', () => {
      const summaries = ['A', 'B', 'C'];

      const result = combineSummaries(summaries, { separator: ' | ' });

      expect(result.summary).toBe('A | B | C');
    });

    it('adds prefix to combined summary', () => {
      const summaries = ['Summary 1', 'Summary 2'];

      const result = combineSummaries(summaries, { prefix: '# Summaries\n\n' });

      expect(result.summary).toMatch(/^# Summaries/);
    });

    it('truncates combined summary to maxTokens', () => {
      const summaries = Array(20).fill('This is a long summary text that adds up.');

      const result = combineSummaries(summaries, { maxTokens: 50 });

      expect(result.truncated).toBe(true);
      expect(result.tokenCount).toBeLessThanOrEqual(50);
    });

    it('filters empty summaries', () => {
      const summaries = ['First', '', '  ', 'Last'];

      const result = combineSummaries(summaries);

      expect(result.summary).toBe('First\n\nLast');
    });

    it('reports token count', () => {
      const summaries = ['Short summary.'];

      const result = combineSummaries(summaries);

      expect(result.tokenCount).toBeGreaterThan(0);
    });
  });

  describe('extractCharacterState', () => {
    it('extracts all character state fields', () => {
      const prerequisites = {
        'character-states': {
          protagonist: {
            location: 'Castle courtyard',
            physical: 'Wounded but stable',
            emotional: 'Determined',
            status: 'Preparing for battle',
            'current-goal': 'Rescue the princess',
          },
        },
      };

      const result = extractCharacterState(prerequisites, 'protagonist');

      expect(result).toContain('Location: Castle courtyard');
      expect(result).toContain('Physical: Wounded but stable');
      expect(result).toContain('Emotional: Determined');
      expect(result).toContain('Status: Preparing for battle');
      expect(result).toContain('Goal: Rescue the princess');
    });

    it('returns null for missing character', () => {
      const prerequisites = {
        'character-states': {
          protagonist: { location: 'Castle' },
        },
      };

      const result = extractCharacterState(prerequisites, 'antagonist');

      expect(result).toBeNull();
    });

    it('returns null for missing prerequisites', () => {
      const result = extractCharacterState(null, 'protagonist');

      expect(result).toBeNull();
    });

    it('returns null for missing character-states', () => {
      const prerequisites = { other: 'data' };

      const result = extractCharacterState(prerequisites, 'protagonist');

      expect(result).toBeNull();
    });

    it('handles partial character state', () => {
      const prerequisites = {
        'character-states': {
          protagonist: {
            location: 'Castle',
            emotional: 'Happy',
          },
        },
      };

      const result = extractCharacterState(prerequisites, 'protagonist');

      expect(result).toContain('Location: Castle');
      expect(result).toContain('Emotional: Happy');
      expect(result).not.toContain('Physical:');
    });
  });

  describe('extractActiveTensions', () => {
    it('extracts active tensions array', () => {
      const prerequisites = {
        'active-tensions': [
          'Will the hero arrive in time?',
          'Can the villain be trusted?',
        ],
      };

      const result = extractActiveTensions(prerequisites);

      expect(result).toHaveLength(2);
      expect(result).toContain('Will the hero arrive in time?');
      expect(result).toContain('Can the villain be trusted?');
    });

    it('returns empty array for missing tensions', () => {
      const prerequisites = { other: 'data' };

      const result = extractActiveTensions(prerequisites);

      expect(result).toEqual([]);
    });

    it('returns empty array for null prerequisites', () => {
      const result = extractActiveTensions(null);

      expect(result).toEqual([]);
    });
  });

  describe('extractImmediateContext', () => {
    it('extracts immediate context fields', () => {
      const prerequisites = {
        immediate: {
          time: 'Dawn',
          location: 'Mountain pass',
          weather: 'Foggy',
          lighting: 'Dim',
        },
        mood: 'Tense',
      };

      const result = extractImmediateContext(prerequisites);

      expect(result.time).toBe('Dawn');
      expect(result.location).toBe('Mountain pass');
      expect(result.weather).toBe('Foggy');
      expect(result.lighting).toBe('Dim');
      expect(result.mood).toBe('Tense');
    });

    it('handles missing fields gracefully', () => {
      const prerequisites = {
        immediate: {
          time: 'Noon',
        },
      };

      const result = extractImmediateContext(prerequisites);

      expect(result.time).toBe('Noon');
      expect(result.location).toBeUndefined();
      expect(result.weather).toBeUndefined();
    });

    it('handles null prerequisites', () => {
      const result = extractImmediateContext(null);

      expect(result.time).toBeUndefined();
      expect(result.location).toBeUndefined();
    });
  });

  describe('formatImmediateContext', () => {
    it('formats time and location together', () => {
      const prerequisites = {
        immediate: {
          time: 'Dawn',
          location: 'Castle gates',
        },
      };

      const result = formatImmediateContext(prerequisites);

      expect(result).toBe('Dawn at Castle gates');
    });

    it('formats time only', () => {
      const prerequisites = {
        immediate: {
          time: 'Midnight',
        },
      };

      const result = formatImmediateContext(prerequisites);

      expect(result).toBe('Midnight');
    });

    it('formats location only', () => {
      const prerequisites = {
        immediate: {
          location: 'Forest clearing',
        },
      };

      const result = formatImmediateContext(prerequisites);

      expect(result).toBe('Forest clearing');
    });

    it('includes weather and lighting', () => {
      const prerequisites = {
        immediate: {
          time: 'Noon',
          location: 'Beach',
          weather: 'Sunny',
          lighting: 'Bright',
        },
      };

      const result = formatImmediateContext(prerequisites);

      expect(result).toContain('Noon at Beach');
      expect(result).toContain('Weather: Sunny');
      expect(result).toContain('Lighting: Bright');
    });

    it('includes mood', () => {
      const prerequisites = {
        immediate: { time: 'Evening' },
        mood: 'Melancholic',
      };

      const result = formatImmediateContext(prerequisites);

      expect(result).toContain('Mood: Melancholic');
    });

    it('returns empty string for null prerequisites', () => {
      const result = formatImmediateContext(null);

      expect(result).toBe('');
    });
  });

  describe('extractPOVState', () => {
    it('extracts all POV state fields', () => {
      const prerequisites = {
        'pov-state': {
          'current-thought': 'I must save her',
          'current-fear': 'Being too late',
          'physical-sensation': 'Heart pounding',
        },
      };

      const result = extractPOVState(prerequisites);

      expect(result).toContain('Thinking: I must save her');
      expect(result).toContain('Fear: Being too late');
      expect(result).toContain('Sensation: Heart pounding');
    });

    it('returns null for missing pov-state', () => {
      const prerequisites = { other: 'data' };

      const result = extractPOVState(prerequisites);

      expect(result).toBeNull();
    });

    it('returns null for null prerequisites', () => {
      const result = extractPOVState(null);

      expect(result).toBeNull();
    });

    it('handles partial POV state', () => {
      const prerequisites = {
        'pov-state': {
          'current-thought': 'Focus on the task',
        },
      };

      const result = extractPOVState(prerequisites);

      expect(result).toContain('Thinking: Focus on the task');
      expect(result).not.toContain('Fear:');
    });

    it('returns null for empty pov-state object', () => {
      const prerequisites = {
        'pov-state': {},
      };

      const result = extractPOVState(prerequisites);

      expect(result).toBeNull();
    });
  });
});
