/**
 * Confluence Fetch Page Command
 *
 * Fetch a Confluence page by ID and save as markdown with frontmatter.
 *
 * Usage:
 *   agentic-framework confluence fetch-page <page-id> -o output.md
 */

import { Command } from 'commander';
import { fetchPageCommand } from '../../lib/confluence/confluence-commands.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

export function createFetchPageCommand(): Command {
  const command = new Command('fetch-page');

  command
    .description('Fetch a Confluence page and save as markdown')
    .argument('<page-id>', 'Confluence page ID')
    .option('-o, --output <file>', 'Output file path (required)')
    .option('--base-url <url>', 'Confluence base URL (or use CONFLUENCE_BASE_URL env)')
    .option('--email <email>', 'Confluence account email (or use CONFLUENCE_EMAIL env)')
    .option('--token <token>', 'Confluence API token (or use CONFLUENCE_API_TOKEN env)')
    .action(async (pageId: string, options) => {
      const startTime = Date.now();
      try {
        // Validate required output option
        if (!options.output) {
          console.error('Error: --output option is required');
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

        await fetchPageCommand(pageId, options.output, config);

        const durationMs = Date.now() - startTime;
        recordCLICommand(
          'confluence',
          'fetch-page',
          { page_id: pageId, output: options.output },
          { page_id: pageId, output_path: options.output },
          durationMs,
          true
        ).catch(() => {});

        console.log('\nSuccess!');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    });

  return command;
}
