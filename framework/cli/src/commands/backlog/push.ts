/**
 * Backlog Push Command
 *
 * CLI command for pushing local ticket changes to Jira.
 * Supports pushing specific tickets or all locally-modified tickets.
 * Performs conflict detection unless --force is specified.
 *
 * Usage:
 *   agentic-framework backlog push --ticket <id> [--ticket <id>] [options]
 *   agentic-framework backlog push --all [options]
 *
 * Options:
 *   --ticket <id...>  Specific ticket IDs to push (repeatable)
 *   --all             Push all locally-modified tickets
 *   --sprint <name>   Push all locally-changed tickets in a specific sprint
 *   --force           Skip conflict checks
 *   --dry-run         Preview changes without pushing
 *   -v, --verbose     Show detailed progress and logging
 *   -p, --path        Base path to project directory (default: '.')
 *   --env <path>      Path to .env file override
 *
 * @module commands/backlog/push
 */

import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { loadBacklogConfig, resolveCredentials } from '../../lib/backlog/config-loader.js';
import { pushToJira, PushSummary, PushMode } from '../../lib/backlog/push-engine.js';
import { JiraClient } from '../../lib/jira/jira-client.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

/**
 * Command options interface
 */
interface PushCommandOptions {
  ticket?: string[];
  all: boolean;
  sprint?: string;
  force: boolean;
  dryRun: boolean;
  verbose: boolean;
  path: string;
  env?: string;
}

/**
 * Create the push command.
 *
 * @returns Commander command instance
 */
export function createPushCommand(): Command {
  const command = new Command('push');

  command
    .description('Push local ticket changes to Jira')
    .option('--ticket <id...>', 'Specific ticket IDs to push (repeatable)')
    .option('--all', 'Push all locally-modified tickets', false)
    .option('--sprint <name>', 'Push all locally-changed tickets in a specific sprint')
    .option('--force', 'Skip conflict checks', false)
    .option('--dry-run', 'Preview changes without pushing', false)
    .option('-v, --verbose', 'Show detailed progress and logging', false)
    .option('-p, --path <path>', 'Base path to project directory', '.')
    .option('--env <path>', 'Path to .env file override')
    .action(async (cmdOptions: unknown) => {
      try {
        await runPushCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${errorMessage}\n`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Run the push command.
 *
 * @param cmdOptions - Command options
 */
async function runPushCommand(cmdOptions: unknown): Promise<void> {
  const startTime = Date.now();
  const {
    ticket: tickets,
    all,
    sprint,
    force,
    dryRun,
    verbose,
    path: basePath,
    env: envPath,
  } = cmdOptions as PushCommandOptions;

  // Validate: must specify --ticket, --sprint, or --all
  if (tickets && tickets.length > 0 && all) {
    throw new Error('Cannot use both --ticket and --all. Choose one.');
  }
  if ((!tickets || tickets.length === 0) && !all && !sprint) {
    throw new Error(
      'Provide --ticket <id>, --sprint <name>, or --all'
    );
  }

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
  console.log(chalk.bold('Backlog Push'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');
  console.log(chalk.cyan('Configuration:'));
  console.log(`  Project:        ${chalk.bold(config.jiraProject)}`);
  if (tickets && tickets.length > 0) {
    console.log(`  Tickets:        ${chalk.bold(tickets.join(', '))}`);
  } else if (sprint) {
    console.log(`  Sprint:         ${chalk.bold(sprint)}`);
  } else {
    console.log(`  Mode:           ${chalk.bold('all locally-modified')}`);
  }
  console.log(`  Force:          ${force ? chalk.yellow('YES') : 'NO'}`);
  console.log(`  Dry Run:        ${dryRun ? chalk.yellow('YES') : 'NO'}`);
  console.log(`  Verbose:        ${verbose ? 'YES' : 'NO'}`);
  console.log('');

  // Run push
  console.log(chalk.cyan('Pushing to Jira...\n'));
  const summary: PushSummary = await pushToJira(config, jiraClient, resolvedBasePath, {
    tickets,
    all,
    sprint,
    force,
    dryRun,
    verbose,
    onProgress: verbose ? (msg: string) => console.log(chalk.gray(`  ${msg}`)) : undefined,
  });

  // Print per-ticket results
  if (summary.results.length > 0) {
    console.log(chalk.bold('Results:'));
    console.log('  ' + '-'.repeat(78));

    for (const result of summary.results) {
      const id = result.issueKey ?? result.ticketId;
      const mode = result.mode === PushMode.CREATE ? chalk.cyan('CREATE') : chalk.blue('UPDATE');

      if (result.skipped) {
        console.log(`  ${chalk.yellow('SKIP')}  ${id}  ${mode}  ${chalk.yellow(result.skipReason ?? 'skipped')}`);
      } else if (result.success) {
        const dryTag = dryRun ? chalk.gray(' [dry-run]') : '';
        const url = result.issueUrl ? chalk.gray(` ${result.issueUrl}`) : '';
        console.log(`  ${chalk.green('OK')}    ${id}  ${mode}${dryTag}${url}`);
      } else {
        console.log(`  ${chalk.red('FAIL')}  ${id}  ${mode}  ${chalk.red(result.error ?? 'unknown error')}`);
      }
    }
    console.log('');
  }

  // Print summary counts
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Push Summary'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');

  if (dryRun) {
    console.log(chalk.yellow('  [DRY RUN] No changes were made.\n'));
  }

  console.log(`  Pushed:         ${chalk.green(String(summary.pushed))}`);
  console.log(`  Created:        ${chalk.cyan(String(summary.created))}`);
  console.log(`  Skipped:        ${chalk.yellow(String(summary.skipped))}`);
  console.log(`  Errors:         ${summary.errors > 0 ? chalk.red(String(summary.errors)) : chalk.gray('0')}`);
  console.log('');

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'backlog',
    'push',
    { tickets, all, sprint, force, dry_run: dryRun, verbose },
    {
      tickets_pushed: summary.pushed,
      tickets_created: summary.created,
      tickets_skipped: summary.skipped,
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
