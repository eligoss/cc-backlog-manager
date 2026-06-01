import { JiraClient } from './jira-client.js';
import { WikiConverter } from './wiki-converter.js';
import { extractAcceptanceCriteria, formatAsJiraWiki } from './acceptance-criteria.js';
import { parseFrontmatter, updateFrontmatter } from '../common/yaml-frontmatter.js';
import fs from 'fs-extra';

/**
 * Export mode: CREATE or UPDATE
 */
export enum ExportMode {
  CREATE = 'create',
  UPDATE = 'update',
}

/**
 * Options for exporting tickets
 */
export interface ExportOptions {
  /** Dry-run mode: validate without making API calls */
  dryRun?: boolean;
  /** Force CREATE mode (override auto-detection) */
  forceCreate?: boolean;
  /** Force UPDATE mode (override auto-detection) */
  forceUpdate?: boolean;
  /** Delay between batch exports in milliseconds */
  delayMs?: number;
}

/**
 * Result of exporting a ticket
 */
export interface ExportResult {
  /** Whether the export was successful */
  success: boolean;
  /** Export mode used (CREATE or UPDATE) */
  mode: ExportMode;
  /** Jira issue key (e.g., DAPM-1234) */
  issueKey?: string;
  /** Jira issue URL */
  issueUrl?: string;
  /** Number of acceptance criteria exported */
  criteriaCount?: number;
  /** File path that was exported */
  filePath: string;
  /** Whether this was a dry run */
  dryRun?: boolean;
  /** Error message if export failed */
  error?: string;
}

/**
 * Jira custom field IDs
 */
const ACCEPTANCE_CRITERIA_FIELD_ID = 'customfield_13608';

/**
 * Priority mapping from custom codes to Jira priority names
 */
const PRIORITY_MAP: Record<string, string> = {
  P0: 'Highest',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
  P4: 'Lowest',
  Highest: 'Highest',
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  Lowest: 'Lowest',
};

/**
 * Document type to Jira issue type mapping
 */
const ISSUE_TYPE_MAP: Record<string, string> = {
  story: 'Story',
  task: 'Task',
  bug: 'Bug',
  spike: 'Task', // Spikes are tasks in Jira
  epic: 'Epic',
};

/**
 * ExportEngine - Orchestrates the export of tickets to Jira
 *
 * Features:
 * - Auto-detects CREATE vs UPDATE mode based on jira-ticketId
 * - Converts markdown to Jira wiki markup
 * - Extracts and formats acceptance criteria
 * - Updates local files with Jira metadata
 * - Supports batch export with rate limiting
 * - Dry-run mode for validation
 *
 * Migrated from: modules/jira/src/jira/export_to_jira.py (TicketExporter)
 */
export class ExportEngine {
  private wikiConverter: WikiConverter;
  private baseUrl: string;

  constructor(private jiraClient: JiraClient, baseUrl?: string) {
    this.wikiConverter = new WikiConverter();
    // Extract baseUrl from jiraClient config or use provided value
    this.baseUrl = baseUrl || (jiraClient as unknown as { config?: { baseUrl?: string } })['config']?.baseUrl || '';
  }

  /**
   * Detect export mode based on frontmatter
   *
   * Returns CREATE if jira-ticketId is missing, null, empty, or "null" string.
   * Returns UPDATE if jira-ticketId exists and has a valid value.
   *
   * @param frontmatter - Parsed frontmatter data
   * @returns Export mode (CREATE or UPDATE)
   */
  detectMode(frontmatter: Record<string, unknown>): ExportMode {
    const ticketId = frontmatter['jira-ticketId'];

    // CREATE if ticketId is missing, null, empty, or "null" string
    if (!ticketId || ticketId === '' || ticketId === 'null') {
      return ExportMode.CREATE;
    }

    // UPDATE if ticketId exists with a valid value
    return ExportMode.UPDATE;
  }

