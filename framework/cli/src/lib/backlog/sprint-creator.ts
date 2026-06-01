/**
 * Sprint Creator Module
 *
 * Ported from Python: modules/backlog/src/backlog/sprint_creator.py
 *
 * Creates sprint planning files from ticket lists. Used by backlog management
 * workflows when creating new sprints.
 *
 * Features:
 * - Sprint directory creation
 * - Sprint index file generation with frontmatter
 * - Automatic date calculation from sprint ID (YYYY-WNN format)
 * - Story point tracking and capacity utilization
 * - Ticket grouping by type (stories, tasks, bugs, spikes)
 *
 * @module sprint-creator
 */

import fs from 'fs-extra';
import path from 'path';
import { parseFrontmatter, stringifyFrontmatter } from '../common/yaml-frontmatter.js';
import { ensureDirectory, fileExists } from '../common/file-utils.js';

/**
 * Sprint configuration
 */
export interface SprintConfig {
  /** Sprint ID in YYYY-WNN format (e.g., 2026-W03) */
  sprintId: string;
  /** Milestone code (e.g., Mar2026) */
  milestone: string;
  /** Sprint start date (YYYY-MM-DD), auto-calculated if not provided */
  startDate?: string;
  /** Sprint end date (YYYY-MM-DD), auto-calculated if not provided */
  endDate?: string;
  /** Team capacity in story points (default: 40) */
  capacity?: number;
  /** Sprint goal description */
  goal?: string;
}

/**
 * Ticket to include in sprint
 */
export interface SprintTicket {
  /** Ticket type: stories, tasks, bugs, spikes */
  type: 'stories' | 'tasks' | 'bugs' | 'spikes';
  /** Ticket title */
  title: string;
  /** Relative path to ticket file */
  path: string;
  /** Story points (0 for tasks/bugs typically) */
  storyPoints: number;
}

/**
 * Result of sprint date calculation
 */
interface SprintDates {
  startDate: string;
  endDate: string;
}

/**
 * Calculate sprint start and end dates from sprint ID in YYYY-WNN format.
 *
 * Sprint ID follows ISO week numbering. A 2-week sprint starts on the Monday
 * of the specified week and ends 13 days later (Sunday of the following week).
 *
 * @param sprintId - Sprint ID in YYYY-WNN format (e.g., "2026-W03")
 * @returns Object with startDate and endDate in YYYY-MM-DD format, or null if invalid
 *
 * @example
 * ```typescript
 * const dates = calculateSprintDates('2026-W03');
 * // Returns: { startDate: '2026-01-12', endDate: '2026-01-25' }
 * ```
 */
export function calculateSprintDates(sprintId: string): SprintDates | null {
  try {
    if (!sprintId || !sprintId.includes('-W')) {
      return null;
    }

    const [yearStr, weekStr] = sprintId.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);

    if (isNaN(year) || isNaN(week)) {
      return null;
    }

    // Calculate date from ISO week (matches Python implementation)
    // Python's weekday(): Monday=0, Sunday=6
    // JavaScript's getDay(): Sunday=0, Monday=1
    const jan1 = new Date(year, 0, 1);
    const jan1DayJS = jan1.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const jan1DayPy = jan1DayJS === 0 ? 6 : jan1DayJS - 1; // Convert to Python's 0=Monday

    // Find Monday of week 1 (same as Python: jan_1 - timedelta(days=jan_1.weekday()))
    const week1Monday = new Date(jan1);
    week1Monday.setDate(jan1.getDate() - jan1DayPy);

    // Calculate sprint start (Monday of specified week)
    const sprintStart = new Date(week1Monday);
    sprintStart.setDate(week1Monday.getDate() + (week - 1) * 7);

    // Calculate sprint end (13 days later for 2-week sprint)
    const sprintEnd = new Date(sprintStart);
    sprintEnd.setDate(sprintStart.getDate() + 13);

    const formatDate = (date: Date): string => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    return {
      startDate: formatDate(sprintStart),
      endDate: formatDate(sprintEnd),
    };
  } catch {
    return null;
  }
}

