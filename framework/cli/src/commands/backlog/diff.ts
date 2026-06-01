/**
 * Backlog Diff Command
 *
 * CLI command for comparing local ticket state against Jira remote state.
 * Displays per-ticket sync status with colored indicators.
 *
 * Usage:
 *   agentic-framework backlog diff [options]
 *
 * Options:
 *   --ticket <id>    Compare a specific ticket only
 *   --sprint <name>  Filter by sprint name
 *   --version <name> Diff tickets in a specific version
 *   -p, --path       Base path to project directory (default: '.')
 *   --env <path>     Path to .env file override
 *
 * @module commands/backlog/diff
 */

import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { loadBacklogConfig, resolveCredentials } from '../../lib/backlog/config-loader.js';
import { diffAllTickets, SyncStatus, DiffSummary } from '../../lib/backlog/diff-engine.js';
import { JiraClient } from '../../lib/jira/jira-client.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

/**
 * Command options interface
 */
interface DiffCommandOptions {
  ticket?: string;
  sprint?: string;
  version?: string;
  path: string;
  env?: string;
}

/**
 * Create the diff command.
 *
 * @returns Commander command instance
 */
export function createDiffCommand(): Command {
  const command = new Command('diff');

  command
    .description('Compare local tickets against Jira remote state')
    .option('--ticket <id>', 'Compare a specific ticket only')
    .option('--sprint <name>', 'Filter by sprint name')
    .option('--version <name>', 'Diff tickets in a specific version')
    .option('-p, --path <path>', 'Base path to project directory', '.')
    .option('--env <path>', 'Path to .env file override')
    .action(async (cmdOptions: unknown) => {
      try {
        await runDiffCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${errorMessage}\n`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Colorize a sync status string for terminal output.
 */
function colorizeStatus(status: SyncStatus): string {
  switch (status) {
    case SyncStatus.IN_SYNC:
      return chalk.gray(status);
    case SyncStatus.REMOTE_NEWER:
      return chalk.yellow(status);
    case SyncStatus.LOCAL_NEWER:
      return chalk.green(status);
    case SyncStatus.CONFLICT:
      return chalk.red(status);
    case SyncStatus.LOCAL_ONLY:
      return chalk.blue(status);
    default:
      return status;
  }
}

/**
 * Run the diff command.
 *
 * @param cmdOptions - Command options
 */
async function runDiffCommand(cmdOptions: unknown): Promise<void> {
  const startTime = Date.now();
  const {
    ticket,
    sprint,
    version,
    path: basePath,
    env: envPath,
  } = cmdOptions as DiffCommandOptions;

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
  console.log(chalk.bold('Backlog Diff'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');
  console.log(chalk.cyan('Configuration:'));
  console.log(`  Project:        ${chalk.bold(config.jiraProject)}`);
  if (ticket) console.log(`  Ticket:         ${chalk.bold(ticket)}`);
  if (sprint) console.log(`  Sprint:         ${chalk.bold(sprint)}`);
  if (version) console.log(`  Version:        ${chalk.bold(version)}`);
  console.log(`  Base Path:      ${resolvedBasePath}`);
  console.log('');

  // Run diff
  console.log(chalk.cyan('Comparing local vs remote...\n'));
  const summary: DiffSummary = await diffAllTickets(
    config,
    jiraClient,
    resolvedBasePath,
    { sprint, version, ticketId: ticket }
  );

  // Print results table
  if (summary.results.length === 0) {
    console.log(chalk.gray('  No tickets found.\n'));
  } else {
    // Calculate column widths
    const idWidth = Math.max(10, ...summary.results.map((r) => r.ticketId.length));
    const statusWidth = 14;

    // Header
    const header =
      '  ' +
      'Ticket'.padEnd(idWidth + 2) +
      'Status'.padEnd(statusWidth + 2) +
      'Title';
    console.log(chalk.bold(header));
    console.log('  ' + '-'.repeat(78));

    // Rows
    for (const result of summary.results) {
      const id = result.ticketId.padEnd(idWidth + 2);
      const status = colorizeStatus(result.status);
      // Pad based on the raw status length to keep alignment after chalk codes
      const statusPad = ' '.repeat(Math.max(0, statusWidth - result.status.length + 2));
      const title = result.title.length > 44
        ? result.title.slice(0, 41) + '...'
        : result.title;
      console.log(`  ${id}${status}${statusPad}${title}`);
    }
    console.log('');
  }

  // Print summary counts
  console.log(chalk.bold('Summary:'));
  console.log(`  ${chalk.gray('In sync:')}        ${summary.counts[SyncStatus.IN_SYNC]}`);
  console.log(`  ${chalk.yellow('Remote newer:')}  ${summary.counts[SyncStatus.REMOTE_NEWER]}`);
  console.log(`  ${chalk.green('Local newer:')}   ${summary.counts[SyncStatus.LOCAL_NEWER]}`);
  console.log(`  ${chalk.red('Conflict:')}      ${summary.counts[SyncStatus.CONFLICT]}`);
  console.log(`  ${chalk.blue('Local only:')}    ${summary.counts[SyncStatus.LOCAL_ONLY]}`);
  console.log(`  Total:          ${summary.results.length}`);
  console.log('');

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'backlog',
    'diff',
    { ticket, sprint, version },
    {
      total: summary.results.length,
      in_sync: summary.counts[SyncStatus.IN_SYNC],
      remote_newer: summary.counts[SyncStatus.REMOTE_NEWER],
      local_newer: summary.counts[SyncStatus.LOCAL_NEWER],
      conflict: summary.counts[SyncStatus.CONFLICT],
      local_only: summary.counts[SyncStatus.LOCAL_ONLY],
    },
    durationMs,
    true
  ).catch(() => {});
}
