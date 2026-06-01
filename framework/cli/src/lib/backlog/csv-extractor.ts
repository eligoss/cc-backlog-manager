/**
 * CSV extraction module for Jira imports.
 *
 * Handles CSV parsing and data extraction for Jira ticket imports.
 * Parses CSV files, maps columns to ticket properties, and normalizes field values.
 *
 * @module csv-extractor
 */

import fs from 'fs-extra';
import { parse } from 'csv-parse/sync';
import { CsvTicket } from './types.js';

export type { CsvTicket };

/**
 * Result of CSV extraction
 */
export interface CsvExtractionResult {
  tickets: CsvTicket[];
  errors: Array<{ row: number; error: string }>;
  warnings: Array<{ row: number; warning: string }>;
}

// Issue type mappings
const ISSUE_TYPE_MAP: Record<string, string> = {
  'Story': 'story',
  'Task': 'task',
  'Bug': 'bug',
  'Spike': 'spike',
  'Epic': 'epic',
  'Sub-task': 'task', // Sub-tasks treated as tasks
};

/**
 * Parse CSV file and extract ticket data.
 *
 * Handles UTF-8 encoding, quoted fields with commas/newlines,
 * and validates required columns.
 *
 * @param csvPath - Path to CSV file
 * @returns Extraction result with tickets, errors, and warnings
 */
export async function parseCsvFile(csvPath: string): Promise<CsvExtractionResult> {
  const result: CsvExtractionResult = {
    tickets: [],
    errors: [],
    warnings: [],
  };

  // Read CSV file with UTF-8 encoding
  const content = await fs.readFile(csvPath, 'utf-8');

  // Parse CSV as arrays first (to handle duplicate column names like Sprint, Sprint, Sprint...)
  // Jira exports multiple Sprint/Fix Version columns for sprint history — csv-parse's columns:true
  // keeps only the LAST duplicate, losing the primary (first) column which has the most data.
  const rawRecords = parse(content, {
    skip_empty_lines: true,
    trim: true,
    relaxColumnCount: true,
    bom: true,
  }) as string[][];

  if (rawRecords.length === 0) {
    return result;
  }

  // Build column map: merge duplicate column names by collecting all values
  const headers = rawRecords[0];
  const records = rawRecords.slice(1).map(row => {
    const merged: Record<string, string> = {};
    for (let i = 0; i < headers.length && i < row.length; i++) {
      const colName = headers[i];
      const value = row[i]?.trim() || '';

      if (colName === 'Sprint' || colName === 'Fix versions') {
        // For multi-value columns: keep first non-empty value (primary/most recent)
        if (!merged[colName] && value) {
          merged[colName] = value;
        }
        // Also collect ALL values into a separate key for full history
        const allKey = `_all_${colName}`;
        if (value) {
          merged[allKey] = merged[allKey] ? `${merged[allKey]}\n${value}` : value;
        }
      } else {
        // For other columns: last value wins (matches csv-parse default)
        if (value || !(colName in merged)) {
          merged[colName] = value;
        }
      }
    }
    return merged;
  });

  // Process each row
  records.forEach((row, index) => {
    const rowNum = index + 1;

    try {
      // Validate required fields
      const issueKey = row['Issue key']?.trim();
      const summary = row['Summary']?.trim();

      if (!issueKey) {
        result.errors.push({ row: rowNum, error: 'Issue key is required' });
        return;
      }

      if (!summary) {
        result.errors.push({ row: rowNum, error: 'Summary is required' });
        return;
      }

      // Map row to ticket
      const ticket = mapCsvRowToTicket(row);
      result.tickets.push(ticket);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ row: rowNum, error: `Failed to parse row: ${errorMessage}` });
    }
  });

  return result;
}

/**
 * Map CSV row to ticket data.
 *
 * Extracts and normalizes all ticket fields from CSV row.
 *
 * @param row - CSV row object
 * @returns Ticket data
 */
