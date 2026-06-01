/**
 * Smart lookup for sprints and milestones by name or Jira ID.
 *
 * Enables rename detection and prevents duplicates by searching existing
 * sprint/milestone files by name and Jira ID.
 *
 * @module jira-lookup
 */

import fs from 'fs-extra';
import path from 'path';
import { parseFrontmatter } from '../common/yaml-frontmatter.js';

/**
 * Metadata extracted from sprint file YAML
 */
export interface SprintMetadata {
  /** Path to the sprint file */
  filePath: string;
  /** Local ID (e.g., "2025-W45") */
  sprintId: string;
  /** Sprint name from CSV Sprint column (e.g., "APM-APP-2025W45") */
  sprintName?: string;
  /** Numeric Jira ID (e.g., "16786") */
  jiraSprintId?: string;
  /** Associated milestone ID */
  milestone?: string;
  /** Committed story points */
  committed: number;
  /** Number of tickets in sprint */
  ticketCount: number;
}

/**
 * Metadata extracted from milestone file YAML
 */
export interface MilestoneMetadata {
  /** Path to the milestone file */
  filePath: string;
  /** Local ID (e.g., "Jan2026") */
  milestoneId: string;
  /** Full name from CSV (e.g., "January 2026") */
  milestoneName?: string;
  /** Jira milestone ID */
  jiraMilestoneId?: string;
  /** Committed story points */
  committed: number;
  /** Number of tickets in milestone */
  ticketCount: number;
}

/**
 * Sprint frontmatter data structure
 */
interface SprintFrontmatter {
  sprintName?: string;
  jiraSprintId?: string;
  milestone?: string;
  committed?: number;
  ticketCount?: number;
}

/**
 * Milestone frontmatter data structure
 */
interface MilestoneFrontmatter {
  milestoneName?: string;
  jiraMilestoneId?: string;
  committed?: number;
  ticketCount?: number;
}

/**
 * Parse YAML frontmatter from sprint file.
 *
 * Handles both old format (without jiraSprintId) and new format.
 *
 * @param sprintFile - Path to sprint markdown file
 * @returns SprintMetadata if valid, null if parsing fails
 */
export async function parseSprintFileYaml(sprintFile: string): Promise<SprintMetadata | null> {
  try {
    const content = await fs.readFile(sprintFile, 'utf-8');

    // Extract YAML frontmatter
    if (!content.startsWith('---')) {
      return null;
    }

    const endIdx = content.indexOf('\n---\n', 3);
    if (endIdx === -1) {
      return null;
    }

    const result = parseFrontmatter<SprintFrontmatter>(content);
    const metadata = result.data;

    // Extract sprint ID from filename (e.g., "2025-W45.md" -> "2025-W45")
    const sprintId = path.basename(sprintFile, '.md');

    return {
      filePath: sprintFile,
      sprintId,
      sprintName: metadata.sprintName || undefined,
      jiraSprintId: metadata.jiraSprintId || undefined,
      milestone: metadata.milestone || undefined,
      committed: metadata.committed || 0,
      ticketCount: metadata.ticketCount || 0,
    };
  } catch (error) {
    console.error(`❌ Error parsing sprint file ${sprintFile}: ${error}`);
    return null;
  }
}

/**
 * Parse YAML frontmatter from milestone file.
 *
 * Handles both old format (without jiraMilestoneId) and new format.
 *
 * @param milestoneFile - Path to milestone markdown file
 * @returns MilestoneMetadata if valid, null if parsing fails
 */
export async function parseMilestoneFileYaml(milestoneFile: string): Promise<MilestoneMetadata | null> {
  try {
    const content = await fs.readFile(milestoneFile, 'utf-8');

    // Extract YAML frontmatter
    if (!content.startsWith('---')) {
      return null;
    }

    const endIdx = content.indexOf('\n---\n', 3);
    if (endIdx === -1) {
      return null;
    }

    const result = parseFrontmatter<MilestoneFrontmatter>(content);
    const metadata = result.data;

    // Extract milestone ID from filename (e.g., "Jan2026.md" -> "Jan2026")
    const milestoneId = path.basename(milestoneFile, '.md');

    return {
      filePath: milestoneFile,
      milestoneId,
      milestoneName: metadata.milestoneName || undefined,
      jiraMilestoneId: metadata.jiraMilestoneId || undefined,
      committed: metadata.committed || 0,
      ticketCount: metadata.ticketCount || 0,
    };
  } catch (error) {
    console.error(`❌ Error parsing milestone file ${milestoneFile}: ${error}`);
    return null;
  }
}

/**
 * Find sprint file by sprint name (from CSV).
 *
 * Searches sprints/ directory for matching sprintName in YAML.
 * Handles both exact matches and normalized comparisons.
 *
 * @param sprintName - Sprint name from CSV Sprint column (e.g., "APM-APP-2026-W1")
 * @param backlogDir - Path to backlog directory
 * @returns SprintMetadata if found, null otherwise
 */
