/**
 * Backlog Import Jira Command
 *
 * CLI command for importing Jira tickets from CSV exports.
 * Simplified interface with auto-detection of sprints and milestones.
 *
 * Usage:
 *   agentic-framework backlog import <csv-file> [options]
 *
 * Options:
 *   --skip           Skip existing files (default: overwrite)
 *   --dry-run        Preview changes without writing files
 *   -v, --verbose    Show detailed progress and logging
 *   -p, --path       Base path to backlog directory (default: ./backlog)
 *
 * Structure created:
 *   backlog/
 *   ├── tickets/         # All ticket types (flat)
 *   ├── epics/           # Epic files
 *   ├── sprints/         # Sprint index files (auto-generated)
 *   └── milestones/      # Milestone index files (auto-generated)
 *
 * @module commands/backlog/import-jira
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { importFromCsv, formatImportSummary, ImportOptions } from '../../lib/backlog/import-engine.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import { DuplicateMode } from '../../lib/backlog/import-strategies.js';

/**
 * Create the import-jira command.
 *
 * @returns Commander command instance
 */
export function createImportJiraCommand(): Command {
  const command = new Command('import');

  command
    .description('Import Jira tickets from CSV export')
    .argument('<csv-file>', 'Path to Jira CSV export file')
    .option('--skip', 'Skip existing files instead of overwriting', false)
    .option('--dry-run', 'Preview changes without creating files', false)
    .option('-v, --verbose', 'Show detailed progress and logging', false)
    .option('-p, --path <path>', 'Base path to backlog directory', './backlog')
    .option('-s, --sprint <name>', 'Assign all tickets to this sprint (overrides CSV Sprint column)')
    .action(async (csvFile: string, cmdOptions: unknown) => {
      try {
        await runImportCommand(csvFile, cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}\n`);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Command options interface
 */
interface ImportCommandOptions {
  skip: boolean;
  dryRun: boolean;
  verbose: boolean;
  path: string;
  sprint?: string;
}

/**
 * Run the import command.
 *
 * @param csvFile - Path to CSV file
 * @param cmdOptions - Command options
 */
async function runImportCommand(csvFile: string, cmdOptions: unknown): Promise<void> {
  const startTime = Date.now();
  const {
    skip,
    dryRun,
    verbose,
    path: basePath,
    sprint,
  } = cmdOptions as ImportCommandOptions;

  // Validate CSV file exists
  const csvPath = path.resolve(csvFile);
  if (!(await fs.pathExists(csvPath))) {
    throw new Error(`CSV file not found: ${csvFile}`);
  }

  // Determine duplicate mode: skip or force (overwrite)
  const duplicateMode: DuplicateMode = skip ? 'skip' : 'force';

  // Resolve base path
  const resolvedBasePath = path.resolve(basePath);

  // Print header
  console.log('');
  console.log('='.repeat(80));
  console.log('Jira CSV Import');
  console.log('='.repeat(80));
  console.log('');
  console.log('Configuration:');
  console.log(`  CSV File:       ${path.basename(csvPath)}`);
  console.log(`  Base Path:      ${resolvedBasePath}`);
  console.log(`  Mode:           ${duplicateMode === 'force' ? 'Overwrite existing' : 'Skip existing'}`);
  console.log(`  Dry Run:        ${dryRun ? 'YES' : 'NO'}`);
  console.log(`  Verbose:        ${verbose ? 'YES' : 'NO'}`);
  if (sprint) {
    console.log(`  Sprint:         ${sprint} (override)`);
  }
  console.log('');
  console.log('Folder Structure:');
  console.log('  backlog/');
  console.log('  ├── tickets/         # All tickets (flat, type in YAML)');
  console.log('  ├── epics/           # Epic files');
  console.log('  ├── sprints/         # Sprint indexes (auto-generated)');
  console.log('  └── milestones/      # Milestone indexes (auto-generated)');
  console.log('');

  // Build import options
  const options: ImportOptions = {
    csvPath,
    duplicateMode,
    basePath: resolvedBasePath,
    dryRun,
    verbose,
    sprintOverride: sprint,
    onProgress: (message: string) => {
      console.log(message);
    },
  };

  // Run import
  console.log('Starting import...\n');
  const summary = await importFromCsv(options);

  // Print summary
  const summaryText = formatImportSummary(summary, options);
  console.log(summaryText);

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'backlog',
    'import',
    { duplicate_mode: duplicateMode, dry_run: dryRun },
    {
      tickets_created: summary.created,
      tickets_updated: summary.updated,
      tickets_skipped: summary.skipped,
      epics_created: summary.epics,
      sprints_detected: summary.sprints.length,
      milestones_detected: summary.milestones.length,
    },
    durationMs,
    summary.errors === 0
  ).catch(() => {});

  // Exit with error code if there were errors
  if (summary.errors > 0) {
    process.exit(1);
  }
}