export function mapCsvRowToTicket(row: Record<string, string>): CsvTicket {
  const issueKey = normalizeFieldValue('issueKey', row['Issue key']) as string;
  const summary = normalizeFieldValue('summary', row['Summary']) as string;
  const issueType = normalizeFieldValue('issueType', row['Issue Type']) as string;
  const status = normalizeFieldValue('status', row['Status']) as string | undefined;
  const priority = normalizeFieldValue('priority', row['Priority']) as string | undefined;
  const description = normalizeFieldValue('description', row['Description']) as string | undefined;
  const assignee = normalizeFieldValue('assignee', row['Assignee']) as string | undefined;
  const storyPoints = normalizeFieldValue('storyPoints', row['Custom field (Story Points)']) as number | undefined;
  const parentKey = normalizeFieldValue('parentKey', row['Parent key']) as string | undefined;
  const parentSummary = normalizeFieldValue('parentSummary', row['Parent summary']) as string | undefined;
  const sprint = normalizeFieldValue('sprint', row['Sprint']) as string | undefined;
  const fixVersions = normalizeFieldValue('fixVersions', row['Fix versions']) as string | undefined;
  const labels = normalizeFieldValue('labels', row['Labels']) as string[] | undefined;
  const acceptanceCriteria = normalizeFieldValue('acceptanceCriteria', row['Custom field (Acceptance Criteria)']) as string | undefined;
  const createdDate = normalizeFieldValue('createdDate', row['Created']) as string | undefined;
  const updatedDate = normalizeFieldValue('updatedDate', row['Updated']) as string | undefined;

  // Map issue type to document type
  const documentType = (ISSUE_TYPE_MAP[issueType] || 'task') as 'story' | 'task' | 'bug' | 'spike' | 'epic';

  // Handle placeholder/unknown titles — use ticket ID as fallback
  const effectiveSummary = (!summary || summary === '<unknown>' || summary === 'unknown')
    ? issueKey
    : summary;

  // Generate filename
  const ticketNumber = issueKey.replace(/^[A-Z]+-/, '');
  const filenameBase = sanitizeFilename(effectiveSummary) || ticketNumber;
  const filename = `${ticketNumber}-${filenameBase}.md`;

  // Use fix version as milestone (Jira fix version = framework milestone)
  const milestone = fixVersions?.trim() || undefined;

  // Parse epic reference from parent
  let epic: string | undefined;
  if (parentKey && parentSummary) {
    const epicFilename = sanitizeFilename(parentSummary);
    epic = `EPIC-${epicFilename}`;
  }

  return {
    ticketId: issueKey,
    summary: effectiveSummary,
    issueType,
    documentType,
    status,
    priority,
    description,
    assignee,
    storyPoints,
    parentKey,
    parentSummary,
    epic,
    sprint,
    fixVersions,
    milestone,
    labels,
    acceptanceCriteria,
    createdDate,
    updatedDate,
    filename,
  };
}

/**
 * Normalize field value based on field type.
 *
 * @param field - Field name
 * @param value - Raw value from CSV
 * @returns Normalized value
 */
export function normalizeFieldValue(field: string, value: string): string | string[] | number | null | undefined {
  if (value === undefined || value === null) {
    if (field === 'labels' || field === 'storyPoints') {
      return undefined;
    }
    return '';
  }

  const trimmed = String(value).trim();

  // Handle story points
  if (field === 'storyPoints') {
    if (!trimmed) return undefined;
    try {
      const num = parseFloat(trimmed);
      return isNaN(num) ? undefined : Math.floor(num);
    } catch {
      return undefined;
    }
  }

  // Handle labels
  if (field === 'labels') {
    if (!trimmed) return undefined;
    const labelList = trimmed.split(/[,\n]/).map(l => l.trim()).filter(l => l);
    return labelList.length > 0 ? labelList : undefined;
  }

  // Handle dates
  if (field === 'createdDate' || field === 'updatedDate') {
    return parseJiraDate(trimmed);
  }

  // Default: return trimmed string or undefined if empty
  return trimmed || undefined;
}

/**
 * Convert text to kebab-case filename.
 *
 * Removes Jira ticket prefixes, project prefixes, and special characters.
 * Limits length to ~60 chars.
 *
 * @param text - Input text
 * @returns Kebab-case filename
 */
