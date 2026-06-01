/**
 * Ticket Generator Module
 *
 * Generates ticket content in v10.1.1 format including:
 * - YAML frontmatter with jira-* and framework-* fields
 * - Structured body with ## Description and ## Acceptance Criteria
 *
 * @module ticket-generator
 */

import { CsvTicket } from './types.js';
import { convertJiraToMarkdown, extractAcceptanceCriteria } from './csv-extractor.js';
import { extractAsWantSoThat, extractContext, extractRequirements, extractTechnicalNotes } from './content-parser.js';

/**
 * Frontmatter structure for v10.1.1 tickets (lean format)
 *
 * Only populated fields are emitted. Null/empty values are omitted to reduce noise.
 * Sprint/milestone data lives in index files, not duplicated per-ticket.
 */
export interface TicketFrontmatter {
  documentType: string;
  title: string;
  'jira-ticketId': string;
  'jira-url': string;
  'jira-parent'?: string;
  storyPoints?: number;
  assignee?: string;
  priority?: string;
  labels?: string[];
  createdDate?: string;
  updatedDate?: string;
}

/**
 * Map Jira priority to framework priority (P1/P2/P3).
 *
 * @param jiraPriority - Jira priority string (High, Medium, Low, etc.)
 * @returns Framework priority (P1, P2, or P3)
 */
export function mapPriority(jiraPriority: string | undefined): string {
  if (!jiraPriority) {
    return 'P2';
  }

  const normalized = jiraPriority.toLowerCase();

  if (normalized === 'highest' || normalized === 'high') {
    return 'P1';
  }

  if (normalized === 'lowest' || normalized === 'low') {
    return 'P3';
  }

  return 'P2';
}

/**
 * Generate lean YAML frontmatter.
 *
 * Only includes fields that are useful to AI agents working with the ticket:
 * - Identity: documentType, title, jira-ticketId, jira-url
 * - Hierarchy: jira-parent (for epic context)
 * - Planning: storyPoints, assignee, priority
 * - Filtering: labels (only if meaningful, not project-wide)
 * - Dates: createdDate, updatedDate (for freshness)
 *
 * Omitted (available in index files or Jira API):
 * - sprint, milestone, fixVersion (in sprint/milestone index files)
 * - description (duplicate of title), exportedDate, internalNotes
 * - empty arrays (related, blocking, blockedBy)
 * - framework-* fields (populated later by agents, not import)
 *
 * @param ticket - CSV ticket data
 * @returns Frontmatter object with only populated fields
 */
export function generateFrontmatter(ticket: CsvTicket): TicketFrontmatter {
  const jiraBaseUrl = 'https://wencosupport.atlassian.net/browse';
  const jiraUrl = `${jiraBaseUrl}/${ticket.ticketId}`;

  const frontmatter: TicketFrontmatter = {
    documentType: ticket.documentType,
    title: ticket.summary,
    'jira-ticketId': ticket.ticketId,
    'jira-url': jiraUrl,
  };

  if (ticket.parentKey) {
    frontmatter['jira-parent'] = ticket.parentKey;
  }

  if (ticket.storyPoints) {
    frontmatter.storyPoints = ticket.storyPoints;
  }

  if (ticket.assignee) {
    frontmatter.assignee = ticket.assignee;
  }

  if (ticket.priority) {
    frontmatter.priority = mapPriority(ticket.priority);
  }

  if (ticket.labels && ticket.labels.length > 0) {
    frontmatter.labels = ticket.labels;
  }

  if (ticket.createdDate) {
    frontmatter.createdDate = ticket.createdDate;
  }

  if (ticket.updatedDate) {
    frontmatter.updatedDate = ticket.updatedDate;
  }

  return frontmatter;
}

/**
 * Generate ticket body content in v10.1.1 format.
 *
 * Structure:
 * - H1 title
 * - ---
 * - ## Description
 *   - AS/WANT/SO THAT (if story)
 *   - Context paragraphs
 *   - Requirements list
 *   - Technical Notes (if present)
 * - ---
 * - ## Acceptance Criteria
 *
 * @param ticket - CSV ticket data
 * @returns Markdown body content
 */
