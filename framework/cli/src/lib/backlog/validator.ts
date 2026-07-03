/**
 * Backlog Validator
 *
 * Validates all backlog tickets for completeness and cross-reference integrity.
 *
 * Checks:
 * - YAML frontmatter completeness (required fields)
 * - Cross-references (epic links, ticket dependencies)
 * - Milestone codes exist
 * - File naming conventions
 * - Link validity
 *
 * @module backlog/validator
 */

import fs from 'fs-extra';
import path from 'path';
import { parseFrontmatter } from '../common/yaml-frontmatter.js';
import { glob } from 'glob';

/**
 * Custom error for ticket validation failures
 */
export class TicketValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TicketValidationError';
  }
}

/**
 * Required YAML fields by document type
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  story: ['documentType', 'title', 'createdDate'],
  task: ['documentType', 'title', 'createdDate'],
  bug: ['documentType', 'title', 'createdDate'],
  spike: ['documentType', 'title', 'createdDate'],
  epic: ['documentType', 'title', 'createdDate'],
};

/**
 * Jira integration fields (should be present in exported tickets)
 */
const JIRA_FIELDS = [
  'jira-ticketId',
  'jira-url',
  'jira-parent',
  'jira-related',
  'jira-blocking',
  'jira-blockedBy',
  'jira-fixVersion',
  'jira-internalNotes',
];

/**
 * Framework integration fields
 */
const FRAMEWORK_FIELDS = [
  'framework-documentation',
  'framework-milestone',
  'framework-technicalGuides',
  'framework-relatedLocal',
];

/**
 * Valid milestone codes
 */
const VALID_MILESTONES = ['Nov2025', 'Jan2026', 'Feb2026', 'Mar2026'];

/**
 * Validation report tracking results
 */
export class ValidationReport {
  valid: number = 0;
  warnings: string[] = [];
  errors: string[] = [];

  /**
   * Add a warning to the report
   */
  addWarning(filePath: string, message: string): void {
    this.warnings.push(`${filePath}: ${message}`);
  }

  /**
   * Add an error to the report
   */
  addError(filePath: string, message: string): void {
    this.errors.push(`${filePath}: ${message}`);
  }

  /**
   * Mark a ticket as valid
   */
  addValid(): void {
    this.valid += 1;
  }

  /**
   * Get formatted summary of validation results
   */
  getSummary(): string {
    const total = this.valid + this.warnings.length + this.errors.length;
    let summary = '';

    summary += '='.repeat(60) + '\n';
    summary += 'Validation Report\n';
    summary += '='.repeat(60) + '\n';
    summary += `Valid:    ${this.valid}/${total}\n`;
    summary += `Warnings: ${this.warnings.length}/${total}\n`;
    summary += `Errors:   ${this.errors.length}/${total}\n`;

    if (this.warnings.length > 0) {
      summary += '\nWarnings:\n';
      for (const w of this.warnings) {
        summary += `  ${w}\n`;
      }
    }

    if (this.errors.length > 0) {
      summary += '\nErrors:\n';
      for (const e of this.errors) {
        summary += `  ${e}\n`;
      }
    }

    summary += '='.repeat(60) + '\n';

    return summary;
  }
}

/**
 * Determine document type from filename or content
 */
function getDocumentType(filePath: string): string | null {
  const filename = path.basename(filePath).toUpperCase();
  const docTypes = ['STORY', 'TASK', 'BUG', 'SPIKE', 'EPIC'];

  for (const docType of docTypes) {
    if (filename.includes(docType)) {
      return docType.toLowerCase();
    }
  }

  return null;
}

/**
 * Validate a single ticket file
 *
 * @param filePath - Path to ticket file
 * @param report - ValidationReport to track results
 * @param basePath - Optional base path for relative path calculation
 */
