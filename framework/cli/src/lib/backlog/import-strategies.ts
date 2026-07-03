/**
 * Import Strategies Module
 *
 * Handles CSV import with new flat folder structure:
 * - backlog/tickets/ - All ticket types (stories, tasks, bugs, spikes)
 * - backlog/epics/ - Epic files
 * - backlog/sprints/ - Sprint index files
 * - backlog/milestones/ - Milestone index files
 *
 * Features:
 * - Flat ticket structure (type determined by YAML documentType, not folder)
 * - Epic handling with child story aggregation
 * - Deduplication modes: error, skip, force (default: force/overwrite)
 * - Auto-detection of sprints and milestones from CSV
 *
 * @module import-strategies
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { parseFrontmatter } from '../common/yaml-frontmatter.js';
import { CsvTicket } from './types.js';
import { generateTicketContent } from './ticket-generator.js';
import { writeEpicFile, findChildTickets } from './epic-handler.js';

export type { CsvTicket };

/**
 * Normalize Jira workflow status to display category.
 */
function normalizeStatusDisplay(status: string | undefined): string {
  if (!status) return 'To Do';
  const s = status.toLowerCase();
  if (s === 'done') return 'Done';
  if (['in progress', 'development', 'in review', 'in testing'].includes(s)) return 'In Progress';
  return 'To Do';
}

/**
 * Import mode: sprint or milestone (now optional - auto-detect supported)
 */
export type ImportMode = 'sprint' | 'milestone' | 'auto';

/**
 * Deduplication mode: error, skip, or force
 * Default is now 'force' (overwrite existing files)
 */
export type DuplicateMode = 'error' | 'skip' | 'force';

/**
 * Import strategy options
 */