export function sanitizeFilename(text: string): string {
  if (!text) return '';

  let sanitized = text;

  // Remove Jira ticket prefix (e.g., "DAPM-1315: " -> "")
  sanitized = sanitized.replace(/^[A-Z]+-\d+:?\s*/, '');

  // Remove project prefix patterns like "APM-R: FE:" or "APM-R: BE:"
  // But preserve "Component:" text
  sanitized = sanitized.replace(/^APM-R:\s*(?:FE|BE|FS|App|Bug):\s*/, '');
  sanitized = sanitized.replace(/^APM-R:\s*/, '');

  // Convert to lowercase
  sanitized = sanitized.toLowerCase();

  // Replace spaces and special chars with hyphens
  sanitized = sanitized.replace(/[^\w\s-]/g, '');
  sanitized = sanitized.replace(/[-\s]+/g, '-');

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Limit length to ~60 chars to leave room for ticket number prefix
  if (sanitized.length > 60) {
    // Find last hyphen before 60 chars
    const lastHyphen = sanitized.substring(0, 60).lastIndexOf('-');
    if (lastHyphen > 0) {
      sanitized = sanitized.substring(0, lastHyphen);
    } else {
      sanitized = sanitized.substring(0, 60);
    }
  }

  return sanitized;
}

/**
 * Convert Jira wiki markup to markdown.
 *
 * Handles: headers, inline code, code blocks, lists (nested), bold, italic,
 * links, images, panels, user mentions, and cleans up artifacts.
 *
 * @param jiraText - Jira wiki markup text
 * @returns Markdown formatted text
 */
