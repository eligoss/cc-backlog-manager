/**
 * Confluence Import Reports Command
 *
 * Batch import markdown reports to Confluence.
 * Creates new pages or updates existing ones based on title.
 *
 * Usage:
 *   agentic-framework confluence import-reports --dir ./reports --space REPORTS
 */

import { Command } from 'commander';
import path from 'path';
import { importReportsCommand } from '../../lib/confluence/confluence-commands.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

export function createImportReportsCommand(): Command {
  const command = new Command('import-reports');

  command
    .description('Batch import markdown reports to Confluence')
    .option('-d, --dir <directory>', 'Directory containing markdown reports', './reports')
    .option('--dry-run', 'Preview changes without creating/updating pages')
    .option('--base-url <url>', 'Confluence base URL (or use CONFLUENCE_BASE_URL env)')
    .option('--email <email>', 'Confluence account email (or use CONFLUENCE_EMAIL env)')
    .option('--token <token>', 'Confluence API token (or use CONFLUENCE_API_TOKEN env)')
    .action(async (options) => {
      const startTime = Date.now();
      try {
        // Get configuration from options or environment
        const baseUrl =
          options.baseUrl ||
          process.env.CONFLUENCE_BASE_URL ||
          process.env.JIRA_BASE_URL;
        const email =
          options.email ||
          process.env.CONFLUENCE_EMAIL ||
          process.env.JIRA_EMAIL;
        const apiToken =
          options.token ||
          process.env.CONFLUENCE_API_TOKEN ||
          process.env.JIRA_API_TOKEN;

        if (!baseUrl || !email || !apiToken) {
          console.error('Error: Missing required Confluence credentials');
          console.error('Set environment variables or pass via options:');
          console.error('  - CONFLUENCE_BASE_URL (or --base-url)');
          console.error('  - CONFLUENCE_EMAIL (or --email)');
          console.error('  - CONFLUENCE_API_TOKEN (or --token)');
          process.exit(1);
        }

        const config = {
          baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
          email,
          apiToken,
        };

        const commandOptions = {
          dryRun: options.dryRun || false,
        };

        // Resolve directory path
        const reportsDir = path.resolve(options.dir);

        const result = await importReportsCommand(reportsDir, config, commandOptions);

        const durationMs = Date.now() - startTime;
        recordCLICommand(
          'confluence',
          'import-reports',
          { dir: options.dir, dry_run: options.dryRun },
          { reports_imported: result.created + result.updated, created: result.created, updated: result.updated, skipped: result.skipped, errors: result.errors },
          durationMs,
          result.errors === 0
        ).catch(() => {});

        if (!options.dryRun) {
          console.log('\nSuccess!');
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    });

  return command;
}
