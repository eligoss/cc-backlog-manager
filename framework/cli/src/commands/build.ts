/**
 * Build Command
 *
 * Unified validation command that provides compile-time-like checking for
 * framework markdown files with YAML frontmatter.
 *
 * Consolidates:
 * - Schema validation (agents, skills)
 * - Link validation (internal, external)
 * - Cross-reference validation (capabilities, delegates-to)
 * - IDE schema generation
 *
 * @module commands/build
 */

import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import { BuildEngine, formatBuildOutput, type BuildOptions } from '../lib/build/build-engine.js';
import { CliContext } from '../lib/cli-context.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';

interface BuildCommandOptions {
  path: string;
  quick?: boolean;
  externalLinks?: boolean;
  emitSchemas?: boolean;
  schemaDir?: string;
  json?: boolean;
  verbose?: boolean;
  ci?: boolean;
}

/**
 * Create the build command
 */
export function createBuildCommand(): Command {
  return new Command('build')
    .description('Validate framework artifacts with compile-time-like checking')
    .option('-p, --path <path>', 'Project path', '.')
    .option('-q, --quick', 'Quick mode: schema validation only (skip links)')
    .option('--external-links', 'Also check external URLs (slower)')
    .option('--emit-schemas', 'Generate JSON schemas for WebStorm/IDE')
    .option('--schema-dir <dir>', 'Output directory for JSON schemas')
    .option('--json', 'Output results as JSON')
    .option('-v, --verbose', 'Show detailed output with suggestions')
    .option('--ci', 'CI mode: minimal output, strict exit codes')
    .action(buildCommand);
}

/**
 * Execute the build command
 */
async function buildCommand(options: BuildCommandOptions): Promise<void> {
  const startTime = Date.now();
  const ctx = options.path && options.path !== '.'
    ? await CliContext.create({ path: options.path })
    : await CliContext.require();
  const projectPath = ctx.projectRoot;

  // Determine framework path for self-dev projects
  let frameworkPath: string = projectPath;

  // Use manifest from context if available
  if (ctx.manifest?.paths?.source) {
    frameworkPath = path.join(projectPath, ctx.manifest.paths.source);
  }

  // Show header unless in JSON/CI mode
  if (!options.json && !options.ci) {
    console.log('');
    console.log(chalk.bold('Building framework...'));
    if (options.quick) {
      console.log(chalk.dim('Quick mode: schema validation only'));
    }
    console.log('');
  }

  // Build options
  const buildOptions: BuildOptions = {
    projectPath,
    frameworkPath,
    quick: options.quick,
    externalLinks: options.externalLinks,
    emitSchemas: options.emitSchemas,
    schemaOutputDir: options.schemaDir,
    verbose: options.verbose,
  };

  // Run build
  const engine = new BuildEngine(buildOptions);
  const result = await engine.build();

  // Output results
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (options.ci) {
    // CI mode: minimal output
    if (result.success) {
      console.log(`✓ Build passed (${result.stats.agentsChecked} agents, ${result.stats.skillsChecked} skills)`);
    } else {
      console.log(`✗ Build failed: ${result.errorCount} errors, ${result.warningCount} warnings`);

      // Show just the error messages
      for (const issue of result.issues) {
        if (issue.severity === 'error') {
          const loc = issue.line ? `:${issue.line}` : '';
          console.log(`  ${issue.file}${loc}: ${issue.message}`);
        }
      }
    }
  } else {
    // Standard output
    console.log(formatBuildOutput(result, options.verbose ?? false));
  }

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'build',
    undefined,
    { quick: options.quick, externalLinks: options.externalLinks, emitSchemas: options.emitSchemas, ci: options.ci },
    {
      files_checked: result.stats.filesChecked,
      agents_checked: result.stats.agentsChecked,
      skills_checked: result.stats.skillsChecked,
      errors: result.errorCount,
      warnings: result.warningCount
    },
    durationMs,
    result.success
  ).catch(() => {});

  // Exit with appropriate code
  if (!result.success) {
    process.exit(1);
  } else if (result.warningCount > 0 && options.ci) {
    // In CI mode, warnings are exit code 0 but noted
    process.exit(0);
  }
}
