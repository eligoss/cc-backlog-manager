/**
 * Sync Engine - Bidirectional synchronization between local tickets and Jira
 *
 * Features:
 * - CREATE: Push new local tickets to Jira
 * - UPDATE: Push local changes to existing Jira issues
 * - DOWNLOAD: Pull Jira issues to local markdown files
 * - Conflict detection with field-level granularity
 * - Dry-run mode for safe previews
 *
 * @module lib/jira/sync-engine
 */

import { JiraClient, JiraIssue } from './jira-client.js';
import { WikiConverter } from './wiki-converter.js';
import { extractAcceptanceCriteria, formatAsJiraWiki } from './acceptance-criteria.js';
import { parseFrontmatter, stringifyFrontmatter } from '../common/yaml-frontmatter.js';
import { mapLocalToJira, mapJiraToLocal, mergeLabelsAndTags } from './field-mapper.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * Sync mode types
 */
export type SyncMode = 'create' | 'update' | 'download';

/**
 * Field change tracking
 */
export interface FieldChange {
  /** Field name */
  field: string;
  /** Old value (before sync) */
  oldValue: unknown;
  /** New value (after sync) */
  newValue: unknown;
}

/**
 * Conflict information
 */
export interface Conflict {
  /** Field name with conflict */
  field: string;
  /** Local value */
  localValue: unknown;
  /** Remote (Jira) value */
  remoteValue: unknown;
  /** Resolution strategy */
  resolution: 'local' | 'remote' | 'manual';
}

/**
 * Sync result
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;
  /** Sync mode used */
  mode: SyncMode;
  /** Source path/key */
  source: string;
  /** Destination path/key */
  destination: string;
  /** List of field changes made */
  changes: FieldChange[];
  /** Conflicts detected (if any) */
  conflicts?: Conflict[];
  /** Error message (if failed) */
  error?: string;
  /** Whether this was a dry run */
  dryRun?: boolean;
}

/**
 * Sync options
 */
export interface SyncOptions {
  /** Dry-run mode: preview without making changes */
  dryRun?: boolean;
  /** Force sync without conflict check */
  force?: boolean;
  /** Conflict resolution strategy */
  conflictResolution?: 'local' | 'remote' | 'ask';
}

/**
 * Jira custom field IDs
 */
const ACCEPTANCE_CRITERIA_FIELD_ID = 'customfield_13608';

/**
 * Sync Engine - Orchestrates bidirectional sync between local and Jira
 */
export class SyncEngine {
  private wikiConverter: WikiConverter;
  private baseUrl: string;

  constructor(private jiraClient: JiraClient, baseUrl?: string) {
    this.wikiConverter = new WikiConverter();
    this.baseUrl = baseUrl || (jiraClient as unknown as { config?: { baseUrl?: string } })['config']?.baseUrl || '';
  }