export interface ImportStrategyOptions {
  /** Import mode: sprint, milestone, or auto (auto-detect from CSV) */
  mode: ImportMode;
  /** Deduplication mode: error, skip, or force (default: force) */
  duplicateMode: DuplicateMode;
  /** Sprint ID (optional - auto-detected if not provided) */
  sprintId?: string;
  /** Milestone ID (optional - auto-detected if not provided) */
  milestoneId?: string;
  /** Base path to backlog directory */
  basePath: string;
  /** Dry run mode (validate only, don't write) */
  dryRun?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Import strategy result
 */
export interface ImportStrategyResult {
  /** List of created ticket filenames */
  created: string[];
  /** List of updated ticket filenames */
  updated: string[];
  /** List of skipped ticket filenames */
  skipped: string[];
  /** List of errors encountered */
  errors: Array<{ ticket: string; error: string }>;
  /** List of epics created */
  epics: string[];
  /** List of sprints detected/created */
  sprints: string[];
  /** List of milestones detected/created */
  milestones: string[];
}

/**
 * Group tickets by sprint.
 *
 * @param tickets - List of CSV tickets
 * @returns Map of sprint ID to array of tickets
 */
export function groupTicketsBySprint(tickets: CsvTicket[]): Map<string, CsvTicket[]> {
  const grouped = new Map<string, CsvTicket[]>();

  for (const ticket of tickets) {
    const sprint = ticket.sprint?.trim() || 'unassigned';

    const existing = grouped.get(sprint);
    if (existing) {
      existing.push(ticket);
    } else {
      grouped.set(sprint, [ticket]);
    }
  }

  return grouped;
}

/**
 * Group tickets by milestone.
 *
 * @param tickets - List of CSV tickets
 * @returns Map of milestone ID to array of tickets
 */
export function groupTicketsByMilestone(tickets: CsvTicket[]): Map<string, CsvTicket[]> {
  const grouped = new Map<string, CsvTicket[]>();

  for (const ticket of tickets) {
    const milestone = ticket.milestone?.trim() || 'unassigned';

    const existing = grouped.get(milestone);
    if (existing) {
      existing.push(ticket);
    } else {
      grouped.set(milestone, [ticket]);
    }
  }

  return grouped;
}

/**
 * Detect if a ticket already exists in the backlog.
 *
 * Searches flat tickets directory for existing tickets by:
 * 1. Matching jira-ticketId in frontmatter
 * 2. Matching summary/title (exact match)
 * 3. Matching filename pattern
 *
 * @param ticket - CSV ticket to check
 * @param basePath - Base path to backlog directory
 * @returns Filename of existing ticket, or null if not found
 */
export async function detectExistingTicket(
  ticket: CsvTicket,
  basePath: string
): Promise<string | null> {
  // For epics, check epics directory
  if (ticket.documentType === 'epic') {
    const epicsDir = path.join(basePath, 'epics');
    return detectExistingInDir(ticket, epicsDir);
  }

  // For all other tickets, check flat tickets directory
  const ticketsDir = path.join(basePath, 'tickets');
  return detectExistingInDir(ticket, ticketsDir);
}

/**
 * Check for existing ticket in a specific directory.
 */
async function detectExistingInDir(
  ticket: CsvTicket,
  directory: string
): Promise<string | null> {
  if (!(await fs.pathExists(directory))) {
    return null;
  }

  const pattern = path.join(directory, '*.md');
  const files = await glob(pattern, { absolute: false });

  for (const file of files) {
    const filename = path.basename(file);

    if (filename === 'README.md') {
      continue;
    }

    const filePath = path.join(directory, filename);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = parseFrontmatter(content);

      // Check 1: Match by jira-ticketId
      if (data['jira-ticketId'] === ticket.ticketId) {
        return filename;
      }

      // Check 2: Match by title/summary
      if (data.title === ticket.summary || data.summary === ticket.summary) {
        return filename;
      }

      // Check 3: Match by ticket number in filename
      const ticketNumber = ticket.ticketId.replace(/^[A-Z]+-/, '');
      const filenamePattern = new RegExp(`^${ticketNumber}-`);

      if (filenamePattern.test(filename)) {
        return filename;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Write a ticket file to backlog/tickets/ directory (flat structure).
 *
 * @param ticket - CSV ticket data
 * @param basePath - Base path to backlog directory
 * @param dryRun - If true, don't write the file
 * @param existingFilename - If provided, update this file instead
 * @returns Status: 'created', 'updated', or 'skipped'
 */
async function writeTicketFile(
  ticket: CsvTicket,
  basePath: string,
  dryRun: boolean = false,
  existingFilename?: string
): Promise<'created' | 'updated' | 'skipped'> {
  // Flat tickets directory - no subfolders by type
  const ticketsDir = path.join(basePath, 'tickets');

  const filename = existingFilename || ticket.filename;
  const filePath = path.join(ticketsDir, filename);

  if (!dryRun) {
    await fs.ensureDir(ticketsDir);
  }

  const fileExists = !dryRun && await fs.pathExists(filePath);

  // Use ticket-generator for v10.1.1 compliant content
  const content = generateTicketContent(ticket);

  if (!dryRun) {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  return fileExists ? 'updated' : 'created';
}

/**
 * Load already-imported tickets from the flat tickets directory.
 *
 * Reconstructs the minimal CsvTicket fields needed to regenerate sprint and
 * milestone index files (membership, status, story points, assignee, parent).
 * This lets index files be derived from the FULL on-disk backlog rather than
 * only the tickets in the CSV currently being imported — preventing a later
 * import from clobbering a sprint/milestone index that an earlier import filled.
 *
 * @param basePath - Backlog base path (contains tickets/)
 * @returns Reconstructed tickets (empty if the directory is missing)
 */
export async function loadTicketsFromDisk(basePath: string): Promise<CsvTicket[]> {
  const tickets: CsvTicket[] = [];

  for (const subdir of ['tickets', 'epics']) {
    const dir = path.join(basePath, subdir);
    if (!(await fs.pathExists(dir))) {
      continue;
    }

    const files = (await fs.readdir(dir)).filter(
      (f) => f.endsWith('.md') && f !== 'README.md'
    );

    for (const filename of files) {
      try {
        const content = await fs.readFile(path.join(dir, filename), 'utf-8');
        const { data } = parseFrontmatter<Record<string, unknown>>(content);
        const ticketId = (data['jira-ticketId'] as string) || '';
        if (!ticketId) {
          continue;
        }
        const milestone =
          (data['jira-fixVersion'] as string) || (data.milestone as string) || undefined;
        const rawSp = data.storyPoints;
        const storyPoints =
          typeof rawSp === 'number'
            ? rawSp
            : typeof rawSp === 'string' && !isNaN(Number(rawSp))
            ? Number(rawSp)
            : undefined;
        tickets.push({
          ticketId,
          summary: (data.title as string) || ticketId,
          issueType: '',
          documentType: (data.documentType as CsvTicket['documentType']) || 'task',
          status: data.status as string | undefined,
          storyPoints,
          assignee: data.assignee as string | undefined,
          parentKey: data['jira-parent'] as string | undefined,
          sprint: data.sprint as string | undefined,
          fixVersions: milestone,
          milestone,
          filename,
        });
      } catch (err) {
        console.warn(`Warning: skipping unreadable ticket ${filename}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return tickets;
}

/**
 * Combine the current import's tickets (full in-memory data) with previously
 * imported tickets read from disk, de-duplicated by ticketId (current wins).
 */
function unionWithDisk(currentTickets: CsvTicket[], diskTickets: CsvTicket[]): CsvTicket[] {
  const currentIds = new Set(currentTickets.map((t) => t.ticketId));
  const prior = diskTickets.filter((t) => !currentIds.has(t.ticketId));
  return [...currentTickets, ...prior];
}

/**
 * Execute import strategy based on mode and options.
 *
 * Main entry point for import strategies. Processes all tickets:
 * - Tickets go to backlog/tickets/ (flat)
 * - Epics go to backlog/epics/
 * - Sprint/milestone index files auto-generated
 *
 * @param tickets - List of CSV tickets to import
 * @param options - Import strategy options
 * @returns Import result with created, updated, skipped, and error lists
 */
export async function executeImportStrategy(
  tickets: CsvTicket[],
  options: ImportStrategyOptions
): Promise<ImportStrategyResult> {
  const result: ImportStrategyResult = {
    created: [],
    updated: [],
    skipped: [],
    errors: [],
    epics: [],
    sprints: [],
    milestones: [],
  };

  const { duplicateMode, basePath, dryRun = false, verbose = false } = options;

  // Separate epics from regular tickets
  const epics = tickets.filter(t => t.documentType === 'epic');
  const regularTickets = tickets.filter(t => t.documentType !== 'epic');

  // Step 1: Detect existing tickets (for skip/error modes)
  const existingMap = new Map<string, string>();

  if (duplicateMode !== 'force') {
    for (const ticket of tickets) {
      const existing = await detectExistingTicket(ticket, basePath);
      if (existing) {
        existingMap.set(ticket.ticketId, existing);
      }
    }
  }

  // Step 2: Handle deduplication mode
  if (duplicateMode === 'error' && existingMap.size > 0) {
    const duplicates = Array.from(existingMap.keys()).slice(0, 10).join(', ');
    const more = existingMap.size > 10 ? ` and ${existingMap.size - 10} more` : '';
    throw new Error(
      `Found ${existingMap.size} existing tickets: ${duplicates}${more}\n` +
      'Use --force to overwrite or --skip to skip them.'
    );
  }

  // IDs of regular tickets skipped in this import (not written to disk).
  // These must not override on-disk state in the sprint/milestone union.
  const skippedTicketIds = new Set<string>();

  // Step 3: Process regular tickets (to flat tickets directory)
  for (const ticket of regularTickets) {
    try {
      const existing = existingMap.get(ticket.ticketId);

      if (existing && duplicateMode === 'skip') {
        result.skipped.push(ticket.filename);
        skippedTicketIds.add(ticket.ticketId);
        if (verbose) {
          console.error(`⏭️  Skipped: ${ticket.ticketId} (already exists)`);
        }
        continue;
      }

      const status = await writeTicketFile(ticket, basePath, dryRun, existing);

      if (status === 'created') {
        result.created.push(ticket.filename);
        if (verbose) {
          console.error(`✅ Created: ${ticket.ticketId}`);
        }
      } else if (status === 'updated') {
        result.updated.push(existing || ticket.filename);
        if (verbose) {
          console.error(`🔄 Updated: ${ticket.ticketId}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ ticket: ticket.ticketId, error: errorMessage });
      if (verbose) {
        console.error(`❌ Error: ${ticket.ticketId} - ${errorMessage}`);
      }
    }
  }

  // Step 4: Process epics (to epics directory)
  for (const epic of epics) {
    try {
      const existing = existingMap.get(epic.ticketId);

      if (existing && duplicateMode === 'skip') {
        result.skipped.push(epic.filename);
        if (verbose) {
          console.error(`⏭️  Skipped epic: ${epic.ticketId} (already exists)`);
        }
        continue;
      }

      // Find child tickets for this epic
      const children = findChildTickets(tickets, epic.ticketId);

      const epicResult = await writeEpicFile(epic, basePath, children, dryRun);

      result.epics.push(epicResult.filename);
      if (verbose) {
        console.error(`📁 ${epicResult.status === 'created' ? 'Created' : 'Updated'} epic: ${epic.ticketId} (${children.length} children)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ ticket: epic.ticketId, error: errorMessage });
      if (verbose) {
        console.error(`❌ Error epic: ${epic.ticketId} - ${errorMessage}`);
      }
    }
  }

  // Step 4b: Generate stub epic files for parentKeys not already in the ticket list
  const allTicketIds = new Set(tickets.map(t => t.ticketId));
  const parentKeysReferenced = new Set(
    regularTickets
      .filter(t => t.parentKey)
      .map(t => t.parentKey!)
  );
  const missingEpicKeys = [...parentKeysReferenced].filter(pk => !allTicketIds.has(pk));

  for (const epicKey of missingEpicKeys) {
    try {
      const childTickets = regularTickets.filter(t => t.parentKey === epicKey);
      const stubResult = await writeEpicStubFile(epicKey, childTickets, basePath, dryRun);

      result.epics.push(stubResult.filename);
      if (verbose) {
        console.error(`📁 Created epic stub: ${epicKey} (${childTickets.length} children)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ ticket: epicKey, error: `Epic stub: ${errorMessage}` });
      if (verbose) {
        console.error(`❌ Error epic stub: ${epicKey} - ${errorMessage}`);
      }
    }
  }

  // Derive index files from the FULL on-disk backlog (union of the tickets just
  // imported plus everything previously imported), so a later CSV cannot clobber
  // a sprint/milestone index that an earlier CSV populated. The summary still
  // reports only the sprints/milestones present in the CURRENT CSV.
  //
  // Exclude skipped tickets from the "current batch" side of the union: they
  // were not written to disk, so the on-disk version must win for those IDs.
  const effectiveRegularTickets = regularTickets.filter(t => !skippedTicketIds.has(t.ticketId));
  const diskTickets = await loadTicketsFromDisk(basePath);
  const allTickets = unionWithDisk(effectiveRegularTickets, diskTickets);

  const currentSprints = new Set(
    effectiveRegularTickets.map((t) => t.sprint?.trim()).filter((s): s is string => !!s)
  );
  const currentMilestones = new Set(
    effectiveRegularTickets.map((t) => t.milestone?.trim()).filter((m): m is string => !!m)
  );

  // Step 5: Auto-generate sprint index files (union membership)
  const sprintGroups = groupTicketsBySprint(allTickets);
  for (const [sprintId, sprintTickets] of sprintGroups) {
    if (sprintId !== 'unassigned') {
      await generateSprintIndex(sprintTickets, sprintId, basePath, dryRun, verbose);
      if (currentSprints.has(sprintId)) {
        result.sprints.push(sprintId);
      }
    }
  }

  // Step 6: Auto-generate milestone index files (union membership)
  const milestoneGroups = groupTicketsByMilestone(allTickets);
  for (const [milestoneId, milestoneTickets] of milestoneGroups) {
    if (milestoneId !== 'unassigned') {
      await generateMilestoneIndex(milestoneTickets, milestoneId, basePath, dryRun, verbose);
      if (currentMilestones.has(milestoneId)) {
        result.milestones.push(milestoneId);
      }
    }
  }

  return result;
}

/**
 * Generate sprint index file.
 */
async function generateSprintIndex(
  tickets: CsvTicket[],
  sprintId: string,
  basePath: string,
  dryRun: boolean,
  verbose: boolean
): Promise<void> {
  const sprintsDir = path.join(basePath, 'sprints');
  const sanitizedId = sprintId.replace(/[^a-zA-Z0-9-_]/g, '-');
  const sprintFile = path.join(sprintsDir, `${sanitizedId}.md`);

  if (!dryRun) {
    await fs.ensureDir(sprintsDir);
  }

  const totalSp = tickets.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const stories = tickets.filter(t => t.documentType === 'story')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const tasks = tickets.filter(t => t.documentType === 'task')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const bugs = tickets.filter(t => t.documentType === 'bug')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const spikes = tickets.filter(t => t.documentType === 'spike')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));

  // Count statuses
  const doneCount = tickets.filter(t => t.status?.toLowerCase() === 'done').length;
  const inProgressStatuses = ['in progress', 'development', 'in review', 'in testing'];
  const inProgressCount = tickets.filter(t => inProgressStatuses.includes(t.status?.toLowerCase() || '')).length;
  const todoCount = tickets.length - doneCount - inProgressCount;

  // Get fix version (use most common)
  const fixVersion = tickets.find(t => t.fixVersions)?.fixVersions || null;

  // Get unique parent epics — sorted by numeric ticket number ascending
  const parentEpics = [...new Set(tickets.filter(t => t.parentKey).map(t => t.parentKey!))]
    .sort((a, b) => parseInt(a.replace(/^[A-Z]+-/, '')) - parseInt(b.replace(/^[A-Z]+-/, '')));

  // SP breakdown by type
  const storiesSp = stories.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const tasksSp = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const bugsSp = bugs.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const spikesSp = spikes.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  // Get unique assignees — sorted alphabetically
  const assignees = [...new Set(tickets.filter(t => t.assignee).map(t => t.assignee!))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const yamlLines = [
    `documentType: sprint`,
    `sprintId: "${sprintId}"`,
    `sprintName: "Sprint ${sprintId}"`,
    `committed: ${totalSp}`,
    `ticketCount: ${tickets.length}`,
    `stories: { count: ${stories.length}, sp: ${storiesSp} }`,
    `tasks: { count: ${tasks.length}, sp: ${tasksSp} }`,
    `bugs: { count: ${bugs.length}, sp: ${bugsSp} }`,
  ];
  if (spikes.length > 0) {
    yamlLines.push(`spikes: { count: ${spikes.length}, sp: ${spikesSp} }`);
  }
  yamlLines.push(`status: { done: ${doneCount}, inProgress: ${inProgressCount}, todo: ${todoCount} }`);
  if (fixVersion) {
    yamlLines.push(`fixVersion: "${fixVersion}"`);
  }
  if (parentEpics.length > 0) {
    yamlLines.push(`parentEpics: [${parentEpics.map(e => `"${e}"`).join(', ')}]`);
  }
  if (assignees.length > 0) {
    yamlLines.push(`assignees: [${assignees.map(a => `"${a}"`).join(', ')}]`);
  }

  const yaml = yamlLines.join('\n');

  let content = `---\n${yaml}\n---\n\n`;
  content += `# Sprint: ${sprintId}\n\n`;
  content += `## Sprint Info\n\n`;
  content += `- **Committed Story Points:** ${totalSp} SP\n`;
  content += `- **Total Tickets:** ${tickets.length}\n`;
  content += `  - Stories: ${stories.length}\n`;
  content += `  - Tasks: ${tasks.length}\n`;
  content += `  - Bugs: ${bugs.length}\n`;
  if (spikes.length > 0) {
    content += `  - Spikes: ${spikes.length}\n`;
  }
  content += `- **Status:** ${doneCount} Done, ${inProgressCount} In Progress, ${todoCount} To Do\n`;
  if (fixVersion) {
    content += `- **Fix Version:** ${fixVersion}\n`;
  }
  if (parentEpics.length > 0) {
    content += `- **Parent Epics:** ${parentEpics.join(', ')}\n`;
  }
  content += `\n`;
  content += `## Committed Tickets\n\n`;

  // Helper to format a ticket line with SP, status, and assignee
  const formatTicketLine = (t: CsvTicket): string => {
    const sp = t.storyPoints ? `${t.storyPoints} SP` : '';
    const status = normalizeStatusDisplay(t.status);
    const assignee = t.assignee || 'unassigned';
    const meta: string[] = [];
    if (sp) meta.push(sp);
    meta.push(status);
    meta.push(assignee);
    const parent = t.parentKey ? ` _(${t.parentKey})_` : '';
    return `- [${t.ticketId}](../tickets/${t.filename}) - ${t.summary} — ${meta.join(' | ')}${parent}\n`;
  };

  if (stories.length > 0) {
    content += `### Stories\n\n`;
    for (const t of stories) {
      content += formatTicketLine(t);
    }
    content += `\n`;
  }

  if (tasks.length > 0) {
    content += `### Tasks\n\n`;
    for (const t of tasks) {
      content += formatTicketLine(t);
    }
    content += `\n`;
  }

  if (bugs.length > 0) {
    content += `### Bugs\n\n`;
    for (const t of bugs) {
      content += formatTicketLine(t);
    }
    content += `\n`;
  }

  if (spikes.length > 0) {
    content += `### Spikes\n\n`;
    for (const t of spikes) {
      content += formatTicketLine(t);
    }
    content += `\n`;
  }

  content += `---\n\n*Generated from Jira export on ${new Date().toISOString().split('T')[0]}*\n`;

  if (!dryRun) {
    await fs.writeFile(sprintFile, content, 'utf-8');
    if (verbose) {
      console.error(`📅 Created sprint index: ${sanitizedId}`);
    }
  } else if (verbose) {
    console.error(`[DRY RUN] Would create sprint index: ${sanitizedId}`);
  }
}

/**
 * Generate milestone index file.
 */
async function generateMilestoneIndex(
  tickets: CsvTicket[],
  milestoneId: string,
  basePath: string,
  dryRun: boolean,
  verbose: boolean
): Promise<void> {
  const milestonesDir = path.join(basePath, 'milestones');
  const sanitizedId = milestoneId
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-{2,}/g, '-')       // Collapse double+ hyphens
    .replace(/^-+|-+$/g, '');     // Strip leading/trailing hyphens
  const milestoneFile = path.join(milestonesDir, `${sanitizedId}.md`);

  if (!dryRun) {
    await fs.ensureDir(milestonesDir);
  }

  const totalSp = tickets.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const stories = tickets.filter(t => t.documentType === 'story')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const tasks = tickets.filter(t => t.documentType === 'task')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const bugs = tickets.filter(t => t.documentType === 'bug')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const spikes = tickets.filter(t => t.documentType === 'spike')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));

  // SP breakdown by type
  const storiesSp = stories.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const tasksSp = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const bugsSp = bugs.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const spikesSp = spikes.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  // Count statuses
  const doneCount = tickets.filter(t => t.status?.toLowerCase() === 'done').length;
  const inProgressStatuses = ['in progress', 'development', 'in review', 'in testing'];
  const inProgressCount = tickets.filter(t => inProgressStatuses.includes(t.status?.toLowerCase() || '')).length;
  const todoCount = tickets.length - doneCount - inProgressCount;

  // Get unique parent epics — sorted by numeric ticket number ascending
  const parentEpics = [...new Set(tickets.filter(t => t.parentKey).map(t => t.parentKey!))]
    .sort((a, b) => parseInt(a.replace(/^[A-Z]+-/, '')) - parseInt(b.replace(/^[A-Z]+-/, '')));

  // Get unique sprints — sorted alphabetically
  const sprints = [...new Set(tickets.filter(t => t.sprint).map(t => t.sprint!))].sort();

  // Get unique assignees — sorted alphabetically
  const assignees = [...new Set(tickets.filter(t => t.assignee).map(t => t.assignee!))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const yamlLines = [
    `documentType: milestone`,
    `milestone: "${milestoneId}"`,
    `title: "Milestone ${milestoneId}"`,
    `committed: ${totalSp}`,
    `ticketCount: ${tickets.length}`,
    `stories: { count: ${stories.length}, sp: ${storiesSp} }`,
    `tasks: { count: ${tasks.length}, sp: ${tasksSp} }`,
    `bugs: { count: ${bugs.length}, sp: ${bugsSp} }`,
  ];
  if (spikes.length > 0) {
    yamlLines.push(`spikes: { count: ${spikes.length}, sp: ${spikesSp} }`);
  }
  yamlLines.push(`status: { done: ${doneCount}, inProgress: ${inProgressCount}, todo: ${todoCount} }`);
  if (parentEpics.length > 0) {
    yamlLines.push(`parentEpics: [${parentEpics.map(e => `"${e}"`).join(', ')}]`);
  }
  if (sprints.length > 0) {
    yamlLines.push(`sprints: [${sprints.map(s => `"${s}"`).join(', ')}]`);
  }
  if (assignees.length > 0) {
    yamlLines.push(`assignees: [${assignees.map(a => `"${a}"`).join(', ')}]`);
  }

  const yaml = yamlLines.join('\n');

  let content = `---\n${yaml}\n---\n\n`;
  content += `# Milestone: ${milestoneId}\n\n`;
  content += `## Release Info\n\n`;
  content += `- **Committed Story Points:** ${totalSp} SP\n`;
  content += `- **Total Tickets:** ${tickets.length}\n`;
  content += `  - Stories: ${stories.length}\n`;
  content += `  - Tasks: ${tasks.length}\n`;
  content += `  - Bugs: ${bugs.length}\n`;
  if (spikes.length > 0) {
    content += `  - Spikes: ${spikes.length}\n`;
  }
  content += `- **Status:** ${doneCount} Done, ${inProgressCount} In Progress, ${todoCount} To Do\n`;
  if (parentEpics.length > 0) {
    content += `- **Parent Epics:** ${parentEpics.join(', ')}\n`;
  }
  if (sprints.length > 0) {
    content += `- **Sprints:** ${sprints.join(', ')}\n`;
  }
  content += `\n`;
  content += `## All Tickets\n\n`;

  // Helper to format a ticket line
  const formatTicketLine = (t: CsvTicket): string => {
    const sp = t.storyPoints ? `${t.storyPoints} SP` : '';
    const status = normalizeStatusDisplay(t.status);
    const assignee = t.assignee || 'unassigned';
    const meta: string[] = [];
    if (sp) meta.push(sp);
    meta.push(status);
    meta.push(assignee);
    const parent = t.parentKey ? ` _(${t.parentKey})_` : '';
    return `- [${t.ticketId}](../tickets/${t.filename}) - ${t.summary} — ${meta.join(' | ')}${parent}\n`;
  };

  if (stories.length > 0) {
    content += `### Stories\n\n`;
    for (const t of stories) {
      content += formatTicketLine(t);
    }
    content += `\n`;
  }

  if (tasks.length > 0) {
    content += `### Tasks\n\n`;
    for (const t of tasks) {
      content += formatTicketLine(t);
    }
    content += `\n`;
  }

  if (bugs.length > 0) {
    content += `### Bugs\n\n`;
    for (const t of bugs) {
      content += formatTicketLine(t);
    }
    content += `\n`;
  }

  if (spikes.length > 0) {
    content += `### Spikes\n\n`;
    for (const t of spikes) {
      content += formatTicketLine(t);
    }
    content += `\n`;
  }

  content += `---\n\n*Generated from Jira export on ${new Date().toISOString().split('T')[0]}*\n`;

  if (!dryRun) {
    await fs.writeFile(milestoneFile, content, 'utf-8');
    if (verbose) {
      console.error(`🎯 Created milestone index: ${sanitizedId}`);
    }
  } else if (verbose) {
    console.error(`[DRY RUN] Would create milestone index: ${sanitizedId}`);
  }
}

/**
 * Write a stub epic file for a parent key that is not in the CSV export.
 *
 * Creates a minimal epic file so that parent references from child tickets
 * resolve to an actual file in backlog/epics/.
 *
 * @param epicKey - The Jira ticket ID of the missing epic (e.g., "DAPM-1370")
 * @param children - Child tickets that reference this epic
 * @param basePath - Base path to backlog directory
 * @param dryRun - If true, don't write the file
 * @returns Object with filename and file path
 */
async function writeEpicStubFile(
  epicKey: string,
  children: CsvTicket[],
  basePath: string,
  dryRun: boolean
): Promise<{ filename: string; filePath: string }> {
  const epicsDir = path.join(basePath, 'epics');
  const jiraBaseUrl = 'https://wencosupport.atlassian.net/browse';

  // Extract the numeric part for filename (e.g., DAPM-1370 -> 1370)
  const ticketNumber = epicKey.replace(/^[A-Z]+-/, '');
  const filename = `${ticketNumber}-epic-stub.md`;
  const filePath = path.join(epicsDir, filename);

  const title = `Epic ${epicKey}`;

  // Compute metrics (same level as sprint/milestone indexes)
  const totalSp = children.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const stories = children.filter(t => t.documentType === 'story')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const tasks = children.filter(t => t.documentType === 'task')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const bugs = children.filter(t => t.documentType === 'bug')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));
  const spikes = children.filter(t => t.documentType === 'spike')
    .sort((a, b) => parseInt(b.ticketId.replace(/^[A-Z]+-/, '')) - parseInt(a.ticketId.replace(/^[A-Z]+-/, '')));