  /**
   * Build Jira fields from frontmatter and description
   *
   * For CREATE mode: Includes project and issuetype (required for creation)
   * For UPDATE mode: Excludes project and issuetype (immutable fields)
   *
   * @param frontmatter - Parsed frontmatter data
   * @param description - Jira wiki markup description
   * @param mode - Export mode (CREATE or UPDATE)
   * @returns Jira fields object
   */
  buildJiraFields(
    frontmatter: Record<string, unknown>,
    description: string,
    mode: ExportMode
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {
      summary: frontmatter.title || 'Untitled',
      description,
    };

    // Add immutable fields only for CREATE mode
    if (mode === ExportMode.CREATE) {
      // Map documentType to Jira issue type
      const docType = String(frontmatter.documentType || 'story').toLowerCase();
      const issueType = ISSUE_TYPE_MAP[docType] || 'Story';

      fields.project = { key: 'DAPM' };
      fields.issuetype = { name: issueType };
    }

    // Priority mapping
    if (frontmatter.priority) {
      const jiraPriority = PRIORITY_MAP[String(frontmatter.priority)] || 'Medium';
      fields.priority = { name: jiraPriority };
    }

    // Labels - combine labels and tags, deduplicate
    const labels = new Set<string>();

    // Add from labels field
    if (frontmatter.labels) {
      const labelList = Array.isArray(frontmatter.labels)
        ? frontmatter.labels
        : [frontmatter.labels];
      labelList.forEach((label) => labels.add(String(label).trim()));
    }

    // Add from tags field
    if (frontmatter.tags) {
      const tagList = Array.isArray(frontmatter.tags)
        ? frontmatter.tags
        : [frontmatter.tags];
      tagList.forEach((tag) => labels.add(String(tag).trim()));
    }

    if (labels.size > 0) {
      fields.labels = Array.from(labels);
    }

    return fields;
  }

  /**
   * Export a single ticket to Jira
   *
   * Auto-detects CREATE vs UPDATE mode based on jira-ticketId in frontmatter.
   * Can be overridden with forceCreate or forceUpdate options.
   *
   * @param filePath - Path to markdown ticket file
   * @param options - Export options (dryRun, forceCreate, forceUpdate)
   * @returns Export result
   */
  async exportTicket(filePath: string, options: ExportOptions = {}): Promise<ExportResult> {
    // Validate file exists
    const fileExists = await fs.pathExists(filePath);
    if (!fileExists) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read and parse file
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = parseFrontmatter(content);
    const frontmatter = parsed.data;
    const body = parsed.content;

    // Determine export mode
    let mode: ExportMode;

    if (options.forceCreate && options.forceUpdate) {
      throw new Error('Cannot use both forceCreate and forceUpdate options');
    }

    if (options.forceCreate) {
      mode = ExportMode.CREATE;
    } else if (options.forceUpdate) {
      mode = ExportMode.UPDATE;
    } else {
      mode = this.detectMode(frontmatter);
    }

    // Validate mode-specific requirements
    this.validateForMode(frontmatter, mode);

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

    // Build Jira fields
    const fields = this.buildJiraFields(frontmatter, jiraDescription, mode);

    // Dry-run mode: return without making API calls
    if (options.dryRun) {
      return {
        success: true,
        mode,
        filePath,
        dryRun: true,
        criteriaCount: acceptanceCriteria.length,
      };
    }

    // Execute CREATE or UPDATE
    let issueKey: string;
    let issueUrl: string;

    if (mode === ExportMode.CREATE) {
      // Create new issue
      issueKey = await this.jiraClient.createIssue(fields);
      issueUrl = `${this.baseUrl}/browse/${issueKey}`;

      // Update acceptance criteria if any
      if (acceptanceCriteria.length > 0) {
        const acWiki = formatAsJiraWiki(acceptanceCriteria);
        await this.jiraClient.updateIssue(issueKey, {
          [ACCEPTANCE_CRITERIA_FIELD_ID]: acWiki,
        });
      }

      // Update local file with Jira metadata
      await this.updateLocalFileAfterCreate(filePath, issueKey, issueUrl);
    } else {
      // Update existing issue
      issueKey = frontmatter['jira-ticketId'] as string;
      issueUrl = `${this.baseUrl}/browse/${issueKey}`;

      await this.jiraClient.updateIssue(issueKey, fields);

      // Update acceptance criteria if any
      if (acceptanceCriteria.length > 0) {
        const acWiki = formatAsJiraWiki(acceptanceCriteria);
        await this.jiraClient.updateIssue(issueKey, {
          [ACCEPTANCE_CRITERIA_FIELD_ID]: acWiki,
        });
      }

      // Update exportedDate in local file
      await this.updateLocalFileAfterUpdate(filePath);
    }

    return {
      success: true,
      mode,
      issueKey,
      issueUrl,
      criteriaCount: acceptanceCriteria.length,
      filePath,
    };
  }

