/**
 * Import Engine Module
 *
 * Main orchestration module for Jira CSV imports.
 * Coordinates CSV extraction, ticket processing, and import strategies.
 *
 * Features:
 * - Auto-detection of sprints and milestones from CSV
 * - Simplified interface (no required sprintId/milestoneId)
 * - Progress tracking and reporting
 * - Dry-run mode for validation
 * - Verbose logging
 * - Summary generation
 *
 * @module import-engine
 */

import path from 'path';
import { parseCsvFile } from './csv-extractor.js';
import { executeImportStrategy, DuplicateMode, ImportMode } from './import-strategies.js';

/**
 * Import options for CSV import
 */
export interface ImportOptions {
  /** Path to CSV file */
  csvPath: string;
  /** Duplicate handling mode (default: force/overwrite) */
  duplicateMode: DuplicateMode;
  /** Base path to backlog directory */
  basePath: string;
  /** Dry run mode - validate only, don't write files */
  dryRun?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Override sprint for all tickets (useful when Jira CSV has empty Sprint column for completed tickets) */
  sprintOverride?: string;
  /** Progress callback for tracking import progress */
  onProgress?: (message: string) => void;
}

/**
 * Import summary with statistics and details
 */
export interface ImportSummary {
  /** Total number of tickets processed */
  total: number;
  /** Number of tickets created */
  created: number;
  /** Number of tickets updated */
  updated: number;
  /** Number of tickets skipped */
  skipped: number;
  /** Number of epics processed */
  epics: number;
  /** Number of errors encountered */
  errors: number;
  /** Import duration in milliseconds */
  duration: number;
  /** List of sprints detected */
  sprints: string[];
  /** List of milestones detected */
  milestones: string[];
  /** Detailed results */
  details: {
    /** List of created ticket filenames */
    created: string[];
    /** List of updated ticket filenames */
    updated: string[];
    /** List of skipped ticket filenames */
    skipped: string[];
    /** List of epic filenames */
    epics: string[];
    /** List of errors with ticket and error message */
    errors: Array<{ ticket: string; error: string }>;
  };
}

/**
 * Import tickets from CSV file.
 *
 * Main entry point for CSV imports. Coordinates the full import workflow:
 * 1. Parse CSV file
 * 2. Auto-detect sprints and milestones
 * 3. Execute import (flat tickets, epics, sprint/milestone indexes)
 * 4. Return summary report
 *
 * @param options - Import options
 * @returns Import summary with statistics
 * @throws {Error} If CSV file not found or invalid
 *
 * @example
 * ```typescript
 * const summary = await importFromCsv({
 *   csvPath: 'jira-export.csv',
 *   duplicateMode: 'force',  // overwrite existing
 *   basePath: './backlog',
 *   verbose: true,
 *   onProgress: (msg) => console.log(msg)
 * });
 *
 * console.log(`Created: ${summary.created}, Epics: ${summary.epics}`);
 * console.log(`Sprints: ${summary.sprints.join(', ')}`);
 * ```
 */