export function convertJiraToMarkdown(jiraText: string): string {
  if (!jiraText || jiraText.trim() === '') {
    return jiraText || '';
  }

  let text = String(jiraText);

  // Use temporary markers to avoid conflicts between header conversion and numbered list conversion
  const HEADER_MARKER = '___JIRA_HEADER___';

  // --- Strip Jira macros/panels ---
  // {panel:bgColor=...}content{panel} → just the content
  text = text.replace(/\{panel(?::[^}]*)?\}/g, '');

  // {quote}content{quote} → blockquote (handled line-by-line later)
  text = text.replace(/\{quote\}/g, '');

  // {color:...}content{color} → just the content
  text = text.replace(/\{color(?::[^}]*)?\}/g, '');

  // {adf:...}JSON content{adf} → stripped (Atlassian Document Format blocks are unreadable as text)
  text = text.replace(/\{adf(?::[^}]*)?\}[\s\S]*?\{adf\}/g, '');

  // --- Remove user mentions (meaningless outside Jira) ---
  // [~accountid:712020:f4907950-...] → stripped
  text = text.replace(/\[~accountid:[^\]]+\]/g, '');
  // Clean up lines that become empty or orphaned after mention removal
  // e.g., "[mention] [mention] , please review..." → remove entire line
  text = text.replace(/^[,.\s]*(?:please review|feel free to)[^\n]*$/gim, '');

  // --- Remove Jira image attachments (don't exist locally) ---
  // !filename.png|width=100%,alt="..."! → stripped
  text = text.replace(/!([^|!]+)\|[^!]*!/g, '');
  // !filename.png! (simple form) → stripped
  text = text.replace(/!([^|!\s]+)!/g, '');

  // --- Headers (use temporary markers to avoid conflict with # numbered lists) ---
  // Handle both "h2. Title" and bare "h2." (empty heading used as separator in Jira)
  text = text.replace(/^h1\.\s*(.*)$/gm, (_, t) => t.trim() ? `${HEADER_MARKER}1 ${t.trim()}` : '');
  text = text.replace(/^h2\.\s*(.*)$/gm, (_, t) => t.trim() ? `${HEADER_MARKER}2 ${t.trim()}` : '');
  text = text.replace(/^h3\.\s*(.*)$/gm, (_, t) => t.trim() ? `${HEADER_MARKER}3 ${t.trim()}` : '');
  text = text.replace(/^h4\.\s*(.*)$/gm, (_, t) => t.trim() ? `${HEADER_MARKER}4 ${t.trim()}` : '');
  text = text.replace(/^h5\.\s*(.*)$/gm, (_, t) => t.trim() ? `${HEADER_MARKER}5 ${t.trim()}` : '');
  text = text.replace(/^h6\.\s*(.*)$/gm, (_, t) => t.trim() ? `${HEADER_MARKER}6 ${t.trim()}` : '');

  // --- Inline code (must come before bold to avoid conflict with double braces) ---
  // Handle nested braces: {{asset_summary:{orgId}:{assetModelId}}} → `asset_summary:{orgId}:{assetModelId}`
  text = text.replace(/\{\{(.+?)\}\}/g, '`$1`');

  // --- Code blocks (ensure fences are on their own line) ---
  text = text.replace(/\{noformat\}/g, '\n```\n');
  text = text.replace(/\{code(?::[^}]*)?\}/g, '\n```\n');

  // --- Nested lists ---
  // Jira: #* = numbered then bullet sub-item
  // Jira: *# = bullet then numbered sub-item
  // Jira: ## = nested numbered, ** = nested bullet
  // Process deepest nesting first (4 levels → 1 level)
  text = text.replace(/^####\s+/gm, '      1. ');
  text = text.replace(/^\*\*\*\*\s+/gm, '      - ');
  text = text.replace(/^###\s+/gm, '    1. ');
  text = text.replace(/^\*\*\*\s+/gm, '    - ');
  text = text.replace(/^##\s+/gm, '  1. ');
  text = text.replace(/^\*\*\s+/gm, '  - ');
  // Mixed nesting
  text = text.replace(/^#\*\s+/gm, '  - ');
  text = text.replace(/^\*#\s+/gm, '  1. ');

  // --- Top-level lists ---
  // Bullet lists (single * at start of line followed by space)
  text = text.replace(/^\*\s+/gm, '- ');
  // Numbered lists (single # at start of line followed by space)
  text = text.replace(/^#\s+/gm, '1. ');

  // --- Bold and italic ---
  // Bold: *text* → **text** (but not inside words or URLs)
  text = text.replace(/(?<![a-zA-Z0-9_/])\*([^*\n]+)\*(?![a-zA-Z0-9_/])/g, '**$1**');
  // Italic: _text_ → *text* (but not inside words or URLs)
  text = text.replace(/(?<![a-zA-Z0-9/])_([^_\n]+)_(?![a-zA-Z0-9/])/g, '*$1*');

  // --- Strikethrough: -text- → ~~text~~ ---
  // Must come after list conversion (which handles leading - ) and before links
  // Only match -text- where text doesn't contain newlines and dashes are at word boundaries
  text = text.replace(/(?<![a-zA-Z0-9/])-([^-\n]{2,})-(?![a-zA-Z0-9/])/g, '~~$1~~');

  // --- Table headers: ||col1||col2|| → |col1|col2| ---
  text = text.replace(/^\|\|(.+)\|\|\s*$/gm, (match) => {
    // Replace || with | throughout the line
    return match.replace(/\|\|/g, '|').trim();
  });

  // --- Links ---
  // Remove |smart-link and |smart-card suffixes first (before link processing)
  text = text.replace(/\|smart-link/g, '');
  text = text.replace(/\|smart-card/g, '');
  // Double-bracket links: [[title|url]] → [title](url) (SharePoint/Loop links)
  // Title may contain ] (e.g. [[APM] Conference|url]]) so match up to last |
  text = text.replace(/\[\[((?:[^\]]|\](?!\]))+?)\|(https?:\/\/[^\]]+)\]\]/g, '[$1]($2)');
  // [url|url] (label = URL, duplicate) → just the URL
  text = text.replace(/\[(https?:\/\/[^\]|]+)\|\1\]/g, '$1');
  // [title|url] → [title](url) — title may contain ] (e.g. [APM] in link text)
  text = text.replace(/\[((?:[^\]]|\](?!\]))*?)\|(https?:\/\/[^\]]+)\]/g, '[$1]($2)');
  // [url] alone (bare URL in brackets) → just the URL
  text = text.replace(/\[(https?:\/\/[^\]]+)\]/g, '$1');

  // --- Fix double-linked URLs: [url](url) where label = url → just url ---
  text = text.replace(/\[(https?:\/\/[^\]]+)\]\(\1\)/g, '$1');

  // --- Jira issue references: [PROJ-123] → PROJ-123 (just remove brackets) ---
  text = text.replace(/\[([A-Z]+-\d+)\]/g, '$1');

  // --- Fix malformed issue links: PROJ-123(url) → [PROJ-123](url) ---
  text = text.replace(/(?<!\[)([A-Z]+-\d+)\((https?:\/\/[^)]+)\)/g, '[$1]($2)');

  // --- Convert bare Jira browse URLs to labeled links ---
  // https://instance.atlassian.net/browse/PROJ-123 → [PROJ-123](url)
  // Match any bare URL not already inside a markdown link [text](url)
  text = text.replace(/(?<!\]\()(https?:\/\/[^\s)]+\/browse\/([A-Z]+-\d+))\s*/g, '[$2]($1) ');

  // --- Clean up smart-link/smart-card residue ---
  // [Smart link to Jira PROJ-123](url) → [PROJ-123](url)
  text = text.replace(/\[Smart link to Jira ([A-Z]+-\d+)\]/g, '[$1]');
  // (url|smart-card) orphaned after link conversion → remove
  text = text.replace(/\(([^)]+)\|smart-card\)/g, '');
  // (url) immediately after another (url) — double URL artifact → keep first only
  text = text.replace(/\((https?:\/\/[^)]+)\)\(\1\)/g, '($1)');

  // --- Convert header markers to markdown headers ---
  text = text.replace(new RegExp(`^${HEADER_MARKER}1 `, 'gm'), '# ');
  text = text.replace(new RegExp(`^${HEADER_MARKER}2 `, 'gm'), '## ');
  text = text.replace(new RegExp(`^${HEADER_MARKER}3 `, 'gm'), '### ');
  text = text.replace(new RegExp(`^${HEADER_MARKER}4 `, 'gm'), '#### ');
  text = text.replace(new RegExp(`^${HEADER_MARKER}5 `, 'gm'), '##### ');
  text = text.replace(new RegExp(`^${HEADER_MARKER}6 `, 'gm'), '###### ');

  // --- Clean up artifacts ---
  // Remove orphaned list markers (#** or **** without content that remain after conversion)
  text = text.replace(/^[#*]{2,}\s*$/gm, '');
  // Collapse consecutive horizontal rules (----) into one
  text = text.replace(/(?:^-{4,}\s*\n?){2,}/gm, '----\n');
  // Collapse 3+ blank lines to 2
  text = text.replace(/\n{3,}/g, '\n\n');
  // Trim trailing whitespace per line
  text = text.replace(/[ \t]+$/gm, '');

  return text;
}

/**
 * Extract acceptance criteria from Jira field.
 *
 * Converts Jira markup, extracts bullet points, and removes "Verify" prefix.
 *
 * @param acText - Raw acceptance criteria text from Jira
 * @returns List of criteria strings
 */
export function extractAcceptanceCriteria(acText: string): string[] {
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
      // Remove "Verify" prefix if present (handles **Verify**, *Verify*, and plain Verify)
      criterion = criterion.replace(/^\*{0,2}Verify\*{0,2}\s+/i, '');
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
 * Handles both Jira format ("18/Nov/25 12:59 PM") and ISO format ("2025-11-18").
 *
 * @param jiraDateStr - Jira date string
 * @returns ISO 8601 date string (YYYY-MM-DD) or null if parsing fails
 */
export function parseJiraDate(jiraDateStr: string): string | null {
  if (!jiraDateStr || jiraDateStr.trim() === '') {
    return null;
  }

  const trimmed = jiraDateStr.trim();

  // Try parsing Jira format: "18/Nov/25 12:59 PM"
  const jiraMatch = trimmed.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2})/);
  if (jiraMatch) {
    const [, day, monthStr, yearShort] = jiraMatch;
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
    };
    const month = monthMap[monthStr];
    if (!month) return null;

    // Convert 2-digit year to 4-digit year (assume 20xx)
    const year = `20${yearShort}`;
    const paddedDay = day.padStart(2, '0');

    return `${year}-${month}-${paddedDay}`;
  }

  // Try parsing ISO format: "2025-11-18"
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    // Validate date
    const date = new Date(`${year}-${month}-${day}`);
    if (isNaN(date.getTime())) return null;
    if (parseInt(month) > 12 || parseInt(month) < 1) return null;
    if (parseInt(day) > 31 || parseInt(day) < 1) return null;

    return `${year}-${month}-${day}`;
  }

  return null;
}
