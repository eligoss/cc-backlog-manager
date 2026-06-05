/**
 * Enhanced Backlog Validate Command
 *
 * CLI command for validating backlog ticket files using the new validation framework.
 * Uses schema-validator and ticket-rules for comprehensive validation.
 *
 * Usage:
 *   agentic-framework backlog validate [path] [options]
 *
 * @module commands/backlog/validate-enhanced
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { glob } from 'glob';
import { parseFrontmatter } from '../../lib/common/yaml-frontmatter.js';
import { validateWithSchema } from '../../lib/validation/schema-validator.js';
import { validateTicketRules, validateTicketReferences, TicketData } from '../../lib/validation/rules/ticket-rules.js';
import {
  ValidationReport,
  createReport,
  formatReport,
  mergeReports,
} from '../../lib/validation/validation-report.js';
import { fileURLToPath } from 'url';
import { CliContext } from '../../lib/cli-context.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

// Use different variable names to avoid conflict with CommonJS globals in Jest
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

/**
 * Create the enhanced validate command.
 *
 * @returns Commander command instance
 */
export function createValidateEnhancedCommand(): Command {
  const command = new Command('validate');

  command
    .description('Validate backlog ticket files (enhanced validation)')
    .argument('[path]', 'Path to backlog directory', './backlog')
    .option('-v, --verbose', 'Show detailed progress and logging', false)
    .option('--schema-only', 'Only run JSON Schema validation', false)
    .option('--rules-only', 'Only run business rules validation', false)
    .action(async (backlogPath: string, cmdOptions: unknown) => {
      try {
        await runValidateEnhancedCommand(backlogPath, cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${errorMessage}\n`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Command options interface
 */
interface ValidateEnhancedCommandOptions {
  verbose: boolean;
  schemaOnly: boolean;
  rulesOnly: boolean;
}

/**
 * Run the enhanced validate command.
 *
 * @param backlogPath - Path to backlog directory
 * @param cmdOptions - Command options
 */
async function runValidateEnhancedCommand(
  backlogPath: string,
  cmdOptions: unknown
): Promise<void> {
  const startTime = Date.now();
  const { verbose, schemaOnly, rulesOnly } = cmdOptions as ValidateEnhancedCommandOptions;

  // Get CLI context for project detection
  const ctx = await CliContext.require();

  // Resolve backlog path:
  // - If explicit path provided (not default), use it as override
  // - Otherwise, fall back to the project's default backlog directory
  const isDefaultPath = backlogPath === './backlog';
  const resolvedPath = isDefaultPath
    ? path.join(ctx.projectRoot, 'ai/backlog')
    : path.resolve(backlogPath);

  // Check if backlog directory exists
  if (!(await fs.pathExists(resolvedPath))) {
    throw new Error(`Backlog directory not found: ${resolvedPath}`);
  }

  // Print header
  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Enhanced Backlog Validation'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');
  console.log(chalk.dim('Configuration:'));
  console.log(chalk.dim(`  Project Root:  ${ctx.projectRoot}`));
  console.log(chalk.dim(`  Backlog Path:  ${resolvedPath}`));
  console.log(chalk.dim(`  Verbose:       ${verbose ? 'YES' : 'NO'}`));
  console.log(chalk.dim(`  Schema Only:   ${schemaOnly ? 'YES' : 'NO'}`));
  console.log(chalk.dim(`  Rules Only:    ${rulesOnly ? 'YES' : 'NO'}`));
  console.log('');

  // Get schema path
  const schemaPath = resolveSchemaPath();
  if (verbose) {
    console.log(chalk.dim(`  Schema Path:   ${schemaPath}`));
    console.log('');
  }

  // Find all ticket files
  console.log(chalk.cyan('Finding ticket files...'));
  const ticketFiles = await findTicketFiles(resolvedPath);
  console.log(chalk.green(`✓ Found ${ticketFiles.length} ticket file(s)`));
  console.log('');

  if (ticketFiles.length === 0) {
    console.log(chalk.yellow('⚠ No ticket files found'));
    return;
  }

  // Validate each ticket
  console.log(chalk.cyan('Validating tickets...'));
  console.log('');

  const reports: ValidationReport[] = [];

  for (const filePath of ticketFiles) {
    const relPath = path.relative(resolvedPath, filePath);

    if (verbose) {
      console.log(chalk.dim(`  Validating: ${relPath}`));
    }

    const report = await validateTicketFile(filePath, schemaPath, {
      schemaOnly,
      rulesOnly,
      verbose,
    });

    reports.push(report);

    // Print issues immediately if verbose
    if (verbose && report.issues.length > 0) {
      console.log(chalk.yellow(`    Issues found:`));
      report.issues.forEach(issue => {
        const severity = issue.severity === 'error' ? chalk.red('ERROR') :
                        issue.severity === 'warning' ? chalk.yellow('WARN') :
                        chalk.blue('INFO');
        console.log(`      ${severity}: ${issue.message}`);
      });
    }
  }

  // Merge all reports
  const finalReport = mergeReports(...reports);

  // Print final report
  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Validation Summary'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');

  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'backlog',
    'validate-enhanced',
    { schema_only: schemaOnly, rules_only: rulesOnly, verbose },
    { valid: finalReport.valid, errors: finalReport.summary.errors },
    durationMs,
    finalReport.valid
  ).catch(() => {});

  if (finalReport.valid) {
    console.log(chalk.green('✓ All tickets are valid!'));
    console.log('');
    console.log(chalk.dim(`  Files validated: ${ticketFiles.length}`));
    console.log(chalk.dim(`  Errors:          0`));
    console.log(chalk.dim(`  Warnings:        ${finalReport.summary.warnings}`));
    console.log(chalk.dim(`  Info:            ${finalReport.summary.info}`));
    console.log('');
  } else {
    console.log(chalk.red('✗ Validation failed'));
    console.log('');
    console.log(chalk.dim(`  Files validated: ${ticketFiles.length}`));
    console.log(chalk.red(`  Errors:          ${finalReport.summary.errors}`));
    console.log(chalk.yellow(`  Warnings:        ${finalReport.summary.warnings}`));
    console.log(chalk.blue(`  Info:            ${finalReport.summary.info}`));
    console.log('');

    // Print detailed issues
    if (!verbose) {
      console.log(formatReport(finalReport));
      console.log('');
    }

    process.exit(1);
  }
}

/**
 * Validate a single ticket file
 *
 * @param filePath - Path to ticket file
 * @param schemaPath - Path to JSON Schema
 * @param options - Validation options
 * @returns Validation report
 */
async function validateTicketFile(
  filePath: string,
  schemaPath: string,
  options: {
    schemaOnly?: boolean;
    rulesOnly?: boolean;
    verbose?: boolean;
  }
): Promise<ValidationReport> {
  try {
    // Read file
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for frontmatter
    if (!content.startsWith('---')) {
      return createReport([
        {
          severity: 'error',
          code: 'NO_FRONTMATTER',
          message: 'File does not start with YAML frontmatter (---)',
          location: { file: filePath },
          suggestion: 'Add YAML frontmatter at the beginning of the file',
        },
      ]);
    }

    // Parse frontmatter
    let data: TicketData;
    try {
      const parsed = parseFrontmatter<TicketData>(content);
      data = parsed.data;
    } catch (error) {
      return createReport([
        {
          severity: 'error',
          code: 'FRONTMATTER_PARSE_ERROR',
          message: `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
          location: { file: filePath },
          suggestion: 'Check YAML syntax in frontmatter',
        },
      ]);
    }

    const allReports: ValidationReport[] = [];

    // Run schema validation
    if (!options.rulesOnly) {
      const schemaReport = await validateWithSchema(data, schemaPath);
      // Add file location to all issues
      schemaReport.issues = schemaReport.issues.map(issue => ({
        ...issue,
        location: issue.location || { file: filePath },
      }));
      allReports.push(schemaReport);
    }

    // Run business rules validation
    if (!options.schemaOnly) {
      const rulesIssues = validateTicketRules(data, content, filePath);
      const referencesIssues = validateTicketReferences(data, content, filePath);
      const rulesReport = createReport([...rulesIssues, ...referencesIssues]);
      allReports.push(rulesReport);
    }

    // Merge reports
    return mergeReports(...allReports);
  } catch (error) {
    return createReport([
      {
        severity: 'error',
        code: 'FILE_READ_ERROR',
        message: `Failed to read or validate file: ${error instanceof Error ? error.message : String(error)}`,
        location: { file: filePath },
      },
    ]);
  }
}