  /**
   * Sync local ticket to Jira (CREATE or UPDATE mode)
   *
   * @param filePath - Path to local markdown ticket
   * @param options - Sync options
   * @returns Sync result
   */
  async syncToJira(filePath: string, options: SyncOptions = {}): Promise<SyncResult> {
    try {
      // Read and parse local file
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = parseFrontmatter(content);
      const frontmatter = parsed.data;
      const body = parsed.content;

      // Determine mode based on jira-ticketId
      const jiraTicketId = frontmatter['jira-ticketId'];
      const mode: SyncMode =
        !jiraTicketId || jiraTicketId === '' || jiraTicketId === 'null' ? 'create' : 'update';

      // Detect conflicts if UPDATE mode and not forced
      if (mode === 'update' && !options.force) {
        const conflicts = await this.detectConflicts(filePath, jiraTicketId as string);

        if (conflicts.length > 0) {
          return {
            success: false,
            mode,
            source: filePath,
            destination: jiraTicketId as string,
            changes: [],
            conflicts,
            error: `Detected ${conflicts.length} conflict(s). Use --force to override.`,
          };
        }
      }

      // Extract acceptance criteria
      const acceptanceCriteria = extractAcceptanceCriteria(body);

      // Convert markdown to Jira wiki markup
      const jiraDescription = this.wikiConverter.convert(body, {
        removeTitle: true,
        removeHorizontalRules: true,
        removeMetadataLine: true,
        removeDescriptionHeading: true,
        removeAcceptanceCriteria: true,
        convertBoldLabelsToHeadings: true,
      });

      // Map local data to Jira fields
      const localWithDescription: Record<string, unknown> = {
        ...frontmatter,
        'jira-description': jiraDescription,
      };

      // Merge labels and tags
      const mergedLabels = mergeLabelsAndTags(frontmatter);
      if (mergedLabels.length > 0) {
        localWithDescription['labels'] = mergedLabels;
      }

      const jiraFields = mapLocalToJira(localWithDescription, mode);

      // Add project for CREATE mode
      if (mode === 'create') {
        jiraFields.project = { key: frontmatter['jira-project'] || 'DAPM' };
      }

      // Track changes
      const changes: FieldChange[] = [];

      // Dry-run mode: return without making API calls
      if (options.dryRun) {
        // Generate preview changes
        Object.keys(jiraFields).forEach((field) => {
          changes.push({
            field,
            oldValue: mode === 'update' ? '(existing)' : null,
            newValue: jiraFields[field],
          });
        });

        return {
          success: true,
          mode,
          source: filePath,
          destination: mode === 'create' ? '(new issue)' : (jiraTicketId as string),
          changes,
          dryRun: true,
        };
      }

      // Execute CREATE or UPDATE
      let issueKey: string;
      let issueUrl: string;

      if (mode === 'create') {
        // Create new issue
        issueKey = await this.jiraClient.createIssue(jiraFields);
        issueUrl = `${this.baseUrl}/browse/${issueKey}`;

        changes.push(
          { field: 'jira-ticketId', oldValue: null, newValue: issueKey },
          { field: 'jira-url', oldValue: null, newValue: issueUrl }
        );

        // Update acceptance criteria if any
        if (acceptanceCriteria.length > 0) {
          const acWiki = formatAsJiraWiki(acceptanceCriteria);
          await this.jiraClient.updateIssue(issueKey, {
            [ACCEPTANCE_CRITERIA_FIELD_ID]: acWiki,
          });

          changes.push({
            field: 'acceptance-criteria',
            oldValue: null,
            newValue: `${acceptanceCriteria.length} items`,
          });
        }

        // Update local file with Jira metadata
        const exportDate = new Date().toISOString().split('T')[0];
        const updatedContent = stringifyFrontmatter(
          {
            ...frontmatter,
            'jira-ticketId': issueKey,
            'jira-url': issueUrl,
            exportedDate: exportDate,
          },
          parsed.content
        );
        await fs.writeFile(filePath, updatedContent, 'utf-8');
      } else {
        // Update existing issue
        issueKey = jiraTicketId as string;
        issueUrl = `${this.baseUrl}/browse/${issueKey}`;

        await this.jiraClient.updateIssue(issueKey, jiraFields);

        // Track field changes
        Object.keys(jiraFields).forEach((field) => {
          changes.push({
            field,
            oldValue: '(previous)',
            newValue: jiraFields[field],
          });
        });

        // Update acceptance criteria if any
        if (acceptanceCriteria.length > 0) {
          const acWiki = formatAsJiraWiki(acceptanceCriteria);
          await this.jiraClient.updateIssue(issueKey, {
            [ACCEPTANCE_CRITERIA_FIELD_ID]: acWiki,
          });

          changes.push({
            field: 'acceptance-criteria',
            oldValue: '(previous)',
            newValue: `${acceptanceCriteria.length} items`,
          });
        }

        // Update exportedDate in local file
        const exportDate = new Date().toISOString().split('T')[0];
        const updatedContent = stringifyFrontmatter(
          {
            ...frontmatter,
            exportedDate: exportDate,
          },
          parsed.content
        );
        await fs.writeFile(filePath, updatedContent, 'utf-8');
      }

      return {
        success: true,
        mode,
        source: filePath,
        destination: issueKey,
        changes,
      };
    } catch (error) {
      return {
        success: false,
        mode: 'create',
        source: filePath,
        destination: '(failed)',
        changes: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Sync Jira issue to local markdown file (DOWNLOAD mode)
   *
   * @param jiraKey - Jira issue key (e.g., "DAPM-1234")
   * @param outputPath - Path to save local markdown file
   * @param options - Sync options
   * @returns Sync result
   */
  async syncFromJira(
    jiraKey: string,
    outputPath: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    try {
      // Fetch Jira issue
      const jiraIssue = await this.jiraClient.getIssue(jiraKey);

      // Detect conflicts if file exists and not forced
      if ((await fs.pathExists(outputPath)) && !options.force) {
        const conflicts = await this.detectConflictsFromJira(outputPath, jiraIssue);

        if (conflicts.length > 0) {
          return {
            success: false,
            mode: 'download',
            source: jiraKey,
            destination: outputPath,
            changes: [],
            conflicts,
            error: `Detected ${conflicts.length} conflict(s). Use --force to override.`,
          };
        }
      }

      // Map Jira fields to local data
      const localData = mapJiraToLocal(jiraIssue);

      // Add Jira URL
      localData['jira-url'] = `${this.baseUrl}/browse/${jiraKey}`;

      // Convert Jira wiki description to markdown
      // Note: For now, we use the description as-is
      // TODO: Implement Jira wiki → markdown conversion when needed
      const jiraDescription = String(jiraIssue.fields?.description || '');
      const markdownDescription = jiraDescription;

      // Track changes
      const changes: FieldChange[] = [];
      Object.keys(localData).forEach((field) => {
        changes.push({
          field,
          oldValue: null,
          newValue: localData[field],
        });
      });

      // Dry-run mode: return without writing file
      if (options.dryRun) {
        return {
          success: true,
          mode: 'download',
          source: jiraKey,
          destination: outputPath,
          changes,
          dryRun: true,
        };
      }

      // Build markdown content
      const content = stringifyFrontmatter(localData, markdownDescription);

      // Write to file
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, content, 'utf-8');

      return {
        success: true,
        mode: 'download',
        source: jiraKey,
        destination: outputPath,
        changes,
      };
    } catch (error) {
      return {
        success: false,
        mode: 'download',
        source: jiraKey,
        destination: outputPath,
        changes: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Detect conflicts between local file and Jira issue
   *
   * Compares local frontmatter with remote Jira fields to identify conflicts.
   * A conflict exists when both local and remote have changed since last sync.
   *
   * @param filePath - Path to local markdown file
   * @param jiraKey - Jira issue key
   * @returns Array of detected conflicts
   */
  async detectConflicts(filePath: string, jiraKey: string): Promise<Conflict[]> {
    try {
      // Read local file
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = parseFrontmatter(content);
      const localData = parsed.data;

      // Fetch Jira issue
      const jiraIssue = await this.jiraClient.getIssue(jiraKey);
      const remoteData = mapJiraToLocal(jiraIssue);

      // Detect conflicts
      return this.compareFields(localData, remoteData);
    } catch (_error) {
      // If fetching fails, no conflicts (assume local is source of truth)
      return [];
    }
  }

  /**
   * Detect conflicts between local file and Jira issue object
   *
   * @param filePath - Path to local markdown file
   * @param jiraIssue - Jira issue object
   * @returns Array of detected conflicts
   */
  private async detectConflictsFromJira(
    filePath: string,
    jiraIssue: JiraIssue
  ): Promise<Conflict[]> {
    try {
      // Read local file
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = parseFrontmatter(content);
      const localData = parsed.data;

      // Map Jira to local
      const remoteData = mapJiraToLocal(jiraIssue);

      // Detect conflicts
      return this.compareFields(localData, remoteData);
    } catch (_error) {
      // If reading fails, no conflicts (assume Jira is source of truth)
      return [];
    }
  }

  /**
   * Compare local and remote fields to detect conflicts
   *
   * @param localData - Local frontmatter data
   * @param remoteData - Remote Jira data (mapped to local format)
   * @returns Array of conflicts
   */
  private compareFields(
    localData: Record<string, unknown>,
    remoteData: Record<string, unknown>
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Fields to compare
    const fieldsToCompare = [
      'title',
      'priority',
      'jira-status',
      'jira-assignee',
      'labels',
      'jira-component',
    ];

    for (const field of fieldsToCompare) {
      const localValue = localData[field];
      const remoteValue = remoteData[field];

      // Skip if both are null/undefined
      if (
        (localValue === null || localValue === undefined) &&
        (remoteValue === null || remoteValue === undefined)
      ) {
        continue;
      }

      // Detect conflict if values differ
      if (!this.valuesEqual(localValue, remoteValue)) {
        conflicts.push({
          field,
          localValue,
          remoteValue,
          resolution: 'manual', // Default to manual resolution
        });
      }
    }

    return conflicts;
  }

  /**
   * Compare two values for equality (handles arrays and objects)
   *
   * @param a - First value
   * @param b - Second value
   * @returns True if equal
   */
  private valuesEqual(a: unknown, b: unknown): boolean {
    // Handle null/undefined
    if (a === null || a === undefined) {
      return b === null || b === undefined;
    }
    if (b === null || b === undefined) {
      return false;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, idx) => val === sortedB[idx]);
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    // Primitive comparison
    return a === b;
  }
}

/**
 * Standalone function to sync local ticket to Jira
 *
 * @param filePath - Path to local markdown ticket
 * @param jiraClient - Jira client instance
 * @param options - Sync options
 * @returns Sync result
 */
export async function syncToJira(
  filePath: string,
  jiraClient: JiraClient,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const engine = new SyncEngine(jiraClient);
  return engine.syncToJira(filePath, options);
}

/**
 * Standalone function to sync Jira issue to local file
 *
 * @param jiraKey - Jira issue key
 * @param outputPath - Path to save local markdown file
 * @param jiraClient - Jira client instance
 * @param options - Sync options
 * @returns Sync result
 */
export async function syncFromJira(
  jiraKey: string,
  outputPath: string,
  jiraClient: JiraClient,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const engine = new SyncEngine(jiraClient);
  return engine.syncFromJira(jiraKey, outputPath, options);
}
