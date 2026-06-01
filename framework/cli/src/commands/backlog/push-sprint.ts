/**
 * Backlog Push Sprint Command
 *
 * CLI command for pushing sprint assignment from a sprint file to Jira.
 *
 * Usage:
 *   agentic-framework backlog push-sprint -s <name> [options]
 *
 * Options:
 *   -s, --sprint <name>  Sprint name to push (e.g., APMR-APP-2026W17) (required)
 *   -f, --file <path>    Path to sprint file (auto-detected from name if omitted)
 *   --dry-run            Preview changes without pushing to Jira
 *   -v, --verbose        Show detailed output
 *   -p, --path <dir>     Project base path (default: '.')
 *   --env <file>         Path to .env file
 *
 * @module commands/backlog/push-sprint
 */

import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { loadBacklogConfig, resolveCredentials } from '../../lib/backlog/config-loader.js';
import { JiraClient } from '../../lib/jira/jira-client.js';
import { pushSprintToJira } from '../../lib/backlog/push-sprint-engine.js';

/**
 * Create the push-sprint command.
 *
 * @returns Commander command instance
 */
export function createPushSprintCommand(): Command {
  return new Command('push-sprint')
    .description('Push sprint assignment from a sprint file to Jira')
    .requiredOption('-s, --sprint <name>', 'Sprint name to push (e.g., APMR-APP-2026W17)')
    .option('-f, --file <path>', 'Path to sprint file (auto-detected from name if omitted)')
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
        console.log(chalk.bold('Backlog Push Sprint'));
        console.log(chalk.bold('='.repeat(60)));
        console.log(`  Sprint:     ${chalk.bold(opts.sprint)}`);
        console.log(`  Dry Run:    ${opts.dryRun ? chalk.yellow('YES') : 'NO'}`);
        console.log('');

        const summary = await pushSprintToJira(config, jiraClient, resolvedBasePath, {
          sprintName: opts.sprint,
          sprintFile: opts.file,
          dryRun: opts.dryRun,
          verbose: opts.verbose,
          onProgress: (msg) => console.log(msg),
        });

        console.log('');
        console.log(chalk.bold('Summary'));
        console.log(chalk.bold('-'.repeat(40)));
        if (opts.dryRun) {
          console.log(chalk.yellow(`[DRY RUN] Sprint ID: ${summary.sprintId}`));
          console.log(chalk.yellow(`  Would add:     ${summary.added}`));
          console.log(chalk.yellow(`  Would remove:  ${summary.removed}`));
          console.log(`  Unchanged:     ${summary.unchanged}`);
        } else {
          console.log(`Sprint ID: ${summary.sprintId}`);
          if (summary.added > 0) {
            console.log(chalk.green(`  Added:      ${summary.added}`));
          }
          if (summary.removed > 0) {
            console.log(chalk.cyan(`  Removed:    ${summary.removed}`));
          }
          console.log(`  Unchanged:  ${summary.unchanged}`);
        }
        if (summary.errors > 0) {
          console.log(chalk.red(`  Errors:     ${summary.errors}`));
          process.exit(1);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${errorMessage}\n`));
        process.exit(1);
      }
    });
}
