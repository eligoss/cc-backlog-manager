/**
 * Push engine for syncing local ticket changes to Jira
 *
 * Detects whether each ticket needs CREATE or UPDATE mode based on
 * frontmatter jira-ticketId, performs conflict checks via diff-engine,
 * and pushes changes through the Jira client.
 *
 * @module lib/backlog/push-engine
 */

import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { JiraClient } from '../jira/jira-client.js';
import { mapLocalToJira } from '../jira/field-mapper.js';
import { convertMarkdownToJiraWiki } from '../jira/wiki-converter.js';
import { extractAcceptanceCriteria, formatAsJiraWiki } from '../jira/acceptance-criteria.js';
import { BacklogConfig } from './config-loader.js';
import { getTicketSyncStatus, SyncStatus } from './diff-engine.js';
import { parseFrontmatter } from './frontmatter-parser.js';

export enum PushMode {
  CREATE = 'create',
  UPDATE = 'update',
}

export interface PushOptions {
  tickets?: string[];
  all?: boolean;
  sprint?: string;
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  onProgress?: (message: string) => void;
}

export interface PushResult {
  ticketId: string;
  mode: PushMode;
  success: boolean;
  issueKey?: string;
  issueUrl?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface PushSummary {
  pushed: number;
  created: number;
  skipped: number;
  errors: number;
  results: PushResult[];
}

/**
 * Determine whether a ticket should be created or updated in Jira
 * based on the presence and value of jira-ticketId in frontmatter.
 */
export function detectPushMode(frontmatter: Record<string, unknown>): PushMode {
  const ticketId = frontmatter['jira-ticketId'];
  if (!ticketId || ticketId === 'null' || ticketId === '') {
    return PushMode.CREATE;
  }
  return PushMode.UPDATE;
}

async function findTicketFile(
  ticketId: string,
  config: BacklogConfig,
  basePath: string,
): Promise<string | null> {
  const dirs = [
    path.resolve(basePath, config.defaults.ticketPath),
    path.resolve(basePath, config.defaults.epicPath),
  ];
  for (const dir of dirs) {
    if (!(await fs.pathExists(dir))) continue;
    const files = await glob(path.join(dir, '**', '*.md'), { absolute: true });
    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      const basename = path.basename(filePath, '.md');
      if (frontmatter['jira-ticketId'] === ticketId || basename === ticketId) {
        return filePath;
      }
    }
  }
  return null;
}

