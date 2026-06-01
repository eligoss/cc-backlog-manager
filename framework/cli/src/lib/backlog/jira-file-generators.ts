/**
 * Jira File Generators Module
 *
 * Generate sprint and milestone files with enhanced YAML metadata.
 *
 * Creates markdown files with YAML frontmatter containing Jira IDs,
 * local IDs, and metadata for newly created sprints and milestones.
 *
 * @module jira-file-generators
 */

import fs from 'fs-extra';
import path from 'path';
import * as YAML from 'yaml';

/**
 * Options for generating a sprint file
 */
export interface GenerateSprintFileOptions {
  /** Local sprint ID (e.g., "2026-W1") */
  sprintId: string;
  /** Sprint name from CSV (e.g., "APM-APP-2026-W1") */
  sprintName?: string;
  /** Numeric Jira sprint ID (e.g., "16786") */
  jiraSprintId?: string;
  /** Associated milestone (e.g., "Jan2026") */
  milestone?: string;
  /** Number of committed tickets */
  committed?: number;
  /** Total ticket count */
  ticketCount?: number;
  /** Path to backlog directory */
  backlogDir: string;
}

/**
 * Options for generating a milestone file
 */
export interface GenerateMilestoneFileOptions {
  /** Local milestone ID (e.g., "Jan2026") */
  milestoneId: string;
  /** Milestone name from CSV (e.g., "January 2026 (W51, W1, W3)") */
  milestoneName?: string;
  /** Jira milestone ID (e.g., "Jan2026") */
  jiraMilestoneId?: string;
  /** Number of committed tickets */
  committed?: number;
  /** Total ticket count */
  ticketCount?: number;
  /** Path to backlog directory */
  backlogDir: string;
}

/**
 * Options for updating sprint file metadata
 */
export interface UpdateSprintMetadataOptions {
  /** New sprint name */
  sprintName?: string;
  /** New Jira sprint ID */
  jiraSprintId?: string;
  /** New milestone assignment */
  milestone?: string;
  /** New committed count */
  committed?: number;
  /** New ticket count */
  ticketCount?: number;
}

/**
 * Options for updating milestone file metadata
 */
export interface UpdateMilestoneMetadataOptions {
  /** New milestone name */
  milestoneName?: string;
  /** New Jira milestone ID */
  jiraMilestoneId?: string;
  /** New committed count */
  committed?: number;
  /** New ticket count */
  ticketCount?: number;
}

/**
 * Create or update sprint metadata file.
 *
 * Creates backlog/sprints/{sprint_id}.md with enhanced YAML frontmatter.
 *
 * @param options - Sprint generation options
 * @returns Path to created/updated sprint file
 * @throws {Error} If sprint_id is empty
 *
 * @example
 * ```typescript
 * const sprintFile = await generateSprintFile({
 *   sprintId: "2026-W1",
 *   sprintName: "APM-APP-2026-W1",
 *   jiraSprintId: "16786",
 *   milestone: "Jan2026",
 *   backlogDir: "backlog"
 * });
 * ```
 */
