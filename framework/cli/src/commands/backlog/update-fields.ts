/**
 * Backlog Update Fields Command
 *
 * CLI command for bulk updating frontmatter fields in markdown files.
 * Supports removing, adding, and updating fields with dry-run mode.
 *
 * Usage:
 *   agentic-framework backlog update-fields [options]
 *
 * Examples:
 *   # Remove milestone field from all tickets (dry run)
 *   agentic-framework backlog update-fields --remove milestone --pattern "backlog/tickets/**\/*.md" --dry-run
 *
 *   # Remove milestone field and apply changes
 *   agentic-framework backlog update-fields --remove milestone --pattern "backlog/tickets/**\/*.md"
 *
 *   # Add status field to all tickets
 *   agentic-framework backlog update-fields --add status=active --pattern "backlog/tickets/**\/*.md"
 *
 *   # Multiple operations
 *   agentic-framework backlog update-fields \
 *     --remove milestone \
 *     --add status=active \
 *     --update version=2.0 \
 *     --pattern "backlog/**\/*.md"
 *
 * @module commands/backlog/update-fields
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import {
  bulkUpdateFiles,
  findFiles,
  FieldOperations,
  BulkUpdateResults,
} from '../../lib/backlog/field-updater.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

/**
 * Create the update-fields command.
 *
 * @returns Commander command instance
 */