async function pushSingleTicket(
  filePath: string,
  config: BacklogConfig,
  jiraClient: JiraClient,
  options: PushOptions,
  basePath: string,
): Promise<PushResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);
  const mode = detectPushMode(frontmatter);
  const ticketId = (frontmatter['jira-ticketId'] as string) ?? '(new)';

  // Conflict check for UPDATE mode
  if (mode === PushMode.UPDATE && !options.force) {
    const stat = await fs.stat(filePath);
    let jiraUpdated: string | null = null;
    try {
      const issue = await jiraClient.getIssue(ticketId);
      jiraUpdated = (issue.fields as Record<string, unknown>).updated as string;
    } catch {
      /* proceed if can't fetch */
    }

    if (jiraUpdated) {
      const status = getTicketSyncStatus({
        frontmatter,
        fileMtime: stat.mtime,
        jiraUpdated,
      });
      if (status === SyncStatus.CONFLICT) {
        return {
          ticketId,
          mode,
          success: false,
          skipped: true,
          skipReason:
            'conflict — both local and remote changed. Use --force to override.',
        };
      }
      if (status === SyncStatus.REMOTE_NEWER) {
        return {
          ticketId,
          mode,
          success: false,
          skipped: true,
          skipReason:
            'remote newer — Jira has changes since last sync. Pull first or use --force.',
        };
      }
    }
  }

  const jiraFields = mapLocalToJira(
    frontmatter,
    mode === PushMode.CREATE ? 'create' : 'update',
  );
  const wikiBody = convertMarkdownToJiraWiki(body, {
    removeTitle: true,
    removeHorizontalRules: true,
    removeAcceptanceCriteria: true,
  });
  const criteria = extractAcceptanceCriteria(body);
  const wikiAc = criteria.length > 0 ? formatAsJiraWiki(criteria) : null;

  if (options.dryRun) {
    return { ticketId, mode, success: true, issueKey: ticketId };
  }

  if (mode === PushMode.CREATE) {
    jiraFields.project = { key: config.jiraProject };
    jiraFields.description = wikiBody;
    if (wikiAc) jiraFields.customfield_13608 = wikiAc;

    const issueKey = await jiraClient.createIssue(jiraFields);
    const issueUrl = `${config.jiraBaseUrl}/browse/${issueKey}`;

    let updatedContent = content.replace(
      /jira-ticketId:\s*.*/,
      `jira-ticketId: ${issueKey}`,
    );
    if (updatedContent.includes('jira-url:')) {
      updatedContent = updatedContent.replace(
        /jira-url:\s*.*/,
        `jira-url: "${issueUrl}"`,
      );
    }
    // If jira-ticketId wasn't injected (field was missing from frontmatter),
    // insert only jira-ticketId and jira-url before the closing ---
    if (!updatedContent.includes(`jira-ticketId: ${issueKey}`)) {
      updatedContent = updatedContent.replace(
        /\n---/,
        `\njira-ticketId: ${issueKey}\njira-url: "${issueUrl}"\n---`,
      );
    }

    // Determine the final file path (rename new-*.md → {number}-{slug}.md)
    let finalFilePath = filePath;
    const basename = path.basename(filePath, '.md');
    if (basename.startsWith('new-')) {
      const issueNumber = issueKey.split('-')[1];
      const slug = basename.replace(/^new-/, '');
      const newBasename = `${issueNumber}-${slug}.md`;
      finalFilePath = path.join(path.dirname(filePath), newBasename);
    }

    await fs.writeFile(finalFilePath, updatedContent, 'utf-8');

    // If the file was renamed, remove the old file and update references
    if (finalFilePath !== filePath) {
      await fs.remove(filePath);

      // Update references in sprint and milestone markdown files
      const oldBasename = path.basename(filePath);
      const newBasename = path.basename(finalFilePath);
      const refDirs = [
        path.resolve(basePath, config.defaults.sprintPath),
        path.resolve(basePath, config.defaults.milestonePath),
      ];
      for (const refDir of refDirs) {
        if (!(await fs.pathExists(refDir))) continue;
        const mdFiles = await glob(path.join(refDir, '**', '*.md'), { absolute: true });
        for (const mdFile of mdFiles) {
          const mdContent = await fs.readFile(mdFile, 'utf-8');
          if (mdContent.includes(oldBasename)) {
            const updatedMd = mdContent.split(oldBasename).join(newBasename);
            await fs.writeFile(mdFile, updatedMd, 'utf-8');
          }
        }
      }
    }

    return { ticketId: issueKey, mode, success: true, issueKey, issueUrl };
  } else {
    const updateFields: Record<string, unknown> = { ...jiraFields };
    updateFields.description = wikiBody;
    if (wikiAc) updateFields.customfield_13608 = wikiAc;
    await jiraClient.updateIssue(ticketId, updateFields);
    return { ticketId, mode, success: true, issueKey: ticketId };
  }
}

/**
 * Push local ticket changes to Jira.
 *
 * Supports pushing specific tickets by ID, or all locally-modified tickets
 * (determined via diff-engine). Performs conflict detection unless --force
 * is specified.
 */
export async function pushToJira(
  config: BacklogConfig,
  jiraClient: JiraClient,
  basePath: string,
  options: PushOptions,
): Promise<PushSummary> {
  const summary: PushSummary = {
    pushed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
    results: [],
  };

  let filePaths: string[] = [];

  if (options.tickets && options.tickets.length > 0) {
    for (const ticketId of options.tickets) {
      const filePath = await findTicketFile(ticketId, config, basePath);
      if (filePath) {
        filePaths.push(filePath);
      } else {
        summary.errors++;
        summary.results.push({
          ticketId,
          mode: PushMode.UPDATE,
          success: false,
          error: `Local file not found for ${ticketId}`,
        });
      }
    }
  } else if (options.sprint) {
    // Find locally-changed tickets in this sprint via diff
    const { diffAllTickets } = await import('./diff-engine.js');
    const diffSummary = await diffAllTickets(config, jiraClient, basePath, { sprint: options.sprint });
    filePaths = diffSummary.results
      .filter((r) => r.status === SyncStatus.LOCAL_NEWER)
      .map((r) => r.filePath);
  } else if (options.all) {
    const { diffAllTickets } = await import('./diff-engine.js');
    const diffSummary = await diffAllTickets(config, jiraClient, basePath);
    filePaths = diffSummary.results
      .filter((r) => r.status === SyncStatus.LOCAL_NEWER || r.status === SyncStatus.LOCAL_ONLY)
      .map((r) => r.filePath);
  }

  for (const filePath of filePaths) {
    try {
      const result = await pushSingleTicket(filePath, config, jiraClient, options, basePath);
      summary.results.push(result);
      if (result.skipped) {
        summary.skipped++;
      } else if (result.success) {
        if (result.mode === PushMode.CREATE) summary.created++;
        summary.pushed++;
      }
    } catch (err) {
      summary.errors++;
      summary.results.push({
        ticketId: path.basename(filePath, '.md'),
        mode: PushMode.UPDATE,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}
