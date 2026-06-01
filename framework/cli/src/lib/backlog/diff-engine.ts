/**
 * Diff engine for comparing local ticket state vs Jira remote state
 *
 * Exports `getTicketSyncStatus()` for per-ticket comparison and
 * `diffAllTickets()` for batch diffing all local tickets against Jira.
 *
 * @module lib/backlog/diff-engine
 */

import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { JiraClient, JiraIssue } from '../jira/jira-client.js';
import { BacklogConfig } from './config-loader.js';
import { parseFrontmatter } from './frontmatter-parser.js';

export enum SyncStatus {
  IN_SYNC = 'in sync',
  REMOTE_NEWER = 'remote newer',
  LOCAL_NEWER = 'local newer',
  CONFLICT = 'conflict',
  LOCAL_ONLY = 'local only',
}

export interface TicketSyncInput {
  frontmatter: Record<string, unknown>;
  fileMtime: Date;
  jiraUpdated: string | null;
}

export interface DiffResult {
  ticketId: string;
  title: string;
  status: SyncStatus;
  filePath: string;
}

export interface DiffSummary {
  results: DiffResult[];
  counts: Record<SyncStatus, number>;
}

/**
 * Parse a date value from frontmatter, handling both ISO timestamps
 * and date-only strings (backward compat).
 */
function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const str = String(value);
  const normalized = str.includes('T') ? str : str + 'T00:00:00Z';
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Determine the sync status of a single ticket by comparing local state
 * (file modification time, exportedDate) against Jira's updated timestamp.
 *
 * Decision logic:
 * - No jira-ticketId -> LOCAL_ONLY (never pushed)
 * - No exportedDate  -> REMOTE_NEWER (assume Jira is authoritative)
 * - Both local and remote changed after exportedDate -> CONFLICT
 * - Only remote changed -> REMOTE_NEWER
 * - Only local changed -> LOCAL_NEWER
 * - Neither changed -> IN_SYNC
 */
export function getTicketSyncStatus(input: TicketSyncInput): SyncStatus {
  const { frontmatter, fileMtime, jiraUpdated } = input;

  if (!frontmatter['jira-ticketId']) {
    return SyncStatus.LOCAL_ONLY;
  }

  const exportedDate = parseDate(frontmatter.exportedDate);
  const remoteUpdated = jiraUpdated ? new Date(jiraUpdated) : null;

  if (!exportedDate) {
    return SyncStatus.REMOTE_NEWER;
  }

  const localChanged = fileMtime > exportedDate;
  const remoteChanged = remoteUpdated ? remoteUpdated > exportedDate : false;

  if (localChanged && remoteChanged) return SyncStatus.CONFLICT;
  if (remoteChanged) return SyncStatus.REMOTE_NEWER;
  if (localChanged) return SyncStatus.LOCAL_NEWER;
  return SyncStatus.IN_SYNC;
}

/**
 * Diff all local ticket files against Jira remote state.
 *
 * Scans ticketPath and epicPath for markdown files, parses frontmatter,
 * batch-fetches matching Jira issues, and returns a summary with per-ticket
 * sync status and aggregate counts.
 */
export async function diffAllTickets(
  config: BacklogConfig,
  jiraClient: JiraClient,
  basePath: string,
  filter?: { sprint?: string; version?: string; ticketId?: string }
): Promise<DiffSummary> {
  const ticketDir = path.resolve(basePath, config.defaults.ticketPath);
  const epicDir = path.resolve(basePath, config.defaults.epicPath);

  const patterns = [
    path.join(ticketDir, '**', '*.md'),
    path.join(epicDir, '*.md'),
  ];

  let allFiles: string[] = [];
  for (const pattern of patterns) {
    const files = await glob(pattern, { absolute: true });
    allFiles.push(...files);
  }
  allFiles = allFiles.filter((f) => !f.endsWith('README.md'));

  const results: DiffResult[] = [];
  const ticketIds: string[] = [];

  interface LocalTicket {
    filePath: string;
    frontmatter: Record<string, unknown>;
    fileMtime: Date;
  }

  const localTickets: LocalTicket[] = [];

  for (const filePath of allFiles) {
    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    if (Object.keys(frontmatter).length === 0 && !content.startsWith('---\n')) continue;

    const ticketId = frontmatter['jira-ticketId'] as string | null;
    if (filter?.ticketId && ticketId !== filter.ticketId) continue;

    const stat = await fs.stat(filePath);
    if (ticketId) ticketIds.push(ticketId);
    localTickets.push({ filePath, frontmatter, fileMtime: stat.mtime });
  }

  // Batch-fetch from Jira
  const jiraIssueMap = new Map<string, JiraIssue>();

  if (ticketIds.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < ticketIds.length; i += batchSize) {
      const batch = ticketIds.slice(i, i + batchSize);
      const jql = `issueKey IN (${batch.join(',')})`;
      let pageToken: string | undefined;
      do {
        const searchResult = await jiraClient.searchIssues(jql, batchSize, undefined, pageToken);
        for (const issue of searchResult.issues) {
          jiraIssueMap.set(issue.key, issue);
        }
        pageToken = searchResult.nextPageToken;
      } while (pageToken);
    }
  }

  const counts: Record<SyncStatus, number> = {
    [SyncStatus.IN_SYNC]: 0,
    [SyncStatus.REMOTE_NEWER]: 0,
    [SyncStatus.LOCAL_NEWER]: 0,
    [SyncStatus.CONFLICT]: 0,
    [SyncStatus.LOCAL_ONLY]: 0,
  };

  for (const local of localTickets) {
    const ticketId = local.frontmatter['jira-ticketId'] as string | null;
    const jiraIssue = ticketId ? jiraIssueMap.get(ticketId) : null;
    const jiraUpdated = jiraIssue
      ? (jiraIssue.fields as Record<string, unknown>).updated as string
      : null;

    const status = getTicketSyncStatus({
      frontmatter: local.frontmatter,
      fileMtime: local.fileMtime,
      jiraUpdated,
    });

    results.push({
      ticketId: ticketId ?? '(local)',
      title:
        (local.frontmatter.title as string) ??
        path.basename(local.filePath, '.md'),
      status,
      filePath: local.filePath,
    });

    counts[status]++;
  }

  // Apply sprint/version filter if provided: fetch matching tickets from Jira and
  // keep only those results (plus LOCAL_ONLY tickets that have no Jira key)
  if ((filter?.sprint || filter?.version) && ticketIds.length > 0) {
    const clauses = [`project = ${config.jiraProject}`];
    if (filter.sprint) clauses.push(`sprint = "${filter.sprint}"`);
    if (filter.version) clauses.push(`fixVersion = "${filter.version}"`);
    const filterJql = clauses.join(' AND ');

    const filterKeys = new Set<string>();
    let filterPageToken: string | undefined;
    do {
      const searchResult = await jiraClient.searchIssues(filterJql, 50, undefined, filterPageToken);
      for (const issue of searchResult.issues) filterKeys.add(issue.key);
      filterPageToken = searchResult.nextPageToken;
    } while (filterPageToken);
    const filteredResults = results.filter(
      (r) => r.status === SyncStatus.LOCAL_ONLY || filterKeys.has(r.ticketId),
    );
    // Recount after filtering
    for (const key of Object.keys(counts)) counts[key as SyncStatus] = 0;
    for (const r of filteredResults) counts[r.status]++;
    return { results: filteredResults, counts };
  }

  return { results, counts };
}
