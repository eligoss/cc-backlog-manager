/**
 * Milestone Generator Module
 *
 * Ported from Python: modules/backlog/src/backlog/milestone_generator.py
 *
 * Auto-generates milestone overview files from ticket metadata. Scans all tickets
 * in the backlog, groups them by milestone field, and generates organized
 * milestone overview files.
 *
 * Features:
 * - Milestone directory creation with sanitized names
 * - Milestone index file generation
 * - Epic and story organization
 * - Story grouping by parent epic
 * - Progress tracking and summaries
 *
 * @module milestone-generator
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { parseFrontmatter, stringifyFrontmatter, updateFrontmatter } from '../common/yaml-frontmatter.js';
import { ensureDirectory, fileExists } from '../common/file-utils.js';
import { sanitizeMilestoneName } from './milestone-sanitizer.js';

/**
 * Milestone configuration
 */
export interface MilestoneConfig {
  /** Milestone name (will be sanitized for filesystem) */
  name: string;
  /** Milestone description (optional) */
  description?: string;
  /** Target completion date (optional, YYYY-MM-DD) */
  targetDate?: string;
}

/**
 * Ticket associated with a milestone
 */
export interface MilestoneTicket {
  /** Ticket type: stories, tasks, bugs, spikes */
  type: 'stories' | 'tasks' | 'bugs' | 'spikes';
  /** Ticket title */
  title: string;
  /** Relative path to ticket file */
  path: string;
  /** Story points (0 for tasks/bugs typically) */
  storyPoints: number;
  /** Parent epic ID (for stories) */
  epic?: string;
}

/**
 * Epic associated with a milestone
 */
export interface MilestoneEpic {
  /** Type identifier (always 'epic') */
  type: 'epic';
  /** Epic title */
  title: string;
  /** Relative path to epic file */
  path: string;
}

/**
 * Stories grouped by their parent epic
 */
interface GroupedStories {
  [epicId: string]: MilestoneTicket[];
}

/**
 * Group stories by their parent epic.
 *
 * Separates stories that have an epic field from standalone stories.
 *
 * @param tickets - List of all milestone tickets
 * @returns Object with stories grouped by epic ID and array of standalone stories
 */
function groupStoriesByEpic(tickets: MilestoneTicket[]): {
  byEpic: GroupedStories;
  standalone: MilestoneTicket[];
} {
  const byEpic: GroupedStories = {};
  const standalone: MilestoneTicket[] = [];

  for (const ticket of tickets) {
    if (ticket.type === 'stories') {
      if (ticket.epic) {
        if (!byEpic[ticket.epic]) {
          byEpic[ticket.epic] = [];
        }
        byEpic[ticket.epic].push(ticket);
      } else {
        standalone.push(ticket);
      }
    } else {
      // Non-stories are treated as standalone
      standalone.push(ticket);
    }
  }

  return { byEpic, standalone };
}

/**
 * Generate milestone index file content.
 *
 * Creates a markdown file with YAML frontmatter containing milestone metadata
 * and organized sections for epics, stories (grouped by epic), tasks, and bugs.
 *
 * @param milestoneId - Sanitized milestone ID (filename without .md)
 * @param config - Milestone configuration
 * @param tickets - List of tickets in this milestone
 * @param epics - List of epics in this milestone
 * @returns Markdown content with frontmatter
 */
