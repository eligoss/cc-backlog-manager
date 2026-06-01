/**
 * Planning Validate Plan Command
 *
 * CLI command for validating plan structure and content against schema and custom rules.
 *
 * Usage:
 *   agentic-framework planning validate-plan --path ./ai/plans/framework/001-my-plan
 *   agentic-framework planning validate-plan --path ./ai/plans --strict
 *
 * @module commands/planning/validate-plan
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { validateWithSchema } from '../../lib/validation/schema-validator.js';
import {
  formatReport,
  mergeReports,
  ValidationReport,
} from '../../lib/validation/validation-report.js';
import {
  validatePlanRules,
  validatePlanContent,
  PlanData,
} from '../../lib/validation/rules/plan-rules.js';
import chalk from 'chalk';
import { CliContext } from '../../lib/cli-context.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

// Use different variable names to avoid conflict with CommonJS globals in Jest
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

/**
 * Command options
 */
interface ValidatePlanOptions {
  path: string;
  strict: boolean;
}

/**
 * Create the validate-plan command.
 *
 * @returns Commander command instance
 */
export function createValidatePlanCommand(): Command {
  const command = new Command('validate-plan');

  command
    .description('Validate plan structure and content against schema and best practices')
    .option('-p, --path <path>', 'Path to plan file or folder (searches for PLAN.md files)', '.')
    .option('-s, --strict', 'Exit with error code on warnings (not just errors)', false)
    .action(async (cmdOptions: ValidatePlanOptions) => {
      try {
        await runValidatePlanCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${errorMessage}\n`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Run the validate-plan command.
 *
 * @param options - Command options
 */
async function runValidatePlanCommand(options: ValidatePlanOptions): Promise<void> {
  const startTime = Date.now();
  const { path: searchPath, strict } = options;

  // Use CliContext to get project root for schema resolution
  // Try to get context but don't require it - validation can work with explicit paths
  let projectRoot: string;
  try {
    const ctx = await CliContext.create();
    projectRoot = ctx.projectRoot;
  } catch {
    projectRoot = process.cwd();
  }

  // Resolve search path
  const resolvedPath = path.resolve(searchPath);

  // Check if path exists
  if (!(await fs.pathExists(resolvedPath))) {
    throw new Error(`Path does not exist: ${resolvedPath}`);
  }

  // Find PLAN.md files
  const planFiles = await findPlanFiles(resolvedPath);

  if (planFiles.length === 0) {
    console.log(chalk.yellow('\nNo PLAN.md files found in the specified path.\n'));
    process.exit(0);
  }

  console.log(chalk.blue(`\nFound ${planFiles.length} plan file(s) to validate...\n`));

  // Get schema path using project root from context
  const schemaPath = await getSchemaPath(projectRoot);
  if (!schemaPath) {
    throw new Error(
      'Plan schema not found. Expected at framework/modules/planning/schemas/plan.schema.json'
    );
  }

  // Validate each plan file
  const allReports: ValidationReport[] = [];

  for (const planFile of planFiles) {
    console.log(chalk.cyan(`Validating: ${path.relative(projectRoot, planFile)}`));

    const report = await validatePlanFile(planFile, schemaPath);
    allReports.push(report);
  }

  // Merge all reports
  const finalReport = mergeReports(...allReports);

  // Output results
  console.log('\n' + chalk.bold('='.repeat(60)));
  console.log(chalk.bold('Validation Results'));
  console.log(chalk.bold('='.repeat(60)) + '\n');

  // Determine validation result
  const hasErrors = finalReport.summary.errors > 0;
  const hasWarnings = finalReport.summary.warnings > 0;
  const isValid = finalReport.valid && finalReport.issues.length === 0;

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'planning',
    'validate-plan',
    { path: searchPath, strict },
    { valid: !hasErrors, errors: finalReport.summary.errors },
    durationMs,
    !hasErrors
  ).catch(() => {});

  if (isValid) {
    console.log(chalk.green('✓ All plans passed validation with no issues!\n'));
    process.exit(0);
  }

  // Format and display report
  const formattedReport = formatReport(finalReport);
  console.log(formattedReport);

  if (hasErrors) {
    console.log(chalk.red('\n✗ Validation failed with errors.\n'));
    process.exit(1);
  } else if (hasWarnings && strict) {
    console.log(chalk.yellow('\n⚠ Validation completed with warnings (strict mode enabled).\n'));
    process.exit(1);
  } else if (hasWarnings) {
    console.log(chalk.yellow('\n⚠ Validation completed with warnings.\n'));
    process.exit(0);
  } else {
    console.log(chalk.green('\n✓ Validation passed.\n'));
    process.exit(0);
  }
}

/**
 * Find all PLAN.md files in the given path
 *
 * @param searchPath - Path to search (file or directory)
 * @returns Array of PLAN.md file paths
 */
async function findPlanFiles(searchPath: string): Promise<string[]> {
  const stat = await fs.stat(searchPath);

  if (stat.isFile()) {
    // If it's a file, check if it's PLAN.md
    if (path.basename(searchPath) === 'PLAN.md') {
      return [searchPath];
    }
    throw new Error(`Specified file is not PLAN.md: ${searchPath}`);
  }

  // If it's a directory, search for all PLAN.md files
  const planFiles = await fg('**/PLAN.md', {
    cwd: searchPath,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  });

  return planFiles;
}

/**
 * Get path to plan schema file
 *
 * @param projectRoot - Project root path from CliContext
 * @returns Path to schema or null if not found
 */
async function getSchemaPath(projectRoot: string): Promise<string | null> {
  // Try to find schema relative to project root (from CliContext) first
  const possiblePaths = [
    // Primary: project root from CliContext
    path.join(projectRoot, 'framework/modules/planning/schemas/plan.schema.json'),
    // Fallback paths for different project structures
    path.join(projectRoot, '../modules/planning/schemas/plan.schema.json'),
    path.join(projectRoot, '../../modules/planning/schemas/plan.schema.json'),
    // For when running from installed package
    path.join(currentDirPath, '../../../framework/modules/planning/schemas/plan.schema.json'),
    path.join(currentDirPath, '../../../../modules/planning/schemas/plan.schema.json'),
  ];

  for (const schemaPath of possiblePaths) {
    if (await fs.pathExists(schemaPath)) {
      return schemaPath;
    }
  }

  return null;
}

/**
 * Normalize frontmatter data by converting Date objects to ISO date strings.
 * YAML parsers interpret unquoted dates like `2025-12-29` as Date objects,
 * but our schema expects strings. This function converts them to be user-friendly.
 *
 * @param data - Raw frontmatter data from YAML parser
 * @returns Normalized data with Date objects converted to strings
 */
function normalizeFrontmatter(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      // Convert Date to ISO date string (YYYY-MM-DD)
      result[key] = value.toISOString().split('T')[0];
    } else if (Array.isArray(value)) {
      // Recursively normalize array elements
      result[key] = value.map((item) =>
        item && typeof item === 'object' && !(item instanceof Date)
          ? normalizeFrontmatter(item as Record<string, unknown>)
          : item instanceof Date
            ? item.toISOString().split('T')[0]
            : item
      );
    } else if (value && typeof value === 'object') {
      // Recursively normalize nested objects
      result[key] = normalizeFrontmatter(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Validate a single plan file
 *
 * @param planFile - Path to PLAN.md file
 * @param schemaPath - Path to plan schema
 * @returns Validation report
 */
async function validatePlanFile(
  planFile: string,
  schemaPath: string
): Promise<ValidationReport> {
  try {
    // Read and parse the plan file
    const fileContent = await fs.readFile(planFile, 'utf-8');
    const parsed = matter(fileContent);

    // Normalize frontmatter: convert Date objects to ISO date strings
    // YAML parsers interpret unquoted dates like `2025-12-29` as Date objects
    const frontmatter = normalizeFrontmatter(parsed.data) as PlanData;
    const content = parsed.content;

    // Validate frontmatter against schema
    const schemaReport = await validateWithSchema(frontmatter, schemaPath);

    // Fix schema report locations: replace schema path with the actual plan file path
    schemaReport.issues = schemaReport.issues.map((issue) => ({
      ...issue,
      location: { file: planFile, ...(issue.location?.line ? { line: issue.location.line } : {}) },
    }));

    // Apply custom validation rules to frontmatter
    const rulesIssues = validatePlanRules(frontmatter, planFile);
    const rulesReport = {
      valid: rulesIssues.filter((i) => i.severity === 'error').length === 0,
      issues: rulesIssues,
      summary: {
        errors: rulesIssues.filter((i) => i.severity === 'error').length,
        warnings: rulesIssues.filter((i) => i.severity === 'warning').length,
        info: rulesIssues.filter((i) => i.severity === 'info').length,
      },
    };

    // Validate markdown content
    const contentIssues = validatePlanContent(content, planFile);
    const contentReport = {
      valid: contentIssues.filter((i) => i.severity === 'error').length === 0,
      issues: contentIssues,
      summary: {
        errors: contentIssues.filter((i) => i.severity === 'error').length,
        warnings: contentIssues.filter((i) => i.severity === 'warning').length,
        info: contentIssues.filter((i) => i.severity === 'info').length,
      },
    };

    // Merge all reports
    return mergeReports(schemaReport, rulesReport, contentReport);
  } catch (error) {
    // Return error report if file can't be read/parsed
    return {
      valid: false,
      issues: [
        {
          severity: 'error',
          code: 'FILE_READ_ERROR',
          message: `Failed to read or parse plan file: ${error instanceof Error ? error.message : String(error)}`,
          location: { file: planFile },
          suggestion: 'Ensure the file exists and contains valid YAML frontmatter',
        },
      ],
      summary: { errors: 1, warnings: 0, info: 0 },
    };
  }
}