export async function generateSprintFile(
  options: GenerateSprintFileOptions
): Promise<string> {
  const {
    sprintId,
    sprintName,
    jiraSprintId,
    milestone,
    committed = 0,
    ticketCount = 0,
    backlogDir,
  } = options;

  if (!sprintId) {
    throw new Error('sprint_id is required');
  }

  const sprintsDir = path.join(backlogDir, 'sprints');
  await fs.ensureDir(sprintsDir);

  const sprintFile = path.join(sprintsDir, `${sprintId}.md`);

  // Build YAML frontmatter with specific field order
  // Only include fields that have values (not undefined)
  const yamlDict: Record<string, unknown> = {};

  if (jiraSprintId !== undefined) {
    yamlDict.jiraSprintId = jiraSprintId;
  }
  if (sprintName !== undefined) {
    yamlDict.sprintName = sprintName;
  }
  yamlDict.sprintId = sprintId;

  if (milestone !== undefined) {
    yamlDict.milestone = milestone;
  }

  yamlDict.committed = committed;
  yamlDict.ticketCount = ticketCount;

  // Generate YAML with custom dumper to preserve field order
  const yamlContent = YAML.stringify(yamlDict);

  // Generate content
  const content = `---
${yamlContent}---

## Sprint: ${sprintName || sprintId}

**Sprint ID:** ${sprintId}
**Jira Sprint ID:** ${jiraSprintId || 'TBD'}
**Milestone:** ${milestone || 'Unassigned'}

**Metrics:**
- Committed: ${committed}
- Tickets: ${ticketCount}

---

### Tickets

*Tickets for this sprint will be added during import.*
`;

  await fs.writeFile(sprintFile, content, 'utf-8');

  if (!(await fs.pathExists(sprintFile))) {
    throw new Error(`Failed to create sprint file: ${sprintFile}`);
  }

  console.error(`✅ Sprint file created: ${sprintFile}`);

  return sprintFile;
}

/**
 * Create or update milestone metadata file.
 *
 * Creates backlog/milestones/{milestone_id}.md with enhanced YAML frontmatter.
 *
 * @param options - Milestone generation options
 * @returns Path to created/updated milestone file
 * @throws {Error} If milestone_id is empty
 *
 * @example
 * ```typescript
 * const milestoneFile = await generateMilestoneFile({
 *   milestoneId: "Jan2026",
 *   milestoneName: "January 2026 (W51, W1, W3)",
 *   jiraMilestoneId: "Jan2026",
 *   backlogDir: "backlog"
 * });
 * ```
 */
export async function generateMilestoneFile(
  options: GenerateMilestoneFileOptions
): Promise<string> {
  const {
    milestoneId,
    milestoneName,
    jiraMilestoneId,
    committed = 0,
    ticketCount = 0,
    backlogDir,
  } = options;

  if (!milestoneId) {
    throw new Error('milestone_id is required');
  }

  const milestonesDir = path.join(backlogDir, 'milestones');
  await fs.ensureDir(milestonesDir);

  const milestoneFile = path.join(milestonesDir, `${milestoneId}.md`);

  // Build YAML frontmatter with specific field order
  // Only include fields that have values (not undefined)
  const yamlDict: Record<string, unknown> = {};

  if (jiraMilestoneId !== undefined) {
    yamlDict.jiraMilestoneId = jiraMilestoneId;
  }
  if (milestoneName !== undefined) {
    yamlDict.milestoneName = milestoneName;
  }
  yamlDict.milestone = milestoneId;
  yamlDict.title = `Milestone ${milestoneId}`;

  yamlDict.committed = committed;
  yamlDict.ticketCount = ticketCount;

  // Generate YAML with custom dumper to preserve field order
  const yamlContent = YAML.stringify(yamlDict);

  // Generate content
  const content = `---
${yamlContent}---

## Milestone: ${milestoneName || milestoneId}

**Milestone ID:** ${milestoneId}
**Jira Milestone ID:** ${jiraMilestoneId || milestoneId}

**Metrics:**
- Committed: ${committed}
- Tickets: ${ticketCount}

---

### Tickets

*Tickets for this milestone will be added during import.*
`;

  await fs.writeFile(milestoneFile, content, 'utf-8');

  if (!(await fs.pathExists(milestoneFile))) {
    throw new Error(`Failed to create milestone file: ${milestoneFile}`);
  }

  console.error(`✅ Milestone file created: ${milestoneFile}`);

  return milestoneFile;
}

/**
 * Update existing sprint file YAML metadata.
 *
 * Preserves existing content while updating specified YAML fields.
 *
 * @param sprintFile - Path to sprint markdown file
 * @param updates - Fields to update
 * @throws {Error} If sprint file doesn't exist
 * @throws {Error} If sprint file has invalid format
 *
 * @example
 * ```typescript
 * await updateSprintFileMetadata('backlog/sprints/2026-W1.md', {
 *   committed: 5,
 *   ticketCount: 10
 * });
 * ```
 */
