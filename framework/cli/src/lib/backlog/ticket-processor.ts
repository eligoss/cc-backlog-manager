/**
 * Ticket Processing Module
 *
 * Transforms CSV ticket data into markdown files with YAML frontmatter.
 * Handles ticket file creation, frontmatter generation, and directory organization.
 *
 * Based on import_jira_data.py ticket processing sections.
 *
 * @module ticket-processor
 */

import fs from 'fs-extra';
import path from 'path';
import { stringifyFrontmatter } from '../common/yaml-frontmatter.js';

/**
 * CSV ticket data from Jira export
 */
export interface CsvTicket {
  /** Jira issue key (e.g., DAPM-1315) */
  ticketId: string;
  /** Ticket summary/title */
  summary: string;
  /** Jira issue type (Story, Task, Bug, Epic, Spike, Sub-task) */
  issueType: string;
  /** Current status */
  status: string;
  /** Priority level */
  priority: string;
  /** Description text (may include Jira wiki markup) */
  description: string;
  /** Assigned user */
  assignee: string;
  /** Story point estimate */
  storyPoints?: number;
  /** Parent ticket key (for epics) */
  parentKey: string;
  /** Parent ticket summary */
  parentSummary: string;
  /** Sprint field from Jira */
  sprint: string;
  /** Fix versions field */
  fixVersions: string;
  /** Labels (comma-separated or newline-separated) */
  labels: string;
  /** Acceptance criteria text */
  acceptanceCriteria: string;
  /** Created date */
  created: string;
  /** Updated date */
  updated: string;
}

/**
 * Processing options for ticket import
 */
export interface ProcessingOptions {
  /** Base directory for backlog files */
  basePath: string;
  /** Import type: sprint or milestone */
  importType: 'sprint' | 'milestone';
  /** Sprint ID (for sprint imports) */
  sprintId?: string;
  /** Milestone ID (for milestone imports) */
  milestoneId?: string;
  /** Dry run mode - don't write files */
  dryRun?: boolean;
}

/**
 * Result of processing a ticket
 */
export interface ProcessedTicket {
  /** Path to the ticket file */
  filePath: string;
  /** Generated markdown content */
  content: string;
  /** Whether file was newly created */
  created: boolean;
  /** Whether existing file was updated */
  updated: boolean;
}

/**
 * Issue type mapping from Jira to document type
 */
const ISSUE_TYPE_MAP: Record<string, string> = {
  Story: 'story',
  Task: 'task',
  Bug: 'bug',
  Spike: 'spike',
  Epic: 'epic',
  'Sub-task': 'task', // Sub-tasks treated as tasks
};

/**
 * Folder mapping for ticket types
 */
const FOLDER_MAP: Record<string, string> = {
  story: 'stories',
  task: 'tasks',
  bug: 'bugs',
  spike: 'spikes',
};

/**
 * Priority mapping to P0/P1/P2 format
 */
const PRIORITY_MAP: Record<string, string> = {
  Critical: 'P0',
  High: 'P1',
  Medium: 'P2',
  Low: 'P2',
};

/**
 * Convert text to kebab-case filename.
 *
 * Removes ticket prefixes, project prefixes, special characters.
 * Limits length to 60 characters.
 *
 * @param text - Input text (e.g., "APM-R: FE: PCR Analyzer: Fix shimmer loading")
 * @returns Kebab-case filename (e.g., "fix-shimmer-loading")
 *
 * @example
 * ```typescript
 * sanitizeFilename("DAPM-1315: Fix Shimmer Loading")
 * // Returns: "fix-shimmer-loading"
 *
 * sanitizeFilename("APM-R: FE: Component: Fix Bug")
 * // Returns: "fix-bug"
 * ```
 */
