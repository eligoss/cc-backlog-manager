import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { JiraClient } from '../jira/jira-client.js';
import { resolveVersionId } from '../jira/version-resolver.js';
import { BacklogConfig } from './config-loader.js';
import { parseFrontmatter } from './frontmatter-parser.js';
import { extractTicketKeys } from './ticket-keys.js';

export interface PushVersionOptions {
  milestoneName: string;
  milestoneFile?: string;
  dryRun?: boolean;
  verbose?: boolean;
  onProgress?: (message: string) => void;
}

export interface PushVersionSummary {
  pushed: number;
  errors: number;
  results: Array<{
    issueKey: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Find milestone file by name (searches milestone directory)
 */
async function findMilestoneFile(
  milestoneName: string,
  config: BacklogConfig,
  basePath: string,
): Promise<string> {
  const milestoneDir = path.resolve(basePath, config.defaults.milestonePath);
  const files = await glob(path.join(milestoneDir, '*.md'), { absolute: true });

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    if (frontmatter.milestone === milestoneName) {
      return filePath;
    }
  }

  throw new Error(
    `No milestone file found with name "${milestoneName}" in ${milestoneDir}`,
  );
}

/**
 * Push fixVersion to all tickets in a milestone.
 *
 * Reads the milestone file, extracts ticket keys, resolves the
 * Jira version ID, then updates each ticket's fixVersions field.
 */
export async function pushVersionToJira(
  config: BacklogConfig,
  jiraClient: JiraClient,
  basePath: string,
  options: PushVersionOptions,
): Promise<PushVersionSummary> {
  const summary: PushVersionSummary = { pushed: 0, errors: 0, results: [] };

  // Find milestone file
  const milestoneFile = options.milestoneFile
    ? path.resolve(basePath, options.milestoneFile)
    : await findMilestoneFile(options.milestoneName, config, basePath);

  const content = await fs.readFile(milestoneFile, 'utf-8');

  // Validate explicit file matches the version being pushed
  if (options.milestoneFile) {
    const { frontmatter } = parseFrontmatter(content);
    if (frontmatter.milestone && frontmatter.milestone !== options.milestoneName) {
      throw new Error(
        `Milestone file declares milestone "${frontmatter.milestone}" but push target is "${options.milestoneName}". Aborting to prevent mismatched update.`,
      );
    }
  }

  const ticketKeys = extractTicketKeys(content);

  if (ticketKeys.length === 0) {
    options.onProgress?.('No tickets found in milestone file.');
    return summary;
  }

  // Resolve version name to Jira ID
  const versionId = await resolveVersionId(
    jiraClient,
    config.jiraProject,
    options.milestoneName,
  );

  options.onProgress?.(
    `Resolved "${options.milestoneName}" → version ID ${versionId}`,
  );
  options.onProgress?.(
    `${options.dryRun ? '[DRY RUN] Would update' : 'Updating'} fixVersion on ${ticketKeys.length} tickets...`,
  );

  for (const key of ticketKeys) {
    try {
      if (!options.dryRun) {
        await jiraClient.updateIssue(key, {
          fixVersions: [{ id: versionId }],
        });
      }
      summary.pushed++;
      summary.results.push({ issueKey: key, success: true });
      options.onProgress?.(`  ${options.dryRun ? '[DRY RUN] ' : ''}${key} done`);
    } catch (err) {
      summary.errors++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      summary.results.push({ issueKey: key, success: false, error: errorMsg });
      options.onProgress?.(`  ${key} failed: ${errorMsg}`);
    }
  }

  return summary;
}
