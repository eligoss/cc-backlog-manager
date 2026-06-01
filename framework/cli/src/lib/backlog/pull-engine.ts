import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { JiraClient, JiraIssue, JiraSearchResults } from '../jira/jira-client.js';
import { mapJiraToLocal } from '../jira/field-mapper.js';
import { convertJiraWikiToMarkdown } from '../jira/wiki-converter.js';
import { BacklogConfig } from './config-loader.js';
import { parseFrontmatter } from './frontmatter-parser.js';

export interface PullOptions {
  ticket?: string;
  sprint?: string;
  version?: string;
  dryRun?: boolean;
  verbose?: boolean;
  onProgress?: (message: string) => void;
}

export interface PullSummary {
  created: number;
  updated: number;
  inSync: number;
  errors: number;
  details: {
    created: string[];
    updated: string[];
    errors: Array<{ ticket: string; error: string }>;
  };
}

export function normalizeSprintName(name: string): string {
  const normalized = name.replace(/^sprint[\s_]/i, '');
  if (/^\d{4}-W\d{2}$/.test(normalized)) {
    return normalized;
  }
  return normalized.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

interface PullFilter {
  sprint?: string;
  version?: string;
  ticketKeys?: string[];
}

export function buildPullJql(project: string, filter: PullFilter): string {
  if (filter.ticketKeys && filter.ticketKeys.length > 0) {
    return `issueKey IN (${filter.ticketKeys.join(',')})`;
  }
  const clauses: string[] = [`project = ${project}`];
  if (filter.sprint) clauses.push(`sprint = "${filter.sprint}"`);
  if (filter.version) clauses.push(`fixVersion = "${filter.version}"`);
  return clauses.join(' AND ');
}

async function findLocalTicketIds(config: BacklogConfig, basePath: string): Promise<Map<string, string>> {
  const ticketDir = path.resolve(basePath, config.defaults.ticketPath);
  const epicDir = path.resolve(basePath, config.defaults.epicPath);
  const patterns = [
    path.join(ticketDir, '**', '*.md'),
    path.join(epicDir, '*.md'),
  ];
  const idToPath = new Map<string, string>();
  for (const pattern of patterns) {
    const files = await glob(pattern, { absolute: true });
    for (const filePath of files) {
      if (filePath.endsWith('README.md')) continue;
      const content = await fs.readFile(filePath, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      const id = frontmatter['jira-ticketId'];
      if (id && typeof id === 'string' && id !== 'null') {
        idToPath.set(id, filePath);
      }
    }
  }
  return idToPath;
}

async function paginatedSearch(
  jiraClient: JiraClient,
  jql: string,
  onProgress?: (message: string) => void
): Promise<JiraIssue[]> {
  const allIssues: JiraIssue[] = [];
  const maxResults = 50;
  let pageToken: string | undefined;
  do {
    const result: JiraSearchResults = await jiraClient.searchIssues(jql, maxResults, undefined, pageToken);
    allIssues.push(...result.issues);
    pageToken = result.nextPageToken;
    onProgress?.(`Fetched ${allIssues.length} issues...`);
  } while (pageToken);
  return allIssues;
}

function sanitizeFilename(key: string, summary: string): string {
  const number = key.replace(/^[A-Z]+-/, '');
  const slug = summary
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${number}-${slug}.md`;
}

function needsQuoting(value: string): boolean {
  return /[:{}"'\n#|>@`!%&*?,]/.test(value) || /[[\]]/.test(value) || value.startsWith(' ') || value.endsWith(' ');
}

function buildTicketMarkdown(frontmatter: Record<string, unknown>, description: string): string {
  const lines: string[] = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === null || value === undefined) {
      lines.push(`${key}: null`);
    } else if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
    } else if (typeof value === 'string') {
      if (needsQuoting(value)) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push(description);
  return lines.join('\n');
}