export function sanitizeFilename(text: string): string {
  // Remove Jira ticket prefix if present (e.g., "DAPM-1315: " -> "")
  let cleaned = text.replace(/^[A-Z]+-\d+:?\s*/, '');

  // Remove project prefix patterns like "APM-R: FE: Component:"
  cleaned = cleaned.replace(/^APM-R:\s*(?:FE|BE|FS|App|Bug):\s*/, '');
  cleaned = cleaned.replace(/^APM-R:\s*/, '');

  // Remove component prefix patterns like "Component: " (but not single-word prefixes like "Fix:")
  // Only remove if it's a multi-word prefix or specific component patterns
  cleaned = cleaned.replace(/^[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*:\s+/, '');

  // Convert to lowercase
  cleaned = cleaned.toLowerCase();

  // Replace spaces and special chars with hyphens
  cleaned = cleaned.replace(/[^\w\s-]/g, '');
  cleaned = cleaned.replace(/[-\s]+/g, '-');

  // Remove leading/trailing hyphens
  cleaned = cleaned.replace(/^-+|-+$/g, '');

  // Limit length to ~60 chars to leave room for ticket number prefix
  if (cleaned.length > 60) {
    cleaned = cleaned.substring(0, 60);
    // Split at last hyphen to avoid cutting mid-word
    const lastHyphen = cleaned.lastIndexOf('-');
    if (lastHyphen > 0) {
      cleaned = cleaned.substring(0, lastHyphen);
    }
  }

  return cleaned;
}

/**
 * Convert Jira wiki markup to markdown.
 *
 * @param jiraText - Jira wiki markup text
 * @returns Markdown formatted text
 *
 * @example
 * ```typescript
 * convertJiraToMarkdown("h2. Header\nThis is *bold*")
 * // Returns: "## Header\nThis is **bold**"
 * ```
 */
export function convertJiraToMarkdown(jiraText: string | null | undefined): string {
  if (!jiraText || jiraText.trim() === '') {
    return '';
  }

  let text = String(jiraText);

  // Code blocks (must be done FIRST to protect code content)
  text = text.replace(/\{noformat\}/g, '```');
  text = text.replace(/\{code(?::[a-z]+)?\}/g, '```');

  // Inline code (must be done early to protect code content)
  text = text.replace(/\{\{([^}]+)\}\}/g, '`$1`');

  // Numbered lists (must be done BEFORE headers to avoid conflict with # symbol)
  text = text.replace(/^#\s+/gm, '1. ');

  // Bullet lists (asterisk lists)
  text = text.replace(/^\*\s+/gm, '- ');

  // Headers (must be done AFTER list conversions to avoid conflicts)
  text = text.replace(/^h1\.\s+(.+)$/gm, '# $1');
  text = text.replace(/^h2\.\s+(.+)$/gm, '## $1');
  text = text.replace(/^h3\.\s+(.+)$/gm, '### $1');
  text = text.replace(/^h4\.\s+(.+)$/gm, '#### $1');

  // Bold (must be done AFTER list conversions to avoid conflicts with *)
  text = text.replace(/\*([^*]+)\*/g, '**$1**');

  // Links
  text = text.replace(/\[([^|]+)\|([^\]]+)\]/g, '[$1]($2)');

  // Remove Jira smart-link annotations
  text = text.replace(/\|smart-link/g, '');

  return text;
}

/**
 * Extract acceptance criteria from Jira field.
 *
 * Converts Jira markup and extracts bullet points, removing "Verify" prefix.
 *
 * @param acText - Raw acceptance criteria text from Jira
 * @returns List of criteria strings
 *
 * @example
 * ```typescript
 * extractAcceptanceCriteria("- Verify feature works\n- Verify no errors")
 * // Returns: ["feature works", "no errors"]
 * ```
 */
export function extractAcceptanceCriteria(acText: string | null | undefined): string[] {
  if (!acText || acText.trim() === '') {
    return [];
  }

  // Convert to markdown first
  const text = convertJiraToMarkdown(acText);

  // Extract bullet points
  const criteria: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      let criterion = trimmed.substring(2).trim();
      // Remove "Verify" prefix if present (handles both plain and bold)
      // Matches: Verify, *Verify*, **Verify**
      criterion = criterion.replace(/^(\*{1,2})?Verify(\*{1,2})?\s+/i, '');
      if (criterion) {
        criteria.push(criterion);
      }
    }
  }

  return criteria;
}

/**
 * Parse Jira date format to ISO 8601 (YYYY-MM-DD).
 *
 * @param jiraDateStr - Jira date string (e.g., "18/Nov/25 12:59 PM" or "2025-11-18")
 * @returns ISO 8601 date string (YYYY-MM-DD) or null if parsing fails
 *
 * @example
 * ```typescript
 * parseJiraDate("18/Nov/25 12:59 PM")
 * // Returns: "2025-11-18"
 * ```
 */
