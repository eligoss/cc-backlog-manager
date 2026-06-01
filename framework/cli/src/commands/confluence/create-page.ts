/**
 * Confluence Create Page Command
 *
 * Create a Confluence page from a markdown file with YAML frontmatter.
 *
 * Usage:
 *   agentic-framework confluence create-page -f report.md --space DOC --parent 12345
 */

import { Command } from 'commander';
import { createPageCommand } from '../../lib/confluence/confluence-commands.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

export function createCreatePageCommand(): Command {
  const command = new Command('create-page');

  command
    .description('Create a Confluence page from a markdown file')
    .option('-f, --file <file>', 'Path to markdown file (required)')
    .option('--space <space>', 'Space key (overrides frontmatter)')
    .option('--parent <parentId>', 'Parent page ID (overrides frontmatter)')
    .option('--dry-run', 'Preview changes without creating page')
    .option('--base-url <url>', 'Confluence base URL (or use CONFLUENCE_BASE_URL env)')
    .option('--email <email>', 'Confluence account email (or use CONFLUENCE_EMAIL env)')
    .option('--token <token>', 'Confluence API token (or use CONFLUENCE_API_TOKEN env)')
    .action(async (options) => {
      const startTime = Date.now();
      try {
        // Validate required file option
        if (!options.file) {
          console.error('Error: --file option is required');
          process.exit(1);
        }

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
          parentId: options.parent,
          dryRun: options.dryRun || false,
        };

        await createPageCommand(options.file, config, commandOptions);

        const durationMs = Date.now() - startTime;
        recordCLICommand(
          'confluence',
          'create-page',
          { file: options.file, space: options.space, parent: options.parent, dry_run: options.dryRun },
          { file: options.file, dry_run: options.dryRun },
          durationMs,
          true
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