export async function pullFromJira(
  config: BacklogConfig,
  jiraClient: JiraClient,
  basePath: string,
  options: PullOptions
): Promise<PullSummary> {
  const summary: PullSummary = {
    created: 0, updated: 0, inSync: 0, errors: 0,
    details: { created: [], updated: [], errors: [] },
  };

  const localTicketMap = await findLocalTicketIds(config, basePath);

  if (options.ticket) {
    // Pull a single ticket by ID
    const jql = `issueKey = ${options.ticket}`;
    const issues = await paginatedSearch(jiraClient, jql, options.onProgress);
    return processIssues(issues, localTicketMap, config, basePath, options, summary);
  }

  if (options.sprint || options.version) {
    const jql = buildPullJql(config.jiraProject, {
      sprint: options.sprint,
      version: options.version,
    });
    const issues = await paginatedSearch(jiraClient, jql, options.onProgress);
    return processIssues(issues, localTicketMap, config, basePath, options, summary);
  }

  // Bare pull: refresh all local tickets
  const keys = Array.from(localTicketMap.keys());
  if (keys.length === 0) {
    options.onProgress?.('No local tickets with jira-ticketId found.');
    return summary;
  }
  const allIssues: JiraIssue[] = [];
  for (let i = 0; i < keys.length; i += 50) {
    const batch = keys.slice(i, i + 50);
    const jql = buildPullJql(config.jiraProject, { ticketKeys: batch });
    const issues = await paginatedSearch(jiraClient, jql, options.onProgress);
    allIssues.push(...issues);
  }
  return processIssues(allIssues, localTicketMap, config, basePath, options, summary);
}

async function processIssues(
  issues: JiraIssue[],
  localTicketMap: Map<string, string>,
  config: BacklogConfig,
  basePath: string,
  options: PullOptions,
  summary: PullSummary
): Promise<PullSummary> {
  for (const issue of issues) {
    try {
      // mapJiraToLocal expects the full issue object (extracts key + fields internally)
      const localData = mapJiraToLocal(issue as unknown as Record<string, unknown>);
      localData['jira-ticketId'] = issue.key;
      localData['jira-url'] = `${config.jiraBaseUrl}/browse/${issue.key}`;
      localData['exportedDate'] = new Date().toISOString();

      const fields = issue.fields;
      const description = fields.description
        ? convertJiraWikiToMarkdown(String(fields.description))
        : '';

      const existingPath = localTicketMap.get(issue.key);
      const isExisting = existingPath !== undefined;
      const targetPath = isExisting
        ? existingPath
        : path.join(
            path.resolve(basePath, config.defaults.ticketPath),
            sanitizeFilename(issue.key, String(fields.summary ?? 'untitled'))
          );

      if (isExisting) {
        // Check if remote actually changed since last pull; skip write if already up to date
        const existingContent = await fs.readFile(targetPath, 'utf-8');
        const exportedMatch = existingContent.match(/exportedDate:\s*(.+)/);
        if (exportedMatch) {
          const exportedStr = exportedMatch[1].trim().replace(/^["']|["']$/g, '');
          const exported = new Date(exportedStr.includes('T') ? exportedStr : exportedStr + 'T00:00:00Z');
          const remoteUpdated = new Date(String(fields.updated));
          if (!isNaN(exported.getTime()) && !isNaN(remoteUpdated.getTime()) && exported >= remoteUpdated) {
            summary.inSync++;
            continue; // Skip writing — already up to date
          }
        }
      }

      if (options.dryRun) {
        const action = isExisting ? 'Would update' : 'Would create';
        options.onProgress?.(`${action}: ${issue.key} → ${path.basename(targetPath)}`);
      } else {
        if (isExisting) {
          options.onProgress?.(`Updating: ${issue.key} → ${path.basename(targetPath)}`);
        }
        await fs.ensureDir(path.dirname(targetPath));
        const markdown = buildTicketMarkdown(localData, description);
        await fs.writeFile(targetPath, markdown, 'utf-8');
      }

      if (isExisting) {
        summary.updated++;
        summary.details.updated.push(issue.key);
      } else {
        summary.created++;
        summary.details.created.push(issue.key);
      }
    } catch (err) {
      summary.errors++;
      summary.details.errors.push({
        ticket: issue.key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return summary;
}