  /**
   * Batch export multiple tickets
   *
   * Exports tickets sequentially with optional delay between requests.
   * Continues processing even if individual exports fail.
   *
   * @param filePaths - Array of file paths to export
   * @param options - Export options (dryRun, delayMs)
   * @returns Array of export results
   */
  async batchExport(filePaths: string[], options: ExportOptions = {}): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    const delayMs = options.delayMs || 0;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];

      try {
        const result = await this.exportTicket(filePath, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          mode: ExportMode.CREATE, // Default, actual mode may differ
          filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Add delay between requests (except after last one)
      if (delayMs > 0 && i < filePaths.length - 1) {
        await this.sleep(delayMs);
      }
    }

    return results;
  }

  /**
   * Validate frontmatter for mode-specific requirements
   *
   * @param frontmatter - Parsed frontmatter data
   * @param mode - Export mode
   * @throws Error if validation fails
   */
  private validateForMode(frontmatter: Record<string, unknown>, mode: ExportMode): void {
    if (mode === ExportMode.CREATE) {
      // CREATE mode requires documentType
      if (!frontmatter.documentType) {
        throw new Error(
          'CREATE mode: Missing required field "documentType" (must be story/task/bug/spike/epic)'
        );
      }

      const validTypes = ['story', 'task', 'bug', 'spike', 'epic'];
      const docType = String(frontmatter.documentType).toLowerCase();
      if (!validTypes.includes(docType)) {
        throw new Error(
          `CREATE mode: Invalid documentType "${String(frontmatter.documentType)}" (must be ${validTypes.join('/')})`
        );
      }
    } else if (mode === ExportMode.UPDATE) {
      // UPDATE mode requires valid jira-ticketId
      const ticketId = frontmatter['jira-ticketId'];

      if (!ticketId || ticketId === '' || ticketId === 'null') {
        throw new Error(
          'UPDATE mode: Missing or null "jira-ticketId" - use forceCreate to create new ticket'
        );
      }

      // Validate ticket ID format (PROJECT-NNNN)
      if (!/^[A-Z]+-\d+$/.test(String(ticketId))) {
        throw new Error(
          `UPDATE mode: Invalid ticket ID format "${String(ticketId)}" (expected: PROJECT-NNNN like DAPM-1234)`
        );
      }
    }
  }

  /**
   * Update local file with Jira metadata after CREATE
   *
   * @param filePath - Path to file
   * @param issueKey - Jira issue key
   * @param issueUrl - Jira issue URL
   */
  private async updateLocalFileAfterCreate(
    filePath: string,
    issueKey: string,
    issueUrl: string
  ): Promise<void> {
    const exportDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await updateFrontmatter(filePath, {
      'jira-ticketId': issueKey,
      'jira-url': issueUrl,
      exportedDate: exportDate,
    });
  }

  /**
   * Update local file with exportedDate after UPDATE
   *
   * @param filePath - Path to file
   */
  private async updateLocalFileAfterUpdate(filePath: string): Promise<void> {
    const exportDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await updateFrontmatter(filePath, {
      exportedDate: exportDate,
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