export async function importFromCsv(options: ImportOptions): Promise<ImportSummary> {
  const startTime = Date.now();

  // Validate options
  validateImportOptions(options);

  const {
    csvPath,
    duplicateMode,
    basePath,
    dryRun = false,
    verbose = false,
    sprintOverride,
    onProgress,
  } = options;

  // Progress helper
  const progress = (message: string) => {
    if (onProgress) {
      onProgress(message);
    }
  };

  // Step 1: Parse CSV file
  progress(`Parsing CSV file: ${path.basename(csvPath)}`);
  const extractionResult = await parseCsvFile(csvPath);

  if (extractionResult.errors.length > 0) {
    progress(`CSV parsing completed with ${extractionResult.errors.length} errors`);
  }

  const tickets = extractionResult.tickets;

  // Normalize double spaces in Jira field values (common Jira data quality issue)
  for (const ticket of tickets) {
    if (ticket.summary) ticket.summary = ticket.summary.replace(/\s{2,}/g, ' ');
    if (ticket.fixVersions) ticket.fixVersions = ticket.fixVersions.replace(/\s{2,}/g, ' ');
    if (ticket.milestone) ticket.milestone = ticket.milestone.replace(/\s{2,}/g, ' ');
    if (ticket.sprint) ticket.sprint = ticket.sprint.replace(/\s{2,}/g, ' ');
  }

  // Apply sprint override if provided (handles Jira CSV quirk where completed tickets lose Sprint field)
  if (sprintOverride) {
    for (const ticket of tickets) {
      if (!ticket.sprint) {
        ticket.sprint = sprintOverride;
      }
    }
    if (verbose) {
      progress(`  Sprint override: assigned ${tickets.filter(t => t.sprint === sprintOverride).length} tickets to ${sprintOverride}`);
    }
  } else {
    // Fallback: auto-detect sprint from CSV filename when most tickets lack a sprint
    const ticketsWithoutSprint = tickets.filter(t => !t.sprint);
    if (ticketsWithoutSprint.length > tickets.length / 2) {
      const detectedSprint = detectSprintFromFilename(path.basename(csvPath));
      if (detectedSprint) {
        for (const ticket of ticketsWithoutSprint) {
          ticket.sprint = detectedSprint;
        }
        if (verbose) {
          progress(`  Sprint auto-detected from filename: "${detectedSprint}" (assigned to ${ticketsWithoutSprint.length} tickets)`);
        }
      }
    }
  }

  // Strip project-wide labels (labels that appear on ALL tickets provide zero filtering value)
  if (tickets.length > 1) {
    const ticketsWithLabels = tickets.filter(t => t.labels && t.labels.length > 0);
    if (ticketsWithLabels.length > 0) {
      // Find labels present on every ticket that has labels
      const labelCounts = new Map<string, number>();
      for (const t of ticketsWithLabels) {
        for (const l of t.labels!) {
          labelCounts.set(l, (labelCounts.get(l) || 0) + 1);
        }
      }
      const universalLabels = [...labelCounts.entries()]
        .filter(([, count]) => count === ticketsWithLabels.length)
        .map(([label]) => label);

      if (universalLabels.length > 0) {
        for (const ticket of tickets) {
          if (ticket.labels) {
            ticket.labels = ticket.labels.filter(l => !universalLabels.includes(l));
            if (ticket.labels.length === 0) {
              ticket.labels = undefined;
            }
          }
        }
        if (verbose) {
          progress(`  Stripped universal labels: ${universalLabels.join(', ')}`);
        }
      }
    }
  }

  progress(`Parsed ${tickets.length} tickets from CSV`);

  // Count ticket types
  const epics = tickets.filter(t => t.documentType === 'epic');
  const stories = tickets.filter(t => t.documentType === 'story');
  const tasks = tickets.filter(t => t.documentType === 'task');
  const bugs = tickets.filter(t => t.documentType === 'bug');
  const spikes = tickets.filter(t => t.documentType === 'spike');

  if (verbose) {
    progress(`  Epics: ${epics.length}`);
    progress(`  Stories: ${stories.length}`);
    progress(`  Tasks: ${tasks.length}`);
    progress(`  Bugs: ${bugs.length}`);
    progress(`  Spikes: ${spikes.length}`);
  }

  if (verbose && extractionResult.warnings.length > 0) {
    progress(`Warnings: ${extractionResult.warnings.length}`);
    extractionResult.warnings.slice(0, 5).forEach(({ row, warning }) => {
      progress(`  Row ${row}: ${warning}`);
    });
    if (extractionResult.warnings.length > 5) {
      progress(`  ... and ${extractionResult.warnings.length - 5} more warnings`);
    }
  }

  // Step 2: Execute import strategy with auto-detection
  progress(`Importing tickets (mode: ${duplicateMode})`);

  const strategyOptions = {
    mode: 'auto' as ImportMode,
    duplicateMode,
    basePath,
    dryRun,
    verbose,
  };

  const strategyResult = await executeImportStrategy(tickets, strategyOptions);

  // Step 3: Combine results with CSV parsing errors
  const allErrors = [
    ...extractionResult.errors.map(({ row, error }) => ({
      ticket: `Row ${row}`,
      error,
    })),
    ...strategyResult.errors,
  ];

  // Step 4: Generate summary
  const duration = Date.now() - startTime;
  const summary: ImportSummary = {
    total: tickets.length + extractionResult.errors.length,
    created: strategyResult.created.length,
    updated: strategyResult.updated.length,
    skipped: strategyResult.skipped.length,
    epics: strategyResult.epics.length,
    errors: allErrors.length,
    duration,
    sprints: strategyResult.sprints,
    milestones: strategyResult.milestones,
    details: {
      created: strategyResult.created,
      updated: strategyResult.updated,
      skipped: strategyResult.skipped,
      epics: strategyResult.epics,
      errors: allErrors,
    },
  };

  // Step 5: Report summary
  if (verbose) {
    progress('');
    progress('Import Summary:');
    progress(`  Total:     ${summary.total} tickets`);
    progress(`  Created:   ${summary.created}`);
    progress(`  Updated:   ${summary.updated}`);
    progress(`  Skipped:   ${summary.skipped}`);
    progress(`  Epics:     ${summary.epics}`);
    progress(`  Sprints:   ${summary.sprints.length} detected`);
    progress(`  Milestones: ${summary.milestones.length} detected`);
    progress(`  Errors:    ${summary.errors}`);
    progress(`  Duration:  ${duration}ms`);

    if (dryRun) {
      progress('');
      progress('[DRY RUN] No files were created or modified');
    }
  }

  return summary;
}

/**
 * Validate import options.
 *
 * @param options - Import options to validate
 * @throws {Error} If options are invalid
 */