export function createUpdateFieldsCommand(): Command {
  const command = new Command('update-fields');

  command
    .description('Bulk update frontmatter fields in markdown files')
    .option('-r, --remove <fields>', 'Comma-separated list of fields to remove', parseCommaSeparated)
    .option('-a, --add <field=value>', 'Add field with value (format: field=value)', collect, [])
    .option('-u, --update <field=value>', 'Update field with value (format: field=value)', collect, [])
    .option('-p, --pattern <pattern>', 'Glob pattern for files to update', 'backlog/**/*.md')
    .option('--dry-run', 'Preview changes without modifying files', false)
    .option('-v, --verbose', 'Show detailed progress', false)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (cmdOptions: unknown) => {
      try {
        await runUpdateFieldsCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}\n`);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Parse comma-separated string into array
 *
 * @param value - Comma-separated string
 * @returns Array of strings
 */
function parseCommaSeparated(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Collect multiple values into array
 *
 * @param value - Value to add
 * @param previous - Previous values
 * @returns Updated array
 */
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

/**
 * Parse field=value pairs into object
 *
 * @param pairs - Array of "field=value" strings
 * @returns Object with field-value mappings
 */
function parseFieldValuePairs(pairs: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const pair of pairs) {
    const [field, ...valueParts] = pair.split('=');
    if (!field || valueParts.length === 0) {
      throw new Error(`Invalid field=value format: ${pair}`);
    }

    const valueStr = valueParts.join('='); // Handle values with = in them

    // Try to parse as JSON for complex values
    let value: unknown = valueStr;
    try {
      value = JSON.parse(valueStr);
    } catch {
      // If not valid JSON, use as string
      // Special handling for null/undefined
      if (valueStr === 'null') value = null;
      else if (valueStr === 'undefined') value = undefined;
    }

    result[field] = value;
  }

  return result;
}

/**
 * Command options interface
 */
interface UpdateFieldsCommandOptions {
  remove?: string[];
  add: string[];
  update: string[];
  pattern: string;
  dryRun: boolean;
  verbose: boolean;
  cwd: string;
}

/**
 * Run the update-fields command.
 *
 * @param cmdOptions - Command options
 */
async function runUpdateFieldsCommand(cmdOptions: unknown): Promise<void> {
  const startTime = Date.now();
  const {
    remove,
    add,
    update,
    pattern,
    dryRun,
    verbose,
    cwd,
  } = cmdOptions as UpdateFieldsCommandOptions;

  // Validate that at least one operation is specified
  if (!remove && add.length === 0 && update.length === 0) {
    throw new Error('At least one operation (--remove, --add, or --update) must be specified');
  }

  // Resolve working directory
  const resolvedCwd = path.resolve(cwd);
  if (!(await fs.pathExists(resolvedCwd))) {
    throw new Error(`Working directory does not exist: ${cwd}`);
  }

  // Build field operations
  const operations: FieldOperations = {};

  if (remove) {
    operations.remove = remove;
  }

  if (add.length > 0) {
    operations.add = parseFieldValuePairs(add);
  }

  if (update.length > 0) {
    operations.update = parseFieldValuePairs(update);
  }

  // Print header
  console.log('');
  console.log('='.repeat(80));
  console.log('Bulk Field Update');
  console.log('='.repeat(80));
  console.log('');
  console.log('Configuration:');
  console.log(`  Working Directory: ${resolvedCwd}`);
  console.log(`  File Pattern:      ${pattern}`);
  console.log(`  Dry Run:           ${dryRun ? 'YES' : 'NO'}`);
  console.log(`  Verbose:           ${verbose ? 'YES' : 'NO'}`);
  console.log('');
  console.log('Operations:');
  if (operations.remove) {
    console.log(`  Remove fields:     ${operations.remove.join(', ')}`);
  }
  if (operations.add) {
    console.log(`  Add fields:        ${Object.keys(operations.add).join(', ')}`);
  }
  if (operations.update) {
    console.log(`  Update fields:     ${Object.keys(operations.update).join(', ')}`);
  }
  console.log('');

  // Find files
  if (verbose) {
    console.log(`Searching for files matching: ${pattern}`);
  }

  const files = await findFiles(pattern, resolvedCwd);

  if (files.length === 0) {
    console.log('No files found matching pattern.\n');
    return;
  }

  console.log(`Found ${files.length} file(s) to process.\n`);

  // Process files
  console.log('Processing files...\n');

  const results = await bulkUpdateFiles(files, operations, {
    dryRun,
    verbose,
  });

  // Print results
  printResults(results, resolvedCwd, dryRun, verbose);

  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'backlog',
    'update-fields',
    { pattern, dry_run: dryRun },
    { tickets_updated: results.modifiedFiles },
    durationMs,
    results.errors.length === 0
  ).catch(() => {});

  // Exit with error code if there were errors
  if (results.errors.length > 0) {
    process.exit(1);
  }
}

/**
 * Print results summary
 *
 * @param results - Bulk update results
 * @param basePath - Base path for relative file paths
 * @param dryRun - Whether this was a dry run
 * @param verbose - Whether to show detailed output
 */
function printResults(
  results: BulkUpdateResults,
  basePath: string,
  dryRun: boolean,
  verbose: boolean
): void {
  // Print detailed changes if verbose
  if (verbose) {
    console.log('Changes:');
    console.log('');

    for (const change of results.changes) {
      const relPath = path.relative(basePath, change.file);
      const status = change.error
        ? '❌ ERROR'
        : change.modified
        ? dryRun
          ? '[DRY RUN]'
          : '✅'
        : '⏭️  SKIP';

      console.log(`${status} ${relPath}`);

      if (change.modified && change.operations.length > 0) {
        for (const op of change.operations) {
          console.log(`    - ${op}`);
        }
      }

      if (change.error) {
        console.log(`    Error: ${change.error}`);
      }
    }

    console.log('');
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log('');
  console.log(`  Total files:     ${results.totalFiles}`);
  console.log(`  Modified:        ${results.modifiedFiles}`);
  console.log(`  Skipped:         ${results.skippedFiles}`);
  console.log(`  Errors:          ${results.errors.length}`);
  console.log('');

  if (dryRun && results.modifiedFiles > 0) {
    console.log('[DRY RUN] No files were modified.');
    console.log('Remove --dry-run flag to apply changes.\n');
  } else if (results.modifiedFiles > 0) {
    console.log(`✅ Successfully updated ${results.modifiedFiles} file(s).\n`);
  } else if (results.errors.length === 0) {
    console.log('✅ No changes needed.\n');
  }

  // Print errors
  if (results.errors.length > 0) {
    console.log('Errors encountered:');
    for (const error of results.errors) {
      console.log(`  ❌ ${error}`);
    }
    console.log('');
  }
}