/**
 * Generate sprint index file content.
 *
 * Creates a markdown file with YAML frontmatter containing sprint metadata
 * and a formatted list of committed tickets grouped by type.
 *
 * @param sprintId - Sprint ID
 * @param config - Sprint configuration
 * @param tickets - List of tickets to include
 * @returns Markdown content with frontmatter
 */
function generateSprintContent(
  sprintId: string,
  config: SprintConfig,
  tickets: SprintTicket[]
): string {
  // Calculate total story points
  const totalSp = tickets.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  // Get dates (auto-calculate or use provided)
  let startDate = config.startDate;
  let endDate = config.endDate;

  if (!startDate || !endDate) {
    const dates = calculateSprintDates(sprintId);
    if (dates) {
      startDate = startDate || dates.startDate;
      endDate = endDate || dates.endDate;
    } else {
      // Fallback to current date + 2 weeks
      const now = new Date();
      const twoWeeksLater = new Date(now);
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

      startDate = now.toISOString().split('T')[0];
      endDate = twoWeeksLater.toISOString().split('T')[0];
    }
  }

  const capacity = config.capacity || 40;

  // Build frontmatter
  const frontmatter = {
    sprintId,
    sprintName: `Sprint ${sprintId}`,
    startDate,
    endDate,
    milestone: config.milestone,
    capacity,
    committed: totalSp,
  };

  // Group tickets by type
  const stories = tickets.filter((t) => t.type === 'stories');
  const tasks = tickets.filter((t) => t.type === 'tasks');
  const bugs = tickets.filter((t) => t.type === 'bugs');
  const spikes = tickets.filter((t) => t.type === 'spikes');

  // Build markdown content
  const lines: string[] = [];

  lines.push(`# Sprint ${sprintId}`);
  lines.push('');
  lines.push('## Sprint Info');
  lines.push('');
  lines.push(`- **Duration:** ${startDate} to ${endDate}`);
  lines.push(`- **Milestone:** ${config.milestone}`);
  lines.push(`- **Team Capacity:** ${capacity} SP`);

  if (capacity > 0) {
    const percentage = Math.round((totalSp / capacity) * 100);
    lines.push(`- **Committed:** ${totalSp} SP (${percentage}% capacity)`);
  } else {
    lines.push(`- **Committed:** ${totalSp} SP`);
  }

  lines.push('');

  // Add committed tickets section
  if (tickets.length > 0) {
    lines.push('## Committed Tickets');
    lines.push('');

    let ticketNum = 1;

    // Stories
    for (const story of stories) {
      const sp = story.storyPoints ? ` - ${story.storyPoints} SP` : '';
      lines.push(`${ticketNum}. [${story.title}](${story.path})${sp}`);
      ticketNum++;
    }

    // Tasks
    for (const task of tasks) {
      lines.push(`${ticketNum}. [${task.title}](${task.path})`);
      ticketNum++;
    }

    // Bugs
    for (const bug of bugs) {
      lines.push(`${ticketNum}. [${bug.title}](${bug.path})`);
      ticketNum++;
    }

    // Spikes
    for (const spike of spikes) {
      lines.push(`${ticketNum}. [${spike.title}](${spike.path})`);
      ticketNum++;
    }

    lines.push('');
    lines.push(`**Total Committed:** ${totalSp} SP across ${tickets.length} tickets`);
    lines.push('');
  }

  // Retrospective placeholder
  lines.push('## Sprint Retrospective');
  lines.push('');
  lines.push('*(Add after sprint completion)*');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`**Created:** ${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]}`);

  const content = lines.join('\n');
  return stringifyFrontmatter(frontmatter, content);
}