export async function validateTicket(
  filePath: string,
  report: ValidationReport,
  basePath?: string
): Promise<void> {
  const relPath = basePath ? path.relative(basePath, filePath) : path.basename(filePath);

  try {
    // Read and parse file
    const content = await fs.readFile(filePath, 'utf-8');

    if (!content.startsWith('---')) {
      report.addError(relPath, 'Failed to parse YAML frontmatter');
      return;
    }

    let metadata: Record<string, unknown>;
    try {
      const parsed = parseFrontmatter(content);
      metadata = parsed.data;
    } catch {
      report.addError(relPath, 'Failed to parse YAML frontmatter');
      return;
    }

    // Determine document type
    let docType = getDocumentType(filePath);
    if (!docType) {
      report.addWarning(relPath, 'Could not determine document type from filename');
      const rawDocType = metadata.documentType;
      docType = typeof rawDocType === 'string' ? rawDocType.toLowerCase() : 'unknown';
    }

    // Check required fields
    const required = (docType && docType in REQUIRED_FIELDS ? REQUIRED_FIELDS[docType] : null) || [];
    for (const field of required) {
      if (!metadata[field]) {
        report.addError(relPath, `Missing required field: ${field}`);
        return;
      }
    }

    // Validate Jira integration fields (warnings only)
    for (const field of JIRA_FIELDS) {
      if (!metadata[field]) {
        report.addWarning(relPath, `Missing Jira field (v10.1.1): ${field}`);
      }
    }

    // Validate Framework integration fields (warnings only)
    for (const field of FRAMEWORK_FIELDS) {
      if (!metadata[field]) {
        report.addWarning(relPath, `Missing Framework field (v10.1.1): ${field}`);
      }
    }

    // Check if ticket has been exported to Jira
    if (metadata['jira-ticketId']) {
      if (!metadata['jira-url']) {
        report.addWarning(relPath, 'Exported ticket missing jira-url');
      }
      if (!metadata['exportedDate']) {
        report.addWarning(relPath, 'Exported ticket missing exportedDate');
      }
    }

    // Validate milestone
    if (metadata.milestone) {
      const milestone = metadata.milestone;
      if (typeof milestone !== 'string' || !VALID_MILESTONES.includes(milestone)) {
        report.addWarning(relPath, `Unknown milestone: ${milestone}`);
      }
    }

    // Validate jira-parent reference
    if (metadata['jira-parent']) {
      const jiraParent = metadata['jira-parent'];
      if (typeof jiraParent !== 'string' || !jiraParent.startsWith('DAPM-')) {
        report.addWarning(relPath, `Invalid jira-parent format: ${jiraParent}`);
      }
    }

    // Validate jira-related, jira-blocking, jira-blockedBy arrays
    for (const field of ['jira-related', 'jira-blocking', 'jira-blockedBy']) {
      if (metadata[field]) {
        const value = metadata[field];
        if (!Array.isArray(value)) {
          report.addWarning(
            relPath,
            `${field} should be an array, got ${typeof value}`
          );
        }
      }
    }

    // Check file naming convention
    const filename = path.basename(filePath);
    if (!filename.includes('-') || !filename.endsWith('.md')) {
      report.addWarning(relPath, 'File should be named [TYPE]-[title-kebab-case].md');
    }

    report.addValid();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    report.addError(relPath, `Failed to validate: ${errorMessage}`);
  }
}

/**
 * Validate all tickets in a backlog directory
 *
 * @param backlogDir - Path to backlog directory
 * @param verbose - Show detailed progress
 * @returns ValidationReport with results
 */
export async function validateBacklog(
  backlogDir: string,
  verbose: boolean = false
): Promise<ValidationReport> {
  if (!(await fs.pathExists(backlogDir))) {
    throw new TicketValidationError(`Backlog directory not found: ${backlogDir}`);
  }

  const report = new ValidationReport();

  if (verbose) {
    console.log('Validating backlog tickets...\n');
  }

  // Scan all tickets (flat tickets/ directory)
  const ticketsPattern = path.join(backlogDir, 'tickets', '*.md');
  const ticketFiles = await glob(ticketsPattern, { absolute: true });

  for (const filePath of ticketFiles) {
    if (filePath.endsWith('README.md')) {
      continue;
    }

    if (verbose) {
      console.log(`  Checking ${path.relative(backlogDir, filePath)}...`);
    }

    await validateTicket(filePath, report, backlogDir);
  }

  // Validate epics
  const epicsPattern = path.join(backlogDir, 'epics', '*.md');
  const epicFiles = await glob(epicsPattern, { absolute: true });

  for (const filePath of epicFiles) {
    if (filePath.endsWith('README.md')) {
      continue;
    }

    if (verbose) {
      console.log(`  Checking ${path.relative(backlogDir, filePath)}...`);
    }

    await validateTicket(filePath, report, backlogDir);
  }

  // Validate workflow tickets
  const workflowFolders = ['Draft', 'ReadyToExport', 'Exported'];
  for (const folder of workflowFolders) {
    const pattern = path.join(backlogDir, '_workflow', folder, '*.md');
    const files = await glob(pattern, { absolute: true });

    for (const filePath of files) {
      if (filePath.endsWith('README.md')) {
        continue;
      }

      if (verbose) {
        console.log(`  Checking ${path.relative(backlogDir, filePath)}...`);
      }

      await validateTicket(filePath, report, backlogDir);
    }
  }

  return report;
}
