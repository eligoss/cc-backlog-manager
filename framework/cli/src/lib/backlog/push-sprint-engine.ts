import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { JiraClient } from '../jira/jira-client.js';
import { resolveSprintId } from '../jira/sprint-resolver.js';
import { BacklogConfig } from './config-loader.js';
import { parseFrontmatter } from './frontmatter-parser.js';
import { extractTicketKeys } from './ticket-keys.js';

export interface PushSprintOptions {
  sprintName: string;
  sprintFile?: string;
  dryRun?: boolean;
  verbose?: boolean;
  onProgress?: (message: string) => void;
}

export interface PushSprintSummary {
  added: number;
  removed: number;
  unchanged: number;
  errors: number;
  sprintId?: number;
  results: Array<{
    issueKey: string;
    action: 'add' | 'remove' | 'unchanged';
    success: boolean;
    error?: string;
  }>;
}

/**
 * Find sprint file by sprint name (searches sprint directory)
 */
async function findSprintFile(
  sprintName: string,
  config: BacklogConfig,
  basePath: string,
): Promise<string> {
  const sprintDir = path.resolve(basePath, config.defaults.sprintPath);
  const files = await glob(path.join(sprintDir, '*.md'), { absolute: true });

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    if (
      frontmatter.sprintId === sprintName ||
      frontmatter.sprintName === sprintName ||
      frontmatter.sprintName === `Sprint ${sprintName}`
    ) {
      return filePath;
    }
  }

  // Also try filename match
  for (const filePath of files) {
    if (path.basename(filePath, '.md') === sprintName) {
      return filePath;
    }
  }

  throw new Error(
    `No sprint file found for "${sprintName}" in ${sprintDir}`,
  );
}

/**
 * Push sprint assignment from a sprint file to Jira.
 *
 * Reads the sprint file, extracts ticket keys, resolves the
 * Jira sprint ID, then batch-moves all issues to that sprint.
 */
export async function pushSprintToJira(
  config: BacklogConfig,
  jiraClient: JiraClient,
  basePath: string,
  options: PushSprintOptions,
): Promise<PushSprintSummary> {
  const summary: PushSprintSummary = { added: 0, removed: 0, unchanged: 0, errors: 0, results: [] };

  // Find sprint file
  const sprintFile = options.sprintFile
    ? path.resolve(basePath, options.sprintFile)
    : await findSprintFile(options.sprintName, config, basePath);

  const content = await fs.readFile(sprintFile, 'utf-8');
  const { frontmatter: sprintFrontmatter } = parseFrontmatter(content);

  // Validate explicit file matches the sprint being pushed
  if (options.sprintFile) {
    const fileSprint = sprintFrontmatter.sprintId || sprintFrontmatter.sprintName;
    if (fileSprint && fileSprint !== options.sprintName && fileSprint !== `Sprint ${options.sprintName}`) {
      throw new Error(
        `Sprint file declares sprint "${fileSprint}" but push target is "${options.sprintName}". Aborting to prevent mismatched update.`,
      );
    }
  }

  const localKeys = extractTicketKeys(content);

  // Resolve sprint ID: use numeric sprintId from frontmatter if present,
  // otherwise resolve by sprint name via Jira API.
  // Numeric sprintId takes precedence to avoid extra API roundtrips and
  // to correctly handle cases where multiple boards exist.
  let sprintId: number;
  const frontmatterSprintId = sprintFrontmatter.sprintId;
  if (typeof frontmatterSprintId === 'number') {
    sprintId = frontmatterSprintId;
    options.onProgress?.(
      `Using sprint ID ${sprintId} from frontmatter (sprintId field)`,
    );
  } else {
    sprintId = await resolveSprintId(
      jiraClient,
      config.jiraProject,
      options.sprintName,
    );
  }
  summary.sprintId = sprintId;

  options.onProgress?.(
    `Resolved "${options.sprintName}" -> sprint ID ${sprintId}`,
  );

  // Fetch current sprint contents from Jira
  const jiraKeys = await jiraClient.getSprintIssues(sprintId);
  options.onProgress?.(
    `Jira sprint has ${jiraKeys.length} tickets, local file has ${localKeys.length} tickets`,
  );

  // Compare local vs Jira
  const localSet = new Set(localKeys);
  const jiraSet = new Set(jiraKeys);
  const toAdd = localKeys.filter((key) => !jiraSet.has(key));
  const toRemove = jiraKeys.filter((key) => !localSet.has(key));
  const unchanged = localKeys.filter((key) => jiraSet.has(key));

  if (toAdd.length === 0 && toRemove.length === 0) {
    options.onProgress?.('Sprint is already in sync. No changes needed.');
    for (const key of unchanged) {
      summary.unchanged++;
      summary.results.push({ issueKey: key, action: 'unchanged', success: true });
    }
    return summary;
  }

  // Report planned changes
  if (toAdd.length > 0) {
    options.onProgress?.(
      `${options.dryRun ? '[DRY RUN] Would add' : 'Adding'} ${toAdd.length} tickets to sprint: ${toAdd.join(', ')}`,
    );
  }
  if (toRemove.length > 0) {
    options.onProgress?.(
      `${options.dryRun ? '[DRY RUN] Would remove' : 'Removing'} ${toRemove.length} tickets from sprint: ${toRemove.join(', ')}`,
    );
  }

  // Track unchanged tickets
  for (const key of unchanged) {
    summary.unchanged++;
    summary.results.push({ issueKey: key, action: 'unchanged', success: true });
  }

  if (options.dryRun) {
    for (const key of toAdd) {
      summary.added++;
      summary.results.push({ issueKey: key, action: 'add', success: true });
    }
    for (const key of toRemove) {
      summary.removed++;
      summary.results.push({ issueKey: key, action: 'remove', success: true });
    }
    return summary;
  }

  // Add missing tickets to sprint (Agile API has 50-issue batch limit)
  const SPRINT_BATCH_SIZE = 50;
  if (toAdd.length > 0) {
    for (let i = 0; i < toAdd.length; i += SPRINT_BATCH_SIZE) {
      const batch = toAdd.slice(i, i + SPRINT_BATCH_SIZE);
      try {
        await jiraClient.moveIssuesToSprint(sprintId, batch);
        for (const key of batch) {
          summary.added++;
          summary.results.push({ issueKey: key, action: 'add', success: true });
          options.onProgress?.(`  + ${key} added`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        for (const key of batch) {
          summary.errors++;
          summary.results.push({ issueKey: key, action: 'add', success: false, error: errorMsg });
        }
        options.onProgress?.(`  Add failed: ${errorMsg}`);
      }
    }
  }

  // Remove stale tickets (move to backlog, Agile API has 50-issue batch limit)
  if (toRemove.length > 0) {
    for (let i = 0; i < toRemove.length; i += SPRINT_BATCH_SIZE) {
      const batch = toRemove.slice(i, i + SPRINT_BATCH_SIZE);
      try {
        await jiraClient.moveIssuesToBacklog(batch);
        for (const key of batch) {
          summary.removed++;
          summary.results.push({ issueKey: key, action: 'remove', success: true });
          options.onProgress?.(`  - ${key} removed`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        for (const key of batch) {
          summary.errors++;
          summary.results.push({ issueKey: key, action: 'remove', success: false, error: errorMsg });
        }
        options.onProgress?.(`  Remove failed: ${errorMsg}`);
      }
    }
  }

  return summary;
}