/**
 * Create a new sprint directory and index file.
 *
 * Creates a sprints/{sprintId} directory and generates the sprint index file
 * with frontmatter and initial structure.
 *
 * @param config - Sprint configuration
 * @param basePath - Base directory for sprints (typically backlog root)
 * @returns Path to created sprint directory
 * @throws {Error} If sprint directory already exists
 *
 * @example
 * ```typescript
 * const config = {
 *   sprintId: '2026-W03',
 *   milestone: 'Mar2026',
 *   capacity: 40
 * };
 *
 * const sprintPath = await createSprintDirectory(config, '/path/to/backlog');
 * // Creates: /path/to/backlog/sprints/2026-W03/2026-W03.md
 * ```
 */
export async function createSprintDirectory(
  config: SprintConfig,
  basePath: string
): Promise<string> {
  const sprintsDir = path.join(basePath, 'sprints');
  const sprintPath = path.join(sprintsDir, config.sprintId);
  const indexPath = path.join(sprintPath, `${config.sprintId}.md`);

  // Check if already exists
  if (await fileExists(indexPath)) {
    throw new Error(`Sprint ${config.sprintId} already exists at ${indexPath}`);
  }

  // Create directory
  await ensureDirectory(sprintPath);

  // Generate initial index with no tickets
  const content = generateSprintContent(config.sprintId, config, []);

  // Write index file
  await fs.writeFile(indexPath, content, 'utf-8');

  return sprintPath;
}

/**
 * Generate or regenerate sprint index file.
 *
 * Creates the sprint index markdown file with frontmatter containing
 * all sprint metadata and a formatted list of tickets.
 *
 * @param sprintPath - Path to sprint directory
 * @param sprintId - Sprint ID
 * @param config - Sprint configuration
 * @param tickets - List of tickets to include
 *
 * @example
 * ```typescript
 * const tickets = [
 *   {
 *     type: 'stories',
 *     title: 'User Authentication',
 *     path: '../tickets/stories/STORY-123.md',
 *     storyPoints: 5
 *   }
 * ];
 *
 * await generateSprintIndex(sprintPath, '2026-W03', config, tickets);
 * ```
 */
export async function generateSprintIndex(
  sprintPath: string,
  sprintId: string,
  config: SprintConfig,
  tickets: SprintTicket[]
): Promise<void> {
  const indexPath = path.join(sprintPath, `${sprintId}.md`);
  const content = generateSprintContent(sprintId, config, tickets);
  await fs.writeFile(indexPath, content, 'utf-8');
}

/**
 * Update existing sprint index with new ticket list.
 *
 * Reads the existing sprint index, preserves the configuration (dates, capacity, etc.),
 * and regenerates the file with the updated ticket list.
 *
 * @param sprintPath - Path to sprint directory
 * @param sprintId - Sprint ID
 * @param tickets - Updated list of tickets
 * @throws {Error} If sprint index file does not exist
 *
 * @example
 * ```typescript
 * // Add a new ticket to existing sprint
 * const updatedTickets = [
 *   ...existingTickets,
 *   { type: 'stories', title: 'New Story', path: '../tickets/STORY-999.md', storyPoints: 8 }
 * ];
 *
 * await updateSprintIndex(sprintPath, '2026-W03', updatedTickets);
 * ```
 */
export async function updateSprintIndex(
  sprintPath: string,
  sprintId: string,
  tickets: SprintTicket[]
): Promise<void> {
  const indexPath = path.join(sprintPath, `${sprintId}.md`);

  if (!(await fileExists(indexPath))) {
    throw new Error(`Sprint index not found: ${indexPath}`);
  }

  // Read existing file to preserve configuration
  const existingContent = await fs.readFile(indexPath, 'utf-8');
  const { data } = parseFrontmatter(existingContent);

  // Build config from existing frontmatter
  const config: SprintConfig = {
    sprintId: data.sprintId as string,
    milestone: data.milestone as string,
    capacity: data.capacity as number,
    startDate: data.startDate as string,
    endDate: data.endDate as string,
  };

  // Regenerate with new tickets
  const content = generateSprintContent(sprintId, config, tickets);
  await fs.writeFile(indexPath, content, 'utf-8');
}