export function parseJiraDate(jiraDateStr: string | null | undefined): string | null {
  if (!jiraDateStr || jiraDateStr.trim() === '') {
    return null;
  }

  const trimmed = jiraDateStr.trim();

  // Try parsing Jira format: "18/Nov/25 12:59 PM"
  try {
    const datePart = trimmed.split(' ')[0];
    const [day, month, year] = datePart.split('/');

    // Month name to number mapping
    const months: Record<string, string> = {
      Jan: '01',
      Feb: '02',
      Mar: '03',
      Apr: '04',
      May: '05',
      Jun: '06',
      Jul: '07',
      Aug: '08',
      Sep: '09',
      Oct: '10',
      Nov: '11',
      Dec: '12',
    };

    if (day && month && year && months[month]) {
      // Convert 2-digit year to 4-digit (25 -> 2025)
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${months[month]}-${day.padStart(2, '0')}`;
    }
  } catch {
    // Continue to next parsing attempt
  }

  // Try ISO format: "2025-11-18"
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Generate YAML frontmatter for ticket file (v10.1.1 format).
 *
 * Uses flat structure with jira-* and framework-* prefixes.
 *
 * @param ticket - Ticket data from CSV
 * @param milestone - Optional milestone ID for framework-milestone field
 * @returns Frontmatter data object
 *
 * @example
 * ```typescript
 * const frontmatter = generateTicketFrontmatter(ticket, 'Nov2025');
 * ```
 */
export function generateTicketFrontmatter(
  ticket: CsvTicket,
  milestone?: string
): Record<string, unknown> {
  // Map issue type to document type
  const documentType = ISSUE_TYPE_MAP[ticket.issueType] || 'task';

  // Map priority
  const priorityCode = PRIORITY_MAP[ticket.priority] || 'P2';

  // Parse dates
  const today = new Date().toISOString().split('T')[0];
  const createdDate = parseJiraDate(ticket.created) || today;
  const updatedDate = parseJiraDate(ticket.updated) || today;

  // Parse labels
  let labels: string[] = [];
  if (ticket.labels) {
    labels = ticket.labels
      .split(/[,\n]/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }
  if (labels.length === 0) {
    labels = ['apm-r'];
  }

  // Build frontmatter (v10.1.1 flat structure)
  const frontmatter: Record<string, unknown> = {};

  // Generic fields (no prefix)
  frontmatter.documentType = documentType;
  frontmatter.version = '1.0';
  frontmatter.title = ticket.summary;
  frontmatter.description = ticket.summary.substring(0, 150); // Truncate to 150 chars
  frontmatter.component = 'APM:  Reliability App'; // Exactly 2 spaces (critical!)
  frontmatter.priority = priorityCode;

  if (ticket.storyPoints !== undefined) {
    frontmatter.storyPoints = ticket.storyPoints;
  }

  frontmatter.labels = labels;
  frontmatter.createdDate = createdDate;
  frontmatter.exportedDate = updatedDate;

  // Jira fields (jira-* prefix)
  frontmatter['jira-ticketId'] = ticket.ticketId;
  frontmatter['jira-url'] = `https://wencosupport.atlassian.net/browse/${ticket.ticketId}`;
  if (ticket.parentKey) {
    frontmatter['jira-parent'] = ticket.parentKey;
  }
  frontmatter['jira-related'] = []; // Empty initially
  frontmatter['jira-blocking'] = []; // Empty initially
  frontmatter['jira-blockedBy'] = []; // Empty initially
  // jira-fixVersion and jira-internalNotes are optional, only set if provided

  // Framework fields (framework-* prefix)
  frontmatter['framework-documentation'] = null;
  frontmatter['framework-milestone'] = milestone || null;
  frontmatter['framework-technicalGuides'] = [];
  frontmatter['framework-relatedLocal'] = [];

  return frontmatter;
}

/**
 * Generate ticket body content (v10.1.1 format).
 *
 * Includes:
 * - Title
 * - Section dividers
 * - Description section with user story
 * - Acceptance criteria section
 *
 * @param ticket - Ticket data from CSV
 * @param documentType - Document type (story, task, bug, etc.)
 * @returns Markdown body content (without frontmatter)
 *
 * @example
 * ```typescript
 * const body = generateTicketBody(ticket, 'story');
 * ```
 */
export function generateTicketBody(ticket: CsvTicket, documentType: string): string {
  let content = '';

  // Title
  content += `# ${ticket.summary}\n\n`;

  // Section divider before Description
  content += '---\n\n';

  // Description section
  content += '## Description\n\n';

  // User story (AS/WANT/SO THAT) - REQUIRED for stories/tasks
  if (documentType === 'story' || documentType === 'task') {
    content += '**AS** a user,\n';
    content += `**I WANT** ${ticket.summary.toLowerCase()},\n`;
    content += '**SO THAT** I can achieve the desired outcome.\n\n';
  }

  // Description content with bold labels instead of H3
  if (ticket.description) {
    let descMd = convertJiraToMarkdown(ticket.description);
    // Replace H3 headings with bold labels
    // Handle: ### heading → **heading:**
    descMd = descMd.replace(/^### (.+?)$/gm, '**$1:**');
    // Clean up double bold: ****heading:**:** → **heading:**
    descMd = descMd.replace(/\*\*\*\*(.+?)\*\*:\*\*:/g, '**$1:**');
    content += `${descMd}\n\n`;
  }

  // Section divider after Description
  content += '---\n\n';

  // Acceptance Criteria section
  content += '## Acceptance Criteria\n\n';
  const acList = extractAcceptanceCriteria(ticket.acceptanceCriteria);
  if (acList.length > 0) {
    for (const ac of acList) {
      content += `- **Verify** ${ac}\n`;
    }
  } else {
    content += '- **Verify** implementation meets requirements\n';
  }

  return content;
}

/**
 * Get the file path for a ticket based on its type and options.
 *
 * @param ticket - Ticket data from CSV
 * @param options - Processing options
 * @param documentType - Document type (story, task, bug, epic, spike)
 * @returns Absolute file path for the ticket
 *
 * @example
 * ```typescript
 * const filePath = getTicketFilePath(ticket, options, 'story');
 * // Returns: "/path/to/backlog/tickets/stories/1315-fix-shimmer-loading.md"
 * ```
 */
export function getTicketFilePath(
  ticket: CsvTicket,
  options: ProcessingOptions,
  documentType: string
): string {
  // Extract ticket number from issue key (e.g., "DAPM-1315" -> "1315")
  const ticketNumber = ticket.ticketId.replace(/^[A-Z]+-/, '');

  // Generate filename base
  const filenameBase = sanitizeFilename(ticket.summary);
  const filename = `${ticketNumber}-${filenameBase}.md`;

  // Determine folder
  let folder: string;
  if (documentType === 'epic') {
    folder = path.join(options.basePath, 'epics');
  } else {
    const folderName = FOLDER_MAP[documentType] || 'tasks';
    folder = path.join(options.basePath, 'tickets', folderName);
  }

  return path.join(folder, filename);
}

/**
 * Process a single ticket: generate markdown file with YAML frontmatter.
 *
 * Creates or updates ticket file in the appropriate directory.
 *
 * @param ticket - CSV ticket data
 * @param options - Processing options
 * @returns Processing result with file path and status
 *
 * @example
 * ```typescript
 * const result = await processTicket(ticket, {
 *   basePath: 'backlog',
 *   importType: 'sprint',
 *   sprintId: '2025-W50',
 *   dryRun: false
 * });
 * ```
 */
export async function processTicket(
  ticket: CsvTicket,
  options: ProcessingOptions
): Promise<ProcessedTicket> {
  // Map issue type to document type
  const documentType = ISSUE_TYPE_MAP[ticket.issueType] || 'task';

  // Determine milestone
  const milestone = options.importType === 'milestone' ? options.milestoneId : undefined;

  // Generate frontmatter
  const frontmatter = generateTicketFrontmatter(ticket, milestone);

  // Generate body
  const body = generateTicketBody(ticket, documentType);

  // Combine frontmatter and body
  const content = stringifyFrontmatter(frontmatter, body);

  // Get file path
  const filePath = getTicketFilePath(ticket, options, documentType);

  // Check if file exists
  const fileExists = await fs.pathExists(filePath);

  // Dry run mode
  if (options.dryRun) {
    return {
      filePath,
      content,
      created: false,
      updated: false,
    };
  }

  // Create directory if needed
  await fs.ensureDir(path.dirname(filePath));

  // Write file
  await fs.writeFile(filePath, content, 'utf-8');

  return {
    filePath,
    content,
    created: !fileExists,
    updated: fileExists,
  };
}
