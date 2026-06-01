/**
 * Confluence Validate Command
 *
 * Validates markdown files for ADF conversion before publishing to Confluence.
 * Checks:
 * - YAML frontmatter validity
 * - Markdown syntax compatibility with ADF
 * - ADF structure after conversion
 * - Required fields for Confluence publishing
 *
 * Usage:
 *   agentic-framework confluence validate --path <file-or-directory>
 *   agentic-framework confluence validate --path docs/report.md
 *   agentic-framework confluence validate --path confluence/drafts/
 *
 * @module commands/confluence/validate
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { glob } from 'glob';
import { parseFrontmatter } from '../../lib/common/yaml-frontmatter.js';
import { markdownToAdf, AdfDocument } from '../../lib/confluence/adf-converter.js';
import {
  ValidationReport,
  createReport,
  formatReport,
  mergeReports,
  createError,
  createWarning,
} from '../../lib/validation/validation-report.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../../lib/cli-context.js';
import { getFrameworkRoot } from '../../lib/module-loader.js';
import AjvModule from 'ajv';

// Ajv is exported as both default and named export
const Ajv = AjvModule.default || AjvModule;

/**
 * Create the validate command
 */
export function createValidateConfluenceCommand(): Command {
  const command = new Command('validate');

  command
    .description('Validate Confluence page content before publishing')
    .option('-p, --path <path>', 'Path to markdown file or directory', '.')
    .option('-s, --strict', 'Exit with error code on warnings', false)
    .option('-v, --verbose', 'Show detailed validation information', false)
    .action(async (options) => {
      try {
        await runValidateCommand(options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${errorMessage}\n`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Run the validate command
 */
async function runValidateCommand(options: {
  path: string;
  strict?: boolean;
  verbose?: boolean;
}): Promise<void> {
  const startTime = Date.now();
  const { path: targetPath, strict, verbose } = options;

  // Resolve target path
  const resolvedPath = path.resolve(targetPath);

  // Check if path exists
  if (!(await fs.pathExists(resolvedPath))) {
    throw new Error(`Path not found: ${targetPath}`);
  }

  // Print header
  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Confluence Content Validation'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');
  console.log(chalk.dim('Configuration:'));
  console.log(chalk.dim(`  Target Path:   ${resolvedPath}`));
  console.log(chalk.dim(`  Strict Mode:   ${strict ? 'YES' : 'NO'}`));
  console.log(chalk.dim(`  Verbose:       ${verbose ? 'YES' : 'NO'}`));
  console.log('');

  // Find markdown files
  console.log(chalk.cyan('Finding markdown files...'));
  const markdownFiles = await findMarkdownFiles(resolvedPath);
  console.log(chalk.green(`✓ Found ${markdownFiles.length} markdown file(s)`));
  console.log('');

  if (markdownFiles.length === 0) {
    console.log(chalk.yellow('⚠ No markdown files found'));
    return;
  }

  // Load ADF schema
  const adfSchema = await loadAdfSchema();

  // Get CLI context for relative path display
  const ctx = await CliContext.create();

  // Validate each file
  console.log(chalk.cyan('Validating files...'));
  console.log('');

  const reports: ValidationReport[] = [];

  for (const filePath of markdownFiles) {
    const relPath = path.relative(ctx.projectRoot, filePath);

    if (verbose) {
      console.log(chalk.dim(`  Validating: ${relPath}`));
    }

    const report = await validateMarkdownFile(filePath, adfSchema, { verbose });
    reports.push(report);

    // Print issues immediately if verbose
    if (verbose && report.issues.length > 0) {
      console.log(chalk.yellow(`    Issues found:`));
      report.issues.forEach((issue) => {
        const severity =
          issue.severity === 'error'
            ? chalk.red('ERROR')
            : issue.severity === 'warning'
              ? chalk.yellow('WARN')
              : chalk.blue('INFO');
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

  const hasErrors = finalReport.summary.errors > 0;
  const hasWarnings = finalReport.summary.warnings > 0;

  if (finalReport.valid && !hasWarnings) {
    console.log(chalk.green('✓ All files are valid!'));
    console.log('');
    console.log(chalk.dim(`  Files validated: ${markdownFiles.length}`));
    console.log(chalk.dim(`  Errors:          0`));
    console.log(chalk.dim(`  Warnings:        0`));
    console.log(chalk.dim(`  Info:            ${finalReport.summary.info}`));
    console.log('');

    const durationMs = Date.now() - startTime;
    recordCLICommand(
      'confluence',
      'validate',
      { path: targetPath, strict, verbose },
      { valid: true, errors: 0, warnings: 0, files_validated: markdownFiles.length },
      durationMs,
      true
    ).catch(() => {});
  } else {
    if (hasErrors) {
      console.log(chalk.red('✗ Validation failed'));
    } else if (hasWarnings) {
      console.log(chalk.yellow('⚠ Validation passed with warnings'));
    }
    console.log('');
    console.log(chalk.dim(`  Files validated: ${markdownFiles.length}`));
    console.log(
      hasErrors
        ? chalk.red(`  Errors:          ${finalReport.summary.errors}`)
        : chalk.dim(`  Errors:          0`)
    );
    console.log(
      hasWarnings
        ? chalk.yellow(`  Warnings:        ${finalReport.summary.warnings}`)
        : chalk.dim(`  Warnings:        0`)
    );
    console.log(chalk.blue(`  Info:            ${finalReport.summary.info}`));
    console.log('');

    // Print detailed issues
    if (!verbose) {
      console.log(formatReport(finalReport));
      console.log('');
    }

    const durationMs = Date.now() - startTime;
    const isSuccess = !hasErrors && !(strict && hasWarnings);
    recordCLICommand(
      'confluence',
      'validate',
      { path: targetPath, strict, verbose },
      { valid: !hasErrors, errors: finalReport.summary.errors, warnings: finalReport.summary.warnings, files_validated: markdownFiles.length },
      durationMs,
      isSuccess
    ).catch(() => {});

    if (hasErrors || (strict && hasWarnings)) {
      process.exit(1);
    }
  }
}

/**
 * Validate a single markdown file for Confluence compatibility
 */
async function validateMarkdownFile(
  filePath: string,
  adfSchema: object,
  _options: { verbose?: boolean }
): Promise<ValidationReport> {
  const issues = [];

  try {
    // Read file
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for frontmatter
    if (!content.startsWith('---')) {
      issues.push(
        createError(
          'NO_FRONTMATTER',
          'File does not start with YAML frontmatter (---)',
          undefined,
          { file: filePath },
          'Add YAML frontmatter at the beginning of the file'
        )
      );
      return createReport(issues);
    }

    // Parse frontmatter
    let frontmatter: Record<string, unknown>;
    let body: string;
    try {
      const parsed = parseFrontmatter(content);
      frontmatter = parsed.data;
      body = parsed.content;
    } catch (error) {
      issues.push(
        createError(
          'FRONTMATTER_PARSE_ERROR',
          `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          { file: filePath },
          'Check YAML syntax in frontmatter'
        )
      );
      return createReport(issues);
    }

    // Validate required Confluence fields
    if (!frontmatter.title) {
      issues.push(
        createError(
          'MISSING_TITLE',
          'Missing required field: title',
          'title',
          { file: filePath },
          'Add "title: Your Page Title" to frontmatter'
        )
      );
    }

    if (!frontmatter.spaceKey && !frontmatter['confluence-space']) {
      issues.push(
        createWarning(
          'MISSING_SPACE_KEY',
          'Missing space key (spaceKey or confluence-space)',
          'spaceKey',
          { file: filePath },
          'Add "spaceKey: YOUR_SPACE" or "confluence-space: YOUR_SPACE" to frontmatter for publishing'
        )
      );
    }

    // Convert markdown to ADF
    let adf: AdfDocument;
    try {
      adf = markdownToAdf(body);
    } catch (error) {
      issues.push(
        createError(
          'MARKDOWN_TO_ADF_ERROR',
          `Failed to convert markdown to ADF: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          { file: filePath },
          'Simplify markdown syntax or check for unsupported elements'
        )
      );
      return createReport(issues);
    }

    // Validate ADF structure against schema
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(adfSchema);
    const valid = validate(adf);

    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        issues.push(
          createError(
            'ADF_SCHEMA_ERROR',
            `Invalid ADF structure: ${error.message || 'Unknown error'}`,
            error.instancePath || undefined,
            { file: filePath },
            'Check markdown syntax and ADF conversion result'
          )
        );
      }
    }

    // Check for empty content
    if (!adf.content || adf.content.length === 0) {
      issues.push(
        createWarning(
          'EMPTY_CONTENT',
          'Document has no content',
          undefined,
          { file: filePath },
          'Add content to the markdown file'
        )
      );
    }

    // Check for common markdown patterns that may not convert well
    const problematicPatterns = [
      { pattern: /<[^>]+>/, message: 'HTML tags detected (may not render in Confluence)' },
      { pattern: /\[!\[.*?\]\(.*?\)\]\(.*?\)/, message: 'Nested image links (not supported in ADF)' },
    ];

    for (const { pattern, message } of problematicPatterns) {
      if (pattern.test(body)) {
        issues.push(
          createWarning('UNSUPPORTED_MARKDOWN', message, undefined, { file: filePath }, 'Use native markdown syntax')
        );
      }
    }

    return createReport(issues);
  } catch (error) {
    return createReport([
      createError(
        'FILE_READ_ERROR',
        `Failed to read or validate file: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        { file: filePath }
      ),
    ]);
  }
}

/**
 * Find all markdown files in a path
 */
async function findMarkdownFiles(targetPath: string): Promise<string[]> {
  const stat = await fs.stat(targetPath);

  if (stat.isFile()) {
    // Single file
    if (targetPath.endsWith('.md')) {
      return [targetPath];
    } else {
      return [];
    }
  } else if (stat.isDirectory()) {
    // Directory - find all .md files
    const pattern = path.join(targetPath, '**', '*.md');
    const files = await glob(pattern, { absolute: true });
    // Filter out README files
    return files.filter((f) => !f.endsWith('README.md'));
  }

  return [];
}

/**
 * Load ADF schema
 */
async function loadAdfSchema(): Promise<object> {
  // Use getFrameworkRoot() for reliable schema resolution across dev and published modes
  const frameworkRoot = getFrameworkRoot();
  const schemaPath = path.join(frameworkRoot, 'modules/confluence/schemas/adf.schema.json');

  if (await fs.pathExists(schemaPath)) {
    return await fs.readJson(schemaPath);
  }

  throw new Error('Could not locate adf.schema.json. Please ensure the confluence module is installed.');
}