/**
 * Find all ticket files in backlog directory
 *
 * @param backlogDir - Path to backlog directory
 * @returns Array of absolute file paths
 */
async function findTicketFiles(backlogDir: string): Promise<string[]> {
  const patterns = [
    path.join(backlogDir, 'tickets', '**', '*.md'),
    path.join(backlogDir, 'epics', '*.md'),
    path.join(backlogDir, '_workflow', '**', '*.md'),
  ];

  const allFiles: string[] = [];

  for (const pattern of patterns) {
    const files = await glob(pattern, { absolute: true });
    allFiles.push(...files);
  }

  // Filter out README files
  return allFiles.filter(f => !f.endsWith('README.md'));
}

/**
 * Resolve the path to the ticket schema
 *
 * @returns Absolute path to ticket.schema.json
 */
function resolveSchemaPath(): string {
  // Try to find the schema file relative to this file
  // CLI structure: framework/cli/src/commands/backlog/validate-enhanced.ts
  // Schema location: framework/modules/backlog/schemas/ticket.schema.json

  const possiblePaths = [
    // From built CLI (framework/cli/dist/commands/backlog)
    path.resolve(currentDirPath, '../../../../modules/backlog/schemas/ticket.schema.json'),
    // From source CLI (framework/cli/src/commands/backlog)
    path.resolve(currentDirPath, '../../../../modules/backlog/schemas/ticket.schema.json'),
    // Relative to cwd
    path.resolve(process.cwd(), 'framework/modules/backlog/schemas/ticket.schema.json'),
    // If running from within framework directory
    path.resolve(process.cwd(), 'modules/backlog/schemas/ticket.schema.json'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(
    'Could not locate ticket.schema.json. Please ensure the backlog module is installed.'
  );
}
