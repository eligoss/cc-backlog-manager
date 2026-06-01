/**
 * Epic Handler Module
 *
 * Handles epic file generation with:
 * - Business Value and Goals sections
 * - Child Stories listing with story point totals
 * - Epic-specific body structure
 *
 * @module epic-handler
 */

import fs from 'fs-extra';
import path from 'path';
import { CsvTicket } from './types.js';
import { convertJiraToMarkdown } from './csv-extractor.js';
import { mapPriority } from './ticket-generator.js';

/**
 * Result of writing an epic file
 */
export interface WriteEpicResult {
  status: 'created' | 'updated' | 'skipped';
  filename: string;
  filePath: string;
}

/**
 * Find child tickets for an epic.
 *
 * @param tickets - All tickets to search
 * @param epicKey - Epic ticket ID (e.g., 'DAPM-100')
 * @returns Array of tickets with parentKey matching epicKey
 */
export function findChildTickets(tickets: CsvTicket[], epicKey: string): CsvTicket[] {
  return tickets.filter(ticket => ticket.parentKey === epicKey);
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

  // Check if value needs quoting
  const needsQuotes = /[:#[\]{}|>&*!?,\n]/.test(str) ||
    str.startsWith('-') ||
    str.startsWith('@') ||
    str === 'true' ||
    str === 'false' ||
    str === 'null' ||
    /^\d/.test(str);

  if (needsQuotes) {
    const escaped = str.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * Generate epic file content with frontmatter and body.
 *
 * Epic structure:
 * - YAML frontmatter
 * - H1 title
 * - ## Description
 *   - Business Value
 *   - Goals
 * - ## Child Stories
 *   - Grouped by type with story points
 *
 * @param epic - Epic ticket data
 * @param children - Child tickets belonging to this epic
 * @returns Complete markdown file content
 */
export function generateEpicContent(epic: CsvTicket, children: CsvTicket[]): string {
  // Generate YAML frontmatter
  const jiraBaseUrl = 'https://wencosupport.atlassian.net/browse';
  const jiraUrl = `${jiraBaseUrl}/${epic.ticketId}`;

  // Calculate metrics
  const stories = children.filter(t => t.documentType === 'story')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const tasks = children.filter(t => t.documentType === 'task')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const bugs = children.filter(t => t.documentType === 'bug')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const spikes = children.filter(t => t.documentType === 'spike')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const totalSp = children.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const storiesSp = stories.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const tasksSp = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const bugsSp = bugs.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const doneCount = children.filter(t => t.status?.toLowerCase() === 'done').length;
  const inProgressStatuses = ['in progress', 'development', 'in review', 'in testing'];
  const inProgressCount = children.filter(t => inProgressStatuses.includes(t.status?.toLowerCase() || '')).length;
  const todoCount = children.length - doneCount - inProgressCount;

  // Build lean YAML frontmatter (only populated fields, no nulls)
  const yamlLines: string[] = [];
  yamlLines.push(`documentType: epic`);
  yamlLines.push(`title: ${formatYamlValue(epic.summary)}`);
  yamlLines.push(`jira-ticketId: ${formatYamlValue(epic.ticketId)}`);
  yamlLines.push(`jira-url: ${formatYamlValue(jiraUrl)}`);
  yamlLines.push(`childCount: ${children.length}`);
  yamlLines.push(`committed: ${totalSp}`);
  yamlLines.push(`stories: { count: ${stories.length}, sp: ${storiesSp} }`);
  yamlLines.push(`tasks: { count: ${tasks.length}, sp: ${tasksSp} }`);
  yamlLines.push(`bugs: { count: ${bugs.length}, sp: ${bugsSp} }`);
  yamlLines.push(`status: { done: ${doneCount}, inProgress: ${inProgressCount}, todo: ${todoCount} }`);
  if (epic.fixVersions) {
    yamlLines.push(`fixVersion: ${formatYamlValue(epic.fixVersions)}`);
  }
  if (epic.sprint) {
    yamlLines.push(`sprints: [${formatYamlValue(epic.sprint)}]`);
  }
  // Get unique assignees — sorted alphabetically
  const assignees = [...new Set(children.filter(t => t.assignee).map(t => t.assignee!))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  if (assignees.length > 0) {
    yamlLines.push(`assignees: [${assignees.map(a => formatYamlValue(a)).join(', ')}]`);
  }
  if (epic.priority) {
    yamlLines.push(`priority: ${formatYamlValue(mapPriority(epic.priority))}`);
  }
  if (epic.labels && epic.labels.length > 0) {
    yamlLines.push(`labels: ${formatYamlValue(epic.labels)}`);
  }
  if (epic.createdDate) {
    yamlLines.push(`createdDate: ${formatYamlValue(epic.createdDate)}`);
  }

  const yaml = yamlLines.join('\n');

  // Generate body content
  const bodyLines: string[] = [];

  // H1 Title
  bodyLines.push(`# ${epic.summary}`);
  bodyLines.push('');

  // Description section (only if Jira has content)
  if (epic.description) {
    bodyLines.push('## Description');
    bodyLines.push('');
    const markdownDescription = convertJiraToMarkdown(epic.description);
    bodyLines.push(markdownDescription);
    bodyLines.push('');
  }

  // Epic Info
  bodyLines.push('## Epic Info');
  bodyLines.push('');
  bodyLines.push(`- **Total Story Points:** ${totalSp} SP`);
  bodyLines.push(`- **Child Tickets:** ${children.length}`);
  bodyLines.push(`  - Stories: ${stories.length}`);
  bodyLines.push(`  - Tasks: ${tasks.length}`);
  bodyLines.push(`  - Bugs: ${bugs.length}`);
  if (spikes.length > 0) {
    bodyLines.push(`  - Spikes: ${spikes.length}`);
  }
  bodyLines.push(`- **Status:** ${doneCount} Done, ${inProgressCount} In Progress, ${todoCount} To Do`);
  if (epic.fixVersions) {
    bodyLines.push(`- **Fix Version:** ${epic.fixVersions}`);
  }
  bodyLines.push('');

  // Child Tickets section
  bodyLines.push('## Child Tickets');
  bodyLines.push('');

  if (children.length === 0) {
    bodyLines.push('*No child tickets in this export*');
    bodyLines.push('');
  } else {
    // Helper to format child ticket line with SP, status, and assignee
    const formatChild = (t: CsvTicket): string => {
      const sp = t.storyPoints ? `${t.storyPoints} SP` : '';
      const status = t.status?.toLowerCase() === 'done' ? 'Done'
        : ['in progress', 'development', 'in review', 'in testing'].includes(t.status?.toLowerCase() || '') ? 'In Progress'
        : 'To Do';
      const assignee = t.assignee || 'unassigned';
      const meta = [sp, status, assignee].filter(Boolean).join(' | ');
      return `- [${t.ticketId}](../tickets/${t.filename}) - ${t.summary} — ${meta}`;
    };

    if (stories.length > 0) {
      bodyLines.push('### Stories');
      bodyLines.push('');
      stories.forEach(t => bodyLines.push(formatChild(t)));
      bodyLines.push('');
    }
    if (tasks.length > 0) {
      bodyLines.push('### Tasks');
      bodyLines.push('');
      tasks.forEach(t => bodyLines.push(formatChild(t)));
      bodyLines.push('');
    }
    if (bugs.length > 0) {
      bodyLines.push('### Bugs');
      bodyLines.push('');
      bugs.forEach(t => bodyLines.push(formatChild(t)));
      bodyLines.push('');
    }
    if (spikes.length > 0) {
      bodyLines.push('### Spikes');
      bodyLines.push('');
      spikes.forEach(t => bodyLines.push(formatChild(t)));
      bodyLines.push('');
    }
  }

  bodyLines.push('---');
  bodyLines.push('');
  bodyLines.push(`*Generated from Jira export on ${new Date().toISOString().split('T')[0]}*`);
  bodyLines.push('');

  const body = bodyLines.join('\n');

  return `---\n${yaml}\n---\n\n${body}`;
}

/**
 * Write epic file to backlog/epics/ directory.
 *
 * @param epic - Epic ticket data
 * @param basePath - Base path to backlog directory
 * @param children - Child tickets for this epic
 * @param dryRun - If true, don't write the file
 * @returns Write result with status and paths
 */
export async function writeEpicFile(
  epic: CsvTicket,
  basePath: string,
  children: CsvTicket[],
  dryRun: boolean = false
): Promise<WriteEpicResult> {
  const epicsDir = path.join(basePath, 'epics');
  const filePath = path.join(epicsDir, epic.filename);

  let fileExists = false;

  if (!dryRun) {
    await fs.ensureDir(epicsDir);
    fileExists = await fs.pathExists(filePath);
  }

  // Generate content
  const content = generateEpicContent(epic, children);

  if (!dryRun) {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  return {
    status: fileExists ? 'updated' : 'created',
    filename: epic.filename,
    filePath,
  };
}