export function generateBodyContent(ticket: CsvTicket): string {
  const lines: string[] = [];

  // H1 Title
  lines.push(`# ${ticket.summary}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Description section
  lines.push('## Description');
  lines.push('');

  if (ticket.description) {
    // Convert Jira markup to markdown
    const markdownDescription = convertJiraToMarkdown(ticket.description);

    // Try to extract structured sections
    const asWantSoThat = extractAsWantSoThat(ticket.description);
    const context = extractContext(ticket.description);
    const requirements = extractRequirements(ticket.description);
    const technicalNotes = extractTechnicalNotes(ticket.description);

    // AS/WANT/SO THAT for stories (clean through Jira converter)
    if (asWantSoThat && (ticket.documentType === 'story' || ticket.documentType === 'task')) {
      lines.push(`**AS** ${convertJiraToMarkdown(asWantSoThat.asA)},`);
      lines.push(`**I WANT** ${convertJiraToMarkdown(asWantSoThat.iWant)},`);
      if (asWantSoThat.soThat) {
        lines.push(`**SO THAT** ${convertJiraToMarkdown(asWantSoThat.soThat)}.`);
      }
      lines.push('');
    }

    // Context
    if (context) {
      lines.push('**Context:**');
      lines.push('');
      lines.push(context);
      lines.push('');
    } else if (!asWantSoThat) {
      // If no structured content, use the whole description
      lines.push(markdownDescription);
      lines.push('');
    }

    // Requirements
    if (requirements.length > 0) {
      lines.push('**Requirements:**');
      lines.push('');
      for (const req of requirements) {
        lines.push(`- ${req}`);
      }
      lines.push('');
    }

    // Technical Notes
    if (technicalNotes.length > 0) {
      lines.push('**Technical Notes:**');
      lines.push('');
      for (const note of technicalNotes) {
        lines.push(`- ${note}`);
      }
      lines.push('');
    }
  } else {
    lines.push('*No description provided*');
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Acceptance Criteria section
  lines.push('## Acceptance Criteria');
  lines.push('');

  if (ticket.acceptanceCriteria) {
    const criteria = extractAcceptanceCriteria(ticket.acceptanceCriteria);
    if (criteria.length > 0) {
      for (const criterion of criteria) {
        lines.push(`- **Verify** ${criterion}`);
      }
    } else {
      // Fall back to raw acceptance criteria
      const markdownAc = convertJiraToMarkdown(ticket.acceptanceCriteria);
      lines.push(markdownAc);
    }
  } else {
    // Default acceptance criteria
    lines.push('- **Verify** implementation meets requirements');
    lines.push('- **Verify** tests pass');
    lines.push('- **Verify** code review completed');
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format YAML value with proper escaping/quoting.
 */
function formatYamlValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'null';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return JSON.stringify(value);
  }

  const str = String(value);

  // Check if value needs quoting (contains special YAML characters)
  const needsQuotes = /[:#[\]{}|>&*!?,\n]/.test(str) ||
    str.startsWith('-') ||
    str.startsWith('@') ||
    str === 'true' ||
    str === 'false' ||
    str === 'null' ||
    /^\d/.test(str);

  if (needsQuotes) {
    // Escape double quotes and wrap
    const escaped = str.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * Generate complete ticket content with frontmatter and body.
 *
 * @param ticket - CSV ticket data
 * @returns Complete markdown file content
 */
export function generateTicketContent(ticket: CsvTicket): string {
  const frontmatter = generateFrontmatter(ticket);
  const body = generateBodyContent(ticket);

  // Build YAML frontmatter — only emit populated fields
  const yamlLines: string[] = [];

  yamlLines.push(`documentType: ${formatYamlValue(frontmatter.documentType)}`);
  yamlLines.push(`title: ${formatYamlValue(frontmatter.title)}`);
  yamlLines.push(`jira-ticketId: ${formatYamlValue(frontmatter['jira-ticketId'])}`);
  yamlLines.push(`jira-url: ${formatYamlValue(frontmatter['jira-url'])}`);

  if (frontmatter['jira-parent']) {
    yamlLines.push(`jira-parent: ${formatYamlValue(frontmatter['jira-parent'])}`);
  }

  if (frontmatter.storyPoints !== undefined) {
    yamlLines.push(`storyPoints: ${formatYamlValue(frontmatter.storyPoints)}`);
  }

  if (frontmatter.assignee) {
    yamlLines.push(`assignee: ${formatYamlValue(frontmatter.assignee)}`);
  }

  if (frontmatter.priority) {
    yamlLines.push(`priority: ${formatYamlValue(frontmatter.priority)}`);
  }

  if (frontmatter.labels && frontmatter.labels.length > 0) {
    yamlLines.push(`labels: ${formatYamlValue(frontmatter.labels)}`);
  }

  if (frontmatter.createdDate) {
    yamlLines.push(`createdDate: ${formatYamlValue(frontmatter.createdDate)}`);
  }

  if (frontmatter.updatedDate) {
    yamlLines.push(`updatedDate: ${formatYamlValue(frontmatter.updatedDate)}`);
  }

  const yaml = yamlLines.join('\n');

  return `---\n${yaml}\n---\n\n${body}`;
}
