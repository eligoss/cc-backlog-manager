/**
 * Backlog Push Version Command
 *
 * CLI command for pushing fixVersion from a milestone file to Jira tickets.
 *
 * Usage:
 *   agentic-framework backlog push-version -m <name> [options]
 *
 * Options:
 *   -m, --milestone <name>  Milestone/fixVersion name to push (required)
 *   -f, --file <path>       Path to milestone file (auto-detected from name if omitted)
 *   --dry-run               Preview changes without pushing to Jira
 *   -v, --verbose           Show detailed output
 *   -p, --path <dir>        Project base path (default: '.')
 *   --env <file>            Path to .env file
 *
 * @module commands/backlog/push-version
 */

import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { loadBacklogConfig, resolveCredentials } from '../../lib/backlog/config-loader.js';
import { JiraClient } from '../../lib/jira/jira-client.js';
import { pushVersionToJira } from '../../lib/backlog/push-version-engine.js';

/**
 * Create the push-version command.
 *
 * @returns Commander command instance
 */
export function createPushVersionCommand(): Command {
  return new Command('push-version')
    .description('Push fixVersion from a milestone file to Jira tickets')
    .requiredOption('-m, --milestone <name>', 'Milestone/fixVersion name to push')
    .option('-f, --file <path>', 'Path to milestone file (auto-detected from name if omitted)')
    .option('--dry-run', 'Preview changes without pushing to Jira', false)
    .option('-v, --verbose', 'Show detailed output', false)
    .option('-p, --path <dir>', 'Project base path', '.')
    .option('--env <file>', 'Path to .env file')
    .action(async (opts) => {
      try {
        const resolvedBasePath = path.resolve(opts.path);
        const config = await loadBacklogConfig(resolvedBasePath);
        const creds = resolveCredentials(config, resolvedBasePath, opts.env);
        const jiraClient = new JiraClient({
          baseUrl: creds.baseUrl,
          email: creds.email,
          apiToken: creds.apiToken,
        });

        console.log('');
        console.log(chalk.bold('Backlog Push Version'));
        console.log(chalk.bold('='.repeat(60)));
        console.log(`  Milestone:  ${chalk.bold(opts.milestone)}`);
        console.log(`  Dry Run:    ${opts.dryRun ? chalk.yellow('YES') : 'NO'}`);
        console.log('');

        const summary = await pushVersionToJira(config, jiraClient, resolvedBasePath, {
          milestoneName: opts.milestone,
          milestoneFile: opts.file,
          dryRun: opts.dryRun,
          verbose: opts.verbose,
          onProgress: (msg) => console.log(msg),
        });

        console.log('');
        if (opts.dryRun) {
          console.log(chalk.yellow(`[DRY RUN] Would update fixVersion on ${summary.pushed} tickets`));
        } else {
          console.log(chalk.green(`Updated fixVersion on ${summary.pushed} tickets`));
        }
        if (summary.errors > 0) {
          console.log(chalk.red(`Errors: ${summary.errors}`));
          process.exit(1);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${errorMessage}\n`));
        process.exit(1);
      }
    });
}
