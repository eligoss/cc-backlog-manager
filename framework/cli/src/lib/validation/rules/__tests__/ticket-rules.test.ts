/**
 * Unit tests for ticket validation rules
 *
 * @module lib/validation/rules/__tests__/ticket-rules.test
 */

import {
  validateTicketRules,
  validateTicketReferences,
  TicketData,
} from '../ticket-rules.js';

describe('Ticket Rules', () => {
  const testFilePath = '/test/backlog/tickets/STORY-001.md';

  describe('validateTicketRules', () => {
    describe('acceptance criteria validation', () => {
      it('should error when story lacks acceptance criteria section', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
        };
        const content = `
## Description

This is a test story.
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const acIssue = issues.find((i) => i.code === 'MISSING_ACCEPTANCE_CRITERIA');
        expect(acIssue).toBeDefined();
        expect(acIssue?.severity).toBe('error');
      });

      it('should error when task lacks acceptance criteria section', () => {
        const data: TicketData = {
          documentType: 'task',
          title: 'Test Task',
        };
        const content = `
## Description

This is a test task.
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const acIssue = issues.find((i) => i.code === 'MISSING_ACCEPTANCE_CRITERIA');
        expect(acIssue).toBeDefined();
      });

      it('should not check acceptance criteria for bugs', () => {
        const data: TicketData = {
          documentType: 'bug',
          title: 'Test Bug',
        };
        const content = `
## Description

This is a bug.

**Steps to Reproduce:**
1. Do this
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const acIssue = issues.find((i) => i.code === 'MISSING_ACCEPTANCE_CRITERIA');
        expect(acIssue).toBeUndefined();
      });

      it('should warn when fewer than 3 acceptance criteria', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
        };
        const content = `
## Description

This is a test story.

## Acceptance Criteria

* **Verify** something works
* **Verify** another thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const insufficientAc = issues.find(
          (i) => i.code === 'INSUFFICIENT_ACCEPTANCE_CRITERIA'
        );
        expect(insufficientAc).toBeDefined();
        expect(insufficientAc?.severity).toBe('warning');
      });

      it('should not warn when sufficient acceptance criteria exist', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
        };
        const content = `
## Description

This is a test story.

## Acceptance Criteria

* **Verify** criterion 1
* **Verify** criterion 2
* **Verify** criterion 3
* **Verify** criterion 4
* **Verify** criterion 5
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const insufficientAc = issues.find(
          (i) => i.code === 'INSUFFICIENT_ACCEPTANCE_CRITERIA'
        );
        expect(insufficientAc).toBeUndefined();
      });
    });

    describe('bug reproduction steps validation', () => {
      it('should error when bug lacks reproduction steps', () => {
        const data: TicketData = {
          documentType: 'bug',
          title: 'Test Bug',
        };
        const content = `
## Description

Something is broken.
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const reproIssue = issues.find((i) => i.code === 'MISSING_REPRODUCTION_STEPS');
        expect(reproIssue).toBeDefined();
        expect(reproIssue?.severity).toBe('error');
      });

      it('should not error when bug has Steps to Reproduce section', () => {
        const data: TicketData = {
          documentType: 'bug',
          title: 'Test Bug',
        };
        const content = `
## Description

Something is broken.

## Steps to Reproduce
1. Do this
2. Do that
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const reproIssue = issues.find((i) => i.code === 'MISSING_REPRODUCTION_STEPS');
        expect(reproIssue).toBeUndefined();
      });

      it('should not error when bug has inline steps to reproduce', () => {
        const data: TicketData = {
          documentType: 'bug',
          title: 'Test Bug',
        };
        const content = `
## Description

Something is broken.

**Steps to Reproduce:**
1. Do this
2. Do that
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const reproIssue = issues.find((i) => i.code === 'MISSING_REPRODUCTION_STEPS');
        expect(reproIssue).toBeUndefined();
      });
    });

    describe('epic validation', () => {
      it('should warn when epic lacks goals section', () => {
        const data: TicketData = {
          documentType: 'epic',
          title: 'Test Epic',
        };
        const content = `
## Description

This is an epic.
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const goalsIssue = issues.find((i) => i.code === 'MISSING_EPIC_GOALS');
        expect(goalsIssue).toBeDefined();
        expect(goalsIssue?.severity).toBe('warning');
      });

      it('should not warn when epic has Goals section', () => {
        const data: TicketData = {
          documentType: 'epic',
          title: 'Test Epic',
        };
        const content = `
## Description

This is an epic.

**Goals:**
- Goal 1
- Goal 2
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const goalsIssue = issues.find((i) => i.code === 'MISSING_EPIC_GOALS');
        expect(goalsIssue).toBeUndefined();
      });

      it('should not warn when epic has Business Value section', () => {
        const data: TicketData = {
          documentType: 'epic',
          title: 'Test Epic',
        };
        const content = `
## Description

This is an epic.

**Business Value:**
- Value 1
- Value 2
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const goalsIssue = issues.find((i) => i.code === 'MISSING_EPIC_GOALS');
        expect(goalsIssue).toBeUndefined();
      });
    });

    describe('title validation', () => {
      it('should warn when title exceeds 100 characters', () => {
        const data: TicketData = {
          documentType: 'story',
          title:
            'This is a very long title that exceeds one hundred characters and should trigger a warning for being too long',
        };
        const content = `
## Description
Description.

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const titleIssue = issues.find((i) => i.code === 'TITLE_TOO_LONG');
        expect(titleIssue).toBeDefined();
        expect(titleIssue?.severity).toBe('warning');
      });

      it('should not warn when title is under 100 characters', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'A reasonable length title',
        };
        const content = `
## Description
Description.

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const titleIssue = issues.find((i) => i.code === 'TITLE_TOO_LONG');
        expect(titleIssue).toBeUndefined();
      });
    });

    describe('description validation', () => {
      it('should warn when description is too short', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
          description: 'Short',
        };
        const content = `
## Description
Short.

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const descIssue = issues.find((i) => i.code === 'DESCRIPTION_TOO_SHORT');
        expect(descIssue).toBeDefined();
      });

      it('should not warn when description is adequate', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
          description: 'This is a proper description with enough detail to be useful.',
        };
        const content = `
## Description
Details here.

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const descIssue = issues.find((i) => i.code === 'DESCRIPTION_TOO_SHORT');
        expect(descIssue).toBeUndefined();
      });
    });

    describe('description section validation', () => {
      it('should error when missing Description section', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
        };
        const content = `
## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const descSectionIssue = issues.find(
          (i) => i.code === 'MISSING_DESCRIPTION_SECTION'
        );
        expect(descSectionIssue).toBeDefined();
        expect(descSectionIssue?.severity).toBe('error');
      });
    });

    describe('user story format validation', () => {
      it('should warn when story lacks user story format', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
        };
        const content = `
## Description

This story does something.

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const userStoryIssue = issues.find(
          (i) => i.code === 'MISSING_USER_STORY_FORMAT'
        );
        expect(userStoryIssue).toBeDefined();
      });

      it('should not warn when story has user story format', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
        };
        const content = `
## Description

**AS** a developer
**I WANT** to test this feature
**SO THAT** I can verify it works

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const userStoryIssue = issues.find(
          (i) => i.code === 'MISSING_USER_STORY_FORMAT'
        );
        expect(userStoryIssue).toBeUndefined();
      });
    });

    describe('jira integration validation', () => {
      it('should error when ticket has jira-ticketId but no jira-url', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
          'jira-ticketId': 'STORY-123',
        };
        const content = `
## Description
Description.

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const urlIssue = issues.find((i) => i.code === 'MISSING_JIRA_URL');
        expect(urlIssue).toBeDefined();
        expect(urlIssue?.severity).toBe('error');
      });

      it('should warn when exported ticket lacks exportedDate', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
          'jira-ticketId': 'STORY-123',
          'jira-url': 'https://example.atlassian.net/browse/STORY-123',
        };
        const content = `
## Description
Description.

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const exportDateIssue = issues.find((i) => i.code === 'MISSING_EXPORTED_DATE');
        expect(exportDateIssue).toBeDefined();
        expect(exportDateIssue?.severity).toBe('warning');
      });
    });

    describe('code snippets validation', () => {
      it('should warn when ticket contains code blocks', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
        };
        const content = `
## Description

Here is some code:

\`\`\`typescript
const x = 1;
\`\`\`

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const codeIssue = issues.find((i) => i.code === 'CODE_SNIPPETS_FOUND');
        expect(codeIssue).toBeDefined();
        expect(codeIssue?.severity).toBe('warning');
      });
    });

    describe('story points validation', () => {
      it('should warn when epic has story points', () => {
        const data: TicketData = {
          documentType: 'epic',
          title: 'Test Epic',
          storyPoints: 5,
        };
        const content = `
## Description
Description.

**Goals:**
- Goal 1
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const pointsIssue = issues.find((i) => i.code === 'INVALID_STORY_POINTS');
        expect(pointsIssue).toBeDefined();
      });

      it('should warn when bug has story points', () => {
        const data: TicketData = {
          documentType: 'bug',
          title: 'Test Bug',
          storyPoints: 3,
        };
        const content = `
## Description
Description.

**Steps to Reproduce:**
1. Step 1
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const pointsIssue = issues.find((i) => i.code === 'INVALID_STORY_POINTS');
        expect(pointsIssue).toBeDefined();
      });

      it('should not warn when story has story points', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
          storyPoints: 5,
        };
        const content = `
## Description
Description.

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const pointsIssue = issues.find((i) => i.code === 'INVALID_STORY_POINTS');
        expect(pointsIssue).toBeUndefined();
      });
    });

    describe('label format validation', () => {
      it('should warn when label is not kebab-case', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
          labels: ['ValidLabel', 'not_valid', 'Valid-But-Uppercase'],
        };
        const content = `
## Description
Description.

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const labelIssues = issues.filter((i) => i.code === 'INVALID_LABEL_FORMAT');
        expect(labelIssues.length).toBe(3);
      });

      it('should not warn when labels are valid kebab-case', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
          labels: ['valid-label', 'another-one', 'label123'],
        };
        const content = `
## Description
Description.

## Acceptance Criteria
* **Verify** thing
`;

        const issues = validateTicketRules(data, content, testFilePath);

        const labelIssues = issues.filter((i) => i.code === 'INVALID_LABEL_FORMAT');
        expect(labelIssues).toHaveLength(0);
      });
    });

    describe('content length validation', () => {
      it('should info when epic is too long', () => {
        const data: TicketData = {
          documentType: 'epic',
          title: 'Test Epic',
        };

        // Create content with more than 100 lines
        const lines = ['## Description', '', 'Epic content.', '', '**Goals:**', '- Goal 1'];
        for (let i = 0; i < 100; i++) {
          lines.push(`Line ${i}`);
        }
        const content = lines.join('\n');

        const issues = validateTicketRules(data, content, testFilePath);

        const lengthIssue = issues.find((i) => i.code === 'EPIC_TOO_LONG');
        expect(lengthIssue).toBeDefined();
        expect(lengthIssue?.severity).toBe('info');
      });
    });
  });

  describe('validateTicketReferences', () => {
    describe('cross-repo reference validation', () => {
      it('should warn when cross-repo references in body', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
        };
        const content = `
## Description

See @other-repo/path/to/file for more info.
`;

        const issues = validateTicketReferences(data, content, testFilePath);

        const crossRepoIssue = issues.find((i) => i.code === 'CROSS_REPO_IN_BODY');
        expect(crossRepoIssue).toBeDefined();
      });

      it('should not warn when no cross-repo references in body', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
          'framework-documentation': '@other-repo/path/to/file',
        };
        const content = `
## Description

See the documentation for more info.
`;

        const issues = validateTicketReferences(data, content, testFilePath);

        const crossRepoIssue = issues.find((i) => i.code === 'CROSS_REPO_IN_BODY');
        expect(crossRepoIssue).toBeUndefined();
      });
    });

    describe('jira URL format validation', () => {
      it('should warn when jira URL is not proper Atlassian format', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
        };
        const content = `
## Description

Related to [STORY-123](https://jira.example.com/STORY-123).
`;

        const issues = validateTicketReferences(data, content, testFilePath);

        const urlIssue = issues.find((i) => i.code === 'INVALID_JIRA_URL');
        expect(urlIssue).toBeDefined();
      });

      it('should not warn when jira URL uses Atlassian format', () => {
        const data: TicketData = {
          documentType: 'story',
          title: 'Test Story',
        };
        const content = `
## Description

Related to [STORY-123](https://example.atlassian.net/browse/STORY-123).
`;

        const issues = validateTicketReferences(data, content, testFilePath);

        const urlIssue = issues.find((i) => i.code === 'INVALID_JIRA_URL');
        expect(urlIssue).toBeUndefined();
      });
    });
  });
});
