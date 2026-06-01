/**
 * Ticket Validation Rules
 *
 * TypeScript validation rules for backlog tickets.
 * Validates business logic beyond JSON Schema constraints.
 *
 * @module validation/rules/ticket-rules
 */

import {
  ValidationIssue,
  createWarning,
  createError,
  createInfo,
} from '../validation-report.js';

/**
 * Ticket frontmatter data structure
 */
export interface TicketData {
  documentType?: string;
  title?: string;
  description?: string;
  component?: string | null;
  milestone?: string | null;
  priority?: string | null;
  storyPoints?: number | null;
  labels?: string[] | null;
  createdDate?: string;
  exportedDate?: string | null;
  'jira-ticketId'?: string | null;
  'jira-url'?: string | null;
  'jira-parent'?: string | null;
  'jira-related'?: string[] | null;
  'jira-blocking'?: string[] | null;
  'jira-blockedBy'?: string[] | null;
  'jira-fixVersion'?: string | null;
  'jira-internalNotes'?: string | null;
  'framework-documentation'?: string | null;
  'framework-milestone'?: string | null;
  'framework-technicalGuides'?: string[] | null;
  'framework-relatedLocal'?: string[] | null;
}

/**
 * Optional configuration for ticket validation rules.
 * Controls which values are permitted for specific fields.
 */
export interface TicketValidationConfig {
  /** Allowed component values. When non-empty, any component not in this list is an error. */
  components?: string[];
}

/**
 * Validate ticket business rules
 *
 * @param data - Ticket frontmatter data
 * @param content - Full markdown content
 * @param filePath - Path to ticket file
 * @param config - Optional validation config (e.g. allowed components list)
 * @returns Array of validation issues
 */