function generateMilestoneContent(
  milestoneId: string,
  config: MilestoneConfig,
  tickets: MilestoneTicket[],
  epics: MilestoneEpic[]
): string {
  // Calculate totals
  const stories = tickets.filter((t) => t.type === 'stories');
  const tasks = tickets.filter((t) => t.type === 'tasks');
  const bugs = tickets.filter((t) => t.type === 'bugs');
  const storyPoints = stories.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  // Build frontmatter
  const frontmatter = {
    milestoneId,
    fullName: config.name,
    status: 'planning',
  };

  // Build markdown content
  const lines: string[] = [];

  lines.push(`# Milestone: ${milestoneId}`);
  lines.push('');

  if (config.description) {
    lines.push(`**${config.description}**`);
  } else {
    lines.push(`**${config.name}**`);
  }

  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Epics:** ${epics.length}`);
  lines.push(`- **Stories:** ${stories.length}`);
  lines.push(`- **Tasks:** ${tasks.length}`);
  lines.push(`- **Bugs:** ${bugs.length}`);
  lines.push(`- **Total Story Points:** ${storyPoints}`);
  lines.push('');

  // Epics section
  if (epics.length > 0) {
    lines.push('## Epics');
    lines.push('');
    for (let i = 0; i < epics.length; i++) {
      const epic = epics[i];
      lines.push(`${i + 1}. [${epic.title}](${epic.path}) - Epic`);
    }
    lines.push('');
  }

  // Stories section (grouped by epic)
  if (stories.length > 0) {
    lines.push('## Stories');
    lines.push('');

    const { byEpic, standalone } = groupStoriesByEpic(tickets);

    // Stories with epic
    const epicIds = Object.keys(byEpic).sort();
    for (const epicId of epicIds) {
      lines.push(`### Epic: ${epicId}`);
      lines.push('');
      for (const story of byEpic[epicId]) {
        const sp = story.storyPoints ? ` - ${story.storyPoints} SP` : '';
        lines.push(`- [${story.title}](${story.path})${sp}`);
      }
      lines.push('');
    }

    // Standalone stories (no epic)
    const standaloneStories = standalone.filter((t) => t.type === 'stories');
    if (standaloneStories.length > 0) {
      lines.push('### Standalone Stories');
      lines.push('');
      for (const story of standaloneStories) {
        const sp = story.storyPoints ? ` - ${story.storyPoints} SP` : '';
        lines.push(`- [${story.title}](${story.path})${sp}`);
      }
      lines.push('');
    }
  }

  // Tasks section
  if (tasks.length > 0) {
    lines.push('## Tasks');
    lines.push('');
    for (const task of tasks) {
      lines.push(`- [${task.title}](${task.path})`);
    }
    lines.push('');
  }

  // Bugs section
  if (bugs.length > 0) {
    lines.push('## Bugs');
    lines.push('');
    for (const bug of bugs) {
      lines.push(`- [${bug.title}](${bug.path})`);
    }
    lines.push('');
  }

  // Status summary
  lines.push('---');
  lines.push('');
  lines.push(`**Last Generated:** ${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]}`);

  const content = lines.join('\n');
  return stringifyFrontmatter(frontmatter, content);
}

/**
 * Create a new milestone directory and index file.
 *
 * Creates a milestones/{sanitized-name} directory and generates the milestone
 * index file with frontmatter and initial structure.
 *
 * @param config - Milestone configuration
 * @param basePath - Base directory for milestones (typically backlog root)
 * @returns Path to created milestone directory
 * @throws {Error} If milestone directory already exists
 *
 * @example
 * ```typescript
 * const config = {
 *   name: 'APM-R: App: March 2026 (W9, W11, W13)',
 *   description: 'March 2026 delivery'
 * };
 *
 * const milestonePath = await createMilestoneDirectory(config, '/path/to/backlog');
 * // Creates: /path/to/backlog/milestones/apm-r-app-march-2026-w9-w11-w13/
 * ```
 */
export async function createMilestoneDirectory(
  config: MilestoneConfig,
  basePath: string
): Promise<string> {
  const milestonesDir = path.join(basePath, 'milestones');

  // Sanitize milestone name for directory
  const sanitizedFilename = sanitizeMilestoneName(config.name);
  const milestoneId = sanitizedFilename.replace('.md', '');
  const milestonePath = path.join(milestonesDir, milestoneId);
  const indexPath = path.join(milestonePath, sanitizedFilename);

  // Check if already exists
  if (await fileExists(indexPath)) {
    throw new Error(`Milestone ${config.name} already exists at ${indexPath}`);
  }

  // Create directory
  await ensureDirectory(milestonePath);

  // Generate initial index with no tickets
  const content = generateMilestoneContent(milestoneId, config, [], []);

  // Write index file
  await fs.writeFile(indexPath, content, 'utf-8');

  return milestonePath;
}

/**
 * Generate or regenerate milestone index file.
 *
 * Creates the milestone index markdown file with frontmatter containing
 * all milestone metadata and organized sections for epics and tickets.
 *
 * @param milestonePath - Path to milestone directory
 * @param milestoneId - Milestone ID (sanitized filename without .md)
 * @param config - Milestone configuration
 * @param tickets - List of tickets in this milestone
 * @param epics - List of epics in this milestone
 *
 * @example
 * ```typescript
 * const tickets = [
 *   {
 *     type: 'stories',
 *     title: 'User Login',
 *     path: '../tickets/stories/STORY-123.md',
 *     storyPoints: 5,
 *     epic: 'EPIC-AUTH'
 *   }
 * ];
 *
 * const epics = [
 *   {
 *     type: 'epic',
 *     title: 'Authentication System',
 *     path: '../epics/EPIC-AUTH.md'
 *   }
 * ];
 *
 * await generateMilestoneIndex(milestonePath, 'mar2026', config, tickets, epics);
 * ```
 */
export async function generateMilestoneIndex(
  milestonePath: string,
  milestoneId: string,
  config: MilestoneConfig,
  tickets: MilestoneTicket[],
  epics: MilestoneEpic[]
): Promise<void> {
  const indexPath = path.join(milestonePath, `${milestoneId}.md`);
  const content = generateMilestoneContent(milestoneId, config, tickets, epics);
  await fs.writeFile(indexPath, content, 'utf-8');
}