  const storiesSp = stories.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const tasksSp = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const bugsSp = bugs.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const spikesSp = spikes.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const doneCount = children.filter(t => t.status?.toLowerCase() === 'done').length;
  const inProgressStatuses = ['in progress', 'development', 'in review', 'in testing'];
  const inProgressCount = children.filter(t => inProgressStatuses.includes(t.status?.toLowerCase() || '')).length;
  const todoCount = children.length - doneCount - inProgressCount;

  // Get unique assignees — sorted alphabetically
  const assignees = [...new Set(children.filter(t => t.assignee).map(t => t.assignee!))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  // Get unique sprints — sorted alphabetically
  const sprints = [...new Set(children.filter(t => t.sprint).map(t => t.sprint!))].sort();
  const fixVersion = children.find(t => t.fixVersions)?.fixVersions || null;

  // Build YAML frontmatter
  const yamlLines = [
    `documentType: epic`,
    `title: "${title}"`,
    `jira-ticketId: ${epicKey}`,
    `jira-url: "${jiraBaseUrl}/${epicKey}"`,
    `childCount: ${children.length}`,
    `committed: ${totalSp}`,
    `stories: { count: ${stories.length}, sp: ${storiesSp} }`,
    `tasks: { count: ${tasks.length}, sp: ${tasksSp} }`,
    `bugs: { count: ${bugs.length}, sp: ${bugsSp} }`,
  ];
  if (spikes.length > 0) {
    yamlLines.push(`spikes: { count: ${spikes.length}, sp: ${spikesSp} }`);
  }
  yamlLines.push(`status: { done: ${doneCount}, inProgress: ${inProgressCount}, todo: ${todoCount} }`);
  if (fixVersion) {
    yamlLines.push(`fixVersion: "${fixVersion}"`);
  }
  if (sprints.length > 0) {
    yamlLines.push(`sprints: [${sprints.map(s => `"${s}"`).join(', ')}]`);
  }
  if (assignees.length > 0) {
    yamlLines.push(`assignees: [${assignees.map(a => `"${a}"`).join(', ')}]`);
  }

  const yaml = yamlLines.join('\n');

  // Build body
  const bodyLines: string[] = [];
  bodyLines.push(`# ${title}`);
  bodyLines.push('');
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
  if (fixVersion) {
    bodyLines.push(`- **Fix Version:** ${fixVersion}`);
  }
  if (sprints.length > 0) {
    bodyLines.push(`- **Sprints:** ${sprints.join(', ')}`);
  }
  bodyLines.push('');
  bodyLines.push('## Child Tickets');
  bodyLines.push('');

  // Helper to format a ticket line
  const formatTicketLine = (t: CsvTicket): string => {
    const sp = t.storyPoints ? `${t.storyPoints} SP` : '';
    const status = normalizeStatusDisplay(t.status);
    const assignee = t.assignee || 'unassigned';
    const meta: string[] = [];
    if (sp) meta.push(sp);
    meta.push(status);
    meta.push(assignee);
    return `- [${t.ticketId}](../tickets/${t.filename}) - ${t.summary} — ${meta.join(' | ')}`;
  };

  if (stories.length > 0) {
    bodyLines.push('### Stories');
    bodyLines.push('');
    for (const t of stories) {
      bodyLines.push(formatTicketLine(t));
    }
    bodyLines.push('');
  }

  if (tasks.length > 0) {
    bodyLines.push('### Tasks');
    bodyLines.push('');
    for (const t of tasks) {
      bodyLines.push(formatTicketLine(t));
    }
    bodyLines.push('');
  }

  if (bugs.length > 0) {
    bodyLines.push('### Bugs');
    bodyLines.push('');
    for (const t of bugs) {
      bodyLines.push(formatTicketLine(t));
    }
    bodyLines.push('');
  }

  if (spikes.length > 0) {
    bodyLines.push('### Spikes');
    bodyLines.push('');
    for (const t of spikes) {
      bodyLines.push(formatTicketLine(t));
    }
    bodyLines.push('');
  }

  bodyLines.push('---');
  bodyLines.push('');
  bodyLines.push(`*Auto-generated stub from Jira import on ${new Date().toISOString().split('T')[0]} — epic description not in CSV export*`);
  bodyLines.push('');

  const content = `---\n${yaml}\n---\n\n${bodyLines.join('\n')}`;

  if (!dryRun) {
    await fs.ensureDir(epicsDir);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  return { filename, filePath };
}
