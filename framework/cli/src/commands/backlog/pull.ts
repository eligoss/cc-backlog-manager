/**
 * Backlog Pull Command
 *
 * CLI command for pulling tickets from Jira into local markdown files.
 * Supports filtering by sprint or version, with dry-run preview.
 *
 * Usage:
 *   agentic-framework backlog pull [options]
 *
 * Options:
 *   --ticket <id>    Pull a specific ticket by Jira ID
 *   --sprint <name>  Filter by sprint name
 *   --version <name> Filter by fix version
 *   --dry-run        Preview changes without writing files
 *   -v, --verbose    Show detailed progress and logging
 *   -p, --path       Base path to project directory (default: '.')
 *   --env <path>     Path to .env file override
 *
 * @module commands/backlog/pull
 */

import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { loadBacklogConfig, resolveCredentials } from '../../lib/backlog/config-loader.js';
import { pullFromJira, PullSummary } from '../../lib/backlog/pull-engine.js';
import { JiraClient } from '../../lib/jira/jira-client.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

/**
 * Command options interface
 */
interface PullCommandOptions {
  ticket?: string;
  sprint?: string;
  version?: string;
  dryRun: boolean;
  verbose: boolean;
  path: string;
  env?: string;
}

/**
 * Create the pull command.
 *
 * @returns Commander command instance
 */
export function createPullCommand(): Command {
  const command = new Command('pull');

  command
    .description('Pull tickets from Jira into local markdown files')
    .option('--ticket <id>', 'Pull a specific ticket by Jira ID')
    .option('--sprint <name>', 'Filter by sprint name')
    .option('--version <name>', 'Filter by fix version')
    .option('--dry-run', 'Preview changes without writing files', false)
    .option('-v, --verbose', 'Show detailed progress and logging', false)
    .option('-p, --path <path>', 'Base path to project directory', '.')
    .option('--env <path>', 'Path to .env file override')
    .action(async (cmdOptions: unknown) => {
      try {
        await runPullCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${errorMessage}\n`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Run the pull command.
 *
 * @param cmdOptions - Command options
 */
async function runPullCommand(cmdOptions: unknown): Promise<void> {
  const startTime = Date.now();
  const {
    ticket,
    sprint,
    version,
    dryRun,
    verbose,
    path: basePath,
    env: envPath,
  } = cmdOptions as PullCommandOptions;

  const resolvedBasePath = path.resolve(basePath);

  // Load configuration
  const config = await loadBacklogConfig(resolvedBasePath);
  const credentials = resolveCredentials(config, resolvedBasePath, envPath);

  // Initialize Jira client
  const jiraClient = new JiraClient({
    baseUrl: credentials.baseUrl,
    email: credentials.email,
    apiToken: credentials.apiToken,
  });

  // Print header
  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Backlog Pull'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');
  console.log(chalk.cyan('Configuration:'));
  console.log(`  Project:        ${chalk.bold(config.jiraProject)}`);
  if (ticket) console.log(`  Ticket:         ${chalk.bold(ticket)}`);
  if (sprint) console.log(`  Sprint:         ${chalk.bold(sprint)}`);
  if (version) console.log(`  Version:        ${chalk.bold(version)}`);
  console.log(`  Base Path:      ${resolvedBasePath}`);
  console.log(`  Dry Run:        ${dryRun ? chalk.yellow('YES') : 'NO'}`);
  console.log(`  Verbose:        ${verbose ? 'YES' : 'NO'}`);
  console.log('');

  // Run pull
  console.log(chalk.cyan('Pulling from Jira...\n'));
  const summary: PullSummary = await pullFromJira(config, jiraClient, resolvedBasePath, {
    ticket,
    sprint,
    version,
    dryRun,
    verbose,
    onProgress: verbose ? (msg: string) => console.log(chalk.gray(`  ${msg}`)) : undefined,
  });

  // Print summary
  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Pull Summary'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');

  if (dryRun) {
    console.log(chalk.yellow('  [DRY RUN] No files were written.\n'));
  }

  console.log(`  Created:        ${chalk.green(String(summary.created))}`);
  console.log(`  Updated:        ${chalk.yellow(String(summary.updated))}`);
  console.log(`  In Sync:        ${chalk.gray(String(summary.inSync))}`);
  console.log(`  Errors:         ${summary.errors > 0 ? chalk.red(String(summary.errors)) : chalk.gray('0')}`);
  console.log('');

  if (verbose && summary.details.created.length > 0) {
    console.log(chalk.green('  Created:'));
    for (const id of summary.details.created) {
      console.log(`    + ${id}`);
    }
    console.log('');
  }

  if (verbose && summary.details.updated.length > 0) {
    console.log(chalk.yellow('  Updated:'));
    for (const id of summary.details.updated) {
      console.log(`    ~ ${id}`);
    }
    console.log('');
  }

  if (summary.details.errors.length > 0) {
    console.log(chalk.red('  Errors:'));
    for (const { ticket, error } of summary.details.errors) {
      console.log(`    ${chalk.red('✗')} ${ticket}: ${error}`);
    }
    console.log('');
  }

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'backlog',
    'pull',
    { ticket, sprint, version, dry_run: dryRun, verbose },
    {
      tickets_created: summary.created,
      tickets_updated: summary.updated,
      tickets_in_sync: summary.inSync,
      tickets_errors: summary.errors,
    },
    durationMs,
    summary.errors === 0
  ).catch(() => {});

  // Exit with error code if there were errors
  if (summary.errors > 0) {
    process.exit(1);
  }
}