/**
 * Link an epic to a milestone by updating its frontmatter.
 *
 * Adds or updates the 'milestone' field in the epic's frontmatter.
 *
 * @param epicPath - Path to epic file
 * @param milestoneName - Milestone name to link to
 *
 * @example
 * ```typescript
 * await linkEpicToMilestone('/path/to/epics/EPIC-123.md', 'Mar2026');
 * // Updates epic frontmatter to include: milestone: Mar2026
 * ```
 */
export async function linkEpicToMilestone(
  epicPath: string,
  milestoneName: string
): Promise<void> {
  await updateFrontmatter(epicPath, { milestone: milestoneName });
}

/**
 * Scan backlog tickets directory and group by milestone.
 *
 * Scans all ticket types (stories, tasks, bugs, spikes) and groups them
 * by their milestone field. Tickets without a milestone field are skipped.
 *
 * @param backlogDir - Path to backlog root directory
 * @returns Object mapping milestone names to arrays of tickets
 *
 * @example
 * ```typescript
 * const ticketsByMilestone = await scanTicketsForMilestone('/path/to/backlog');
 * // Returns: {
 * //   'Mar2026': [ticket1, ticket2, ...],
 * //   'Apr2026': [ticket3, ticket4, ...]
 * // }
 * ```
 */
export async function scanTicketsForMilestone(
  backlogDir: string
): Promise<{ [milestone: string]: MilestoneTicket[] }> {
  const ticketsByMilestone: { [milestone: string]: MilestoneTicket[] } = {};

  // Scan ticket types
  const ticketTypes: Array<'stories' | 'tasks' | 'bugs' | 'spikes'> = [
    'stories',
    'tasks',
    'bugs',
    'spikes',
  ];

  for (const ticketType of ticketTypes) {
    const pattern = path.join(backlogDir, 'tickets', ticketType, '*.md');
    const files = await glob(pattern, { absolute: true });

    for (const filePath of files) {
      // Skip README files
      if (filePath.endsWith('README.md')) {
        continue;
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const { data } = parseFrontmatter(content);

        // Skip tickets without milestone field
        if (!data.milestone) {
          continue;
        }

        const milestone = data.milestone as string;
        const filename = path.basename(filePath);
        const relativePath = `../tickets/${ticketType}/${filename}`;

        const ticket: MilestoneTicket = {
          type: ticketType,
          title: (data.title as string) || filename,
          path: relativePath,
          storyPoints: (data.storyPoints as number) || 0,
          epic: data.epic as string | undefined,
        };

        if (!ticketsByMilestone[milestone]) {
          ticketsByMilestone[milestone] = [];
        }

        ticketsByMilestone[milestone].push(ticket);
      } catch (error) {
        // Skip files that can't be read or parsed
        console.warn(`Warning: Could not process ${filePath}:`, error);
      }
    }
  }

  return ticketsByMilestone;
}

/**
 * Scan backlog epics directory and group by milestone.
 *
 * Scans all epics and groups them by their milestone field.
 * Epics without a milestone field are skipped.
 *
 * @param backlogDir - Path to backlog root directory
 * @returns Object mapping milestone names to arrays of epics
 *
 * @example
 * ```typescript
 * const epicsByMilestone = await scanEpicsForMilestone('/path/to/backlog');
 * // Returns: {
 * //   'Mar2026': [epic1, epic2, ...],
 * //   'Apr2026': [epic3, epic4, ...]
 * // }
 * ```
 */
export async function scanEpicsForMilestone(
  backlogDir: string
): Promise<{ [milestone: string]: MilestoneEpic[] }> {
  const epicsByMilestone: { [milestone: string]: MilestoneEpic[] } = {};

  const pattern = path.join(backlogDir, 'epics', '*.md');
  const files = await glob(pattern, { absolute: true });

  for (const filePath of files) {
    // Skip README files
    if (filePath.endsWith('README.md')) {
      continue;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = parseFrontmatter(content);

      // Skip epics without milestone field
      if (!data.milestone) {
        continue;
      }

      const milestone = data.milestone as string;
      const filename = path.basename(filePath);
      const relativePath = `../epics/${filename}`;

      const epic: MilestoneEpic = {
        type: 'epic',
        title: (data.title as string) || filename,
        path: relativePath,
      };

      if (!epicsByMilestone[milestone]) {
        epicsByMilestone[milestone] = [];
      }

      epicsByMilestone[milestone].push(epic);
    } catch (error) {
      // Skip files that can't be read or parsed
      console.warn(`Warning: Could not process ${filePath}:`, error);
    }
  }

  return epicsByMilestone;
}
