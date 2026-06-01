import {
  extractAcceptanceCriteria,
  formatAsJiraWiki,
  formatAsAdf,
  parseJiraAcField,
} from '../acceptance-criteria';

describe('AcceptanceCriteria', () => {
  describe('extractAcceptanceCriteria', () => {
    it('should extract AC section with **Verify** prefix', () => {
      const markdown = `# My Ticket

## Description

Some description here.

## Acceptance Criteria

- **Verify** user can log in
- **Verify** error message displays
- **Verify** session is created

## Other Section

More content.`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([
        'user can log in',
        'error message displays',
        'session is created',
      ]);
    });

    it('should extract AC section with *Verify* prefix', () => {
      const markdown = `## Acceptance Criteria

- *Verify* data is saved
- *Verify* notification appears`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([
        'data is saved',
        'notification appears',
      ]);
    });

    it('should extract AC section with plain Verify prefix', () => {
      const markdown = `## Acceptance Criteria

- Verify authentication works
- Verify validation runs`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([
        'authentication works',
        'validation runs',
      ]);
    });

    it('should handle bullet points with asterisks', () => {
      const markdown = `## Acceptance Criteria

* **Verify** feature A works
* **Verify** feature B works`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([
        'feature A works',
        'feature B works',
      ]);
    });

    it('should handle indented bullet points', () => {
      const markdown = `## Acceptance Criteria

  - **Verify** indented item
    - **Verify** nested item`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([
        'indented item',
        'nested item',
      ]);
    });

    it('should return empty array when no AC section found', () => {
      const markdown = `# My Ticket

## Description

Some description.`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([]);
    });

    it('should return empty array when AC section is empty', () => {
      const markdown = `## Acceptance Criteria

## Other Section`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([]);
    });

    it('should handle case-insensitive section header', () => {
      const markdown = `## acceptance criteria

- **Verify** case insensitive works`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual(['case insensitive works']);
    });

    it('should extract only until next section', () => {
      const markdown = `## Acceptance Criteria

- **Verify** first item
- **Verify** second item

## Next Section

- **Verify** this should not be included`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([
        'first item',
        'second item',
      ]);
    });

    it('should trim whitespace from criteria text', () => {
      const markdown = `## Acceptance Criteria

- **Verify**   extra spaces
- **Verify**  leading and trailing  `;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([
        'extra spaces',
        'leading and trailing',
      ]);
    });

    it('should handle mixed verify formats in same section', () => {
      const markdown = `## Acceptance Criteria

- **Verify** bold verify
- *Verify* italic verify
- Verify plain verify`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([
        'bold verify',
        'italic verify',
        'plain verify',
      ]);
    });

    it('should ignore non-verify bullet points', () => {
      const markdown = `## Acceptance Criteria

- **Verify** this is included
- This is not a verify item
- Another non-verify item
- **Verify** this is also included`;

      const result = extractAcceptanceCriteria(markdown);

      expect(result).toEqual([
        'this is included',
        'this is also included',
      ]);
    });
  });

  describe('formatAsJiraWiki', () => {
    it('should format as wiki checklist with *Verify* prefix', () => {
      const criteria = [
        'user can log in',
        'error message displays',
      ];

      const result = formatAsJiraWiki(criteria);

      expect(result).toBe('* *Verify* user can log in\n* *Verify* error message displays');
    });

    it('should handle empty array', () => {
      const result = formatAsJiraWiki([]);

      expect(result).toBe('');
    });

    it('should handle single criterion', () => {
      const criteria = ['single item'];

      const result = formatAsJiraWiki(criteria);

      expect(result).toBe('* *Verify* single item');
    });

    it('should preserve formatting in criterion text', () => {
      const criteria = [
        'user can access {{code}} section',
        'error message contains "text"',
      ];

      const result = formatAsJiraWiki(criteria);

      expect(result).toContain('user can access {{code}} section');
      expect(result).toContain('error message contains "text"');
    });

    it('should handle multiline criteria', () => {
      const criteria = [
        'first line',
        'second line',
        'third line',
      ];

      const result = formatAsJiraWiki(criteria);

      expect(result).toBe(
        '* *Verify* first line\n* *Verify* second line\n* *Verify* third line'
      );
    });
  });

  describe('formatAsAdf', () => {
    it('should create ADF bullet list structure', () => {
      const criteria = [
        'user can log in',
        'error message displays',
      ];

      const result = formatAsAdf(criteria);

      expect(result).toEqual({
        version: 1,
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
                    content: [
                      {
                        type: 'text',
                        text: 'Verify ',
                        marks: [{ type: 'em' }],
                      },
                      {
                        type: 'text',
                        text: 'user can log in',
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
                    content: [
                      {
                        type: 'text',
                        text: 'Verify ',
                        marks: [{ type: 'em' }],
                      },
                      {
                        type: 'text',
                        text: 'error message displays',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('should handle empty array', () => {
      const result = formatAsAdf([]);

      expect(result).toEqual({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [],
          },
        ],
      });
    });

    it('should handle single criterion', () => {
      const criteria = ['single item'];

      const result = formatAsAdf(criteria);

      expect(result.content[0].content).toHaveLength(1);
      expect(result.content[0].content[0].type).toBe('listItem');
    });

    it('should create valid ADF structure', () => {
      const criteria = ['test item'];

      const result = formatAsAdf(criteria);

      expect(result.version).toBe(1);
      expect(result.type).toBe('doc');
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe('bulletList');
    });
  });

  describe('parseJiraAcField', () => {
    it('should parse Jira wiki format AC', () => {
      const jiraAc = `* *Verify* user can log in
* *Verify* error message displays
* *Verify* session is created`;

      const result = parseJiraAcField(jiraAc);

      expect(result).toEqual([
        'user can log in',
        'error message displays',
        'session is created',
      ]);
    });

    it('should parse plain text format', () => {
      const jiraAc = `* Verify user can log in
* Verify error message displays`;

      const result = parseJiraAcField(jiraAc);

      expect(result).toEqual([
        'user can log in',
        'error message displays',
      ]);
    });

    it('should handle dash bullets', () => {
      const jiraAc = `- *Verify* first item
- *Verify* second item`;

      const result = parseJiraAcField(jiraAc);

      expect(result).toEqual([
        'first item',
        'second item',
      ]);
    });

    it('should handle empty input', () => {
      const result = parseJiraAcField('');

      expect(result).toEqual([]);
    });

    it('should handle null/undefined input', () => {
      expect(parseJiraAcField(null as any)).toEqual([]);
      expect(parseJiraAcField(undefined as any)).toEqual([]);
    });

    it('should trim whitespace from parsed items', () => {
      const jiraAc = `* *Verify*   extra spaces
* *Verify*  more spaces  `;

      const result = parseJiraAcField(jiraAc);

      expect(result).toEqual([
        'extra spaces',
        'more spaces',
      ]);
    });

    it('should ignore non-verify items', () => {
      const jiraAc = `* *Verify* included item
* Regular bullet point
* *Verify* another included item`;

      const result = parseJiraAcField(jiraAc);

      expect(result).toEqual([
        'included item',
        'another included item',
      ]);
    });

    it('should handle different Verify formats', () => {
      const jiraAc = `* *Verify* bold italic
* **Verify** double asterisk
* Verify plain`;

      const result = parseJiraAcField(jiraAc);

      expect(result).toEqual([
        'bold italic',
        'double asterisk',
        'plain',
      ]);
    });
  });

  describe('integration tests', () => {
    it('should support round-trip conversion (extract -> format -> parse)', () => {
      const markdown = `## Acceptance Criteria

- **Verify** user can log in
- **Verify** error message displays`;

      const extracted = extractAcceptanceCriteria(markdown);
      const formatted = formatAsJiraWiki(extracted);
      const parsed = parseJiraAcField(formatted);

      expect(parsed).toEqual(extracted);
    });

    it('should handle complex real-world example', () => {
      const markdown = `# Story Title

## Description

**Context:** This is a story.

## Acceptance Criteria

- **Verify** user authentication succeeds with valid credentials
- **Verify** error message "Invalid credentials" displays for wrong password
- **Verify** session token is stored in localStorage
- **Verify** user is redirected to /dashboard after login

## Technical Notes

Some technical details.`;

      const criteria = extractAcceptanceCriteria(markdown);

      expect(criteria).toHaveLength(4);
      expect(criteria[0]).toBe('user authentication succeeds with valid credentials');

      const wiki = formatAsJiraWiki(criteria);
      expect(wiki).toContain('* *Verify* user authentication');

      const adf = formatAsAdf(criteria);
      expect(adf.content[0].content).toHaveLength(4);
    });
  });
});