export async function updateSprintFileMetadata(
  sprintFile: string,
  updates: UpdateSprintMetadataOptions
): Promise<void> {
  if (!(await fs.pathExists(sprintFile))) {
    throw new Error(`Sprint file not found: ${sprintFile}`);
  }

  const content = await fs.readFile(sprintFile, 'utf-8');

  // Extract YAML frontmatter
  if (!content.startsWith('---')) {
    throw new Error(`Invalid sprint file format: ${sprintFile}`);
  }

  const endIdx = content.indexOf('\n---\n', 3);
  if (endIdx === -1) {
    throw new Error(`Malformed YAML frontmatter: ${sprintFile}`);
  }

  const yamlContent = content.substring(3, endIdx);
  const body = content.substring(endIdx + 4);

  // Parse and update YAML
  const yamlDict = (YAML.parse(yamlContent) as Record<string, unknown>) || {};

  if (updates.sprintName !== undefined) {
    yamlDict.sprintName = updates.sprintName;
  }
  if (updates.jiraSprintId !== undefined) {
    yamlDict.jiraSprintId = updates.jiraSprintId;
  }
  if (updates.milestone !== undefined) {
    yamlDict.milestone = updates.milestone;
  }
  if (updates.committed !== undefined) {
    yamlDict.committed = updates.committed;
  }
  if (updates.ticketCount !== undefined) {
    yamlDict.ticketCount = updates.ticketCount;
  }

  // Rebuild content
  const newYamlContent = YAML.stringify(yamlDict);

  const newContent = `---
${newYamlContent}---${body}`;

  await fs.writeFile(sprintFile, newContent, 'utf-8');
  console.error(`✅ Sprint file updated: ${sprintFile}`);
}

/**
 * Update existing milestone file YAML metadata.
 *
 * Preserves existing content while updating specified YAML fields.
 *
 * @param milestoneFile - Path to milestone markdown file
 * @param updates - Fields to update
 * @throws {Error} If milestone file doesn't exist
 * @throws {Error} If milestone file has invalid format
 *
 * @example
 * ```typescript
 * await updateMilestoneFileMetadata('backlog/milestones/Jan2026.md', {
 *   committed: 15,
 *   ticketCount: 25
 * });
 * ```
 */
export async function updateMilestoneFileMetadata(
  milestoneFile: string,
  updates: UpdateMilestoneMetadataOptions
): Promise<void> {
  if (!(await fs.pathExists(milestoneFile))) {
    throw new Error(`Milestone file not found: ${milestoneFile}`);
  }

  const content = await fs.readFile(milestoneFile, 'utf-8');

  // Extract YAML frontmatter
  if (!content.startsWith('---')) {
    throw new Error(`Invalid milestone file format: ${milestoneFile}`);
  }

  const endIdx = content.indexOf('\n---\n', 3);
  if (endIdx === -1) {
    throw new Error(`Malformed YAML frontmatter: ${milestoneFile}`);
  }

  const yamlContent = content.substring(3, endIdx);
  const body = content.substring(endIdx + 4);

  // Parse and update YAML
  const yamlDict = (YAML.parse(yamlContent) as Record<string, unknown>) || {};

  if (updates.milestoneName !== undefined) {
    yamlDict.milestoneName = updates.milestoneName;
  }
  if (updates.jiraMilestoneId !== undefined) {
    yamlDict.jiraMilestoneId = updates.jiraMilestoneId;
  }
  if (updates.committed !== undefined) {
    yamlDict.committed = updates.committed;
  }
  if (updates.ticketCount !== undefined) {
    yamlDict.ticketCount = updates.ticketCount;
  }

  // Rebuild content
  const newYamlContent = YAML.stringify(yamlDict);

  const newContent = `---
${newYamlContent}---${body}`;

  await fs.writeFile(milestoneFile, newContent, 'utf-8');
  console.error(`✅ Milestone file updated: ${milestoneFile}`);
}