export async function findSprintByName(
  sprintName: string,
  backlogDir: string
): Promise<SprintMetadata | null> {
  const sprintsDir = path.join(backlogDir, 'sprints');

  if (!(await fs.pathExists(sprintsDir))) {
    return null;
  }

  const files = await fs.readdir(sprintsDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  for (const file of mdFiles) {
    const sprintFile = path.join(sprintsDir, file);
    const sprint = await parseSprintFileYaml(sprintFile);
    if (sprint && sprint.sprintName === sprintName) {
      return sprint;
    }
  }

  return null;
}

/**
 * Find sprint file by Jira sprint ID.
 *
 * Searches sprints/ directory for matching jiraSprintId in YAML.
 * Enables detection of renamed sprints.
 *
 * @param jiraSprintId - Numeric Jira sprint ID (e.g., "16786")
 * @param backlogDir - Path to backlog directory
 * @returns SprintMetadata if found, null otherwise
 */
export async function findSprintByJiraId(
  jiraSprintId: string,
  backlogDir: string
): Promise<SprintMetadata | null> {
  const sprintsDir = path.join(backlogDir, 'sprints');

  if (!(await fs.pathExists(sprintsDir))) {
    return null;
  }

  const files = await fs.readdir(sprintsDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  for (const file of mdFiles) {
    const sprintFile = path.join(sprintsDir, file);
    const sprint = await parseSprintFileYaml(sprintFile);
    if (sprint && sprint.jiraSprintId === jiraSprintId) {
      return sprint;
    }
  }

  return null;
}

/**
 * Find milestone file by milestone name (from CSV Fix Versions).
 *
 * Searches milestones/ directory for matching milestoneName in YAML.
 * Handles both exact matches and normalized comparisons.
 *
 * @param milestoneName - Milestone name from CSV Fix Versions (e.g., "January 2026 (W51, W1, W3)")
 * @param backlogDir - Path to backlog directory
 * @returns MilestoneMetadata if found, null otherwise
 */
export async function findMilestoneByName(
  milestoneName: string,
  backlogDir: string
): Promise<MilestoneMetadata | null> {
  const milestonesDir = path.join(backlogDir, 'milestones');

  if (!(await fs.pathExists(milestonesDir))) {
    return null;
  }

  const files = await fs.readdir(milestonesDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  for (const file of mdFiles) {
    const milestoneFile = path.join(milestonesDir, file);
    const milestone = await parseMilestoneFileYaml(milestoneFile);
    if (milestone && milestone.milestoneName === milestoneName) {
      return milestone;
    }
  }

  return null;
}

/**
 * Find milestone file by milestone ID.
 *
 * Searches milestones/ directory for matching milestone_id (filename stem).
 * Enables detection of renamed milestones.
 *
 * @param milestoneId - Local milestone ID (e.g., "Jan2026")
 * @param backlogDir - Path to backlog directory
 * @returns MilestoneMetadata if found, null otherwise
 */
export async function findMilestoneById(
  milestoneId: string,
  backlogDir: string
): Promise<MilestoneMetadata | null> {
  const milestonesDir = path.join(backlogDir, 'milestones');

  if (!(await fs.pathExists(milestonesDir))) {
    return null;
  }

  const milestoneFile = path.join(milestonesDir, `${milestoneId}.md`);
  if (await fs.pathExists(milestoneFile)) {
    return await parseMilestoneFileYaml(milestoneFile);
  }

  return null;
}

/**
 * List all sprint files with metadata.
 *
 * @param backlogDir - Path to backlog directory
 * @returns List of SprintMetadata objects sorted by sprint ID
 */
export async function listAllSprints(backlogDir: string): Promise<SprintMetadata[]> {
  const sprints: SprintMetadata[] = [];
  const sprintsDir = path.join(backlogDir, 'sprints');

  if (!(await fs.pathExists(sprintsDir))) {
    return sprints;
  }

  const files = await fs.readdir(sprintsDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  for (const file of mdFiles) {
    const sprintFile = path.join(sprintsDir, file);
    const sprint = await parseSprintFileYaml(sprintFile);
    if (sprint) {
      sprints.push(sprint);
    }
  }

  return sprints.sort((a, b) => a.sprintId.localeCompare(b.sprintId));
}

/**
 * List all milestone files with metadata.
 *
 * @param backlogDir - Path to backlog directory
 * @returns List of MilestoneMetadata objects sorted by milestone ID
 */
export async function listAllMilestones(backlogDir: string): Promise<MilestoneMetadata[]> {
  const milestones: MilestoneMetadata[] = [];
  const milestonesDir = path.join(backlogDir, 'milestones');

  if (!(await fs.pathExists(milestonesDir))) {
    return milestones;
  }

  const files = await fs.readdir(milestonesDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  for (const file of mdFiles) {
    const milestoneFile = path.join(milestonesDir, file);
    const milestone = await parseMilestoneFileYaml(milestoneFile);
    if (milestone) {
      milestones.push(milestone);
    }
  }

  return milestones.sort((a, b) => a.milestoneId.localeCompare(b.milestoneId));
}
