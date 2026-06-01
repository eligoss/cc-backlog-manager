/**
 * Acceptance Criteria Extractor and Formatter
 *
 * Extracts acceptance criteria from markdown and formats for Jira.
 * Supports both Jira wiki markup and ADF (Atlassian Document Format).
 *
 * Based on: modules/jira/src/jira/export_to_jira.py
 */

/**
 * ADF (Atlassian Document Format) types
 */
export interface AdfDocument {
  version: number;
  type: 'doc';
  content: AdfNode[];
}

export interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  marks?: AdfMark[];
}

export interface AdfMark {
  type: string;
}

/**
 * Extract acceptance criteria from markdown body.
 *
 * Looks for "## Acceptance Criteria" section and extracts all "Verify" lines.
 *
 * Supports formats:
 * - - *Verify* text
 * - - **Verify** text
 * - - Verify text
 * - * Verify text
 *
 * @param markdown - The markdown content to parse
 * @returns Array of criteria text (without "Verify" prefix)
 */
export function extractAcceptanceCriteria(markdown: string): string[] {
  const criteria: string[] = [];

  // Find acceptance criteria section (case-insensitive)
  const acSectionPattern = /##\s+Acceptance Criteria.*?(?=\n##|$)/is;
  const match = markdown.match(acSectionPattern);

  if (!match) {
    return criteria;
  }

  const acSection = match[0];

  // Split into lines and process each line
  const lines = acSection.split('\n');

  for (const line of lines) {
    // Try to match different Verify formats
    // Pattern 1: - **Verify** text or * **Verify** text
    let criterionMatch = line.match(/^[\s]*[-*]\s+\*\*Verify\*\*\s+(.+)$/i);
    if (criterionMatch) {
      criteria.push(criterionMatch[1].trim());
      continue;
    }

    // Pattern 2: - *Verify* text or * *Verify* text
    criterionMatch = line.match(/^[\s]*[-*]\s+\*Verify\*\s+(.+)$/i);
    if (criterionMatch) {
      criteria.push(criterionMatch[1].trim());
      continue;
    }

    // Pattern 3: - Verify text or * Verify text
    criterionMatch = line.match(/^[\s]*[-*]\s+Verify\s+(.+)$/i);
    if (criterionMatch) {
      criteria.push(criterionMatch[1].trim());
      continue;
    }
  }

  return criteria;
}

/**
 * Format acceptance criteria as Jira wiki markup bullet list.
 *
 * Format: * *Verify* criterion text (asterisk for bullet, asterisks for italic)
 *
 * @param criteria - Array of criteria text (without "Verify" prefix)
 * @returns Wiki markup string with formatted bullets
 */
export function formatAsJiraWiki(criteria: string[]): string {
  if (criteria.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const criterion of criteria) {
    // Format: * *Verify* text
    // * = bullet point
    // *Verify* = italicized "Verify"
    lines.push(`* *Verify* ${criterion}`);
  }

  return lines.join('\n');
}

/**
 * Format acceptance criteria as ADF (Atlassian Document Format).
 *
 * Creates a bullet list with "Verify" prefix in italics.
 *
 * @param criteria - Array of criteria text (without "Verify" prefix)
 * @returns ADF document structure
 */
export function formatAsAdf(criteria: string[]): AdfDocument {
  const listItems: AdfNode[] = criteria.map((criterion) => ({
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
            text: criterion,
          },
        ],
      },
    ],
  }));

  return {
    version: 1,
    type: 'doc',
    content: [
      {
        type: 'bulletList',
        content: listItems,
      },
    ],
  };
}

/**
 * Parse existing Jira AC field content.
 *
 * Extracts criteria from Jira wiki markup or plain text format.
 *
 * Supports:
 * - * *Verify* text
 * - * **Verify** text
 * - * Verify text
 * - - *Verify* text
 * - - **Verify** text
 * - - Verify text
 *
 * @param jiraAc - Jira AC field content (wiki markup or plain text)
 * @returns Array of criteria text (without "Verify" prefix)
 */
export function parseJiraAcField(jiraAc: string | null | undefined): string[] {
  if (!jiraAc || jiraAc.trim() === '') {
    return [];
  }

  const criteria: string[] = [];

  // Split into lines and process each line
  const lines = jiraAc.split('\n');

  for (const line of lines) {
    // Try to match different Verify formats
    // Pattern 1: - **Verify** text or * **Verify** text
    let criterionMatch = line.match(/^[\s]*[-*]\s+\*\*Verify\*\*\s+(.+)$/i);
    if (criterionMatch) {
      criteria.push(criterionMatch[1].trim());
      continue;
    }

    // Pattern 2: - *Verify* text or * *Verify* text
    criterionMatch = line.match(/^[\s]*[-*]\s+\*Verify\*\s+(.+)$/i);
    if (criterionMatch) {
      criteria.push(criterionMatch[1].trim());
      continue;
    }

    // Pattern 3: - Verify text or * Verify text
    criterionMatch = line.match(/^[\s]*[-*]\s+Verify\s+(.+)$/i);
    if (criterionMatch) {
      criteria.push(criterionMatch[1].trim());
      continue;
    }
  }

  return criteria;
}