export function validateTicketRules(
  data: TicketData,
  content: string,
  filePath: string,
  config?: TicketValidationConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const location = { file: filePath };

  // Rule: Story/Task must have acceptance criteria
  if (data.documentType === 'story' || data.documentType === 'task') {
    if (!content.includes('## Acceptance Criteria')) {
      issues.push(
        createError(
          'MISSING_ACCEPTANCE_CRITERIA',
          'Stories and tasks must have ## Acceptance Criteria section',
          undefined,
          location,
          'Add a ## Acceptance Criteria section with testable conditions'
        )
      );
    } else {
      // Check for "Verify" statements
      const verifyCount = (content.match(/\*\s+\*\*Verify\*\*/gi) || []).length;
      if (verifyCount < 5) {
        issues.push(
          createWarning(
            'INSUFFICIENT_ACCEPTANCE_CRITERIA',
            `Only ${verifyCount} acceptance criteria found, recommend 5-10 QA-verifiable criteria`,
            'Acceptance Criteria',
            location,
            'Add QA-verifiable **Verify** points that can be tested through UI, API, or observable behavior'
          )
        );
      }
    }
  }

  // Rule: Bug must have steps to reproduce
  if (data.documentType === 'bug') {
    if (!content.includes('## Steps to Reproduce') &&
        !content.includes('**Steps to Reproduce:**')) {
      issues.push(
        createError(
          'MISSING_REPRODUCTION_STEPS',
          'Bugs must include steps to reproduce',
          undefined,
          location,
          'Add a **Steps to Reproduce:** section with numbered steps'
        )
      );
    }
  }

  // Rule: Epic should have business value or goals
  if (data.documentType === 'epic') {
    if (!content.includes('**Goals:**') && !content.includes('**Business Value:**')) {
      issues.push(
        createWarning(
          'MISSING_EPIC_GOALS',
          'Epics should include Goals or Business Value section',
          undefined,
          location,
          'Add **Goals:** or **Business Value:** to clarify epic purpose'
        )
      );
    }
  }

  // Rule: Title should not be too long
  if (data.title && data.title.length > 100) {
    issues.push(
      createWarning(
        'TITLE_TOO_LONG',
        `Title is ${data.title.length} characters, recommend < 100`,
        'title',
        location,
        'Shorten the title to be more concise'
      )
    );
  }

  // Rule: Description should have minimum content
  if (data.description && data.description.length < 20) {
    issues.push(
      createWarning(
        'DESCRIPTION_TOO_SHORT',
        'Description should be more detailed',
        'description',
        location,
        'Expand the description to provide better context'
      )
    );
  }

  // Rule: Check for proper section structure
  if (!content.includes('## Description')) {
    issues.push(
      createError(
        'MISSING_DESCRIPTION_SECTION',
        'Ticket must have ## Description section',
        undefined,
        location,
        'Add a ## Description section to the ticket body'
      )
    );
  }

  // Rule: Check for AS/WANT/SO THAT pattern in stories/tasks
  if (data.documentType === 'story' || data.documentType === 'task') {
    const hasUserStory = content.includes('**AS**') &&
                        content.includes('**I WANT**') &&
                        content.includes('**SO THAT**');
    if (!hasUserStory) {
      issues.push(
        createWarning(
          'MISSING_USER_STORY_FORMAT',
          'Stories/tasks should include AS/WANT/SO THAT user story format',
          undefined,
          location,
          'Add user story format: **AS** a [role], **I WANT** [goal], **SO THAT** [benefit]'
        )
      );
    }
  }

  // Rule: Exported tickets should have Jira URL
  if (data['jira-ticketId'] && !data['jira-url']) {
    issues.push(
      createError(
        'MISSING_JIRA_URL',
        'Ticket has jira-ticketId but missing jira-url',
        'jira-url',
        location,
        'Add the Jira URL for this exported ticket'
      )
    );
  }

  // Rule: Exported tickets should have exportedDate
  if (data['jira-ticketId'] && !data.exportedDate) {
    issues.push(
      createWarning(
        'MISSING_EXPORTED_DATE',
        'Exported ticket missing exportedDate',
        'exportedDate',
        location,
        'Add the date when this ticket was exported to Jira'
      )
    );
  }

  // Rule: Check for code snippets in content (anti-pattern)
  const codeBlockCount = (content.match(/```/g) || []).length / 2;
  if (codeBlockCount > 0) {
    issues.push(
      createWarning(
        'CODE_SNIPPETS_FOUND',
        `Found ${codeBlockCount} code block(s). Tickets should reference patterns, not include implementation`,
        undefined,
        location,
        'Remove code snippets and use pattern references instead'
      )
    );
  }

  // Rule: Story points should only be on stories/tasks
  if (data.storyPoints && (data.documentType === 'epic' || data.documentType === 'bug')) {
    issues.push(
      createWarning(
        'INVALID_STORY_POINTS',
        `${data.documentType} should not have story points`,
        'storyPoints',
        location,
        'Remove storyPoints field or change documentType'
      )
    );
  }

  // Rule: Check for proper section dividers
  const dividerCount = (content.match(/^---$/gm) || []).length;
  if (dividerCount < 2) {
    issues.push(
      createInfo(
        'MISSING_SECTION_DIVIDERS',
        'Recommend using --- dividers between sections for better readability',
        undefined,
        location,
        'Add --- after title and between major sections'
      )
    );
  }

  // Rule: Labels should be lowercase kebab-case
  if (data.labels && Array.isArray(data.labels)) {
    for (const label of data.labels) {
      if (!/^[a-z0-9-]+$/.test(label)) {
        issues.push(
          createWarning(
            'INVALID_LABEL_FORMAT',
            `Label "${label}" should be lowercase kebab-case`,
            'labels',
            location,
            'Use lowercase letters, numbers, and hyphens only'
          )
        );
      }
    }
  }

  // Rule: Component must be one of the configured values (when config specifies components)
  if (data.component && config?.components && config.components.length > 0) {
    if (!config.components.includes(String(data.component))) {
      issues.push(
        createError(
          'INVALID_COMPONENT',
          `Component "${data.component}" is not in the configured components list: ${config.components.join(', ')}`,
          'component',
          location,
          `Use one of the configured components: ${config.components.join(', ')}`
        )
      );
    }
  }

  // Rule: Check content length
  const lineCount = content.split('\n').length;
  if (data.documentType === 'epic' && lineCount > 100) {
    issues.push(
      createInfo(
        'EPIC_TOO_LONG',
        `Epic has ${lineCount} lines, recommend 30-50 lines`,
        undefined,
        location,
        'Consider breaking down into smaller epics or moving details to linked documentation'
      )
    );
  } else if (lineCount > 150 && (data.documentType === 'story' || data.documentType === 'task')) {
    issues.push(
      createInfo(
        'TICKET_TOO_LONG',
        `Ticket has ${lineCount} lines, recommend 30-100 lines`,
        undefined,
        location,
        'Consider breaking down into smaller tickets or moving details to documentation'
      )
    );
  }

  return issues;
}

/**
 * Validate cross-references in ticket content
 *
 * @param data - Ticket frontmatter data
 * @param content - Full markdown content
 * @param filePath - Path to ticket file
 * @returns Array of validation issues
 */
export function validateTicketReferences(
  data: TicketData,
  content: string,
  filePath: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const location = { file: filePath };

  // Check for cross-repo references in body (should be in frontmatter only)
  const crossRepoPattern = /@[a-z0-9-]+\/[^\s\]]+/gi;
  const matches = content.match(crossRepoPattern);
  if (matches && matches.length > 0) {
    issues.push(
      createWarning(
        'CROSS_REPO_IN_BODY',
        'Cross-repo references (@repo/path) should be in frontmatter, not body',
        undefined,
        location,
        'Move cross-repo references to framework-documentation field'
      )
    );
  }

  // Validate Jira URLs format
  const jiraUrlPattern = /\[([A-Z]+-\d+)\]\((https?:\/\/[^)]+)\)/g;
  const jiraRefs = [...content.matchAll(jiraUrlPattern)];
  for (const match of jiraRefs) {
    const url = match[2];
    if (!url.includes('atlassian.net/browse/')) {
      issues.push(
        createWarning(
          'INVALID_JIRA_URL',
          `Jira URL should use full Atlassian format: ${url}`,
          undefined,
          location,
          'Use full URL format: https://<domain>.atlassian.net/browse/TICKET-ID'
        )
      );
    }
  }

  return issues;
}