function validateImportOptions(options: ImportOptions): void {
  const { csvPath } = options;

  if (!csvPath) {
    throw new Error('csvPath is required');
  }

  if (!options.basePath) {
    throw new Error('basePath is required');
  }

  if (!options.duplicateMode) {
    throw new Error('duplicateMode is required');
  }

  const validModes = ['error', 'skip', 'force'];
  if (!validModes.includes(options.duplicateMode)) {
    throw new Error(`Invalid duplicateMode: ${options.duplicateMode}. Must be one of: ${validModes.join(', ')}`);
  }
}

/**
 * Detect sprint name from CSV filename.
 *
 * Supports common Jira export filename patterns:
 * - `apm-r-app-backlog-apr-sprint-APMR-APP-2026W11.csv` -> `APMR-APP-2026W11`
 * - `sprint-2026-W12.csv` -> `2026-W12`
 * - `PROJ-Sprint-Name.csv` -> `Sprint-Name`
 *
 * @param filename - CSV filename (basename, not full path)
 * @returns Detected sprint name, or null if no pattern matched
 */
export function detectSprintFromFilename(filename: string): string | null {
  // Strip extension
  const name = filename.replace(/\.csv$/i, '');

  // Pattern 1: ...-sprint-SPRINTID (e.g., apm-r-app-backlog-apr-sprint-APMR-APP-2026W11)
  const sprintSuffixMatch = name.match(/[-_]sprint[-_](.+)$/i);
  if (sprintSuffixMatch) {
    return sprintSuffixMatch[1];
  }

  // Pattern 2: sprint-SPRINTID (starts with "sprint-", e.g., sprint-2026-W12)
  const sprintPrefixMatch = name.match(/^sprint[-_](.+)$/i);
  if (sprintPrefixMatch) {
    return sprintPrefixMatch[1];
  }

  // Pattern 3: PROJ-Sprint-Name (e.g., PROJ-Sprint-Name, where PROJ is a Jira project key)
  const projSprintMatch = name.match(/^[A-Z][\w]*[-_](Sprint[-_].+)$/i);
  if (projSprintMatch) {
    return projSprintMatch[1];
  }

  return null;
}

/**
 * Format import summary as human-readable text.
 *
 * @param summary - Import summary
 * @param options - Import options (for context)
 * @returns Formatted summary text
 */
export function formatImportSummary(summary: ImportSummary, options: ImportOptions): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('='.repeat(80));
  lines.push('Import Summary');
  lines.push('='.repeat(80));
  lines.push('');

  // Import info
  lines.push('Import Info:');
  lines.push(`  CSV File: ${path.basename(options.csvPath)}`);
  lines.push(`  Mode:     ${options.duplicateMode} (${options.duplicateMode === 'force' ? 'overwrite existing' : options.duplicateMode === 'skip' ? 'skip existing' : 'error on duplicates'})`);
  if (options.dryRun) {
    lines.push(`  Dry Run:  YES`);
  }
  lines.push('');

  // Statistics
  lines.push('Statistics:');
  lines.push(`  Total tickets:  ${summary.total}`);
  lines.push(`  Created:        ${summary.created}`);
  lines.push(`  Updated:        ${summary.updated}`);
  lines.push(`  Skipped:        ${summary.skipped}`);
  lines.push(`  Epics:          ${summary.epics}`);
  lines.push(`  Errors:         ${summary.errors}`);
  lines.push(`  Duration:       ${(summary.duration / 1000).toFixed(2)}s`);
  lines.push('');

  // Sprints and Milestones
  if (summary.sprints.length > 0) {
    lines.push(`Sprints detected (${summary.sprints.length}):`);
    summary.sprints.slice(0, 10).forEach(s => lines.push(`  - ${s}`));
    if (summary.sprints.length > 10) {
      lines.push(`  ... and ${summary.sprints.length - 10} more`);
    }
    lines.push('');
  }

  if (summary.milestones.length > 0) {
    lines.push(`Milestones detected (${summary.milestones.length}):`);
    summary.milestones.slice(0, 10).forEach(m => lines.push(`  - ${m}`));
    if (summary.milestones.length > 10) {
      lines.push(`  ... and ${summary.milestones.length - 10} more`);
    }
    lines.push('');
  }

  // Errors
  if (summary.errors > 0) {
    lines.push('Errors:');
    summary.details.errors.slice(0, 10).forEach(({ ticket, error }) => {
      lines.push(`  ${ticket}: ${error}`);
    });
    if (summary.details.errors.length > 10) {
      lines.push(`  ... and ${summary.details.errors.length - 10} more errors`);
    }
    lines.push('');
  }

  // Next steps
  if (!options.dryRun && summary.created > 0) {
    lines.push('Next Steps:');
    lines.push('  1. Review imported files:');
    lines.push(`     git diff ${options.basePath}/`);
    lines.push('  2. Verify correctness');
    lines.push('  3. Commit changes:');
    lines.push(`     git add ${options.basePath}/ && git commit -m "Import Jira tickets"`);
    lines.push('');
  }

  lines.push('='.repeat(80));

  return lines.join('\n');
}
